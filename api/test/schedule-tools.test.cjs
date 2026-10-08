// B5.5 (أ) — أدوات الجدولة: بداية الأسبوع، خانات التدوير، قواعد النسخ والتطبيق والنشر، ومصدر الكود والواجهة. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/attendance/schedule-tools')
const checks = require('../src/attendance/schedule-checks')
const registry = require('../src/modules-registry/registry')
const events = require('../src/notifications/notification-events')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('STU-01: بداية الأسبوع يوم أحد حقيقي (زي مفتاح الجدول القايم)، والأسابيع اللي بعده، وخانة الدور', () => {
  // 2026-10-11 يوم أحد
  assert.deepEqual(['2026-10-11', '2026-10-12', '2026-10-10', '2026-13-04', '2026-02-30', '11/10/2026', 20261011, null].map(rules.weekStartOf), ['2026-10-11', null, null, null, null, null, null, null])
  assert.deepEqual([rules.weekAfter('2026-10-11', 1), rules.weekAfter('2026-10-11', 4), rules.weekAfter('2026-12-27', 1), rules.weekAfter('2026-10-11', -1)], ['2026-10-18', '2026-11-08', '2027-01-03', '2026-10-04'])
  assert.deepEqual(['2026-10-11', '2026-10-14', '2026-10-17', '2026-10-18'].map(rules.weekOfDay), ['2026-10-11', '2026-10-11', '2026-10-11', '2026-10-18'])
  const { weekKeyOf } = require('../src/attendance/attendance.service')
  for (const day of ['2026-10-11', '2026-10-14', '2026-10-17', '2027-01-01']) assert.equal(rules.weekOfDay(day), weekKeyOf(day), day)
  assert.deepEqual(rules.rotationShiftIds('5, 7,9,x,0,'), [5, 7, 9])
  assert.deepEqual([0, 1, 2, 3, 4].map(offset => rules.rotationShiftAt([5, 7, 9], 1, offset)), [7, 9, 5, 7, 9])
})

test('STU-02: قواعد النمط والنسخ والتطبيق والنشر — بحدودها، والهدف مش أسبوع فات', () => {
  const today = '2026-10-14' // أسبوعه بيبدأ 2026-10-11
  assert.deepEqual(rules.rotationFields({ name: '  تدوير   المصنع ', branchId: 3, shiftIds: [5, 7, 5] }).fields, { name: 'تدوير المصنع', branchId: 3, shiftIds: [5, 7, 5], isActive: true })
  assert.equal(rules.rotationFields({ name: 'نمط', shiftIds: [5, 7] }).fields.branchId, null)
  assert.deepEqual([{ name: 'ن', shiftIds: [5, 7] }, { name: 'نمط', shiftIds: [5] }, { name: 'نمط', shiftIds: [5, 5] }, { name: 'نمط', shiftIds: Array(13).fill(0).map((_, i) => i + 1) }, { name: 'نمط', shiftIds: [5, '7'] },
    { name: 'نمط', shiftIds: [5, 7], branchId: 0 }, { name: 'نمط', shiftIds: [5, 7], isActive: 1 }].map(body => rules.rotationFields(body).fields), [null, null, null, null, null, null, null])
  assert.deepEqual(rules.copyFields({ fromWeek: '2026-10-04', toWeek: '2026-10-11' }, today).fields, { fromWeek: '2026-10-04', toWeek: '2026-10-11', branchId: null, overwrite: false })
  assert.deepEqual([{ fromWeek: '2026-10-04', toWeek: '2026-10-04' }, { fromWeek: '2026-10-11', toWeek: '2026-10-04' }, { fromWeek: '2026-10-05', toWeek: '2026-10-18' }, { fromWeek: '2026-10-04', toWeek: '2026-10-18', overwrite: 1 },
    { fromWeek: '2026-10-04', toWeek: '2026-10-18', branchId: 'x' }].map(body => rules.copyFields(body, today).error),
    ['أسبوع الهدف هو نفسه أسبوع المصدر', 'أسبوع الهدف فات — النسخ للأسبوع الحالي أو اللي بعده', 'أسبوع المصدر والهدف: تاريخ يوم أحد (بداية الأسبوع)', '«اكتب فوق» نعم أو لا', 'الفرع مش صحيح'])
  assert.deepEqual(rules.applyFields({ rotationId: 2, employeeIds: [4, 4, 9], fromWeek: '2026-10-11', weeks: 3 }, today).fields, { rotationId: 2, employeeIds: [4, 9], fromWeek: '2026-10-11', weeks: 3, startIndex: 0 })
  assert.deepEqual([{ employeeIds: [4], fromWeek: '2026-10-11', weeks: 1 }, { rotationId: 2, employeeIds: [], fromWeek: '2026-10-11', weeks: 1 }, { rotationId: 2, employeeIds: [4], fromWeek: '2026-10-04', weeks: 1 },
    { rotationId: 2, employeeIds: [4], fromWeek: '2026-10-11', weeks: 13 }, { rotationId: 2, employeeIds: [4], fromWeek: '2026-10-11', weeks: 1, startIndex: -1 }].map(body => rules.applyFields(body, today).fields), [null, null, null, null, null])
  assert.deepEqual(rules.publishFields({ week: '2026-10-11', branchId: 3, note: ' ملاحظة ' }).fields, { week: '2026-10-11', branchId: 3, note: 'ملاحظة', overrideReason: null })
  assert.deepEqual([{ week: '2026-10-12', branchId: 3 }, { week: '2026-10-11' }, { week: '2026-10-11', branchId: 3, note: 'x'.repeat(301) }].map(body => rules.publishFields(body).fields), [null, null, null])
})

test('STU-03: مصدر الكود — المسارات ورا الموديول والميزة وصلاحية إدارة الحضور؛ الكتابة من حفظ الجدول القايم بس؛ والنشر حدث إشعار بيتحكم عليه وقت التوزيع ووقت الإرسال', () => {
  const feature = registry.MODULES.shifts.features['shifts.advanced']
  assert.deepEqual([feature.default, feature.routes, registry.MODULES.shifts.routes, registry.MODULES.shifts.defaultEnabled], [false, ['/attendance/schedule-tools'], ['/attendance/shifts', '/attendance/weekly-schedule'], true])
  assert.deepEqual([registry.routeOwner('/attendance/schedule-tools'), registry.routeOwner('/attendance/weekly-schedule')], [{ module: 'shifts', feature: 'shifts.advanced' }, { module: 'shifts', feature: null }])
  const controller = read('attendance/schedule-tools.controller.ts')
  assert.match(controller, /@RequireModule\('shifts'\)\n@RequireFeature\('shifts\.advanced'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('attendance\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length], [12, 12]) // (ب): + القواعد والتغطية والفحص
  const service = read('attendance/schedule-tools.service.ts')
  assert.equal((service.match(/await this\.attendance\.upsertSchedule\(/g) ?? []).length, 2, 'النسخ والتطبيق بيكتبوا من حفظ الجدول القايم')
  assert.doesNotMatch(service, /INSERT INTO|UPDATE dbo\.weekly_schedule_entries|DELETE FROM|getRepository\(ScheduleEntry\)/, 'مفيش كتابة مباشرة على الجدول الأسبوعي')
  assert.match(service, /source\.filter\(row => inBranchScope\(scope, row\.branchId\) && \(fields\.branchId === null \|\| row\.branchId === fields\.branchId\)/)
  assert.match(service, /await recordOutboxEvent\(em, \{ type: 'SCHEDULE_PUBLISHED', entityType: 'schedule_publication', entityId: row\.id, key: `schedule-published:\$\{row\.id\}`, payload: \{ publicationId: row\.id \} \}\)/)
  const def = events.NOTIFICATION_EVENTS['schedule.published']
  assert.deepEqual([def.category, def.kind, def.storedInApp, events.NOTIFICATION_CATEGORIES.schedule], ['schedule', 'info', true, 'جدول الورديات'])
  const engine = read('notifications/notifications.service.ts')
  assert.match(engine, /case 'SCHEDULE_PUBLISHED': return this\.onSchedulePublished\(event\)/)
  assert.match(engine, /if \(notification\.entityType === 'schedule_publication'\) \{[\s\S]{0,260}audience\.employeeIds\.includes\(Number\(user\.employeeId\)\) \? null : /)
  assert.match(read('attendance/schedule-tools.ts'), /WHERE s\.\[weekStart\] = @0 AND e\.\[branchId\] = @1 AND/, 'الجمهور بفرع الموظف الحالي')
  assert.equal(require('../src/queue/outbox').DOMAIN_EVENTS.SCHEDULE_PUBLISHED, 'جدول أسبوع اتنشر')
})

test('STU-04: الواجهة — «أدوات الجدولة»: نسخ، أنماط، تطبيق، ونشر؛ ونمط «كل الفروع» لحساب بكل الفروع بس؛ والقايمة والعنوان', () => {
  const page = web('app/attendance/schedule-tools/page.tsx'), api = web('lib/schedule-tools-api.ts')
  assert.match(page, />\s*أدوات الجدولة\s*<\/h1>/)
  assert.match(page, /\{data\.companyWide && <option value="">كل الفروع<\/option>\}/)
  assert.match(page, /data-schedule-skipped/)
  for (const marker of ['data-schedule-copy', 'data-shift-rotations', 'data-rotation-apply', 'data-schedule-publish']) assert.ok(page.includes(marker), marker)
  for (const route of ['/rotations', '/copy-week', '/apply-rotation', '/publish']) assert.ok(api.includes(route), route)
  assert.match(web('components/layout/Sidebar.tsx'), /\{ label: 'أدوات الجدولة', href: '\/attendance\/schedule-tools', perm: 'attendance\.manage' \}/)
  assert.match(web('components/layout/pageTitles.ts'), /\['\/attendance\/schedule-tools', 'أدوات الجدولة'\]/)
})

test('STU-05: فحص الجدول — مدة الوردية والراحة (بالليلي)، ومخالفة واحدة لكل قاعدة بأسوأ قيمة، وقواعد النشر', () => {
  assert.deepEqual([checks.shiftMinutes({ start: '08:00', end: '16:00' }), checks.shiftMinutes({ start: '22:00', end: '06:00' }), checks.shiftMinutes({ start: '06:00', end: '19:00' }), checks.shiftMinutes({ start: '09:00', end: '09:00' })], [480, 480, 780, 1440])
  const morning = { start: '08:00', end: '16:00' }, evening = { start: '14:00', end: '22:00' }, night = { start: '22:00', end: '06:00' }
  assert.deepEqual([checks.restMinutes(morning, morning), checks.restMinutes(evening, morning), checks.restMinutes(night, morning), checks.restMinutes(night, night), checks.restMinutes(morning, night)], [960, 600, 120, 960, 1800])
  const all = [{ kind: 'MIN_REST_HOURS', limitHours: 11, severity: 'BLOCK' }, { kind: 'MAX_DAY_HOURS', limitHours: 12, severity: 'WARN' }, { kind: 'MAX_WEEK_HOURS', limitHours: 48, severity: 'WARN' }]
  // ليلي قبل الأسبوع ثم صباحي سبع أيام
  assert.deepEqual(checks.employeeViolations(5, [night, morning, morning, morning, morning, morning, morning, morning], all).map(row => [row.kind, row.severity, row.detail]),
    [['MIN_REST_HOURS', 'BLOCK', 'راحة 2 ساعة بين ورديتين — الحد 11'], ['MAX_WEEK_HOURS', 'WARN', '56 ساعة في الأسبوع — الحد 48']])
  // أيام الراحة بتفصل: مفيش راحة قصيرة ولا ساعات زيادة
  assert.deepEqual(checks.employeeViolations(5, [null, morning, morning, morning, morning, morning, null, null], all), [])
  // اليوم اللي قبل الأسبوع بيدخل في الراحة بس، مش في ساعات الأسبوع
  assert.deepEqual(checks.employeeViolations(5, [{ start: '00:00', end: '23:00' }, null, null, null, null, null, null, null], all), [])
  assert.deepEqual(checks.employeeViolations(5, [null, { start: '06:00', end: '19:00' }, null, null, null, null, null, null], all).map(row => row.detail), ['وردية 13 ساعة — الحد 12'])
  // شدة مش معروفة بتتجاهل، والحد بالكسور
  assert.deepEqual(checks.employeeViolations(5, [null, morning, null, null, null, null, null, null], [{ kind: 'MAX_DAY_HOURS', limitHours: 7.5, severity: 'LOUD' }, { kind: 'MAX_DAY_HOURS', limitHours: 7.5, severity: 'WARN' }]).map(row => row.detail),
    ['وردية 8 ساعة — الحد 7.5'])
  assert.deepEqual(checks.ruleFields({ kind: 'MAX_WEEK_HOURS', limitHours: 48, severity: 'BLOCK' }).fields, { kind: 'MAX_WEEK_HOURS', limitHours: 48, severity: 'BLOCK', branchId: null, isActive: true })
  assert.deepEqual([{ kind: 'MAX_DAY_HOURS', limitHours: 25, severity: 'WARN' }, { kind: 'MAX_WEEK_HOURS', limitHours: 169, severity: 'WARN' }, { kind: 'MAX_DAY_HOURS', limitHours: 8.123, severity: 'WARN' }, { kind: 'MAX_DAY_HOURS', limitHours: 8 }]
    .map(body => checks.ruleFields(body).fields), [null, null, null, null])
  assert.deepEqual(checks.coverageFields({ shiftId: 2, skillId: 3, minLevel: 'advanced', minCount: 2, severity: 'WARN' }).fields, { shiftId: 2, skillId: 3, minLevel: 'advanced', minCount: 2, severity: 'WARN', isActive: true })
  assert.deepEqual([rules.publishFields({ week: '2026-10-11', branchId: 3, overrideReason: ' سبب  واضح ' }).fields.overrideReason, rules.publishFields({ week: '2026-10-11', branchId: 3 }).fields.overrideReason,
    rules.publishFields({ week: '2026-10-11', branchId: 3, overrideReason: 'س' }).fields], ['سبب واضح', null, null])
  // مصدر الكود: الفحص قبل أي كتابة في النشر، والمنع بيوقّف من غير سبب، والمخالفات بتتسجّل على النشر
  const service = read('attendance/schedule-tools.service.ts')
  const publish = service.slice(service.indexOf('async publish('), service.indexOf('// ===== (ب) قواعد فحص الجدول'))
  assert.ok(publish.indexOf('await weekViolations(em, fields.week, fields.branchId)') < publish.indexOf('getRepository(SchedulePublication).save('))
  assert.match(publish, /if \(blocked > 0 && !fields\.overrideReason\) throw new ConflictException\(BLOCKED\(blocked\)\)/)
  assert.match(publish, /overrideReason: item\.severity === 'BLOCK' \? fields\.overrideReason : null/)
  const core = read('attendance/schedule-checks.ts')
  assert.match(core, /const shift = special \?\? \(off\.has\(weekday\) \? null : weekly \?\? null\)/, 'وردية اليوم الخاص بتسبق، وأيام الراحة من جدول الدوام')
  assert.match(core, /\(!skill\.validUntil \|\| skill\.validUntil >= week\)/)
  assert.doesNotMatch(core, /INSERT INTO|UPDATE dbo|DELETE FROM|\.save\(|\.update\(/, 'الفحص قراءة بس')
  const panel = web('app/attendance/schedule-tools/RulesPanel.tsx')
  assert.match(panel, /\{tools\.companyWide && data\.skills\.length > 0 && \(/)
  assert.match(web('app/attendance/schedule-tools/page.tsx'), /<RulesPanel tools=\{data\} week=\{publish\.week\} branchId=\{publish\.branchId\} \/>/)
})
