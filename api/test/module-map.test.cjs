'use strict'
// خريطة الموديولات (B-ADD.21، كلمة المالك 12 أكتوبر 2026: «كل نقطة في النظام في المكان بتاعها، في الموديول بتاعها») — من الكود نفسه، من غير قاعدة ولا خادم:
//  MM-01) كل شاشة تحت src/app تبع موديول اختياري (أو ورا ميزة)، أو مكتوبة بموديولها الأساسي في قايمة «النواة» الصريحة — والقايمة من غير بند قديم.
//  MM-02) كل كنترولر تحت api/src وسمه موديول اختياري، أو مكتوب في «النواة» بموديوله الأساسي؛ وكل مسار له موديول.
//  MM-03) كل مهمة مجدولة تبع موديول اختياري، أو مكتوبة في «النواة»؛ والمؤقّتات اللي برّه المجدول معدودة بالاسم.
//  MM-04) القايمة: كل مسار مرة واحدة بالظبط وبيفتح شاشة موجودة، وكل شاشة ثابتة لها بند أو سبب مكتوب، والتحويلات مش في القايمة، وترتيب المجموعات ثابت.
//  MM-05) بوابات القايمة زي ما هي: صلاحيات كل بند وشرط ظهوره مثبّتين بالاسم (النقل مابيفتحش ولا بيقفل حاجة على حد).
//  MM-06) كل موديول اختياري وكل ميزة: مقفول = بنوده في القايمة مش متاحة (وبنود اللي بيعتمد عليه)، مفتوح = راجعة؛ وبنود غيره زي ما هي.
//  MM-07) القايمة المعروضة: الموظف العادي بياخد المجموعة اللي فيها بند واحد رابط مباشر، والحساب الإداري بيلاقي كل شاشة في مجموعتها مرة واحدة.
//  MM-08) الإعدادات: مجموعات وخانات «سياسات النظام» وكروت الفهرس كل واحدة بموديول مسجّل، وكل كارت في الفهرس له بند في القايمة.
// Run (من api/): node --test test/module-map.test.cjs
const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const lib = require('../scripts/module-map-lib.cjs')
const { CORE_PAGES, CORE_CONTROLLERS, CORE_JOBS, INTERNAL_TIMERS, OFF_MENU_PAGES } = require('./fixtures/module-map-core.cjs')
const { MENU_GATES, ADDED_IN_B_ADD_21 } = require('./fixtures/menu-gates.cjs')
const registry = lib.registry()
const { MODULES, MODULE_KEYS, MODULE_FEATURES } = registry
const optional = key => key !== null && key !== undefined && registry.isModuleKey(key) && !MODULES[key].core
const OPTIONAL = MODULE_KEYS.filter(key => !MODULES[key].core)
const pages = lib.pages(), menu = lib.menu(), controllers = lib.apiControllers(), handlers = lib.apiHandlers(), jobs = lib.jobs(), settings = lib.settings()
const entries = menu.flatMap(group => group.children.map(child => ({ ...child, group: group.label, groupId: group.id })))
const state = (modules = {}, features = {}) => registry.enabledSnapshot({ modules, features })
const allOn = (modules = {}, features = {}) => state({ ...Object.fromEntries(MODULE_KEYS.map(key => [key, true])), ...modules },
  { ...Object.fromEntries(Object.keys(MODULE_FEATURES).map(key => [key, true])), ...features })

test('MM-01: كل شاشة تبع موديول اختياري أو مكتوبة في «النواة» بموديولها', () => {
  assert.ok(pages.length >= 180, `${pages.length} شاشة`)
  const loose = pages.filter(page => !optional(page.module) && !page.feature && !Object.prototype.hasOwnProperty.call(CORE_PAGES, page.route))
    .map(page => `${page.route} (واقعة على ${page.module ?? 'ولا موديول'})`)
  assert.deepEqual(loose, [], `شاشات من غير موديول اختياري ومش في قايمة النواة (سجّل مسارها لموديولها في registry.ts، أو اكتبها في fixtures/module-map-core.cjs بسببها):\n${loose.join('\n')}`)
  const routes = new Map(pages.map(page => [page.route, page]))
  for (const [route, module] of Object.entries(CORE_PAGES)) {
    assert.ok(routes.has(route), `النواة: الشاشة ${route} مابقتش موجودة`)
    assert.ok(MODULES[module]?.core, `النواة: ${route} مكتوبة بموديول مش أساسي «${module}»`)
    assert.deepEqual([routes.get(route).module, routes.get(route).feature], [module, null], `النواة: ${route} موديولها الفعلي غير المكتوب`)
  }
  // وكل شاشة لها صاحب فعلًا (مسار مش مسجّل = من غير حارس موديول خالص)
  assert.deepEqual(pages.filter(page => page.module === null).map(page => page.route), [])
})

test('MM-02: كل كنترولر وسمه موديول اختياري أو مكتوب في «النواة»، وكل مسار له موديول', () => {
  assert.ok(controllers.length >= 118, `${controllers.length} كنترولر`)
  for (const controller of controllers) assert.ok(controller.file, `${controller.name}: ملفه مش تحت api/src`)
  const loose = controllers.filter(controller => !controller.modules.some(optional) && !Object.prototype.hasOwnProperty.call(CORE_CONTROLLERS, controller.name))
    .map(controller => `${controller.name} (${controller.file}) [${controller.modules.join(' + ') || 'من غير وسم'}]`)
  assert.deepEqual(loose, [], `كنترولرز من غير موديول اختياري ومش في قايمة النواة:\n${loose.join('\n')}`)
  const byName = new Map(controllers.map(controller => [controller.name, controller]))
  for (const [name, module] of Object.entries(CORE_CONTROLLERS)) {
    assert.ok(byName.has(name), `النواة: الكنترولر ${name} مابقاش موجود`)
    assert.deepEqual(byName.get(name).modules, module === null ? [] : [module], `النواة: ${name} وسمه الفعلي غير المكتوب`)
    if (module !== null) assert.ok(MODULES[module].core, `النواة: ${name} مكتوب بموديول مش أساسي`)
  }
  // مسار من غير موديول = مفتوح والموديول مقفول
  assert.deepEqual(handlers.filter(handler => handler.modules.length === 0).map(handler => handler.id), [])
  // وكل موديول اختياري له مسارات في الخادم (غير المصروفات: ميزتها «تقارير المصروفات» هي اللي لها مسارات)
  const used = new Set(handlers.flatMap(handler => [...handler.modules, ...Object.values(handler.byParam?.map ?? {})]))
  for (const key of OPTIONAL) assert.ok(used.has(key), `الموديول ${key} مالوش ولا مسار في الخادم`)
})

test('MM-03: كل مهمة مجدولة تبع موديول اختياري أو مكتوبة في «النواة»، والمؤقّتات اللي برّه المجدول معدودة', () => {
  assert.ok(jobs.list.length >= 18)
  const gates = new Map(jobs.list.map(job => [job.gate ?? job.id, job]))
  const loose = [...gates.values()].filter(job => !optional(job.module) && !Object.prototype.hasOwnProperty.call(CORE_JOBS, job.gate ?? job.id)).map(job => job.id)
  assert.deepEqual(loose, [], `مهام مجدولة من غير موديول اختياري ومش في قايمة النواة: ${loose.join(', ')}`)
  for (const [name, module] of Object.entries(CORE_JOBS)) {
    assert.ok(gates.has(name), `النواة: المهمة ${name} مابقتش موجودة`)
    assert.equal(gates.get(name).module, module, `النواة: ${name} موديولها الفعلي غير المكتوب`)
    if (module !== null) assert.ok(MODULES[module].core)
  }
  // كل مهمة في السجل لها موعد، والعكس
  assert.deepEqual([...gates.keys()].filter(name => gates.get(name).gate).sort(), MODULE_KEYS.flatMap(key => MODULES[key].jobs).sort())
  assert.deepEqual(jobs.timers, Object.keys(INTERNAL_TIMERS).sort(), 'مؤقّت جديد برّه المجدول: يا يتحول مهمة مجدولة بموديولها، يا يتكتب في النواة بسببه')
})

test('MM-04: القايمة — كل مسار مرة واحدة وبيفتح شاشة موجودة، وكل شاشة ثابتة لها بند أو سبب، والترتيب ثابت', () => {
  const hrefs = entries.map(entry => entry.href)
  const repeated = hrefs.filter((href, index) => hrefs.indexOf(href) !== index)
  assert.deepEqual(repeated, [], `مسار مكرر في القايمة: ${repeated.join(', ')}`)
  const byRoute = new Map(pages.map(page => [page.route, page]))
  for (const entry of entries) {
    assert.ok(byRoute.has(entry.href), `${entry.group} ← ${entry.label}: المسار ${entry.href} مالوش شاشة`)
    assert.equal(byRoute.get(entry.href).redirect, null, `${entry.href}: بند في القايمة بيفتح تحويل`)
    assert.ok(!Object.prototype.hasOwnProperty.call(OFF_MENU_PAGES, entry.href), `${entry.href}: في القايمة ومكتوب «من غير بند»`)
  }
  // كل شاشة ثابتة: بند واحد في القايمة، أو سبب مكتوب
  const homeless = pages.filter(page => !page.dynamic && !page.menu && !Object.prototype.hasOwnProperty.call(OFF_MENU_PAGES, page.route)).map(page => page.route)
  assert.deepEqual(homeless, [], `شاشات من غير بند في القايمة ومن غير سبب مكتوب في fixtures/module-map-core.cjs: ${homeless.join(', ')}`)
  for (const route of Object.keys(OFF_MENU_PAGES)) assert.ok(byRoute.has(route), `«من غير بند»: ${route} مابقتش موجودة`)
  // كل تحويل مكتوب إنه تحويل
  for (const page of pages.filter(item => item.redirect && !item.dynamic)) assert.match(OFF_MENU_PAGES[page.route] ?? '', /^تحويل/, page.route)
  // الترتيب الثابت للمجموعات، وأسماء من غير تكرار، ومفيش مجموعة فاضية
  assert.deepEqual(menu.map(group => group.id), ['dashboard', 'account', 'requests', 'tasks', 'employees', 'documents', 'attendance', 'timesheets', 'leaves', 'payroll', 'money',
    'custody', 'performance', 'recruitment', 'training', 'communication', 'services', 'reports', 'company', 'settings', 'access'])
  assert.equal(new Set(menu.map(group => group.label)).size, menu.length)
  for (const group of menu) assert.ok(group.children.length > 0, group.label)
  assert.equal(menu[0].children.length, 1, 'الرئيسية رابط واحد')
  // بنود الموظف نفسه (من غير صلاحية) قبل شاشات الإدارة جوه كل مجموعة — غير «الموظفين» (ماشية بدورة حياة الموظف) و«خدمات الموظفين» (كل خدمة ببندها وإدارتها جنب بعض)
  for (const group of menu.filter(item => !['employees', 'services'].includes(item.id))) {
    const firstAdmin = group.children.findIndex(child => child.perm.length > 0)
    if (firstAdmin >= 0) assert.ok(group.children.slice(firstAdmin).every(child => child.perm.length > 0), `${group.label}: بند موظف بعد بنود الإدارة`)
  }
})

test('MM-05: بوابات القايمة زي ما هي — صلاحيات كل بند وشرط ظهوره مثبّتين بالاسم', () => {
  const { ALL_PERMISSIONS } = require('../src/auth/permissions')
  const actual = Object.fromEntries(entries.map(entry => { const perm = [...entry.perm].sort().join(' + '); return [entry.href, entry.when ? { perm, when: entry.when } : perm] }))
  assert.deepEqual(actual, MENU_GATES)
  for (const entry of entries) for (const perm of entry.perm) assert.ok(ALL_PERMISSIONS.includes(perm), `${entry.href}: صلاحية مش في السجل «${perm}»`)
  // البنود الجديدة: شاشات إعدادات قايمة بصلاحية كارتها في فهرس «الإعدادات العامة» بالظبط
  for (const href of ADDED_IN_B_ADD_21) {
    assert.equal(MENU_GATES[href], 'settings.manage', href)
    assert.equal(settings.cards.find(card => card.href === href)?.perm, 'settings.manage', href)
  }
  // وشروط الظهور المحسوبة في مكانها في المصدر (القيمة نفسها من غير تغيير)
  const source = require('node:fs').readFileSync(require('node:path').join(lib.root, 'src/components/layout/Sidebar.tsx'), 'utf8').replace(/\r\n/g, '\n')
  for (const text of ["const showInbox = currentUser.role !== 'employee' || inboxCount > 0 || inboxError || delegationEntry\n", 'inbox: showInbox,', 'payrollApprovals: payrollApprovals > 0,',
    'team: teamManager,', 'raises: raisesOpen,', "probation: teamManager || can('employees.view'),",
    "const permitted = (perm?: string | string[]) => !perm || (Array.isArray(perm) ? perm : [perm]).every((key) => can(key))",
    'group.children.filter((c) => permitted(c.perm) && (!c.when || flags[c.when]) && available(c.href))']) assert.ok(source.includes(text), text)
})

test('MM-06: كل موديول اختياري وكل ميزة — مقفول = بنوده مش متاحة، مفتوح = راجعة، وبنود غيره زي ما هي', () => {
  const everything = allOn()
  for (const entry of entries) assert.equal(registry.routeAvailable(entry.href, everything), true, `${entry.href} والكل مفتوح`)
  const dependentsOf = key => MODULE_KEYS.filter(other => !registry.moduleEnabled({ modules: { ...Object.fromEntries(MODULE_KEYS.map(item => [item, true])), [key]: false }, features: {} }, other))
  let ownedByOptional = 0
  for (const key of OPTIONAL) {
    const off = allOn({ [key]: false }), closed = dependentsOf(key)
    assert.ok(closed.includes(key))
    for (const entry of entries) {
      const owner = registry.routeOwner(entry.href)
      const needs = [owner.module, ...registry.ROUTE_ALSO_REQUIRES.filter(extra => extra.route === entry.href).flatMap(extra => extra.modules)]
      const expected = !needs.some(module => closed.includes(module))
      assert.equal(registry.routeAvailable(entry.href, off), expected, `${key} مقفول: ${entry.group} ← ${entry.label} (${entry.href})`)
      if (owner.module === key) ownedByOptional += 1
    }
  }
  assert.ok(ownedByOptional >= 80, `${ownedByOptional} بند تبع موديول اختياري`)
  // موديول اختياري له شاشات = له بند في القايمة (الشاشة اللي مالهاش بند بتتفتح من شاشة تانية أو من غير دخول)
  for (const key of OPTIONAL) {
    const own = pages.filter(page => page.module === key && !page.dynamic && !OFF_MENU_PAGES[page.route])
    if (own.length) assert.ok(entries.some(entry => registry.routeOwner(entry.href).module === key), `${key}: له شاشات ومالوش بند في القايمة`)
  }
  // الميزة الفرعية اللي لها مسارات: مقفولة = بنودها بس مش متاحة
  for (const [feature, def] of Object.entries(MODULE_FEATURES).filter(([, item]) => (item.routes ?? []).length)) {
    const off = allOn({}, { [feature]: false })
    for (const entry of entries) assert.equal(registry.routeAvailable(entry.href, off), registry.routeOwner(entry.href).feature !== feature, `${feature} مقفولة: ${entry.href}`)
    assert.ok(def.routes.every(route => !registry.routeAvailable(route, off)), feature)
  }
  // افتراضي السجل (شركة جديدة): بنود الموديولات المقفولة افتراضيًا مش متاحة
  const byDefault = state()
  for (const entry of entries) {
    const owner = registry.routeOwner(entry.href)
    if (owner.feature) assert.equal(registry.routeAvailable(entry.href, byDefault), false, `${entry.href}: ميزة مقفولة افتراضيًا`)
    else assert.equal(registry.routeAvailable(entry.href, byDefault), registry.moduleEnabled({ modules: {}, features: {} }, owner.module), entry.href)
  }
})

// ===== القايمة المعروضة فعلًا (React SSR) =====
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const modules = require('../../src/lib/modules')
const Sidebar = require('../../src/components/layout/Sidebar').default
const markOf = user => `mark-of-user-${user.id}-0123456789abcdef`
function render(user, enabled) {
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  localStorage.setItem('hr_session_mark', markOf(user)); localStorage.setItem('hr_current_user', JSON.stringify(user))
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: `${user.id}:${markOf(user)}`, enabled }))
  const html = renderToStaticMarkup(React.createElement(Sidebar, { open: false }))
  // البنود العليا بترتيبها: رابط مباشر (a) أو مجموعة (button aria-expanded)
  const top = [...html.slice(html.indexOf('<nav'), html.indexOf('</nav>')).matchAll(/<a[^>]*href="([^"]+)"[^>]*class="sidebar-item[^"]*"[^>]*>.*?<span class="font-medium">([^<]+)<\/span>|<button type="button" aria-expanded="(?:true|false)"[^>]*>.*?<span class="font-medium">([^<]+)<\/span>/g)]
    .map(match => match[1] ? { href: match[1], label: match[2] } : { group: match[3] })
  return { html, top, links: [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => match[1]) }
}
afterEach(() => { modules.invalidateModules(); localStorage.clear(); sessionStorage.clear() })

test('MM-07: القايمة المعروضة — الموظف بياخد البند الوحيد رابط مباشر، والحساب الإداري كل شاشة في مجموعتها', () => {
  const employee = { id: 8, email: 'e@x.test', displayName: 'موظف', role: 'employee', branchId: 1, employeeId: 21, permissions: [] }
  const admin = { id: 7, email: 'admin@x.test', displayName: 'مدير النظام', role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'] }
  // موظف عادي بافتراضي السجل: مجموعة فيها بند واحد = رابط مباشر باسمه، بنفس ترتيب المجموعات
  let view = render(employee, state())
  assert.deepEqual(view.top, [
    { href: '/', label: 'لوحتي' }, { group: 'حسابي' }, { href: '/requests', label: 'طلباتي' }, { href: '/my/tasks', label: 'مهامي' }, { group: 'المستندات والسياسات' },
    { href: '/my/attendance', label: 'حضوري' }, { href: '/my/leaves', label: 'إجازاتي وأرصدتي' }, { href: '/my/payslips', label: 'قسائم راتبي' },
    { group: 'السلف والمكافآت والخصومات' }, { href: '/my/custody', label: 'عهدي' }, { group: 'التوظيف' }])
  // ومفيش بند إداري ولا بند موديول مقفول
  for (const href of view.links.filter(href => href.startsWith('/') && !['/profile/security', '/login/change-password'].includes(href))) {
    assert.equal(MENU_GATES[href], '', `${href}: بند بصلاحية ظاهر للموظف`)
  }
  // الرواتب والسلف مقفولين: مجموعة «السلف والمكافآت والخصومات» اختفت كلها، و«قسائم راتبي» كمان
  view = render(employee, state({ payroll: false }))
  assert.ok(!view.top.some(item => item.group === 'السلف والمكافآت والخصومات' || item.href === '/my/payslips'))
  // مدير النظام والكل مفتوح: كل المجموعات بترتيبها (غير «الرئيسية» اللي بتتعرض رابط «لوحة التحكم»)، ومفيش رابط مباشر غيرها
  view = render(admin, allOn())
  assert.deepEqual(view.top, [{ href: '/', label: 'لوحة التحكم' }, ...menu.slice(1).map(group => ({ group: group.label }))])
  // مدير النظام بافتراضي السجل: المجموعات اللي كل موديولاتها مقفولة افتراضيًا مش ظاهرة
  view = render(admin, state())
  const groups = view.top.map(item => item.group).filter(Boolean)
  for (const label of ['التواصل', 'خدمات الموظفين', 'ساعات المشاريع', 'الأداء والمهارات', 'التدريب والتطوير']) assert.ok(!groups.includes(label), `${label}: موديولاتها مقفولة افتراضيًا`)
  for (const label of ['حسابي', 'الطلبات', 'المهام', 'الموظفين', 'المستندات والسياسات', 'الحضور والانصراف', 'الإجازات والأذونات', 'الرواتب', 'السلف والمكافآت والخصومات', 'العهد والأصول',
    'التوظيف', 'التقارير', 'الشركة والهيكل', 'الإعدادات', 'المستخدمين والصلاحيات']) assert.ok(groups.includes(label), label)
  // موظف مالية بصلاحية الصرف بس: «صرف الرواتب» جنب «قسائم راتبي» في مجموعة الرواتب (من غير باقي شاشاتها)
  const disburser = { ...employee, id: 9, role: 'payroll_disburser', permissions: ['payroll.disburse'] }
  view = render(disburser, state())
  assert.ok(view.top.some(item => item.group === 'الرواتب'))
  // (المجموعة المفتوحة محفوظة في المتصفح: بنودها بتترسم)
  localStorage.setItem('hr_sidebar_open_group', 'payroll')
  const open = renderToStaticMarkup(React.createElement(Sidebar, { open: false }))
  const payroll = [...open.matchAll(/<a[^>]*href="(\/(?:payroll|my\/payslips)[^"]*)"/g)].map(match => match[1])
  assert.deepEqual(payroll, ['/my/payslips', '/payroll/disbursement'])
})

test('MM-08: الإعدادات — مجموعات وخانات «سياسات النظام» وكروت الفهرس بموديول مسجّل، وكل كارت له بند في القايمة', () => {
  assert.ok(settings.groups.length >= 11)
  for (const group of settings.groups) {
    if (group.module) assert.ok(optional(group.module), `${group.title}: موديول المجموعة «${group.module}»`)
    for (const field of group.fields) if (field.module) assert.ok(optional(field.module), `${field.key}: موديول الخانة «${field.module}»`)
  }
  const field = key => settings.groups.flatMap(group => group.fields.map(item => ({ ...item, module: item.module ?? group.module }))).find(item => item.key === key)
  // خانة إعداد موديول اختياري بتختفي معاه (مثال من كل موديول)؛ وإعدادات الأساس (العملة، العطلة الأسبوعية، فترة المسير) مالهاش موديول
  for (const [key, module] of [['leave.annual_entitled', 'leave'], ['attendance.grace_minutes', 'attendance'], ['attendance.device_key', 'attendance'], ['payroll.shortfall_enabled', 'payroll'],
    ['loan.request_open', 'loans'], ['payroll.policy.min_net_guarantee', 'payroll'], ['eos.months_per_year', 'offboarding'], ['settlement.collect_pending_obligations', 'offboarding'],
    ['compensation.band_basis', 'compensation'], ['overtime.multiplier_weekday', 'overtime'], ['overtime.auto_approve.exclude_manual', 'overtime'], ['performance.self_review', 'performance'],
    ['system.currency', null], ['attendance.weekend_days', null], ['payroll.cycle_start_day', null], ['auth.two_factor_enabled', null], ['tasks.reminder_days_before', null]]) {
    assert.equal(field(key)?.module ?? null, module, key)
  }
  // بلوكين جوه الشاشة كل واحد بموديوله
  assert.deepEqual(settings.blocks, [{ name: 'LoanAdvanceCapBlock', module: 'loans' }, { name: 'TerminationReasonsBlock', module: 'offboarding' }])
  const source = require('node:fs').readFileSync(require('node:path').join(lib.root, 'src/app/settings/policies/page.tsx'), 'utf8')
  assert.ok(source.includes('const fields = g.fields.filter((f) => known.has(f.key) && (!f.module || moduleOn(f.module)))'))
  assert.ok(source.includes('if (g.module && !moduleOn(g.module)) return null'))
  // فهرس «الإعدادات العامة»: كل كارت مساره له شاشة وبند في القايمة بنفس الصلاحية، والكارت بيتفلتر بموديول شاشته
  assert.ok(settings.cards.length >= 29)
  for (const card of settings.cards) {
    assert.ok(pages.some(page => page.route === card.href), `${card.title}: ${card.href} مالوش شاشة`)
    const entry = entries.find(item => item.href === card.href)
    assert.ok(entry, `${card.title}: مالوش بند في القايمة`)
    assert.ok(entry.perm.includes(card.perm), `${card.title}: صلاحية الكارت ${card.perm} مش في بوابة بنده`)
  }
  // شاشتين تحت /settings ومساراتهم في الخادم تبع الرواتب: بيتقفلوا معاها
  for (const href of ['/settings/salary-items', '/settings/banks']) {
    assert.equal(registry.routeOwner(href).module, 'payroll', href)
    assert.equal(registry.routeAvailable(href, state({ payroll: false })), false, href)
  }
  for (const [name, module] of [['SalaryItemsController', 'payroll'], ['BanksController', 'payroll'], ['NotificationChannelsController', 'notifications'], ['SetupImportController', 'employees']]) {
    assert.deepEqual(controllers.find(controller => controller.name === name).modules, [module], name)
  }
  assert.deepEqual([registry.routeOwner('/settings/notification-channels').module, registry.routeOwner('/settings/import').module], ['notifications', 'employees'])
})
