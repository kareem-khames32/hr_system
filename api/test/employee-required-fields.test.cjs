'use strict'
// قرار المالك 16 سبتمبر: الحقول الإجبارية عند إضافة موظف ورقم الهوية / الإقامة حسب الجنسية.
// اختبارات صرفة: القاعدة المشتركة (الواجهة والخادم)، رسائل CreateEmployeeDto، وأن التعديل لا يمنع ملفًا قديمًا ناقصًا.
// التكامل على SQL (الإنشاء عبر HTTP والتفرد) في employee-suspension.integration.cjs.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/employees/employee-required-fields')
const { CreateEmployeeDto, UpdateEmployeeDto } = require('../src/employees/employees.dto')
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const root = path.resolve(__dirname, '../..')
const today = '2026-09-16'

const complete = (extra = {}) => ({
  employeeCode: 'EMP900', fingerprintCode: '900', fullName: 'أحمد محمد السعيد', phone: '+966501234567', nationalId: '1012345678',
  birthDate: '1990-05-01', gender: 'male', nationality: 'سعودي', jobTitle: 'محاسب', departmentId: 3, branchId: 1,
  joinDate: '2026-09-01', basicSalary: 6000, ...extra,
})
const dtoMessages = (Dto, body) => validateSync(plainToInstance(Dto, body), { whitelist: true })
  .flatMap(error => Object.values(error.constraints ?? {}))

test('رقم الهوية / الإقامة: أرقام فقط وبطول الجنسية المعروفة', () => {
  assert.equal(rules.nationalityKind('سعودي'), 'SAUDI'); assert.equal(rules.nationalityKind(' سعودية '), 'SAUDI')
  assert.equal(rules.nationalityKind('مصري'), 'EGYPTIAN'); assert.equal(rules.nationalityKind('أردني'), 'RESIDENT')
  assert.equal(rules.nationalityKind('أخرى'), 'UNKNOWN'); assert.equal(rules.nationalityKind(''), 'UNKNOWN')
  // سعودي: 10 أرقام تبدأ بـ1
  assert.equal(rules.nationalIdIssue('1012345678', 'سعودي'), null)
  assert.match(rules.nationalIdIssue('2012345678', 'سعودي'), /10 أرقام ويبدأ بـ1/)
  assert.match(rules.nationalIdIssue('101234567', 'سعودي'), /10 أرقام ويبدأ بـ1/)
  // مقيم بجنسية أخرى: إقامة 10 أرقام تبدأ بـ2
  assert.equal(rules.nationalIdIssue('2412345678', 'أردني'), null)
  assert.match(rules.nationalIdIssue('1412345678', 'سوري'), /الإقامة لغير السعودي 10 أرقام ويبدأ بـ2/)
  assert.match(rules.nationalIdIssue('24123456789012', 'سوري'), /ويبدأ بـ2/)
  // مصري: رقم قومي 14 رقم (2 أو 3) أو إقامة 10 أرقام تبدأ بـ2
  assert.equal(rules.nationalIdIssue('29001011234567', 'مصري'), null)
  assert.equal(rules.nationalIdIssue('30101011234567', 'مصري'), null)
  assert.equal(rules.nationalIdIssue('2512345678', 'مصري'), null)
  assert.match(rules.nationalIdIssue('19001011234567', 'مصري'), /الرقم القومي 14 رقم/)
  // جنسية غير معروفة: أرقام 10-14
  assert.equal(rules.nationalIdIssue('123456789012', 'أخرى'), null)
  assert.match(rules.nationalIdIssue('123456789', ''), /من 10 إلى 14 رقم/)
  assert.equal(rules.nationalIdIssue('12AB567890', 'سعودي'), 'رقم الهوية / الإقامة أرقام فقط')
  assert.equal(rules.nationalIdIssue('', 'سعودي'), null, 'الفراغ فحص الإلزام مش الشكل')
  assert.match(rules.nationalIdHint('سعودي'), /تبدأ بـ1/); assert.match(rules.nationalIdHint('هندي'), /تبدأ بـ2/)
})

test('إضافة: كل حقل إجباري ناقص له رسالة بخطوته، والمكتوب يُفحص شكله', () => {
  const empty = rules.employeeRequiredIssues({}, { mode: 'add', today })
  assert.deepEqual(empty.map(issue => issue.key), ['fullName', 'birthDate', 'gender', 'nationality', 'nationalId', 'phone',
    'fingerprintCode', 'joinDate', 'branchId', 'departmentId', 'jobTitle', 'basicSalary'])
  assert.deepEqual(empty.map(issue => issue.step), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3])
  assert.equal(empty.find(issue => issue.key === 'nationality').message, 'الجنسية مطلوبة')
  assert.equal(empty.find(issue => issue.key === 'fingerprintCode').message, 'رقم البصمة مطلوب')
  const values = { ...complete(), branchId: '1', departmentId: '3', basicSalary: '6000' }
  assert.deepEqual(rules.employeeRequiredIssues(values, { mode: 'add', today }), [])
  const bad = rules.employeeRequiredIssues({ ...values, fullName: 'Ahmed Saeed', birthDate: '2026-09-16', nationalId: '2012345678', phone: 'abc', basicSalary: '0' }, { mode: 'add', today })
  assert.deepEqual(bad.map(issue => [issue.key, issue.message]), [
    ['fullName', 'الاسم الكامل لازم يكون بالعربي'], ['birthDate', 'تاريخ الميلاد لازم يكون قبل النهارده'],
    ['nationalId', 'رقم الهوية الوطنية للسعودي 10 أرقام ويبدأ بـ1'], ['phone', 'رقم الجوال غير صالح'],
    ['basicSalary', 'الراتب الأساسي لازم يكون رقم أكبر من صفر'],
  ])
  assert.match(rules.arabicFullNameIssue('أحمد'), /الاسم الأول واسم العائلة/)
  assert.equal(rules.birthDateIssue('1990-02-30', today), 'تاريخ الميلاد غير صحيح')
})

test('تعديل: ملف قديم ناقص يحفظ باقي حقوله، والمسح أو التغيير الغلط بس هو اللي يوقف', () => {
  const legacy = { fullName: 'Legacy Name', nationalId: '13579', nationality: '', branchId: '1', jobTitle: 'فني' }
  assert.deepEqual(rules.employeeRequiredIssues({ ...legacy }, { mode: 'edit', initial: legacy, today }), [], 'نفس القيم القديمة = مفيش مشاكل')
  const cleared = rules.employeeRequiredIssues({ ...legacy, jobTitle: '' }, { mode: 'edit', initial: legacy, today })
  assert.deepEqual(cleared.map(issue => issue.message), ['المسمى الوظيفي مطلوب ولا يمكن مسحه'])
  const nationalityChanged = rules.employeeRequiredIssues({ ...legacy, nationality: 'سعودي' }, { mode: 'edit', initial: legacy, today })
  assert.deepEqual(nationalityChanged.map(issue => issue.key), ['nationalId'], 'تغيير الجنسية يعيد فحص الرقم المحفوظ')
  assert.deepEqual(rules.employeeRequiredIssues({ ...legacy, basicSalary: '' }, { mode: 'edit', initial: { ...legacy, basicSalary: '5000' }, today }), [],
    'الأجر في التعديل له مسار تغيير الأجر')
})

test('CreateEmployeeDto: رسالة عربية واحدة لكل حقل إجباري، وUpdateEmployeeDto يفضل اختياري', () => {
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete()), [])
  const messages = dtoMessages(CreateEmployeeDto, { employeeCode: 'EMP901', fullName: 'سارة علي', branchId: 1 })
  assert.deepEqual(messages.sort(), [
    'الجنس مطلوب (ذكر أو أنثى)', 'الجنسية مطلوبة', 'الراتب الأساسي مطلوب', 'القسم مطلوب', 'المسمى الوظيفي مطلوب',
    'تاريخ التعيين مطلوب بصيغة YYYY-MM-DD', 'تاريخ الميلاد مطلوب بصيغة YYYY-MM-DD', 'رقم البصمة مطلوب',
    'رقم الجوال مطلوب وصالح', 'رقم الهوية / الإقامة مطلوب — أرقام فقط (من 10 إلى 14 رقم)',
  ].sort())
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ basicSalary: 0 })), ['الراتب الأساسي لازم يكون رقم أكبر من صفر'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationality: '   ' })), ['الجنسية مطلوبة'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ fingerprintCode: 'X'.repeat(21) })), ['رقم البصمة بحد أقصى 20 حرف'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ status: 'suspended' })), ['حالة الموظف عند الإضافة: نشط أو تحت التجربة'])
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { phone: '0501234567' }), [], 'التعديل بحقل واحد يمر')
})

test('الواجهة: نموذج الموظف يستخدم نفس القاعدة ويعلّم الخانات الإجبارية', () => {
  const form = fs.readFileSync(path.join(root, 'src/components/EmployeeForm.tsx'), 'utf8')
  assert.match(form, /from '\.\.\/\.\.\/api\/src\/employees\/employee-required-fields'/)
  assert.match(form, /employeeRequiredIssues\(requiredValuesOf\(form\), \{ mode, initial: initialRequired/)
  for (const label of ['تاريخ الميلاد *', 'الجنس *', 'الجنسية *', 'رقم الهوية / الإقامة *', 'رقم الجوال *', 'رقم البصمة *', 'الإدارة/القسم *', 'المسمى الوظيفي *']) {
    assert.ok(form.includes(`<label className="label">${label}</label>`), label)
  }
  assert.match(form, /nationalIdHint\(form\.nationality\)/)
  // «موقوف» المعروضة مشتقة من التواريخ: الحالة لا تُرسل في التعديل إلا لو اتغيرت
  assert.match(form, /if \(mode === 'add' \|\| form\.status !== initial\?\.status\) payload\.status = form\.status/)
})

// تدقيق ما قبل التشغيل (موجة أ): غلطة سنة في تاريخ التعيين كانت بتعدي وتخلق موظف مايدخلش أي مسير،
// وفرع مكتوب صراحةً كان بيتكتب عليه فرع المستخدم في السكوت.
test('تاريخ التعيين: سقف سنة قدّام، والمُرحّلون بـ1900-01-01 يعدّوا', () => {
  const today = '2026-09-21'
  assert.equal(rules.joinDateIssue('2026-09-21', today), null)
  assert.equal(rules.joinDateIssue('1900-01-01', today), null, 'المُرحّلون بتاريخ 1900-01-01 مايتمنعوش')
  assert.equal(rules.joinDateIssue('2027-09-21', today), null, 'سنة واحدة قدّام مقبولة')
  assert.match(String(rules.joinDateIssue('2126-01-01', today)), /أبعد من سنة/)
  assert.match(String(rules.joinDateIssue('2027-09-22', today)), /أبعد من سنة/)
  assert.match(String(rules.joinDateIssue('1899-12-31', today)), /غير صحيح/)
  assert.match(String(rules.joinDateIssue('2026-13-01', today)), /غير صحيح/)
  assert.notEqual(rules.employeeFieldFormatIssue('joinDate', { joinDate: '2126-01-01' }, today), null, 'القاعدة المشتركة بتستدعي نفس الفحص')
  assert.equal(rules.employeeFieldFormatIssue('joinDate', { joinDate: '2026-01-01' }, today), null)
})

test('إضافة موظف: فرع غير فرع المستخدم يُرفض صراحةً بدل إعادة كتابته', () => {
  const controller = fs.readFileSync(path.join(__dirname, '../src/employees/employees.controller.ts'), 'utf8').split(String.fromCharCode(13)).join('')
  assert.ok(controller.includes("throw new ForbiddenException('مش مسموح تضيف موظف على فرع غير فرعك')"))
  assert.ok(controller.includes('Number(dto.branchId) !== scope'))
  assert.ok(controller.includes('dto.branchId = scope'), 'الفرع لسه بيتحدد للمستخدم المقيّد لما مايبعتش فرع')
})
