// B6.1 (ب) — مستوردات تجهيز العميل: أعمدة القوالب، قراية الصفوف وفحص شكلها، ومصدر الكود (المعاينة مابتكتبش، والتطبيق بخدمات الإنشاء القايمة ولحساب بكل الفروع).
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/setup-import/setup-import')
const { EMPLOYEE_REQUIRED_FIELDS } = require('../src/employees/employee-required-fields')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const headersOf = kind => rules.IMPORT_COLUMNS[kind].map(column => column.header)
const sheetOf = (header, rows) => ({ header, rows: rows.map((cells, index) => ({ row: index + 2, cells })) })

test('SIU-01: القوالب — أعمدة الموظفين بتغطي كل حقل إجباري في إنشاء الموظف، والعناوين من غير تكرار', () => {
  assert.deepEqual([rules.IMPORT_KINDS, rules.IMPORT_MAX_ROWS], [['structure', 'employees', 'balances', 'loans'], 2000])
  for (const kind of rules.IMPORT_KINDS) assert.equal(new Set(headersOf(kind)).size, headersOf(kind).length, kind)
  const keys = rules.IMPORT_COLUMNS.employees.map(column => column.key)
  // الفرع والقسم بيتحلّوا من كودهم واسمهم؛ والهوية واحد من عمودين
  const covered = { branchId: 'branchCode', departmentId: 'department' }
  for (const field of EMPLOYEE_REQUIRED_FIELDS) assert.ok(keys.includes(covered[field.key] ?? field.key), field.key)
  assert.ok(keys.includes('passportNo'))
  assert.deepEqual(rules.IMPORT_COLUMNS.employees.filter(column => column.money).map(column => column.key), ['basicSalary'])
})

test('SIU-02: قراية الصفوف — العناوين عناوين القالب بأي ترتيب، الصف الفاضي بيتشال، الإجباري الفاضي خطأ على صفه، والتاريخ والرقم بيتقروا نص', () => {
  const header = ['القسم', 'كود الفرع', 'اسم الفرع', 'الدولة']
  const parsed = rules.importRows('structure', sheetOf(header, [['المالية', ' RUH ', 'فرع  الرياض', 'SA'], [null, null, '', undefined], ['المبيعات', '', '', '']]))
  assert.deepEqual([parsed.fileError, parsed.rows], [null, [{ row: 2, values: { branchCode: 'RUH', branchName: 'فرع الرياض', country: 'SA', department: 'المالية' }, errors: [] },
    { row: 4, values: { branchCode: '', branchName: '', country: '', department: 'المبيعات' }, errors: ['«كود الفرع» مطلوب'] }]])
  assert.deepEqual([rules.importRows('structure', sheetOf(['كود الفرع', 'غريب'], [['A', 'B']])).fileError, rules.importRows('structure', sheetOf(['كود الفرع', 'كود الفرع'], [['A', 'B']])).fileError,
    rules.importRows('structure', sheetOf(['القسم'], [['A']])).fileError, rules.importRows('structure', sheetOf(['كود الفرع'], [])).fileError,
    rules.importRows('structure', sheetOf(['كود الفرع'], Array.from({ length: 2001 }, (_, index) => [`B${index}`]))).fileError],
  ['عمود مش في القالب: غريب', 'عمود مكرر في الملف', 'أعمدة ناقصة: كود الفرع', 'الملف مافيهوش صفوف بيانات', 'الملف أكتر من 2000 صف — قسّمه'])
  assert.deepEqual([rules.cellText(new Date(Date.UTC(2024, 0, 15))), rules.cellText(1001), rules.cellText('  نص   بمسافات '), rules.cellText(null), rules.cellText(new Date(NaN)), rules.cellText(true)], ['2024-01-15', '1001', 'نص بمسافات', '', '', 'true'])
})

test('SIU-03: فحص الشكل — كود الفرع والدولة، وبيانات الموظف (الجنس والراتب)، والتكرار جوه الملف', () => {
  const structure = values => rules.structureShapeIssues({ branchCode: '', branchName: '', country: '', department: '', ...values })
  assert.deepEqual([structure({ branchCode: 'RUH-1' }), structure({ branchCode: 'فرع' }), structure({ branchCode: 'AB', country: 'sa' }), structure({ branchCode: 'AB', country: 'KSA' }), structure({ branchCode: 'AB', department: 'x'.repeat(151) })],
    [[], ['«كود الفرع» من حرفين لحد 20: حروف إنجليزي وأرقام وشرطة'], [], ['«الدولة» EG أو SA'], ['الاسم 150 حرف بالكتير']])
  const base = { fingerprintCode: '7', fullName: 'اسم', fullNameEn: '', birthDate: '1990-01-01', gender: 'أنثى', nationality: 'مصرية', nationalId: '', passportNo: 'A1', phone: '+2010', joinDate: '2024-01-01', branchCode: 'B', department: 'D', jobTitle: 'T', basicSalary: '1,250.5' }
  const draft = rules.employeeDraft(base)
  assert.deepEqual([draft.issues, draft.draft.gender, draft.draft.basicSalary, draft.draft.nationalId, draft.draft.passportNo, 'branchId' in draft.draft], [[], 'female', 1250.5, undefined, 'A1', false])
  assert.deepEqual([rules.employeeDraft({ ...base, gender: 'Male' }).draft.gender, rules.employeeDraft({ ...base, gender: 'x' }).issues, rules.employeeDraft({ ...base, basicSalary: '-5' }).issues, rules.employeeDraft({ ...base, basicSalary: '12.345' }).issues,
    rules.employeeDraft({ ...base, basicSalary: '1e9' }).draft.basicSalary], ['male', ['«الجنس» ذكر أو أنثى'], ['«الراتب الأساسي» رقم بكسرين بالكتير'], ['«الراتب الأساسي» رقم بكسرين بالكتير'], undefined])
  const rows = [{ row: 2, values: { code: 'A' }, errors: [] }, { row: 3, values: { code: 'b' }, errors: [] }, { row: 4, values: { code: 'a' }, errors: [] }, { row: 5, values: { code: '' }, errors: [] }, { row: 6, values: { code: 'B' }, errors: [] }]
  assert.deepEqual([...rules.duplicatesIn(rows, 'code', 'الكود')], [[4, '«الكود» مكرر في الملف (الصف 2)'], [6, '«الكود» مكرر في الملف (الصف 3)']])
})

test('SIU-04: مصدر الكود — لحساب بكل الفروع، المعاينة من غير كتابة، وتطبيق ملف فيه خطأ مرفوض كله، والكتابة بخدمات الإنشاء القايمة', () => {
  const service = read('setup-import/setup-import.service.ts'), controller = read('setup-import/setup-import.controller.ts')
  // كل مدخل بيعدّي على حكم «كل الفروع»
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) || []).length, 2)
  assert.match(service, /private async plan\(user: JwtPayload, rawKind: unknown, file: ImportUploadedFile \| undefined\)[^\n]+\n\s+assertCompanyWideWrite\(user\)/)
  // المعاينة: خطة وتقرير بس
  const preview = service.slice(service.indexOf('async preview('), service.indexOf('async apply('))
  assert.doesNotMatch(preview, /step\(\)|\.work|create/)
  // التطبيق: أي خطأ = رفض قبل أول كتابة
  const apply = service.slice(service.indexOf('async apply('))
  assert.ok(apply.indexOf('if (report.withErrors) throw new BadRequestException') < apply.indexOf('for (const step of row.work) await step()'))
  // الكتابة بخدمات الإنشاء القايمة — من غير إدخال مباشر في الجداول
  assert.match(service, /this\.org\.createBranch\(/); assert.match(service, /this\.org\.createDepartment\(/); assert.match(service, /this\.employees\.create\(/)
  assert.doesNotMatch(service, /INSERT INTO|\.save\(|\.insert\(|getRepository/)
  // الموجود برقم بصمته بيتخطّى، ونفس فحص الحقول الإجبارية بتاع إنشاء الموظف
  assert.match(service, /if \(!errors\.length && prints\.has\(lower\(values\.fingerprintCode\)\)\) return \{ row: line\.row, summary, status: 'EXISTS' as const, errors: \[\], work: \[\] \}/)
  assert.match(service, /const issue = employeeCreateIssue\(dto, today\)/)
  assert.match(controller, /@RequireModule\('employees'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('setup-import'\)/)
  assert.equal((controller.match(/@Perm\('settings\.manage'\)/g) || []).length, 3)
  assert.equal((controller.match(/@Post\(/g) || []).length, 3)
})

test('SIU-05: (ج) صف الرصيد الافتتاحي وصف السلفة القائمة — النوع والأيام، والمبلغ نص بكسرين، والأقساط، وشهر أول قسط مش قبل الشهر الحالي', () => {
  const balance = (balanceType, remaining) => rules.balanceDraft({ balanceType, remaining })
  assert.deepEqual([balance('سنوية', '12.5'), balance('مرضي', '0'), balance('SICK', '30')].map(item => [item.balanceType, item.days, item.issues]), [['annual', 12.5, []], ['sick', 0, []], ['sick', 30, []]])
  assert.deepEqual([balance('عارضة', '4').issues, balance('سنوية', '-1').issues, balance('سنوية', '1.234').issues, balance('سنوية', 'كتير').days],
    [['«نوع الرصيد» سنوية أو مرضية'], ['«الرصيد المتبقي بالأيام» رقم من صفر بكسرين بالكتير'], ['«الرصيد المتبقي بالأيام» رقم من صفر بكسرين بالكتير'], null])
  const loan = (amount, months, firstInstallmentPeriod) => rules.loanDraft({ amount, months, firstInstallmentPeriod }, '2026-10')
  assert.deepEqual([loan('6,000', '6', '2026-11'), loan('1500.5', '1', '2026-10-01')], [{ amount: '6000.00', months: 6, firstInstallmentPeriod: '2026-11', issues: [] }, { amount: '1500.50', months: 1, firstInstallmentPeriod: '2026-10', issues: [] }])
  assert.deepEqual([loan('0', '2', '2026-11').issues, loan('100', '0', '2026-11').issues, loan('100', '121', '2026-11').issues, loan('100', '2', '2026-09').issues, loan('100', '2', 'قريب').issues, loan('1.234', '1.5', '2026-13').issues],
    [['«المتبقي من السلفة» رقم أكبر من صفر بكسرين بالكتير'], ['«عدد الأقساط المتبقية» رقم صحيح من 1 لـ120'], ['«عدد الأقساط المتبقية» رقم صحيح من 1 لـ120'], ['«شهر أول قسط» فات — اكتب الشهر الحالي أو اللي بعده'],
      ['«شهر أول قسط» بصيغة YYYY-MM'], ['«المتبقي من السلفة» رقم أكبر من صفر بكسرين بالكتير', '«عدد الأقساط المتبقية» رقم صحيح من 1 لـ120', '«شهر أول قسط» بصيغة YYYY-MM']])
  assert.deepEqual(rules.IMPORT_COLUMNS.loans.filter(column => column.money).map(column => column.key), ['amount'])
})

test('SIU-06: (ج) مصدر الخدمة — الرصيد بخدمة تعديله بصلاحيتها وموديولها، والسلفة طلب بالنيابة بصلاحياته؛ مفيش مبلغ بيتكتب مباشرة', () => {
  const service = read('setup-import/setup-import.service.ts')
  const balance = service.slice(service.indexOf('private async balancePlan('), service.indexOf('private async loanPlan('))
  const loan = service.slice(service.indexOf('private async loanPlan('), service.indexOf('private async plan('))
  // الصلاحية والموديول قبل أي قراية
  // CRP6A-B01: حراس كل نوع (صلاحية مساره الأصلي وموديوله بجمهور التفعيل) في مكان واحد، قبل قراءة الملف، للقالب والمعاينة والتنفيذ
  assert.match(service, /structure: \{ perms: \['org\.manage'\], modules: \['org'\]/)
  assert.match(service, /employees: \{ perms: \['employees\.create'\], modules: \['employees'\]/)
  assert.match(service, /balances: \{ perms: \['leave_balances\.manage'\], modules: \['leave'\]/)
  assert.match(service, /loans: \{ perms: \['requests\.create_on_behalf', 'loans\.exceptional'\], modules: \['requests', 'loans'\]/)
  assert.match(service, /if \(!gate\.perms\.every\(perm => userHasPerm\(user, perm\)\)\) throw new ForbiddenException\(gate\.denied\)\n    for \(const module of gate\.modules\) if \(!\(await this\.modules\.allowedFor\(module, user\)\)\) throw new BadRequestException\(gate\.closed\)/)
  assert.equal((service.match(/const kind = this\.kindOf\(rawKind\)\n    await this\.assertKindAllowed\(user, kind\)/g) ?? []).length, 2, 'القالب، والخطة (المعاينة والتنفيذ)')
  assert.doesNotMatch(service, /modules\.isEnabled\(/, 'الموديول بجمهور تفعيله مش بحالته العامة بس')
  // الرصيد: خدمة التعديل القايمة بسببها ومفتاح عملية و«المتوقع» اللي بيرفض لو الرصيد اتغيّر
  assert.match(balance, /await this\.balances\.adjust\(person\.id, \{ balanceType, period: now\.period, delta, reason: OPENING_BALANCE_REASON, idempotencyKey: randomUUID\(\), expectedRemaining: now\.shown \}, user\.sub, null\)/)
  // السلفة: طلب بالنيابة بيتقدّم — من غير أي كتابة في جدول السلف
  assert.match(loan, /await this\.requests\.create\(user, \{ typeCode: 'LOAN', onBehalfEmployeeId: person\.id, submit: true, payload \}\)/)
  assert.doesNotMatch(service, /INSERT INTO|UPDATE dbo|\.save\(|\.insert\(|getRepository|\bloans\]|dbo\.loans/)
})
