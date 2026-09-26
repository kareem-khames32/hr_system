// سلسلة اعتماد لكل فئة جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر) — الواجهة ودوال الربط الصافية.
// محرر السلسلة المشترك (ChainEditorModal) بـReact SSR، ودوال الشاشة والخادم الصافية، وفحص نصي للربط؛ لا SQL ولا خدمة.
// (الملفات على القرص ممكن تكون CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const { ChainEditorModal, chainEditorTargetKey } = require('../../src/components/approvals/ChainEditorModal')
const model = require('../../src/components/approvals/chainEditorModel')
const ui = require('../../src/lib/request-category-chains')
const { branchScopeOfUser, canSeeBranch } = require('../../src/lib/branch-scope')
const server = require('../src/requests/request-category-chains')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
const noop = () => undefined

const step = (id, chainId, order, approverRole, extra = {}) => ({ id, chainId, stepOrder: order, approverRole, isParallel: false, thresholdField: null,
  thresholdOp: null, thresholdValue: null, slaDays: 2, escalateTo: null, canDelegate: true, specificEmployeeId: null, ...extra })
const chain = (id, extra = {}) => ({ id, code: 'CAT_LEAVES', nameAr: 'سلسلة الإجازات', branchId: null, isActive: true, requestTypeCode: null,
  isPrimary: true, autoApprove: false, steps: [step(id * 10 + 1, id, 1, 'direct_manager_of_requester'), step(id * 10 + 2, id, 2, 'hr')], ...extra })
const general = chain(10)
const maadi = chain(11, { nameAr: 'سلسلة الإجازات — المعادي', branchId: 1, isPrimary: false, steps: [step(111, 11, 1, 'hr')] })
const branches = [{ id: 1, name: 'فرع المعادي', isActive: true }, { id: 2, name: 'فرع النصر', isActive: true }, { id: 3, name: 'فرع الرياض', isActive: true }]
const editor = (target, extra = {}) => render(ChainEditorModal, { target, chains: [general, maadi], branches, employees: [], onNavigate: noop,
  onClose: noop, onSaved: noop, categoriesOf: c => (c.id === 10 ? ['الإجازات', 'الحضور والوقت'] : []), scope: null, ...extra })
const rowsOf = html => [...html.matchAll(/data-chain-branch-row="(\d+)"/g)].map(match => Number(match[1]))

test('RC-UI-01: تعديل سلسلة الفئة جوّه المحرر المشترك — «سلسلة مختلفة لكل فرع» بكل الفروع لحساب الشركة', () => {
  const html = editor({ kind: 'edit', chainId: 10 })
  for (const text of ['تعديل دورة الاعتماد', 'السلسلة دي سلسلة فئة «الإجازات» و«الحضور والوقت» لكل الشركة', 'سلسلة مختلفة لكل فرع',
    'طلبات فئة «الإجازات» و«الحضور والوقت» واحدة لكل الشركة', 'ليه سلسلة خاصة — 1 خطوة', 'تعديل سلسلة الفرع', 'اعمل سلسلة خاصة للفرع', 'حفظ التغييرات']) {
    assert.ok(html.includes(text), text)
  }
  assert.deepEqual(rowsOf(html), [1, 2, 3])
  assert.equal(html.match(/اعمل سلسلة خاصة للفرع/g).length, 2, 'النصر والرياض من غير نسخة')
  assert.ok(html.includes('data-chain-editor-save'))
  assert.ok(!html.includes('data-chain-read-only'))
  // السلسلة اللي بتسري على كل الفروع مابتتنقلش لفرع — مفيش اختيار «نطاق الفرع»
  assert.ok(!html.includes('نطاق الفرع'))
})

test('RC-UI-02: حساب الفرع — السلسلة العامة للقراءة، وصف فرعه بس في الجدول (يقدر يعمل سلسلة فرعه)', () => {
  const html = editor({ kind: 'edit', chainId: 10 }, { scope: [2] })
  assert.ok(html.includes('data-chain-read-only'))
  assert.ok(html.includes('السلسلة دي لكل الشركة — بتتعدّل من حساب على مستوى الشركة'))
  assert.match(html, /<fieldset disabled=""/)
  assert.ok(!html.includes('data-chain-editor-save'), 'مفيش حفظ للسلسلة العامة')
  assert.deepEqual(rowsOf(html), [2])
  assert.ok(html.includes('اعمل سلسلة خاصة للفرع'))
  // سلسلة فرعه نفسه قابلة للتعديل
  const own = editor({ kind: 'edit', chainId: 11 }, { scope: [1] })
  assert.ok(!own.includes('data-chain-read-only'))
  assert.ok(own.includes('data-chain-editor-save'))
  assert.ok(own.includes('دي السلسلة الخاصة بـ<b>فرع المعادي</b>'))
})

test('RC-UI-03: «نسخة خاصة بفرع» — الكود مقفول على العامة، والفروع اللي مالهاش نسخة بس، والفرع المختار من الجدول', () => {
  const html = editor({ kind: 'branchCopy', chainId: 10 })
  assert.ok(html.includes('نسخة خاصة بفرع من «سلسلة الإجازات»'))
  assert.match(html, /<input(?=[^>]*disabled="")(?=[^>]*value="CAT_LEAVES")[^>]*>/)
  assert.ok(html.includes('فرع النصر فقط') && html.includes('فرع الرياض فقط'))
  assert.ok(!html.includes('فرع المعادي فقط'), 'المعادي ليه نسخة')
  assert.ok(!html.includes('كل الفروع (دورة عامة)'))
  assert.ok(html.includes('value="سلسلة الإجازات — فرع النصر"'))
  const picked = editor({ kind: 'branchCopy', chainId: 10, branchId: 3 })
  assert.ok(picked.includes('value="سلسلة الإجازات — فرع الرياض"'))
  assert.match(picked, /<option value="3" selected="">فرع الرياض فقط<\/option>/)
  assert.equal(chainEditorTargetKey({ kind: 'branchCopy', chainId: 10, branchId: 3 }), 'copy-10-3')
  assert.equal(chainEditorTargetKey({ kind: 'edit', chainId: 10 }), 'edit-10')
})

test('RC-UI-04: إنشاء سلسلة — «كل الفروع» لحساب الشركة بس، وحساب الفرع على فرعه؛ ومفيش هدف = مفيش محرر', () => {
  const company = editor({ kind: 'create' })
  assert.ok(company.includes('كل الفروع (دورة عامة)'))
  assert.ok(company.includes('إنشاء الدورة'))
  const branch = editor({ kind: 'create' }, { scope: [2] })
  assert.ok(!branch.includes('كل الفروع (دورة عامة)'))
  assert.ok(branch.includes('فرع النصر فقط') && !branch.includes('فرع المعادي فقط'))
  assert.equal(render(ChainEditorModal, { target: null, chains: [], branches, employees: [], onNavigate: noop, onClose: noop, onSaved: noop }), '')
  assert.ok(editor({ kind: 'edit', chainId: 99 }).includes('السلسلة دي مش ظاهرة لحسابك أو اتشالت'))
})

test('RC-UI-05: نطاق الفروع في الواجهة — مرآة branchScopeOf (قائمة فروع أو null للشركة)', () => {
  assert.deepEqual(branchScopeOfUser(null), [])
  assert.equal(branchScopeOfUser({ role: 'super_admin', branchId: 3 }), null)
  assert.equal(branchScopeOfUser({ role: 'hr_manager', branchId: 3, scopeAllBranches: true }), null)
  assert.deepEqual(branchScopeOfUser({ role: 'hr_manager', branchId: 3 }), [3])
  assert.deepEqual(branchScopeOfUser({ role: 'hr_manager', branchId: null }), [])
  assert.deepEqual(branchScopeOfUser({ role: 'hr_manager', branchId: 3, scopeAllBranches: 'true' }), [3], 'مقارنة حرفية')
  assert.equal(canSeeBranch(null, 5), true)
  assert.equal(canSeeBranch([2], 2), true)
  assert.equal(canSeeBranch([2], 3), false)
  assert.equal(canSeeBranch([2], null), false)
  assert.equal(canSeeBranch([], 2), false)
})

test('RC-UI-06: ملخص الخطوات والاستخدام', () => {
  assert.equal(model.chainStepsText([{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'hr' }, { approverRole: 'finance', isParallel: true }]),
    'المدير المباشر ← الموارد البشرية + المالية')
  assert.equal(model.chainStepsText([], true), 'تنفيذ فوري بلا اعتمادات')
  assert.match(model.chainStepsText([]), /لسه مالهاش خطوات/)
  assert.equal(ui.usageText(0, null), 'ولا طلب لحد دلوقتي')
  assert.equal(ui.usageText(2, null), 'طلبين')
  assert.equal(ui.usageText(15, null), '15 طلب')
  const one = ui.usageText(1, '2026-09-20T10:00:00.000Z')
  assert.ok(one.startsWith('طلب واحد — آخر طلب ') && one.includes('2026'), one)
  const map = { categories: [{ category: 'leaves', chainId: 10 }, { category: 'time_attendance', chainId: 10 }, { category: 'financial', chainId: null }], chains: [], types: [] }
  assert.deepEqual(ui.categoryChainLabelsOf(map, 10), ['الإجازات', 'الحضور والوقت'])
  assert.deepEqual(ui.categoryChainLabelsOf(null, 10), [])
})

test('RC-UI-07: «نفس السيناريو» والاختيار الافتراضي في «خلّي طلبات الفئة دي كلها على سلسلة واحدة»', () => {
  const twin = chain(20, { code: 'CH_LEAVE_SICK', nameAr: 'سلسلة المرضية' })
  const slower = chain(21, { code: 'CH_LEAVE_X', steps: [step(211, 21, 1, 'direct_manager_of_requester', { slaDays: 5 }), step(212, 21, 2, 'hr')] })
  const empty = chain(22, { code: 'CH_EMPTY', steps: [] })
  const withVersion = chain(23, { code: 'CH_V' })
  const version = chain(24, { code: 'CH_V', branchId: 1, steps: [step(241, 24, 1, 'hr')] })
  const offVersion = chain(25, { code: 'CAT_LEAVES', branchId: 2, isActive: false, steps: [step(251, 25, 1, 'finance')] })
  const all = [general, maadi, twin, slower, empty, withVersion, version, offVersion]
  // المعادي نسخة مفعّلة من العامة؛ من غيرها «نفس الخطوات» ماتكفيش
  const noBranches = all.filter(c => c.id !== 11)
  assert.equal(ui.sameApprovalFlow(twin, general, noBranches), true, 'نفس الخطوات ومفيش نسخ مفعّلة (المعطّلة ماتتحسبش)')
  assert.equal(ui.sameApprovalFlow(twin, general, all), false, 'العامة ليها نسخة مفعّلة للمعادي')
  assert.equal(ui.sameApprovalFlow(slower, general, noBranches), false, 'مهلة مختلفة = سيناريو مختلف')
  assert.equal(ui.sameApprovalFlow(withVersion, twin, all), false)
  assert.equal(ui.sameApprovalFlow(general, general, all), true)
  const state = (approvalChainId, info, current = null) => ui.consolidationStateOf({ id: 1, isActive: true, approvalChainId }, info, twin, current, noBranches)
  assert.equal(state(20), 'already')
  // سلسلة جديدة منسوخة من twin: اللي على twin نفسها بيتنقل للجديدة (نفس الخطوات) مش «عليها أصلًا»
  assert.equal(ui.consolidationStateOf({ id: 1, isActive: true, approvalChainId: 20 }, undefined, twin, null, noBranches, true), 'same')
  // والنسخ من سلسلة الفئة الحالية نفسها: الماشيين عليها بيتنقلوا لوحدهم (الخادم بينقل الماشيين على الفئة)
  assert.equal(ui.consolidationStateOf({ id: 1, isActive: true, approvalChainId: 20 }, undefined, twin, 20, noBranches, true), 'follower')
  assert.equal(state(21, undefined, 21), 'follower')
  assert.equal(state(null), 'unset')
  assert.equal(state(22), 'unset')
  assert.equal(state(10), 'same')
  assert.equal(state(21), 'different')
  assert.equal(state(10, { mode: 'fixed' }), 'fixed')
  // نفس خطوات العامة بس العامة ليها نسخة للمعادي: «نسخ الفروع مختلفة» — المعادي هيتغير توجيهه لو اتنقل
  assert.equal(ui.consolidationStateOf({ id: 1, isActive: true, approvalChainId: 20 }, undefined, general, null, all), 'branches')
  assert.equal(ui.consolidationDefault({ isActive: true }, 'branches'), false)
  assert.equal(ui.consolidationDefault({ isActive: true }, 'same'), true)
  assert.equal(ui.consolidationDefault({ isActive: true }, 'unset'), true)
  assert.equal(ui.consolidationDefault({ isActive: false }, 'same'), false, 'المعطّل مش متعلّم عليه')
  assert.equal(ui.consolidationDefault({ isActive: true }, 'different'), false, 'السيناريو المختلف = متخصّص')
  assert.equal(ui.chainUnset(empty), true)
  assert.equal(ui.chainUnset({ ...empty, autoApprove: true }), false)
})

test('RC-UI-08: دوال الخادم الصافية — مفتاح الربط، الأنواع الثابتة، الوضع، وكود السلسلة الجديد', () => {
  assert.equal(server.categoryChainKey('leaves'), 'requests.category_chain.leaves')
  assert.equal(server.isCategoryChainKey('requests.category_chain.financial'), true)
  assert.equal(server.isCategoryChainKey('leave.annual_entitled'), false)
  assert.deepEqual(['12', ' 7 ', '', 'x', '0', '-3', '1.5', null].map(server.parseCategoryChainId), [12, 7, null, null, null, null, null, null])
  const map = server.categoryChainMap([{ key: 'requests.category_chain.leaves', value: '5' }, { key: 'requests.category_chain.time_attendance', value: '5' },
    { key: 'requests.category_chain.financial', value: '' }, { key: 'requests.category_chain.general', value: '9' }, { key: 'leave.x', value: '3' }])
  assert.deepEqual([...map.entries()], [['leaves', 5], ['time_attendance', 5]])
  assert.match(server.fixedChainReason({ code: 'LOAN_INSTALLMENT_DEFER' }), /السلفة/)
  assert.match(server.fixedChainReason({ code: 'PAYROLL_DEDUCTION' }), /الخصومات/)
  assert.match(server.fixedChainReason({ code: 'PAYROLL_BONUS' }), /المكافآت/)
  assert.match(server.fixedChainReason({ code: 'BONUS', destinationHandler: 'payroll_bonus' }), /المكافآت/)
  assert.equal(server.fixedChainReason({ code: 'LEAVE', destinationHandler: 'leave_deduct_balance' }), null)
  assert.equal(server.typeChainMode({ code: 'LEAVE', approvalChainId: 5 }, 5), 'category')
  assert.equal(server.typeChainMode({ code: 'LEAVE', approvalChainId: 6 }, 5), 'custom')
  assert.equal(server.typeChainMode({ code: 'LEAVE', approvalChainId: 6 }, null), 'custom')
  assert.equal(server.typeChainMode({ code: 'LEAVE', approvalChainId: null }, 5), 'none')
  assert.equal(server.typeChainMode({ code: 'PAYROLL_DEDUCTION', approvalChainId: 5 }, 5), 'fixed')
  assert.equal(server.isOvertimeRequestType({ code: 'OVERTIME' }), true)
  assert.equal(server.isOvertimeRequestType({ code: 'X', destinationHandler: 'overtime_entries' }), true)
  assert.equal(server.isOvertimeRequestType({ code: 'PERMISSION', destinationHandler: 'attendance_log' }), false)
  assert.equal(server.nextFreeChainCode('CH_LEAVE', new Set(['CH_LEAVE', 'CH_LEAVE_2'])), 'CH_LEAVE_3')
  assert.equal(server.nextFreeChainCode('cat_leaves', new Set()), 'CAT_LEAVES')
  const long = server.nextFreeChainCode('CH_' + 'A'.repeat(60), new Set(['CH_' + 'A'.repeat(47)]))
  assert.ok(long.length <= 50 && long.endsWith('_2'), long)
  assert.deepEqual(server.REQUEST_CATEGORIES.map(c => server.REQUEST_CATEGORY_LABELS[c]),
    Object.values(require('../../src/data/requestsCatalog').categoryLabels), 'نفس الفئات والأسماء في الواجهة')
})

test('RC-UI-09: «بانِي الطلبات» هو المكان الواحد — الفئات بسلاسلها، الشارات والإجراءات، المحرر جوّه الشاشة، والاستخدام وفلتر «غير مستخدمة»', () => {
  const page = read('src/app/settings/request-types/page.tsx')
  for (const text of [
    "import { ChainEditorModal, type ChainEditorTarget } from '@/components/approvals/ChainEditorModal'",
    '<ChainEditorModal', 'categoriesOf={categoriesOfChain}', 'fetchRequestCategoryMap()',
    'data-request-category={category}', 'renderCategoryChain(category)', 'سلسلة الفئة:', 'تعديل السلسلة',
    "setEditorTarget({ kind: 'edit', chainId: chain.id })",
    'ماشي على سلسلة الفئة', 'سلسلة خاصة', 'خصّص سلسلة للطلب ده', 'رجّعه لسلسلة الفئة', 'تعديل سلسلته',
    'await customizeTypeChain(rt.id)', 'await followCategoryChain(rt.id)', 'await setCategoryChain(dialog.category,',
    'خلّي طلبات الفئة دي كلها على سلسلة واحدة', 'غيّر سلسلة الفئة', 'نفس سلسلة: ', 'نفس سلسلة فئة تانية',
    'سلسلة جديدة للفئة بخطوات سلسلة موجودة', 'من غير سلسلة للفئة — كل طلب بسلسلته', 'كل طلب مالي بسلسلته',
    'consolidationDefault(rt, state)', 'علّم الكل', 'نفس الخطوات، بس نسخ الفروع مختلفة', '`سلاسل طلبات ${label}`',
    'هيتنقل للسلسلة ${moving.length} طلب',
    'usageText(info.usageCount, info.lastRequestAt)', '<option value="unused" disabled={!categoryMap}>غير مستخدمة (ولا طلب)</option>',
    "(statusFilter === 'unused' && used === 0)", 'مفيش حاجة بتتعطل لوحدها', 'data-type-toggle', 'onClick={() => toggleStatus(rt)}',
    'سلسلة الفئة: {chainNameOf(formCategoryChainId)}', 'افتح السلسلة',
  ]) assert.ok(page.includes(text), text)
  // الربط والتخصيص للحساب اللي معاه الصلاحيتين، وربط الفئة لحساب على مستوى الشركة
  assert.ok(page.includes("chainActions: ch.status === 'fulfilled' && can('approval_chains.manage') && can('request_types.manage')"))
  assert.ok(page.includes('companyWide: branchScopeOfUser(getCurrentUser()) === null'))
  assert.ok(page.includes('const canWrite = access.chainActions && access.companyWide'))
  // قاعدة المالك: الإجراء في مكانه — مفيش زرار بيوديك «الاعتمادات والموافقات» عشان تعدّل
  assert.ok(!page.includes('href="/settings/approvals"'))
  // مفيش تعطيل آلي: التفعيل/التعطيل بضغطة المالك بس
  assert.ok(!/isActive: false/.test(page.slice(page.indexOf('const saveCategoryDialog'), page.indexOf('const handleOpenModal'))))
})

test('RC-UI-10: «الاعتمادات والموافقات» بقت مكتبة السلاسل بنفس المحرر، ومعاها سطر بيدل على «بانِي الطلبات»', () => {
  const page = read('src/app/settings/approvals/page.tsx')
  for (const text of ['data-request-builder-note', 'href="/settings/request-types"', '«بانِي الطلبات»', 'مكتبة كل سلاسل الاعتماد',
    'سلسلة فئة: {chainCategories.join', '<ChainEditorModal', 'categoriesOf={categoriesOf}', 'typeNameOf={chainTypeName}']) {
    assert.ok(page.includes(text), text)
  }
  // النموذج القديم اتنقل للمكوّن — مفيش نسختين من المحرر
  for (const gone of ['const validateForm', 'const buildSteps', 'replaceChainSteps(editingChain.id', 'const emptyStep']) assert.ok(!page.includes(gone), gone)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.ok(sidebar.includes("{ label: 'الاعتمادات والموافقات', href: '/settings/approvals', perm: 'approval_chains.manage' }"), 'عنصر القائمة زي ما هو')
})

test('RC-UI-11: الخادم — مسارات بالصلاحيتين، ربط الفئة لكل الشركة، ومفتاح الربط مقفول في الإعدادات العامة', () => {
  const controller = read('api/src/settings/request-category-chains.controller.ts')
  assert.equal(controller.match(/@Perm\('request_types\.manage', 'approval_chains\.manage'\)/g).length, 4)
  for (const route of ["@Get('request-categories')", "@Put('request-categories/:category/chain')", "@Post('request-types/:id/customize-chain')",
    "@Post('request-types/:id/follow-category')"]) assert.ok(controller.includes(route), route)
  const module = read('api/src/settings/settings.module.ts')
  assert.ok(module.includes('controllers: [SettingsController, RequestCategoryChainsController]'))
  assert.ok(module.includes('providers: [ConfigDefaultsService, RequestCategoryChainsService]'))
  const service = read('api/src/settings/request-category-chains.service.ts')
  const set = service.slice(service.indexOf('async setCategoryChain'), service.indexOf('async customizeType'))
  assert.ok(set.indexOf('assertChainAndTypePerms(user)') < set.indexOf('assertCompanyWideWrite(user)'))
  assert.ok(set.includes('await this.lock(em)') && set.includes('this.ds.transaction'))
  for (const name of ['async customizeType', 'async followCategory']) {
    const body = service.slice(service.indexOf(name), service.indexOf(name) + 900)
    assert.ok(body.includes('assertChainAndTypePerms(user)') && body.includes('assertDefinitionWritable(user, type)'), name)
  }
  // مفيش مسح سلاسل ولا تعطيل أنواع من هنا
  assert.ok(!/\.delete\(|isActive: false/.test(service))
  const settings = read('api/src/settings/settings.controller.ts')
  assert.match(settings, /assertCompanyWideWrite\(user\)\n\s+\/\/[^\n]*\n\s+if \(isCategoryChainKey\(dto\.key\)\) throw new BadRequestException/)
  // resolveChain زي ما هو: السلسلة بالـid ونسخة الفرع بنفس الكود
  const requests = read('api/src/requests/requests.service.ts')
  const resolve = requests.slice(requests.indexOf('private async resolveChain('), requests.indexOf('private thresholdMet('))
  assert.ok(resolve.includes('where: { id: type.approvalChainId },') && resolve.includes('code: globalChain.code,') && resolve.includes('branchId: req.branchId,'))
  assert.ok(!/category_chain/.test(resolve))
})
