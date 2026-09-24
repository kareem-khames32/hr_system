'use strict'
// المراجعة المستقلة 24 سبتمبر (الجولة التانية — CR2-B01 وCR2-N04): حساب مسير 500 موظف كان بيقع عند حفظ أعضائه
// (حد SQL Server 2,100 قيمة للجملة)، وكان بياخد 517 ثانية لحد ما يقع؛ وشاشة الحضور اليومي 122–223 ثانية.
// الإصلاح تلات حاجات، والاختبارات دي بتثبتها من غير SQL:
//   ١) الحفظ على دفعات تحت الحد (common/sql-batches.ts) — وحفظ أعضاء المسير بيستخدمه.
//   ٢) حزمة TDS أكبر (common/sql-packet-size.ts) — الاستعلام الطويل ماكانش بيتقسم ويقف ~48 مللي.
//   ٣) ذاكرة دفعة لحساب الأيام (AttendanceService.batchScope): القراءات المرجعية الثابتة مرة واحدة للدفعة.
// التطابق مع المسار القديم مثبت على SQL حقيقي بوضع الظل (helpers/attendance-batch-shadow.cjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { SQL_SERVER_PARAMETER_BUDGET, sqlBatchSize, saveInSqlBatches } = require('../src/common/sql-batches')
const { DEFAULT_DB_PACKET_SIZE, dbPacketSize } = require('../src/common/sql-packet-size')
const { AttendanceService } = require('../src/attendance/attendance.service')
const { resolveAttendanceGrace } = require('../src/attendance/attendance-rule-history')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n')

test('PB-01: حجم الدفعة تحت حد SQL Server لأي عدد أعمدة، وأعضاء المسير بيتحفظوا على دفعات', async () => {
  assert.ok(SQL_SERVER_PARAMETER_BUDGET < 2100, 'هامش تحت الحد الفعلي')
  for (const columns of [1, 6, 7, 21, 45, 3000]) {
    const size = sqlBatchSize(columns)
    assert.ok(size >= 1)
    assert.ok(size * columns <= SQL_SERVER_PARAMETER_BUDGET || size === 1, `${columns} عمود × ${size} صف`)
  }
  // 500 عضو × 6 أعمدة = 3,000 قيمة في جملة واحدة كانت بترجع الخطأ 8003
  assert.ok(sqlBatchSize(6) * 6 <= 2000 && 500 > sqlBatchSize(6), 'مسير 500 بيتقسم لأكتر من دفعة')
  // المساعد بيمرر الدفعة من عدد أعمدة الكيان نفسه (إضافة عمود بعدين ماترجّعش الخطأ)
  const calls = []
  const repo = { metadata: { columns: new Array(7).fill({}) }, async save(rows, options) { calls.push({ rows: rows.length, options }); return rows } }
  const rows = Array.from({ length: 600 }, (_, i) => ({ i }))
  assert.equal(await saveInSqlBatches(repo, rows), rows)
  assert.deepEqual(calls, [{ rows: 600, options: { chunk: sqlBatchSize(7) } }])
  calls.length = 0
  assert.deepEqual(await saveInSqlBatches(repo, []), [])
  assert.equal(calls.length, 0, 'مفيش جملة لقائمة فاضية')
  // حفظ أعضاء المسير في الحساب بيستخدم المساعد، مش save للمصفوفة كلها
  const service = read('src/payroll/payroll.service.ts')
  assert.ok(service.includes('if (newMembers.length) await saveInSqlBatches(members, newMembers)'))
  assert.ok(!service.includes('if (newMembers.length) await members.save(newMembers)'))
})

test('PB-02: حجم حزمة TDS الافتراضي 32,767 ومتضبط من DB_PACKET_SIZE في حدود SQL Server بس', () => {
  assert.equal(DEFAULT_DB_PACKET_SIZE, 32767)
  assert.equal(dbPacketSize(undefined), 32767)
  assert.equal(dbPacketSize(''), 32767)
  assert.equal(dbPacketSize('16384'), 16384)
  assert.equal(dbPacketSize('4096'), 4096)
  for (const bad of ['511', '32768', '70000', '12.5', 'abc', '-1']) assert.equal(dbPacketSize(bad), 32767, bad)
  const module = read('src/app.module.ts')
  assert.ok(module.includes("packetSize: dbPacketSize(config.get<string>('DB_PACKET_SIZE')),"), 'الاتصال بيستخدمه')
})

/** خدمة حضور بمستودعات اصطناعية بتعد القراءات — نفس أسماء الحقول اللي inManager بيعيد ربطها. */
function countingService() {
  const counts = new Map()
  const names = ['punches', 'schedule', 'days', 'employees', 'overtime', 'corrections', 'config', 'leaves', 'requests', 'holidays',
    'branches', 'dayOverrides', 'scheduleRules', 'overtimePeriods', 'permissionTypes', 'workSchedules', 'shiftsCatalog']
  const repoFor = (name, manager) => ({
    target: name, manager,
    async findOne(query) { counts.set(name, (counts.get(name) ?? 0) + 1); return name === 'employees' ? { id: query.where.id, fullName: 'موظف' } : null },
    async find() { counts.set(name, (counts.get(name) ?? 0) + 1); return [] },
  })
  const root = { queryRunner: null }
  const em = { queryRunner: { isTransactionActive: true }, getRepository: target => repoFor(target, em) }
  const service = Object.create(AttendanceService.prototype)
  for (const name of names) service[name] = repoFor(name, root)
  service.batch = null
  return { service, em, counts }
}

test('PB-03: ذاكرة الدفعة بتقرا القراءة المرجعية مرة واحدة، ومن غير دفعة السلوك القديم بالحرف', async () => {
  const { service, em, counts } = countingService()
  // من غير دفعة: كل نداء قراءة جديدة (زي زمان)
  await service.employeeRow(7); await service.employeeRow(7)
  assert.equal(counts.get('employees'), 2)
  // جوّه الدفعة: مرة واحدة للموظف الواحد، ومرة لكل موظف تاني
  counts.clear()
  const scope = service.batchScope(em)
  const first = await scope.employeeRow(7), second = await scope.employeeRow(7)
  await scope.employeeRow(8)
  assert.equal(counts.get('employees'), 2)
  assert.equal(first, second, 'نفس الصف للموظف نفسه')
  // الإعداد العام (سماحية التأخير) كمان مرة واحدة — بقراءته الحقيقية attendanceGeneralGrace على معاملة الدفعة
  let graceReads = 0
  em.findOneBy = async () => { graceReads++; return { value: '10' } }
  assert.equal(await scope.generalGraceOf(), 10)
  assert.equal(await scope.generalGraceOf(), 10)
  assert.equal(graceReads, 1)
  // ومن غير دفعة: قراءة لكل نداء
  graceReads = 0
  const plain = service.inManager(em)
  await plain.generalGraceOf(); await plain.generalGraceOf()
  assert.equal(graceReads, 2)
})

test('PB-04: نسخة لمعاملة تانية ماتورّثش ذاكرة الدفعة، والسماحية دالة عادية مش حقل سهم ماسك الخدمة الأصلية', async () => {
  const { service, em } = countingService()
  const scope = service.batchScope(em)
  assert.ok(scope.batch, 'الدفعة ليها ذاكرتها')
  assert.equal(service.batch, null, 'الخدمة الأصلية من غير ذاكرة')
  const other = { queryRunner: { isTransactionActive: true }, getRepository: target => ({ target, manager: other }) }
  assert.equal(scope.inManager(other).batch, null, 'معاملة تانية تبدأ من غير ذاكرة')
  // حقل سهم كان هيتنسخ بـinManager وهو ماسك this بتاع الخدمة الأصلية (من غير ذاكرة ولا معاملة)
  assert.equal(Object.prototype.hasOwnProperty.call(scope, 'generalGraceOf'), false)
  assert.equal(typeof AttendanceService.prototype.generalGraceOf, 'function')
  assert.equal(scope.days.manager, em, 'مستودعات الدفعة على معاملتها')
})

test('PB-05: وردية اليوم في الدفعة بتتحل مرة، وكل نداء ياخد نسخة مستقلة (تعديلها مابيوصلش للمحفوظ)', async () => {
  const { service, em } = countingService()
  const scope = service.batchScope(em)
  let resolved = 0
  scope.resolveShift = async (employeeId, date) => { resolved++; return { name: 'صباحي', start: '08:00', end: '16:00', employeeId, date, sourceSettings: { graceMinutes: 10, windows: [1, 2] } } }
  const a = await scope.shiftFor(3, '2026-09-01')
  a.sourceSettings.graceMinutes = 99
  a.sourceSettings.windows.push(3)
  const b = await scope.shiftFor(3, '2026-09-01')
  assert.equal(resolved, 1, 'اتحلت مرة واحدة لنفس الموظف ونفس اليوم')
  assert.deepEqual(b.sourceSettings, { graceMinutes: 10, windows: [1, 2] }, 'التعديل على نسخة مابيوصلش للتانية')
  await scope.shiftFor(3, '2026-09-02')
  assert.equal(resolved, 2, 'يوم تاني = حل جديد')
  // من غير دفعة: كل نداء بيتحل (السلوك القديم)
  let plain = 0
  service.resolveShift = async () => { plain++; return { name: 'x', sourceSettings: null } }
  await service.shiftFor(3, '2026-09-01'); await service.shiftFor(3, '2026-09-01')
  assert.equal(plain, 2)
})

test('PB-06: السماحية العامة بتتقري بالقارئ اللي بيتمرر (الدفعة)، ومن غيره نفس قراءة الإعداد', async () => {
  const source = { sourceType: 'SHIFT', sourceId: 1, sourceVersionId: null, sourceVersion: null, sourceSettings: {} }
  let reads = 0
  const minutes = await resolveAttendanceGrace({}, '2026-09-01', source, null, async () => { reads++; return 12 })
  assert.deepEqual(minutes, { minutes: 12, source: 'LEGACY_CURRENT_CONFIG' })
  assert.equal(reads, 1)
  // من غير قارئ: قراءة الإعداد نفسها (نفس المصدر والتحقق)
  const em = { async findOneBy() { return { value: '15' } } }
  assert.deepEqual(await resolveAttendanceGrace(em, '2026-09-01', source, null), { minutes: 15, source: 'LEGACY_CURRENT_CONFIG' })
  // سماحية الوردية نفسها مابتلمسش القارئ أصلًا
  assert.deepEqual(await resolveAttendanceGrace({}, '2026-09-01', { ...source, sourceSettings: { graceMinutes: 5 } }, null, async () => { throw new Error('مايتقريش') }),
    { minutes: 5, source: 'SHIFT_OVERRIDE' })
})

test('PB-07: الدفعة متوصّلة في المسارين الكبار ومش في غيرهم، ومفتاح الإعفاءات بنفس المدى بالظبط', () => {
  const accrual = read('src/payroll/payroll-daily-accrual.service.ts')
  assert.ok(accrual.includes('const attendance = this.attendance.batchScope(em)'))
  assert.ok(accrual.includes('await attendance.computeDay(input.employeeId, date, false, false)'))
  assert.ok(!accrual.includes('this.attendance.computeDay('), 'كل حسابات الأيام في التراكم من الدفعة')
  const attendance = read('src/attendance/attendance.service.ts')
  const projection = attendance.slice(attendance.indexOf('  private async projectExemptionDays('), attendance.indexOf('  private async withDerivedSource<'))
  // الشاشة بمستودعاتها زي ما هي (نفس اللي كانت بتقرا بيه)، والتراكم بس اللي بيعيد الربط على معاملته
  assert.ok(projection.includes('const scope = this.withBatch()'))
  assert.ok(!projection.includes('this.computeDay('), 'صفوف الشاشة كلها من الدفعة')
  // الإعفاءات بمفتاح المدى نفسه: التحميل بيفحص تداخل النوافذ جوّه المدى، ومدى أوسع كان هيرمي تداخل مالوش علاقة
  assert.ok(attendance.includes('this.batched(`EXEMPTIONS:${employeeId}:${from}:${to}`, () => loadAttendanceExemptions(this.days.manager, employeeId, from, to))'))
  // الجداول اللي حساب اليوم بيكتب فيها (أيام الحضور والإضافي والطلبات) أو بيقرا دليلها (البصمات والتصحيحات) مابتدخلش الذاكرة
  const batchedLines = attendance.split('\n').filter(line => line.includes('this.batched('))
  assert.ok(batchedLines.length >= 10, 'السطور المتذاكرة موجودة فعلًا')
  // (this.days.manager هي المعاملة نفسها مش قراءة من جدول أيام الحضور)
  const writtenOrEvidence = /this\.(days|punches|corrections|overtime|requests|dayOverrides)\.(?!manager\b)/
  assert.deepEqual(batchedLines.filter(line => writtenOrEvidence.test(line)), [])
})
