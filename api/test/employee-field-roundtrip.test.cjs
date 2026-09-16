'use strict'
// إصلاحات ذهاب/عودة حقول الموظف والشاشات المرتبطة: كل مدخل يُحفظ ويعود ويُعرض كما أُدخل.
// دوال صرفة وDTO وخدمة بمستودعات وهمية وSSR لنموذج الموظف؛ لا SQL ولا خدمة حية ولا fetch حقيقي.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), Module = require('node:module')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const root = path.resolve(__dirname, '../..')
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const f = require('../../src/lib/employee-form-fields')
const history = require('../../src/lib/employee-history')
const limits = require('../../src/lib/input-limits')
const docTypes = require('../../src/lib/doc-types')
const { terminationReasonLabel } = require('../../src/lib/termination-reasons')
const rules = require('../src/employees/employee-input-rules')
const custodyDto = require('../src/assets/custody.dto')
const lineDto = require('../src/offboarding/settlement-line.dto')
const messages = (Dto, plain) => validateSync(plainToInstance(Dto, plain)).flatMap(error => Object.values(error.constraints ?? {}))

function renderForm(step, props) {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const load = Module._load, useState = React.useState
  let first = true
  Module._load = function (request, parent, isMain) {
    if (request === '@/components/layout') return { MainLayout: ({ children }) => React.createElement('main', null, children) }
    if (request === 'next/link') return ({ children, ...attributes }) => React.createElement('a', attributes, children)
    return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
  }
  React.useState = initial => { if (first) { first = false; return useState(step) } return useState(initial) }
  try {
    const Form = require('../../src/components/EmployeeForm').default
    return renderToStaticMarkup(React.createElement(Form, { onSubmit: async () => {}, submitting: false, error: '', ...props }))
  } finally { Module._load = load; React.useState = useState }
}

// ===== 1) الرصيد الافتتاحي =====
test('الرصيد الافتتاحي: حفظ تعديل بلا تغيير لا يرسل الأيام، والتغيير يرسلها، و«لا يستحق» لا يرسل شيئًا', () => {
  const initial = f.initialOpeningBalance({ openingBalanceDays: 9, openingBalanceExpiry: null })
  assert.deepEqual(initial, { days: '9', expiryMode: 'no_expiry', expiryDate: '' })
  const edit = state => f.openingBalancePayload({ mode: 'edit', leaveEntitled: true, state, initial, year: 2026 })
  assert.deepEqual(edit(initial), {}, 'القيمة المعبّأة لم تُلمس فلا تُرسل (كانت تُصفّر المستخدم منها)')
  assert.deepEqual(edit({ ...initial, days: '10' }), { openingBalanceDays: 10, openingBalanceExpiry: null })
  assert.deepEqual(edit({ ...initial, expiryMode: 'end_of_year' }), { openingBalanceDays: 9, openingBalanceExpiry: '2026-12-31' })
  // صلاحية «نهاية سنة» سابقة محمّلة ولم تُلمس لا تتحول بصمت إلى نهاية السنة الجارية
  const lastYear = f.initialOpeningBalance({ openingBalanceDays: 5, openingBalanceExpiry: '2025-12-31' }, 2026)
  assert.deepEqual(f.openingBalancePayload({ mode: 'edit', leaveEntitled: true, state: lastYear, initial: lastYear, year: 2026 }), {})
  // 31/12 من سنة ماضية تاريخ محدد لا «نهاية السنة الحالية»، وتعديل الأيام وحده لا يمدّ رصيدًا منتهيًا
  assert.deepEqual(lastYear, { days: '5', expiryMode: 'custom_date', expiryDate: '2025-12-31' })
  assert.deepEqual(f.openingBalancePayload({ mode: 'edit', leaveEntitled: true, state: { ...lastYear, days: '6' }, initial: lastYear, year: 2026 }),
    { openingBalanceDays: 6, openingBalanceExpiry: '2025-12-31' })
  assert.deepEqual(f.initialOpeningBalance({ openingBalanceDays: 5, openingBalanceExpiry: '2026-12-31' }, 2026), { days: '5', expiryMode: 'end_of_year', expiryDate: '' })
  assert.deepEqual(f.initialOpeningBalance({ openingBalanceDays: 5, openingBalanceExpiry: '2026-12-15' }), { days: '5', expiryMode: 'custom_date', expiryDate: '2026-12-15' })
  assert.deepEqual(f.initialOpeningBalance(undefined), { days: '', expiryMode: 'end_of_year', expiryDate: '' })
  const add = (state, leaveEntitled = true) => f.openingBalancePayload({ mode: 'add', leaveEntitled, state, year: 2026 })
  assert.deepEqual(add({ days: '7', expiryMode: 'custom_date', expiryDate: '2026-12-15' }), { openingBalanceDays: 7, openingBalanceExpiry: '2026-12-15' })
  assert.deepEqual(add({ days: '7', expiryMode: 'no_expiry', expiryDate: '' }, false), {}, 'رصيد كُتب ثم اختير «لا يستحق» لا يُرسل')
  for (const days of ['', '0', '-3', 'x', '   ']) assert.deepEqual(add({ days, expiryMode: 'no_expiry', expiryDate: '' }), {})
})

test('«حتى تاريخ أحدده» يطلب تاريخًا صالحًا غير ماضٍ، والتاريخ المحفوظ غير الملموس لا يمنع الحفظ', () => {
  const issue = (state, extra = {}) => f.openingBalanceIssue({ mode: 'add', leaveEntitled: true, today: '2026-09-15', state, ...extra })
  const custom = expiryDate => ({ days: '7', expiryMode: 'custom_date', expiryDate })
  assert.match(issue(custom('')), /اختر تاريخ انتهاء الرصيد الافتتاحي/)
  assert.match(issue(custom('2026-02-30')), /غير صالح/)
  assert.match(issue(custom('2026-09-14')), /لا يكون في الماضي/)
  assert.equal(issue(custom('2026-09-15')), null)
  assert.equal(issue(custom(''), { leaveEntitled: false }), null)
  assert.equal(issue({ days: '', expiryMode: 'custom_date', expiryDate: '' }), null)
  assert.equal(issue({ days: '7', expiryMode: 'no_expiry', expiryDate: '' }), null)
  const expired = f.initialOpeningBalance({ openingBalanceDays: 5, openingBalanceExpiry: '2026-03-31' })
  assert.equal(f.openingBalanceIssue({ mode: 'edit', leaveEntitled: true, today: '2026-09-15', state: expired, initial: expired }), null)
  assert.match(f.openingBalanceIssue({ mode: 'edit', leaveEntitled: true, today: '2026-09-15', state: { ...expired, expiryDate: '2026-04-30' }, initial: expired }), /الماضي/)
})

test('الخادم: نفس الأيام والصلاحية بلا تغيير، والمستخدم من الطبقة يبقى محدودًا بالأيام الجديدة', () => {
  assert.equal(rules.nextOpeningBalance({ openingDays: '5.00', openingTaken: '1.00', openingExpiry: '2026-12-31' }, 5, '2026-12-31'), null)
  assert.equal(rules.nextOpeningBalance({ openingDays: 9, openingTaken: 0, openingExpiry: null }, 9, null), null)
  assert.equal(rules.nextOpeningBalance({ openingDays: 5, openingTaken: 1, openingExpiry: new Date('2026-12-31T00:00:00Z') }, 5, '2026-12-31'), null)
  assert.deepEqual(rules.nextOpeningBalance({ openingDays: 5, openingTaken: 1, openingExpiry: '2026-12-31' }, 8, '2026-12-31'), { openingDays: 8, openingTaken: 1, openingExpiry: '2026-12-31' })
  assert.deepEqual(rules.nextOpeningBalance({ openingDays: 5, openingTaken: 4, openingExpiry: null }, 3, null), { openingDays: 3, openingTaken: 3, openingExpiry: null })
  assert.deepEqual(rules.nextOpeningBalance({ openingDays: 5, openingTaken: 1, openingExpiry: '2026-12-31' }, 5, null), { openingDays: 5, openingTaken: 1, openingExpiry: null })
})

test('الخدمة: تعديل بنفس الرصيد لا يكتب، وتغييره يُبقي المستخدم منه، وسبب الأرشفة الطويل يُرفض قبل أي قراءة', async () => {
  const { EmployeesService } = require('../src/employees/employees.service')
  const service = (annual, employeesRepo = { findOne: async () => ({ id: 10, annualLeaveEntitled: true }) }) => {
    const saves = []
    const balances = {
      findOne: async ({ where }) => (where.balanceType === 'annual' ? annual : { id: 16, balanceType: 'sick' }),
      save: async row => { saves.push({ ...row }); return row },
      create: row => row,
    }
    const instance = new EmployeesService(employeesRepo, {}, {}, {}, balances, { findOne: async () => null }, {}, {}, {}, {})
    return { instance, saves }
  }
  const same = service({ id: 15, openingDays: '5.00', openingTaken: '1.00', openingExpiry: '2026-12-31' })
  await same.instance.applyOpeningBalance(10, 5, '2026-12-31')
  assert.equal(same.saves.length, 0, 'لا حفظ عند تطابق الأيام والصلاحية')
  const changed = service({ id: 15, openingDays: '5.00', openingTaken: '1.00', openingExpiry: '2026-12-31' })
  await changed.instance.applyOpeningBalance(10, 7, '2026-12-31')
  assert.deepEqual(changed.saves.map(row => [row.openingDays, row.openingTaken, row.openingExpiry]), [[7, 1, '2026-12-31']])
  let reads = 0
  const archive = service(null, { findOne: async () => { reads++; return null } })
  await assert.rejects(archive.instance.archive(231, null, 'س'.repeat(350), 12), error => error.getStatus?.() === 400 && /300/.test(error.message))
  assert.equal(reads, 0)
})

// ===== 2) الدرجة والمسمى =====
test('الدرجة والمسمى من الكتالوج: الفعّال فقط بأسمائه، والمحفوظ المعطّل أو خارج الكتالوج يبقى خيارًا', () => {
  const grades = [{ id: 1, name: 'الدرجة الأولى', isActive: true }, { id: 2, name: 'الدرجة الثانية', isActive: true }, { id: 3, name: 'الدرجة الثالثة', isActive: false }]
  assert.deepEqual(f.gradeSelectOptions(grades, ''), [{ value: '1', label: 'الدرجة الأولى' }, { value: '2', label: 'الدرجة الثانية' }])
  assert.deepEqual(f.gradeSelectOptions(grades, '2').map(option => option.label), ['الدرجة الأولى', 'الدرجة الثانية'], 'التعديل يعرض «الدرجة الثانية» لا «Grade 2»')
  assert.deepEqual(f.gradeSelectOptions(grades, '3').at(-1), { value: '3', label: 'الدرجة الثالثة (معطّلة)' })
  assert.ok(!f.gradeSelectOptions(grades, '').some(option => ['4', '5'].includes(option.value) || /Grade/.test(option.label)))
  const titles = [{ id: 1, title: 'محاسب', isActive: true }, { id: 2, title: 'مهندس برمجيات', isActive: true }, { id: 3, title: 'مدير النظام', isActive: false }]
  assert.deepEqual(f.jobTitleSelectOptions(titles, '').map(option => option.value), ['محاسب', 'مهندس برمجيات'])
  assert.deepEqual(f.jobTitleSelectOptions(titles, 'محاسب').length, 2)
  assert.deepEqual(f.jobTitleSelectOptions(titles, 'محلل نظم')[0], { value: 'محلل نظم', label: 'محلل نظم (القيمة الحالية)' })
  const form = source('src/components/EmployeeForm.tsx')
  assert.doesNotMatch(form, /Grade [1-5]|jobTitleOptions/)
  assert.match(form, /fetchCatalog<[^>]+>\('grades'\)/); assert.match(form, /fetchCatalog<[^>]+>\('job-titles'\)/)
})

// ===== 3) نوع المستند =====
test('نوع المستند من كتالوج doc_types: «خطاب رسمي» متاح، وأكواد الخطابات المرفوضة ليست خيارًا، والقديم «(نوع قديم)»', () => {
  const rows = [['contract', 'عقد عمل'], ['cv', 'السيرة الذاتية'], ['letter', 'خطاب رسمي'], ['other', 'أخرى']]
    .map(([code, nameAr], index) => ({ id: index + 1, code, nameAr, isActive: true })).concat([{ id: 9, code: 'iqama', nameAr: 'إقامة', isActive: false }])
  const options = docTypes.docTypeSelectOptions(rows, '')
  assert.ok(options.some(option => option.value === 'letter' && option.label === 'خطاب رسمي'))
  for (const code of ['salary_certificate', 'bank_letter', 'embassy_letter', 'clearance_form', 'iqama']) assert.ok(!options.some(option => option.value === code), code)
  assert.deepEqual(docTypes.docTypeSelectOptions(rows, 'bank_letter').at(-1), { value: 'bank_letter', label: 'خطاب تعريف للبنك (نوع قديم)' })
  assert.equal(docTypes.docTypeLabel('letter'), 'خطاب رسمي')
  const page = source('src/app/employees/documents/page.tsx')
  assert.doesNotMatch(page, /DOC_TYPES/); assert.match(page, /loadDocTypes\(\)/); assert.match(page, /docTypeSelectOptions\(docTypes, uploadForm\.docType\)/)
})

// ===== 4) تفاصيل قرار إنهاء الخدمة =====
test('ملف إنهاء الخدمة يعرض السبب وتاريخ الإشعار والملاحظتين وإيقاف الحساب من رد GET /offboarding/:id', () => {
  assert.equal(terminationReasonLabel('contract_end'), 'انتهاء مدة العقد')
  assert.equal(terminationReasonLabel('dismissal'), 'فصل تأديبي')
  assert.equal(terminationReasonLabel(null), '—'); assert.equal(terminationReasonLabel('legacy_code'), 'legacy_code')
  const page = source('src/app/offboarding/[id]/page.tsx')
  assert.match(page, /تفاصيل القرار/)
  for (const field of ['terminationReason', 'noticeDate', 'notes', 'exitInterviewNotes', 'accessRevokedAt']) assert.match(page, new RegExp(`det\\.${field}`), field)
  assert.match(source('src/app/employees/[id]/terminate/page.tsx'), /TERMINATION_REASON_LABELS as reasons/)
})

// ===== 5–7) حدود النصوص =====
test('سبب الأرشفة: 300 حرف في الواجهة والخادم (عمود nvarchar(300)) برسالة عربية بدل 500', () => {
  assert.equal(limits.archiveReasonIssue('x'.repeat(300)), null)
  assert.match(limits.archiveReasonIssue('x'.repeat(301)), /بحد أقصى 300 حرف/)
  assert.doesNotThrow(() => rules.assertArchiveReason(undefined))
  assert.doesNotThrow(() => rules.assertArchiveReason('  ' + 'x'.repeat(300) + '  '))
  assert.throws(() => rules.assertArchiveReason('x'.repeat(350)), error => error.getStatus() === 400 && error.message === 'سبب الأرشفة بحد أقصى 300 حرف')
  assert.throws(() => rules.assertArchiveReason(5), error => error.getStatus() === 400)
  const page = source('src/app/employees/page.tsx')
  assert.match(page, /archiveReasonIssue\(reason\)/); assert.match(page, /ARCHIVE_REASON_MAX/)
})

test('نصوص العهد: 100 حرف في الـDTO والواجهة، ورسائل عربية بدل «must be shorter than»', () => {
  assert.deepEqual(messages(custodyDto.TransferCustodyDto, { toEmployeeId: 5, note: 'x'.repeat(100) }), [])
  assert.deepEqual(messages(custodyDto.TransferCustodyDto, { toEmployeeId: 5, note: 'x'.repeat(150) }), ['ملاحظة النقل بحد أقصى 100 حرف'])
  assert.deepEqual(messages(custodyDto.TransferCustodyDto, { toEmployeeId: 5, note: 'x'.repeat(301) }), ['ملاحظة النقل بحد أقصى 100 حرف'])
  assert.deepEqual(messages(custodyDto.WriteOffCustodyDto, { condition: 'x'.repeat(150), lost: true }), ['وصف حالة العهدة بحد أقصى 100 حرف'])
  assert.deepEqual(messages(custodyDto.ReturnCustodyDto, { condition: 'x'.repeat(101) }), ['حالة العهدة عند الإرجاع بحد أقصى 100 حرف'])
  assert.deepEqual(messages(custodyDto.ReturnCustodyDto, { condition: 'سليمة' }), [])
  assert.match(limits.custodyTextIssue('حالة العهدة عند الإرجاع', 'x'.repeat(101)), /بحد أقصى 100 حرف/)
  assert.equal(limits.custodyTextIssue('ملاحظة النقل', 'x'.repeat(100)), null)
  assert.match(source('api/src/requests/requests.controller.ts'), /import \{ TransferCustodyDto \} from '\.\.\/assets\/custody\.dto'/)
  assert.doesNotMatch(source('api/src/requests/requests.controller.ts'), /class TransferCustodyDto/)
  assert.match(source('api/src/assets/assets.controller.ts'), /import \{ ReturnCustodyDto, WriteOffCustodyDto \} from '\.\/custody\.dto'/)
  const page = source('src/app/employees/custody/page.tsx')
  assert.equal((page.match(/maxLength=\{CUSTODY_TEXT_MAX\}/g) ?? []).length, 2)
  assert.match(page, /custodyTextIssue\('حالة العهدة عند الإرجاع', condition\)/)
})

test('اسم بند التصفية: حرف واحد لا يُرسل من الواجهة، والخادم يرد برسالة عربية', () => {
  assert.deepEqual(messages(lineDto.AddLineDto, { label: 'ب', type: 'DEBIT', amount: 10 }), ['اسم البند حرفان على الأقل'])
  assert.deepEqual(messages(lineDto.AddLineDto, { label: 'بند', type: 'DEBIT', amount: 10 }), [])
  assert.deepEqual(messages(lineDto.UpdateLineDto, { label: 'ب' }), ['اسم البند حرفان على الأقل'])
  assert.deepEqual(messages(lineDto.UpdateLineDto, { amount: 5 }), [])
  assert.match(limits.settlementLabelIssue(' ب '), /حرفان على الأقل/)
  assert.equal(limits.settlementLabelIssue('بند'), null)
  assert.match(source('api/src/offboarding/offboarding.controller.ts'), /import \{ AddLineDto, UpdateLineDto \} from '\.\/settlement-line\.dto'/)
  assert.match(source('src/app/employees/[id]/settlement/page.tsx'), /disabled=\{saving \|\| !!settlementLabelIssue\(addForm\.label\) \|\| !addForm\.amount\}/)
})

// ===== 8) السجل الوظيفي =====
test('السجل الوظيفي: عناوين وقيم عربية للفريق والعقد ودورة الراتب والراتب بدل «تغيير حالة» و«teamId:3»', () => {
  const lookups = { teams: new Map([[3, 'فريق الدعم']]), departments: new Map([[2, 'التقنية']]), branches: new Map([[1, 'المعادي']]), employees: new Map([[10, 'أحمد']]),
    currency: 'ج.م', statusLabels: { active: 'نشط', archived: 'مؤرشف' }, payMethodLabels: { transfer: 'تحويل بنكي', cash: 'نقدي' } }
  const at = '2026-09-15T10:00:00.000Z'
  const view = row => { const v = history.describeEmployeeHistory({ changedAt: at, reason: 'تعديل من ملف الموظف', ...row }, lookups); return [v.title, v.from, v.to] }
  assert.deepEqual(view({ changeType: 'TEAM', fieldName: 'teamId', oldValue: 3, newValue: null, oldStatus: 'teamId:3', newStatus: 'teamId:—' }), ['نقل بين فرق', 'الفريق: فريق الدعم', '—'])
  assert.deepEqual(view({ changeType: 'TEAM', fieldName: 'managerEmployeeId', oldValue: 10, newValue: 11 }), ['تغيير المدير المباشر', 'المدير المباشر: أحمد', '#11'])
  assert.deepEqual(view({ changeType: 'TEAM', fieldName: 'branchId', oldValue: 1, newValue: 1 }), ['نقل بين فروع', 'الفرع: المعادي', 'المعادي'])
  assert.deepEqual(view({ changeType: 'CONTRACT', fieldName: 'contractType', oldValue: 'fixed_term', newValue: 'permanent' }), ['تغيير بيانات العقد', 'نوع العقد: محدد المدة', 'دائم'])
  assert.deepEqual(view({ changeType: 'CONTRACT', fieldName: 'contract', oldValue: '2026-01-01 → 2026-06-30', newValue: '2026-07-01 → 2026-12-31' }), ['تجديد العقد', 'مدة العقد: 2026-01-01 → 2026-06-30', '2026-07-01 → 2026-12-31'])
  assert.deepEqual(view({ changeType: 'SALARY', fieldName: 'salaryCycle', oldValue: null, newValue: 'monthly' }), ['تغيير بيانات مالية', 'دورة الراتب: —', 'شهري'])
  assert.deepEqual(view({ changeType: 'SALARY', fieldName: 'basicSalary', oldValue: '9000.00', newValue: '10000.00' }), ['تغيير راتب', `الراتب الأساسي: ${(9000).toLocaleString()} ج.م`, `${(10000).toLocaleString()} ج.م`])
  assert.deepEqual(view({ changeType: 'BANK', fieldName: 'payMethod', oldValue: 'transfer', newValue: 'cash' }), ['تغيير بيانات بنكية', 'طريقة الصرف: تحويل بنكي', 'نقدي'])
  assert.deepEqual(view({ changeType: 'TITLE', fieldName: 'jobTitle', oldValue: 'محلل نظم', newValue: 'محاسب' }), ['تغيير المسمى الوظيفي', 'المسمى الوظيفي: محلل نظم', 'محاسب'])
  assert.deepEqual(view({ changeType: 'DATA', fieldName: 'workType', oldValue: 'full_time', newValue: null }), ['تحديث بيانات', 'نوع التوظيف: دوام كامل', '—'])
  assert.deepEqual(view({ changeType: 'STATUS', fieldName: 'status', oldValue: 'active', newValue: 'archived', oldStatus: 'active', newStatus: 'archived' }), ['تغيير حالة', 'نشط', 'مؤرشف'])
  assert.deepEqual(view({ changeType: 'SALARY', fieldName: 'basicSalary', oldValue: null, newValue: null, oldStatus: 'financial:[محجوب]', newStatus: 'financial:[محجوب]' }), ['تغيير بيانات مالية', 'التفاصيل محجوبة', 'محجوبة'])
  assert.deepEqual(view({ oldStatus: 'team:3', newStatus: 'team:4' }), ['نقل بين فرق', 'الفريق: فريق الدعم', '#4'], 'الصفوف القديمة تبقى مفهومة')
  assert.deepEqual(view({ oldStatus: 'active', newStatus: 'archived' }), ['تغيير حالة', 'نشط', 'مؤرشف'])
  assert.equal(history.describeEmployeeHistory({ changedAt: at, changeType: 'TEAM', fieldName: 'teamId', oldValue: 3, newValue: 4 }, lookups).date, '2026-09-15')
  const profile = source('src/app/employees/[id]/page.tsx')
  assert.doesNotMatch(profile, /parseHistoryEntry/); assert.match(profile, /describeEmployeeHistory\(h, \{/)
})

// ===== 9) مسح الحقول في التعديل =====
test('التعديل: إفراغ الاسم الإنجليزي أو «اختر» للمسمى ونوع التوظيف والتأمينات يرسل null، وغير المحمّل لا يُمس', () => {
  const keys = [...f.EMPLOYEE_CLEARABLE_FIELDS.map(([key]) => key), 'firstNameAr', 'fatherNameAr', 'grandNameAr', 'familyNameAr', 'firstNameEn', 'middleNameEn', 'lastNameEn']
  const blank = () => Object.fromEntries(keys.map(key => [key, '']))
  const initial = { jobTitle: 'محلل نظم', workType: 'full_time', isGosiRegistered: 'true', firstNameEn: 'Sabr', middleNameEn: '', lastNameEn: 'Test' }
  assert.deepEqual(f.clearedEmployeeFields(initial, blank()), { jobTitle: null, workType: null, isGosiRegistered: null, fullNameEn: null })
  assert.deepEqual(f.clearedEmployeeFields(initial, { ...blank(), jobTitle: 'محاسب', workType: 'part_time', isGosiRegistered: 'false', firstNameEn: 'Sabr' }), {})
  assert.deepEqual(f.clearedEmployeeFields({}, blank()), {})
  assert.deepEqual(f.clearedEmployeeFields({ nameEnFull: 'Mohamed Abdel Rahman' }, { ...blank(), nameEnFull: '  ' }), { fullNameEn: null })
})

// ===== 11) دورة الراتب =====
test('دورة الراتب: الظاهر «شهري» هو المحفوظ، و biweekly «كل أسبوعين» في النموذج والملف', () => {
  assert.equal(f.salaryCycleValue(null), 'monthly'); assert.equal(f.salaryCycleValue(''), 'monthly'); assert.equal(f.salaryCycleValue('weekly'), 'weekly')
  assert.deepEqual(f.SALARY_CYCLE_OPTIONS.map(option => option.label), ['شهري', 'كل أسبوعين', 'أسبوعي'])
  assert.match(source('src/app/employees/[id]/page.tsx'), /biweekly: 'كل أسبوعين'/)
  assert.match(source('src/components/EmployeeForm.tsx'), /payload\.salaryCycle = form\.salaryCycle \|\| DEFAULT_SALARY_CYCLE/)
  assert.match(source('src/app/employees/[id]/edit/page.tsx'), /salaryCycle: salaryCycleValue\(emp\.salaryCycle\)/)
})

// ===== 12) البريد =====
test('البريد الشخصي لا يُنسخ إلى بريد العمل؛ إفراغ بريد العمل في التعديل يرسل null', () => {
  assert.equal(f.employeeWorkEmailPayload('add', ''), undefined)
  assert.equal(f.employeeWorkEmailPayload('add', ' w@example.com '), 'w@example.com')
  assert.equal(f.employeeWorkEmailPayload('edit', '', 'old@example.com'), null)
  assert.equal(f.employeeWorkEmailPayload('edit', '', ''), undefined)
  assert.doesNotMatch(source('src/components/EmployeeForm.tsx'), /workEmail \|\| form\.personalEmail/)
})

// ===== 14) صفوف المؤهلات المكتوبة =====
test('صف مؤهل مكتوب بلا «+ إضافة»: يُضاف تلقائيًا إن اكتمل حقله الإجباري، وإلا رسالة «أضف الصف أو امسحه»', () => {
  const empty = { education: [], certifications: [], experiences: [], skills: [], languages: [] }
  const noDrafts = { education: {}, certifications: {}, experiences: {}, skills: {}, languages: {} }
  const added = f.settleQualificationDrafts(empty, { ...noDrafts, education: { degree: 'bachelor', major: 'علوم الحاسب' } })
  assert.deepEqual(added, { rows: { ...empty, education: [{ degree: 'bachelor', major: 'علوم الحاسب' }] }, added: ['education'], issue: null })
  const incomplete = f.settleQualificationDrafts(empty, { ...noDrafts, skills: { yearsExperience: '5' } })
  assert.match(incomplete.issue, /«المهارات».*«المهارة» فارغ: أضف الصف أو امسحه/)
  assert.deepEqual(incomplete.added, [])
  assert.deepEqual(f.settleQualificationDrafts(empty, { ...noDrafts, languages: { language: '   ' } }), { rows: empty, added: [], issue: null })
  const existing = { ...empty, certifications: [{ name: 'PMP' }] }
  assert.deepEqual(f.settleQualificationDrafts(existing, { ...noDrafts, certifications: { name: 'CPA', issuer: 'AICPA' } }).rows.certifications, [{ name: 'PMP' }, { name: 'CPA', issuer: 'AICPA' }])
})

// ===== 17) العنوان =====
test('العنوان: المدينة وحدها تُحفظ «، المدينة» وتعود في خانة المدينة، والملف يعرضها بلا الفاصل', () => {
  assert.equal(f.joinEmployeeAddress('', 'القاهرة'), '، القاهرة')
  assert.deepEqual(f.splitEmployeeAddress(f.joinEmployeeAddress('', 'القاهرة')), { district: '', city: 'القاهرة' })
  assert.deepEqual(f.splitEmployeeAddress(f.joinEmployeeAddress('المعادي', 'القاهرة')), { district: 'المعادي', city: 'القاهرة' })
  assert.deepEqual(f.splitEmployeeAddress(f.joinEmployeeAddress('المعادي', '')), { district: 'المعادي', city: '' })
  assert.equal(f.joinEmployeeAddress(' ', ' '), '')
  assert.equal(f.displayEmployeeAddress('، القاهرة'), 'القاهرة')
  assert.equal(f.displayEmployeeAddress('المعادي، القاهرة'), 'المعادي، القاهرة')
  assert.deepEqual(f.splitEmployeeAddress('القاهرة'), { district: 'القاهرة', city: '' }, 'نص قديم بلا فاصل يبقى كما هو')
})

// ===== 18) أجزاء الاسم =====
test('الاسم: التقسيم المبهم يُعرض في خانة الاسم الكامل، والاسم الرباعي البسيط يبقى أجزاء', () => {
  for (const name of ['first father', 'محمد أحمد علي', 'محمد عبد الله علي', 'محمد أحمد محمود علي حسن']) assert.equal(f.arabicNameNeedsFullField(name), true, name)
  for (const name of ['سبر التجريبي مجالات ثاني', 'أحمد', '', null]) assert.equal(f.arabicNameNeedsFullField(name), false, String(name))
  for (const name of ['First Middle', 'Mohamed Abdel Rahman', 'Ahmed Mohammed Ali Hassan']) assert.equal(f.englishNameNeedsFullField(name), true, name)
  for (const name of ['Ahmed Mohammed Alsaeed', 'Ahmed', '', undefined]) assert.equal(f.englishNameNeedsFullField(name), false, String(name))
  const parts = { firstNameAr: 'سبر', fatherNameAr: 'التجريبي', grandNameAr: 'مجالات', familyNameAr: 'ثاني', firstNameEn: 'A', middleNameEn: '', lastNameEn: 'B' }
  assert.equal(f.employeeFullNameAr(parts), 'سبر التجريبي مجالات ثاني')
  assert.equal(f.employeeFullNameAr({ ...parts, nameArFull: '  محمد   عبد الله  علي ' }), 'محمد عبد الله علي')
  assert.equal(f.employeeFullNameEn({ ...parts, nameEnFull: 'First  Middle' }), 'First Middle')
  assert.deepEqual(f.splitArabicName('سبر التجريبي مجالات ثاني'), { first: 'سبر', father: 'التجريبي', grand: 'مجالات', family: 'ثاني' })
})

// ===== SSR لنموذج الموظف الفعلي =====
test('SSR الإضافة: خطوة 2 فيها «بدون جدول (يتبع الفرع)» بلا قوائم ثابتة، وخطوة 3 «شهري» مختارة بلا مركز تكلفة مكرر', () => {
  const step2 = renderForm(2, { mode: 'add' })
  assert.match(step2, /بدون جدول \(يتبع الفرع\)/)
  assert.doesNotMatch(step2, /Grade [1-5]|<option value="مطور برمجيات"/)
  assert.equal((step2.match(/مركز التكلفة/g) ?? []).length, 1)
  const step3 = renderForm(3, { mode: 'add' })
  assert.match(step3, /<option value="monthly" selected="">شهري<\/option>/)
  assert.match(step3, /<option value="biweekly">كل أسبوعين<\/option>/)
  assert.doesNotMatch(step3, /نصف شهري|مركز التكلفة/)
  assert.doesNotMatch(renderForm(5, { mode: 'add' }), /إضافة نسخة جديدة/)
})

test('SSR التعديل: الاسم المبهم في خانة واحدة، والمستندات المحفوظة بجانب كل خانة رفع مع «إضافة نسخة جديدة»', () => {
  const step1 = renderForm(1, { mode: 'edit', employeeId: 231, initial: { nameArFull: 'محمد عبد الله علي', nameEnFull: 'First Middle', status: 'active' } })
  assert.match(step1, /الاسم الكامل \(عربي\) \*/); assert.match(step1, /value="محمد عبد الله علي"/)
  assert.match(step1, /الاسم الكامل \(بالإنجليزية\)/); assert.match(step1, /value="First Middle"/)
  assert.doesNotMatch(step1, /الاسم الأول \(عربي\)|اسم العائلة \(عربي\)|Last Name/)
  const parts = renderForm(1, { mode: 'edit', employeeId: 231, initial: { firstNameAr: 'سبر', fatherNameAr: 'التجريبي', grandNameAr: 'مجالات', familyNameAr: 'ثاني', status: 'active' } })
  assert.match(parts, /الاسم الأول \(عربي\) \*/); assert.doesNotMatch(parts, /الاسم الكامل \(عربي\) \*/)
  const documents = [{ id: 23, docType: 'national_id' }, { id: 24, docType: 'national_id' }, { id: 25, docType: 'cv' }, { id: 26, docType: 'contract' }]
  const step5 = renderForm(5, { mode: 'edit', employeeId: 231, initial: { status: 'active' }, savedDocuments: documents })
  assert.match(step5, /المحفوظ حالياً: 2 ملفات/); assert.match(step5, /المحفوظ حالياً: 1 ملف/)
  assert.equal((step5.match(/إضافة نسخة جديدة/g) ?? []).length, 6)
  assert.match(step5, /href="\/employees\/documents"/)
  const step2 = renderForm(2, { mode: 'edit', employeeId: 231, initial: { status: 'active', workScheduleId: 4 }, savedDocuments: documents })
  assert.match(step2, /المحفوظ حالياً: 1 ملف/, 'مرفق العقد يعرض عقد الموظف المحفوظ')
})

test('الملف يعرض الفريق ومركز التكلفة وجدول العمل واستحقاق السنوي وسجل الدوام بسببه، والعنوان بلا فاصل بادئ', () => {
  const profile = source('src/app/employees/[id]/page.tsx')
  for (const binding of ['{employee.team}', '{employee.costCenter}', '{employee.workSchedule}', "employee.annualLeaveEntitled ? 'نعم' : 'لا'"]) assert.ok(profile.includes(binding), binding)
  assert.match(profile, /fetchAttendanceRuleHistory\('EMPLOYEE', Number\(params\.id\)\)/)
  assert.match(profile, /سجل الدوام/); assert.match(profile, /\{row\.reason\}/)
  assert.match(profile, /displayEmployeeAddress\(e\.address\)/)
  const form = source('src/components/EmployeeForm.tsx')
  assert.match(form, /onClick=\{\(\) => setSelectedSchedule\(''\)\}/)
  assert.match(form, /openingBalancePayload\(\{\s*mode, leaveEntitled, year: new Date\(\)\.getFullYear\(\), initial: initialOpening/)
  assert.match(form, /settleQualificationDrafts\(/)
})

// ===== 19) بداية استحقاق الراتب (قرار المالك أ2) =====
test('بداية استحقاق الراتب: حقل يوم اختياري يُرسل ويُمسح، ولا يسبق تاريخ التعيين، وله مدخل واحد في الشاشة', () => {
  const dto = require('../src/employees/employees.dto')
  // الحقول الإجبارية عند الإضافة (قرار المالك 16 سبتمبر) كاملة، فالفحص هنا لبداية الاستحقاق وحدها
  assert.deepEqual(messages(dto.CreateEmployeeDto, { employeeCode: 'SES-01', fingerprintCode: 'SES-01', fullName: 'موظف تجربة', branchId: 1, departmentId: 1,
    phone: '0501234567', nationalId: '1012345678', birthDate: '1990-01-01', gender: 'male', nationality: 'سعودي', jobTitle: 'محاسب',
    joinDate: '2026-09-01', basicSalary: 5000, salaryEntitlementStart: '2026-09-15' }), [])
  assert.deepEqual(messages(dto.UpdateEmployeeDto, { salaryEntitlementStart: '2026-09-15' }), [])
  assert.deepEqual(messages(dto.UpdateEmployeeDto, { salaryEntitlementStart: '15-09-2026' }), ['بداية استحقاق الراتب بصيغة YYYY-MM-DD'])
  assert.ok(f.EMPLOYEE_CLEARABLE_FIELDS.some(([field, target]) => field === 'salaryEntitlementStart' && target === 'salaryEntitlementStart'))
  assert.deepEqual(f.clearedEmployeeFields({ salaryEntitlementStart: '2026-09-15' }, { salaryEntitlementStart: '' }), { salaryEntitlementStart: null })
  const { EmployeesService } = require('../src/employees/employees.service')
  const service = new EmployeesService({}, {}, {}, {}, {}, {}, {}, {}, {}, {})
  assert.throws(() => service.assertSalaryEntitlementStart('2026-03-01', '2026-04-01'), error => /لا تسبق تاريخ التعيين/.test(error.message))
  assert.doesNotThrow(() => service.assertSalaryEntitlementStart('2026-04-01', '2026-04-01'))
  assert.doesNotThrow(() => service.assertSalaryEntitlementStart(undefined, '2026-04-01'))
  assert.throws(() => service.assertSalaryEntitlementStart('2026-03-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z'), error => /لا تسبق تاريخ التعيين/.test(error.message))
  const step2 = renderForm(2, { mode: 'add' })
  assert.match(step2, /بداية استحقاق الراتب/)
  assert.match(step2, /الافتراضي تاريخ التعيين/)
  // الخانة تتبع تاريخ التعيين افتراضياً في الإضافة حتى يغيّرها المستخدم بنفسه
  const form = source('src/components/EmployeeForm.tsx')
  assert.match(form, /entitlementEdited\.current = true/)
  assert.match(form, /const hireDate = form\.actualStartDate \|\| form\.joinDate/)
  // تأخير تاريخ التعيين وحده يُعيد التحقق من استحقاق محفوظ أقدم (لا دفع قبل المباشرة)
  const employees = source('api/src/employees/employees.service.ts')
  assert.match(employees, /if \(dto\.salaryEntitlementStart !== undefined \|\| dto\.actualStartDate !== undefined \|\| dto\.joinDate !== undefined\)/)
  assert.match(employees, /dto\.salaryEntitlementStart !== undefined \? dto\.salaryEntitlementStart : emp\.salaryEntitlementStart/)
})

// ===== 20) الشاشة بعد التبسيط: المرونة للوردية، والأسماء بالعربي، وتأكيد حذف المؤهل =====
test('شاشة الموظف: بلا مدخل مرونة، وعناوين عربية لأجزاء الاسم الإنجليزي، وبلا ملاحظة الفريق، وحذف المؤهل بتأكيد', () => {
  const step1 = renderForm(1, { mode: 'add' })
  assert.doesNotMatch(step1, /First Name|Middle Name|Last Name|Full Name \(English\)/)
  assert.match(step1, /الاسم الأول \(بالإنجليزية\)/)
  const step2 = renderForm(2, { mode: 'edit', employeeId: 231, initial: { status: 'active' } })
  assert.doesNotMatch(step2, /المرونة لهذا الموظف|مفعلة لهذا الموظف|موقوفة لهذا الموظف/)
  assert.doesNotMatch(step2, /يتحدد تلقائياً عند اختيار الفريق/)
  const form = source('src/components/EmployeeForm.tsx')
  assert.doesNotMatch(form, /setField\('flexOverrideMode'/)
  assert.match(form, /window\.confirm\('حذف هذا العنصر المحفوظ/)
})
