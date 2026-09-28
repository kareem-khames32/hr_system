'use strict'
// قرار المالك 16 سبتمبر: الحقول الإجبارية عند إضافة موظف. قرار 28 سبتمبر: رقم الهوية / الإقامة أو رقم جواز السفر —
// أي صيغة لأي جنسية وواحد منهم على الأقل (من غير قواعد دولة).
// اختبارات صرفة: القاعدة المشتركة (الواجهة والخادم)، رسائل CreateEmployeeDto، وأن التعديل لا يمنع ملفًا قديمًا ناقصًا.
// التكامل على SQL (الإنشاء والتعديل عبر HTTP والتفرد والملف) في employee-suspension.integration.cjs وnational-id-or-passport.integration.cjs.
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

test('رقم الهوية / الإقامة والجواز: أي صيغة لأي جنسية بعد التطبيع — من غير قواعد دولة', () => {
  // تصنيف الجنسية فاضل للتأمينات الاجتماعية بس (social-insurance.ts) — مالوش دعوة برقم الهوية
  assert.equal(rules.nationalityKind('سعودي'), 'SAUDI'); assert.equal(rules.nationalityKind(' سعودية '), 'SAUDI')
  assert.equal(rules.nationalityKind('مصري'), 'EGYPTIAN'); assert.equal(rules.nationalityKind('أردني'), 'RESIDENT')
  assert.equal(rules.nationalIdHint, undefined, 'مفيش ملحوظة حسب الجنسية')
  assert.equal(rules.IDENTITY_HINT, 'رقم الهوية أو رقم جواز السفر — واحد منهم على الأقل')
  // التطبيع: من غير أي مسافات (ولا علامات اتجاه/عرض صفري)، الأرقام العربية/الفارسية لاتينية، والحروف الإنجليزية كبيرة بس
  const hidden = String.fromCharCode(0x200f, 0x202b, 0x200b, 0xa0, 0x061c, 0x2066)
  assert.equal(rules.normalizeIdentityNumber(' a b-1٢۳ '), 'AB-123')
  assert.equal(rules.normalizeIdentityNumber(`${hidden}ab\t12${hidden}`), 'AB12')
  assert.equal(rules.normalizeIdentityNumber('é1'), 'é1', 'الحروف غير الإنجليزية مش بتتحوّل — الشكل بيرفضها')
  assert.equal(rules.normalizeIdentityNumber(null), '')
  assert.equal(rules.identityValue('   '), null); assert.equal(rules.identityValue(undefined), undefined); assert.equal(rules.identityValue(' x-1 '), 'X-1')
  // الشكل واحد لأي جنسية: حروف إنجليزية وأرقام وشرطة، من 3 لـ 50 (الهوية) أو 40 (الجواز)
  for (const id of ['1012345678', '2123456789', '29001011234567', '123', 'ab-12', 'G1234567-X', 'X'.repeat(50)]) assert.equal(rules.nationalIdIssue(id), null, id)
  for (const id of ['12', '12/34', 'AB_12', 'أ123', 'é12', 'X'.repeat(51)]) assert.equal(rules.nationalIdIssue(id), 'رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)', id)
  assert.equal(rules.nationalIdIssue(''), null, 'الفراغ فحص الإلزام مش الشكل')
  for (const passport of ['a1234567', 'P-99', 'X'.repeat(40)]) assert.equal(rules.passportNoIssue(passport), null, passport)
  for (const passport of ['A1', 'A.123', 'X'.repeat(41)]) assert.equal(rules.passportNoIssue(passport), 'رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)', passport)
  // الجنسية مالهاش دعوة بالشكل
  assert.equal(rules.employeeFieldFormatIssue('nationalId', { nationalId: '2123456789', nationality: 'سعودي' }, today), null)
  assert.equal(rules.employeeFieldFormatIssue('nationalId', { nationalId: '1123456789', nationality: 'أردني' }, today), null)
})

test('إضافة: كل حقل إجباري ناقص له رسالة بخطوته، والمكتوب يُفحص شكله', () => {
  const empty = rules.employeeRequiredIssues({}, { mode: 'add', today })
  assert.deepEqual(empty.map(issue => issue.key), ['fullName', 'birthDate', 'gender', 'nationality', 'nationalId', 'phone',
    'fingerprintCode', 'joinDate', 'branchId', 'departmentId', 'jobTitle', 'basicSalary'])
  assert.deepEqual(empty.map(issue => issue.step), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3])
  assert.equal(empty.find(issue => issue.key === 'nationality').message, 'الجنسية مطلوبة')
  assert.equal(empty.find(issue => issue.key === 'nationalId').message, 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل')
  assert.equal(empty.find(issue => issue.key === 'fingerprintCode').message, 'رقم البصمة مطلوب')
  const values = { ...complete(), branchId: '1', departmentId: '3', basicSalary: '6000' }
  assert.deepEqual(rules.employeeRequiredIssues(values, { mode: 'add', today }), [])
  // واحد منهم يكفي: الجواز لوحده، أو هوية بأي صيغة لوحدها
  assert.deepEqual(rules.employeeRequiredIssues({ ...values, nationalId: '', passportNo: 'a1234567' }, { mode: 'add', today }), [])
  assert.deepEqual(rules.employeeRequiredIssues({ ...values, nationalId: 'ab-778899', nationality: 'هندي' }, { mode: 'add', today }), [])
  const bad = rules.employeeRequiredIssues({ ...values, fullName: 'Ahmed Saeed', birthDate: '2026-09-16', nationalId: '12/3', passportNo: 'A/1', phone: 'abc', basicSalary: '0' }, { mode: 'add', today })
  assert.deepEqual(bad.map(issue => [issue.key, issue.step, issue.message]), [
    ['fullName', 1, 'الاسم الكامل لازم يكون بالعربي'], ['birthDate', 1, 'تاريخ الميلاد لازم يكون قبل النهارده'],
    ['nationalId', 1, 'رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)'],
    ['passportNo', 1, 'رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)'], ['phone', 1, 'رقم الجوال غير صالح'],
    ['basicSalary', 3, 'الراتب الأساسي لازم يكون رقم أكبر من صفر'],
  ])
  assert.match(rules.arabicFullNameIssue('أحمد'), /الاسم الأول واسم العائلة/)
  assert.equal(rules.birthDateIssue('1990-02-30', today), 'تاريخ الميلاد غير صحيح')
})

test('تعديل: ملف قديم ناقص يحفظ باقي حقوله، والمسح أو التغيير الغلط بس هو اللي يوقف', () => {
  const legacy = { fullName: 'Legacy Name', nationalId: '13/579', nationality: '', branchId: '1', jobTitle: 'فني' }
  const edit = (values, initial = legacy) => rules.employeeRequiredIssues(values, { mode: 'edit', initial, today })
  assert.deepEqual(edit({ ...legacy }), [], 'نفس القيم القديمة = مفيش مشاكل (حتى لو شكل المحفوظ قديم)')
  assert.deepEqual(edit({ ...legacy, jobTitle: '' }).map(issue => issue.message), ['المسمى الوظيفي مطلوب ولا يمكن مسحه'])
  assert.deepEqual(edit({ ...legacy, nationality: 'سعودي' }), [], 'الجنسية مابقتش تعيد فحص رقم الهوية')
  assert.deepEqual(edit({ ...legacy, basicSalary: '' }, { ...legacy, basicSalary: '5000' }), [], 'الأجر في التعديل له مسار تغيير الأجر')
  // مسح واحد مسموح لو التاني فاضل، ومسح الاتنين مرفوض
  const both = { ...legacy, nationalId: '1012345678', passportNo: 'A1234567' }
  assert.deepEqual(edit({ ...both, nationalId: '' }, both), [])
  assert.deepEqual(edit({ ...both, passportNo: null }, both), [])
  assert.deepEqual(edit({ ...both, nationalId: '', passportNo: '' }, both).map(issue => [issue.key, issue.message]),
    [['nationalId', 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل']])
  // ملف قديم من غير الاتنين: باقي حقوله تتحفظ، والرقم الجديد يُفحص شكله
  const none = { ...legacy, nationalId: null, passportNo: null }
  assert.deepEqual(edit({ ...none, jobTitle: 'فني أول' }, none), [])
  assert.deepEqual(edit({ ...none, passportNo: 'A1' }, none).map(issue => issue.key), ['passportNo'])
  // نفس الرقم بمسافات أو حروف صغيرة مش تغيير؛ رقم جديد بشكل غلط يُرفض
  assert.deepEqual(edit({ ...both, nationalId: ' 1012 345 678 ', passportNo: 'a1234567' }, both), [])
  assert.deepEqual(edit({ ...legacy, nationalId: '99/1' }).map(issue => issue.key), ['nationalId'])
})

test('CreateEmployeeDto: رسالة عربية واحدة لكل حقل إجباري، وUpdateEmployeeDto يفضل اختياري', () => {
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete()), [])
  const messages = dtoMessages(CreateEmployeeDto, { employeeCode: 'EMP901', fullName: 'سارة علي', branchId: 1 })
  assert.deepEqual(messages.sort(), [
    'الجنس مطلوب (ذكر أو أنثى)', 'الجنسية مطلوبة', 'الراتب الأساسي مطلوب', 'القسم مطلوب', 'المسمى الوظيفي مطلوب',
    'تاريخ التعيين مطلوب بصيغة YYYY-MM-DD', 'تاريخ الميلاد مطلوب بصيغة YYYY-MM-DD', 'رقم البصمة مطلوب',
    'رقم الجوال مطلوب وصالح', 'لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل',
  ].sort())
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ basicSalary: 0 })), ['الراتب الأساسي لازم يكون رقم أكبر من صفر'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationality: '   ' })), ['الجنسية مطلوبة'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ fingerprintCode: 'X'.repeat(21) })), ['رقم البصمة بحد أقصى 20 حرف'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ status: 'suspended' })), ['حالة الموظف عند الإضافة: نشط أو تحت التجربة'])
  // رقم الهوية أو الجواز: واحد يكفي، وبأي صيغة بعد التطبيع
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationalId: undefined, passportNo: 'a 1234567' })), [])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationalId: '   ', passportNo: '' })), ['لازم رقم الهوية / الإقامة أو رقم جواز السفر — واحد منهم على الأقل'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationalId: 'ab-12' })), [])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationalId: '12/34' })), ['رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)'])
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ nationalId: 1012345678 })), ['رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)'], 'رقم مش نص مرفوض')
  assert.deepEqual(dtoMessages(CreateEmployeeDto, complete({ passportNo: 'A.1' })), ['رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)'])
  const normalized = plainToInstance(CreateEmployeeDto, complete({ nationalId: ' ab 12٣ ', passportNo: '  ' }))
  assert.equal(normalized.nationalId, 'AB123'); assert.equal(normalized.passportNo, null)
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { phone: '0501234567' }), [], 'التعديل بحقل واحد يمر')
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { nationalId: null, passportNo: '' }), [], 'المسح في التعديل حكمه في الخدمة')
  assert.equal(plainToInstance(UpdateEmployeeDto, { passportNo: '' }).passportNo, null)
  // التعديل: الـDTO بيفحص النوع والطول بس، والشكل للقيمة المتغيرة فعلًا في الخدمة — رقم قديم بصيغة قديمة يحفظ باقي الملف
  // (مراجعة Codex الجولة 17، CR17-N01؛ رفض القيمة الجديدة الغلط في الخدمة متغطي في national-id-or-passport ID-02/ID-04)
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { passportNo: 'AB/123' }), [], 'رقم قديم بصيغة قديمة يعدّي الـDTO')
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { passportNo: 'A'.repeat(41) }), ['رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)'])
  assert.deepEqual(dtoMessages(UpdateEmployeeDto, { nationalId: 1012345678 }), ['رقم الهوية / الإقامة: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 50)'], 'رقم مش نص مرفوض')
})

test('الواجهة: نموذج الموظف يستخدم نفس القاعدة ويعلّم الخانات الإجبارية', () => {
  const form = fs.readFileSync(path.join(root, 'src/components/EmployeeForm.tsx'), 'utf8')
  assert.match(form, /from '\.\.\/\.\.\/api\/src\/employees\/employee-required-fields'/)
  assert.match(form, /employeeRequiredIssues\(requiredValuesOf\(form\), \{ mode, initial: initialRequired/)
  for (const label of ['تاريخ الميلاد *', 'الجنس *', 'الجنسية *', 'رقم الهوية / الإقامة *', 'رقم جواز السفر *', 'رقم الجوال *', 'رقم البصمة *', 'الإدارة/القسم *', 'المسمى الوظيفي *']) {
    assert.ok(form.includes(`<label className="label">${label}</label>`), label)
  }
  // الخانتين جنب بعض بملحوظة واحدة، وبيتطبّعوا وإنت بتكتب؛ مفيش ملحوظة حسب الجنسية
  assert.match(form, /\{IDENTITY_HINT\}/)
  assert.match(form, /setField\('nationalId', normalizeIdentityNumber\(e\.target\.value\)\)/)
  assert.match(form, /setField\('passportNo', normalizeIdentityNumber\(e\.target\.value\)\)/)
  assert.match(form, /passportNo: state\.passportNo/)
  assert.doesNotMatch(form, /nationalIdHint/)
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
  assert.ok(controller.includes("throw new ForbiddenException(scope.length > 1 ? 'مش مسموح تضيف موظف على فرع برّه فروعك' : 'مش مسموح تضيف موظف على فرع غير فرعك')"))
  assert.ok(controller.includes('dto.branchId != null && !scope.includes(Number(dto.branchId))'))
  // فرع واحد: الفرع بيتحدد للمستخدم المقيّد لما مايبعتش فرع؛ أكتر من فرع: لازم يختار (مفيش اختيار صامت)؛ ونطاق فاضي ممنوع
  assert.ok(controller.includes('dto.branchId = dto.branchId != null ? Number(dto.branchId) : scope[0]'), 'الفرع لسه بيتحدد للمستخدم المقيّد لما مايبعتش فرع')
  assert.ok(controller.includes("if (dto.branchId == null && scope.length > 1) throw new BadRequestException('حسابك على أكتر من فرع — اختار فرع الموظف')"))
  assert.ok(controller.includes("if (scope.length === 0) throw new ForbiddenException('حسابك مش مربوط بفرع — مايقدرش يضيف موظفين')"))
})
