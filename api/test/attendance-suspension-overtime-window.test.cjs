'use strict'
// مراجعة 16 سبتمبر — مجموعة الحضور:
// 1) يوم الإيقاف عن العمل مش غياب على أي مسار بيحسب اليوم (مش لحاق الغياب بس): computeDay ما يحفظش «غائب»
//    ويمسح القديم، وتجسيد الغياب يشيل الغياب المحفوظ القديم في أيام الإيقاف، والغياب اللحظي يتخطى الموقوف.
// 2) تغيير فترة إضافي لفرع بيعيد أيام كل اللي اشتغل في الفرع وقتها، حتى اللي نقل منه بعد كده.
// Run: cd api && node --test --test-reporter=tap test/attendance-suspension-overtime-window.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const svc = require('../src/attendance/attendance.service')
const { AttendanceRuleVersion } = require('../src/attendance/attendance-rule.entities')
const { EmployeeSuspension } = require('../src/employees/employee-suspension.entity')

const source = fs.readFileSync(path.join(__dirname, '../src/attendance/attendance.service.ts'), 'utf8')

test('قرار الحفظ: يوم الإيقاف بلا بصمة ما يتحفظش غياب، وباقي القواعد زي ما هي', () => {
  const { attendanceDayPersists: persists } = svc
  assert.equal(persists('absent', false, true), false, 'يوم إيقاف منقضي بلا بصمة = مش غياب')
  assert.equal(persists('absent', false, false), true, 'غياب عادي يتحفظ')
  assert.equal(persists('absent', true, false), false, 'المستقبلي ما يتحفظش غياب')
  for (const status of ['present', 'late', 'missing_punch', 'holiday', 'leave', 'partial_leave']) {
    assert.equal(persists(status, false, true), true, `يوم إيقاف فيه ${status} بيتحفظ (البصمة دليل، والمسير له قراره)`)
  }
  for (const status of ['leave', 'holiday', 'mission', 'remote']) assert.equal(persists(status, true, false), true, status)
  assert.equal(persists('present', true, false), false)
})

test('computeDay موصول: الإيقاف بيتفحص قبل الحفظ على كل المسارات، والصف القديم بيتمسح والمكتشف القديم يتلغى', () => {
  assert.match(source, /const suspendedAbsence = status === 'absent' &&\s+\(await suspendedDatesBetween\(this\.days\.manager, employeeId, date, date\)\)\.has\(date\)/)
  assert.match(source, /const persist = attendanceDayPersists\(status, isFuture, suspendedAbsence\)/)
  const notPersist = source.slice(source.indexOf('if (!persist) {'), source.indexOf('day = await this.days.save(day)'))
  assert.match(notPersist, /await this\.days\.delete\(\{ employeeId, date \}\)/)
  assert.match(notPersist, /if \(suspendedAbsence && !isFuture\) \{\s+[^\n]*\n\s+await this\.clearStaleOvertime\(employeeId, date, 'لا بصمة دخول وخروج لليوم'\)/)
  assert.match(notPersist, /suspendedAbsence \? \{ suspended: true \} : \{\}/)
  // الحفظ بيحصل بعد قرار الإيقاف مش قبله — مفيش مسار تاني يكتب 'absent'
  assert.ok(source.indexOf('const suspendedAbsence') < source.indexOf('day = await this.days.save(day)'))
  assert.equal((source.match(/status: 'absent', lateMinutes/g) ?? []).length, 1, 'صف الغياب المكتوب يدويًا هو اللحظي بس (مش محفوظ)')
})

// مدير كيانات بسيط لتجسيد الغياب: جدول الإيقاف جاهز، ومفيش استثناءات
function fakeManager(suspensions) {
  const qb = { where: () => qb, andWhere: () => qb, orderBy: () => qb, addOrderBy: () => qb, getMany: async () => [] }
  return {
    connection: { hasMetadata: () => true },
    query: async () => [{ objectId: 1 }],
    getRepository: (entity) => entity === EmployeeSuspension
      ? { find: async () => suspensions.map(row => ({ ...row })) }
      : { createQueryBuilder: () => qb },
  }
}

test('تجسيد الغياب: الغياب المحفوظ القديم في يوم إيقاف يتعاد حسابه (فيتمسح)، وأيام الإيقاف ما تتعدش غياب', async () => {
  const yesterday = svc.localDateOf(new Date(Date.now() - 86400000))
  const dayBefore = svc.localDateOf(new Date(Date.now() - 2 * 86400000))
  const service = Object.create(svc.AttendanceService.prototype)
  const manager = fakeManager([{ id: 9, employeeId: 5, fromDate: dayBefore, toDate: yesterday, status: 'ACTIVE' }])
  const calls = []
  service.employees = { findOne: async () => ({ id: 5, joinDate: '2020-01-01', actualStartDate: null, archivedAt: null }) }
  service.days = {
    manager,
    find: async ({ where }) => {
      assert.equal(where.status, 'absent')
      return [{ date: dayBefore }]
    },
    findOne: async () => null,
  }
  service.computeDay = async (employeeId, date, cascade) => { calls.push([employeeId, date, cascade]); return { status: 'absent', suspended: true } }
  service.calendarDay = async () => ({ working: true })
  const created = await service.materializeAbsences(5, dayBefore, yesterday)
  assert.deepEqual(calls, [[5, dayBefore, false]], 'يوم الإيقاف بالغياب القديم بس هو اللي يتعاد، ويوم الإيقاف التاني ما يتلمسش')
  assert.equal(created, 0, 'مفيش غياب اتعد في أيام الإيقاف')
})

test('الغياب اللحظي للنهارده يتخطى الموقوف عن العمل', () => {
  const live = source.slice(source.indexOf('async liveAbsences('), source.indexOf('async monthly('))
  assert.match(live, /const suspensions = await readOpenSuspensions\(this\.days\.manager, date\)/)
  assert.match(live, /!\(suspensions\.get\(emp\.id\) \?\? \[\]\)\.some\(period => suspensionCovers\(period, date\)\)/)
})

test('فرع نسخة EMPLOYEE_ORG', () => {
  assert.equal(svc.employeeOrgSnapshotBranch({ schemaVersion: 1, data: { branchId: 2 } }), 2)
  assert.equal(svc.employeeOrgSnapshotBranch('{"data":{"branchId":3}}'), 3)
  assert.equal(svc.employeeOrgSnapshotBranch({ branchId: 4 }), 4)
  assert.equal(svc.employeeOrgSnapshotBranch({ data: { branchId: null } }), null)
  assert.equal(svc.employeeOrgSnapshotBranch('not json'), null)
  assert.equal(svc.employeeOrgSnapshotBranch(null), null)
})

test('أهداف إعادة الحساب: فترة الفرع بتشمل اللي نقل منه (فرع اليوم المحفوظ أو نسخة فرع مؤرخة) لحد النهارده', () => {
  const range = { fromDate: '2026-08-01', toDate: '2026-08-31', branchId: 2 }
  const days = [
    // X نقل من فرع 2 لفرع 1 من أول سبتمبر: أيام أغسطس محفوظة على فرع 2
    { employeeId: 7, date: '2026-08-10', branchId: 2, checkIn: '09:00', checkOut: '19:00' },
    // Y فرعه 1 دايمًا
    { employeeId: 8, date: '2026-08-10', branchId: 1, checkIn: '09:00', checkOut: '19:00' },
    // Z يوم بلا خروج ما يتعادش
    { employeeId: 9, date: '2026-08-11', branchId: 2, checkIn: '09:00', checkOut: null },
    // W صف قديم بلا فرع، بس له نسخة فرع 2 مؤرخة
    { employeeId: 10, date: '2026-08-12', branchId: null, checkIn: '09:00', checkOut: '18:00' },
  ]
  const pending = [{ employeeId: 7, date: '2026-08-10' }, { employeeId: 7, date: '2026-08-15' }, { employeeId: 8, date: '2026-08-20' }]
  const branches = new Map([[7, new Set([1])], [8, new Set([1])], [9, new Set([2])], [10, new Set([1, 2])]])
  const targets = svc.overtimeWindowRecomputeTargets(range, '2026-09-16', days, pending, branches)
  assert.deepEqual(targets, [
    { employeeId: 7, date: '2026-08-10' },
    { employeeId: 10, date: '2026-08-12' },
  ], 'X بفرع يومه المحفوظ رغم إن فرعه الحالي 1، وW بنسخته المؤرخة؛ Y برا الفرع، وZ بلا خروج')
  // إضافي مكتشف ليوم مالوش صف: بفرع الموظف (الحالي أو المؤرخ)
  const withHistory = svc.overtimeWindowRecomputeTargets(range, '2026-09-16', days, pending, new Map([...branches, [7, new Set([1, 2])]]))
  assert.deepEqual(withHistory.map(t => `${t.employeeId}|${t.date}`), ['7|2026-08-10', '10|2026-08-12', '7|2026-08-15'])
  // بلا فرع = كل الأيام، والمدى مقصوص لحد النهارده، والمستقبل كله ولا حاجة
  assert.equal(svc.overtimeWindowRecomputeTargets({ ...range, branchId: null }, '2026-09-16', days, pending, new Map()).length, 5)
  assert.deepEqual(svc.overtimeWindowRecomputeTargets(range, '2026-08-10', days, pending, branches), [{ employeeId: 7, date: '2026-08-10' }])
  assert.deepEqual(svc.overtimeWindowRecomputeTargets({ fromDate: '2026-10-01', toDate: '2026-10-31', branchId: 2 }, '2026-09-16', days, pending, branches), [])
})

test('حفظ/إيقاف/حذف فترة فرع بيعيد أيام اللي نقل من الفرع (فرع اليوم ونسخ الفرع المؤرخة، مش الفرع الحالي بس)', async () => {
  const service = Object.create(svc.AttendanceService.prototype)
  const computed = []
  service.logger = { warn: () => {} }
  service.computeDay = async (employeeId, date) => { computed.push(`${employeeId}|${date}`) }
  service.employees = { find: async () => [{ id: 7, branchId: 1 }, { id: 8, branchId: 1 }, { id: 11, branchId: 1 }] }
  service.days = {
    manager: {
      find: async (entity, options) => {
        assert.equal(entity, AttendanceRuleVersion)
        assert.equal(options.where.sourceType, 'EMPLOYEE_ORG')
        return [
          { sourceId: 7, snapshot: { schemaVersion: 1, data: { branchId: 1 } } },
          { sourceId: 11, snapshot: { schemaVersion: 1, data: { branchId: 2 } } },
          { sourceId: 11, snapshot: { schemaVersion: 1, data: { branchId: 1 } } },
        ]
      },
    },
    find: async ({ select }) => {
      assert.equal(select.branchId, true, 'فرع اليوم المحفوظ لازم يتقري')
      return [
        { employeeId: 7, date: '2026-08-10', branchId: 2, checkIn: '09:00', checkOut: '19:00' },
        { employeeId: 8, date: '2026-08-10', branchId: 1, checkIn: '09:00', checkOut: '19:00' },
        { employeeId: 11, date: '2026-08-11', branchId: 1, checkIn: '09:00', checkOut: '19:00' },
      ]
    },
  }
  service.overtime = { find: async () => [{ employeeId: 11, date: '2026-08-12' }] }
  const result = await service.recomputeOvertimeWindowDays([{ fromDate: '2026-08-01', toDate: '2026-08-31', branchId: 2 }])
  assert.deepEqual(computed, ['7|2026-08-10', '11|2026-08-11', '11|2026-08-12'],
    'X (فرعه الحالي 1) يوم أغسطس على فرع 2 يتعاد؛ واللي له نسخة فرع 2 مؤرخة يتعاد؛ وY لأ')
  assert.deepEqual(result, { recomputed: 3, failed: 0 })
})
