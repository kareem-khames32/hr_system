// B5.5 (أ) — أدوات الجدولة: بداية الأسبوع، خانات التدوير، قواعد النسخ والتطبيق والنشر، ومصدر الكود والواجهة. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/attendance/schedule-tools')
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
  assert.deepEqual(rules.publishFields({ week: '2026-10-11', branchId: 3, note: ' ملاحظة ' }).fields, { week: '2026-10-11', branchId: 3, note: 'ملاحظة' })
  assert.deepEqual([{ week: '2026-10-12', branchId: 3 }, { week: '2026-10-11' }, { week: '2026-10-11', branchId: 3, note: 'x'.repeat(301) }].map(body => rules.publishFields(body).fields), [null, null, null])
})

test('STU-03: مصدر الكود — المسارات ورا الموديول والميزة وصلاحية إدارة الحضور؛ الكتابة من حفظ الجدول القايم بس؛ والنشر حدث إشعار بيتحكم عليه وقت التوزيع ووقت الإرسال', () => {
  const feature = registry.MODULES.shifts.features['shifts.advanced']
  assert.deepEqual([feature.default, feature.routes, registry.MODULES.shifts.routes, registry.MODULES.shifts.defaultEnabled], [false, ['/attendance/schedule-tools'], ['/attendance/shifts', '/attendance/weekly-schedule'], true])
  assert.deepEqual([registry.routeOwner('/attendance/schedule-tools'), registry.routeOwner('/attendance/weekly-schedule')], [{ module: 'shifts', feature: 'shifts.advanced' }, { module: 'shifts', feature: null }])
  const controller = read('attendance/schedule-tools.controller.ts')
  assert.match(controller, /@RequireModule\('shifts'\)\n@RequireFeature\('shifts\.advanced'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('attendance\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length], [6, 6])
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
