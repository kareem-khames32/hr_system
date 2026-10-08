'use strict'
// حراس المسارات (خطة التنفيذ B0.5) — من ميتاداتا الكنترولرز نفسها، من غير قاعدة ولا خادم:
//  RG-01) كل مسار في الـAPI تابع لموديول مسجّل (@RequireModule على الـhandler أو الكنترولر) — فمفيش مسار جديد ينزل برّه نظام الموديولات.
//  RG-02) كل مسار عليه @Perm (ومعاه RolesGuard وحارس الدخول)، أو متسجّل استثناء موثّق بسببه في fixtures/routes-without-perm.cjs.
//  RG-03) قايمة الاستثناءات مافيهاش بند قديم: كل بند فيها مسار موجود ومن غير @Perm، والعام منها بس هو اللي من غير حارس دخول.
//  RG-04) المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler: الورديات والإضافي والإجازات والعهد والسلف برّه كنترولراتها.
//  RG-05) كل مهمة مجدولة (@Cron) بتسأل «موديولي مفعّل؟» باسم متسجّل في السجل، وكل مهمة في السجل مستخدمة.
// Run (من api/): node --test test/routes-guards.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
// استيراد AppModule بيتحقق من متغيرات البيئة بس (مفيش اتصال بقاعدة من غير إقلاع)
process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex')
const { AppModule } = require('../src/app.module')
const { JwtAuthGuard, RolesGuard, PERMS_KEY } = require('../src/auth/guards')
const { REQUIRE_MODULE_KEY, REQUIRE_MODULE_PARAM_KEY } = require('../src/modules-registry/module.guard')
const registry = require('../src/modules-registry/registry')
const { EXCEPTIONS, REASONS } = require('./fixtures/routes-without-perm.cjs')

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD']

// كل الكنترولرز من شجرة موديولات Nest (الموديول الديناميكي والـforwardRef كمان)
function collectControllers(root) {
  const seen = new Set(), controllers = new Set()
  const visit = item => {
    const resolved = item && typeof item.forwardRef === 'function' ? item.forwardRef() : item
    const target = resolved?.module ?? resolved
    if (typeof target !== 'function' || seen.has(target)) return
    seen.add(target)
    for (const controller of [...(Reflect.getMetadata('controllers', target) ?? []), ...(resolved?.controllers ?? [])]) controllers.add(controller)
    for (const imported of [...(Reflect.getMetadata('imports', target) ?? []), ...(resolved?.imports ?? [])]) visit(imported)
  }
  visit(root)
  return [...controllers]
}

const handlers = []
for (const controller of collectControllers(AppModule)) {
  const prefixes = [].concat(Reflect.getMetadata('path', controller) ?? '')
  for (const name of Object.getOwnPropertyNames(controller.prototype)) {
    const fn = controller.prototype[name]
    if (typeof fn !== 'function' || name === 'constructor') continue
    const method = Reflect.getMetadata('method', fn)
    if (method === undefined) continue
    const read = key => Reflect.getMetadata(key, fn) ?? Reflect.getMetadata(key, controller)
    const guards = [...(Reflect.getMetadata('__guards__', controller) ?? []), ...(Reflect.getMetadata('__guards__', fn) ?? [])]
    const paths = [].concat(Reflect.getMetadata('path', fn) ?? '')
    handlers.push({
      id: `${controller.name}.${name}`, controller: controller.name, name,
      routes: prefixes.flatMap(prefix => paths.map(sub => `${METHODS[method]} /${[prefix, sub].filter(part => part && part !== '/').join('/')}`)),
      perms: read(PERMS_KEY) ?? [], modules: read(REQUIRE_MODULE_KEY) ?? [], byParam: read(REQUIRE_MODULE_PARAM_KEY) ?? null,
      ownModules: Reflect.getMetadata(REQUIRE_MODULE_KEY, fn) ?? null, classModules: Reflect.getMetadata(REQUIRE_MODULE_KEY, controller) ?? [], guards,
    })
  }
}
const byId = new Map(handlers.map(handler => [handler.id, handler]))
// كل مسار عليه وسم موديول خاص بيه (بيكسب على وسم الكنترولر)، بالاسم — RG-04
const HANDLER_TAGS = {
  AttendanceController: { assignScheduleRange: ['shifts'], calendarContext: ['platform'], clearWeekSchedule: ['shifts'], confirmCalendarContext: ['platform'], confirmOvertime: ['overtime'], createOvertimePeriod: ['overtime'], createScheduleRule: ['platform'], deleteOvertimePeriod: ['overtime'], deleteScheduleRule: ['platform'], employmentWindows: ['platform'], listOvertimePeriods: ['overtime'], listScheduleRules: ['platform'], overtimeLog: ['overtime'], overtimePreview: ['overtime'], payrollMonth: ['platform'], pendingOvertime: ['overtime'], setDayOverride: ['shifts'], setDayOverridesBulk: ['shifts'], updateOvertimePeriod: ['overtime'], updateScheduleRule: ['platform'], upsertSchedule: ['shifts'], weekDayOverrides: ['shifts'], weekSchedule: ['shifts'], workingDays: ['platform'] },
  // B2.8: حوار الطلب بموديول الطلبات، وحوار المهمة بموديول المهام
  CommentsController: { requestComment: ['requests'], requestThread: ['requests'], taskComment: ['tasks'], taskThread: ['tasks'] },
  DashboardController: { attendanceTrend: ['attendance'], departmentStats: ['attendance'] },
  EmployeeExtrasController: { listLoans: ['loans'] },
  FinancialReportController: { loans: ['loans'], overtime: ['payroll','overtime'] },
  LoansController: { capReview: ['requests'] },
  PortalController: { dismissNotification: ['notifications'], markNotificationsRead: ['notifications'], notifications: ['notifications'] },
  // B6.3 (ب): الـAPI العام — كل قراءة ورا موديول التكاملات وموديول بياناتها
  PublicApiController: { attendance: ['integrations','attendance'], leaves: ['integrations','leave'], payrollRuns: ['integrations','payroll'] },
  ReportsController: { attendance: ['attendance'], leaves: ['leave'], overtime: ['overtime'], payroll: ['payroll'], payrollLoans: ['loans'], payrollOvertime: ['payroll','overtime'], payrollUnassigned: ['payroll'], payrollVariance: ['payroll'] },
  RequestsController: { acknowledge: ['custody'], activeLeaveTypes: ['leave'], adjustBalance: ['leave'], balanceAdjustments: ['leave'], bulkBalances: ['leave'], employeeBalances: ['leave'], handover: ['custody'], managerConfirm: ['custody'], myBalances: ['leave'], myLeaves: ['leave'], reconcileOvertime: ['overtime'], rejectCustody: ['custody'], rollover: ['leave'], transfer: ['custody'] },
  SettingsController: { addStatutoryLeaveTypes: ['leave'], createChain: ['requests'], createLeaveType: ['leave'], createRequestType: ['requests'], destinationHandlers: ['requests'], leaveStatutoryPack: ['leave'], listChains: ['requests'], listLeaveTypes: ['leave'], listRequestTypes: ['requests'], replaceChainSteps: ['requests'], updateChain: ['requests'], updateLeaveType: ['leave'], updateRequestType: ['requests'], updateStep: ['requests'] },
}
const guarded = (handler, guard) => handler.guards.includes(guard)

test('RG-01: كل مسار تابع لموديول مسجّل', () => {
  assert.ok(new Set(handlers.map(handler => handler.controller)).size >= 57, 'كل الكنترولرز اتجمعت')
  assert.ok(handlers.length >= 450, `عدد المسارات ${handlers.length}`)
  assert.equal(byId.size, handlers.length, 'اسم Controller.method فريد')
  const missing = handlers.filter(handler => handler.modules.length === 0).map(handler => `${handler.id} (${handler.routes.join(' · ')})`)
  assert.deepEqual(missing, [], `مسارات من غير @RequireModule:\n${missing.join('\n')}`)
  for (const handler of handlers) {
    for (const key of handler.modules) assert.ok(registry.isModuleKey(key), `${handler.id}: موديول مش مسجّل «${key}»`)
    for (const key of Object.values(handler.byParam?.map ?? {})) assert.ok(registry.isModuleKey(key), `${handler.id}: موديول مش مسجّل «${key}»`)
  }
  // الموديولات الاختيارية كلها ليها مسارات فعلًا (غير المصروفات: أنواع طلبات بس)
  const used = new Set(handlers.flatMap(handler => [...handler.modules, ...Object.values(handler.byParam?.map ?? {})]))
  for (const key of registry.MODULE_KEYS) if (key !== 'expenses') assert.ok(used.has(key), `الموديول ${key} مالوش ولا مسار`)
})

test('RG-02: كل مسار عليه @Perm بحراسه، أو استثناء موثّق', () => {
  const unprotected = handlers.filter(handler => handler.perms.length === 0)
  const undocumented = unprotected.filter(handler => !EXCEPTIONS[handler.id]).map(handler => `${handler.id} (${handler.routes.join(' · ')})`)
  assert.deepEqual(undocumented, [], `مسارات من غير @Perm ومن غير استثناء موثّق:\n${undocumented.join('\n')}`)
  for (const handler of handlers.filter(item => item.perms.length > 0)) {
    // @Perm من غير RolesGuard مابيتنفّذش، ومن غير حارس الدخول مفيش مستخدم يتفحص
    assert.ok(guarded(handler, RolesGuard), `${handler.id}: عليه @Perm ومن غير RolesGuard`)
    assert.ok(guarded(handler, JwtAuthGuard), `${handler.id}: عليه @Perm ومن غير حارس الدخول`)
    assert.ok(handler.perms.every(key => typeof key === 'string' && key.length > 2), `${handler.id}: مفتاح صلاحية فاضي`)
    assert.ok(!EXCEPTIONS[handler.id], `${handler.id}: عليه @Perm ولسه في قايمة الاستثناءات`)
  }
  // كل مفتاح على مسار موجود في سجل الصلاحيات
  const { ALL_PERMISSIONS } = require('../src/auth/permissions')
  const unknown = [...new Set(handlers.flatMap(handler => handler.perms))].filter(key => !ALL_PERMISSIONS.includes(key))
  assert.deepEqual(unknown, [], `مفاتيح على مسارات ومش في سجل الصلاحيات: ${unknown.join(', ')}`)
})

test('RG-03: قايمة الاستثناءات من غير بنود قديمة، والعام منها بس من غير حارس دخول', () => {
  const stale = Object.keys(EXCEPTIONS).filter(id => !byId.has(id))
  assert.deepEqual(stale, [], `استثناءات لمسارات مش موجودة: ${stale.join(', ')}`)
  const counts = {}
  for (const [id, category] of Object.entries(EXCEPTIONS)) {
    assert.ok(REASONS[category], `${id}: تصنيف غير معروف ${category}`)
    counts[category] = (counts[category] ?? 0) + 1
    const handler = byId.get(id)
    if (category === 'PUBLIC_OK') assert.ok(!guarded(handler, JwtAuthGuard), `${id}: متسجّل عام وعليه حارس دخول`)
    else assert.ok(guarded(handler, JwtAuthGuard), `${id}: مش عام ومن غير حارس دخول`)
  }
  // أي زيادة في الاستثناءات قرار ظاهر في المراجعة: الأعداد مثبّتة
  // B2.1: +1 SELF (تسجيل التصدير من الشاشات في سجل التدقيق)
  // B1.14: +1 SELF (مستحق الموظف التقديري عن نفسه)
  // B2.4: +2 SELF (اختيارات صاحب الحساب لقنوات إشعاراته: قراءة وحفظ)
  // B2.5: +4 SELF («مهامي» وعدّادها و«فريقي» و«مين أقدر أكلّفه») و+4 SERVICE_CHECK (تكليف، قراءة، تعديل، حالة — الحق في الخدمة)
  // B2.6-ب: +3 SERVICE_CHECK (تفويض الاعتمادات: قايمة، إنشاء، إلغاء — صاحب التفويض أو صاحب الصلاحية في نطاقه)
  // B2.7-أ: +3 SELF («سياساتي» و«اللي مستنيني» والإقرار) و+2 SERVICE_CHECK (قراءة نسخة سياسة وملفها — صاحب الصلاحية أو الجمهور)
  // B2.7-ب: +3 SELF (مستندات الموظف اللي مستنية إقراره، وقراءة مستنده قبل الإقرار، والإقرار بيه — لصاحب المستند بس)
  // B2.8: +4 SERVICE_CHECK (حوار التعليقات على الطلب والمهمة: قراءة وكتابة — الحق حق الكيان نفسه، والفحص في الخدمة)
  // B2.5 (إضافة المالك): +5 SERVICE_CHECK (تقرير الالتزام، وطلب تمديد الميعاد وقراره، وتقييم المهمة، وسجل المهمة — الحق في الخدمة)
  // B2.14: + مساري لوحة «فريقي» (الحكم بموقع الحساب في الهيكل)
  // B2.16: +3 SELF (لوحة الإعلانات، وتسجيل القراءة، ومناسبات زمايل الفرع — الموظف لنفسه)
  // B2.17: +1 PUBLIC_OK (الخروج) و+1 SELF (بيانات الجلسة)؛ B2.17-ب: +3 SELF («جلساتي» وإنهاؤها)
  // B2.17-ج: +4 SELF (تطبيق المصادقة: الحالة والتفعيل والتأكيد والإلغاء)
  // B3.1-ج: +2 SERVICE_CHECK (قايمة فترات التجربة وقرارها — الحق في الخدمة)
  // B3.8-ب: +3 SERVICE_CHECK (مكافآت نتيجة التقييم: الموجّهة للمدير، وتقديمها، وصرف النظر — الحق في الخدمة)
  // B3.9: +2 SELF («دوراتي» وتقييم الموظف لتدريبه)
  // B3.9-ج: +1 SERVICE_CHECK (التدريب الإلزامي الناقص عند فريق المدير)
  // B3.10: +2 SELF («استفساراتي» وتقييم الموظف للخدمة)
  // B3.10-ب: +2 SERVICE_CHECK (قراءة قاعدة المعرفة: بحث ومقال — بجمهور المقال)
  // B3.11: +2 SELF («قضاياي» واعتراض المشكو في حقه) و+8 SERVICE_CHECK (ملف القضية بعضويتها)
  // B3.12: +1 SELF («جزاءاتي»)
  // B3.13: +2 SELF («استبياناتي» والرد) و+1 SERVICE_CHECK (نموذج الاستبيان للمدعو)
  // B3.14: +1 SELF («معاليني»)
  // B4.6 (ج): +1 SELF (إعداد عرض الحساب نفسه: الهجري جنب الميلادي)
  assert.deepEqual(counts, { PUBLIC_OK: 22, SELF: 93, AUTH_ANY_OK: 11, SERVICE_CHECK: 137 })
  assert.equal(handlers.filter(handler => handler.perms.length === 0).length, 263)
  // من غير حارس دخول = العام بس
  const open = handlers.filter(handler => !guarded(handler, JwtAuthGuard)).map(handler => handler.id).sort()
  assert.deepEqual(open, Object.keys(EXCEPTIONS).filter(id => EXCEPTIONS[id] === 'PUBLIC_OK').sort())
})

test('RG-04: المسارات اللي بتخدم أكتر من موديول متعلّمة على الـhandler', () => {
  const expectModule = (id, modules) => assert.deepEqual(byId.get(id)?.modules, modules, id)
  // كنترولر الحضور: التقويم أساسي، والجداول للورديات، والإضافي للإضافي
  expectModule('AttendanceController.daily', ['attendance'])
  expectModule('AttendanceController.myToday', ['attendance'])
  expectModule('AttendanceController.ingest', ['attendance'])
  expectModule('AttendanceController.workingDays', ['platform'])
  expectModule('AttendanceController.payrollMonth', ['platform'])
  expectModule('AttendanceController.listScheduleRules', ['platform'])
  expectModule('AttendanceController.calendarContext', ['platform'])
  expectModule('AttendanceController.weekSchedule', ['shifts'])
  expectModule('AttendanceController.assignScheduleRange', ['shifts'])
  expectModule('AttendanceController.listOvertimePeriods', ['overtime'])
  expectModule('AttendanceController.confirmOvertime', ['overtime'])
  expectModule('HolidayWorkController.list', ['overtime'])
  // محرك الطلبات: أرصدة الإجازات وتأكيد العهدة وتوجيه الإضافي
  expectModule('RequestsController.create', ['requests'])
  expectModule('RequestsController.inbox', ['requests'])
  expectModule('RequestsController.myBalances', ['leave'])
  expectModule('RequestsController.activeLeaveTypes', ['leave'])
  expectModule('RequestsController.rollover', ['leave'])
  expectModule('RequestsController.acknowledge', ['custody'])
  expectModule('RequestsController.transfer', ['custody'])
  expectModule('RequestsController.reconcileOvertime', ['overtime'])
  // التقارير والإعدادات
  expectModule('ReportsController.headcount', ['reports'])
  expectModule('ReportsController.attendance', ['attendance'])
  expectModule('ReportsController.leaves', ['leave'])
  expectModule('ReportsController.payroll', ['payroll'])
  expectModule('ReportsController.payrollOvertime', ['payroll', 'overtime'])
  expectModule('ReportsController.payrollLoans', ['loans'])
  expectModule('FinancialReportController.payrollRegister', ['payroll'])
  expectModule('FinancialReportController.loans', ['loans'])
  expectModule('FinancialReportController.overtime', ['payroll', 'overtime'])
  expectModule('SettingsController.listConfig', ['platform'])
  expectModule('SettingsController.listLeaveTypes', ['leave'])
  expectModule('SettingsController.listRequestTypes', ['requests'])
  expectModule('EmployeeExtrasController.profile', ['employees'])
  expectModule('EmployeeExtrasController.listLoans', ['loans'])
  expectModule('PortalController.calendar', ['self_service'])
  expectModule('PortalController.notifications', ['notifications'])
  // B2.4: اختيارات الإشعارات والقوالب وسجل الإرسال تابعين لموديول الإشعارات؛ والقوالب والسجل بصلاحية «إدارة الإعدادات»
  const notifications = handlers.filter(handler => handler.controller === 'NotificationsController')
  assert.equal(notifications.length, 6)
  for (const handler of notifications) assert.deepEqual(handler.modules, ['notifications'], handler.id)
  assert.deepEqual(notifications.filter(handler => handler.perms.length).map(handler => [handler.name, handler.perms]).sort(), [
    ['deliveries', ['settings.manage']], ['resetTemplate', ['settings.manage']], ['saveTemplate', ['settings.manage']], ['templates', ['settings.manage']]])
  // B2.5: مسارات المهام كلها تابعة لموديول المهام؛ وقايمة كل المهام بس اللي بصلاحية (الباقي حقه في الخدمة)
  const tasks = handlers.filter(handler => handler.controller === 'TasksController')
  assert.equal(tasks.length, 14)
  for (const handler of tasks) assert.deepEqual(handler.modules, ['tasks'], handler.id)
  assert.deepEqual(tasks.filter(handler => handler.perms.length).map(handler => [handler.name, handler.perms]), [['list', ['tasks.view_all']]])
  // لوحة التحكم: الأرقام العامة أساسية، وويدجتات الحضور (المنحنى وإحصائيات الأقسام) للحضور
  expectModule('DashboardController.stats', ['platform'])
  expectModule('DashboardController.attendanceTrend', ['attendance'])
  expectModule('DashboardController.departmentStats', ['attendance'])
  // السلف: مراجعة سقف طلب سلفة مفتوح تابعة لمحرك الطلبات (الطلب المفتوح بيكمّل اعتماده بعد قفل الموديول)، وباقي المسارات للسلف
  expectModule('LoansController.capReview', ['requests'])
  const loans = handlers.filter(handler => handler.controller === 'LoansController' && handler.id !== 'LoansController.capReview')
  assert.ok(loans.length > 0)
  for (const handler of loans) assert.deepEqual(handler.modules, ['loans'], handler.id)
  // الكتالوجات: النوع من المسار
  assert.deepEqual(byId.get('CatalogsController.list').byParam, { param: 'kind', map: { shifts: 'shifts', devices: 'attendance', 'asset-types': 'custody', 'permission-types': 'leave' } })
  expectModule('CatalogsController.list', ['platform'])
  // كنترولرات الموديول الواحد
  for (const [controller, module] of [['CandidatesController', 'recruitment'], ['AssetsController', 'custody'], ['OffboardingController', 'offboarding'],
    ['OnboardingController', 'onboarding'], ['PayrollController', 'payroll'], ['BonusesController', 'payroll'], ['TypedDeductionsController', 'payroll'],
    ['PayrollDisbursementController', 'payroll'], ['LeavesController', 'leave'], ['LeaveYearEndController', 'leave'], ['AttendanceExemptionsController', 'attendance']]) {
    const own = handlers.filter(handler => handler.controller === controller)
    assert.ok(own.length > 0, controller)
    for (const handler of own) assert.deepEqual(handler.modules, [module], handler.id)
  }
  // كل وسم موديول على مستوى الـhandler مثبّت بالاسم: شيل وسم بيفتح مساره مع موديوله مقفول، وإضافة وسم قرار لازم يبان هنا
  const tagged = {}
  for (const handler of handlers.filter(item => item.ownModules)) (tagged[handler.controller] ??= {})[handler.name] = handler.ownModules
  assert.deepEqual(tagged, HANDLER_TAGS)
  // B2.8: +4 (حوار الطلب بموديول الطلبات، وحوار المهمة بموديول المهام)؛ B4.5 (ج): +2 (اقتراح شرائح الحزمة، وأنواع إجازات الحزمة لفرع)
  // B6.3 (ب): +3 (الحضور والإجازات وملخص المسير في الـAPI العام)
  assert.equal(Object.values(tagged).reduce((sum, own) => sum + Object.keys(own).length, 0), 76)
  // ووسم الـhandler دايمًا غير وسم الكنترولر (وسم مكرر مالوش معنى وبيخبّي غلطة)
  for (const handler of handlers.filter(item => item.ownModules)) assert.notDeepEqual(handler.ownModules, handler.classModules, handler.id)

  // شاشة الموديولات نفسها: صلاحيتها settings.modules على كل مساراتها
  const admin = handlers.filter(handler => handler.controller === 'ModulesAdminController')
  assert.equal(admin.length, 7)
  for (const handler of admin) assert.deepEqual([handler.perms, handler.modules], [['settings.modules'], ['platform']], handler.id)
})

test('RG-05: كل مهمة مجدولة بتسأل عن موديولها باسم متسجّل، وكل مهمة في السجل مستخدمة', () => {
  const files = []
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full); else if (entry.name.endsWith('.ts')) files.push(full)
  } }
  walk(path.join(apiRoot, 'src'))
  // B1.4: المواعيد كلها في ScheduledJobsRunner (@Scheduled) وبتعدي على tick اللي بيسأل عن الموديول من قايمة المهام؛
  // ودوال الشغل نفسها لسه بتسأل عن موديولها (النداء المباشر واللحاق وقت الإقلاع) — الاتنين لازم يطابقوا سجل الموديولات
  const jobs = require('../src/scheduler/scheduled-jobs')
  const scheduled = new Set(jobs.SCHEDULED_JOB_IDS.map(id => jobs.SCHEDULED_JOBS[id].module).filter(Boolean))
  const runner = fs.readFileSync(path.join(apiRoot, 'src/scheduler/scheduled-jobs.runner.ts'), 'utf8')
  const used = new Set()
  const crons = (runner.match(/^\s*@Scheduled\(/gm) || []).length
  const workFiles = ['attendance/attendance-scheduler.service.ts', 'attendance/device-sync.service.ts', 'offboarding/offboarding.service.ts',
    'payroll/payroll-daily-accrual.scheduler.ts', 'payroll/typed-deductions-scheduler.service.ts', 'requests/leave-attachment-deadline.job.ts',
    'requests/requests-scheduler.service.ts', 'requests/requests.service.ts', 'queue/queue.service.ts', 'notifications/notifications.service.ts',
    'tasks/tasks.service.ts', 'reports/saved-reports.service.ts', 'onboarding/probation.service.ts',
    // B4.8-ب: مهام مراجعة البيانات اللي عدّت مدة الاحتفاظ
    'settings/data-protection.service.ts'].map(file => path.join(apiRoot, 'src', file))
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /^\s*@Cron\(/m, `${path.relative(apiRoot, file)}: الموعد بيعدي على @Scheduled`)
    if (!workFiles.includes(file)) continue
    // moduleGate = نفس الخدمة في محرك الطلبات (بغطاء للاختبارات اللي بتبنيه من غير حقن)
    const names = [...source.matchAll(/this\.(?:modules|moduleGate)\.jobEnabled\('([a-z.-]+)'\)/g)].map(match => match[1])
    assert.ok(names.length > 0, `${path.relative(apiRoot, file)}: دالة شغل مهمة مجدولة من غير فحص الموديول`)
    for (const name of names) {
      assert.ok(registry.moduleOfJob(name), `${path.relative(apiRoot, file)}: المهمة «${name}» مش متسجّلة في سجل الموديولات`)
      used.add(name)
    }
  }
  // عدد المواعيد مثبّت (12 + مسح سجل المهام): مهمة جديدة لازم تتسجّل في السجل وتتغطى في modules-enforcement (ME-05). B2.3: + أحداث المستندات
  // B2.4: + الملخص اليومي لإشعارات البريد. B2.5: + تذكير وتصعيد المهام. B2.13: + التقارير المجدولة بالبريد
  // B3.1-ج: + مهام قرار فترة التجربة. B4.8-ب: + مهام مراجعة البيانات اللي عدّت مدة الاحتفاظ
  assert.equal(crons, 18)
  const registered = registry.MODULE_KEYS.flatMap(key => registry.MODULES[key].jobs)
  assert.deepEqual([...used].sort(), [...registered].sort())
  assert.deepEqual([...scheduled].sort(), [...registered].sort())
})
