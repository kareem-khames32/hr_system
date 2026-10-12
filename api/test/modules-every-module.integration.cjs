'use strict'
// كل موديول في السجل بيتقفل ويتفتح فعلًا (B-ADD.21، كلمة المالك 12 أكتوبر 2026: «أي حاجة… نحطها في الموديولات إن إحنا نفتحها ونقفلها») —
// على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر، عبر HTTP، ولفّة على كل موديول اختياري في السجل (مش قايمة مكتوبة بالإيد):
//  EM-01) الأساس: كل الموديولات والمزايا مفتوحة — كل بنود القايمة متاحة، وكل أنواع الطلبات معروضة، وكل مهمة مجدولة شغالة.
//  EM-02) لكل موديول اختياري، وهو مقفول: مش في /modules/enabled وبنوده في القايمة مش متاحة، وكل مسار من مساراته في الخادم (كل كنترولراته
//         والمسارات الموسومة بيه جوه كنترولر تاني) بيرد 404 بنفس رد المسار اللي مالوش وجود — من غير توكن — وأنواع طلباته مش معروضة،
//         ومهامه المجدولة مابتشتغلش، وكارته في لوحة الإدارة وبنده في شريط الموديولات مش راجعين. والبيانات زي ما هي.
//         ولما يتفتح: كل ده بيرجع (المسار بيعدّي حارس الموديول، والنوع معروض، والمهمة شغالة، والكارت راجع).
//  EM-03) الأساسي مايتقفلش: صف «مقفول» في القاعدة على موديول أساسي مالوش أثر على مساراته ولا بنوده.
// Run (من api/): node --test test/modules-every-module.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const lib = require('../scripts/module-map-lib.cjs')
const registry = require('../src/modules-registry/registry')
const { MENU_GATES } = require('./fixtures/menu-gates.cjs')
const { MODULES, MODULE_KEYS, MODULE_FEATURES } = registry
const OPTIONAL = MODULE_KEYS.filter(key => !MODULES[key].core), CORE = MODULE_KEYS.filter(key => MODULES[key].core)
// كل بنود القايمة (مثبّتة على تعريف القايمة نفسه في module-map.test.cjs — MM-05)
const MENU_HREFS = Object.keys(MENU_GATES)

const t = disposableApp('every_module')
let tools, admin, handlers, dashboardCards
const typesOf = {}

// كل مسار في الخادم (بميتاداتا الكنترولرز نفسها) تبع الموديول ده: وسمه، أو ميزة من مزاياه، أو قيمة جزء المسار (الكتالوجات)
function routesOf(module) {
  const out = []
  for (const handler of handlers) {
    const method = handler.method === 'ALL' ? 'GET' : handler.method
    const fill = (route, values = {}) => route.replace(/:(\w+)\??/g, (_, name) => values[name] ?? '1')
    const tagged = handler.modules.includes(module) || handler.features.some(feature => MODULE_FEATURES[feature].module === module)
    if (tagged) for (const route of handler.routes) out.push({ id: handler.id, method, route: fill(route), features: handler.features })
    if (handler.byParam) {
      for (const [value, owner] of Object.entries(handler.byParam.map)) {
        if (owner === module) for (const route of handler.routes.filter(item => item.includes(`:${handler.byParam.param}`))) out.push({ id: handler.id, method, route: fill(route, { [handler.byParam.param]: value }), features: handler.features })
      }
    }
  }
  return out
}
// نداءات كتير من غير ما نغرّق الخادم
async function each(items, work, width = 12) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => { while (next < items.length) await work(items[next++]) }))
}
// رد Nest لمسار مالوش وجود: الموديول المقفول لازم يطلع بنفس الشكل بالحرف
const goneBody = (method, route) => ({ message: `Cannot ${method} /api${route}`, error: 'Not Found', statusCode: 404 })
const closedByGuard = response => response.status === 404 && /^Cannot [A-Z]+ \/api\//.test(String(response.body?.message ?? ''))
const enabled = async () => t.expectStatus(await t.request(admin, 'GET', '/modules/enabled'), 200)
// المعروض للتقديم: كود النوع، وتعريفات الإجازة اللي جوه بند «طلب إجازة» الموحّد
const offered = async () => t.expectStatus(await t.request(admin, 'GET', '/requests/types'), 200)
  .flatMap(type => [type.code, ...(type.leaveProfiles ?? []).map(profile => profile.definitionCode)])
const cards = async () => t.expectStatus(await t.request(admin, 'GET', '/dashboard/cards'), 200).cards.map(card => card.key)
const strip = async () => t.expectStatus(await t.request(admin, 'GET', '/dashboard/cards/modules'), 200).modules.map(tile => tile.key)
// الموديولات اللي بتتقفل فعليًا مع قفل موديول (هو واللي بيعتمد عليه)
const closedWith = module => MODULE_KEYS.filter(other => !registry.moduleEnabled({ modules: { ...Object.fromEntries(MODULE_KEYS.map(key => [key, true])), [module]: false }, features: {} }, other))
async function allOn() {
  for (const key of OPTIONAL) await tools.enable(key)
  for (const key of Object.keys(MODULE_FEATURES)) await tools.feature(key, true)
}

before(async () => {
  await t.start()
  tools = moduleTools(t.app)
  admin = await t.user()
  handlers = lib.apiHandlers()
  dashboardCards = require('../src/dashboard/dashboard-cards').DASHBOARD_CARDS
  // نوع طلب لكل كود ولكل وجهة تنفيذ متسجّلة لموديول (ونوع «تسجيل بس» تبع محرك الطلبات نفسه)
  const chain = await t.repo('ApprovalChain').save({ code: 'EM_CHAIN', nameAr: 'اعتماد الموارد البشرية', isActive: true, autoApprove: false })
  await t.repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  const type = (code, destinationHandler) => t.repo('RequestType').save({ code, nameAr: `نوع ${code}`, category: 'employee_relations', destinationHandler, approvalChainId: chain.id,
    isActive: true, requiredFields: '[]' })
  for (const key of MODULE_KEYS) {
    typesOf[key] = []
    for (const code of MODULES[key].requestTypes) { await type(code, MODULES[key].requestHandlers[0] ?? 'none'); typesOf[key].push(code) }
    for (const handler of MODULES[key].requestHandlers) { const code = `EM_${handler.toUpperCase()}`; await type(code, handler); typesOf[key].push(code) }
  }
  await type('EM_RECORD_ONLY', 'none'); typesOf.requests.push('EM_RECORD_ONLY')
  await allOn()
}, { timeout: 180000 })
after(t.stop)

test('EM-01: الكل مفتوح — كل بنود القايمة متاحة، وكل أنواع الطلبات معروضة، وكل مهمة مجدولة شغالة', async () => {
  const state = await enabled()
  assert.deepEqual([...state.modules].sort(), [...MODULE_KEYS].sort())
  assert.deepEqual([...state.features].sort(), Object.keys(MODULE_FEATURES).sort())
  assert.ok(MENU_HREFS.length >= 146)
  for (const href of MENU_HREFS) assert.equal(registry.routeAvailable(href, state), true, href)
  const codes = await offered()
  for (const key of MODULE_KEYS) for (const code of typesOf[key]) assert.ok(codes.includes(code), `${key}: النوع ${code} مش معروض والكل مفتوح`)
  for (const key of MODULE_KEYS) for (const job of MODULES[key].jobs) assert.equal(await tools.service.jobEnabled(job), true, job)
  assert.deepEqual((await cards()).sort(), dashboardCards.map(card => card.key).sort())
  // كل موديول اختياري له مسارات في الخادم تتجرّب
  for (const key of OPTIONAL) assert.ok(routesOf(key).length > 0, `${key}: مالوش مسارات`)
  assert.ok(OPTIONAL.reduce((sum, key) => sum + routesOf(key).length, 0) >= 600)
})

test('EM-02: كل موديول اختياري — مقفول: القايمة والمسارات وأنواع الطلبات والمهام والكروت بتاعته مقفولة؛ مفتوح: كلها راجعة', async tc => {
  const stripOpen = await strip()
  // شريط الموديولات والكل مفتوح: بند لكل موديول له بند في الخدمة (مش فحص فاضي)
  for (const tile of lib.dashboard().strip) assert.ok(stripOpen.includes(tile.module), `شريط الموديولات: ${tile.module}`)
  const rows = async () => Promise.all(['Employee', 'User', 'RequestType', 'ApprovalChain'].map(name => t.repo(name).count()))
  const dataBefore = await rows()
  let checkedRoutes = 0
  for (const key of OPTIONAL) {
    const def = MODULES[key], routes = routesOf(key), closed = closedWith(key)
    await tools.disable(key)

    // 1) القايمة: الموديول مش في المفعّل، وبنوده (وبنود اللي بيعتمد عليه) مش متاحة، والباقي زي ما هو
    const off = await enabled()
    assert.deepEqual([...off.modules].sort(), MODULE_KEYS.filter(item => !closed.includes(item)).sort(), `${key} مقفول: المفعّل`)
    assert.ok(off.features.every(feature => !closed.includes(MODULE_FEATURES[feature].module)), `${key} مقفول: مزاياه`)
    for (const href of MENU_HREFS) {
      const owner = registry.routeOwner(href)
      const needs = [owner.module, ...registry.ROUTE_ALSO_REQUIRES.filter(extra => extra.route === href).flatMap(extra => extra.modules)]
      assert.equal(registry.routeAvailable(href, off), !needs.some(module => closed.includes(module)), `${key} مقفول: بند ${href}`)
    }

    // 2) الخادم: كل مسار من مساراته 404 بنفس رد المسار اللي مالوش وجود — من غير توكن (الحارس قبل الدخول)
    await each(routes, async item => {
      const response = await t.request(null, item.method, item.route)
      assert.deepEqual(response, { status: 404, body: goneBody(item.method, item.route) }, `${key} مقفول: ${item.id} ${item.method} ${item.route}`)
    })
    checkedRoutes += routes.length

    // 3) أنواع الطلبات: أنواعه مش معروضة للتقديم (ولا لمدير النظام)، وأنواع الأساس معروضة
    const codes = await offered()
    for (const module of closed) for (const code of typesOf[module]) assert.ok(!codes.includes(code), `${key} مقفول: النوع ${code} لسه معروض`)
    assert.ok(codes.includes('EM_RECORD_ONLY'))
    for (const module of CORE) for (const code of typesOf[module]) assert.ok(codes.includes(code), `${key} مقفول: نوع الأساس ${code} اختفى`)

    // 4) المهام المجدولة: مهامه مابتشتغلش، ومهام الأساس شغالة
    for (const job of def.jobs) assert.equal(await tools.service.jobEnabled(job), false, `${key} مقفول: المهمة ${job}`)
    for (const module of CORE) for (const job of MODULES[module].jobs) assert.equal(await tools.service.jobEnabled(job), true, job)

    // 5) لوحة الإدارة: كارته وبنده في شريط الموديولات مش راجعين، وكارته نفسه 404
    const shown = await cards()
    for (const card of dashboardCards) assert.equal(shown.includes(card.key), !card.modules.some(module => closed.includes(module)), `${key} مقفول: كارت ${card.key}`)
    assert.ok(!(await strip()).includes(key), `${key} مقفول: بنده في شريط الموديولات`)

    // ===== الفتح: كل ده بيرجع =====
    await tools.enable(key)
    const on = await enabled()
    assert.deepEqual([...on.modules].sort(), [...MODULE_KEYS].sort(), `${key} مفتوح`)
    for (const href of MENU_HREFS) assert.equal(registry.routeAvailable(href, on), true, `${key} مفتوح: بند ${href}`)
    // المسار بيعدّي حارس الموديول: من غير توكن الرد بقى رد حارس الدخول (أو رد المسار العام نفسه)، مش «المسار مالوش وجود»
    await each(routes, async item => {
      const response = await t.request(null, item.method, item.route)
      assert.ok(!closedByGuard(response), `${key} مفتوح: ${item.id} ${item.method} ${item.route} لسه 404 الحارس`)
    })
    const back = await offered()
    for (const module of closed) for (const code of typesOf[module]) assert.ok(back.includes(code), `${key} مفتوح: النوع ${code} مارجعش`)
    for (const job of def.jobs) assert.equal(await tools.service.jobEnabled(job), true, `${key} مفتوح: المهمة ${job}`)
    assert.deepEqual((await cards()).sort(), dashboardCards.map(card => card.key).sort(), `${key} مفتوح: الكروت`)
    assert.equal((await strip()).includes(key), stripOpen.includes(key), `${key} مفتوح: شريط الموديولات`)
  }
  // القفل والفتح مايمسحوش بيانات
  assert.deepEqual(await rows(), dataBefore)
  tc.diagnostic(`${OPTIONAL.length} موديول اختياري · ${checkedRoutes} مسار اتجرّب مقفول ومفتوح`)
})

test('EM-03: الأساسي مايتقفلش — صف «مقفول» في القاعدة مالوش أثر', async () => {
  for (const key of CORE) await tools.disable(key)
  const state = await enabled()
  for (const key of CORE) assert.ok(state.modules.includes(key), key)
  for (const href of MENU_HREFS.filter(item => MODULES[registry.routeOwner(item).module].core)) assert.equal(registry.routeAvailable(href, state), true, href)
  // مسار من كل موديول أساسي بيعدّي حارس الموديول (من غير توكن = رد حارس الدخول)
  for (const key of CORE) {
    const route = routesOf(key).find(item => item.method === 'GET' && item.features.length === 0)
    assert.ok(route, `${key}: مسار قراءة`)
    assert.ok(!closedByGuard(await t.request(null, route.method, route.route)), `${key}: ${route.route}`)
    for (const job of MODULES[key].jobs) assert.equal(await tools.service.jobEnabled(job), true, job)
  }
  // ومحاولة قفله من شاشة الموديولات مرفوضة
  const refused = await t.request(admin, 'PUT', '/modules/employees', { enabled: false })
  assert.equal(refused.status, 400); assert.match(refused.body.message, /موديول أساسي ومايتقفلش/)
})
