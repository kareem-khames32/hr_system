'use strict'
// B2.12 (أ): بوابة الموظف على الموبايل (390×844) في متصفح حقيقي — من غير مكتبة: متصفح الجهاز (كروم، أو إيدج) من غير واجهة، متساق
// ببروتوكول DevTools عن طريق WebSocket الجاهز في Node.
//  بيشغّل الخادم على قاعدة مؤقتة (hr_portal_mobile_test_<16 hex>) ببيانات تجريبية، والواجهة من نفس الشجرة (next dev بمجلد بناء مستقل
//  .next-e2e) متوجّهة له، وبيلف على شاشات البوابة بحساب موظف وبحساب مديره:
//   PM-01) كل شاشة: مفيش عنصر ظاهر خارج من يمين أو شمال الشاشة إلا لو جوه حاوية تمرير أو قص بتاعته هي جوه الشاشة (الجداول)،
//          وعرض الصفحة مش أكبر من عرض الشاشة.
//   PM-02) النوافذ: «طلب جديد» ونموذج نوع طلب، وتفاصيل مهمة بحوارها وسجلها — جوه الشاشة برضه.
//   PM-03) المدير: «بانتظار موافقتي» ونافذة الاعتماد، و«مهامي» بتبويب اللي كلّف بيه.
//  من غير بريد (خادم البريد «مش مضبوط»)، ومن غير كلمات مرور (توكن موقّع محليًا بسر عشوائي للتشغيلة).
//  مش ضمن اختبارات الوحدات ولا التكامل (اسمه e2e): بيتشغّل لوحده، وبيتخطّى برسالة لو مفيش متصفح على الجهاز.
// Run (من api/): node --test --test-timeout=1200000 test/portal-mobile.e2e.cjs
//   PORTAL_E2E_BROWSER=<مسار المتصفح> لتحديد متصفح بعينه
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const apiRoot = path.resolve(__dirname, '..'), root = path.resolve(apiRoot, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { requiredEmployeeFields } = require('./helpers/employee-fixture.cjs')

const WIDTH = 390, HEIGHT = 844
const BROWSERS = [process.env.PORTAL_E2E_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
const browserPath = BROWSERS.find(file => fs.existsSync(file)) ?? null
const skip = browserPath ? false : 'مفيش كروم ولا إيدج على الجهاز ده (PORTAL_E2E_BROWSER بيحدد مسار متصفح)'

const database = `hr_portal_mobile_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-portal-mobile-files-'))
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-portal-mobile-browser-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const tsconfigFile = path.join(root, 'tsconfig.json'), tsconfigBefore = fs.readFileSync(tsconfigFile, 'utf8')
let app, master, ds, base, web, webOrigin, browser, cdp, session, created = false, sequence = 0
const users = {}, emps = {}, made = {}

function assertDisposable() {
  assert.match(database, /^hr_portal_mobile_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const permissionsOf = user => user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]')
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: permissionsOf(user) })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  assert.ok(response.status < 400, `${method} ${route} → ${response.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)) })
})
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }

// ===== بروتوكول DevTools =====
class Cdp {
  constructor(url) {
    this.id = 0; this.pending = new Map(); this.socket = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', () => reject(new Error('تعذر الاتصال بالمتصفح')), { once: true }) })
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      const waiting = message.id ? this.pending.get(message.id) : null
      if (!waiting) return
      this.pending.delete(message.id)
      if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`)); else waiting.resolve(message.result)
    })
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method })
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
  close() { try { this.socket.close() } catch { /* اتقفل */ } }
}
const page = (method, params) => cdp.send(method, params, session)
async function evaluate(expression) {
  const result = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(`في الصفحة: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`)
  return result.result.value
}

// الحساب اللي الصفحة هتفتح بيه: جلسته بتتحط في التخزين المحلي قبل أي سكريبت من الصفحة
let sessionScript = null
async function signIn(user) {
  if (sessionScript) await page('Page.removeScriptToEvaluateOnNewDocument', { identifier: sessionScript })
  const current = { id: user.id, email: user.email, displayName: user.displayName, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    scopeAllBranches: user.scopeAllBranches ?? false, permissions: permissionsOf(user) }
  const source = `try { localStorage.setItem('hr_access_token', ${JSON.stringify(token(user))}); localStorage.setItem('hr_current_user', ${JSON.stringify(JSON.stringify(current))}); sessionStorage.clear() } catch (error) { /* صفحة من غير تخزين */ }`
  sessionScript = (await page('Page.addScriptToEvaluateOnNewDocument', { source })).identifier
}

/** بيفتح مسار وبيستنى الشاشة تترسم (أول فتح لكل شاشة بيبنيها next dev) */
async function open(route) {
  await page('Page.navigate', { url: webOrigin + route })
  const started = Date.now()
  let state = null
  while (Date.now() - started < 180000) {
    await sleep(400)
    state = await evaluate(`(() => {
      const main = document.querySelector('main')
      return { ready: document.readyState === 'complete', main: !!main, text: main ? main.innerText.trim().length : 0,
        busy: document.querySelectorAll('main .animate-spin').length, path: location.pathname }
    })()`).catch(() => null)
    if (state && state.ready && state.main && state.text > 20 && state.busy === 0) break
  }
  assert.ok(state && state.main && state.text > 20 && state.busy === 0, `${route}: الشاشة ماترسمتش (${JSON.stringify(state)})`)
  assert.equal(state.path, route, `${route}: اتحوّل لـ${state.path}`)
  // الخطوط والرسمة الأخيرة
  await sleep(500)
}

/**
 * قياس الشاشة: العناصر الظاهرة (برّه القايمة الجانبية المطوية) اللي خارجة من عرض الشاشة ومش جوه حاوية تمرير أفقي مقصودة
 * (كلاس overflow-x-auto، زي الجداول) هي نفسها جوه الشاشة.
 * الصفحة بتقص الزيادة تحت lg (overflow-x: clip)، فالزيادة بتبان عنصر مقصوص مش تمرير — عشان كده القياس بالعنصر. وأي حاوية قص
 * (overflow-hidden) أو تمرير رأسي مابتعفيش اللي جواها: المحتوى اللي بيتقص أو بيتمرّر أفقي من غير قصد عيب.
 */
const MEASURE = `(() => {
  const width = document.documentElement.clientWidth
  const inside = rect => rect.right <= width + 1 && rect.left >= -1
  const deliberate = node => /(^|\\s)overflow-x-(auto|scroll)(\\s|$)/.test(String(node.className?.baseVal ?? node.className ?? ''))
  const contained = element => {
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
      if (deliberate(node) && inside(node.getBoundingClientRect())) return true
    }
    return false
  }
  const offenders = []
  for (const element of document.body.querySelectorAll('*')) {
    if (element.closest('aside, nextjs-portal, script, style, [data-nextjs-toast], [data-next-badge-root]')) continue
    const rect = element.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) continue
    const style = getComputedStyle(element)
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
    if (inside(rect) || contained(element)) continue
    offenders.push({ tag: element.tagName.toLowerCase(), classes: String(element.className?.baseVal ?? element.className ?? '').slice(0, 110),
      text: (element.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 40), left: Math.round(rect.left), right: Math.round(rect.right) })
  }
  // العنصر الأب بس (ولاده خارجين معاه): أقصر قايمة تقول فين المشكلة
  const top = offenders.filter((item, index) => index === 0 || !(offenders[index - 1].left === item.left && offenders[index - 1].right === item.right)).slice(0, 6)
  return { width, scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), offenders: top, count: offenders.length }
})()`
async function measure(label) {
  const found = await evaluate(MEASURE)
  return found.offenders.length || found.scrollWidth > found.width + 1 || found.width !== WIDTH
    ? [`${label}: عرض ${found.width}، عرض المحتوى ${found.scrollWidth}، ${found.count} عنصر خارج الشاشة: ${JSON.stringify(found.offenders)}`] : []
}
/** ضغطة على أول زرار (أو لينك) ظاهر نصه بيحتوي النص */
async function click(text) {
  const done = await evaluate(`(() => {
    const wanted = ${JSON.stringify(text)}
    const target = [...document.querySelectorAll('button, a, [role="button"]')].find(element => element.offsetParent !== null && (element.innerText || '').trim().includes(wanted))
    if (!target) return false
    target.scrollIntoView({ block: 'center' }); target.click(); return true
  })()`)
  assert.equal(done, true, `الزرار «${text}» مش موجود`)
  await sleep(900)
}

before(async () => {
  if (skip) return
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const webPort = await freePort()
  webOrigin = `http://127.0.0.1:${webPort}`
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: webOrigin })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  app.enableCors({ origin: [webOrigin], credentials: true })
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  const config = repo('RequestsConfig')
  for (const [key, value] of [['company.name', 'شركة تجريبية لاختبار الموبايل'], ['attendance.weekend_days', 'FRI,SAT']]) {
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }

  // بيانات تجريبية: فرع وقسم بمديره، وموظف تحته بأسماء طويلة (عشان تبان في العرض الضيق)، وطلبات ومهام وإشعاراتهم
  const branch = await repo('Branch').save({ code: 'PM_A', name: 'فرع الرياض الرئيسي — بيانات تجريبية', country: 'SA', weekendDays: 'FRI,SAT' })
  const employee = (fullName, extra = {}) => repo('Employee').save({ ...requiredEmployeeFields({ jobTitle: extra.jobTitle ?? 'محاسب' }), employeeCode: `PM${String(++sequence).padStart(3, '0')}`, fullName,
    branchId: branch.id, joinDate: '2021-03-01', basicSalary: 9000, housingAllowance: 1500, transportAllowance: 600, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true,
    payMethod: 'cash', ...extra })
  emps.head = await employee('خالد عبد الرحمن العمري — بيانات تجريبية', { jobTitle: 'مدير الإدارة المالية والمحاسبة' })
  const department = await repo('Department').save({ name: 'الإدارة المالية والمحاسبة — تجريبي', code: 'PM_FIN', branchId: branch.id, managerEmployeeId: emps.head.id })
  await repo('Employee').update({ id: emps.head.id }, { departmentId: department.id })
  emps.worker = await employee('أحمد محمد عبد العزيز السالم — بيانات تجريبية', { departmentId: department.id, managerEmployeeId: emps.head.id, jobTitle: 'محاسب أول حسابات الموردين',
    email: 'worker.long.address@portal-mobile.invalid', phone: '0500000001' })
  const account = (label, displayName, permissions, extra = {}) => repo('User').save({ email: `${label}@portal-mobile.invalid`, displayName, passwordHash: 'test-only', role: 'employee',
    branchId: branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
  users.worker = await account('worker', emps.worker.fullName, [], { employeeId: emps.worker.id })
  users.head = await account('head', emps.head.fullName, [], { employeeId: emps.head.id })
  // نوع طلب بسلسلة خطوة المدير المباشر (تسجيل فقط) بحقلين
  const chain = await repo('ApprovalChain').save({ code: 'PM_CHAIN', nameAr: 'سلسلة المدير المباشر — تجريبي', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  await repo('RequestType').save({ code: 'PM_NOTE', nameAr: 'طلب مستلزمات مكتبية وأدوات عمل — تجريبي', category: 'employee_relations', destinationHandler: 'none', approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['reason']), customFields: JSON.stringify([{ key: 'reason', label: 'تفاصيل الطلب', type: 'text', required: true }, { key: 'neededBy', label: 'مطلوب قبل', type: 'date' }]) })
  const ask = reason => request(users.worker, 'POST', '/requests', { typeCode: 'PM_NOTE', payload: { reason, neededBy: day(7) }, submit: true })
  made.pending = await ask('شاشة إضافية وكرسي مكتب ولوحة مفاتيح لاسلكية لمكتب حسابات الموردين — بيانات تجريبية')
  made.approved = await ask('أحبار طابعة وورق تصوير للربع القادم — بيانات تجريبية')
  made.returned = await ask('خزنة مستندات صغيرة — بيانات تجريبية')
  await request(users.head, 'POST', `/requests/${made.approved.id}/act`, { action: 'APPROVE', comment: 'موافق — بيانات تجريبية' })
  await request(users.head, 'POST', `/requests/${made.returned.id}/act`, { action: 'RETURN', comment: 'وضّح المقاس المطلوب ومكان التركيب — بيانات تجريبية' })
  await request(users.head, 'POST', `/requests/${made.pending.id}/comments`, { body: 'هل الشاشة مقاس 27 بوصة كفاية؟ — بيانات تجريبية' })
  // مهمتين من المدير للموظف (واحدة متأخرة وبإثبات)، وتعليق من الموظف
  made.task = await request(users.head, 'POST', '/tasks', { title: 'مطابقة كشوف حسابات الموردين لشهر سبتمبر وإرسال الفروقات — تجريبي', description: 'كل مورد في ملف، والفروقات في جدول واحد.',
    assigneeEmployeeId: emps.worker.id, dueDate: day(3), priority: 'HIGH' })
  made.late = await request(users.head, 'POST', '/tasks', { title: 'أرشفة فواتير الربع الثالث — تجريبي', assigneeEmployeeId: emps.worker.id, dueDate: day(1), requiresProof: true })
  // الموعد الفايت مابيتكتبش من الخادم: بيتحط على الصف مباشرة عشان شارة «متأخرة» تبان
  await repo('Task').update({ id: made.late.id }, { dueDate: day(-2) })
  await request(users.worker, 'POST', `/tasks/${made.task.id}/comments`, { body: 'بدأت في أكبر خمس موردين، والباقي بكرة — بيانات تجريبية' })
  // سلفة مصروفة بأقساطها، وعهدة مستلمة — صفوف مباشرة (الشاشتين بيقروهم زي ما هم) عشان جداولهم وكروتهم تتقاس بمحتوى
  const loan = await repo('Loan').save({ employeeId: emps.worker.id, amount: 6000, status: 'DISBURSED', disbursedAt: new Date(), requestedAmount: '6000.00', installmentMonths: 4 })
  for (let month = 0; month < 4; month += 1) {
    const due = new Date(); due.setMonth(due.getMonth() + month - 1, 25)
    await repo('LoanInstallment').save({ loanId: loan.id, dueDate: localDate(due), amount: 1500, paid: month === 0, paidAmount: month === 0 ? '1500.00' : null })
  }
  const asset = await repo('Asset').save({ name: 'حاسب محمول للعمل الميداني مع حقيبة وشاحن إضافي — تجريبي', category: 'أجهزة حاسب', serialNumber: 'PM-LAPTOP-0001-DEMO', value: 4200, status: 'ASSIGNED',
    currentHolderId: emps.worker.id, branchId: branch.id })
  await repo('CustodyAssignment').save({ assetId: asset.id, employeeId: emps.worker.id, assignedBy: emps.head.id, assignedAt: new Date(), acknowledgedAt: new Date(), condition: 'جديد', status: 'ACTIVE' })
  // الإشعارات بتتوزّع من الطابور
  const queue = app.get(require('../src/queue/queue.service').QueueService)
  for (let round = 0; round < 6; round += 1) await queue.runOnce({ limit: 100 }).catch(() => undefined)

  // الواجهة من نفس الشجرة، بمجلد بناء مستقل، متوجّهة لخادم الاختبار
  web = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-H', '127.0.0.1', '-p', String(webPort)],
    { cwd: root, env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_API_URL: base, NEXT_BUILD_DIR: '.next-e2e', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let webLog = ''
  for (const stream of [web.stdout, web.stderr]) stream.on('data', chunk => { webLog = (webLog + chunk).slice(-4000) })
  for (let waited = 0; ; waited += 1000) {
    const up = await fetch(`${webOrigin}/login`).then(response => response.status < 500, () => false)
    if (up) break
    assert.ok(web.exitCode === null && waited < 240000, `الواجهة ماقامتش: ${webLog.slice(-800)}`)
    await sleep(1000)
  }

  // المتصفح من غير واجهة، بملف تعريف مؤقت
  browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--disable-extensions', '--mute-audio', 'about:blank'], { stdio: 'ignore' })
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let waited = 0; !fs.existsSync(portFile) || fs.readFileSync(portFile, 'utf8').trim().split('\n').length < 2; waited += 250) {
    assert.ok(browser.exitCode === null && waited < 30000, 'المتصفح ماقامش')
    await sleep(250)
  }
  const [port, socketPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n')
  cdp = new Cdp(`ws://127.0.0.1:${port.trim()}${socketPath.trim()}`)
  await cdp.ready
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  session = (await cdp.send('Target.attachToTarget', { targetId, flatten: true })).sessionId
  await page('Page.enable'); await page('Runtime.enable')
  await page('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true })
  await page('Emulation.setTouchEmulationEnabled', { enabled: true })
})

after(async t => {
  const errors = []
  try { if (cdp) { await cdp.send('Browser.close').catch(() => undefined); cdp.close() } } catch (error) { errors.push(error) }
  // شجرة العمليات كلها (المتصفح والواجهة بيفتحوا عمليات تحتهم)
  for (const child of [browser, web]) {
    if (!child || child.exitCode !== null) continue
    try {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGKILL')
    } catch (error) { errors.push(error) }
  }
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  // next dev بيزوّد مجلد بنائه على tsconfig.json لو مش فيه: الملف بيرجع زي ما كان
  try { if (fs.readFileSync(tsconfigFile, 'utf8') !== tsconfigBefore) fs.writeFileSync(tsconfigFile, tsconfigBefore) } catch (error) { errors.push(error) }
  for (const [directory, prefix] of [[uploads, 'hr-portal-mobile-files-'], [profile, 'hr-portal-mobile-browser-']]) {
    try {
      assert.equal(path.dirname(path.resolve(directory)), os.tmpdir()); assert.ok(path.basename(directory).startsWith(prefix))
      // المتصفح بيسيب ملفاته لحظة بعد القفل
      for (let attempt = 0; attempt < 5; attempt += 1) { try { fs.rmSync(directory, { recursive: true, force: true }); break } catch { await sleep(500) } }
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw errors[0]
})

const PORTAL = ['/', '/requests', '/my/tasks', '/my/attendance', '/my/leaves', '/my/payslips', '/my/loans', '/my/deductions', '/my/bonuses', '/my/custody', '/my/documents', '/my/policies',
  '/profile', '/notifications', '/calendar']

test('PM-00: القياس نفسه — عنصر عريض في الصفحة بيتمسك، وجوه حاوية تمرير أفقي مقصودة مابيتمسكش', { skip }, async () => {
  await signIn(users.worker)
  await open('/my/policies')
  assert.deepEqual(await measure('قبل'), [])
  const add = html => evaluate(`(() => { const box = document.createElement('div'); box.setAttribute('data-probe', '1'); box.innerHTML = ${JSON.stringify(html)}; document.querySelector('main').appendChild(box); return true })()`)
  const clear = () => evaluate(`(() => { document.querySelectorAll('[data-probe]').forEach(node => node.remove()); return true })()`)
  // عريض ومكشوف: بيتمسك
  await add('<div style="width:640px;height:20px;background:#eee">عنصر عريض</div>')
  assert.equal((await measure('عريض')).length, 1)
  await clear()
  // عريض جوه حاوية قص (overflow-hidden): محتواه بيتقص، فبيتمسك برضه
  await add('<div class="overflow-hidden"><div style="width:640px;height:20px">مقصوص</div></div>')
  assert.equal((await measure('مقصوص')).length, 1)
  await clear()
  // عريض جوه حاوية تمرير أفقي مقصودة (زي الجداول): مقبول
  await add('<div class="overflow-x-auto"><div style="width:640px;height:20px">جدول عريض</div></div>')
  assert.deepEqual(await measure('جوه حاوية تمرير'), [])
  await clear()
  // والحاوية نفسها لو خارجة من الشاشة: بتتمسك
  await add('<div class="overflow-x-auto" style="width:640px"><div style="width:900px;height:20px">حاوية عريضة</div></div>')
  assert.equal((await measure('حاوية عريضة')).length, 1)
  await clear()
})

test('PM-01: كل شاشات بوابة الموظف على 390px — مفيش عنصر خارج من الشاشة، ولا عرض أكبر منها', { skip }, async () => {
  await signIn(users.worker)
  const problems = []
  // الشاشات اللي لها بيانات تجريبية لازم تعرضها (القياس على صفوف وكروت فعلية مش على شاشة فاضية)
  const SHOWS = { '/requests': /طلب مستلزمات مكتبية/, '/my/tasks': /مطابقة كشوف حسابات الموردين/, '/my/loans': /6[,٬.]?000/, '/my/custody': /حاسب محمول للعمل الميداني/,
    '/profile': /أحمد محمد عبد العزيز السالم/, '/notifications': /مهمة|طلب/ }
  for (const route of PORTAL) {
    await open(route)
    if (SHOWS[route]) assert.match(await evaluate(`document.querySelector('main').innerText`), SHOWS[route], `${route}: البيانات التجريبية مش معروضة`)
    problems.push(...await measure(route))
    // وآخر الصفحة (المحتوى اللي تحت بيترسم مع التمرير)
    await evaluate('window.scrollTo(0, document.body.scrollHeight)'); await sleep(300)
    problems.push(...await measure(`${route} (آخر الصفحة)`))
  }
  assert.deepEqual(problems, [])
})

test('PM-02: النوافذ على 390px — «طلب جديد» بنموذجه، وتفاصيل المهمة بحوارها وسجلها', { skip }, async () => {
  await signIn(users.worker)
  const problems = []
  await open('/requests')
  await click('طلب جديد')
  problems.push(...await measure('نافذة طلب جديد'))
  await click('طلب مستلزمات مكتبية')
  problems.push(...await measure('نموذج نوع الطلب'))
  await open('/requests')
  await click('التفاصيل والتعليقات')
  problems.push(...await measure('تفاصيل الطلب وتعليقاته'))
  // كارت المهمة بحواره وسجله مفتوحين، ونافذة «خلصت» (ملاحظة وملف إثبات)
  await open('/my/tasks')
  await click('التعليقات')
  await click('سجل المهمة')
  problems.push(...await measure('كارت المهمة بحواره وسجله'))
  await click('خلصت')
  problems.push(...await measure('إقفال المهمة'))
  // نافذة «تعديل الملف» (نموذج بياناتي كله) — أولها وآخرها
  await open('/profile')
  await click('تعديل الملف')
  problems.push(...await measure('نافذة تعديل الملف'))
  await evaluate(`(() => { const body = document.querySelector('[role="dialog"] .overflow-y-auto'); if (body) body.scrollTop = body.scrollHeight; return true })()`); await sleep(300)
  problems.push(...await measure('نافذة تعديل الملف (آخرها)'))
  assert.deepEqual(problems, [])
})

test('PM-03: المدير على 390px — «بانتظار موافقتي» ونافذة الاعتماد، و«مهامي» باللي كلّف بيه', { skip }, async () => {
  await signIn(users.head)
  const problems = []
  await open('/approvals-inbox')
  problems.push(...await measure('/approvals-inbox'))
  await click('اعتماد')
  problems.push(...await measure('نافذة الاعتماد'))
  for (const route of ['/', '/my/tasks', '/notifications']) {
    await open(route)
    problems.push(...await measure(`${route} (المدير)`))
  }
  assert.deepEqual(problems, [])
})
