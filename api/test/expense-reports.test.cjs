// B5.3 (أ) — تقارير المصروفات: قواعد الفئة والتقرير والبند، حكم السياسة، حالة التقرير الفعلية، ومسارات الميزة الفرعية، ومصدر الكود.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/expenses/expense-reports')
const advances = require('../src/expenses/travel-advances')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('EXU-01: المبلغ والفئة — موجب بمنزلتين بالكتير ومن غير تقريب صامت؛ والحد اختياري ووضعه تحذير أو منع', () => {
  assert.deepEqual([10, '10.5', '10.55', ' 7 ', 0, -1, '10.555', '1e3', 'abc', null, 9999999.99, 10000000].map(value => rules.expenseAmount(value)), [10, 10.5, 10.55, 7, null, null, null, null, null, null, 9999999.99, null])
  assert.deepEqual(rules.categoryFields({ name: '  انتقالات   داخلية ' }).fields, { name: 'انتقالات داخلية', limitPerLine: null, limitMode: 'WARN', receiptRequired: false, isActive: true })
  assert.deepEqual(rules.categoryFields({ name: 'إقامة', limitPerLine: '500', limitMode: 'BLOCK', receiptRequired: true, isActive: false }).fields,
    { name: 'إقامة', limitPerLine: 500, limitMode: 'BLOCK', receiptRequired: true, isActive: false })
  assert.deepEqual([{ name: 'ا' }, { name: 'x'.repeat(121) }, { name: 'إقامة', limitPerLine: 0 }, { name: 'إقامة', limitMode: 'block' }, { name: 'إقامة', isActive: 1 }].map(body => rules.categoryFields(body).fields), [null, null, null, null, null])
})

test('EXU-02: التقرير والبند — العنوان، وفترة المأمورية الاتنين أو ولا واحد، وتاريخ البند مش في المستقبل، والإيصال رقم ملف', () => {
  assert.deepEqual(rules.reportFields({ title: ' مأمورية  جدة ' }).fields, { title: 'مأمورية جدة', tripFrom: null, tripTo: null })
  assert.deepEqual(rules.reportFields({ title: 'مأمورية', tripFrom: '2026-10-01', tripTo: '2026-10-01' }).fields, { title: 'مأمورية', tripFrom: '2026-10-01', tripTo: '2026-10-01' })
  assert.deepEqual([{ title: 'م' }, { title: 'مأمورية', tripFrom: '2026-10-01' }, { title: 'مأمورية', tripFrom: '2026-10-05', tripTo: '2026-10-01' }, { title: 'مأمورية', tripFrom: '2026-02-30', tripTo: '2026-03-01' }]
    .map(body => rules.reportFields(body).fields), [null, null, null, null])
  const today = '2026-10-08'
  assert.deepEqual(rules.lineFields({ categoryId: 3, expenseDate: today, amount: '12.5', note: ' غدا ', receiptFileId: 9 }, today).fields, { categoryId: 3, expenseDate: today, amount: 12.5, note: 'غدا', receiptFileId: 9 })
  assert.deepEqual(rules.lineFields({ categoryId: 3, expenseDate: '2026-10-01', amount: 5 }, today).fields, { categoryId: 3, expenseDate: '2026-10-01', amount: 5, note: null, receiptFileId: null })
  assert.deepEqual([{ categoryId: '3', expenseDate: today, amount: 5 }, { categoryId: 3, expenseDate: '2026-10-09', amount: 5 }, { categoryId: 3, expenseDate: today, amount: 0 }, { categoryId: 3, expenseDate: today, amount: 5, note: 'x'.repeat(301) },
    { categoryId: 3, expenseDate: today, amount: 5, receiptFileId: '9' }, { categoryId: 3, expenseDate: '08/10/2026', amount: 5 }].map(body => rules.lineFields(body, today).fields), [null, null, null, null, null, null])
  // شهر أو يوم برّه المدى: رسالة خطأ، مش استثناء
  assert.deepEqual([rules.lineFields({ categoryId: 3, expenseDate: '2026-13-01', amount: 5 }, today).error, rules.reportFields({ title: 'مأمورية', tripFrom: '2026-00-10', tripTo: '2026-10-45' }).error],
    ['تاريخ المصروف مطلوب', 'فترة المأمورية: تاريخ البداية والنهاية الاتنين (أو سيبهم فاضيين)'])
})

test('EXU-03: حكم السياسة على البند — فئة مقفولة أو فوق حد «منع» بيمنع، فوق حد «تحذير» بيتعلّم، والإيصال الإجباري بيتحكم عند التقديم بس', () => {
  const category = (extra = {}) => ({ name: 'إقامة', limitPerLine: 500, limitMode: 'BLOCK', receiptRequired: true, isActive: true, ...extra })
  const issue = (cat, amount, receiptFileId, atSubmit) => rules.lineIssue(cat, { amount, receiptFileId }, atSubmit)
  assert.deepEqual(issue(null, 10, null, true), { block: 'فئة البند مش موجودة', warn: null })
  assert.deepEqual(issue(category({ isActive: false }), 10, 1, true), { block: 'فئة «إقامة» مقفولة — غيّر فئة البند', warn: null })
  assert.deepEqual([issue(category(), 500, 1, true), issue(category(), 500.01, 1, true), issue(category(), '500.00', 1, true)],
    [{ block: null, warn: null }, { block: 'بند «إقامة» بمبلغ 500.01 فوق حد الفئة 500.00', warn: null }, { block: null, warn: null }])
  assert.deepEqual([issue(category(), 100, null, false), issue(category(), 100, null, true)], [{ block: null, warn: null }, { block: 'بند «إقامة» محتاج إيصال', warn: null }])
  const soft = category({ limitMode: 'WARN', receiptRequired: false })
  assert.deepEqual([issue(soft, 600, null, true), issue(soft, 500, null, true), issue(category({ limitPerLine: null }), 99999, 1, true)],
    [{ block: null, warn: 'فوق حد الفئة (500.00)' }, { block: null, warn: null }, { block: null, warn: null }])
  // قيم bit من القاعدة (1/0) زي true/false
  assert.deepEqual(issue(category({ isActive: 1, receiptRequired: 0 }), 10, null, true), { block: null, warn: null })
})

test('EXU-04: حالة التقرير الفعلية = حالته + حالة طلبه، والتعديل في المسودة والراجع والمرفوض بس', () => {
  const phase = rules.reportPhase
  assert.deepEqual([phase('DRAFT', null), phase('DRAFT', 'SUBMITTED'), phase('APPROVED', 'CANCELLED'), phase('SUBMITTED', 'SUBMITTED'), phase('SUBMITTED', 'UNDER_REVIEW'), phase('SUBMITTED', 'APPROVED'),
    phase('SUBMITTED', 'COMPLETED'), phase('SUBMITTED', 'RETURNED_FOR_INFO'), phase('SUBMITTED', 'REJECTED'), phase('SUBMITTED', 'CANCELLED'), phase('SUBMITTED', 'DRAFT'), phase('SUBMITTED', null)],
    ['DRAFT', 'DRAFT', 'APPROVED', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'RETURNED', 'REJECTED', 'REJECTED', 'REJECTED', 'REJECTED'])
  assert.deepEqual(['DRAFT', 'PENDING', 'RETURNED', 'REJECTED', 'APPROVED'].map(rules.phaseEditable), [true, false, true, true, false])
  assert.deepEqual(Object.keys(rules.REPORT_PHASE_LABELS).sort(), ['APPROVED', 'DRAFT', 'PENDING', 'REJECTED', 'RETURNED'])
  assert.equal(rules.reportCode(7), 'EXP-00007')
  // حقول نموذج الطلب: رقم التقرير بس، والمفاتيح اللي الخادم بيثبّتها مش حقول
  assert.deepEqual(rules.expenseReportFields({ requiredFields: JSON.stringify(['amount', 'description', 'costCenter']), customFields: JSON.stringify([{ key: 'amount' }, { key: 'costCenter', label: 'مركز التكلفة' }]) }),
    { requiredFields: JSON.stringify(['reportId', 'costCenter']), customFields: JSON.stringify([{ key: 'reportId', label: 'رقم تقرير المصروفات (من شاشة «مصروفاتي»)', type: 'number', required: true }, { key: 'costCenter', label: 'مركز التكلفة' }]) })
})

test('EXU-05: الميزة الفرعية بتملك مساراتها — الشاشة بتتقفل مع الميزة حتى وموديولها مفعّل، وباقي المسارات زي ما هي', () => {
  const module = registry.MODULES.expenses
  assert.deepEqual([module.defaultEnabled, module.permissions, module.routes, module.requestHandlers, Object.keys(module.features)], [true, ['expenses.manage'], [], ['expense_register', 'expense_report', 'travel_advance'], ['expenses.reports']])
  assert.deepEqual([module.features['expenses.reports'].default, module.features['expenses.reports'].routes], [false, ['/expenses', '/my/expenses']])
  assert.deepEqual(['/expenses', '/my/expenses', '/my/expenses/5'].map(route => registry.routeOwner(route)), Array(3).fill({ module: 'expenses', feature: 'expenses.reports' }))
  const on = { modules: ['expenses', 'requests', 'recruitment', 'benefits'], features: ['expenses.reports'] }, off = { ...on, features: [] }
  assert.deepEqual(['/expenses', '/my/expenses'].map(route => [registry.routeAvailable(route, on), registry.routeAvailable(route, off), registry.routeAvailable(route, { modules: ['requests'], features: ['expenses.reports'] })]),
    [[true, false, false], [true, false, false]])
  // مسارات مالهاش ميزة ماتغيّرتش: موديولها بس، وشاشات العرض بميزتها
  assert.deepEqual([registry.routeOwner('/benefits'), registry.routeOwner('/recruitment/add'), registry.routeOwner('/my/raises'), registry.routeOwner('/requests')],
    [{ module: 'benefits', feature: null }, { module: 'recruitment', feature: registry.DEMO_SCREENS_FEATURE }, { module: 'compensation', feature: null }, registry.routeOwner('/requests')])
  assert.equal(registry.moduleOfRequestType({ code: 'ANY', destinationHandler: 'expense_report' }), 'expenses')
})

test('EXU-06: مصدر الكود — المسارات ورا الموديول والميزة، الفئات لحساب بكل الفروع، التعديل تحت قفل الطلب ثم التقرير، والقيد بيتكتب في مكان واحد', () => {
  const controller = read('expenses/expenses.controller.ts')
  assert.match(controller, /@RequireModule\('expenses'\)\n@RequireFeature\('expenses\.reports'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('expenses\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length], [6, 15]) // (ب): + ربط السلفة، وخطوة المالية؛ (ج): + بند البدل اليومي، وإضافة سعر وتعديله
  const service = read('expenses/expense-reports.service.ts')
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 3, 'إضافة الفئة وتعديلها (وسعر البدل اليومي — ج) لحساب بكل الفروع')
  assert.equal((service.match(/await this\.lockOwnEditable\(em, user, /g) ?? []).length, 6, 'تعديل التقرير ومسحه وحفظ البند ومسحه وربط السلفة (وبند البدل اليومي — ج) تحت قفل التقرير')
  assert.match(service, /locked\.report\.employeeId !== employeeId\) throw new NotFoundException\(REPORT_NOT_FOUND\)/)
  assert.match(service, /file\.entityType !== 'request' \|\| Number\(file\.uploadedBy\) !== Number\(user\.sub\) \|\| Number\(file\.employeeId\) !== report\.employeeId/)
  assert.match(service, /visible = filed\.filter\(row => \{ const person = people\.get\(row\.employeeId\); return !!person && inBranchScope\(scope, person\.branchId\) \}\)/)
  // الخدمة مابتكتبش قيد ولا بتنادي خدمة تانية؛ القيد في وجهة الطلب بس
  assert.doesNotMatch(service, /EmployeeObligation|employee_obligations|RequestsService|DestinationsService/)
  const core = read('expenses/expense-reports.ts')
  assert.equal((core.match(/getRepository\(EmployeeObligation\)\.save\(/g) ?? []).length, 1)
  // ترتيب الأقفال: صف الطلب المربوط قبل صف التقرير، وبعد القفل الربط لازم يكون زي ما اتشاف
  const lock = core.slice(core.indexOf('export async function lockReport'), core.indexOf('export interface StagedLine'))
  assert.ok(lock.indexOf('FROM dbo.requests WITH (UPDLOCK, ROWLOCK)') < lock.indexOf(`lock: { mode: 'pessimistic_write' }`))
  assert.match(lock, /!== linkedId\) throw new ConflictException\(REPORT_CHANGED\)/)
  // التقديم والتنفيذ بيحكموا تحت القفل: صاحب التقرير، وربطه بالطلب، والإجمالي محسوب تاني
  const execute = core.slice(core.indexOf('export async function executeExpenseReport'), core.indexOf('export function expenseReportFields'))
  assert.match(execute, /locked\.report\.employeeId !== req\.requesterId \|\| locked\.report\.requestId == null \|\| Number\(locked\.report\.requestId\) !== req\.id/)
  assert.match(execute, /centsOf\(payload\.amount\) !== judged\.totalCents \|\| cents\(report\.totalAmount\) !== judged\.totalCents \|\| stagedAdvance !== advanceCents/)
  assert.ok(execute.indexOf('await lockReport(') < execute.indexOf('getRepository(EmployeeObligation).save('))
  const requests = read('requests/requests.service.ts')
  assert.match(requests, /if \(type\.destinationHandler === EXPENSE_REPORT_HANDLER\) req\.payload = JSON\.stringify\(await stageExpenseReport\(em, req\)\)/)
  assert.match(requests, /allowedFor\(moduleOfRequestType\(type\), user\) && await this\.typeFeatureOpen\(type\)\) all\.push\(type\)/)
  assert.match(requests, /if \(!open \|\| !\(await this\.typeFeatureOpen\(type, em\)\)\) throw new NotFoundException\('نوع الطلب غير موجود'\)/)
  assert.match(read('requests/destinations.service.ts'), /\[EXPENSE_REPORT_HANDLER\]: executeExpenseReport,/)
  assert.ok(JSON.stringify(require('../src/auth/permissions')).includes('expenses.manage'))
})

test('EXU-07: الواجهة — «مصروفاتي» بتقدّم الطلب برقم التقرير بس والإيصال بيترفع بنوع «طلب»، و«المصروفات» للفئات والتقارير، والقايمة والعناوين', () => {
  const mine = web('app/my/expenses/page.tsx'), admin = web('app/expenses/page.tsx'), api = web('lib/expenses-api.ts')
  assert.match(mine, /await createRequest\(data!\.requestTypeCode!, \{ reportId: report\.id \}, true\)/)
  assert.match(mine, /report\.phase === 'RETURNED' && report\.requestId\) await resubmitRequest\(report\.requestId\)/)
  assert.match(mine, /uploadFile\(line\.file, \{ entityType: 'request' \}\)/)
  assert.match(mine, /\{report\.editable && \(\n\s+<div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-expense-line-form>/)
  assert.match(mine, />\s*مصروفاتي\s*<\/h1>/)
  assert.match(admin, />\s*المصروفات\s*<\/h1>/)
  assert.match(admin, /\{data\.canEdit && \(\n\s+<div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-expense-category-form>/)
  assert.doesNotMatch(admin, /createRequest|\/act`/, 'شاشة الإدارة قراءة: الاعتماد في سلسلة الطلب')
  for (const route of ['/expenses/my', '/expenses/overview', '/expenses/categories']) assert.ok(api.includes(route), route)
  const sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /\{ label: 'المصروفات', href: '\/expenses', perm: 'expenses\.manage' \}/)
  assert.match(sidebar, /\{ id: 'my-expenses', label: 'مصروفاتي', icon: <Wallet size=\{20\} \/>, href: '\/my\/expenses' \}/)
  assert.match(titles, /\['\/my\/expenses', 'مصروفاتي'\]/); assert.match(titles, /\['\/expenses', 'المصروفات'\]/)
  const labels = web('lib/request-payload.ts')
  for (const key of ['reportId', 'reportTitle', 'tripFrom', 'tripTo', 'lines', 'category', 'receipt', 'warning']) assert.match(labels, new RegExp(`\\n  ${key}: '`), key)
})

test('EXU-08: سلفة المأمورية — المبلغ والغرض، ومصدر الكود: الاعتماد من غير قيد، والتسوية تحت قفل التقرير ثم السلفة بقيد واحد حسب إشارة الصافي', () => {
  assert.deepEqual(advances.advanceValues({ amount: '1000.50', reason: '  مأمورية   جدة ' }), { amount: 1000.5, purpose: 'مأمورية جدة' })
  for (const payload of [{ amount: 0, reason: 'مأمورية' }, { amount: '10.555', reason: 'مأمورية' }, { amount: 1000000, reason: 'مأمورية' }, { amount: 'abc', reason: 'مأمورية' }, { reason: 'مأمورية' }]) {
    assert.throws(() => advances.advanceValues(payload), { message: advances.ADVANCE_AMOUNT })
  }
  for (const reason of [undefined, 'م', 'x'.repeat(201), 5]) assert.throws(() => advances.advanceValues({ amount: 10, reason }), { message: advances.ADVANCE_PURPOSE })
  assert.equal(advances.advanceCode(12), 'ADV-00012')
  assert.deepEqual(Object.keys(advances.ADVANCE_STATUS_LABELS), ['OPEN', 'SETTLED', 'RETURNED'])
  assert.equal(registry.moduleOfRequestType({ code: 'ANY', destinationHandler: 'travel_advance' }), 'expenses')
  const source = read('expenses/travel-advances.ts')
  assert.doesNotMatch(source, /EmployeeObligation|employee_obligations/, 'السلفة نفسها من غير قيد في الدفتر')
  assert.match(source, /const made = await advances\.findOne\(\{ where: \{ requestId: req\.id \} \}\)\n\s+if \(made\) return/)
  const core = read('expenses/expense-reports.ts')
  const execute = core.slice(core.indexOf('export async function executeExpenseReport'), core.indexOf('export function expenseReportFields'))
  assert.ok(execute.indexOf('await lockReport(') < execute.indexOf('await attachedAdvance(') && execute.indexOf('await attachedAdvance(') < execute.indexOf('getRepository(EmployeeObligation).save('))
  assert.match(execute, /type: netCents > 0 \? 'CREDIT' : 'DEBIT', category: netCents > 0 \? 'expense' : SETTLEMENT_CATEGORY/)
  assert.match(execute, /const entry = netCents === 0 \? null : await em\.getRepository\(EmployeeObligation\)\.save\(/)
  assert.match(execute, /if \(advance\) await em\.getRepository\(TravelAdvance\)\.update\(\{ id: advance\.id \}, \{ status: 'SETTLED', closedAt: now \}\)/)
  const service = read('expenses/expense-reports.service.ts')
  const attach = service.slice(service.indexOf('async attachAdvance('), service.indexOf('// ===== الإدارة'))
  assert.ok(attach.indexOf('await this.lockOwnEditable(') < attach.indexOf(`lock: { mode: 'pessimistic_write' }`), 'قفل التقرير قبل قفل السلفة')
  assert.match(attach, /!advance \|\| advance\.employeeId !== report\.employeeId\) throw new NotFoundException\(ADVANCE_NOT_FOUND\)/)
  const steps = service.slice(service.indexOf('async advanceStep('))
  assert.match(steps, /!advance \|\| !person \|\| !inBranchScope\(branchScopeOf\(user\), idOf\(person\.branchId\)\)\) throw new NotFoundException\(ADVANCE_NOT_FOUND\)/)
  assert.doesNotMatch(steps, /EmployeeObligation/)
  assert.match(read('offboarding/offboarding-open.ts'), /if \(advances\.count > 0\) items\.push\(\{ caseId: kase\.id, party: 'finance', label: `تسوية سلف مأموريات مفتوحة/)
  const requests = read('requests/requests.service.ts')
  assert.match(requests, /if \(type\.destinationHandler === TRAVEL_ADVANCE_HANDLER\) req\.payload = JSON\.stringify\(await stageTravelAdvance\(em, req\)\)/)
  assert.match(requests, /type\.destinationHandler !== EXPENSE_REPORT_HANDLER && type\.destinationHandler !== TRAVEL_ADVANCE_HANDLER\) \|\| !this\.modules/)
  // الواجهة
  const mine = web('app/my/expenses/page.tsx'), admin = web('app/expenses/page.tsx')
  assert.match(mine, /await createRequest\(data!\.advanceTypeCode!, \{ amount, reason: advance\.reason\.trim\(\) \}, true\)/)
  assert.match(mine, /row\.status === 'OPEN' && row\.paid && \(row\.reportId === null \|\| row\.reportId === report\.id\)/)
  assert.match(mine, /disabled=\{busy \|\| \(report\.lines\.length === 0 && !report\.advance\) \|\| !!blocked\}/)
  assert.match(admin, /row\.status === 'OPEN' && !row\.paid && <button/)
  assert.match(admin, /row\.status === 'OPEN' && row\.paid && row\.reportId === null && \(/)
})

test('EXU-09: حد الدرجة والبدل اليومي — حد الدرجة بيسبق حد الفئة، وسعر درجة الموظف بيسبق سعر كل الدرجات، والمبلغ = الأيام × السعر، وأي تغيير في السعر بيمنع البند', () => {
  const category = { name: 'إقامة', limitPerLine: 500, limitMode: 'BLOCK', receiptRequired: false, isActive: true }
  const issue = (amount, gradeLimit) => rules.lineIssue(category, { amount, receiptFileId: null }, true, gradeLimit)
  assert.deepEqual([issue(700, 800), issue(801, 800), issue(700, null), issue(300, 200)].map(result => result.block),
    [null, 'بند «إقامة» بمبلغ 801.00 فوق حد الفئة 800.00', 'بند «إقامة» بمبلغ 700.00 فوق حد الفئة 500.00', 'بند «إقامة» بمبلغ 300.00 فوق حد الفئة 200.00'])
  assert.equal(rules.lineIssue({ ...category, limitPerLine: null, limitMode: 'WARN' }, { amount: 90, receiptFileId: null }, true, 50).warn, 'فوق حد الفئة (50.00)')
  assert.deepEqual(rules.gradeLimitsOf(undefined), { limits: undefined, error: null })
  assert.deepEqual(rules.gradeLimitsOf([{ gradeId: 2, limitPerLine: '300.5' }]).limits, [{ gradeId: 2, limitPerLine: 300.5 }])
  assert.deepEqual([{}, [{ gradeId: 2 }], [{ gradeId: '2', limitPerLine: 5 }], [{ gradeId: 2, limitPerLine: 5 }, { gradeId: 2, limitPerLine: 6 }], [null]].map(raw => rules.gradeLimitsOf(raw).limits), [undefined, undefined, undefined, undefined, undefined])
  assert.deepEqual(rules.rateFields({ categoryId: 4, destination: '  الرياض ', dailyAmount: '250' }).fields, { categoryId: 4, gradeId: null, destination: 'الرياض', dailyAmount: 250, isActive: true })
  assert.deepEqual([{ categoryId: 4, destination: 'ر', dailyAmount: 5 }, { destination: 'الرياض', dailyAmount: 5 }, { categoryId: 4, destination: 'الرياض', dailyAmount: 100000 }, { categoryId: 4, destination: 'الرياض', dailyAmount: 5, gradeId: 0 }]
    .map(body => rules.rateFields(body).fields), [null, null, null, null])
  const today = '2026-10-08'
  assert.deepEqual(rules.perDiemFields({ destination: 'الرياض', days: 3, expenseDate: '2026-10-01', note: ' ملاحظة ' }, today).fields, { destination: 'الرياض', days: 3, expenseDate: '2026-10-01', note: 'ملاحظة' })
  assert.deepEqual([{ days: 3, expenseDate: today }, { destination: 'الرياض', days: '3', expenseDate: today }, { destination: 'الرياض', days: 91, expenseDate: today }, { destination: 'الرياض', days: 3, expenseDate: '2026-10-09' }]
    .map(body => rules.perDiemFields(body, today).fields), [null, null, null, null])
  const rates = [{ id: 1, gradeId: null, destination: 'الرياض', dailyAmount: 150, isActive: true }, { id: 2, gradeId: 7, destination: 'الرياض', dailyAmount: '250.00', isActive: 1 },
    { id: 3, gradeId: 8, destination: 'الرياض', dailyAmount: 400, isActive: false }, { id: 4, gradeId: 7, destination: 'جدة', dailyAmount: 90, isActive: true }]
  assert.deepEqual([rules.pickRate(rates, 'الرياض', 7), rules.pickRate(rates, 'الرياض', 8), rules.pickRate(rates, 'الرياض', null), rules.pickRate(rates, 'جدة', null), rules.pickRate(rates, 'دبي', 7)].map(rate => rate?.id ?? null), [2, 1, 1, null, null])
  assert.equal(rules.perDiemCents(3, '250.10'), 75030)
  const judge = (line, gradeId) => rules.perDiemIssue(rates, line, gradeId)
  assert.deepEqual([judge({ perDiemRateId: 2, perDiemDays: 3, amount: 750 }, 7), judge({ perDiemRateId: 2, perDiemDays: 3, amount: 751 }, 7), judge({ perDiemRateId: 2, perDiemDays: 3, amount: 750 }, null),
    judge({ perDiemRateId: 3, perDiemDays: 1, amount: 400 }, 8), judge({ perDiemRateId: 99, perDiemDays: 1, amount: 5 }, 7), judge({ perDiemRateId: 1, perDiemDays: 2, amount: '300.00' }, 8)],
    [null, rules.perDiemChanged('الرياض'), rules.perDiemChanged('الرياض'), rules.perDiemChanged('الرياض'), 'سعر البدل اليومي للبند مش موجود — امسح البند وضيفه تاني', null])
  assert.equal(rules.perDiemText(3, rates[1]), '3 يوم × 250.00 (الرياض)')
  // مصدر الكود: المبلغ من الخادم تحت قفل التقرير، والبند المحسوب مايتعدّلش من مسار البند العادي، والحكم بدرجة صاحب التقرير
  const service = read('expenses/expense-reports.service.ts')
  const daily = service.slice(service.indexOf('async savePerDiem('), service.indexOf('async removeLine('))
  assert.ok(daily.indexOf('await this.lockOwnEditable(') < daily.indexOf('pickRate(policy.rates, fields.destination, policy.gradeId)'))
  assert.match(daily, /const amount = perDiemCents\(fields\.days, rate\.dailyAmount\) \/ 100/)
  assert.doesNotMatch(daily, /fields\.amount|input\.amount/)
  assert.match(service, /if \(existing\?\.perDiemRateId != null\) throw new BadRequestException\(PER_DIEM_LOCKED\)/)
  const core = read('expenses/expense-reports.ts')
  assert.match(core, /const policy = await gradePolicy\(em, report\.employeeId\)/)
  assert.match(core, /block \?\?= perDiemIssue\(policy\.rates, line, policy\.gradeId\)/)
  assert.match(core, /lineIssue\(category, line, true, policy\.limits\.get\(line\.categoryId\) \?\? null\)/)
  // الواجهة
  const mine = web('app/my/expenses/page.tsx'), admin = web('app/expenses/page.tsx')
  assert.match(mine, /await addPerDiemLine\(report\.id, \{ destination: entry\.destination, days: Number\(entry\.days\), expenseDate: entry\.expenseDate \}\)/)
  assert.match(mine, /\{report\.editable && data!\.perDiem\.length > 0 && \(/)
  assert.match(admin, /data-per-diem-rate-form/); assert.match(admin, /data-expense-grade-limits/)
  assert.match(web('lib/request-payload.ts'), /\n  perDiem: 'بدل يومي',/)
})

test('EXU-10 (Codex P5B): مصدر الكود — الاعتماد البشري في آخر تقديم ومن غير صاحب الطلب؛ وحكم الموديول والميزة جوه معاملة التقديم بمديرها؛ والقارئ بيرجع للافتراضي من غير جدولَي الموديولات', () => {
  const human = read('expenses/human-approval.ts'), requests = read('requests/requests.service.ts'), modules = read('modules-registry/modules.service.ts')
  // B01: بعد آخر إرجاع للاستكمال؛ N01: المستفيد مش المنشئ
  assert.match(human, /AND a\.\[id\] > ISNULL\(\(SELECT MAX\(b\.\[id\]\) FROM dbo\.request_approvals b WHERE b\.\[requestId\] = @0 AND b\.\[action\] = N'RETURNED_FOR_INFO'\), 0\)/)
  assert.match(human, /\(u\.\[employeeId\] IS NULL OR u\.\[employeeId\] <> @1\)/)
  assert.match(human, /\[req\.id, req\.requesterId \?\? 0\]/)
  assert.doesNotMatch(human, /createdByUserId/)
  // B02: معاملة التقديم بتبعت مديرها، والقراءتين بيه
  assert.match(requests, /if \(!resubmission\) await this\.assertTypeModuleEnabled\(type, user, em\)/)
  assert.match(requests, /const open = em && this\.modules \? await this\.modules\.allowedForIn\(em, moduleOfRequestType\(type\), user\) : await this\.moduleGate\.allowedFor\(moduleOfRequestType\(type\), user\)/)
  assert.match(requests, /return em \? this\.modules\.isFeatureEnabledIn\(em, EXPENSE_REPORTS_FEATURE\) : this\.modules\.isFeatureEnabled\(EXPENSE_REPORTS_FEATURE\)/)
  const inside = modules.slice(modules.indexOf('async allowedForIn('), modules.indexOf('* الموديول كان مقفول في اليوم ده؟'))
  assert.doesNotMatch(inside, /this\.ds\b|this\.load\(|this\.subjects|this\.subjectOf\(/)
  assert.match(inside, /const fresh = await this\.freshLoaded\(em\)/)
  // N02: جدول مش موجود = القيم الافتراضية
  const fresh = modules.slice(modules.indexOf('private async freshLoaded('))
  assert.match(fresh, /if \(sqlErrorNumber\(error\) !== MISSING_TABLE\) throw error\n\s+return \{ state: \{ modules: \{\}, features: \{\} \}, audiences: \{\} \}/)
})

test('EXU-11 (Codex P5C): معاملة التقديم وإعادة التقديم — فحص المرفقات وتقويم الموظف بمدير المعاملة، ومفيش قارئ مخزن جواها', () => {
  const requests = read('requests/requests.service.ts')
  const submit = requests.slice(requests.indexOf('private async submitLocked('), requests.indexOf('// مرات نوع الإجازة للموظف في سنة'))
  const resubmit = requests.slice(requests.indexOf('async resubmit('), requests.indexOf('// ===== الإلغاء (صاحب الطلب قبل البت فيه) ====='))
  assert.ok(submit.length > 20000 && resubmit.length > 2000, `${submit.length} ${resubmit.length}`)
  // فحص المرفقات بمدير المعاملة في المسارين، والدالة نفسها بتقرا بيه
  assert.match(submit, /await this\.assertAttachmentOwnership\(req, user, em\)/)
  assert.match(resubmit, /await this\.assertAttachmentOwnership\(req, user, em\)/)
  assert.match(requests, /private async assertAttachmentOwnership\(req: Request, actor: JwtPayload, em\?: EntityManager\) \{/)
  assert.match(requests, /await \(em \?\? this\.ds\.manager\)\.getRepository\(StoredFile\)\.findOne\(\{ where: \{ id \} \}\)/)
  // تقويم الموظف (يوم العطلة وأيام الإجازة) بنسخة الحضور المربوطة بالمعاملة
  assert.equal((submit.match(/this\.attendance\.batchScope\(em\)\.(calendarDay|workingDaysForEmployee)\(/g) || []).length, 3)
  // ولا قارئ مخزن جوه المعاملتين: لا مصدر البيانات ولا مستودع محقون ولا قارئ الموديولات بالذاكرة المؤقتة ولا خدمة حضور غير مربوطة
  for (const body of [submit, resubmit]) {
    assert.doesNotMatch(body, /this\.ds\.(getRepository|query|manager)/)
    assert.doesNotMatch(body, /this\.(requests|types|chains|steps|approvals|employees|overtimeEntries)\.(find|findOne|findOneBy|count|save|query|createQueryBuilder)\(/)
    assert.doesNotMatch(body, /this\.attendance\.(?!batchScope\(em\))/)
    assert.doesNotMatch(body, /this\.modules\.(isEnabled|isFeatureEnabled|allowedFor)\(|this\.moduleGate\./)
  }
})
