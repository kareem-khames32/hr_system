// الخطوة 9 (مسار R2): اختبارات صرفة بلا قاعدة بيانات —
// (1) الراتب الصفري يُستبعد NO_SALARY_DEFINED في الوضعين، (2) الخطاب يرفض القيم المؤقتة،
// (3) ترحيل 021 يكتب نفس نص القيم المؤقتة في الكود والواجهة، وأكواده فريدة ولا يحذف.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')

const { selectPayrollRunSalary } = require('../src/payroll/payroll-run-salary')
const { assertLetterIssuable } = require('../src/letters/letter-issuance')
const { COMPANY_NAME_PLACEHOLDER, JOB_TITLE_PLACEHOLDER, isDataPlaceholder } = require('../src/common/data-placeholders')
const { Employee } = require('../src/employees/employee.entity')
const { RequestsConfig } = require('../src/requests/entities/requests-config.entity')

const migrationFile = path.join(repoRoot, 'docs/migrations/payroll/20260914_021_r2_step9_data_completion.sql')

// معاملة وهمية: لا سجل أجر لأي موظف (نفس حالة الموظف 154 على hr_system)
const noHistoryEm = { queryRunner: { isTransactionActive: true }, query: async () => [] }
const salaryEmployee = overrides => ({ id: 154, currency: null, basicSalary: null, housingAllowance: 0, transportAllowance: 0,
  phoneAllowance: null, workNatureAllowance: null, otherAllowance: 0, ...overrides })

test('R2 / الموظف 154: مكونات الراتب كلها صفر أو فارغة تُستبعد NO_SALARY_DEFINED حتى في الوضع الانتقالي', async () => {
  const strict = await selectPayrollRunSalary(noHistoryEm, salaryEmployee(), '2026-09', 'MONTHLY_HISTORY')
  assert.equal(strict.ok, false)
  assert.equal(strict.code, 'NO_SALARY_DEFINED')

  // قبل R2 كان الوضع الانتقالي يُدخل الموظف براتب صفر (بند بصافي صفر بلا تنبيه)
  const transitional = await selectPayrollRunSalary(noHistoryEm, salaryEmployee(), '2026-09', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  assert.equal(transitional.ok, false, JSON.stringify(transitional))
  assert.equal(transitional.code, 'NO_SALARY_DEFINED')
  assert.match(transitional.message, /2026-09/)
  assert.match(transitional.message, /صفر/)

  const explicitZeros = await selectPayrollRunSalary(noHistoryEm, salaryEmployee({ basicSalary: '0.00', phoneAllowance: 0, workNatureAllowance: '0' }),
    '2026-09', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  assert.equal(explicitZeros.code, 'NO_SALARY_DEFINED')
})

test('R2: أي مكون موجب يبقى راتبًا معرّفًا في الوضع الانتقالي (القاعدة لا تستبعد راتبًا حقيقيًا)', async () => {
  const onlyAllowance = await selectPayrollRunSalary(noHistoryEm, salaryEmployee({ otherAllowance: '0.01' }), '2026-09', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  assert.equal(onlyAllowance.ok, true, JSON.stringify(onlyAllowance))
  assert.equal(onlyAllowance.source.kind, 'CURRENT_FILE_UNVERIFIED')
  assert.deepEqual(onlyAllowance.monthlyComponents, [0, 0, 0, 0, 0, 0.01])

  const normal = await selectPayrollRunSalary(noHistoryEm, salaryEmployee({ basicSalary: 6500, currency: 'SAR' }), '2026-09', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  assert.equal(normal.ok, true)
  assert.equal(normal.source.amounts.basicSalary, '6500.00')

  // قيمة سالبة ليست «صفرًا»: تبقى SALARY_COMPONENT_INVALID كما كانت
  const negative = await selectPayrollRunSalary(noHistoryEm, salaryEmployee({ basicSalary: -1 }), '2026-09', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  assert.equal(negative.code, 'SALARY_COMPONENT_INVALID')
})

function letterEm(employee, config) {
  return {
    getRepository(entity) {
      if (entity === Employee) return { findOneBy: async () => employee }
      if (entity === RequestsConfig) return { findBy: async () => Object.entries(config).map(([key, value]) => ({ key, value })) }
      throw new Error('كيان غير متوقع في الاختبار')
    },
  }
}
const letterEmployee = overrides => ({ id: 10, jobTitle: 'محاسب', joinDate: '2024-01-01', basicSalary: 5000, housingAllowance: 0,
  transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, ...overrides })

test('R2: الخطاب الرسمي يعامل اسم الشركة والمسمى المؤقتين كحقلين ناقصين برسالة عربية واحدة', async () => {
  await assert.rejects(assertLetterIssuable(letterEm(letterEmployee({ jobTitle: JOB_TITLE_PLACEHOLDER }), { 'company.name': COMPANY_NAME_PLACEHOLDER }), 10),
    error => {
      assert.equal(error.getStatus(), 400)
      assert.match(error.message, /اسم الشركة في الإعدادات/)
      assert.match(error.message, /المسمى الوظيفي للموظف/)
      return true
    })
  // مسافات حول القيمة المؤقتة لا تجعلها بيانات حقيقية
  await assert.rejects(assertLetterIssuable(letterEm(letterEmployee(), { 'company.name': `  ${COMPANY_NAME_PLACEHOLDER} ` }), 10), /اسم الشركة/)
  const ok = await assertLetterIssuable(letterEm(letterEmployee(), { 'company.name': 'شركة حقيقية' }), 10)
  assert.equal(ok.company['company.name'], 'شركة حقيقية')
  assert.equal(isDataPlaceholder('محاسب'), false)
  assert.equal(isDataPlaceholder(''), false)
})

test('R2 / ترحيل 021: نص القيم المؤقتة مطابق للكود والواجهة، وأكواد THROW فريدة، ولا حذف', () => {
  const sql = fs.readFileSync(migrationFile, 'utf8')
  assert.ok(sql.includes(`N'${COMPANY_NAME_PLACEHOLDER}'`), 'اسم الشركة المؤقت في الترحيل = الكود')
  assert.ok(sql.includes(`N'${JOB_TITLE_PLACEHOLDER}'`), 'المسمى المؤقت في الترحيل = الكود')
  const frontend = fs.readFileSync(path.join(repoRoot, 'src/lib/data-placeholders.ts'), 'utf8')
  assert.ok(frontend.includes(`'${COMPANY_NAME_PLACEHOLDER}'`) && frontend.includes(`'${JOB_TITLE_PLACEHOLDER}'`), 'الواجهة تستخدم نفس النص')
  // المسمى المؤقت يتسع لعمود employees.jobTitle (nvarchar(100))
  assert.ok(JOB_TITLE_PLACEHOLDER.length <= 100)
  const code = sql.replace(/--.*$/gm, '')
  assert.doesNotMatch(code, /\b(DELETE|TRUNCATE|DROP\s+(TABLE|COLUMN))\b/i)
  // كل تحديث مشروط بالحالة القديمة: لا UPDATE بلا WHERE
  for (const statement of code.split(/;\s*/).filter(part => /\bUPDATE\b/i.test(part))) assert.match(statement, /\bWHERE\b/i, statement)
  const own = [...code.matchAll(/THROW\s+(5\d{4})/g)].map(match => match[1])
  assert.deepEqual(own, ['54101', '54102'])
  const others = []
  for (const dir of ['docs/migrations', 'docs/migrations/payroll']) {
    for (const name of fs.readdirSync(path.join(repoRoot, dir))) {
      const file = path.join(repoRoot, dir, name)
      if (file === migrationFile || !/\.(sql|cjs)$/.test(name)) continue
      others.push(...[...fs.readFileSync(file, 'utf8').matchAll(/THROW\s+(5\d{4})/g)].map(match => match[1]))
    }
  }
  for (const value of own) assert.ok(!others.includes(value), `كود THROW ${value} مستخدم في ترحيل آخر`)
})

// ===== إعادة العمل بعد مراجعة S9-data: القيمة المؤقتة لا تمر كبيان حقيقي في أي مسار =====
const PLACEHOLDER_USER = { sub: 1, role: 'super_admin', permissions: ['*'], branchId: null, employeeId: 1 }
const hrContent = body => ({ title: 'شهادة تعريف', greeting: 'السلام عليكم', body, closing: 'وتقبلوا التحية', footer: '' })

function hrEm({ body, company, employee }) {
  const { HrDocumentTemplate, HrDocumentTemplateRevision } = require('../src/hr-documents/hr-document.entities')
  return {
    findOne: async entity => entity === HrDocumentTemplate ? { id: 1, isActive: true, publishedRevisionId: 7 } : entity === Employee ? employee : null,
    findOneBy: async entity => entity === HrDocumentTemplateRevision ? { id: 7, templateId: 1, name: 'شهادة', category: 'certificate', revision: 1, customFields: [], content: hrContent(body) } : null,
    findBy: async entity => entity === RequestsConfig ? Object.entries(company).map(([key, value]) => ({ key, value })) : [],
  }
}

test('R2 / مستندات HR: رمز اسم الشركة أو المسمى بقيمة مؤقتة يُرفض «بيان مطلوب غير متوفر»، ورأس المستند لا يطبع الاسم المؤقت', async () => {
  const { HrDocumentsService } = require('../src/hr-documents/hr-documents.service')
  const service = new HrDocumentsService({}, {})
  const input = { templateId: 1, revisionId: 7, employeeId: 10, values: {} }
  const employee = { id: 10, branchId: 1, fullName: 'موظف', employeeCode: 'E10', jobTitle: 'محاسب' }
  await assert.rejects(service.prepare(hrEm({ body: 'نشهد بأن الموظف يعمل لدى {{company.name}} حتى تاريخه', company: { 'company.name': ` ${COMPANY_NAME_PLACEHOLDER}` }, employee }), PLACEHOLDER_USER, input, 'REF'),
    error => error.getStatus() === 400 && /بيان مطلوب غير متوفر: اسم الشركة \(company\.name\)/.test(error.message))
  await assert.rejects(service.prepare(hrEm({ body: 'نشهد بأن الموظف يعمل بمسمى {{employee.jobTitle}} لدينا', company: { 'company.name': 'شركة حقيقية' }, employee: { ...employee, jobTitle: JOB_TITLE_PLACEHOLDER } }), PLACEHOLDER_USER, input, 'REF'),
    error => error.getStatus() === 400 && /employee\.jobTitle/.test(error.message))
  // قالب بلا رموز شركة: يُصدر كما قبل 021 لكن رأسه فارغ لا يحمل القيمة المؤقتة
  const bare = await service.prepare(hrEm({ body: 'نشهد بأن حامل هذه الشهادة موظف لدينا', company: { 'company.name': COMPANY_NAME_PLACEHOLDER }, employee }), PLACEHOLDER_USER, input, 'REF')
  assert.equal(bare.snapshot.companyName, '')
  const real = await service.prepare(hrEm({ body: 'نشهد بأن الموظف يعمل بمسمى {{employee.jobTitle}} لدى {{company.name}}', company: { 'company.name': 'شركة حقيقية' }, employee }), PLACEHOLDER_USER, input, 'REF')
  assert.equal(real.snapshot.companyName, 'شركة حقيقية')
  assert.deepEqual(real.snapshot.values, { 'employee.jobTitle': 'محاسب', 'company.name': 'شركة حقيقية' })
})

test('R2 / قوالب الخطابات وبيانات الشركة: الاسم المؤقت = غير مضبوط (التنبيه يظهر، ولا يُحفظ من الإعدادات)', async () => {
  const { LetterTemplatesService } = require('../src/letters/letter-templates.service')
  const catalogFor = async value => new LetterTemplatesService({ manager: { find: async () => [], findOneBy: async () => value === undefined ? null : { key: 'company.name', value } } }, {}).catalog()
  assert.equal((await catalogFor(COMPANY_NAME_PLACEHOLDER)).companyNameConfigured, false)
  assert.equal((await catalogFor('')).companyNameConfigured, false)
  assert.equal((await catalogFor(undefined)).companyNameConfigured, false)
  assert.equal((await catalogFor('شركة حقيقية')).companyNameConfigured, true)

  const { SettingsController } = require('../src/settings/settings.controller')
  const company = await SettingsController.prototype.company.call({ config: { find: async () => [{ key: 'company.name', value: COMPANY_NAME_PLACEHOLDER }, { key: 'company.name_en', value: 'X' }] } })
  assert.equal(company.name, '')
  assert.equal(company.nameEn, 'X')
  await assert.rejects(SettingsController.prototype.upsertConfig.call({ config: { findOne: async () => ({ key: 'company.name', value: '' }), save: async () => assert.fail('لا حفظ') } },
    { key: 'company.name', value: COMPANY_NAME_PLACEHOLDER }, PLACEHOLDER_USER), error => error.getStatus() === 400 && /قيمة مؤقتة/.test(error.message))
})

test('R2 / ملف الموظف وطلب تغيير المسمى: القيمة المؤقتة لا تُحفظ كمسمى مؤكد', async () => {
  const { validate } = require('../node_modules/class-validator')
  const { plainToInstance } = require('../node_modules/class-transformer')
  const { CreateEmployeeDto, UpdateEmployeeDto } = require('../src/employees/employees.dto')
  const jobTitleErrors = async (Dto, jobTitle) => (await validate(plainToInstance(Dto, { jobTitle }))).filter(error => error.property === 'jobTitle')
  for (const Dto of [CreateEmployeeDto, UpdateEmployeeDto]) {
    const rejected = await jobTitleErrors(Dto, JOB_TITLE_PLACEHOLDER)
    assert.equal(rejected.length, 1, Dto.name)
    assert.ok(rejected[0].constraints.isNotDataPlaceholder)
    assert.equal((await jobTitleErrors(Dto, ` ${JOB_TITLE_PLACEHOLDER} `)).length, 1, 'المسافات لا تجعلها بيانًا')
    assert.equal((await jobTitleErrors(Dto, 'محاسب')).length, 0)
  }
  const { assertJobTitle } = require('../src/requests/destinations.service')
  assert.throws(() => assertJobTitle(JOB_TITLE_PLACEHOLDER), error => error.getStatus() === 400 && /قيمة مؤقتة/.test(error.message))
  assert.equal(assertJobTitle(' مشرف '), 'مشرف')
  // التقديم نفسه (TITLE_CHANGE والترقية) يرفض القيمة المؤقتة قبل مسار الاعتماد
  const { assertEmploymentValues } = require('../src/requests/employment-destinations')
  for (const type of [{ code: 'TITLE_CHANGE', destinationHandler: 'employee_update' }, { code: 'PROMOTION', destinationHandler: 'employee_update_promotions' }]) {
    assert.throws(() => assertEmploymentValues(type, { toTitle: JOB_TITLE_PLACEHOLDER }), error => error.getStatus() === 400 && /قيمة مؤقتة/.test(error.message), type.code)
    assert.doesNotThrow(() => assertEmploymentValues(type, { toTitle: 'مشرف' }))
  }
  const { withoutDataPlaceholder } = require('../src/common/data-placeholders')
  assert.equal(withoutDataPlaceholder(`  ${COMPANY_NAME_PLACEHOLDER}`), '')
  assert.equal(withoutDataPlaceholder(null), '')
  assert.equal(withoutDataPlaceholder(' شركة '), 'شركة')
})

test('R2 / ترحيل 024: يعيد القيم الأصلية بنفس نص القيم المؤقتة، بلا حذف، كل UPDATE مشروط، وأكواده فريدة', () => {
  const restoreFile = path.join(repoRoot, 'docs/migrations/payroll/20260914_024_r2b_step9_placeholder_restore.sql')
  const sql = fs.readFileSync(restoreFile, 'utf8')
  assert.ok(sql.includes(`N'${COMPANY_NAME_PLACEHOLDER}'`) && sql.includes(`N'${JOB_TITLE_PLACEHOLDER}'`))
  const code = sql.replace(/--.*$/gm, '')
  assert.doesNotMatch(code, /\b(DELETE|TRUNCATE|DROP\s+(TABLE|COLUMN))\b/i)
  for (const statement of code.split(/;\s*/).filter(part => /\bUPDATE\b/i.test(part))) assert.match(statement, /\bWHERE\b/i, statement)
  const own = [...code.matchAll(/THROW\s+(5\d{4})/g)].map(match => match[1]).sort()
  assert.deepEqual(own, ['54111', '54112'])
  const others = []
  for (const dir of ['docs/migrations', 'docs/migrations/payroll']) {
    for (const name of fs.readdirSync(path.join(repoRoot, dir))) {
      const file = path.join(repoRoot, dir, name)
      if (file === restoreFile || !/\.(sql|cjs)$/.test(name)) continue
      others.push(...[...fs.readFileSync(file, 'utf8').matchAll(/THROW\s+(5\d{4})/g)].map(match => match[1]))
    }
  }
  for (const value of own) assert.ok(!others.includes(value), `كود THROW ${value} مستخدم في ترحيل آخر`)
})
