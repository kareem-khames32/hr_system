// أثر وجهات الطلبات بعد الاعتماد (فحص «كل نوع طلب يشتغل 100%» — 16 سبتمبر).
// اختبارات بلا قاعدة بيانات: مدير كيانات في الذاكرة يكفي لما تكتبه المعالجات.
// Run: node --test api/test/request-destinations-effects.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { DestinationsService, obligationAmount, recordValue } = require('../src/requests/destinations.service')
const { localDateOf } = require('../src/attendance/attendance.service')

// مدير كيانات في الذاكرة: where بالمساواة وIn/Not من typeorm، وsave يضيف أو يحدّث بالمعرّف
function fakeEm(seed) {
  const tables = {}
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map(row => ({ ...row }))
  const ids = {}
  const matches = (row, where = {}) => Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && '_type' in expected) {
      if (expected._type === 'in') return expected._value.includes(row[key])
      if (expected._type === 'not') return row[key] !== expected._value
      throw new Error('unsupported operator ' + expected._type)
    }
    return row[key] === expected
  })
  const repo = (name) => {
    const rows = (tables[name] ??= [])
    return {
      findOne: async ({ where }) => { const row = rows.find(r => matches(r, where)); return row ? { ...row } : null },
      findOneBy: async (where) => { const row = rows.find(r => matches(r, where)); return row ? { ...row } : null },
      find: async ({ where } = {}) => rows.filter(r => matches(r, where)).map(r => ({ ...r })),
      count: async ({ where } = {}) => rows.filter(r => matches(r, where)).length,
      save: async (value) => {
        const existing = value.id != null ? rows.find(r => r.id === value.id) : null
        if (existing) { Object.assign(existing, value); return { ...existing } }
        ids[name] = (ids[name] ?? rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0)) + 1
        const row = { ...value, id: ids[name] }
        rows.push(row)
        return { ...row }
      },
      update: async (criteria, patch) => { for (const row of rows.filter(r => matches(r, criteria))) Object.assign(row, patch) },
    }
  }
  return { tables, getRepository: (entity) => repo(entity.name) }
}
const service = () => new DestinationsService({}, {})
const request = (over = {}) => ({ id: 900, requesterId: 19, branchId: 1, status: 'APPROVED', payload: '{}', ...over })
const type = (code, destinationHandler) => ({ code, nameAr: code, destinationHandler, category: 'x' })
const run = (em, code, handler, payload, req = {}) =>
  service().execute(em, request({ ...req, payload: JSON.stringify(payload) }), type(code, handler))
const rejects = (promise, re) => assert.rejects(promise, (err) => err.getStatus?.() === 400 && re.test(err.message))

test('PERSONAL_DATA_UPDATE: blank optional fields sent by the screen never wipe saved data', async () => {
  const em = fakeEm({ Employee: [{ id: 19, phone: '+201115556677', phoneAlt: null, address: 'المعادي، القاهرة', maritalStatus: 'single' }] })
  // النموذج يرسل كل حقوله؛ الموظف غيّر الهاتف فقط
  const result = await run(em, 'PERSONAL_DATA_UPDATE', 'employee_record', { phone: ' 0501112233 ', phoneAlt: '', address: '', maritalStatus: '' })
  assert.equal(result.completed, true)
  assert.deepEqual(em.tables.Employee[0], { id: 19, phone: '0501112233', phoneAlt: null, address: 'المعادي، القاهرة', maritalStatus: 'single' })
  assert.deepEqual(em.tables.EmployeeStatusHistory.map(h => [h.fieldName, h.oldValue, h.newValue, h.requestId]), [['phone', '+201115556677', '0501112233', 900]])
  // كله فارغ أو مطابق = لا تغيير → رفض صريح بدل سجل فارغ
  await rejects(run(em, 'PERSONAL_DATA_UPDATE', 'employee_record', { phone: '0501112233', phoneAlt: '', address: '  ', maritalStatus: '' }), /لم تتغير أي بيانات/)
  assert.equal(em.tables.EmployeeStatusHistory.length, 1)
  // المسح الصريح (REQ-10) يبقى بقيمة null
  await run(em, 'PERSONAL_DATA_UPDATE', 'employee_record', { address: null, phone: '' })
  assert.deepEqual([em.tables.Employee[0].address, em.tables.Employee[0].phone], [null, '0501112233'])
  assert.deepEqual(em.tables.EmployeeStatusHistory.slice(1).map(h => [h.fieldName, h.newValue]), [['address', null]])
})

test('EMERGENCY_CONTACT: optional relation/alt phone left blank keep their saved values', async () => {
  const em = fakeEm({ Employee: [{ id: 19, emergencyContactName: 'والده', emergencyContactPhone: '+201223334455', emergencyRelation: 'أب', emergencyPhoneAlt: '0100' }] })
  await run(em, 'EMERGENCY_CONTACT', 'employee_record_auto', { name: 'أخوه', phone: '0559990000', relation: '', phoneAlt: '' })
  assert.deepEqual(em.tables.Employee[0], { id: 19, emergencyContactName: 'أخوه', emergencyContactPhone: '0559990000', emergencyRelation: 'أب', emergencyPhoneAlt: '0100' })
  assert.deepEqual(em.tables.EmployeeStatusHistory.map(h => h.fieldName), ['emergencyContactName', 'emergencyContactPhone'])
  assert.equal(recordValue(12), '12')
  assert.equal(recordValue({}), null)
})

test('CUSTODY_LOSS_REPORT: only the requester\'s held custody, once; debit equals asset value', async () => {
  const seed = () => fakeEm({
    Asset: [{ id: 7, name: 'لابتوب', value: 4500, status: 'ASSIGNED', currentHolderId: 19 }, { id: 8, name: 'هاتف', value: 900, status: 'AVAILABLE', currentHolderId: null }],
    CustodyAssignment: [
      { id: 70, assetId: 7, employeeId: 19, status: 'ACTIVE' },
      { id: 71, assetId: 7, employeeId: 22, status: 'RETURNED' },
      { id: 80, assetId: 8, employeeId: 19, status: 'RETURNED' },
    ],
  })
  let em = seed()
  // عهدة موظف آخر: لا مديونية عليه ببلاغ غيره
  await rejects(run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { assignmentId: 70, description: 'ضاع' }, { requesterId: 22 }), /ليس باسم صاحب البلاغ/)
  // عهدة مُرجَعة: الأصل في المخزن ولا يُقيَّد فقدها
  await rejects(run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { assignmentId: 80, description: 'ضاع' }), /ليست بحوزة الموظف/)
  // إسناد غير محدد كان «يكتمل» بلا أثر
  await rejects(run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { description: 'ضاع' }), /إسناد العهدة المبلَّغ عنها مطلوب/)
  assert.equal((em.tables.EmployeeObligation ?? []).length, 0)
  assert.equal(em.tables.Asset[1].status, 'AVAILABLE')

  const result = await run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { assignmentId: 70, description: 'و'.repeat(400) })
  assert.equal(result.completed, true)
  const row = em.tables.CustodyAssignment[0]
  assert.equal(row.status, 'LOST')
  assert.equal(row.condition.length, 100, 'condition column is 100 chars')
  assert.deepEqual([em.tables.Asset[0].status, em.tables.Asset[0].currentHolderId], ['RETIRED', null])
  assert.deepEqual(em.tables.EmployeeObligation.map(o => [o.employeeId, o.type, o.category, o.amount, o.sourceRequestId]), [[19, 'DEBIT', 'custody_shortfall', 4500, 900]])
  // بلاغ ثانٍ على نفس العهدة: لا مديونية مكررة
  await rejects(run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { assignmentId: 70, description: 'ضاع' }, { id: 901 }), /ليست بحوزة الموظف/)
  assert.equal(em.tables.EmployeeObligation.length, 1)

  // نقل مفتوح على نفس الأصل يوقف البلاغ حتى يُحسم
  em = seed()
  em.tables.CustodyAssignment.push({ id: 72, assetId: 7, employeeId: 23, status: 'PENDING_ACK' })
  await rejects(run(em, 'CUSTODY_LOSS_REPORT', 'custody_finance', { assignmentId: 70, description: 'ضاع' }), /نقل أو إسناد آخر مفتوح/)
  assert.equal((em.tables.EmployeeObligation ?? []).length, 0)
})

test('EXPENSE_CLAIM / PER_DIEM: an approved claim always writes its credit, never a silent no-op', async () => {
  for (const [code, handler, category] of [['EXPENSE_CLAIM', 'expense_register', 'expense'], ['PER_DIEM', 'payroll_allowance', 'allowance']]) {
    const em = fakeEm({})
    for (const amount of [0, -50, 'abc', '', null, undefined, Infinity, 1e12, 0.001]) {
      await rejects(run(em, code, handler, { amount, description: 'فاتورة' }), /المبلغ مطلوب رقمًا موجبًا/)
    }
    assert.equal((em.tables.EmployeeObligation ?? []).length, 0, code)
    // المبلغ بيتقص لخانتين من غير تقريب (قرار المالك): 150.555 ← 150.55
    const result = await run(em, code, handler, { amount: '150.555', description: 'د'.repeat(500), effectiveDate: 'not-a-date' })
    assert.equal(result.completed, true)
    const [row] = em.tables.EmployeeObligation
    assert.deepEqual([row.employeeId, row.type, row.category, row.amount, row.status, row.sourceRequestId, row.effectiveDate], [19, 'CREDIT', category, 150.55, 'PENDING', 900, null])
    assert.equal(row.label.length, 300, 'label column is 300 chars')
  }
  assert.equal(obligationAmount(250), 250)
  assert.equal(obligationAmount(' 99.9 '), 99.9)
})

test('PUNCH_CORRECTION: a correction without a valid day, punch type or HH:MM time is rejected, not completed empty', async () => {
  const em = fakeEm({})
  const tomorrow = localDateOf(new Date(Date.now() + 2 * 86400000))
  await rejects(run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: '2026-02-30', punchType: 'IN', time: '08:40', reason: 'x' }), /تاريخ البصمة/)
  await rejects(run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: tomorrow, punchType: 'IN', time: '08:40', reason: 'x' }), /في المستقبل/)
  await rejects(run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: '2026-09-14', punchType: 'X', time: '08:40', reason: 'x' }), /نوع البصمة/)
  await rejects(run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: '2026-09-14', punchType: 'OUT', time: '25:00', reason: 'x' }), /HH:MM/)
  await rejects(run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: '2026-09-14', punchType: 'IN', time: '', reason: 'x' }), /نوع البصمة/)
  assert.equal((em.tables.AttendanceCorrection ?? []).length, 0)
  const result = await run(em, 'PUNCH_CORRECTION', 'attendance_corrections', { date: '2026-09-14', punchType: 'in', time: '08:40', reason: 'ن'.repeat(600) })
  assert.match(result.ref, /^AC-/)
  const [row] = em.tables.AttendanceCorrection
  assert.deepEqual([row.employeeId, row.date, JSON.parse(row.correctedPunch), row.reason.length], [19, '2026-09-14', { in: '08:40', out: null }, 500])
})

test('CUSTODY_REQUEST: approval without assets fails instead of completing with no assignment', async () => {
  const em = fakeEm({ Asset: [{ id: 5, name: 'شاشة', status: 'AVAILABLE', currentHolderId: null }] })
  await rejects(run(em, 'CUSTODY_REQUEST', 'custody_assignments_ack', { assetIds: [] }), /لم تُحدد أصول/)
  assert.equal((em.tables.CustodyAssignment ?? []).length, 0)
  const result = await run(em, 'CUSTODY_REQUEST', 'custody_assignments_ack', { assetIds: [5] })
  assert.equal(result.completed, false)
  assert.deepEqual(em.tables.CustodyAssignment.map(a => [a.assetId, a.employeeId, a.status, a.requestId]), [[5, 19, 'PENDING_ACK', 900]])
})

test('BANK_ACCOUNT_CHANGE / RESIGNATION: a missing employee fails the approval instead of completing without effect', async () => {
  const em = fakeEm({ Employee: [] })
  await rejects(run(em, 'BANK_ACCOUNT_CHANGE', 'payroll_bank_secure', { iban: 'SA0380000000608010167519' }), /غير موجود/)
  await rejects(run(em, 'RESIGNATION', 'employee_status', { lastWorkingDate: '2026-10-01', reason: 'x' }), /غير موجود/)
})

test('SALARY_INCREASE: an incomplete salary file names what HR must complete instead of an opaque 409', () => {
  const { assertSalaryRequestFileComplete } = require('../src/requests/salary-change-requests')
  const full = { basicSalary: '6000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', currency: 'SAR' }
  assert.doesNotThrow(() => assertSalaryRequestFileComplete(full))
  assert.doesNotThrow(() => assertSalaryRequestFileComplete({ ...full, currency: 'EGP' }))
  // 169 موظفًا نشطًا بلا عملة في بيانات 16 سبتمبر — كانت الرسالة «عملة دليل الأجر غير صالحة» (409)
  assert.throws(() => assertSalaryRequestFileComplete({ ...full, currency: null }),
    (err) => err.getStatus() === 400 && err.getResponse().code === 'SALARY_REQUEST_CURRENCY_REQUIRED' && /عملة أجر الموظف غير محددة/.test(err.message))
  assert.throws(() => assertSalaryRequestFileComplete({ ...full, phoneAllowance: null, workNatureAllowance: null }),
    (err) => err.getStatus() === 400 && err.getResponse().code === 'SALARY_REQUEST_COMPONENTS_REQUIRED' && /بدل الهاتف، بدل طبيعة العمل/.test(err.message))
})
