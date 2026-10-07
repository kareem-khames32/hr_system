// B2.4: شاشات محرك الإشعارات — اختيارات المستخدم في صفحة الإشعارات، ولوحة القوالب وسجل الإرسال تحت «المهام المجدولة»، والإعدادات التلاتة
// في «سياسات النظام». اختبارات نقية بلا قاعدة بيانات.
// Run (من api/): node --test test/notifications-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('NU-01: عميل الـAPI على مسارات الخادم نفسها بصلاحياتها، والقيم بنفس كتالوج الخادم', () => {
  const ui = require('../../src/lib/notifications-api')
  const server = require('../src/notifications/notification-events')
  assert.deepEqual(Object.keys(ui.EMAIL_MODE_LABELS).sort(), [...server.NOTIFICATION_MODES].sort())
  assert.deepEqual(Object.keys(ui.DELIVERY_STATUS_LABELS), ['PENDING', 'SENT', 'FAILED', 'SKIPPED', 'DIGEST'])
  const api = read('src/lib/notifications-api.ts')
  assert.match(api, /apiFetch<ApiNotificationPreferences>\('\/notifications\/preferences'\)/)
  assert.match(api, /'\/notifications\/preferences', \{ method: 'PATCH', body: JSON\.stringify\(\{ category, channel, mode \}\) \}/)
  assert.match(api, /apiFetch<ApiNotificationTemplates>\('\/notifications\/templates'\)/)
  assert.match(api, /`\/notifications\/templates\/\$\{encodeURIComponent\(code\)\}\/\$\{encodeURIComponent\(channel\)\}`/)
  assert.match(api, /method: 'PUT', body: JSON\.stringify\(text\)/)
  assert.match(api, /templatePath\(code, channel\), \{ method: 'DELETE' \}/)
  assert.match(api, /`\/notifications\/deliveries\$\{status \? `\?status=\$\{encodeURIComponent\(status\)\}` : ''\}`/)
  const controller = read('api/src/notifications/notifications.controller.ts')
  assert.match(controller, /@RequireModule\('notifications'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('notifications'\)/)
  // اختيارات الحساب لنفسه من التوكن (من غير صلاحية ومن غير رقم مستخدم في الطلب)
  assert.match(controller, /@Get\('preferences'\)\s+preferences\(@CurrentUser\(\) user: JwtPayload\) \{\s+return this\.service\.preferences\(user\)/)
  assert.match(controller, /@Patch\('preferences'\)\s+setPreference\(@CurrentUser\(\) user: JwtPayload, @Body\(\) dto: SetPreferenceDto\)/)
  // القوالب وسجل الإرسال: «إدارة الإعدادات» ولحساب الشركة بس
  for (const route of ["@Get('templates')", "@Put('templates/:code/:channel')", "@Delete('templates/:code/:channel')", "@Get('deliveries')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0, route)
    const handler = controller.slice(at, at + 420)
    assert.match(handler, /@Perm\('settings\.manage'\)/, route)
    assert.match(handler, /companyOnly\(user\)/, route)
  }
  // قايمة الإشعارات نفسها زي ما هي في PortalController، والمخزّن مصدر زيادة فيها
  const portal = read('api/src/assets/portal.controller.ts')
  // وحكم كل نوع مخزّن من المنادي: إشارة التعليق بحق قراءة تعليقها، و«إعلان جديد» (B2.16) بإن الإعلان ساري والحساب في جمهوره
  assert.match(portal, /for \(const stored of await storedInAppNotifications\(this\.employees\.manager, user\.sub, ids => this\.comments\.readableComments\(user, ids\),\s+ids => this\.announcements\.liveIdsFor\(user, ids\)\)\)/)
  assert.ok(portal.indexOf('storedInAppNotifications(this.employees.manager') < portal.indexOf('return items.filter((item) => routeAvailable(item.link, enabled))'))
})

test('NU-02: اختيارات المستخدم في صفحة الإشعارات — البريد (فورًا، ملخص يومي، مقفول) وداخل النظام للفئات المخزّنة بس، وفئة الرواتب باسمها', () => {
  const page = read('src/app/notifications/page.tsx')
  assert.match(page, /<NotificationPreferences \/>/)
  assert.match(page, /payroll: \{ label: 'الرواتب', icon: Wallet \}/)
  const card = read('src/components/NotificationPreferences.tsx')
  for (const marker of ['data-notification-preferences', 'data-notification-preferences-unavailable', 'data-notification-email-off', 'data-notification-category', 'اختيارات الإشعارات', 'ظاهرة دايمًا']) {
    assert.ok(card.includes(marker), marker)
  }
  assert.match(card, /const EMAIL_MODES: NotificationMode\[\] = \['ON', 'DIGEST', 'OFF'\]/)
  // الفئة اللي عدّادها محسوب مالهاش اختيار داخل النظام؛ والمخزّنة بـcheckbox بيحفظ ON أو OFF
  assert.match(card, /category\.inApp === null \? <span className="text-gray-500">ظاهرة دايمًا<\/span>/)
  assert.match(card, /change\(category\.key, 'IN_APP', event\.target\.checked \? 'ON' : 'OFF'\)/)
  assert.match(card, /change\(category\.key, 'EMAIL', event\.target\.value as NotificationMode\)/)
  // القايمة بتتحمّل لما الكارت يتفتح بس (مفيش نداء زيادة مع كل فتح للصفحة)
  assert.match(card, /useEffect\(\(\) => \{ if \(open && !data\) load\(\) \}, \[open, data, load\]\)/)
  // البريد مقفول على مستوى الشركة: الاختيار بيتحفظ والمستخدم بيتقال له
  assert.ok(card.includes('بريد الإشعارات مقفول على مستوى الشركة دلوقتي'))
  // من غير أي رقم ترحيل في شاشة الموظف
  assert.equal(/ترحيل|087/.test(card), false)
})

test('NU-03: لوحة الإشعارات تحت «المهام المجدولة» — سجل الإرسال بحالاته وسببه، وتعديل القوالب بمتغيراتها والرجوع للافتراضي', () => {
  assert.match(read('src/app/settings/scheduled-jobs/page.tsx'), /<NotificationsAdminPanel \/>/)
  const panel = read('src/components/NotificationsAdminPanel.tsx')
  for (const marker of ['data-notifications-admin', 'data-notifications-unavailable', 'data-notifications-email-off', 'data-notifications-mail-missing', 'data-notifications-link-missing', 'data-notification-counts',
    'data-notification-deliveries', 'data-notification-templates', 'data-notification-template', 'data-notification-variables', 'ترحيل 087', 'النص الافتراضي']) {
    assert.ok(panel.includes(marker), marker)
  }
  assert.match(panel, /const STATUS_ORDER: NotificationDeliveryStatus\[\] = \['SENT', 'PENDING', 'DIGEST', 'SKIPPED', 'FAILED'\]/)
  // المتغير بيتحط في النص بنفس كتابة الخادم
  assert.ok(panel.includes('const token = `{{${key}}}`'))
  // الحفظ والرجوع من المسارين، والزرار مقفول من غير تغيير
  assert.match(panel, /saveNotificationTemplate\(event\.code, channel, \{ title, body \}\)/)
  assert.match(panel, /resetNotificationTemplate\(event\.code, channel\)/)
  assert.match(panel, /disabled=\{busy \|\| !dirty\}/)
  // نص «داخل النظام» للحدث اللي مالوش عنصر في القايمة اسمه «السطر المختصر»
  assert.ok(panel.includes("channel === 'IN_APP' && !event.storedInApp ? 'السطر المختصر (الملخص اليومي)' : templates.channels[channel]"))
  // العنوان بيتعرض زي ما الخادم بعته (متخفي)، ومفيش نص الرسالة في السجل
  assert.match(panel, /row\.address && <span className="block text-xs text-gray-500 font-mono" dir="ltr">\{row\.address\}<\/span>/)
  assert.equal(/row\.body|row\.subject/.test(panel), false)
  const service = read('api/src/notifications/notifications.service.ts')
  assert.match(service, /address: address \? maskEmail\(address\) : null/)
})

test('NU-04: الإعدادات التلاتة في «سياسات النظام» بنفس مفاتيح الخادم وحدوده، والبريد مقفول افتراضيًا', () => {
  const policies = read('src/app/settings/policies/page.tsx')
  const seed = require('../src/seed/requests-seed.data').configSeed
  const settings = read('api/src/settings/settings.controller.ts')
  for (const [key, value] of [['notifications.email.enabled', 'false'], ['notifications.quiet_hours', ''], ['notifications.digest_hour', '8']]) {
    assert.ok(policies.includes(`key: '${key}'`), key)
    assert.deepEqual(seed.filter(row => row.key === key), [{ key, value }], key)
    assert.ok(settings.includes(`'${key}'`), key)
  }
  assert.match(policies, /key: 'notifications\.digest_hour', label: 'ساعة الملخص اليومي', type: 'number', unit: 'الساعة', min: 0, max: 23, integer: true/)
  assert.match(policies, /key: 'notifications\.email\.enabled', label: 'إرسال الإشعارات بالبريد', type: 'bool'/)
  assert.match(settings, /'notifications\.email\.enabled': \['true', 'false'\]/)
  assert.match(settings, /if \(!Number\.isInteger\(n\) \|\| n > 23\) throw new BadRequestException\('ساعة الملخص اليومي عدد صحيح من 0 إلى 23'\)/)
  assert.match(settings, /dto\.value !== '' && !parseQuietHours\(dto\.value\)/)
  // القارئ بيقارن 'true' حرفيًا، والقيمة الناقصة = مقفول
  const service = read('api/src/notifications/notifications.service.ts')
  assert.match(service, /\(await this\.setting\(NOTIFICATIONS_EMAIL_ENABLED_KEY, 'false'\)\) === 'true'/)
})

test('NU-05: المهمة المجدولة للملخص اليومي متسجّلة في القايمة وسجل الموديولات، ومسح مهام الطابور المنتهية مع مسح السجل', () => {
  const jobs = require('../src/scheduler/scheduled-jobs')
  const registry = require('../src/modules-registry/registry')
  const job = jobs.SCHEDULED_JOBS['notifications.daily-digest']
  assert.deepEqual([job.cron, job.module, job.lock], ['5 * * * *', 'notifications.daily-digest', 'notifications.daily-digest'])
  assert.equal(registry.moduleOfJob('notifications.daily-digest'), 'notifications')
  const runner = read('api/src/scheduler/scheduled-jobs.runner.ts')
  assert.match(runner, /@Scheduled\('notifications\.daily-digest'\)\s+notificationsDailyDigest\(\) \{\s+return this\.jobs\.tick\('notifications\.daily-digest', \(\) => this\.use\(NotificationsService\)\.digestHourlyWork\(\)\)/)
  assert.match(runner, /await this\.jobs\.prune\(\)\s+await this\.use\(QueueService\)\.pruneDone\(\)/)
  // دالة الشغل نفسها بتسأل عن موديولها بالاسم (النداء المباشر)
  assert.match(read('api/src/notifications/notifications.service.ts'), /this\.modules\.jobEnabled\('notifications\.daily-digest'\)/)
})
