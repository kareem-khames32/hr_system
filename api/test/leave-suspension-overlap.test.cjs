'use strict'
// الإجازة مينفعش تتداخل مع فترة إيقاف عن العمل (16 سبتمبر): رفض عند التقديم (للموظف وللموارد البشرية نيابةً)
// وعند التنفيذ بالاعتماد (لو الإيقاف اتسجل بعد الطلب). ورسالة طلب النقل لما جدول الموظف خاص بفرعه القديم.
// اختبارات بلا قاعدة بيانات: مدير كيانات في الذاكرة بيفهم عوامل typeorm (Not/In/LessThanOrEqual/MoreThanOrEqual).
// Run: cd api && node --test --test-concurrency=1 --test-reporter=tap test/leave-suspension-overlap.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const overlap = require('../src/employees/employee-suspension-overlap')
const rules = require('../src/employees/employee-suspension-rules')
const history = require('../src/attendance/attendance-rule-history')
const { DestinationsService } = require('../src/requests/destinations.service')
const { RequestsService } = require('../src/requests/requests.service')
const { localDateOf } = require('../src/attendance/attendance.service')

const today = localDateOf(new Date())
const d = offset => rules.addDays(today, offset)
const suspension = (fromDate, toDate, status = 'ACTIVE', over = {}) => ({ id: 1, employeeId: 19, fromDate, toDate, plannedToDate: toDate, reason: 'تحقيق إداري', status, ...over })
const blocked = (from, to) => `الموظف موقوف عن العمل من ${from} إلى ${to} — الإجازة مينفعش تتداخل مع فترة الإيقاف`
const badRequest = pattern => error => error.getStatus?.() === 400 && (typeof pattern === 'string' ? error.message === pattern : pattern.test(error.message))

// ===== مدير كيانات في الذاكرة =====
const plain = value => value instanceof Date ? value.toISOString().slice(0, 10) : value
function matches(row, where) {
  if (Array.isArray(where)) return where.some(part => matches(row, part))
  return Object.entries(where ?? {}).every(([key, expected]) => {
    const actual = plain(row[key])
    if (expected && typeof expected === 'object' && typeof expected.type === 'string' && 'value' in expected) {
      const value = expected.value
      switch (expected.type) {
        case 'in': return value.includes(actual)
        case 'not': return actual !== value
        case 'lessThanOrEqual': return actual <= value
        case 'moreThanOrEqual': return actual >= value
        default: throw new Error('unsupported operator ' + expected.type)
      }
    }
    return actual === expected
  })
}
function fakeEm(seed, { suspensionTable = true } = {}) {
  const tables = {}
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map(row => ({ ...row }))
  const rowsOf = name => (tables[name] ??= [])
  const repo = name => ({
    findOne: async ({ where } = {}) => { const row = rowsOf(name).find(r => matches(r, where)); return row ? { ...row } : null },
    findOneBy: async where => { const row = rowsOf(name).find(r => matches(r, where)); return row ? { ...row } : null },
    find: async ({ where } = {}) => rowsOf(name).filter(r => matches(r, where)).map(r => ({ ...r })),
    count: async ({ where } = {}) => rowsOf(name).filter(r => matches(r, where)).length,
    save: async value => {
      const rows = rowsOf(name)
      const existing = value.id != null ? rows.find(r => r.id === value.id) : null
      if (existing) { Object.assign(existing, value); return { ...existing } }
      const row = { ...value, id: rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1 }
      rows.push(row)
      return { ...row }
    },
    update: async (criteria, patch) => { for (const row of rowsOf(name).filter(r => matches(r, criteria))) Object.assign(row, patch) },
  })
  return {
    tables,
    queryRunner: { isTransactionActive: true, data: {} },
    connection: { hasMetadata: entity => suspensionTable || entity.name !== 'EmployeeSuspension' },
    query: async sql => (sql.includes('OBJECT_ID') ? [{ objectId: 1 }] : []),
    getRepository: entity => repo(entity.name),
    find: (entity, options) => repo(entity.name).find(options),
    findOne: (entity, options) => repo(entity.name).findOne(options),
    findOneBy: (entity, where) => repo(entity.name).findOneBy(where),
  }
}

test('القاعدة الصرفة: أي يوم إيقاف غير ملغى داخل مدى الإجازة يرفضها، والملغى والأيام اللي اتشالت بالإنهاء المبكر مش مانعة', () => {
  const issue = overlap.leaveSuspensionOverlapIssue
  const active = [suspension('2026-10-10', '2026-10-20')]
  assert.equal(issue(active, '2026-10-05', '2026-10-10'), blocked('2026-10-10', '2026-10-20'), 'آخر يوم إجازة = أول يوم إيقاف')
  assert.equal(issue(active, '2026-10-20', '2026-10-22'), blocked('2026-10-10', '2026-10-20'), 'أول يوم إجازة = آخر يوم إيقاف')
  assert.equal(issue(active, '2026-10-12', '2026-10-12'), blocked('2026-10-10', '2026-10-20'), 'يوم واحد (أو نص يوم) جوه الإيقاف')
  assert.equal(issue(active, '2026-10-01', '2026-10-30'), blocked('2026-10-10', '2026-10-20'), 'إجازة بتغطي الإيقاف كله')
  assert.equal(issue(active, '2026-10-01', '2026-10-09'), null)
  assert.equal(issue(active, '2026-10-21', '2026-10-25'), null)
  assert.equal(issue([suspension('2026-10-10', '2026-10-20', 'CANCELLED')], '2026-10-12', '2026-10-14'), null, 'الإيقاف الملغى مالوش أيام')
  // إنهاء مبكر: toDate الفعلي اتقدم لـ 14 (المقرر كان 20)
  const endedEarly = [suspension('2026-10-10', '2026-10-14', 'ENDED_EARLY', { plannedToDate: '2026-10-20' })]
  assert.equal(issue(endedEarly, '2026-10-15', '2026-10-18'), null, 'بعد الرجوع للعمل الإجازة مسموحة')
  assert.equal(issue(endedEarly, '2026-10-14', '2026-10-18'), blocked('2026-10-10', '2026-10-14'), 'الرسالة بالنهاية الفعلية مش المقررة')
  // أكتر من إيقاف متداخل: الأقدم في الرسالة، وتاريخ الـDate يتقص لليوم
  const two = [suspension(new Date('2026-11-05T00:00:00Z'), new Date('2026-11-06T00:00:00Z'), 'ACTIVE', { id: 2 }), suspension('2026-11-01', '2026-11-02')]
  assert.equal(issue(two, '2026-10-30', '2026-11-10'), blocked('2026-11-01', '2026-11-02'))
})

test('القراءة من القاعدة: إيقافات الموظف نفسه غير الملغاة بس، وجدول الإيقاف لو مش موجود مايوقفش الإجازات', async () => {
  const em = fakeEm({ EmployeeSuspension: [
    suspension(d(10), d(12), 'ACTIVE', { id: 1, employeeId: 77 }),
    suspension(d(10), d(12), 'CANCELLED', { id: 2 }),
    suspension(d(20), d(25), 'ENDED_EARLY', { id: 3, plannedToDate: d(30) }),
  ] })
  await overlap.assertLeaveOutsideSuspension(em, 19, d(10), d(12))
  await overlap.assertLeaveOutsideSuspension(em, 19, d(26), d(29))
  await assert.rejects(overlap.assertLeaveOutsideSuspension(em, 19, d(24), d(28)), badRequest(blocked(d(20), d(25))))
  await assert.rejects(overlap.assertLeaveOutsideSuspension(em, 77, d(8), d(10)), badRequest(blocked(d(10), d(12))))
  const noTable = fakeEm({ EmployeeSuspension: [suspension(d(10), d(12))] }, { suspensionTable: false })
  await overlap.assertLeaveOutsideSuspension(noTable, 19, d(10), d(12))
})

// ===== التنفيذ بالاعتماد (وجهة الإجازة) =====
const leaveType = { code: 'ANNUAL', nameAr: 'سنوية', isActive: true, isPaid: true, balanceType: 'annual', branchId: null, attachmentRule: 'NONE' }
const runLeave = (em, payload) => new DestinationsService({}, {}).execute(em,
  { id: 900, requesterId: 19, branchId: 1, status: 'APPROVED', payload: JSON.stringify(payload) },
  { code: 'LEAVE', nameAr: 'طلب إجازة', category: 'leaves', destinationHandler: 'leave_calendar_payroll' })

test('اعتماد إجازة بعد ما الموظف اتوقف على نفس الأيام: يترفض قبل كتابة الإجازة، وإيقاف انتهى بدري قبلها مايمنعش', async () => {
  const payload = { leaveTypeCode: 'ANNUAL', leaveType: 'ANNUAL', fromDate: d(5), toDate: d(7), days: 3 }
  const em = fakeEm({ LeaveType: [leaveType], Leave: [], EmployeeSuspension: [suspension(d(6), d(15))] })
  await assert.rejects(runLeave(em, payload), badRequest(blocked(d(6), d(15))))
  assert.equal(em.tables.Leave.length, 0, 'لا سجل إجازة')

  const endedEarly = fakeEm({ LeaveType: [leaveType], Leave: [], EmployeeSuspension: [
    suspension(d(1), d(4), 'ENDED_EARLY', { plannedToDate: d(15) }), suspension(d(5), d(9), 'CANCELLED', { id: 2 })] })
  const result = await runLeave(endedEarly, payload)
  assert.equal(result.completed, true)
  assert.deepEqual(endedEarly.tables.Leave.map(row => [row.employeeId, row.fromDate, row.toDate, row.status]), [[19, d(5), d(7), 'APPROVED']])
})

// ===== التقديم (الموظف نفسه، والموارد البشرية نيابةً) =====
const REACHED_BALANCE = new Error('REACHED_BALANCE_CHECK')
function submitHarness({ suspensions = [], onBehalf = false } = {}) {
  const request = { id: 500, requesterId: 19, createdByUserId: onBehalf ? 5 : 19, typeCode: 'LEAVE', definitionCode: 'LEAVE', status: 'DRAFT',
    branchId: 1, payload: JSON.stringify({ leaveTypeCode: 'ANNUAL', fromDate: d(10), toDate: d(12) }) }
  const em = fakeEm({
    Request: [request],
    RequestType: [{ code: 'LEAVE', nameAr: 'طلب إجازة', category: 'leaves', destinationHandler: 'leave_calendar_payroll', isActive: true,
      affectsBalance: true, requiredFields: JSON.stringify(['leaveTypeCode', 'fromDate', 'toDate']), customFields: '[]' }],
    LeaveType: [{ ...leaveType, category: 'ANNUAL', countingMode: 'WORKING_DAYS', noticeDays: 0, backdateAllowed: true, backdateMaxDays: null,
      halfDayAllowed: true, minDaysPerRequest: null, maxDays: null, oncePerService: false }],
    User: [{ id: 5, employeeId: 3 }, { id: 19, employeeId: 19 }],
    Leave: [],
    EmployeeSuspension: suspensions,
  })
  const service = Object.create(RequestsService.prototype)
  service.destinations = new DestinationsService({}, {})
  service.ds = { getRepository: () => ({ findOne: async () => null }) }
  service.leaveBalances = { maxBackdateDays: async () => 30 }
  service.attendance = { workingDaysForEmployee: async () => ({ total: 3, working: 3, skipped: [] }) }
  // الخطوة اللي بعد فحص الإيقاف مباشرة في التقديم: وصولها = الفحص عدّى
  service.assertLeaveBalance = async () => { throw REACHED_BALANCE }
  const user = onBehalf
    ? { sub: 5, employeeId: 19, role: 'hr_manager', branchId: 1, permissions: ['requests.create_on_behalf'] }
    : { sub: 19, employeeId: 19, role: 'employee', branchId: 1, permissions: [] }
  return { submit: () => service.submitLocked(user, 500, em), em }
}

test('تقديم إجازة على أيام إيقاف يترفض للموظف وللموارد البشرية نيابةً، والإيقاف الملغى أو اللي خلص قبلها مايمنعش', async () => {
  for (const onBehalf of [false, true]) {
    const who = onBehalf ? 'نيابةً' : 'الموظف'
    await assert.rejects(submitHarness({ onBehalf, suspensions: [suspension(d(12), d(20))] }).submit(), badRequest(blocked(d(12), d(20))), who)
    await assert.rejects(submitHarness({ onBehalf, suspensions: [suspension(d(1), d(30), 'ACTIVE', { employeeId: 44 })] }).submit(),
      error => error === REACHED_BALANCE, `${who}: إيقاف موظف تاني`)
    await assert.rejects(submitHarness({ onBehalf, suspensions: [suspension(d(8), d(11), 'CANCELLED'), suspension(d(5), d(9), 'ENDED_EARLY', { id: 2, plannedToDate: d(20) })] }).submit(),
      error => error === REACHED_BALANCE, `${who}: ملغى ومنتهي بدري قبل الإجازة`)
  }
})

// ===== رسالة طلب النقل =====
const schedules = [{ id: 3, name: 'دوام فرع الرياض', branchId: 1, isActive: true }, { id: 4, name: 'دوام الشركة', branchId: null, isActive: true }]
const transferMessage = /«دوام فرع الرياض» خاص بفرع تاني؛ حوّل الموظف لجدول لكل الشركة الأول \(ساري من تاريخ النقل أو قبله\)، وبعد تنفيذ النقل اختار له جدول الفرع الجديد/

test('طلب النقل وجدول الموظف خاص بفرعه القديم: الرسالة تقول «جدول لكل الشركة الأول، وجدول الفرع الجديد بعد النقل»، ورسالة تعديل الملف زي ما هي', async () => {
  const transferIssue = history.scheduleBranchIssue(schedules[0], 11, 'transfer')
  assert.match(transferIssue, transferMessage)
  assert.doesNotMatch(transferIssue, /اختار جدول للفرع الجديد أو جدول لكل الشركة قبل نقل الموظف/, 'مايقترحش جدول الفرع الجديد قبل النقل')
  assert.equal(history.scheduleBranchIssue(schedules[1], 11, 'transfer'), null)
  assert.equal(history.scheduleBranchIssue(schedules[0], 11, true), 'جدول العمل «دوام فرع الرياض» خاص بفرع تاني؛ اختار جدول للفرع الجديد أو جدول لكل الشركة قبل نقل الموظف')
  assert.equal(history.scheduleBranchIssue(schedules[0], 11), 'جدول العمل «دوام فرع الرياض» خاص بفرع تاني؛ اختار جدول لفرع الموظف أو جدول لكل الشركة')

  const employee = { id: 19, workScheduleId: 3 }
  await assert.rejects(history.assertEmployeeSchedulesFitBranch(fakeEm({ WorkSchedule: schedules }), employee, 11, today, 'transfer'), badRequest(transferMessage))
  await assert.rejects(history.assertEmployeeSchedulesFitBranch(fakeEm({ WorkSchedule: schedules }), employee, 11, today),
    badRequest(/اختار جدول للفرع الجديد أو جدول لكل الشركة قبل نقل الموظف/), 'تعديل الملف (الافتراضي) بنفس رسالته')

  // تنفيذ طلب النقل المعتمد لفرع تاني
  const transferEm = (workScheduleId) => fakeEm({
    Employee: [{ id: 19, branchId: 1, teamId: 5, isActive: true, status: 'active', workScheduleId }],
    Team: [{ id: 7, departmentId: 70, isActive: true, leaderEmployeeId: null }],
    Department: [{ id: 70, branchId: 11, isActive: true, managerEmployeeId: null }],
    Branch: [{ id: 11, isActive: true }],
    User: [{ id: 1, isActive: true, role: 'super_admin' }],
    WorkSchedule: schedules, AttendanceRuleVersion: [], CustodyAssignment: [], Transfer: [],
  })
  const runTransfer = em => new DestinationsService({}, {}).execute(em,
    { id: 901, requesterId: 19, branchId: 1, createdByUserId: 1, status: 'APPROVED', payload: JSON.stringify({ toTeamId: 7, effectiveDate: d(30) }) },
    { code: 'TRANSFER', nameAr: 'نقل', category: 'employment_status', destinationHandler: 'transfers_effective_date' })
  const refused = transferEm(3)
  await assert.rejects(runTransfer(refused), badRequest(transferMessage))
  assert.equal(refused.tables.Transfer.length, 0, 'مفيش نقل اتجدول')
  const companyWide = transferEm(4)
  const scheduled = await runTransfer(companyWide)
  assert.equal(scheduled.completed, false)
  assert.deepEqual(companyWide.tables.Transfer.map(row => [row.employeeId, row.effectiveDate, row.status]), [[19, d(30), 'SCHEDULED']])
})
