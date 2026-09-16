'use strict'
// قرار المالك 16 سبتمبر: الإيقاف عن العمل لفترة (من/إلى/سبب). اختبارات صرفة للقواعد المشتركة، ولمساعد الواجهة،
// ولنقاط الربط الجراحية (تجسيد الغياب يتخطى أيام الإيقاف، والمسير يخصمها بسطر «أيام إيقاف عن العمل»).
// التكامل على SQL مؤقتة في employee-suspension.integration.cjs.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const rules = require('../src/employees/employee-suspension-rules')
const ui = require('../../src/lib/employee-suspensions-api')
const root = path.resolve(__dirname, '../..')
const period = (fromDate, toDate, status = 'ACTIVE', id = 1) => ({ id, fromDate, toDate, status })

test('الحالة مشتقة من التواريخ: «موقوف» طول الفترة، وترجع لوحدها بعدها، والملغى لا يغطي', () => {
  const list = [period('2026-09-10', '2026-09-20')]
  assert.equal(rules.displayEmployeeStatus('active', list, '2026-09-09'), 'active')
  assert.equal(rules.displayEmployeeStatus('active', list, '2026-09-10'), 'suspended')
  assert.equal(rules.displayEmployeeStatus('probation', list, '2026-09-20'), 'suspended')
  assert.equal(rules.displayEmployeeStatus('active', list, '2026-09-21'), 'active', 'بعد آخر يوم ترجع «نشط» بلا مهمة')
  assert.equal(rules.displayEmployeeStatus('notice_period', list, '2026-09-15'), 'suspended')
  assert.equal(rules.displayEmployeeStatus('terminated', list, '2026-09-15'), 'terminated')
  assert.equal(rules.displayEmployeeStatus('active', [period('2026-09-10', '2026-09-20', 'CANCELLED')], '2026-09-15'), 'active')
  assert.equal(rules.suspensionState(list[0], '2026-09-01'), 'UPCOMING')
  assert.equal(rules.suspensionState(list[0], '2026-09-15'), 'CURRENT')
  assert.equal(rules.suspensionState(list[0], '2026-09-25'), 'FINISHED')
  const both = [period('2026-10-01', '2026-10-05', 'ACTIVE', 2), period('2026-09-25', '2026-09-26', 'ACTIVE', 3)]
  assert.equal(rules.upcomingSuspension(both, '2026-09-16').id, 3, 'أقرب إيقاف قادم')
  assert.equal(rules.currentSuspension(both, '2026-10-03').id, 2)
})

test('إدخال الإيقاف والتداخل والإنهاء المبكر', () => {
  assert.equal(rules.suspensionInputIssue({ fromDate: '2026-09-10', toDate: '2026-09-12', reason: 'تحقيق إداري' }), null)
  assert.equal(rules.suspensionInputIssue({ fromDate: '2026-09-10', toDate: '', reason: 'تحقيق' }), 'تاريخ نهاية الإيقاف مطلوب وصحيح')
  assert.equal(rules.suspensionInputIssue({ fromDate: '2026-09-12', toDate: '2026-09-10', reason: 'تحقيق' }), 'نهاية الإيقاف لازم تكون في نفس يوم البداية أو بعده')
  assert.match(rules.suspensionInputIssue({ fromDate: '2026-09-10', toDate: '2026-09-10', reason: ' ا ' }), /سبب الإيقاف مطلوب/)
  assert.match(rules.suspensionInputIssue({ fromDate: '2026-01-01', toDate: '2027-01-02', reason: 'تحقيق' }), /بحد أقصى 366 يوم/)
  assert.equal(rules.suspensionInputIssue({ fromDate: '2026-02-30', toDate: '2026-03-02', reason: 'تحقيق' }), 'تاريخ بداية الإيقاف مطلوب وصحيح')
  const existing = [period('2026-09-10', '2026-09-20'), period('2026-08-01', '2026-08-05', 'CANCELLED', 2)]
  assert.equal(rules.overlappingSuspension(existing, '2026-09-20', '2026-09-22').id, 1)
  assert.equal(rules.overlappingSuspension(existing, '2026-09-21', '2026-09-22'), null)
  assert.equal(rules.overlappingSuspension(existing, '2026-08-01', '2026-08-03'), null, 'الملغى لا يمنع')
  const current = period('2026-09-10', '2026-09-20')
  assert.deepEqual(rules.suspensionEndPlan(current, '2026-09-16', '2026-09-16'), { ok: true, status: 'ENDED_EARLY', toDate: '2026-09-15' })
  assert.deepEqual(rules.suspensionEndPlan(current, '2026-09-10', '2026-09-16'), { ok: true, status: 'CANCELLED', toDate: '2026-09-20' })
  assert.deepEqual(rules.suspensionEndPlan(current, '2026-09-20', '2026-09-16'), { ok: true, status: 'ENDED_EARLY', toDate: '2026-09-19' })
  assert.match(rules.suspensionEndPlan(current, '2026-09-21', '2026-09-16').message, /بعد نهاية الإيقاف/)
  // إيقاف انتهى (مثلًا بأثر رجعي غلط): يتلغى أو تتقدّم نهايته، والرجوع بعد نهايته بس هو المرفوض
  assert.deepEqual(rules.suspensionEndPlan(current, '2026-09-18', '2026-09-25'), { ok: true, status: 'ENDED_EARLY', toDate: '2026-09-17' })
  assert.deepEqual(rules.suspensionEndPlan(current, '2026-09-10', '2026-09-25'), { ok: true, status: 'CANCELLED', toDate: '2026-09-20' })
  assert.match(rules.suspensionEndPlan(current, '2026-09-21', '2026-09-25').message, /انتهى بالفعل في 2026-09-20 — تقدر تلغيه/)
  assert.deepEqual(rules.suspensionFreedRange(current, { status: 'CANCELLED' }, '2026-09-01'), { from: '2026-09-10', to: '2026-09-20' })
  assert.deepEqual(rules.suspensionFreedRange(current, { status: 'ENDED_EARLY' }, '2026-09-18'), { from: '2026-09-18', to: '2026-09-20' })
  assert.match(rules.suspensionEndPlan(period('2026-09-10', '2026-09-20', 'CANCELLED'), '2026-09-12', '2026-09-11').message, /ملغى/)
  assert.deepEqual(rules.suspensionEndPlan(period('2026-10-01', '2026-10-10'), '2026-09-20', '2026-09-16'), { ok: true, status: 'CANCELLED', toDate: '2026-10-10' },
    'الإيقاف القادم يتلغى قبل بدايته')
})

test('أيام المسير: يوم بيوم داخل الفترة، بلا ازدواج مع الإجازة بدون راتب، وسطر مستقل بمجموع ثابت', () => {
  const list = [period('2026-08-28', '2026-09-03', 'ACTIVE', 7), period('2026-09-20', '2026-09-20', 'CANCELLED', 8)]
  const plain = rules.suspensionPayrollDays(list, '2026-09-01', '2026-09-30')
  assert.deepEqual(plain, { days: 3, dates: ['2026-09-01', '2026-09-02', '2026-09-03'], ids: [7] })
  const withLeave = rules.suspensionPayrollDays(list, '2026-09-01', '2026-09-30', [
    { fromDate: '2026-09-02', toDate: '2026-09-02', period: 'FULL' }, { fromDate: '2026-09-03', toDate: '2026-09-03', period: 'MORNING' }])
  assert.equal(withLeave.days, 1.5, 'يوم إجازة كامل لا يُخصم تاني، ونص يوم يكمله الإيقاف')
  const exemptLeave = rules.suspensionPayrollDays(list, '2026-09-01', '2026-09-30', [{ fromDate: '2026-09-02', toDate: '2026-09-02' }], () => false)
  assert.equal(exemptLeave.days, 3, 'إجازة غير مخصومة (إعفاء) لا تلغي خصم الإيقاف')

  const lines = [{ code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 5, payPercent: 0, amount: 1000 },
    { code: 'SICK_LEAVE_75', label: 'مرضية 75%', days: 2, payPercent: 75, amount: 100 }]
  const split = rules.withSuspensionLine(lines, 3)
  assert.deepEqual(split, [
    { code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 2, payPercent: 0, amount: 400 },
    { code: 'SUSPENSION', label: 'أيام إيقاف عن العمل', days: 3, payPercent: 0, amount: 600 },
    { code: 'SICK_LEAVE_75', label: 'مرضية 75%', days: 2, payPercent: 75, amount: 100 },
  ])
  const only = rules.withSuspensionLine([{ code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 3, payPercent: 0, amount: 333.33 }], 3)
  assert.deepEqual(only, [{ code: 'SUSPENSION', label: 'أيام إيقاف عن العمل', days: 3, payPercent: 0, amount: 333.33 }])
  const odd = rules.withSuspensionLine([{ code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 3, payPercent: 0, amount: 100 }], 1)
  assert.equal(Math.round(odd.reduce((sum, line) => sum + line.amount * 100, 0)), 10000, 'مجموع السطور = العمود بالقروش')
  assert.deepEqual(rules.withSuspensionLine(lines, 0), lines)
})

test('مساعد الواجهة: نص الفترة والملاحظات', () => {
  assert.equal(ui.suspensionPeriodText({ fromDate: '2026-09-10', toDate: '2026-09-15' }), 'من 2026-09-10 إلى 2026-09-15 (6 أيام)')
  assert.equal(ui.dayCountText(1), 'يوم واحد'); assert.equal(ui.dayCountText(2), 'يومين'); assert.equal(ui.dayCountText(14), '14 يوم')
  assert.equal(ui.suspensionHistoryNote({ status: 'ACTIVE' }), null)
  assert.equal(ui.suspensionHistoryNote({ status: 'ENDED_EARLY', toDate: '2026-09-15', plannedToDate: '2026-09-20', endReason: 'انتهى التحقيق' }),
    'اتنهى بدري (كان مقرر لحد 2026-09-20) — رجع للعمل 2026-09-16 — انتهى التحقيق')
  assert.equal(ui.suspensionHistoryNote({ status: 'CANCELLED', endReason: null }), 'اتلغى')
})

test('نقاط الربط: تجسيد الغياب يتخطى أيام الإيقاف، والمسير يضيفها لعمود بدون راتب بسطر مستقل، والشاشات موصولة', () => {
  const attendance = fs.readFileSync(path.join(__dirname, '../src/attendance/attendance.service.ts'), 'utf8')
  assert.match(attendance, /const suspendedDates = await suspendedDatesBetween\(this\.days\.manager, employeeId, start, end\)/)
  assert.match(attendance, /const date = ymd\(d\)\n\s+if \(suspendedDates\.has\(date\)\) continue/)
  const payroll = fs.readFileSync(path.join(__dirname, '../src/payroll/payroll.service.ts'), 'utf8')
  assert.match(payroll, /readSuspensionPayrollDays\(em, emp\.id, coverFrom, coverTo, unpaidLeaves/)
  assert.match(payroll, /unpaidDays \+= suspension\.days\n\s+const unpaidOnlyDeduction = round2\(unpaidDays \* dayRate\)/)
  assert.match(payroll, /withSuspensionLine\(leaveLinesAll\.lines, suspension\.days\)/)
  assert.match(payroll, /policyOnDate\(date\)\.unpaidLeaveDeductible && !suspension\.dates\.includes\(date\)/, 'يوم مرضي داخل الإيقاف لا يُخصم مرتين')
  const list = fs.readFileSync(path.join(root, 'src/app/employees/page.tsx'), 'utf8')
  assert.match(list, /label: 'إيقاف مؤقت'/); assert.match(list, /<EmployeeSuspensionDialog/)
  const profile = fs.readFileSync(path.join(root, 'src/app/employees/[id]/page.tsx'), 'utf8')
  assert.match(profile, /سجل الإيقاف عن العمل/); assert.match(profile, /<EmployeeSuspensionDialog/)
  const migration = fs.readFileSync(path.join(root, 'docs/migrations/payroll/20260916_044_employee_suspension.sql'), 'utf8')
  const statements = migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(statements, /\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/i, 'ترحيل إضافي فقط')
  for (const name of ['DF_94ca48e4c59d347d3d3af20e042', 'DF_90456d3d0afb740027831fced09', 'PK_ad752868dc5a7f0f6e5d2165113', 'IDX_539d2cd7ea6e2036e8051bc7ff']) assert.ok(migration.includes(name), name)
})

// ===== مراجعة 16 سبتمبر: حاجز المسير المعتمد، تصحيح الإيقاف المنتهي، والتداخل مع الإجازات (خدمة بمدير كيانات وهمي) =====
function suspensionHarness({ suspensions = [], leaves = [], requests = [], closed = null } = {}) {
  const { EmployeesService } = require('../src/employees/employees.service')
  const calls = []
  const employee = { id: 41, branchId: 1, status: 'active', joinDate: '2020-01-01', actualStartDate: null }
  const em = {
    queryRunner: { isTransactionActive: true },
    connection: { hasMetadata: () => true },
    transaction: async fn => fn(em),
    async query(sql, params) {
      if (sql.includes('sp_getapplock')) { calls.push(['lock', params[0]]); return [{ lockResult: 0 }] }
      if (sql.includes('OBJECT_ID')) return [{ objectId: 1 }]
      if (sql.includes('payroll_runs')) {
        // assertAttendanceRulePeriodOpen: [to, from, employeeId]
        calls.push(['closed-check', params[1], params[0]])
        return closed && params[0] >= closed.from && params[1] <= closed.to ? [{ id: 77 }] : []
      }
      return []
    },
    async findOne(entity, options) {
      calls.push(['findOne', entity.name])
      if (entity.name === 'Employee') return employee
      if (entity.name === 'EmployeeSuspension') return suspensions.find(row => row.id === options.where.id) ?? null
      return null
    },
    async find(entity) {
      calls.push(['find', entity.name])
      return { EmployeeSuspension: suspensions, Leave: leaves, Request: requests }[entity.name] ?? []
    },
    create: (_entity, value) => ({ ...value }),
    async save(entity, value) { calls.push(['save', entity.name]); return Object.assign(value, { id: value.id ?? 900 }) },
    async delete(entity, where) { calls.push(['delete', entity.name, where]) },
    getRepository: entity => ({ save: async value => { calls.push(['save', entity.name]); return value } }),
  }
  const service = Object.create(EmployeesService.prototype)
  service.employees = { manager: em }
  service.logger = { warn() {}, log() {} }
  service.attendance = { materializeAbsences: async (id, from, to) => { calls.push(['materialize', from, to]); return 0 } }
  return { service, calls }
}
const conflictWith = pattern => error => error.getStatus?.() === 409 && pattern.test(error.message)
const realToday = () => require('../src/attendance/attendance.service').localDateOf(new Date())

test('إيقاف داخل مسير معتمد أو مصروف: يترفض قبل الحفظ وقبل مسح صفوف الغياب، وبرا المسير يتسجل ويمسح الغياب بعد الفحص', async () => {
  const today = realToday()
  const closed = { from: rules.addDays(today, -60), to: rules.addDays(today, -30) }
  const blocked = suspensionHarness({ closed })
  await assert.rejects(blocked.service.createSuspension(41, { fromDate: rules.addDays(today, -40), toDate: rules.addDays(today, -35), reason: 'تحقيق إداري' }, null, 1),
    conflictWith(/داخل مسير رواتب معتمد أو مصروف/))
  assert.ok(!blocked.calls.some(call => call[0] === 'save' || call[0] === 'delete'), 'لا حفظ ولا مسح غياب في فترة مقفولة')
  assert.ok(blocked.calls.findIndex(call => call[0] === 'lock') < blocked.calls.findIndex(call => call[1] === 'Employee'), 'القفل المالي قبل قفل صف الموظف')

  const open = suspensionHarness({ closed })
  const saved = await open.service.createSuspension(41, { fromDate: rules.addDays(today, -10), toDate: rules.addDays(today, -5), reason: 'تحقيق إداري' }, null, 1)
  assert.equal(saved.status, 'ACTIVE')
  const check = open.calls.findIndex(call => call[0] === 'closed-check'), del = open.calls.findIndex(call => call[0] === 'delete')
  assert.ok(check >= 0 && del > check, 'مسح صفوف الغياب بعد فحص المسير')
  assert.deepEqual(open.calls[check].slice(1), [rules.addDays(today, -10), rules.addDays(today, -5)])
})

test('إيقاف منتهي (أثر رجعي غلط): يتلغى وأيامه تتجسد تاني، إلا لو داخل مسير معتمد؛ والإنهاء المبكر يفحص الأيام اللي رجعت بس', async () => {
  const today = realToday()
  const finished = () => ({ id: 5, employeeId: 41, fromDate: rules.addDays(today, -15), toDate: rules.addDays(today, -11), plannedToDate: rules.addDays(today, -11), status: 'ACTIVE', reason: 'غلط' })
  const ok = suspensionHarness({ suspensions: [finished()] })
  const cancelled = await ok.service.endSuspension(41, 5, { returnDate: rules.addDays(today, -15), reason: 'اتسجل على موظف غلط' }, null, 1)
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.state, 'CANCELLED')
  assert.deepEqual(ok.calls.find(call => call[0] === 'closed-check').slice(1), [rules.addDays(today, -15), rules.addDays(today, -11)])
  assert.deepEqual(ok.calls.find(call => call[0] === 'materialize').slice(1), [rules.addDays(today, -15), rules.addDays(today, -11)], 'أيامه ترجع أيام عمل')

  const shortened = suspensionHarness({ suspensions: [finished()] })
  const ended = await shortened.service.endSuspension(41, 5, { returnDate: rules.addDays(today, -13) }, null, 1)
  assert.equal(ended.status, 'ENDED_EARLY'); assert.equal(ended.toDate, rules.addDays(today, -14))
  assert.deepEqual(shortened.calls.find(call => call[0] === 'closed-check').slice(1), [rules.addDays(today, -13), rules.addDays(today, -11)])

  const locked = suspensionHarness({ suspensions: [finished()], closed: { from: rules.addDays(today, -20), to: rules.addDays(today, -12) } })
  await assert.rejects(locked.service.endSuspension(41, 5, { returnDate: rules.addDays(today, -15) }, null, 1), conflictWith(/داخل مسير رواتب معتمد أو مصروف/))
  assert.ok(!locked.calls.some(call => call[0] === 'save' || call[0] === 'materialize'), 'لا تعديل على إيقاف اتخصم في مسير معتمد')
})

test('إيقاف فوق إجازة معتمدة أو طلب إجازة قيد المعالجة يترفض برسالة «الغي الإجازة أو قصّرها الأول»، وطلب إلغاء إجازة مش مانع', async () => {
  const today = realToday()
  const d = offset => rules.addDays(today, offset)
  const dto = { fromDate: d(5), toDate: d(15), reason: 'تحقيق إداري' }
  const approved = suspensionHarness({ leaves: [{ id: 1, employeeId: 41, fromDate: d(8), toDate: d(10), status: 'APPROVED' }] })
  await assert.rejects(approved.service.createSuspension(41, dto, null, 1), conflictWith(new RegExp(`إجازة معتمدة من ${d(8)} إلى ${d(10)} .*الغي الإجازة أو قصّرها الأول`)))
  assert.ok(!approved.calls.some(call => call[0] === 'save'))

  const pending = suspensionHarness({ requests: [
    { id: 9, typeCode: 'LEAVE', status: 'UNDER_REVIEW', payload: JSON.stringify({ leaveId: 3 }) },
    { id: 10, typeCode: 'LOAN', status: 'SUBMITTED', payload: JSON.stringify({ fromDate: d(5), toDate: d(6) }) },
    { id: 11, typeCode: 'LEAVE', status: 'SUBMITTED', payload: JSON.stringify({ leaveTypeCode: 'ANNUAL', fromDate: d(14), toDate: d(20) }) },
  ] })
  await assert.rejects(pending.service.createSuspension(41, dto, null, 1), conflictWith(/طلب إجازة قيد المعالجة من .* بتتداخل مع فترة الإيقاف/))

  const cancelOnly = suspensionHarness({ requests: [{ id: 9, typeCode: 'LEAVE', status: 'UNDER_REVIEW', payload: JSON.stringify({ leaveId: 3 }) }],
    leaves: [{ id: 2, employeeId: 41, fromDate: d(20), toDate: d(22), status: 'APPROVED' }] })
  assert.equal((await cancelOnly.service.createSuspension(41, dto, null, 1)).status, 'ACTIVE', 'إجازة برا الفترة وطلب إلغاء مش مانعين')
  assert.equal(rules.overlappingLeave([{ fromDate: d(20), toDate: d(22) }], dto.fromDate, dto.toDate), null)
})

test('شاشة الملف: الإيقاف المنتهي في السجل له زرار «إلغاء أو تعديل النهاية» يفتح نافذة التصحيح', () => {
  const profile = fs.readFileSync(path.join(root, 'src/app/employees/[id]/page.tsx'), 'utf8')
  assert.match(profile, /row\.state === 'FINISHED' \? \(/)
  assert.match(profile, /setFinishedSuspension\(row\); setSuspensionDialog\('end'\)/)
  assert.match(profile, /current=\{suspensionDialog === 'end' \? \(finishedSuspension \?\? openSuspension\) : null\}/)
  const dialog = fs.readFileSync(path.join(root, 'src/components/EmployeeSuspensionDialog.tsx'), 'utf8')
  assert.match(dialog, /const finished = current\?\.state === 'FINISHED'/)
  assert.match(dialog, /useState\(current && \(finished \|\| current\.fromDate > today\) \? current\.fromDate : today\)/, 'الافتراضي للمنتهي = الإلغاء')
})
