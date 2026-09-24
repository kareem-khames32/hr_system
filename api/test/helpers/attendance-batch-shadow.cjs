'use strict'
// وضع «الظل» لدفعة حساب الأيام (AttendanceService.batchScope) — للاختبارات فقط، بـ--require قبل ملف الاختبار.
// كل نداء لتراكم أيام موظف (PayrollDailyAccrualService.accrueEmployeeRange) بيتحسب مرتين داخل نفس المعاملة:
//   ١) بالطريقة القديمة بالحرف (من غير ذاكرة الدفعة) بعد نقطة حفظ SQL، وتتاخد لقطة من كل اللي اتكتب، ثم يرجع لنقطة الحفظ.
//   ٢) بالطريقة الجديدة (بذاكرة الدفعة) — دي اللي بتفضل — وتتاخد نفس اللقطة.
// أي فرق في أيام الحضور أو الإضافي أو صفوف التراكم أو حالة طلبات الإضافي = خطأ بيوقع الاختبار نفسه.
// كده كل سيناريوهات اختبارات الحضور والرواتب الموجودة (ليلية، إضافي، إجازات، إعفاءات، إيقاف، أذونات، تصحيحات...)
// بتقارن المسارين من غير ما نبني عالم اختبار جديد.
//
// اللي بيتساوى قبل المقارنة (مش فرق في النتيجة):
//   - أعمدة وقت الكتابة (…At): بتختلف بالمللي، فبتتقارن «فاضي أو ليه قيمة» بس.
//   - أرقام الصفوف (id) وأي إشارة لصف اتعمل جوّه الحساب (attendanceDayId وovertimeIds…): SQL Server مابيرجّعش عدّاد
//     الترقيم التلقائي مع الرجوع لنقطة الحفظ، فالحساب التاني بياخد أرقام جديدة. الإشارة بتتحول لمفتاح الصف الطبيعي.
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..', '..')
require(path.join(apiRoot, 'node_modules/ts-node')).register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require(path.join(apiRoot, 'node_modules/reflect-metadata'))
const { AttendanceService } = require(path.join(apiRoot, 'src/attendance/attendance.service'))
const { PayrollDailyAccrualService } = require(path.join(apiRoot, 'src/payroll/payroll-daily-accrual.service'))

const batchOn = AttendanceService.prototype.batchScope
const batchOff = function (em) { return this.inManager(em) }
const accrue = PayrollDailyAccrualService.prototype.accrueEmployeeRange
const stats = { calls: 0, compared: 0, rows: 0, mismatches: 0 }
let savepoint = 0

const dateKey = value => value instanceof Date ? value.toISOString() : String(value)

/** يحوّل أي إشارة لصف يوم حضور أو قيد إضافي (بالرقم) لمفتاحه الطبيعي، جوّه القيم وجوّه JSON المخزن نصًا. */
function withNaturalRefs(value, refs, key = '') {
  if (Array.isArray(value)) return value.map(item => withNaturalRefs(item, refs, key))
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withNaturalRefs(v, refs, k)]))
  }
  if (typeof value === 'number') {
    if (/^attendanceDayIds?$/.test(key) && refs.days.has(value)) return 'day:' + refs.days.get(value)
    if (/^overtime(Entry)?Ids?$/.test(key) && refs.overtime.has(value)) return 'overtime:' + refs.overtime.get(value)
  }
  if (typeof value === 'string' && value.length > 1 && (value[0] === '{' || value[0] === '[')) {
    try { return JSON.stringify(withNaturalRefs(JSON.parse(value), refs)) } catch { return value }
  }
  return value
}

function normalizeRow(row, refs) {
  const out = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id') continue
    if (/At$/.test(key)) { out[key] = value == null ? null : '<ts>'; continue }
    out[key] = withNaturalRefs(value instanceof Date ? value.toISOString() : value, refs, key)
  }
  return out
}

async function snapshot(em, input) {
  const from = input.from, to = input.to
  const days = await em.query('SELECT * FROM attendance_days WHERE employeeId = @0', [input.employeeId])
  const overtime = await em.query('SELECT * FROM overtime_entries WHERE employeeId = @0', [input.employeeId])
  const refs = {
    days: new Map(days.map(row => [row.id, `${row.employeeId}|${dateKey(row.date)}`])),
    overtime: new Map(overtime.map(row => [row.id, `${row.employeeId}|${dateKey(row.date)}|${row.source ?? ''}|${row.startTime ?? ''}|${row.requestId ?? ''}`])),
  }
  const inRange = row => { const d = dateKey(row.date).slice(0, 10); return d >= from && d <= to }
  const table = rows => rows.map(row => normalizeRow(row, refs)).map(row => JSON.stringify(row)).sort()
  return {
    days: table(days.filter(inRange)),
    overtime: table(overtime.filter(inRange)),
    accruals: table(await em.query('SELECT * FROM payroll_daily_accrual WHERE employeeId = @0 AND period = @1', [input.employeeId, input.period])),
    overtimeRequests: table(await em.query(`SELECT r.id AS requestId, r.status FROM requests r
      WHERE r.id IN (SELECT o.requestId FROM overtime_entries o WHERE o.employeeId = @0 AND o.requestId IS NOT NULL)`, [input.employeeId])),
  }
}

/** أول فرق: الجدول والأعمدة المختلفة وقيمتها في المسارين (مختصرة). */
function difference(off, on) {
  for (const name of Object.keys(off)) {
    if (off[name].length !== on[name].length) return { table: name, offRows: off[name].length, onRows: on[name].length }
    for (let i = 0; i < off[name].length; i++) {
      if (off[name][i] === on[name][i]) continue
      const a = JSON.parse(off[name][i]), b = JSON.parse(on[name][i])
      const columns = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      return { table: name, columns, values: Object.fromEntries(columns.slice(0, 4).map(key => [key, { off: JSON.stringify(a[key]).slice(0, 400), on: JSON.stringify(b[key]).slice(0, 400) }])) }
    }
  }
  return null
}

PayrollDailyAccrualService.prototype.accrueEmployeeRange = async function (em, input) {
  stats.calls++
  if (!em?.queryRunner?.isTransactionActive) return accrue.call(this, em, input)
  const name = `batch_shadow_${++savepoint}`
  await em.query(`SAVE TRANSACTION ${name}`)
  let offError = null, offSnapshot = null
  AttendanceService.prototype.batchScope = batchOff
  try {
    await accrue.call(this, em, input)
    offSnapshot = await snapshot(em, input)
  } catch (error) { offError = error } finally { AttendanceService.prototype.batchScope = batchOn }
  await em.query(`ROLLBACK TRANSACTION ${name}`)
  let result, onError = null
  try { result = await accrue.call(this, em, input) } catch (error) { onError = error }
  if (offError || onError) {
    const same = !!offError && !!onError && String(offError.message) === String(onError.message)
    if (!same) {
      stats.mismatches++
      const detail = { employeeId: input.employeeId, period: input.period, off: offError ? String(offError.message) : 'ok', on: onError ? String(onError.message) : 'ok' }
      console.log('BATCH_SHADOW_MISMATCH ' + JSON.stringify(detail))
      throw new Error('BATCH_SHADOW_MISMATCH ' + JSON.stringify(detail))
    }
    throw onError
  }
  const onSnapshot = await snapshot(em, input)
  stats.compared++
  stats.rows += Object.values(onSnapshot).reduce((sum, rows) => sum + rows.length, 0)
  const diff = difference(offSnapshot, onSnapshot)
  if (diff) {
    stats.mismatches++
    const detail = { employeeId: input.employeeId, period: input.period, from: input.from, to: input.to, ...diff }
    console.log('BATCH_SHADOW_MISMATCH ' + JSON.stringify(detail))
    throw new Error('BATCH_SHADOW_MISMATCH ' + JSON.stringify(detail))
  }
  return result
}

process.on('exit', () => console.log('BATCH_SHADOW_SUMMARY ' + JSON.stringify(stats)))
