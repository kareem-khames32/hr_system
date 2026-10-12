'use strict'
// خريطة الموديولات (B-ADD.21، كلمة المالك 12 أكتوبر 2026: «كل نقطة في النظام في المكان بتاعها، في الموديول بتاعها»):
// بتجمع من الكود نفسه كل شاشة وبند قايمة وكنترولر ووجهة تنفيذ طلب ومهمة مجدولة ومجموعة إعدادات، مع موديول كل واحد ومكانه في القايمة.
// مفيش قاعدة بيانات ولا خادم: ميتاداتا Nest، وسجل الموديولات، وتعريف القايمة في Sidebar.tsx، وقراءة مصدر شاشتين إعدادات.
// المستخدمين: scripts/module-map.cjs (بيكتب docs/plan/module-map.md) وtest/module-map.test.cjs (بيفشل لو حاجة نزلت برّه الخريطة).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module')
const apiRoot = path.resolve(__dirname, '..'), root = path.resolve(apiRoot, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const walk = (dir, keep) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name), keep) : keep(entry.name) ? [path.join(dir, entry.name)] : [])

let registered = false, webRegistered = false
// تسجيل واحد لـts-node بيخدم ملفات الخادم وملفات الواجهة (JSX)
function register() {
  if (registered) return
  registered = true
  // لو ts-node متسجّل قبل كده (اختبار تكامل سجّله لملفات الخادم بس): نفس التسجيل كفاية لميتاداتا الخادم — ملفات الواجهة (menu/pages) محتاجة التسجيل ده
  if (!process[Symbol.for('ts-node.register.instance')]) {
    require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true,
      compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
  }
  require('../node_modules/reflect-metadata')
  // استيراد AppModule بيتحقق من متغيرات البيئة بس (مفيش اتصال بقاعدة من غير إقلاع)
  process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex')
}

// ملفات الواجهة (القايمة): مسار @/ وبدائل next اللي بتستوردها، وتخزين متصفح فاضي — بيتسجّلوا لما القايمة تتطلب بس،
// فاختبار تكامل بيقرا ميتاداتا الخادم من المكتبة دي مايتحطش له window في عملية الخادم
function registerWeb() {
  register()
  if (webRegistered) return
  webRegistered = true
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'next/link') { const React = require('../../node_modules/react'); return ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) }
    if (request === 'next/navigation') return { usePathname: () => '/' }
    return originalLoad.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
  }
  // ملفات الواجهة بتقرا التخزين وقت الاستيراد في بعض الأماكن: تخزين فاضي كفاية
  const storage = () => { const values = new Map(); return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), clear: () => values.clear() } }
  global.window ??= { location: { pathname: '/', href: '/' }, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
  global.localStorage ??= storage()
  global.sessionStorage ??= storage()
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD']

// كل الكنترولرز من شجرة موديولات Nest (الموديول الديناميكي والـforwardRef كمان) — نفس طريقة routes-guards.test.cjs
function collectControllers(rootModule) {
  const seen = new Set(), controllers = new Set()
  const visit = item => {
    const resolved = item && typeof item.forwardRef === 'function' ? item.forwardRef() : item
    const target = resolved?.module ?? resolved
    if (typeof target !== 'function' || seen.has(target)) return
    seen.add(target)
    for (const controller of [...(Reflect.getMetadata('controllers', target) ?? []), ...(resolved?.controllers ?? [])]) controllers.add(controller)
    for (const imported of [...(Reflect.getMetadata('imports', target) ?? []), ...(resolved?.imports ?? [])]) visit(imported)
  }
  visit(rootModule)
  return [...controllers]
}

/** كل مسارات الـAPI بموديولاتها ومزاياها الفعلية (وسم الـhandler بيكسب على وسم الكنترولر) */
function apiHandlers() {
  register()
  const { AppModule } = require('../src/app.module')
  const { REQUIRE_MODULE_KEY, REQUIRE_FEATURE_KEY, REQUIRE_MODULE_PARAM_KEY } = require('../src/modules-registry/module.guard')
  const out = []
  for (const controller of collectControllers(AppModule)) {
    const prefixes = [].concat(Reflect.getMetadata('path', controller) ?? '')
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      const fn = controller.prototype[name]
      if (typeof fn !== 'function' || name === 'constructor') continue
      const method = Reflect.getMetadata('method', fn)
      if (method === undefined) continue
      const own = key => Reflect.getMetadata(key, fn), cls = key => Reflect.getMetadata(key, controller)
      const paths = [].concat(Reflect.getMetadata('path', fn) ?? '')
      out.push({
        id: `${controller.name}.${name}`, controller: controller.name, name, method: METHODS[method], prefixes: prefixes.filter(prefix => prefix && prefix !== '/'),
        routes: prefixes.flatMap(prefix => paths.map(sub => `/${[prefix, sub].filter(part => part && part !== '/').join('/')}`)),
        modules: own(REQUIRE_MODULE_KEY) ?? cls(REQUIRE_MODULE_KEY) ?? [], features: own(REQUIRE_FEATURE_KEY) ?? cls(REQUIRE_FEATURE_KEY) ?? [],
        byParam: own(REQUIRE_MODULE_PARAM_KEY) ?? cls(REQUIRE_MODULE_PARAM_KEY) ?? null,
        classModules: cls(REQUIRE_MODULE_KEY) ?? [], classFeatures: cls(REQUIRE_FEATURE_KEY) ?? [],
        ownModules: own(REQUIRE_MODULE_KEY) ?? null, ownFeatures: own(REQUIRE_FEATURE_KEY) ?? null,
      })
    }
  }
  return out
}

/** الكنترولرز: ملف كل واحد، وبادئة مساره، وموديوله، والمسارات اللي وسمها غير وسم الكنترولر */
function apiControllers() {
  const handlers = apiHandlers()
  const files = new Map()
  for (const file of walk(path.join(apiRoot, 'src'), name => name.endsWith('.ts'))) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/^export class (\w+Controller)\b/gm)) files.set(match[1], path.relative(root, file).replace(/\\/g, '/'))
  }
  const byController = new Map()
  for (const handler of handlers) (byController.get(handler.controller) ?? byController.set(handler.controller, []).get(handler.controller)).push(handler)
  return [...byController.entries()].map(([name, list]) => {
    const prefixes = list[0].prefixes.length ? list[0].prefixes : [...new Set(list.flatMap(handler => handler.routes.map(route => route.split('/').filter(Boolean)[0] ?? '')))]
    const tagged = {}
    for (const handler of list) {
      const tag = [handler.ownModules ? handler.ownModules.join(' + ') : null, handler.ownFeatures ? `ميزة ${handler.ownFeatures.join(' + ')}` : null].filter(Boolean).join('، ')
      if (tag) (tagged[tag] ??= []).push(handler.name)
    }
    return { name, file: files.get(name) ?? null, prefixes: prefixes.map(prefix => `/${prefix}`).sort(), modules: list[0].classModules, features: list[0].classFeatures,
      byParam: list.find(handler => handler.byParam)?.byParam ?? null, handlers: list.length, tagged }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

/** القايمة الجانبية زي ما هي متعرّفة: مجموعة ← بنودها */
function menu() {
  registerWeb()
  return require('../../src/components/layout/Sidebar').MENU.map(group => ({ id: group.id, label: group.label,
    children: group.children.map(child => ({ label: child.label, href: child.href, perm: child.perm ? [].concat(child.perm) : [], when: child.when ?? null })) }))
}

const WHEN_LABELS = { inbox: 'للمعتمد أو طرف التفويض (ولغير دور «موظف» دايمًا)', payrollApprovals: 'لما فيه مسير مستني اعتماد الحساب', team: 'للي تحته حد في الهيكل',
  raises: 'للمدير وفيه دورة زيادات مفتوحة', probation: 'للي تحته حد في الهيكل أو معاه «عرض الموظفين»' }

/** كل صفحات الواجهة من src/app بموديولها وميزتها ومكانها في القايمة */
function pages() {
  register()
  const registry = require('../src/modules-registry/registry')
  const appDir = path.join(root, 'src', 'app'), place = new Map()
  for (const group of menu()) for (const child of group.children) place.set(child.href, { group: group.label, label: child.label })
  return walk(appDir, name => name === 'page.tsx').filter(file => !path.relative(appDir, file).split(path.sep).some(part => part.startsWith('_'))).map(file => {
    const route = '/' + path.relative(appDir, path.dirname(file)).replace(/\\/g, '/')
    const clean = route === '/.' || route === '/' ? '/' : route
    const source = fs.readFileSync(file, 'utf8')
    const redirect = source.length < 1600 ? source.match(/(?:redirect|router\.replace)\((?:'([^']+)'|(\w+))\)/) : null
    const owner = registry.routeOwner(clean.replace(/\[[^\]]+\]/g, '5'))
    return { route: clean, module: owner.module, feature: owner.feature, dynamic: /\[/.test(clean), redirect: redirect ? redirect[1] ?? redirect[2] : null, menu: place.get(clean) ?? null }
  }).sort((a, b) => a.route.localeCompare(b.route))
}

/** وجهات تنفيذ الطلبات المتنفّذة فعلًا، وأنواع الطلبات المزروعة، وموديول كل واحد */
function requests() {
  register()
  const registry = require('../src/modules-registry/registry')
  const { DestinationsService, ENGINE_RECORD_HANDLERS } = require('../src/requests/destinations.service')
  const { typesSeed } = require('../src/seed/requests-seed.data')
  const implemented = new Set([...Object.keys(new DestinationsService({}, {}).handlers), ...Object.keys(ENGINE_RECORD_HANDLERS)])
  const registeredHandlers = registry.MODULE_KEYS.flatMap(key => registry.MODULES[key].requestHandlers)
  const handlers = [...new Set([...implemented, ...registeredHandlers])].sort().map(handler => ({ handler, module: registry.moduleOfRequestType({ destinationHandler: handler }),
    registered: registeredHandlers.includes(handler), implemented: implemented.has(handler), types: typesSeed.filter(type => type.handler === handler).map(type => type.code) }))
  const types = typesSeed.map(type => ({ code: type.code, nameAr: type.nameAr, handler: type.handler ?? 'none', module: registry.moduleOfRequestType({ code: type.code, destinationHandler: type.handler }) }))
  return { handlers, types }
}

/** المهام المجدولة بموعدها وموديولها، والمؤقّتات اللي برّه المجدول */
function jobs() {
  register()
  const registry = require('../src/modules-registry/registry')
  const scheduled = require('../src/scheduler/scheduled-jobs')
  const list = scheduled.SCHEDULED_JOB_IDS.map(id => { const job = scheduled.SCHEDULED_JOBS[id]; return { id, cron: job.cron, gate: job.module ?? null, module: job.module ? registry.moduleOfJob(job.module) : null } })
  const timers = walk(path.join(apiRoot, 'src'), name => name.endsWith('.ts')).filter(file => /\bsetInterval\(|@Interval\(|@Timeout\(|@Cron\(/.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file).replace(/\\/g, '/')).filter(file => file !== 'api/src/scheduler/scheduled-jobs.ts').sort()
  return { list, timers }
}

/** مجموعات «سياسات النظام» وخاناتها وبلوكاتها بموديولها، وكروت فهرس «الإعدادات العامة» */
function settings() {
  register()
  const registry = require('../src/modules-registry/registry')
  const source = read('src/app/settings/policies/page.tsx')
  const constants = Object.fromEntries([...source.matchAll(/^const (\w+_KEY) = '([^']+)'/gm)].map(match => [match[1], match[2]]))
  const groups = []
  const block = source.slice(source.indexOf('const GROUPS: PolicyGroup[] = ['), source.indexOf('// ===== القرار ب1'))
  // نهاية كائن الخانة (القوس المقابل، من غير الأقواس اللي جوه نص): وسم الموديول مكتوب آخر التعريف
  const objectEnd = from => {
    let depth = 0, quote = null
    for (let index = from; index < block.length; index++) {
      const char = block[index]
      if (quote) { if (char === '\\') index++; else if (char === quote) quote = null; continue }
      if (char === "'" || char === '"' || char === '`') quote = char
      else if (char === '{') depth++
      else if (char === '}' && --depth === 0) return index
    }
    return block.length
  }
  for (const match of block.matchAll(/^    title: '(.+)',$|^    module: '(\w+)',$|\{\s*key: ([^,\n]+), label: '([^']+)'/gm)) {
    if (match[1]) groups.push({ title: match[1], module: null, fields: [] })
    else if (match[2]) groups[groups.length - 1].module = match[2]
    else {
      const tagged = block.slice(match.index, objectEnd(match.index) + 1).match(/, module: '(\w+)' \}$/)
      groups[groups.length - 1].fields.push({ key: constants[match[3]] ?? match[3].replace(/'/g, ''), label: match[4], module: tagged ? tagged[1] : null })
    }
  }
  // بلوك جوه الشاشة له موديوله: function XBlock(...) { ... const xOn = useModuleEnabled('x') ... if (!xOn) return null }
  const blocks = [...source.matchAll(/^function (\w+Block)\([\s\S]*?\n}\n/gm)].map(match => ({ name: match[1], module: match[0].match(/useModuleEnabled\('(\w+)'\)/)?.[1] ?? null }))
    .filter(block => block.module && new RegExp(`if \\(!${block.module}On\\) return null`).test(source))
  const index = read('src/app/settings/page.tsx')
  const cards = []
  let group = null
  for (const line of index.split('\n')) {
    const title = line.match(/^    title: '(.+)',$/), card = line.match(/^      \{ title: '([^']+)',.* href: '([^']+)', permission: '([^']+)'/)
    if (title) group = title[1]
    else if (card) { const owner = registry.routeOwner(card[2]); cards.push({ group, title: card[1], href: card[2], perm: card[3], module: owner.module, feature: owner.feature }) }
  }
  return { groups, blocks, cards }
}

/** كروت لوحة الإدارة وشريط الموديولات بموديول كل واحد وصلاحيته */
function dashboard() {
  register()
  const { DASHBOARD_CARDS } = require('../src/dashboard/dashboard-cards')
  const strip = [...read('api/src/dashboard/dashboard-modules.service.ts').matchAll(/await open\('(\w+)', ([^)]*)\)/g)]
    .map(match => ({ module: match[1], perms: [...match[2].matchAll(/'([^']+)'/g)].map(item => item[1]) }))
  return { cards: DASHBOARD_CARDS.map(card => ({ key: card.key, title: card.title, modules: [...card.modules], perms: [...card.perms], href: card.href })), strip }
}

/** أحداث الإشعارات (الإرسال نفسه بيتحكم بشاشة اللينك: routeAvailable للمستلم) */
function notifications() {
  register()
  const events = require('../src/notifications/notification-events')
  return events.NOTIFICATION_EVENT_CODES.map(code => ({ code, label: events.NOTIFICATION_EVENTS[code].label, category: events.NOTIFICATION_CATEGORIES[events.NOTIFICATION_EVENTS[code].category] }))
}

function registry() { register(); return require('../src/modules-registry/registry') }

module.exports = { root, apiRoot, register, registerWeb, registry, apiHandlers, apiControllers, menu, pages, requests, jobs, settings, dashboard, notifications, WHEN_LABELS }
