// B2.6 (ب): واجهة تفويض الاعتمادات — عميل الـAPI، وقسم «تفويض اعتماداتي»، وشارة «بالنيابة عن» في الصندوق وسطرها في سجل الطلب،
// وخانة «مسموح تتفوّض» في محرر السلسلة، والقاعدة الصافية في الخادم. اختبارات نقية بلا قاعدة بيانات.
// Run (من api/): node --test test/approval-delegations-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('DGU-01: عميل الـAPI على مسارات الخادم نفسها وبنفس الحدود، ونص «بالنيابة عن»', () => {
  const ui = require('../../src/lib/delegations-api')
  const server = require('../src/requests/approval-delegations')
  assert.equal(ui.DELEGATION_DAYS_MAX, server.DELEGATION_DAYS_MAX)
  assert.deepEqual(Object.keys(ui.DELEGATION_STATE_LABELS), ['UPCOMING', 'ACTIVE', 'ENDED', 'REVOKED'])
  const api = read('src/lib/delegations-api.ts')
  for (const call of ["apiFetch<ApiDelegations>('/requests/delegations')", "apiFetch<{ id: number }>('/requests/delegations', { method: 'POST', body: JSON.stringify(input) })",
    "apiFetch<{ id: number }>(`/requests/delegations/${id}/revoke`, { method: 'POST' })"]) assert.ok(api.includes(call), call)
  const controller = read('api/src/requests/requests.controller.ts')
  // المسارات الثابتة قبل ‎:id (وإلا «delegations» تتقري رقم طلب)
  const order = ["@Get('requests/delegations')", "@Post('requests/delegations')", "@Post('requests/delegations/:id/revoke')", "@Get('requests/:id')"].map(route => controller.indexOf(route))
  assert.ok(order.every(at => at > 0) && order.every((at, index) => index === 0 || at > order[index - 1]), JSON.stringify(order))
  // السطر اللي اتاخد بتفويض: بالاسمين لأطراف الطلب، ومن غير أسماء لغيرهم، وفاضي للسطر العادي
  assert.deepEqual([ui.onBehalfText({ onBehalf: true, onBehalfOfName: 'سارة', actedByName: 'أحمد' }), ui.onBehalfText({ onBehalf: true, onBehalfOfName: 'سارة' }),
    ui.onBehalfText({ onBehalf: true }), ui.onBehalfText({}), ui.onBehalfText({ onBehalfOfName: 'سارة' })],
  ['أحمد بالنيابة عن سارة', 'بالنيابة عن سارة', 'بالنيابة (تفويض)', '', ''])
  // فئات التفويض المتخزنة: قايمة مش فاضية، أو كل الفئات
  assert.deepEqual([server.delegationCategories('["training","leaves"]'), server.delegationCategories('[]'), server.delegationCategories(null), server.delegationCategories('not json'), server.delegationCategories('"training"')],
    [['training', 'leaves'], null, null, null, null])
  const rows = [{ id: 1, delegatorEmployeeId: 9, delegateEmployeeId: 7, categories: null }, { id: 2, delegatorEmployeeId: 4, delegateEmployeeId: 7, categories: ['training'] }]
  assert.deepEqual([[...server.delegatorsForCategory(rows, 'training')], [...server.delegatorsForCategory(rows, 'leaves')], [...server.delegatorsForCategory(rows, null)], [...server.delegatorsForCategory([], 'training')]],
    [[9, 4], [9], [9], []])
})

test('DGU-02: القاعدة في مكان واحد — المعتمد المسمّى أو بديله، للأدوار الهيكلية بس، وللخطوة المسموح تتفوّض', () => {
  const { ApproverResolver, FUNCTIONAL_APPROVER_ROLES } = require('../src/requests/approver-resolver.service')
  const { DELEGABLE_ROLES, roleLabels } = require('../../src/components/approvals/chainEditorModel')
  const resolver = new ApproverResolver(null, null, null, null)
  const delegate = { sub: 1, role: 'employee', permissions: [], employeeId: 7 }, acting = new Set([9])
  // قايمة الواجهة = كل أدوار السلسلة غير الوظيفية
  assert.deepEqual([...DELEGABLE_ROLES].sort(), Object.keys(roleLabels).filter(role => !FUNCTIONAL_APPROVER_ROLES.includes(role)).sort())
  for (const role of DELEGABLE_ROLES) {
    const step = { role, approverEmployeeId: 9 }
    assert.equal(resolver.holdsStep(delegate, step), false, `${role}: من غير تفويض`)
    assert.equal(resolver.holdsStep(delegate, step, acting), true, `${role}: بتفويض`)
    assert.equal(resolver.holdsStep(delegate, { ...step, canDelegate: true }, acting), true, `${role}: مسموح صراحةً`)
    assert.equal(resolver.holdsStep(delegate, { ...step, canDelegate: false }, acting), false, `${role}: مش مسموح تتفوّض`)
    assert.equal(resolver.holdsStep(delegate, { role, approverEmployeeId: 8 }, acting), false, `${role}: مفوِّض تاني`)
    assert.equal(resolver.holdsStep(delegate, { role, approverEmployeeId: null }, acting), false, `${role}: من غير معتمد`)
    // المعتمد نفسه مابيتأثرش بالخانة
    assert.equal(resolver.holdsStep({ ...delegate, employeeId: 9 }, { ...step, canDelegate: false }), true, `${role}: المعتمد نفسه`)
    // صاحب الطلب مايعتمدوش حتى بتفويض، ومدير النظام زي ما هو
    assert.equal(resolver.satisfies(delegate, step, { selfRequest: true, actingFor: acting }), false, `${role}: طلبه هو`)
    assert.equal(resolver.satisfies(delegate, step, { actingFor: acting }), true, `${role}: satisfies بتفويض`)
    assert.equal(resolver.satisfies(delegate, step), false, `${role}: satisfies من غير تفويض`)
  }
  // الأدوار الوظيفية بالصلاحية: التفويض مابيدّيش حاجة
  for (const role of FUNCTIONAL_APPROVER_ROLES) assert.equal(resolver.holdsStep(delegate, { role, approverEmployeeId: 9 }, acting), false, role)
})

test('DGU-03: قسم «تفويض اعتماداتي» وشارة الصندوق وسطر السجل', () => {
  const section = read('src/components/approvals/ApprovalDelegations.tsx')
  for (const marker of ['data-approval-delegations', 'data-delegation-summary', 'data-delegations-unavailable', 'data-delegation-form', 'data-delegations-to-me', 'data-delegations-mine', 'data-delegations-others']) {
    assert.ok(section.includes(marker), marker)
  }
  // البديل من دليل الموظفين الموجود (من غير مسار جديد)، والمفوِّض لصاحب الصلاحية بس
  assert.match(section, /fetchEmployeeDirectory\(\)\.then\(setDirectory\)/)
  assert.match(section, /\{data\.canManageOthers && \(\s*<div>\s*<label className="label" htmlFor="delegation-delegator">/)
  assert.match(section, /<EmployeePicker id="delegation-delegate" employees=\{directory \?\? \[\]\}/)
  // نفس حدود الخادم قبل الإرسال
  assert.match(section, /if \(form\.endDate < form\.startDate\) \{ setFormError\('نهاية التفويض قبل بدايته'\); return \}/)
  assert.match(section, /if \(form\.endDate < today\) \{ setFormError\('فترة التفويض خلصت — اختار نهاية من النهارده أو بعده'\); return \}/)
  assert.match(section, /if \(daysBetween\(form\.startDate, form\.endDate\) \+ 1 > DELEGATION_DAYS_MAX\) \{ setFormError\('فترة التفويض أقصاها سنة'\); return \}/)
  assert.match(section, /categories: form\.categories\.length \? form\.categories : null,/)
  // الإلغاء بحكم الخادم، وقبل الترحيل القسم بيقول ليه مقفول
  assert.match(section, /\{row\.canRevoke && <button type="button" className="btn-secondary text-red-700 mr-auto disabled:opacity-50" disabled=\{busy\} onClick=\{\(\) => revoke\(row\)\}>إلغاء التفويض<\/button>\}/)
  assert.match(section, /\{data && !data\.available && <p className="text-sm text-gray-500" data-delegations-unavailable>/)
  const page = read('src/app/approvals-inbox/page.tsx')
  assert.match(page, /<MyApprovalDecisions onOpen=\{setDetailId\} revision=\{decisionsRevision\} \/>\s+<ApprovalDelegations \/>/)
  assert.match(page, /onBehalfOf: r\.onBehalfOfEmployeeId \? r\.onBehalfOfName \?\? 'المعتمد' : null,/)
  assert.match(page, /\{item\.onBehalfOf && <span className="badge text-xs bg-amber-100 text-amber-800" data-on-behalf>بالنيابة عن \{item\.onBehalfOf\}<\/span>\}/)
  // ونفس الشارة في ويدجت لوحة التحكم (الاعتماد السريع بيعرض الطلبات اللي بالنيابة كمان)
  assert.match(read('src/components/dashboard/PendingApprovals.tsx'),
    /\{req\.onBehalfOfEmployeeId && <span className="badge text-xs bg-amber-100 text-amber-800" data-on-behalf>بالنيابة عن \{req\.onBehalfOfName \?\? 'المعتمد'\}<\/span>\}/)
  // بند «بانتظار موافقتي» لحساب «موظف»: والصندوق فاضي بيظهر للمعتمد الهيكلي ولطرف التفويض (منه بيسجّل تفويضه قبل إجازته)؛ وقبل الترحيل زي الأول
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /if \(getCurrentUser\(\)\?\.role !== 'employee'\) return\s+fetchDelegations\(\)\s+\.then\(\(data\) => setDelegationEntry\(data\.available && \(data\.approver \|\| data\.toMe\.length > 0 \|\| data\.mine\.some\(\(row\) => row\.canRevoke\)\)\)\)\s+\.catch\(\(\) => setDelegationEntry\(false\)\)/)
  assert.match(sidebar, /const showInbox = currentUser\.role !== 'employee' \|\| inboxCount > 0 \|\| inboxError \|\| delegationEntry\n/)
  assert.match(sidebar, /\[currentUser, inboxCount, inboxError, delegationEntry, payrollApprovals, tasksCount, teamManager, raisesOpen, enabledModules\]/)
  // سطر «بالنيابة عن» في الشاشتين اللي بيعرضوا سجل الطلب
  assert.match(read('src/app/requests-console/page.tsx'), /\{onBehalfText\(a\) && <p className="text-xs text-amber-800 mt-1" data-on-behalf>\{onBehalfText\(a\)\}<\/p>\}/)
  assert.match(read('src/app/requests/page.tsx'), /\{onBehalfText\(a\) && <p className="text-xs text-amber-800" data-on-behalf>\{onBehalfText\(a\)\}<\/p>\}/)
  const api = read('src/lib/api.ts')
  assert.match(api, /onBehalf\?: boolean; onBehalfOfName\?: string \| null; actedByName\?: string \| null/)
  assert.match(api, /onBehalfOfEmployeeId\?: number; onBehalfOfName\?: string \| null/)
})

test('DGU-04: محرر السلسلة — خانة «مسموح تتفوّض» للأدوار الهيكلية، وبتتبعت لما تتقفل بس', () => {
  const model = require('../../src/components/approvals/chainEditorModel')
  assert.equal(model.emptyStep().canDelegate, true)
  const fromApi = (canDelegate, approverRole = 'direct_manager_of_requester') => model.stepFormOf({ id: 1, chainId: 1, stepOrder: 1, approverRole, isParallel: false,
    thresholdField: null, thresholdOp: null, thresholdValue: null, slaDays: null, escalateTo: null, canDelegate }, 'k')
  assert.deepEqual([fromApi(true).canDelegate, fromApi(false).canDelegate, fromApi(undefined).canDelegate], [true, false, true])
  const built = steps => model.buildChainSteps({ name: 'سلسلة', code: 'C', branchId: '', steps }).map(step => step.canDelegate)
  // المقفولة لدور هيكلي بتتبعت false؛ المسموحة مابتتبعتش (افتراضي الخادم)؛ والدور الوظيفي مالوش الخانة أصلًا
  assert.deepEqual(built([fromApi(false), fromApi(true), { ...fromApi(false, 'hr') }, { ...fromApi(false, 'specific_employee'), specificEmployeeId: '5' }]), [false, undefined, undefined, false])
  const modal = read('src/components/approvals/ChainEditorModal.tsx')
  assert.match(modal, /\{DELEGABLE_ROLES\.includes\(step\.approverRole\) && \(\s*<label className="flex items-center gap-1\.5 mr-3" title="[^"]+" data-step-can-delegate>/)
  assert.match(modal, /checked=\{step\.canDelegate\}\s+disabled=\{readOnly\}\s+onChange=\{\(e\) => updateStep\(index, 'canDelegate', e\.target\.checked\)\}/)
  const controller = read('api/src/settings/settings.controller.ts')
  assert.match(controller, /@IsOptional\(\)\s+@IsBoolean\(\)\s+canDelegate\?: boolean\s+\}\s+class ReplaceStepsDto/)
  // بصمة السلسلة في «بانِي الطلبات»: سلسلتين الفرق بينهم قفل التفويض بس مش «نفس السلسلة» (التوحيد كان هيشيل القفل)
  const { chainStepsSignature } = require('../../src/lib/request-category-chains')
  const chainOf = canDelegate => ({ id: 1, code: 'C', nameAr: 'سلسلة', branchId: null, isActive: true, autoApprove: false, requestTypeCode: null,
    steps: [{ id: 1, chainId: 1, stepOrder: 1, approverRole: 'direct_manager_of_requester', isParallel: false, thresholdField: null, thresholdOp: null, thresholdValue: null,
      slaDays: null, escalateTo: null, canDelegate }] })
  assert.equal(chainStepsSignature(chainOf(true)), chainStepsSignature(chainOf(undefined)))
  assert.notEqual(chainStepsSignature(chainOf(true)), chainStepsSignature(chainOf(false)))
  // الخطوة المحفوظة في الطلب بتاخد العلامة لما تبقى مقفولة بس (الخطوات المحفوظة قبل كده زي ما هي)
  assert.match(read('api/src/requests/requests.service.ts'), /\.\.\.\(s\.canDelegate === false \? \{ canDelegate: false \} : \{\}\),/)
})
