// B4.8 (ب) — حماية البيانات: موعد إخطار حادثة التسريب (72 ساعة) ومدد الاحتفاظ. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/settings/data-protection')
const at = iso => new Date(iso)

test('DPU-01: موعد الإخطار = الاكتشاف + 72 ساعة؛ والساعات الباقية والتأخير للحادثة اللي لسه مااتبلّغتش بس', () => {
  const discovered = at('2026-10-05T09:30:00Z')
  assert.equal(rules.BREACH_NOTIFY_HOURS, 72)
  assert.equal(rules.breachNotifyBy(discovered).toISOString(), '2026-10-08T09:30:00.000Z')
  const open = { status: 'OPEN', notifyBy: rules.breachNotifyBy(discovered), notifiedAt: null }
  assert.deepEqual([rules.breachDeadline(open, at('2026-10-05T09:30:00Z')), rules.breachDeadline(open, at('2026-10-08T08:31:00Z')), rules.breachDeadline(open, at('2026-10-08T09:30:00Z')),
    rules.breachDeadline(open, at('2026-10-08T12:00:00Z'))],
    [{ hoursLeft: 72, overdue: false, notifiedLate: false }, { hoursLeft: 0, overdue: false, notifiedLate: false }, { hoursLeft: 0, overdue: false, notifiedLate: false }, { hoursLeft: -3, overdue: true, notifiedLate: false }])
  // اتبلّغت: مفيش عدّاد؛ وبعد الموعد = «اتبلّغت متأخر»
  assert.deepEqual([rules.breachDeadline({ ...open, status: 'NOTIFIED', notifiedAt: at('2026-10-07T10:00:00Z') }, at('2026-10-20T00:00:00Z')),
    rules.breachDeadline({ ...open, status: 'CLOSED', notifiedAt: at('2026-10-09T10:00:00Z') }, at('2026-10-20T00:00:00Z'))],
    [{ hoursLeft: null, overdue: false, notifiedLate: false }, { hoursLeft: null, overdue: false, notifiedLate: true }])
})

test('DPU-02: خانات الحادثة — العنوان ووقت الاكتشاف (مش في المستقبل) وعدد المتأثرين، وملاحظة الإخطار مطلوبة', () => {
  const now = at('2026-10-08T12:00:00Z')
  const good = rules.breachFields({ title: '  تسريب  ملف رواتب ', details: ' اتبعت لبريد غلط ', discoveredAt: '2026-10-08T09:00:00.000Z', affectedCount: 12 }, now)
  assert.deepEqual([good.error, good.fields.title, good.fields.details, good.fields.discoveredAt.toISOString(), good.fields.notifyBy.toISOString(), good.fields.affectedCount],
    [null, 'تسريب ملف رواتب', 'اتبعت لبريد غلط', '2026-10-08T09:00:00.000Z', '2026-10-11T09:00:00.000Z', 12])
  assert.deepEqual([rules.breachFields({ title: 'حادثة', discoveredAt: '2026-10-08T09:00:00Z' }, now).fields.details, rules.breachFields({ title: 'حادثة', discoveredAt: '2026-10-08T09:00:00Z', affectedCount: '' }, now).fields.affectedCount], [null, null])
  for (const [input, message] of [[{ title: 'حا', discoveredAt: '2026-10-08T09:00:00Z' }, /عنوان الحادثة/], [{ title: 'حادثة' }, /وقت اكتشاف/], [{ title: 'حادثة', discoveredAt: '2026-10-08' }, /وقت اكتشاف/],
    [{ title: 'حادثة', discoveredAt: 'bad' }, /وقت اكتشاف/], [{ title: 'حادثة', discoveredAt: '2026-10-09T09:00:00Z' }, /المستقبل/], [{ title: 'حادثة', discoveredAt: '2026-10-08T09:00:00Z', affectedCount: 1.5 }, /عدد المتأثرين/],
    [{ title: 'حادثة', discoveredAt: '2026-10-08T09:00:00Z', affectedCount: '12' }, /عدد المتأثرين/], [{ title: 'حادثة', discoveredAt: '2026-10-08T09:00:00Z', details: 'x'.repeat(2001) }, /2000 حرف/]]) {
    const result = rules.breachFields(input, now)
    assert.equal(result.fields, null, JSON.stringify(input).slice(0, 80)); assert.match(result.error, message)
  }
  assert.deepEqual([rules.breachNote(' هيئة البيانات — مرجع 55 ', 500, true), rules.breachNote('', 1000, false), rules.breachNote('اب', 500, true).error !== null, rules.breachNote('x'.repeat(501), 500, false).error !== null],
    [{ note: 'هيئة البيانات — مرجع 55', error: null }, { note: null, error: null }, true, true])
})

test('DPU-03: مدد الاحتفاظ — فاضي أو صفر أو غلط = من غير مدة (الافتراضي)، وحد التاريخ = النهارده ناقص الشهور', () => {
  assert.deepEqual(['24', ' 6 ', '600', '', '0', '601', '-3', '2.5', 'abc', null, undefined].map(rules.retentionMonths), [24, 6, 600, null, null, null, null, null, null, null, null])
  assert.deepEqual([rules.retentionCutoff('2026-10-08', 24), rules.retentionCutoff('2026-10-08', 10), rules.retentionCutoff('2026-03-31', 1), rules.retentionCutoff('2024-02-29', 12), rules.retentionCutoff('2026-01-15', 1)],
    ['2024-10-08', '2025-12-08', '2026-02-28', '2023-02-28', '2025-12-15'])
  assert.deepEqual(rules.RETENTION_TYPES.map(type => [type.key, type.configKey]), [['ex_employees', 'privacy.retention.ex_employees_months'], ['candidates', 'privacy.retention.candidates_months']])
  assert.equal(rules.retentionTaskTitle(rules.RETENTION_TYPES[0]), 'مراجعة بيانات عدّت مدة الاحتفاظ: ملفات الموظفين المؤرشفين')
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.equal(configSeed.some(row => rules.RETENTION_CONFIG_KEYS.includes(row.key)), false, 'مش مبذورة: من غير مدة لحد ما المالك يحددها')
})

test('DPU-04: مصدر الكود — مفيش مسح، ولحساب بكل الفروع بصلاحية الإعدادات، ومهمة يومية بتعمل مهام مراجعة بس', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const service = read('settings/data-protection.service.ts')
  assert.doesNotMatch(service, /DELETE |\.delete\(|\.remove\(|TRUNCATE/i, 'النظام مابيمسحش حاجة')
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 4, 'العرض وتسجيل الحادثة وخطوتها ومدة الاحتفاظ لحساب بكل الفروع')
  assert.match(service, /if \(!\(await this\.modules\.jobEnabled\('privacy\.retention-alerts'\)\) \|\| !\(await tasksTableReady\(this\.ds\.manager\)\)\) return 0/)
  assert.match(service, /FROM \[tasks\] WITH \(UPDLOCK, HOLDLOCK\) WHERE \[createdByUserId\] = 0 AND \[title\] = @0 AND \[branchId\] = @1 AND \[status\] IN/)
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)/, 'خطوة الحادثة تحت قفل صفها')
  const controller = read('settings/data-protection.controller.ts')
  assert.deepEqual([(controller.match(/@Perm\('settings\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [5, 5, false])
  assert.match(read('settings/settings.controller.ts'), /if \(RETENTION_CONFIG_KEYS\.includes\(dto\.key\)\) throw new BadRequestException\(RETENTION_REFUSAL\)/)
  assert.match(read('modules-registry/registry.ts'), /jobs: \['tasks\.reminders', 'privacy\.retention-alerts'\]/)
  assert.match(read('scheduler/scheduled-jobs.ts'), /'privacy\.retention-alerts': \{ cron: '50 7 \* \* \*', module: 'privacy\.retention-alerts', lock: 'privacy\.retention-alerts'/)
  assert.match(read('scheduler/scheduled-jobs.runner.ts'), /@Scheduled\('privacy\.retention-alerts'\)\n\s+retentionAlerts\(\) \{\n\s+return this\.jobs\.tick\('privacy\.retention-alerts', \(\) => this\.use\(DataProtectionService\)\.raiseRetentionTasks\(\)\)/)
  assert.equal(rules.RETENTION_JOB, 'privacy.retention-alerts')
})
