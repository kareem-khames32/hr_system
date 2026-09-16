'use strict'
// مراجعة 16 سبتمبر — عزل الفروع في ملف الموظف:
// 1) رسالة تكرار رقم الهوية / البصمة / الكود ماتكشفش اسم موظف في فرع تاني (نفس الفرع أو مدير النظام بيشوفوا الاسم).
// 2) فحص فرع جدول العمل على الفرع بعد الحفظ لما الفرع والجدول يتغيروا في حفظة واحدة، ونقل الموظف (من الملف أو طلب نقل منفّذ)
//    وجدوله خاص بفرع تاني يترفض برسالة تطلب جدول للفرع الجديد أو لكل الشركة.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { EmployeesService, employeeNameInScope } = require('../src/employees/employees.service')
const history = require('../src/attendance/attendance-rule-history')
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')

test('تكرار الهوية/البصمة/الكود: الاسم يظهر لمدير النظام ولنفس الفرع بس، وحساب فرع تاني ياخد رسالة عامة', async () => {
  const other = { id: 5, fullName: 'سارة من فرع أربعة', branchId: 4 }
  assert.equal(employeeNameInScope(other, null), ' (سارة من فرع أربعة)')
  assert.equal(employeeNameInScope(other, 4), ' (سارة من فرع أربعة)')
  assert.equal(employeeNameInScope(other, 1), '')
  const service = Object.create(EmployeesService.prototype)
  service.employees = { findOne: async () => other }
  const conflict = async (data, scope) => {
    try { await service.assertUnique(data, scope) } catch (error) { assert.equal(error.getStatus(), 409); return error.message }
    assert.fail('expected 409')
  }
  assert.equal(await conflict({ nationalId: '1012345678', excludeId: 9 }, 1), 'رقم الهوية / الإقامة 1012345678 مسجل لموظف آخر')
  assert.equal(await conflict({ nationalId: '1012345678' }, 4), 'رقم الهوية / الإقامة 1012345678 مسجل لموظف آخر (سارة من فرع أربعة)')
  assert.equal(await conflict({ nationalId: '1012345678' }, null), 'رقم الهوية / الإقامة 1012345678 مسجل لموظف آخر (سارة من فرع أربعة)')
  assert.doesNotMatch(await conflict({ fingerprintCode: '777' }, 1), /سارة/)
  // كود الموظف بقى من النظام (قرار المالك 16 سبتمبر) — مش مدخل فمش بيتفحص تكراره هنا
  await service.assertUnique({ employeeCode: 'EMP777' }, 1)
  assert.match(await conflict({ fingerprintCode: '777' }, null), /سارة/)
  // المسارات بتمرر نطاق المستخدم
  const service_ = source('src/employees/employees.service.ts'), controller = source('src/employees/employees.controller.ts')
  assert.match(service_, /await this\.assertUnique\(dto, branchScope\)/)
  assert.match(service_, /await this\.assertUnique\(\{ \.\.\.dto, excludeId: id \}, branchScope\)/)
  assert.match(controller, /this\.employees\.create\(dto, user\.sub, scope\)/)
  assert.equal(service_.split('(${dup.fullName})').length - 1, 1, 'الاسم بيتحط في الرسالة من employeeNameInScope بس')
})

// مدير كيانات وهمي لقراءات الدوام
function scheduleEm({ versions = [], schedules = [] }) {
  const saved = []
  const em = {
    async find(entity, options) {
      if (entity.name === 'AttendanceRuleVersion') {
        const where = options?.where ?? {}
        return versions.filter(row => (!where.sourceType || row.sourceType === where.sourceType) && (where.sourceId == null || row.sourceId === where.sourceId))
      }
      if (entity.name === 'WorkSchedule') {
        const ids = options.where.id._value ?? options.where.id.value
        return schedules.filter(row => ids.includes(row.id))
      }
      return []
    },
    async findOneBy(entity, where) { return entity.name === 'WorkSchedule' ? schedules.find(row => row.id === where.id) ?? null : null },
    async query() { return [] },
    getRepository: () => ({ find: async () => [], create: row => row, save: async row => { saved.push(row); return row } }),
  }
  return { em, saved }
}
const schedules = [
  { id: 3, name: 'دوام فرع الرياض', branchId: 1, isActive: true, isDefault: false },
  { id: 4, name: 'دوام الشركة', branchId: null, isActive: true, isDefault: false },
  { id: 5, name: 'دوام فرع جدة', branchId: 11, isActive: true, isDefault: false },
]
const version = (sourceId, effectiveFrom, workScheduleId, v = 1) => ({ id: v, sourceType: 'EMPLOYEE', sourceId, effectiveFrom, version: v, legacyBaseline: false,
  snapshot: { workScheduleId, flexOverrideMode: 'INHERIT' } })

test('جدول العمل في حفظة واحدة مع نقل الفرع: الفحص على الفرع الجديد (fresh.branchId قبل حفظ الدوام)', async () => {
  assert.equal(history.scheduleBranchIssue(schedules[1], 11), null, 'جدول كل الشركة مسموح للكل')
  assert.equal(history.scheduleBranchIssue(schedules[2], 11), null)
  assert.match(history.scheduleBranchIssue(schedules[0], 11), /«دوام فرع الرياض» خاص بفرع تاني؛ اختار جدول لفرع الموظف أو جدول لكل الشركة/)
  assert.match(history.scheduleBranchIssue(schedules[0], 11, true), /اختار جدول للفرع الجديد أو جدول لكل الشركة قبل نقل الموظف/)

  // الموظف بعد تحديث fresh.branchId = 11: جدول فرع جدة مقبول، وجدول فرع الرياض مرفوض
  const accepted = scheduleEm({ schedules })
  const employee = { id: 7, branchId: 11, workScheduleId: null }
  await history.saveEmployeeAttendanceRule(accepted.em, employee, { workScheduleId: 5, effectiveFrom: '2026-09-16', reason: 'نقل لفرع جدة' })
  assert.equal(employee.workScheduleId, 5, 'العمود المرجعي على نفس الكائن (مش نسخة)')
  await assert.rejects(history.saveEmployeeAttendanceRule(scheduleEm({ schedules }).em, { id: 7, branchId: 11, workScheduleId: null },
    { workScheduleId: 3, effectiveFrom: '2026-09-16', reason: 'نقل' }), /خاص بفرع تاني/)

  const service = source('src/employees/employees.service.ts')
  const setBranch = service.indexOf('if (branchChanged) fresh.branchId = dto.branchId!')
  const saveRule = service.indexOf('await saveEmployeeAttendanceRule(em, fresh, { workScheduleId: dto.workScheduleId')
  const fits = service.indexOf("if (branchChanged) await assertEmployeeSchedulesFitBranch(em, fresh, dto.branchId!, calendarChange?.effectiveFrom ?? attendanceRuleToday())")
  const write = service.indexOf('if (Object.keys(updates).length) await em.update(Employee, { id }, updates)')
  assert.ok(setBranch > 0 && setBranch < saveRule && saveRule < fits && fits < write, 'الفرع الجديد قبل فحص الجدول، وفحص الجدول الحالي قبل كتابة الفرع')
  assert.doesNotMatch(service, /saveEmployeeAttendanceRule\(em, \{ \.\.\.fresh/, 'مش نسخة — العمود المرجعي لازم يتحدث على fresh')
})

test('نقل الموظف لفرع تاني وجدوله الساري أو المؤرخ بعد النقل خاص بفرع غيره يترفض — من الملف أو طلب نقل منفّذ', async () => {
  const fits = (versions, employee, branchId, from) => history.assertEmployeeSchedulesFitBranch(scheduleEm({ versions, schedules }).em, employee, branchId, from)
  await assert.rejects(fits([version(7, '2026-01-01', 3)], { id: 7, workScheduleId: 3 }, 11, '2026-09-16'), /«دوام فرع الرياض» خاص بفرع تاني؛ اختار جدول للفرع الجديد/)
  await fits([version(7, '2026-01-01', 4)], { id: 7, workScheduleId: 4 }, 11, '2026-09-16')
  await fits([version(7, '2026-01-01', 3), version(7, '2026-09-16', 5, 2)], { id: 7, workScheduleId: 5 }, 11, '2026-09-16')
  await assert.rejects(fits([version(7, '2026-01-01', 4), version(7, '2026-10-01', 3, 2)], { id: 7, workScheduleId: 3 }, 11, '2026-09-16'), /دوام فرع الرياض/,
    'جدول مؤرخ بعد النقل لفرع قديم')
  await assert.rejects(fits([], { id: 8, workScheduleId: 3 }, 11, '2026-09-16'), /دوام فرع الرياض/, 'ملف قديم بلا نسخ: العمود المرجعي')
  await fits([], { id: 8, workScheduleId: 3 }, 1, '2026-09-16')
  await fits([], { id: 9, workScheduleId: null }, 11, '2026-09-16')

  const destinations = source('src/requests/destinations.service.ts')
  const handler = destinations.slice(destinations.indexOf('private transferHandler'), destinations.indexOf('async executeTransfer('))
  assert.match(handler, /if \(emp\.branchId !== department\.branchId\) await assertEmployeeSchedulesFitBranch\(em, emp, department\.branchId, effectiveDate, 'transfer'\)/)
  assert.ok(handler.indexOf('assertEmployeeSchedulesFitBranch') < handler.indexOf('getRepository(Transfer).save'), 'الرفض قبل جدولة النقل')
  const execute = destinations.slice(destinations.indexOf('async executeTransfer('), destinations.indexOf('private promotionHandler'))
  assert.match(execute, /await assertEmployeeSchedulesFitBranch\(em, emp, department\.branchId, transfer\.effectiveDate, 'transfer'\)/)
  assert.ok(execute.indexOf('assertEmployeeSchedulesFitBranch') < execute.indexOf("getRepository(Employee).update({ id: emp.id }, changes)"), 'الرفض قبل تغيير الفرع')
})
