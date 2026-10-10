'use strict'
// نظام الموديولات في الواجهة (خطة التنفيذ B0.2–B0.4) — منطق الواجهة وReact SSR بس؛ لا SQL ولا خدمة:
//  MU-01) كل شاشة في src/app لها صاحب: موديول مسجّل أو ميزة شاشات العرض — فمفيش شاشة جديدة تنزل برّه نظام الموديولات،
//         وكل مسار في السجل وكل شاشة عرض لها صفحة فعلًا.
//  MU-02) القايمة الجانبية من السجل: البند يظهر لو موديول مساره مفعّل — الشاشات الوهمية ورا ميزتها، والموديول المقفول بنوده مختفية،
//         والمجموعة اللي بنودها كلها اتقفلت بتختفي.
//  MU-03) src/lib/modules.ts: قراءة واحدة للجلسة بكاش مربوط بالجلسة، والخروج بيمسحه، وفشل الخادم = افتراضي السجل من غير تخزين،
//         وinvalidateModules بيقرا من جديد.
//  MU-04) حارس المسارات: «الصفحة دي مش متاحة» للموديول المقفول قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري.
//  MU-05) <ModuleGate>: الجزء بيختفي لو الموديول أو الميزة مقفولين، والبديل بيتعرض.
//  MU-06) شاشة «الإعدادات ← الموديولات»: في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة قبل التطبيق.
//  MU-07) الحالة بتتجدد من غير دخول جديد: المخزّن القديم بيتعرض فورًا والجديد بيتقري في الخلفية، ومسار رجّع «مش موجود» بيجدّد (بحد أدنى بين التجديدين).
//  MU-08) شاشات الأساس مع موديول مقفول (B0.4): اللينك لشاشته مابيتعرضش، والجزء بتاعه مابيتطلبش ولا بيوقّع الشاشة.
// Run: node --test api/test/modules-ui.test.cjs
const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

// جلسة متصفح مصغرة: التوكن والمستخدم في localStorage، وكاش الموديولات في sessionStorage
function storage() {
  const values = new Map()
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() }
}
global.window = { location: { pathname: '/', href: '/' }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
global.localStorage = storage()
global.sessionStorage = storage()

const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
let pathname = '/'
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'next/link') return ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children)
  if (request === 'next/navigation') return { usePathname: () => pathname }
  return originalLoad.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const registry = require('../src/modules-registry/registry')
const modules = require('../../src/lib/modules')
const api = require('../../src/lib/api')
const Sidebar = require('../../src/components/layout/Sidebar').default
const ModuleGate = require('../../src/components/ModuleGate').default

const admin = { id: 7, email: 'admin@x.test', displayName: 'مدير النظام', role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'] }
const employee = { id: 8, email: 'e@x.test', displayName: 'موظف', role: 'employee', branchId: 1, employeeId: 21, permissions: [] }
// B2.17: علامة الجلسة (مش توكن) هي اللي في التخزين
const markOf = user => `mark-of-user-${user.id}-0123456789abcdef`
const sessionOf = user => `${user.id}:${markOf(user)}`
function signIn(user, enabled) {
  localStorage.setItem('hr_session_mark', markOf(user)); localStorage.setItem('hr_current_user', JSON.stringify(user))
  if (enabled) sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(user), enabled }))
}
const state = (moduleRows = {}, featureRows = {}) => registry.enabledSnapshot({ modules: moduleRows, features: featureRows })
const DEMO_ON = { [registry.DEMO_SCREENS_FEATURE]: true }
async function fetched(responder, fn) {
  const original = global.fetch, calls = []
  global.fetch = async (url, options) => { calls.push(String(url)); return responder(String(url), options) }
  try { return await fn(calls) } finally { global.fetch = original }
}
const json = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body) })
afterEach(() => { modules.invalidateModules(); localStorage.clear(); sessionStorage.clear(); pathname = '/' })

// كل صفحات الواجهة من src/app (الجزء الديناميكي [id] = رقم)
const pages = (() => {
  const out = []
  const walk = (dir, route) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!entry.name.startsWith('_')) walk(path.join(dir, entry.name), `${route}/${entry.name.replace(/^\[.*\]$/, '5')}`) }
    else if (entry.name === 'page.tsx') out.push(route || '/')
  } }
  walk(path.join(root, 'src', 'app'), '')
  return out.sort()
})()

test('MU-01: كل شاشة لها صاحب (موديول أو ميزة شاشات العرض)، وكل مسار في السجل له صفحة', () => {
  assert.ok(pages.length >= 116, `${pages.length} صفحة`)
  const owners = Object.fromEntries(pages.map(route => [route, registry.routeOwner(route)]))
  const unowned = pages.filter(route => owners[route].module === null && owners[route].feature === null)
  assert.deepEqual(unowned, [], `شاشات من غير صاحب في سجل الموديولات: ${unowned.join(', ')}`)
  // الشاشات الوهمية بالظبط — أي شاشة ببيانات عرض جديدة لازم تتسجّل، وأي شاشة حقيقية ماتتحسبش وهمية
  assert.deepEqual(pages.filter(route => owners[route].feature === registry.DEMO_SCREENS_FEATURE), [
    '/performance/new',
    // B3.9-ب: شاشات التدريب بقت حقيقية تبع موديولها
    '/recruitment/5', '/recruitment/add', '/reports/custom'])
  // أمثلة من كل موديول (المطابقة الكاملة في modules-registry.test.cjs)
  for (const [route, module] of [['/', 'platform'], ['/settings/modules', 'platform'], ['/employees/5', 'employees'], ['/employees/5/terminate', 'offboarding'],
    ['/my/payslips', 'payroll'], ['/payroll/payslip/5', 'payroll'], ['/payroll/loans', 'loans'], ['/attendance/overtime', 'overtime'], ['/leaves/holidays', 'platform'],
    ['/recruitment/applicants', 'recruitment'], ['/settings/work-days', 'platform']]) assert.equal(owners[route].module, module, route)
  // كل مسار ثابت في السجل وكل مسار عرض له صفحة (مفيش مسار قديم)
  const exists = pattern => pages.some(route => registry.routeOwner(route) && route.split('/').length >= pattern.split('/').length
    && pattern.split('/').every((part, index) => part === '*' || part === route.split('/')[index]))
  for (const key of registry.MODULE_KEYS) for (const pattern of registry.MODULES[key].routes) assert.ok(exists(pattern), `${key}: المسار ${pattern} مالوش صفحة`)
  for (const pattern of registry.DEMO_ROUTES) assert.ok(exists(pattern), `مسار العرض ${pattern} مالوش صفحة`)
})

test('MU-02: القايمة الجانبية من السجل — الوهمي ورا ميزته، وبنود الموديول المقفول مختفية', () => {
  const menu = (user, enabled) => {
    signIn(user, enabled)
    const html = renderToStaticMarkup(React.createElement(Sidebar, { open: false }))
    return { html, links: [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => match[1]), has: label => html.includes(`>${label}<`) }
  }
  // مدير النظام بافتراضي السجل (شاشات العرض مقفولة): كل الحقيقي ظاهر، والوهمي مختفي — المجموعات مقفولة فبنشوف عناوينها
  let view = menu(admin, state())
  for (const label of ['إدارة الموظفين', 'الحضور والانصراف', 'الإجازات', 'الرواتب', 'التوظيف', 'التقارير', 'الإعدادات', 'إنهاء الخدمة', 'صرف الرواتب']) assert.ok(view.has(label), label)
  for (const label of ['إدارة الأداء', 'التدريب والتطوير']) assert.ok(!view.has(label), `${label}: موديولها مقفول افتراضيًا`)
  for (const href of ['/', '/requests', '/my/attendance', '/my/leaves', '/my/payslips', '/my/loans', '/my/custody', '/my/documents', '/profile', '/notifications', '/calendar', '/offboarding']) {
    assert.ok(view.links.includes(href), href)
  }
  // شاشات العرض مفتوحة: مجموعتا الأداء والتدريب بيرجعوا
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(admin, state({}, DEMO_ON))
  assert.ok(view.has('التوظيف'))
  // B3.9-ب: مجموعة «التدريب والتطوير» بقت شاشات حقيقية: بتظهر بموديولها (المقفول افتراضيًا)، مش بميزة شاشات العرض
  assert.ok(!view.has('التدريب والتطوير'), 'التدريب مقفول: ميزة العرض مابتفتحهوش')
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  assert.ok(menu(admin, state({ training: true })).has('التدريب والتطوير'), 'التدريب مفتوح')
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(admin, state({}, DEMO_ON))
  // B3.7: مجموعة «إدارة الأداء» بقت شاشات حقيقية: بتظهر بموديولها (المقفول افتراضيًا)، مش بميزة شاشات العرض
  assert.ok(!view.has('إدارة الأداء'), 'الأداء مقفول: ميزة العرض مابتفتحهوش')
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  assert.ok(menu(admin, state({ performance: true })).has('إدارة الأداء'), 'الأداء مفتوح')
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()

  // موظف عادي والرواتب (ومعاها السلف) والعهد مقفولين: بنودهم مختفية من بوابته، والباقي زي ما هو
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(employee, state({ payroll: false, custody: false }))
  for (const href of ['/my/payslips', '/my/loans', '/my/deductions', '/my/bonuses', '/my/custody']) assert.ok(!view.links.includes(href), `${href} مقفول`)
  for (const href of ['/', '/requests', '/my/attendance', '/my/leaves', '/my/documents', '/profile', '/notifications', '/calendar']) assert.ok(view.links.includes(href), href)
  // الحضور مقفول: «حضوري» بيختفي والإجازات باقية
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(employee, state({ attendance: false }))
  assert.ok(!view.links.includes('/my/attendance')); assert.ok(view.links.includes('/my/leaves'))

  // مدير النظام والرواتب والتوظيف وإنهاء الخدمة مقفولين: مجموعاتهم وبنودهم المنفردة مختفية
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(admin, state({ payroll: false, recruitment: false, offboarding: false }, DEMO_ON))
  for (const label of ['الرواتب', 'التوظيف', 'إنهاء الخدمة', 'صرف الرواتب']) assert.ok(!view.has(label), `${label} مقفول`)
  for (const label of ['إدارة الموظفين', 'الحضور والانصراف', 'الإجازات', 'التقارير', 'الإعدادات']) assert.ok(view.has(label), label)

  // من غير حالة مقروءة (أول رسم): افتراضي السجل — القايمة ماتفضاش
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  view = menu(admin, null)
  assert.ok(view.has('الرواتب') && view.has('الحضور والانصراف') && !view.has('إدارة الأداء'))

  // بنود المجموعة نفسها من السجل (المصدر): الفلترة بمسار البند، والبوابة كمان
  const source = read('src/components/layout/Sidebar.tsx')
  assert.match(source, /const available = \(href\?: string\) => !href \|\| routeAvailable\(href, enabledModules\)/)
  assert.match(source, /item\.children\.filter\(\(c\) => \(!c\.perm \|\| can\(c\.perm\)\) && available\(c\.href\)\)/)
  assert.match(source, /portalItems\.filter\(\(item\) => available\(item\.href\)\)/)
  assert.match(source, /const enabledModules = useModules\(\) \?\? DEFAULT_MODULES/)
  // بنود مجموعة التوظيف والتقارير: الوهمي منها بيتشال لوحده
  const visible = (enabled, hrefs) => hrefs.filter(href => registry.routeAvailable(href, enabled))
  const recruitment = ['/recruitment', '/recruitment/jobs', '/recruitment/applicants', '/recruitment/interviews', '/recruitment/offers', '/recruitment/metrics', '/recruitment/add']
  assert.deepEqual(visible(state(), recruitment), ['/recruitment', '/recruitment/jobs', '/recruitment/applicants', '/recruitment/interviews', '/recruitment/offers', '/recruitment/metrics'])
  assert.deepEqual(visible(state({ recruitment: false }, DEMO_ON), recruitment), [], 'موديول التوظيف مقفول = ولا بند')
  assert.deepEqual(visible(state({}, DEMO_ON), recruitment), recruitment)
  assert.deepEqual(visible(state(), ['/reports', '/reports/custom', '/reports/cost-centers']), ['/reports', '/reports/cost-centers'])
  assert.deepEqual(visible(state({ payroll: false }), ['/reports', '/reports/custom', '/reports/cost-centers']), ['/reports'])
  const attendance = ['/attendance', '/attendance/weekly-schedule', '/attendance/shifts', '/attendance/permissions', '/attendance/exemptions', '/attendance/overtime',
    '/attendance/holiday-work', '/attendance/manual-entry', '/attendance/devices', '/attendance/monthly-sheet', '/attendance/reports']
  assert.deepEqual(visible(state({ shifts: false, overtime: false }), attendance), ['/attendance', '/attendance/permissions', '/attendance/exemptions', '/attendance/manual-entry',
    '/attendance/devices', '/attendance/monthly-sheet', '/attendance/reports'])
  assert.deepEqual(visible(state({ attendance: false }), attendance), ['/attendance/permissions'])
})

test('MU-03: modules.ts — قراءة واحدة للجلسة بكاش مربوط بيها، وفشل الخادم افتراضي السجل، والمسح بيقرا من جديد', async () => {
  const source = read('src/lib/modules.ts')
  assert.match(source, /apiFetch<EnabledModules>\('\/modules\/enabled'\)/)
  assert.match(source, /from '\.\.\/\.\.\/api\/src\/modules-registry\/registry'/, 'نفس سجل الخادم بالحرف')
  assert.deepEqual(modules.DEFAULT_MODULES, state())
  // من غير جلسة: افتراضي السجل من غير نداء
  await fetched(() => { throw new Error('مفيش نداء من غير جلسة') }, async calls => {
    assert.deepEqual(await modules.loadModules(), modules.DEFAULT_MODULES); assert.equal(calls.length, 0)
  })
  // جلسة: نداء واحد حتى مع قراءتين متزامنتين، وبعده من الكاش
  signIn(employee)
  const mine = { modules: ['platform', 'employees', 'leave'], features: [] }
  await fetched(() => json(mine), async calls => {
    const [first, second] = await Promise.all([modules.loadModules(), modules.loadModules()])
    assert.deepEqual(first, mine); assert.deepEqual(second, mine)
    assert.deepEqual(await modules.loadModules(), mine)
    assert.equal(calls.length, 1); assert.match(calls[0], /\/modules\/enabled$/)
  })
  const storedCache = JSON.parse(sessionStorage.getItem('hr_enabled_modules'))
  assert.deepEqual([storedCache.session, storedCache.enabled], [sessionOf(employee), mine])
  assert.ok(Math.abs(Date.now() - storedCache.at) < 60_000, 'وقت القراءة متسجّل مع الكاش')
  // حساب تاني في نفس التبويب مايورثش كاش اللي قبله
  signIn(admin)
  const all = state({}, DEMO_ON)
  await fetched(() => json(all), async calls => { assert.deepEqual(await modules.loadModules(), all); assert.equal(calls.length, 1) })
  // الخروج بيمسح الكاش المخزّن
  api.clearSession()
  assert.equal(sessionStorage.getItem('hr_enabled_modules'), null)
  // بعد تغيير من شاشة الموديولات: المسح بيقرا من جديد
  signIn(admin)
  await fetched(() => json(all), async () => { await modules.loadModules() })
  modules.invalidateModules()
  assert.equal(sessionStorage.getItem('hr_enabled_modules'), null)
  const closed = state({ payroll: false })
  await fetched(() => json(closed), async calls => { assert.deepEqual(await modules.loadModules(), closed); assert.equal(calls.length, 1) })
  // الخادم ماردّش أو رد بشكل غلط: افتراضي السجل، ومن غير تخزين — المحاولة الجاية بتنادي تاني
  modules.invalidateModules()
  for (const responder of [() => { throw new TypeError('Failed to fetch') }, () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '{}' }), () => json({ modules: 'x' })]) {
    await fetched(responder, async calls => { assert.deepEqual(await modules.loadModules(), modules.DEFAULT_MODULES); assert.equal(calls.length, 1) })
    assert.equal(sessionStorage.getItem('hr_enabled_modules'), null)
  }
  // حساب بكلمة مرور مؤقتة: مالوش جلسة هنا (الخادم قافل عليه كل حاجة) فمفيش نداء
  signIn({ ...employee, mustChangePassword: true })
  await fetched(() => { throw new Error('مفيش نداء') }, async calls => { assert.deepEqual(await modules.loadModules(), modules.DEFAULT_MODULES); assert.equal(calls.length, 0) })
})

test('MU-04: حارس المسارات — «الصفحة دي مش متاحة» قبل فحص الصلاحية، والإطار مابيتعرضش قبل ما الحالة تتقري', () => {
  const layout = read('src/components/layout/MainLayout.tsx')
  assert.match(layout, /import \{ routeAvailable, useModules \} from '@\/lib\/modules'/)
  assert.match(layout, /const modules = useModules\(\)/)
  assert.match(layout, /if \(!authed \|\| !modules\) \{/)
  assert.match(layout, /const available = routeAvailable\(pathname, modules\)/)
  assert.ok(layout.indexOf('{!available ? (') < layout.indexOf(') : allowed ? ('), 'الموديول المقفول قبل الصلاحية')
  assert.ok(layout.includes('الصفحة دي مش متاحة'))
  assert.ok(layout.includes("['/settings/modules', 'settings.modules'],"))
  assert.ok(layout.indexOf("['/settings/modules', 'settings.modules']") < layout.indexOf("['/settings', 'settings.manage']"), 'الأكثر تحديدًا الأول')
  // نفس القرار اللي الحارس بياخده، بالدوال نفسها
  const basic = state(), noPayroll = state({ payroll: false })
  for (const route of ['/payroll', '/payroll/payslip/9', '/my/payslips', '/payroll/loans', '/my/loans', '/reports/payroll-register', '/reports/loans']) {
    assert.equal(registry.routeAvailable(route, basic), true, route); assert.equal(registry.routeAvailable(route, noPayroll), false, route)
  }
  for (const route of ['/', '/employees/9', '/requests', '/settings', '/reports', '/leaves']) assert.equal(registry.routeAvailable(route, noPayroll), true, route)
  for (const route of ['/performance', '/training/add', '/recruitment/add', '/reports/custom']) assert.equal(registry.routeAvailable(route, basic), false, route)
})

test('MU-05: <ModuleGate> — الجزء بيختفي لو الموديول أو الميزة مقفولين', () => {
  const render = props => renderToStaticMarkup(React.createElement(ModuleGate, props, React.createElement('p', null, 'تاب العهد')))
  signIn(admin, state({ custody: false }))
  assert.equal(render({ module: 'custody' }), '')
  assert.equal(render({ module: 'custody', fallback: React.createElement('i', null, 'مش مفعّل') }), '<i>مش مفعّل</i>')
  assert.equal(render({ module: 'leave' }), '<p>تاب العهد</p>')
  assert.equal(render({ feature: registry.DEMO_SCREENS_FEATURE }), '')
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  signIn(admin, state({}, DEMO_ON))
  assert.equal(render({ module: 'custody', feature: registry.DEMO_SCREENS_FEATURE }), '<p>تاب العهد</p>')
  // لسه بيتقري: ولا الجزء ولا البديل (مفيش وميض)
  modules.invalidateModules(); localStorage.clear(); sessionStorage.clear()
  signIn(admin, null)
  assert.equal(render({ module: 'leave', fallback: React.createElement('i', null, 'مش مفعّل') }), '')
})

test('MU-06: شاشة «الإعدادات ← الموديولات» — في القايمة بصلاحيتها، وبتأكد القفل بأثره، وبتعرض فرق الباقة', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.ok(sidebar.includes("{ label: 'الموديولات', href: '/settings/modules', perm: 'settings.modules' },"))
  const { pageTitleFor } = require('../../src/components/layout/pageTitles')
  assert.equal(pageTitleFor('/settings/modules'), 'الموديولات')
  const page = read('src/app/settings/modules/page.tsx')
  // القفل: الأثر الأول، والرسالة بتقول إن الطلبات المفتوحة بتكمّل وإن البيانات محفوظة
  assert.match(page, /setClosing\(\{ module, impact: await fetchModuleImpact\(module\.key\) \}\)/)
  assert.ok(page.includes('هيفضلوا يكمّلوا اعتمادهم عادي، بس مفيش طلب جديد هيتقدّم'))
  assert.ok(page.includes('البيانات كلها بتفضل محفوظة'))
  // ملاحظات الأثر الخاصة بالموديول، وتغيير الجمهور بيتكتب «غيّر جمهور» مش «فعّل»، وتنبيه إن اللي برّه الجمهور مش هيعتمد
  assert.ok(page.includes('{(closing.impact.notes ?? []).map((note) => ('))
  assert.match(page, /event\.kind === 'module' && event\.enabled === null \? `غيّر جمهور/)
  assert.ok(page.includes('اللي برّه الاختيار مش هيقدر يعتمد ولا يأكد حاجة في الموديول ده كمان'))
  // الباقة: الفرق قبل التطبيق
  assert.match(page, /setPreset\(await fetchPresetDiff\(key\)\)/)
  assert.ok(page.includes('هيتفتح') && page.includes('هيتقفل') && page.includes('طبّق الباقة'))
  // الأساسي مالوش مفتاح قفل، وحساب الفرع للعرض بس
  assert.match(page, /module\.core \? \(/)
  assert.match(page, /useCompanyWideWrite\(\)/)
  assert.match(page, /role="switch"/)
  // بعد أي تغيير القايمة بتقرا الحالة الجديدة
  const lib = read('src/lib/modules-admin-api.ts')
  assert.match(lib, /const refreshed = <T>\(result: Promise<T>\) => result\.then\(\(value\) => \{ invalidateModules\(\); return value \}\)/)
  for (const call of ['setModuleState', 'setModuleFeature', 'applyModulesPreset']) assert.match(lib, new RegExp(`export const ${call} = [^\\n]*\\n\\s+refreshed\\(`), call)
  // شاشة الأدوار: صلاحيات الموديول المقفول مابتتعرضش وبتفضل محفوظة عند الحفظ
  const roles = read('src/app/settings/roles/page.tsx')
  assert.match(roles, /setRegistry\(reg\.filter\(\(p\) => p\.moduleEnabled\)\)/)
  assert.match(roles, /\.\.\.hiddenKeys\.filter\(\(k\) => form\.permissions\.includes\(k\)\),/)
  assert.match(read('src/app/settings/users/page.tsx'), /setRegistry\(reg\.filter\(\(p\) => p\.moduleEnabled\)\)/)
})

// الوعود اللي في الخلفية (قراءة التجديد) بتخلص قبل الفحص
const settle = async () => { for (let index = 0; index < 20; index++) await new Promise(resolve => setImmediate(resolve)) }
const routeMissing = url => ({ ok: false, status: 404, json: async () => ({ message: 'Cannot GET ' + new URL(url).pathname, error: 'Not Found', statusCode: 404 }) })
const enabledCalls = calls => calls.filter(url => url.endsWith('/modules/enabled')).length

test('MU-07: الحالة بتتجدد من غير دخول جديد — القديم بيتعرض والجديد في الخلفية، ومسار «مش موجود» بيجدّد', async () => {
  signIn(employee)
  const before = state(), after = state({ payroll: false })
  // مخزّن أقدم من 5 دقايق: بيتعرض فورًا، ونداء واحد في الخلفية بيجيب الجديد
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: before, at: Date.now() - 6 * 60_000 }))
  await fetched(() => json(after), async calls => {
    assert.deepEqual(await modules.loadModules(), before)
    await settle()
    assert.equal(calls.length, 1)
    assert.deepEqual(await modules.loadModules(), after)
    await settle()
    assert.equal(calls.length, 1, 'بقى طازة: مفيش نداء تاني')
    assert.deepEqual(JSON.parse(sessionStorage.getItem('hr_enabled_modules')).enabled, after)
  })
  // مخزّن طازة: مفيش نداء خالص
  await fetched(() => { throw new Error('مفيش نداء والكاش طازة') }, async calls => { assert.deepEqual(await modules.loadModules(), after); await settle(); assert.equal(calls.length, 0) })
  // كاش قديم من غير وقت (نسخة قبل التجديد): بيتحسب قديم
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: before }))
  modules.invalidateModules()
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: before }))
  await fetched(() => json(after), async calls => { assert.deepEqual(await modules.loadModules(), before); await settle(); assert.equal(calls.length, 1); assert.deepEqual(await modules.loadModules(), after) })
  // الخادم ماردّش في التجديد: المخزّن يفضل زي ما هو
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: after, at: 0 }))
  modules.invalidateModules()
  sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: after, at: 0 }))
  await fetched(() => { throw new TypeError('Failed to fetch') }, async () => { assert.deepEqual(await modules.loadModules(), after); await settle(); assert.deepEqual(await modules.loadModules(), after) })

  // مسار رجّع 404 بشكل «مسار مش موجود» (رد الموديول المقفول): الحالة بتتجدد في الخلفية مرة واحدة، ونفس الرسالة العربية للمستخدم
  modules.invalidateModules(); sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: before, at: Date.now() }))
  const closed = state({ leave: false })
  await fetched(url => url.endsWith('/modules/enabled') ? json(closed) : routeMissing(url), async calls => {
    await assert.rejects(api.apiFetch('/leaves/types'), /العنصر المطلوب غير موجود/)
    await settle()
    assert.equal(enabledCalls(calls), 1)
    assert.deepEqual(await modules.loadModules(), closed)
    // 404 تاني بعده على طول: مفيش تجديد تاني (صفحة بتنادي مسار غلط ماتعملش سيل نداءات)
    await assert.rejects(api.apiFetch('/leaves/balances/mine'))
    await settle()
    assert.equal(enabledCalls(calls), 1)
  })
  // 404 برسالة عربية (سجل مش موجود) مش رد موديول مقفول: مفيش تجديد
  modules.invalidateModules(); sessionStorage.setItem('hr_enabled_modules', JSON.stringify({ session: sessionOf(employee), enabled: before, at: Date.now() }))
  await fetched(url => ({ ok: false, status: 404, json: async () => ({ message: 'الموظف غير موجود', statusCode: 404 }) }), async calls => {
    await assert.rejects(api.apiFetch('/employees/999'), /الموظف غير موجود/)
    await settle()
    assert.equal(enabledCalls(calls), 0)
  })
  // أول قراءة للجلسة فشلت: الشاشة بتشتغل على افتراضي السجل من غير تخزين، والقراءة الجاية الناجحة بتتخزن
  modules.invalidateModules(); sessionStorage.clear()
  await fetched(() => { throw new TypeError('Failed to fetch') }, async calls => { assert.deepEqual(await modules.loadModules(), modules.DEFAULT_MODULES); assert.equal(calls.length, 1) })
  assert.equal(sessionStorage.getItem('hr_enabled_modules'), null)
  await fetched(() => json(after), async calls => { assert.deepEqual(await modules.loadModules(), after); assert.equal(calls.length, 1) })
  assert.deepEqual(JSON.parse(sessionStorage.getItem('hr_enabled_modules')).enabled, after)
  // مؤقّت إعادة المحاولة بيتلغي مع المسح (مايسيبش نداء معلّق بعد الخروج)
  modules.invalidateModules()
  const source = read('src/lib/modules.ts')
  // …وإعادة المحاولة بتحصل لوحدها، وأول نجاح بعد فشل بيتبلّغ للشاشات المفتوحة (حارس المسارات مايفضلش على الافتراضي)
  assert.match(source, /if \(next !== previous && \(previous \|\| failedOnce\)\) listeners\.forEach\(\(listener\) => listener\(\)\)/)
  assert.match(source, /retryTimer = setTimeout\(\(\) => \{ retryTimer = null; if \(currentSession\(\) === session && !cachedFor\(session\)\) void fetchModules\(session\) \}, RETRY_MS\)/)
  assert.match(source, /if \(retryTimer\) \{ clearTimeout\(retryTimer\); retryTimer = null \}/)
  assert.match(source, /const FRESH_MS = 5 \* 60_000/)
  assert.match(source, /onApiRouteMissing\(\(\) => \{/)
  assert.match(read('src/lib/api.ts'), /if \(isRouteMissing\(res\.status, message\) && !path\.startsWith\('\/modules\/enabled'\)\) routeMissingListener\?\.\(\)/)
})

test('MU-08: شاشات الأساس مع موديول مقفول — اللينك مابيتعرضش، والجزء مابيتطلبش ولا بيوقّع الشاشة', () => {
  const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children))
  const reset = (user, enabled) => { modules.invalidateModules(); localStorage.clear(); sessionStorage.clear(); signIn(user, enabled) }
  const hrefs = html => [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => match[1])

  // <ModuleLink>: لينك لو الشاشة متاحة، ونص من غير لينك (أو البديل) لو موديولها مقفول
  const ModuleLink = require('../../src/components/ModuleLink').default
  reset(admin, state())
  assert.equal(render(ModuleLink, { href: '/payroll/salary-history', className: 'underline' }, 'سجل الأجر'), '<a href="/payroll/salary-history" class="underline">سجل الأجر</a>')
  reset(admin, state({ payroll: false }))
  assert.equal(render(ModuleLink, { href: '/payroll/salary-history', className: 'underline' }, 'سجل الأجر'), 'سجل الأجر')
  assert.equal(render(ModuleLink, { href: '/payroll/salary-history', fallback: null }, 'سجل الأجر'), '')
  assert.equal(render(ModuleLink, { href: '/employees?x=1' }, 'الموظفين'), '<a href="/employees?x=1">الموظفين</a>')

  // «الوصول السريع» في لوحة الإدارة: اختصار شاشة موديول مقفول مايتعرضش
  const QuickActions = require('../../src/components/dashboard/QuickActions').default
  reset(admin, state())
  assert.deepEqual(hrefs(render(QuickActions)).filter(href => ['/attendance', '/leaves/request', '/payroll'].includes(href)), ['/attendance', '/leaves/request', '/payroll'])
  reset(admin, state({ attendance: false, leave: false, payroll: false }))
  const quick = hrefs(render(QuickActions))
  for (const href of ['/attendance', '/leaves/request', '/payroll']) assert.ok(!quick.includes(href), href + ' مقفول')
  assert.ok(quick.includes('/employees/add') && quick.includes('/reports'))

  // لينكات التقارير المالية: تقرير السلف مع السلف، وتقرير الإضافي مع الإضافي، والبطاقة كلها بتختفي مع الرواتب
  const { FinancialReportLinks } = require('../../src/app/reports/_financial/links')
  reset(admin, state())
  assert.equal(hrefs(render(FinancialReportLinks)).length, 6)
  reset(admin, state({ loans: false, overtime: false }))
  assert.deepEqual(hrefs(render(FinancialReportLinks)), ['/reports/payroll-register', '/reports/payroll-cost', '/reports/deductions', '/reports/cost-centers'])
  reset(admin, state({ payroll: false }))
  assert.equal(render(FinancialReportLinks), '')

  // ===== المصدر: كل شاشة أساس بتسأل عن الموديول قبل ما تنادي مساره =====
  // ملف الموظف: فشل أنواع الإجازات مابيوقّعش الملف، وتابات وبنود الموديولات المقفولة مختفية
  const profile = read('src/app/employees/[id]/page.tsx')
  assert.ok(profile.includes('fetchActiveLeaveTypes().catch(() => [] as Awaited<ReturnType<typeof fetchActiveLeaveTypes>>),'))
  assert.ok(profile.includes("(tab.id !== 'leaves' || leaveOn) && (tab.id !== 'assets' || custodyOn)"))
  assert.ok(profile.includes("{payrollOn && can('payroll.view') && <EmployeePayrollRunsCard"))
  assert.ok(profile.includes("{offboardingOn && can('offboarding.manage') &&"))
  assert.ok(profile.includes('{offboardingOn && <Link'))
  // لوحة التقارير: تقرير الموديول المقفول مايتطلبش، وفشله (404 من تبويب قديم) مايوقّعش اللوحة
  const reports = read('src/app/reports/page.tsx')
  assert.ok(reports.includes('optionalReport(leaveOn, () => fetchLeavesReportFor(currentYear, org.params)),'))
  assert.ok(reports.includes("optionalReport(payrollOn && can('payroll.view'), () => fetchPayrollReportFor(org.params)),"))
  assert.ok(reports.includes('if (err instanceof ApiError && err.status === 404) return null; throw err'))
  assert.ok(reports.includes("].filter((card) => available(card.href) && (card.id !== 'payroll' || canPayroll))"))
  for (const gate of ['{attendanceOn && <div className={', '{showPayroll && <div className="card">', '{leaveOn && <div className="card">', '{overtimeOn && <div className={']) assert.ok(reports.includes(gate), gate)
  // أنواع الإجازات (hook مشترك في ملفي والتقويم والتقارير وتفاصيل أي طلب): مفيش نداء ولا رسالة خطأ والإجازات مقفولة
  const catalog = read('src/lib/leave-catalog.ts')
  assert.match(catalog, /const leaveEnabled = useModuleEnabled\('leave'\)/)
  assert.match(catalog, /if \(!leaveEnabled\) \{\n\s+setTypes\(\[\]\)\n\s+return\n\s+\}/)
  // لوحة الموظف وصندوق الموافقات وملفي: نداءات وبطاقات الموديول المقفول
  const home = read('src/components/dashboard/EmployeeHome.tsx')
  for (const call of ["attendanceOn ? soft(fetchMyToday(), null, 'حضور اليوم') : Promise.resolve(null),", "leaveOn ? soft(fetchMyBalances(), [] as ApiBalance[], 'أرصدة الإجازات') : Promise.resolve([] as ApiBalance[]),",
    "custodyOn ? soft(fetchMyCustody(), [] as ApiCustody[], 'العهد') : Promise.resolve([] as ApiCustody[]),", '{leaveOn && <div className="card p-6">', '{custodyOn && <div className="card p-6">']) assert.ok(home.includes(call), call)
  const inbox = read('src/app/approvals-inbox/page.tsx')
  for (const call of ['if (!payrollOn) { setPayrollPending(null); return }', 'if (!attendanceOn) { setExemptionsPending(0); return }',
    "if (!custodyOn) { setCustodyPending([]); setCustodyError(''); return Promise.resolve() }"]) assert.ok(inbox.includes(call), call)
  const mine = read('src/app/profile/page.tsx')
  assert.ok(mine.includes('if (leaveOn) fetchMyBalances()') && mine.includes("...(leaveOn ? [{ id: 'leaves', label: 'الإجازات', icon: Calendar }] : []),") && mine.includes('{custodyOn && <div className="card">'))
  // لوحة الإدارة وكروتها، والقايمة الجانبية، وبنود الإخلاء
  const adminHome = read('src/app/page.tsx')
  // B-ADD.3: اللوحة الإدارية بترسم الكروت اللي الخادم مسمّيها للحساب بس (الصلاحية والموديول والنطاق في الخادم)
  assert.ok(adminHome.includes('<AdminDashboard />') && read('src/components/dashboard/AdminDashboard.tsx').includes('CARD_COMPONENTS.filter(([key]) => hrefOf.has(key))'))
  assert.ok(read('src/components/dashboard/StatsCards.tsx').includes("].filter((card) => (attendanceOn || !['present', 'late', 'absent'].includes(card.id)) && (leaveOn || card.id !== 'on-leave'))"))
  assert.ok(read('src/components/layout/Sidebar.tsx').includes('if (!payrollOn) setPayrollApprovals(0)'))
  assert.ok(read('src/components/dashboard/MyClearanceItems.tsx').includes('if (!offboardingOn) { setItems([]); return }'))
  // الإعدادات: لينكات الفهرس، ومجموعات وبلوكات «سياسات النظام»، وكارت الإضافي في «أيام العمل»، وملاحظة الورديات
  assert.ok(read('src/app/settings/page.tsx').includes('group.links.filter((link) => can(link.permission) && available(link.href))'))
  const policies = read('src/app/settings/policies/page.tsx')
  for (const part of ["title: 'الإجازات',\n    module: 'leave',", "title: 'العمل الإضافي (الأوفرتايم)',\n    module: 'overtime',", "title: 'أقساط السلف وحماية الصافي',\n    module: 'payroll',",
    'if (g.module && !moduleOn(g.module)) return null', "const loansOn = useModuleEnabled('loans')", 'if (!loansOn) return null',
    "const offboardingOn = useModuleEnabled('offboarding')", 'if (!offboardingOn) return null', 'useEffect(load, [loansOn])', 'useEffect(load, [offboardingOn])',
    "if (!payrollOn || !can('payroll.view')) return"]) assert.ok(policies.includes(part), part)
  assert.ok(read('src/app/settings/work-days/page.tsx').includes('{overtimeOn && <div className="card">'))
  assert.ok(read('src/components/GraceOverridesNote.tsx').includes('if (!shiftsOn) return null'))
  // تقرير الحضور من غير الإضافي، وطلب مُرجَع نوعه متوقف، و«إضافة موظف» من غير التوظيف
  assert.ok(read('src/app/attendance/reports/page.tsx').includes('{overtimeOn && <div className="card overflow-hidden">'))
  const requests = read('src/app/requests/page.tsx')
  assert.ok(requests.includes("if (!types.some((type) => type.code === (isLeaveRequest(detail) ? 'LEAVE' : detail.typeCode))) {"))
  assert.ok(requests.includes('نوع الطلب ده متوقف دلوقتي'))
  assert.ok(requests.includes('offboardingOn ? fetchMyOffboardingCase().catch(() => null) : Promise.resolve(null),'))
  assert.ok(read('src/app/employees/add/page.tsx').includes("if (!recruitmentOn) { setCandidateId(null); setCandidate(null); setCandidateError(''); return }"))
})
