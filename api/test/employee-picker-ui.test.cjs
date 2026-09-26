// قرار المالك: كل مكان بيختار فيه المستخدم موظف لازم يتبحث فيه بالاسم (والكود).
// 1) المطابقة الموحّدة src/lib/employee-search.ts: الإملاء العربي (أ/إ/آ→ا، ة→ه، ى→ي، ؤ→و، ئ→ي)، التشكيل والتطويل،
//    المسافات الزايدة، كلمات الاسم بأي ترتيب، والكود من غير فرق حروف كبيرة/صغيرة ولا شرطات.
// 2) منتقي الموظف الموحّد src/components/EmployeePicker.tsx: دوال النتايج والتنقل الصافية، وSSR للخانة المقفولة.
// 3) فحص نصي: كل أماكن اختيار الموظف (B1–B18) والأماكن اللي كان فيها «بحث + قائمة» بقت على المنتقي، والقوايم
//    المضمّنة بقت على نفس المطابقة، وتبديل الوردية مابقاش بيطلب رقم الموظف الداخلي.
// منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const search = require('../../src/lib/employee-search')
const picker = require('../../src/components/EmployeePicker')
const { ChainEditorModal } = require('../../src/components/approvals/ChainEditorModal')
const { PayrollLiveSourcesPanel } = require('../../src/components/PayrollLiveSourcesPanel')
const payload = require('../../src/lib/request-payload')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
const ids = list => list.map(employee => employee.id)

const staff = [
  { id: 1, fullName: 'محمد علي حسن', employeeCode: 'EMP-001', jobTitle: 'محاسب' },
  { id: 2, fullName: 'علي محمد', employeeCode: 'EMP-007', jobTitle: 'مهندس' },
  { id: 3, fullName: 'عبد الله إبراهيم', employeeCode: 'HR-12' },
  { id: 4, fullName: 'فاطمة الزهراء', employeeCode: 'emp-0070' },
  { id: 5, fullName: 'أسامة مصطفى', employeeCode: 'X-5', fullNameEn: 'Osama Mostafa' },
  { id: 6, fullName: 'آمال مسؤول هانئ', employeeCode: 'A-6' },
]

// ===== 1) المطابقة الموحّدة =====

test('normalization: Arabic spelling variants, diacritics, tatweel, hidden marks, digits, case and spaces', () => {
  const n = search.normalizeSearchText
  assert.equal(n('أحمد'), 'احمد'); assert.equal(n('إسراء'), 'اسراء'); assert.equal(n('آمال'), 'امال'); assert.equal(n('ٱلله'), 'الله')
  assert.equal(n('فاطمة'), 'فاطمه'); assert.equal(n('مصطفى'), 'مصطفي'); assert.equal(n('مسؤول'), 'مسوول'); assert.equal(n('هانئ'), 'هاني')
  assert.equal(n('مُحَمَّدٌ'), 'محمد', 'diacritics are ignored'); assert.equal(n('محـــمد'), 'محمد', 'tatweel is ignored')
  assert.equal(n('  محمد \t  علي  '), 'محمد علي', 'extra spaces collapse')
  assert.equal(n('‏علي‎'), 'علي', 'direction marks from copied text are dropped')
  assert.equal(n('EMP-007'), 'emp-007'); assert.equal(n('٠٠٧'), '007'); assert.equal(n('۰۰۷'), '007')
  assert.equal(n('ی'), 'ي'); assert.equal(n('ک'), 'ك'); assert.equal(n('José'), 'jose')
  assert.equal(n(null), ''); assert.equal(n(undefined), '')
})

test('names match across spelling variants, in any word order, with or without spaces; codes ignore case and dashes', () => {
  const hit = (employee, query) => search.employeeMatchesSearch(employee, query)
  assert.ok(hit(staff[0], 'علي'), 'part of the name')
  assert.ok(hit(staff[0], 'حسن محمد'), 'any word order')
  assert.ok(hit(staff[2], 'عبدالله'), 'no space = with space')
  assert.ok(hit({ fullName: 'عبدالرحمن سالم' }, 'عبد الرحمن'), 'with space = no space')
  assert.ok(hit(staff[2], 'ابراهيم'), 'إ typed as ا'); assert.ok(hit(staff[5], 'امال'), 'آ typed as ا')
  assert.ok(hit(staff[3], 'فاطمه الزهرا'), 'ة typed as ه'); assert.ok(hit(staff[4], 'اسامه مصطفي'), 'ى typed as ي')
  assert.ok(hit(staff[5], 'مسوول'), 'ؤ typed as و'); assert.ok(hit(staff[5], 'هاني'), 'ئ typed as ي')
  assert.ok(hit(staff[1], 'emp-007')); assert.ok(hit(staff[1], 'EMP007'), 'code without the dash'); assert.ok(hit(staff[1], '٠٠٧'), 'Arabic-Indic digits')
  assert.ok(hit(staff[4], 'osama'), 'the English name when the list carries it')
  assert.ok(!hit(staff[0], 'زكريا')); assert.ok(!hit(staff[0], 'علي زكريا'), 'every word must match')
  assert.ok(hit(staff[0], ''), 'an empty search keeps everyone'); assert.ok(hit(staff[0], '   '))
  assert.ok(!hit({ id: 42, fullName: 'سالم', employeeCode: 'S-1' }, '42'), 'the internal employee id is not a search key')
  assert.ok(!hit({ id: 1, fullName: null, employeeCode: null }, 'x'))
})

test('results are ranked: exact code first, then name/code prefix, then word prefix, then the rest — ties keep the list order', () => {
  assert.deepEqual(ids(search.searchEmployees(staff, 'علي')), [2, 1], 'the name that starts with it comes first')
  assert.deepEqual(ids(search.searchEmployees(staff, 'emp007')), [2, 4], 'the exact code before the longer one')
  assert.deepEqual(ids(search.searchEmployees(staff, 'محمد')), [1, 2])
  assert.deepEqual(ids(search.searchEmployees(staff, '')), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(search.searchEmployees(staff, 'لا أحد'), [])
  // مطابقة جاهزة للـfilter: البحث بيتطبّع مرة واحدة
  const matches = search.employeeSearchMatcher('الزهراء')
  assert.deepEqual(ids(staff.filter(matches)), [4])
  assert.deepEqual(ids(staff.filter(search.employeeSearchMatcher(''))), [1, 2, 3, 4, 5, 6])
  // التطبيع محفوظ لكل موظف، وبيتجدد لو الاسم اتغيّر
  const row = { id: 9, fullName: 'منى', employeeCode: 'M-9' }
  assert.ok(search.employeeMatchesSearch(row, 'منى'))
  row.fullName = 'هالة'
  assert.ok(search.employeeMatchesSearch(row, 'هاله')); assert.ok(!search.employeeMatchesSearch(row, 'منى'))
})

// ===== 2) المنتقي =====

const many = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, fullName: `موظف ${index + 1}`, employeeCode: `E-${index + 1}` }))

test('picker results: capped at 50 with the total for «اكتب أكتر للتصفية», the page filter applies, and the current choice stays reachable', () => {
  assert.equal(picker.EMPLOYEE_PICKER_MAX_RESULTS, 50)
  assert.equal(picker.EMPLOYEE_PICKER_EMPTY_TEXT, 'مفيش نتايج')
  assert.equal(picker.EMPLOYEE_PICKER_MORE_TEXT, 'اكتب أكتر للتصفية')
  const all = picker.employeePickerResults(many, '')
  assert.equal(all.shown.length, 50); assert.equal(all.total, 120)
  const typed = picker.employeePickerResults(many, 'موظف 11')
  assert.deepEqual(ids(typed.shown), [11, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]); assert.equal(typed.total, 11)
  assert.deepEqual(picker.employeePickerResults(many, 'غير موجود'), { shown: [], total: 0 })
  // فلتر الشاشة (مثلاً موظفي القسم المختار) قبل البحث
  const even = picker.employeePickerResults(many, '', employee => employee.id % 2 === 0)
  assert.equal(even.total, 60); assert.ok(even.shown.every(employee => employee.id % 2 === 0))
  // المختار الحالي بعد الحد يتحط أول القايمة لما تتفتح من غير بحث
  const pinned = picker.employeePickerResults(many, '', undefined, 50, '100')
  assert.equal(pinned.shown.length, 50); assert.equal(pinned.shown[0].id, 100); assert.equal(pinned.shown[1].id, 1)
  assert.deepEqual(ids(picker.employeePickerResults(many, 'موظف 7', undefined, 50, '100').shown).slice(0, 2), [7, 70], 'no pinning while searching')
})

test('keyboard navigation wraps around, and nothing is active in an empty list', () => {
  assert.equal(picker.nextActiveIndex(-1, 'ArrowDown', 3), 0)
  assert.equal(picker.nextActiveIndex(0, 'ArrowDown', 3), 1)
  assert.equal(picker.nextActiveIndex(2, 'ArrowDown', 3), 0)
  assert.equal(picker.nextActiveIndex(1, 'ArrowUp', 3), 0)
  assert.equal(picker.nextActiveIndex(0, 'ArrowUp', 3), 2)
  assert.equal(picker.nextActiveIndex(-1, 'ArrowUp', 3), 2)
  assert.equal(picker.nextActiveIndex(1, 'Enter', 3), 1)
  assert.equal(picker.nextActiveIndex(0, 'ArrowDown', 0), -1)
})

test('SSR: an accessible combobox that shows the current choice by name and code, with clear only when something is chosen', () => {
  const draw = props => render(picker.EmployeePicker, { employees: staff, value: '', onChange: () => {}, ...props })
  const chosen = draw({ value: 2, id: 'pick', required: true })
  for (const text of ['role="combobox"', 'aria-expanded="false"', 'aria-autocomplete="list"', 'aria-required="true"', 'id="pick"',
    'value="علي محمد — EMP-007"', 'aria-label="مسح الاختيار"', 'aria-label="عرض الموظفين"', 'type="button"']) {
    assert.ok(chosen.includes(text), text)
  }
  assert.ok(!chosen.includes('role="listbox"'), 'the list renders only when open')
  assert.ok(!chosen.includes('aria-controls'), 'no dangling reference while closed')
  const empty = draw({})
  assert.ok(empty.includes('value=""')); assert.ok(empty.includes('placeholder="اكتب اسم الموظف أو كوده…"'))
  assert.ok(!empty.includes('مسح الاختيار'), 'nothing to clear'); assert.ok(!empty.includes('aria-required'))
  assert.ok(draw({ value: '2' }).includes('value="علي محمد — EMP-007"'), 'the id may come as text or as a number')
  const locked = draw({ value: 2, disabled: true, title: 'لا يمكن نقل المستند لموظف آخر' })
  assert.match(locked, /<input[^>]*disabled=""/); assert.ok(!locked.includes('مسح الاختيار')); assert.ok(locked.includes('title="لا يمكن نقل المستند لموظف آخر"'))
  assert.ok(!draw({ value: 2, clearable: false }).includes('مسح الاختيار'), 'always-one-employee pickers have no clear')
  // الموظف المحفوظ برّه قائمة الحساب يفضل ظاهر برقمه بدل ما يختفي
  assert.ok(draw({ value: 99 }).includes('value="موظف #99"'))
  assert.ok(draw({ value: 99, missingLabel: id => `محفوظ ${id}` }).includes('value="محفوظ 99"'))
  assert.ok(draw({ placeholder: 'كل الموظفين', 'aria-label': 'فلترة بالموظف' }).includes('placeholder="كل الموظفين"'))
  assert.equal(picker.employeePickerLabel({ id: 3, fullName: 'منى', employeeCode: null }), 'منى')
  assert.equal(picker.employeePickerLabel({ id: 3, fullName: '', employeeCode: '' }), 'موظف #3')
})

test('SSR in place: the approval step «موظف بعينه» and the payroll sources panel render the picker', () => {
  const step = { id: 1, chainId: 5, stepOrder: 1, approverRole: 'specific_employee', isParallel: false, thresholdField: null, thresholdOp: null,
    thresholdValue: null, slaDays: 2, escalateTo: null, canDelegate: true, specificEmployeeId: 2 }
  const chain = { id: 5, code: 'CH', nameAr: 'سلسلة اختبار', branchId: null, isActive: true, requestTypeCode: null, isPrimary: true, autoApprove: false, steps: [step] }
  const props = { target: { kind: 'edit', chainId: 5 }, chains: [chain], branches: [], onNavigate() {}, onClose() {}, onSaved() {}, scope: null }
  const html = render(ChainEditorModal, { ...props, employees: staff })
  assert.ok(html.includes('id="chain-step-employee-0"')); assert.ok(html.includes('value="علي محمد — EMP-007"'))
  assert.ok(html.includes('for="chain-step-employee-0"'), 'the label points at the picker')
  // الموظف المحفوظ من فرع تاني (مش في قائمة الحساب) يفضل ظاهر باسم رقمه — زي القائمة القديمة
  assert.ok(render(ChainEditorModal, { ...props, employees: [] }).includes('value="موظف #2"'))
  // السلسلة العامة لحساب فرع (للقراءة): المنتقي مقفول ومن غير مسح
  const readOnly = render(ChainEditorModal, { ...props, employees: staff, scope: [2] })
  assert.ok(readOnly.includes('data-chain-read-only'))
  assert.match(readOnly, /id="chain-step-employee-0"[^>]*disabled=""/); assert.ok(!readOnly.includes('مسح الاختيار'))
  const panel = render(PayrollLiveSourcesPanel, { view: { policyId: 7, versionId: 11, revision: 3 }, canCalculate: true, policyDirty: false })
  assert.ok(panel.includes('id="payroll-source-employee"')); assert.ok(panel.includes('role="combobox"'))
  assert.ok(!panel.includes('payroll-source-search'), 'one search box, not a search box plus a list')
})

// ===== 3) كل أماكن اختيار الموظف =====

const APP = "import { EmployeePicker } from '@/components/EmployeePicker'"
// [المكان، الملف، سطر الاستيراد، علامات لازم تكون موجودة، علامات القائمة القديمة اللي لازم تختفي]
const places = [
  ['B1 الموظف المعتمد (خطوة «موظف بعينه»)', 'src/components/approvals/ChainEditorModal.tsx', "import { EmployeePicker } from '../EmployeePicker'",
    ['<EmployeePicker', 'id={`chain-step-employee-${index}`}', "onChange={(id) => updateStep(index, 'specificEmployeeId', id)}", 'disabled={readOnly || saving}'],
    ['<option value="">— اختر الموظف —</option>']],
  ['B2 المدير المباشر', 'src/components/EmployeeForm.tsx', APP,
    ['id="employee-manager"', 'employees={allEmployees}', "onChange={(id) => setField('managerId', id)}",
      "type ManagerOption = Pick<ApiEmployee, 'id' | 'fullName' | 'jobTitle' | 'employeeCode'>"],
    ['<option value="">اختر (أو يتحدد من الفريق)</option>']],
  ['B3 قائد الفريق (موظفي القسم المختار)', 'src/app/settings/teams/page.tsx', APP,
    ['id="team-leader"', '!formData.departmentId ||\n                      emp.departmentId === Number(formData.departmentId)',
      'onChange={(id) => setFormData({ ...formData, leaderId: id })}'],
    ['<option value="">اختر قائد الفريق</option>']],
  ['B4/B5 مدير القسم والسكرتير التنفيذي', 'src/app/settings/departments/page.tsx', APP,
    ['id="department-manager"', 'onChange={(id) => setFormData({ ...formData, managerId: id })}', 'id="department-secretary"',
      'filter={(emp) => String(emp.id) !== formData.managerId}', 'onChange={(id) => setFormData({ ...formData, secretaryId: id })}'],
    ['<option value="">— اختر الموظف المسؤول —</option>', '<option value="">— بدون —</option>']],
  ['B6 مدير الفرع', 'src/app/settings/branches/page.tsx', APP,
    ['id="branch-manager"', 'onChange={(id) => setFormData({ ...formData, managerId: id })}'],
    ['<option value="">— اختر الموظف المسؤول —</option>']],
  ['B7 الموظف المرتبط بالحساب', 'src/app/settings/users/page.tsx', APP,
    ['id="user-linked-employee"', 'onChange={(id) => setFormData({ ...formData, employeeId: id })}'],
    ['<option value="">بدون ربط بموظف</option>']],
  ['B8/B9/B10 النيابة والموظف المستلم والموظف البديل', 'src/app/requests/page.tsx', APP,
    ['onChange={(id) => setOnBehalfEmployeeId(id)}', 'if (EMPLOYEE_PICKER_FIELDS.includes(key))', 'onChange={(id) => setFieldValue(key, id)}'],
    ['<option value="">— اختر الموظف —</option>']],
  ['B11/B12 تسليم العهدة ونقلها', 'src/app/employees/custody/page.tsx', APP,
    ['id="custody-employee"', "filter={(emp) => emp.status !== 'archived'}", 'onChange={(id) => setFormData({ ...formData, employeeId: id })}',
      'id="custody-transfer-employee"', 'filter={(emp) => emp.isActive && emp.id !== transferTarget.employeeId}',
      'onChange={(id) => setTransferForm({ ...transferForm, toEmployeeId: id })}'],
    ['<option value="">— اختر الموظف —</option>', '<option value="">— اختر الموظف المستلم —</option>']],
  ['B13/B14 فلتر المستندات وموظف المستند', 'src/app/employees/documents/page.tsx', APP,
    ['placeholder="كل الموظفين"', 'onChange={(id) => setSelectedEmployee(id)}', 'id="document-upload-employee"', 'disabled={editingId != null}',
      'onChange={(id) => setUploadForm({ ...uploadForm, employeeId: id })}'],
    ['<option value="">كل الموظفين</option>', '<option value="">اختر الموظف</option>']],
  ['B15 الإدخال اليدوي للحضور', 'src/app/attendance/manual-entry/page.tsx', APP,
    ['id="manual-entry-employee"', 'onChange={(id) => setFormData({ ...formData, employeeId: id })}'],
    ['<option value="">اختر الموظف</option>']],
  ['B16 الكشف الشهري', 'src/app/attendance/monthly-sheet/page.tsx', APP,
    ['clearable={false}', 'if (id) setEmployeeId(Number(id))'],
    ["onChange={(e) => setEmployeeId(Number(e.target.value))}"]],
  ['B17 ربط كود البصمة بموظف', 'src/app/attendance/devices/page.tsx', APP,
    ['employees={linkEmployees}', 'setLinkChoice((prev) => ({ ...prev, [u.employeeCode]: id }))'],
    ['<option value="">— اختر الموظف —</option>']],
  ['B18 الموظف صاحب السلفة', 'src/app/payroll/loans/page.tsx', APP,
    ["<EmployeePicker id=\"loan-for-employee\" employees={directory} value={forEmployeeId} onChange={(id) => setForEmployeeId(id ? Number(id) : '')} required />"],
    ['<select id="loan-for-employee"']],
  ['A7 طلب الخصم', 'src/components/requests/DeductionRequestForm.tsx', APP,
    ['id="deduction-request-employee"', 'employees={candidates}', 'onChange={id => setEmployeeId(id)}'],
    ['candidate.fullName.includes(searchText)', 'placeholder="بحث بالاسم أو الرقم الوظيفي"']],
  ['A8 طلب المكافأة', 'src/components/requests/BonusRequestForm.tsx', APP,
    ['id="bonus-request-employee"', 'employees={candidates}', 'disabled={busy || noScope}'],
    ['candidate.fullName.includes(searchText)', 'placeholder="بحث بالاسم أو الرقم الوظيفي"']],
  ['A15 إصدار مستند', 'src/app/employees/documents/create/page.tsx', APP,
    ['<EmployeePicker id="document-employee" employees={employees} value={employeeId} disabled={inputsDisabled} onChange={id => { changed(); setEmployeeId(id) }}'],
    ['visibleEmployees', 'employeeSearch']],
  ['A16 سجل الأجر المؤرخ', 'src/app/payroll/salary-history/page.tsx', APP,
    ['<EmployeePicker id="salary-history-employee" employees={employees} value={employeeId} disabled={loading || dirty}',
      'if (!value || employees.some(row => String(row.id) === value)) setEmployeeId(value)'],
    ['salary-history-search', 'const choices']],
  ['A17 استثناء الحضور', 'src/app/attendance/exemptions/page.tsx', APP,
    ['id="exemption-employee"', 'onChange={id => setForm({ ...form, employeeId: id })}'],
    ['exemption-employee-search', 'employeeChoices']],
  ['فحص مصادر حساب الموظف', 'src/components/PayrollLiveSourcesPanel.tsx', "import { EmployeePicker } from './EmployeePicker'",
    ['<EmployeePicker id="payroll-source-employee" employees={employees} value={employeeId} disabled={loading || directoryLoading || historyDirty}',
      'onChange={id => { setEmployeeId(id); clear() }}'],
    ['payroll-source-search', 'const choices']],
]

test('every employee choice is the shared searchable picker — no plain employee dropdown left in these places', () => {
  for (const [place, file, importLine, present, gone] of places) {
    const source = read(file)
    assert.ok(source.includes(importLine), `${place}: ${importLine}`)
    assert.ok(source.includes('<EmployeePicker'), place)
    for (const text of present) assert.ok(source.includes(text), `${place}: ${text}`)
    for (const text of gone) assert.ok(!source.includes(text), `${place}: still has ${text}`)
    assert.doesNotMatch(source, /<option key=\{(?:emp|employee|candidate)\.id\}/, `${place}: an employee <option> list is left`)
  }
  const count = (file, n) => assert.equal((read(file).match(/<EmployeePicker\b/g) || []).length, n, file)
  count('src/app/requests/page.tsx', 2); count('src/app/employees/custody/page.tsx', 2)
  count('src/app/employees/documents/page.tsx', 2); count('src/app/settings/departments/page.tsx', 2)
  // الكشف الشهري: مفيش قائمة موظفين منسدلة (كانت بـe.id)
  assert.doesNotMatch(read('src/app/attendance/monthly-sheet/page.tsx'), /<option key=\{e\.id\}/)
})

test('B10 shift swap: the substitute is picked by name or code, never typed as an internal id — and the payload is still that numeric id', () => {
  const page = read('src/app/requests/page.tsx')
  assert.ok(page.includes("const SMART_SELECT_FIELDS: readonly string[] = ['toTeamId', 'toEmployeeId', 'withEmployeeId', 'assignmentId']"))
  assert.ok(page.includes("const EMPLOYEE_PICKER_FIELDS: readonly string[] = ['toEmployeeId', 'withEmployeeId']"))
  // الحقل الذكي بيترسم قبل الخانة العامة في الطريقين (الحقول المخصّصة والاستنتاج القديم) — فمفيش <input type="number"> ليه
  assert.equal((page.match(/\{renderSmartField\(f(\.key)?\) \?\?/g) || []).length, 2)
  // الدليل المختصر (بلا صلاحية إضافية) بيتحمّل لأي حقل بيختار موظف
  assert.ok(page.includes('if (formFieldKeys.some((key) => EMPLOYEE_PICKER_FIELDS.includes(key)) && employees.length === 0) {\n      fetchEmployeeDirectory()'))
  // القيمة المبعوتة رقم زي ما الخادم مستني (requests.service: withEmployeeId type number)
  assert.ok(page.includes("(f.type === 'number' || SMART_SELECT_FIELDS.includes(f.key)) && raw !== ''\n            ? Number(raw)"))
  assert.ok(page.includes("payload[f] = isNumberField(f) && raw !== '' ? Number(raw) : raw"))
  assert.equal(payload.payloadFieldKind('withEmployeeId'), 'number')
  // العنوان: «الموظف البديل» بدل «رقم الموظف البديل» — وعنوان الخادم الافتراضي القديم بيتقري بالجديد
  assert.ok(page.includes("withEmployeeId: 'الموظف البديل',")); assert.ok(!page.includes("withEmployeeId: 'رقم الموظف البديل'"))
  assert.ok(page.includes("f.key === 'withEmployeeId' && f.label === 'رقم الموظف البديل' ? fieldLabels.withEmployeeId : f.label"))
  assert.ok(page.includes('{customFieldLabel(f)}'))
  assert.ok(read('api/src/requests/requests.service.ts').includes("{ key: 'withEmployeeId', label: 'رقم الموظف البديل', type: 'number', required: true }"))
})

test('inline employee search lists keep their UI but use the same matcher', () => {
  const uses = [
    ['src/components/payroll/BonusesWorkspace.tsx', "import { employeeSearchMatcher } from '@/lib/employee-search'", ['employeeSearchMatcher(search)'], ['row.fullName.includes(searchText)']],
    ['src/components/payroll/TypedDeductionsWorkspace.tsx', "import { employeeSearchMatcher, searchEmployees } from '@/lib/employee-search'",
      ['employeeSearchMatcher(search)', 'searchEmployees(org.employees, employeeSearch).slice(0, 20)'], ['row.fullName.includes(']],
    ['src/components/payroll/PayrollRunDefinitionPanel.tsx', "import { employeeSearchMatcher } from '../../lib/employee-search'",
      ['employeeSearchMatcher(search)', 'employeeSearchMatcher(exclusionSearch)', '.filter(matchesExclusionSearch)'],
      ['emp.fullName.includes(search.trim())', 'person.fullName.includes(exclusionSearchTerm)']],
    ['src/components/OrgTargetPicker.tsx', "import { employeeSearchMatcher } from '../lib/employee-search'", ['employeeSearchMatcher(query)', 'matchesQuery(e)'],
      ['e.fullName.includes(query.trim())']],
    ['src/app/settings/request-types/page.tsx', "import { employeeSearchMatcher } from '@/lib/employee-search'", ['employeeSearchMatcher(empFilter)', 'matchesEmpFilter(e)'],
      ['e.fullName.includes(empFilter)']],
    ['src/app/attendance/weekly-schedule/page.tsx', "import { employeeSearchMatcher } from '@/lib/employee-search'",
      ['employeeSearchMatcher(searchQuery)', 'matchesSearchQuery({ fullName: emp.employeeName, employeeCode: emp.employeeCode })'],
      ['emp.employeeName.includes(searchQuery)']],
  ]
  for (const [file, importLine, present, gone] of uses) {
    const source = read(file)
    assert.ok(source.includes(importLine), `${file}: ${importLine}`)
    for (const text of present) assert.ok(source.includes(text), `${file}: ${text}`)
    for (const text of gone) assert.ok(!source.includes(text), `${file}: still has ${text}`)
  }
})

test('the picker itself: portal next to its dialog, keyboard, Enter never submits the form, and relative imports for server-side tests', () => {
  const source = read('src/components/EmployeePicker.tsx')
  assert.ok(source.includes("import { searchEmployees, type EmployeeSearchFields } from '../lib/employee-search'"))
  assert.doesNotMatch(source, /from '@\//, 'relative imports only — server tests render the screens that use it')
  for (const text of ["closest<HTMLElement>('[role=\"dialog\"]') ?? document.body", 'createPortal(popup, portalTarget)', "position: 'fixed'", 'zIndex: 1000',
    "window.addEventListener('scroll', onScroll, true)", "event.key === 'ArrowDown' || event.key === 'ArrowUp'", "event.key === 'Escape'",
    'role="listbox"', 'role="option"', 'aria-selected={isSelected}', 'aria-activedescendant', 'onMouseDown={(event) => event.preventDefault()}']) {
    assert.ok(source.includes(text), text)
  }
  assert.match(source, /event\.key === 'Enter'\) \{\n\s*\/\/[^\n]*\n\s*event\.preventDefault\(\)/, 'Enter inside the picker does not submit the surrounding form')
})
