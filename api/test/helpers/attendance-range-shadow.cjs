'use strict'
// وضع «الظل» لدفعة القراءة بمدى محمّل (AttendanceService.readOnlyRange، B1.12) — للاختبارات فقط، بـ--require قبل ملف الاختبار:
//   node --require ./test/helpers/attendance-range-shadow.cjs --test test/<ملف>.integration.cjs
// فحص لقطة الحضور وقت اعتماد المسير بيعيد حساب كل يوم فات. هنا كل يوم بيتحسب مرتين جوه نفس المعاملة: من المدى المحمّل مقدمًا،
// وبالاستعلام العادي (نسخة خدمة مستقلة من غير ذاكرة دفعة). أي فرق في اللي رجع = خطأ بيوقّع الاعتماد، فالاختبار نفسه بيقع.
// المقارنة على كل حقول اليوم الراجع ما عدا `computedAt` (لحظة الحساب نفسها، مختلفة بين النداءين بطبيعتها).
// الملخص بيتطبع في الآخر: RANGE_SHADOW_SUMMARY {ranges, compared, mismatches}.
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..', '..')
require(path.join(apiRoot, 'node_modules/ts-node')).register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require(path.join(apiRoot, 'node_modules/reflect-metadata'))
const { AttendanceService } = require(path.join(apiRoot, 'src/attendance/attendance.service'))

const VOLATILE = new Set(['computedAt'])
const summary = { ranges: 0, compared: 0, mismatches: 0 }
const plainJson = value => JSON.parse(JSON.stringify(value ?? null))
/** مسارات الحقول المختلفة بين قيمتين (أول 20) */
function differences(a, b, at = '', out = []) {
  if (out.length >= 20) return out
  if (a === b) return out
  const objects = a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)
  if (!objects) { out.push(`${at || '(root)'}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`.slice(0, 300)); return out }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!at && VOLATILE.has(key)) continue
    differences(a[key], b[key], at ? `${at}.${key}` : key, out)
  }
  return out
}
const original = AttendanceService.prototype.readOnlyRange
AttendanceService.prototype.readOnlyRange = async function (em, employeeIds, from, to) {
  const ranged = await original.call(this, em, employeeIds, from, to)
  // المسار القديم بالحرف: نفس مدير المعاملة، من غير دفعة ولا مدى
  const plain = this.inManager(em)
  const fast = ranged.computeDay.bind(ranged)
  summary.ranges += 1
  ranged.computeDay = async (...args) => {
    const fromRange = await fast(...args), fromQueries = await plain.computeDay(...args)
    summary.compared += 1
    const diff = differences(plainJson(fromRange), plainJson(fromQueries))
    if (diff.length) {
      summary.mismatches += 1
      throw new Error(`RANGE_SHADOW_MISMATCH employee ${args[0]} date ${args[1]} (المدى != الاستعلام): ${diff.join(' | ')}`)
    }
    return fromRange
  }
  return ranged
}

// الغياب اللحظي (السجل اليومي وكارت «غائبون»): نفس الطلب بيتحسب بذاكرة الدفعة وبالمسار القديم (batch=false)، والصفوف لازم تتطابق.
// الحسابين في لحظتين متتاليتين؛ موظف على حافة السماحية بالظبط ممكن يفرق بينهم، فالمقارنة بتتعاد مرة قبل ما تعتبره فرق.
const originalLive = AttendanceService.prototype.liveAbsences
AttendanceService.prototype.liveAbsences = async function (date, scope, options = {}) {
  if (options.batch === false) return originalLive.call(this, date, scope, options)
  const compare = async () => {
    const batched = await originalLive.call(this, date, scope, options), plain = await originalLive.call(this, date, scope, { ...options, batch: false })
    return { batched, diff: differences(plainJson(batched), plainJson(plain)) }
  }
  let result = await compare()
  if (result.diff.length) result = await compare()
  summary.live = (summary.live ?? 0) + 1
  summary.liveRows = (summary.liveRows ?? 0) + result.batched.length
  if (result.diff.length) {
    summary.mismatches += 1
    throw new Error(`LIVE_SHADOW_MISMATCH ${date} (الدفعة != القديم): ${result.diff.join(' | ')}`)
  }
  return result.batched
}
process.on('exit', () => console.log('RANGE_SHADOW_SUMMARY ' + JSON.stringify(summary)))
