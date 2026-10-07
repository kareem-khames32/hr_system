'use strict'
// B2.11: شاشات الوظائف المعتمدة (قراءة نص الملفات، من غير متصفح) —
//  PU-01) القايمة والمسار والعنوان والموديول: البند بصلاحية العرض، والمسار تبع موديول positions المقفول افتراضيًا.
//  PU-02) شاشة الوظائف: الأزرار من حكم الخادم (canManage)، ورسالة الترحيل الناقص، وأعمدة التقرير، ونداءات الخادم.
//  PU-03) النماذج: وحدة الوظيفة بتتبعت عند الإنشاء بس؛ وربط موظف للوظيفة النشطة ولصاحب الإدارة بس؛ والتوليد معاينة ثم تطبيق.
//  PU-04) خطوة اختيار الوظيفة عند التعيين: لما الموديول مفعّل، وإجبارية مع الإنفاذ (والمليانة مقفولة ومن غير «من غير وظيفة»)، وفشل
//         تحميل القايمة بيوقّف الحفظ، والرقم بيتبعت حمولة مع الموظف — وسطر الحفظ المثبّت زي ما هو.
//  PU-05) الجزء (ب) — طلب «وظيفة جديدة / زيادة عدد»: الوجهة تبع الموديول ومتسمّية بالعربي في قايمة الباني وشاشة الطلبات؛ والمعتمد
//         بيقرا الحقول بأسمائها والعدد خانة رقم صحيح؛ وحقول النموذج من الخادم فوق أي حقول زوّدها الباني؛ والقسم بيتثبّت على الطلب عند
//         كل تقديم (مفتاحين بيكتبهم الخادم): المعتمد بيقرا اسمه، ومش حقول يحددها الباني ولا العميل.
// Run (من api/): node --test test/positions-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const registry = require('../src/modules-registry/registry')

test('PU-01: القايمة والمسار والعنوان — بصلاحية العرض، وتبع موديول positions المقفول افتراضيًا', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /id: 'positions',\n    label: 'الوظائف المعتمدة',\n    icon: <Briefcase size=\{20\} \/>,\n    href: '\/positions',\n    perm: 'positions\.view',/)
  assert.ok(read('src/components/layout/MainLayout.tsx').includes("['/positions', 'positions.view'],"))
  assert.ok(read('src/components/layout/pageTitles.ts').includes("['/positions', 'الوظائف المعتمدة'],"))
  // المسار تبع الموديول، والموديول مقفول من غير صف في القاعدة: البند والشاشة مش ظاهرين لحد ما يتفعّل
  assert.equal(registry.routeOwner('/positions').module, 'positions')
  const byDefault = registry.enabledSnapshot({ modules: {}, features: {} })
  assert.equal(registry.routeAvailable('/positions', byDefault), false)
  assert.equal(registry.routeAvailable('/positions', registry.enabledSnapshot({ modules: { positions: true }, features: {} })), true)
  assert.deepEqual([registry.MODULES.positions.defaultEnabled, registry.MODULES.positions.core, registry.MODULES.positions.preset, registry.MODULES.positions.dependsOn],
    [false, false, 'standard', ['org', 'employees']])
  assert.deepEqual([registry.MODULE_FEATURES['positions.enforce_on_hiring'].module, registry.MODULE_FEATURES['positions.enforce_on_hiring'].default], ['positions', false])
  // والإنفاذ مش ساري والموديول مقفول
  assert.equal(registry.featureEnabled({ modules: {}, features: { 'positions.enforce_on_hiring': true } }, 'positions.enforce_on_hiring'), false)
})

test('PU-02: شاشة الوظائف — الأزرار من حكم الخادم، ورسالة الترحيل الناقص، وأعمدة التقرير', () => {
  const page = read('src/app/positions/page.tsx')
  assert.match(page, /\{data\?\.available && data\.canManage && \(/)
  assert.match(page, /\{data\.canManage && <button type="button" className="text-primary-600 underline text-xs" onClick=\{\(\) => setForm\(\{ position: row \}\)\} data-position-edit>تعديل<\/button>\}/)
  assert.match(page, /!data\.available \? \(\s+<div className="card text-sm text-amber-900 bg-amber-50 border border-amber-200" data-positions-unavailable>\{data\.message \?\? 'الوظائف المعتمدة مش متاحة دلوقتي'\}<\/div>/)
  for (const column of ['معتمد', 'مشغول', 'شاغر', 'زيادة', 'موظفين من غير وظيفة']) assert.ok(page.includes(`<th className="py-2 px-2 font-medium">${column}</th>`), column)
  for (const marker of ['data-positions-summary-row', 'data-position-row', 'data-positions-enforce', 'data-positions-generate', 'data-position-new']) assert.ok(page.includes(marker), marker)
  // سطر «قسم برّه الفرع» من غير رقم زي سطر مستوى الفرع: مفتاحه بيفرّق بينهم بالاسم (Codex CRP3A-B01: الرقم محجوب)
  assert.ok(page.includes('<tr key={`${line.branchId}:${line.departmentId ?? line.departmentName ?? 0}`} className="border-b border-gray-100" data-positions-summary-row>'))
  // الأرقام من الخادم بالحرف (مفيش حساب في الشاشة)
  assert.doesNotMatch(page, /headcount - |occupied - |- row\.occupied/)
  const api = read('src/lib/positions-api.ts')
  for (const call of ["apiFetch<ApiPositionsList>('/positions')", 'apiFetch<ApiPositionDetail>(`/positions/${id}`)', 'apiFetch<ApiPositionOptions>(`/positions/options?branchId=${branchId}`)',
    "apiFetch<ApiPositionForm>('/positions/form')", "apiFetch<ApiPositionGeneration>('/positions/generate')", "apiFetch<{ created: number; linked: number }>('/positions/generate', json('POST'))",
    "apiFetch<ApiPositionDetail>(`/positions/${id}/holders/${employeeId}`, json('DELETE'))"]) assert.ok(api.includes(call), call)
})

test('PU-03: النماذج — الوحدة عند الإنشاء بس، والربط للنشطة ولصاحب الإدارة، والتوليد معاينة ثم تطبيق', () => {
  const form = read('src/components/positions/PositionFormModal.tsx')
  assert.match(form, /\.\.\.\(position \? \{\} : \{ branchId: Number\(branchId\), departmentId: numberOrNull\(departmentId\), teamId: numberOrNull\(teamId\) \}\) \}/)
  assert.match(form, /onSaved\(position \? await updatePosition\(position\.id, input\) : await createPosition\(input\)\)/)
  assert.ok(form.includes('data-position-unit') && form.includes('(مابتتغيّرش بعد الإنشاء)'))
  // القوايم من الخادم (فروع نطاق الحساب والكتالوجات النشطة)، والأقسام بفرعها والفرق بقسمها
  assert.match(form, /fetchPositionForm\(\)\.then\(loaded => \{/)
  assert.match(form, /const departments = \(lists\?\.departments \?\? \[\]\)\.filter\(row => String\(row\.branchId\) === branchId\)/)
  assert.match(form, /const teams = \(lists\?\.teams \?\? \[\]\)\.filter\(row => String\(row\.departmentId\) === departmentId\)/)
  const holders = read('src/components/positions/PositionHoldersModal.tsx')
  assert.match(holders, /\{detail\.canManage && detail\.status === 'ACTIVE' && \(/)
  assert.match(holders, /\{detail\.canManage && <button type="button" className="text-red-700 underline text-xs" disabled=\{busy\} onClick=\{\(\) => void act\(\(\) => removePositionHolder\(id, holder\.employeeId\)\)\} data-position-unlink>فكّ الربط<\/button>\}/)
  assert.match(holders, /\{!holder\.seated && <span className="badge bg-amber-50 text-amber-800 mt-1" data-position-holder-note>\{holder\.note\} — مش محسوب في المشغول<\/span>\}/)
  assert.match(holders, /<EmployeePicker id="position-link-employee" employees=\{detail\.linkable\}/)
  const generate = read('src/components/positions/PositionGenerateModal.tsx')
  assert.match(generate, /fetchPositionGeneration\(\)\.then\(setPlan\)/)
  assert.match(generate, /\{!done && plan && plan\.totals\.create > 0 && <button type="button" className="btn-primary" disabled=\{busy\} onClick=\{\(\) => void apply\(\)\} data-position-generate-apply>/)
  assert.match(generate, /\{group\.action === 'create' \? 'وظيفة جديدة' : `متخطّى: \$\{group\.reason\}`\}/)
})

test('PU-04: خطوة اختيار الوظيفة عند التعيين — مع الموديول، وإجبارية مع الإنفاذ، وفشل القايمة بيوقّف الحفظ، والرقم حمولة', () => {
  const add = read('src/app/employees/add/page.tsx')
  assert.match(add, /const positionsOn = useModuleEnabled\('positions'\)/)
  assert.match(add, /if \(positionsOn && !seated\) \{/)
  assert.match(add, /if \(loaded\?\.available && \(loaded\.enforce \|\| options\.length > 0\)\) \{ setSeatStep\(\{ payload, options, enforce: loaded\.enforce \}\); return \}/)
  // فشل تحميل الوظائف: الحفظ بيقف (مانعرفش الإنفاذ مفعّل ولا لأ)
  assert.match(add, /setError\(err instanceof Error \? err\.message : 'تعذر تحميل الوظائف المعتمدة'\)\n\s+return\n/)
  assert.match(add, /if \(seat\.current\) Object\.assign\(employeeData, \{ positionId: seat\.current \}\)/)
  // سطر الحفظ المثبّت (اختبار تعيين المرشح) زي ما هو: التعيين من مرشح بياخد نفس الحمولة
  assert.match(add, /candidate \? \(await hireCandidate\(candidate\.id, employeeData\)\)\.employee : await createEmployee\(employeeData\)/)
  assert.match(add, /onPick=\{positionId => \{ const step = seatStep; seat\.current = positionId; setSeatStep\(null\); void handleSubmit\(step\.payload, true\) \}\}/)
  const pick = read('src/components/positions/PositionPickModal.tsx')
  assert.match(pick, /const open = \(row: ApiPositionOption\) => !enforce \|\| row\.vacant > 0/)
  assert.match(pick, /\{!enforce && <button type="button" className="btn-secondary" onClick=\{\(\) => onPick\(null\)\} data-position-pick-skip>من غير وظيفة<\/button>\}/)
  assert.match(pick, /disabled=\{!open\(row\)\}/)
  assert.match(pick, /\{enforce && none \? \(/)
  assert.match(pick, /disabled=\{picked === null\}/)
  // وظائف وحدة الموظف من قايمة فرعه: مستوى الفرع، أو قسمه، أو فريقه
  const { positionsOfUnit } = require(path.join(root, 'src/lib/positions-api.ts'))
  const options = [{ id: 1, departmentId: null, teamId: null }, { id: 2, departmentId: 10, teamId: null }, { id: 3, departmentId: 10, teamId: 5 }, { id: 4, departmentId: 11, teamId: null }]
  assert.deepEqual(positionsOfUnit(options, { departmentId: 10, teamId: 5 }).map(row => row.id), [1, 2, 3])
  assert.deepEqual(positionsOfUnit(options, { departmentId: 10, teamId: null }).map(row => row.id), [1, 2])
  assert.deepEqual(positionsOfUnit(options, { departmentId: null }).map(row => row.id), [1])
  assert.deepEqual(positionsOfUnit(options, { departmentId: 12, teamId: 5 }).map(row => row.id), [1])
})

test('PU-05: طلب «وظيفة جديدة / زيادة عدد» — وجهته متسمّية وتبع الموديول، والحقول بأسمائها عند المعتمد، وحقول النموذج فوق حقول الباني', () => {
  const requests = require('../src/positions/position-requests')
  // أي نوع بالوجهة دي (حتى لو معمول من الباني بكود تاني) تبع موديول الوظائف — فبيتقفل معاه
  assert.equal(registry.moduleOfRequestType({ code: 'BUILDER_MADE', destinationHandler: requests.POSITION_REQUEST_HANDLER }), 'positions')
  assert.equal(registry.moduleOfRequestType({ code: requests.POSITION_REQUEST_TYPE, destinationHandler: 'none' }), 'positions')
  assert.deepEqual([registry.MODULES.positions.requestTypes, registry.MODULES.positions.requestHandlers], [['POSITION_REQUEST'], ['positions_headcount']])
  // الوجهة بالعربي في قايمة الباني (من الخادم) وفي شاشة الطلبات — مش كود المعالج
  assert.ok(read('api/src/settings/settings.controller.ts').includes("  { key: 'positions_headcount', labelAr: 'وظيفة معتمدة جديدة / زيادة عدد' },\n"))
  assert.ok(read('src/app/requests/page.tsx').includes("  positions_headcount: 'وظيفة معتمدة جديدة / زيادة عدد',\n"))
  // المعتمد بيقرا «المسمى الوظيفي المطلوب» و«العدد المطلوب»، والعدد خانة رقم صحيح من 1
  const payload = require('../../src/lib/request-payload')
  // بتسميات غير تسميات بطاقة مقدّم الطلب («المسمى الوظيفي» و«القسم») اللي بتتعرض جنبها في نافذة الاعتماد
  assert.deepEqual([payload.payloadFieldLabel('positionTitle'), payload.payloadFieldLabel('headcount')], ['المسمى الوظيفي المطلوب', 'العدد المطلوب'])
  assert.equal(payload.payloadFieldKind('headcount'), 'number')
  assert.deepEqual(payload.payloadNumberProps('headcount'), { step: '1', min: '1' })
  assert.match(payload.payloadSummary(JSON.stringify({ positionTitle: 'محاسب', headcount: 2, reason: 'توسّع' })), /المسمى الوظيفي المطلوب: محاسب/)
  // القسم المتثبّت: المعتمد بيقرا اسمه («قسم الوظيفة»)، ورقمه (اللي الخادم كاتبه مع الاسم) مش معروض
  assert.equal(payload.payloadFieldLabel('positionDepartment'), 'قسم الوظيفة')
  assert.ok(payload.SERVER_PAYLOAD_KEYS.includes('positionDepartmentId'))
  const summary = payload.payloadSummary(JSON.stringify({ positionTitle: 'محاسب', headcount: 2, reason: 'توسّع', positionDepartmentId: 12, positionDepartment: 'قسم المالية' }))
  assert.match(summary, /قسم الوظيفة: قسم المالية/)
  assert.doesNotMatch(summary, /12|position/i)
  // والخادم بيثبّته عند كل تقديم وإعادة تقديم فوق أي قيمة من العميل (المفتاحين مسموحين في الحمولة عشان المتخزّنة تعدّي بس)
  const service = read('api/src/requests/requests.service.ts')
  assert.deepEqual([...requests.POSITION_REQUEST_STAGED_KEYS], ['positionDepartmentId', 'positionDepartment'])
  assert.ok(service.includes("  [POSITION_REQUEST_HANDLER]: ['positionTitle', 'headcount', ...POSITION_REQUEST_STAGED_KEYS],\n"))
  assert.ok(service.includes('    if (type.destinationHandler === POSITION_REQUEST_HANDLER) req.payload = JSON.stringify(await stagePositionRequest(em, req))\n'))
  // التثبيت في مسار التقديم نفسه (submitLocked) اللي إعادة التقديم بتعدّي عليه، وقبل حل السلسلة والحفظ
  const submit = service.slice(service.indexOf('  private async submitLocked('), service.indexOf('  private async leaveTimesInYear('))
  assert.ok(submit.indexOf('this.assertPayloadKeys(type, req.payload, branchScopeOf(user))') < submit.indexOf('await stagePositionRequest(em, req)'))
  assert.ok(submit.indexOf('await stagePositionRequest(em, req)') < submit.indexOf('await this.resolveChain(type, req, em, branchScopeOf(user))'))
  assert.match(service, /      req\.status = 'DRAFT'\n      await em\.getRepository\(Request\)\.save\(req\)\n      return this\.submitLocked\(user, id, em, true\)\n/)
  // حقول النموذج: التلاتة بتوع الوجهة الأول (والمسمى اختيارات الكتالوج)، وبعدهم حقول الباني — ومفتاح الباني اللي بنفس اسم حقل الوجهة مابيكتبش فوقه
  const plain = requests.positionRequestFields(['محاسب'], { requiredFields: null, customFields: null })
  assert.deepEqual(JSON.parse(plain.requiredFields), ['positionTitle', 'headcount', 'reason'])
  assert.deepEqual(JSON.parse(plain.customFields).map(field => [field.key, field.type, field.required]), [['positionTitle', 'select', true], ['headcount', 'number', true], ['reason', 'text', true]])
  assert.deepEqual(JSON.parse(plain.customFields)[0].options, ['محاسب'])
  const built = requests.positionRequestFields(['محاسب'], { requiredFields: JSON.stringify(['neededBy', 'budgetLine']),
    customFields: JSON.stringify([{ key: 'neededBy', label: 'مطلوب قبل', type: 'date', required: true }, { key: 'headcount', label: 'عدد مغشوش', type: 'text' },
      { key: 'positionDepartmentId', label: 'قسم من الباني', type: 'number' }]) })
  assert.deepEqual(JSON.parse(built.requiredFields), ['positionTitle', 'headcount', 'reason', 'neededBy', 'budgetLine'])
  // ومفتاحَي الخادم مش حقول ولا إلزام يحدده الباني
  assert.deepEqual(JSON.parse(requests.positionRequestFields([], { requiredFields: JSON.stringify(['positionDepartment']), customFields: JSON.stringify([{ key: 'positionDepartment', label: 'قسم', type: 'text' }]) }).customFields)
    .map(field => field.key), ['positionTitle', 'headcount', 'reason'])
  assert.deepEqual(JSON.parse(built.customFields).map(field => [field.key, field.label, field.type]), [['positionTitle', 'المسمى الوظيفي المطلوب', 'select'], ['headcount', 'العدد المطلوب', 'number'],
    ['reason', 'سبب الطلب', 'text'], ['neededBy', 'مطلوب قبل', 'date'], ['budgetLine', 'budgetLine', 'text']])
  // إعداد تالف على النوع مايوقّعش النموذج
  assert.deepEqual(JSON.parse(requests.positionRequestFields([], { requiredFields: '{', customFields: 'x' }).requiredFields), ['positionTitle', 'headcount', 'reason'])
})
