// B4.8 (أ) — الإخفاء الجزئي للهوية والآيبان، وتصدير بيانات الموظف: حساب نقي بلا قاعدة بيانات.
// الإعداد مقفول (الافتراضي) = إسقاط الموظف زي الأول بالحرف؛ مفتوح = الرقم المخفي في خانة لوحدها والأصلية مشيولة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const privacy = require('../src/employees/employee-privacy')
const { projectEmployee, projectEmployeeHistory } = require('../src/employees/employee-projection')
const user = (permissions, employeeId = null) => ({ sub: 1, role: 'employee', permissions, employeeId })
const EMP = { id: 7, fullName: 'موظف تجربة', employeeCode: 'E7', nationalId: '2123456789', passportNo: 'A12345678', iban: 'SA0380000000608010167519', bankName: 'بنك', basicSalary: 9000, payMethod: 'transfer', branchId: 1 }

test('EPU-01: شكل الإخفاء — الآيبان «SA•• •••• 1234» والهوية «•••••• 1234»، والقصير كله مخفي، والفاضي null', () => {
  assert.deepEqual([privacy.maskIbanPartial('SA03 8000 0000 6080 1016 7519'), privacy.maskIbanPartial('eg380002000100010001234567890'), privacy.maskIbanPartial('SA0380')],
    ['SA•• •••• 7519', 'EG•• •••• 7890', 'SA•• •••• ••••'])
  assert.deepEqual([privacy.maskIbanPartial(''), privacy.maskIbanPartial(null), privacy.maskIbanPartial('123456789012')], [null, null, '•••• •••• 9012'])
  assert.deepEqual([privacy.maskIdentityPartial('2123456789'), privacy.maskIdentityPartial(' A 12345678 '), privacy.maskIdentityPartial('12345'), privacy.maskIdentityPartial(''), privacy.maskIdentityPartial(null)],
    ['•••••• 6789', '•••••• 5678', '•••••• ••••', null, null])
  // المخفي مافيهوش غير آخر 4 خانات من الأصل
  assert.equal(privacy.maskIdentityPartial('2123456789').includes('212345'), false)
})

test('EPU-02: الإعداد مقفول — الإسقاط زي الأول بالحرف لكل الحسابات (المالية مشيولة عن غير المصرّح، والهوية كاملة)', () => {
  const finance = ['currency', 'salaryCycle', 'basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance', 'payMethod',
    'bankTransferAmount', 'bankName', 'bankBranch', 'iban', 'gosiNumber', 'isGosiRegistered', 'gosiBaseSalary', 'gosiFirstRegisteredAt']
  const withoutFinance = Object.fromEntries(Object.entries(EMP).filter(([key]) => !finance.includes(key)))
  for (const viewer of [user(['employees.view']), user([])]) {
    assert.deepEqual([projectEmployee(EMP, viewer), projectEmployee(EMP, viewer, false)], [withoutFinance, withoutFinance])
  }
  for (const viewer of [user(['employees.edit']), user(['payroll.view']), user(['employees.view_compensation']), user([], 7)]) assert.equal(projectEmployee(EMP, viewer), EMP, 'نفس الكائن من غير نسخ')
})

test('EPU-03: الإعداد مفتوح — الهوية كاملة لصاحب الملف وللي بيعدّل بس، والآيبان مخفي لغير المصرّح له بالمالية، والأصلية مشيولة', () => {
  const view = projectEmployee(EMP, user(['employees.view']), true)
  assert.deepEqual([view.nationalId, view.passportNo, view.iban, view.basicSalary, view.nationalIdMasked, view.passportNoMasked, view.ibanMasked, view.fullName],
    [undefined, undefined, undefined, undefined, '•••••• 6789', '•••••• 5678', 'SA•• •••• 7519', 'موظف تجربة'])
  assert.equal('nationalId' in view || 'iban' in view, false, 'الخانة الأصلية مش في الرد')
  // صلاحية الرواتب: المالية كاملة والهوية مخفية (ومفيش ibanMasked لأن الآيبان الكامل موجود)
  const payroll = projectEmployee(EMP, user(['payroll.view']), true)
  assert.deepEqual([payroll.iban, payroll.basicSalary, payroll.nationalId, payroll.nationalIdMasked, 'ibanMasked' in payroll], [EMP.iban, 9000, undefined, '•••••• 6789', false])
  // صاحب الملف واللي بيعدّل: كل حاجة كاملة ونفس الكائن
  for (const viewer of [user(['employees.edit']), user([], 7)]) assert.equal(projectEmployee(EMP, viewer, true), EMP)
  // موظف تاني من غير صلاحية بيشوف ملف غيره (لو وصله): مخفي
  assert.equal(projectEmployee(EMP, user([], 8), true).nationalIdMasked, '•••••• 6789')
  // ملف من غير هوية أو آيبان: المخفي null مش نص
  const empty = projectEmployee({ ...EMP, nationalId: null, passportNo: '', iban: null }, user(['employees.view']), true)
  assert.deepEqual([empty.nationalIdMasked, empty.passportNoMasked, empty.ibanMasked], [null, null, null])
  assert.deepEqual([privacy.canSeeFullIdentity(user(['employees.edit']), 7), privacy.canSeeFullIdentity(user([], 7), 7), privacy.canSeeFullIdentity(user(['payroll.view', 'employees.view']), 7)], [true, true, false])
})

test('EPU-04: مصدر الكود — الإعداد مبذور مقفول، وكل رد بملف موظف بياخد حكمه، وملف Excel بنفس الحكم، والتصدير الكامل بصلاحية التعديل وبسطر تدقيق', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.deepEqual(configSeed.filter(row => row.key === privacy.PARTIAL_MASKING_KEY), [{ key: 'privacy.partial_masking.enabled', value: 'false' }])
  const controller = read('employees/employees.controller.ts')
  assert.equal((controller.match(/projectEmployee\(/g) ?? []).length, (controller.match(/projectEmployee\([^\n]*(masking|partialMasking\(\))\)/g) ?? []).length, 'مفيش رد بملف موظف من غير حكم الإخفاء')
  assert.match(read('assets/employee-extras.controller.ts'), /const masking = await partialMaskingOn\(this\.custody\.manager\)[\s\S]{0,300}employee: projectEmployee\(employee, user, masking\)/)
  assert.match(read('employees/employee-export.service.ts'), /if \(canSeeFullIdentity\(user, row\.id\)\) continue\n\s+row\.nationalId = maskIdentityPartial\(row\.nationalId\)\n\s+row\.passportNo = maskIdentityPartial\(row\.passportNo\)/)
  assert.match(controller, /@Perm\('employees\.edit'\)\n  @Get\(':id\/data-export'\)/)
  const exporter = read('employees/employee-data-export.ts')
  // P4A-B05: حكم النطاق على صف الموظف المقفول، وكل القراءات بمدير نفس المعاملة
  assert.match(exporter, /return this\.ds\.transaction\(async em => \{/)
  assert.match(exporter, /FROM \[employees\] WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0', \[employeeId\]\)\n\s+if \(!locked \|\| !inBranchScope\(scope, locked\.branchId == null \? null : Number\(locked\.branchId\)\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/, 'نفس نطاق ملف الموظف، على الصف المقفول')
  assert.doesNotMatch(exporter, /this\.ds\.manager|EmployeesService/, 'مفيش قراءة برّه معاملة التصدير')
  assert.match(exporter, /action: 'EMPLOYEE_DATA_EXPORT'/)
  assert.doesNotMatch(exporter, /UPDATE |INSERT |DELETE |\.save\(|\.update\(/, 'قراءة بس')
  const { EMPLOYEE_DATA_SECTIONS } = require('../src/employees/employee-data-export')
  const tables = EMPLOYEE_DATA_SECTIONS.map(section => section.table)
  assert.deepEqual([tables.length, new Set(tables).size, tables.every(table => /^[a-z_]+$/.test(table)), EMPLOYEE_DATA_SECTIONS.every(section => /^[A-Za-z]+$/.test(section.column))], [37, 37, true, true])
  // CR4-SELF: الأقسام المالية والجزاءات بصلاحية اللي بيصدّر، والطلبات السرّية برّه الملف
  assert.deepEqual(EMPLOYEE_DATA_SECTIONS.filter(section => section.access === 'finance').map(section => section.key).sort(),
    ['bonuses', 'deductions', 'loanInstallments', 'loans', 'obligations', 'paymentChanges', 'payrollItems', 'salaryHistory'])
  assert.deepEqual(EMPLOYEE_DATA_SECTIONS.filter(section => section.access === 'penalties').map(section => section.key), ['penalties'])
  assert.match(exporter, /if \(section\.access === 'penalties' && !userHasPerm\(user, 'cases\.penalties'\)\)/)
  assert.match(exporter, /if \(section\.access === 'finance' && !canSeeEmployeesFinance\(user\)\)/)
  // P4A-B04: السرّية بتعريف الطلب الفعلي ثم نوعه، وتأجيل القسط على سرّية السلفة — وأي سجل اتعمل من طلب سري برّه
  assert.match(exporter, /t\.\[code\] = r\.\[definitionCode\] OR t\.\[code\] = r\.\[typeCode\] OR \(t\.\[code\] = N'LOAN' AND r\.\[typeCode\] = N'\$\{LOAN_DEFERRAL_TYPE\}'\)/)
  assert.match(exporter, /r\.\[requesterId\] = @0 AND NOT \$\{CONFIDENTIAL_REQUEST_SQL\} ORDER BY r\.\[id\]/)
  assert.match(exporter, /AND NOT EXISTS \(SELECT 1 FROM dbo\.\[requests\] r WHERE r\.\[id\] = s\.\[requestId\] AND \$\{CONFIDENTIAL_REQUEST_SQL\}\)/)
  for (const forbidden of ['users', 'user_sessions', 'login_events', 'hr_cases', 'hr_case_parties', 'review_responses', 'audit_log']) assert.equal(tables.includes(forbidden), false, forbidden)
  for (const wanted of ['employee_documents', 'leaves', 'payroll_items', 'loans', 'deduction_requests', 'requests', 'employee_suspensions', 'dependents']) assert.ok(tables.includes(wanted), wanted)
})

test('EPU-05 (CR4-SELF): سجل تغيير الهوية والجواز بنفس حكم الخانة — مقفول زي الأول، ومفتوح مخفي لغير صاحب الملف واللي بيعدّل', () => {
  const row = (fieldName, oldValue, newValue, extra = {}) => ({ id: 1, employeeId: 7, changeType: 'DATA', fieldName, oldValue, newValue, oldStatus: null, newStatus: 'change', reason: 'تصحيح', ...extra })
  const rows = [row('nationalId', '2123456789', '2987654321'), row('passportNo', 'A12345678', null), row('jobTitle', 'محاسب', 'محاسب أول'),
    row(null, null, null, { changeType: null, oldStatus: 'nationalId:2123456789', newStatus: 'nationalId:2987654321' })]
  const values = list => list.map(entry => [entry.oldValue, entry.newValue, entry.oldStatus, entry.newStatus])
  const viewer = user(['employees.view']), editor = user(['employees.edit']), self = user([], 7)
  // مقفول (الافتراضي): زي الأول بالحرف لكل الحسابات
  assert.deepEqual(values(projectEmployeeHistory(rows, viewer, 7)), values(projectEmployeeHistory(rows, editor, 7)))
  assert.deepEqual(values(projectEmployeeHistory(rows, viewer, 7, false)), values(projectEmployeeHistory(rows, viewer, 7)))
  assert.equal(projectEmployeeHistory(rows, viewer, 7)[0].oldValue, '2123456789')
  // مفتوح: أرقام الهوية والجواز بآخر 4 خانات، وباقي السطور زي ما هي
  const masked = projectEmployeeHistory(rows, viewer, 7, true)
  assert.deepEqual([masked[0].oldValue, masked[0].newValue, masked[1].oldValue, masked[1].newValue, masked[2].oldValue, masked[2].newValue], ['•••••• 6789', '•••••• 4321', '•••••• 5678', null, 'محاسب', 'محاسب أول'])
  assert.doesNotMatch(JSON.stringify(masked), /2123456789|2987654321|A12345678/)
  for (const allowed of [editor, self]) assert.deepEqual(values(projectEmployeeHistory(rows, allowed, 7, true)), values(projectEmployeeHistory(rows, allowed, 7)))
  const extras = fs.readFileSync(path.join(apiRoot, 'src', 'assets', 'employee-extras.controller.ts'), 'utf8').replace(/\r\n/g, '\n')
  assert.equal((extras.match(/projectEmployeeHistory\(/g) ?? []).length, (extras.match(/projectEmployeeHistory\([^\n]*(masking|partialMaskingOn\(this\.custody\.manager\))\)/g) ?? []).length, 'كل رد بسجل الموظف بياخد حكم الإخفاء')
  assert.match(extras, /documents: maskDocuments \? empDocs\.map\(doc => \(\{ \.\.\.doc, number: maskIdentityPartial\(doc\.number\) \}\)\) : empDocs,/)
})
