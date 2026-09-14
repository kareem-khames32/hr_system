'use strict'
// مراجعة الخطوة 6 (S6): نسخ مؤرخة يحتاجها الحضور وقراءة مصادر الرواتب الحية (strict) على بيانات الشركة.
// تُنشأ عبر خدمات التاريخ القائمة نفسها — finishCalendarChange وsaveEmployeeAttendanceRule وappendAttendanceRuleVersion —
// داخل معاملة المُرحّل المجمّع ودفتره، فبنية اللقطة وبصمتها مطابقة لما تكتبه الشاشات.
// لا تتغير أي قيمة حالية: النسخة 1 = القيم الموجودة الآن، والنسخة 0 (legacyBaseline) تحفظها بلا تاريخ سريان.
// تاريخ السريان = بداية دورة الرواتب (payroll.cycle_start_day) التي تضم أقدم يوم حضور أو أقدم بداية مسير مسجلة.
// المصادر التي لها نسخ بالفعل تُترك كما هي (لا تُدرج نسخة أقدم قبل نسخة قائمة). الورديات (SHIFT) خارج النطاق.

function cycleStart(date, day) {
  const [year, month, dayOfMonth] = date.split('-').map(Number)
  let y = year, m = month
  if (dayOfMonth < day) { m -= 1; if (m === 0) { m = 12; y -= 1 } }
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

module.exports = {
  description: 'نسخ مؤرخة للتقويم العام وتقويم كل فرع وفرع كل موظف وإسناد جدوله وجداول العمل من بداية أول دورة رواتب مسجلة',
  cycleStart,
  async up({ manager: em, requireApi, log }) {
    const calendar = requireApi('src/attendance/attendance-calendar-history')
    const rules = requireApi('src/attendance/attendance-rule-history')
    const { Employee } = requireApi('src/employees/employee.entity')
    const { Branch } = requireApi('src/org/entities/branch.entity')
    const { WorkSchedule } = requireApi('src/assets/assets.entities')
    const { AttendanceRuleVersion } = requireApi('src/attendance/attendance-rule.entities')

    // نفس أقفال شاشات الدوام: قفل تعديل الدوام + القفل المالي لكل الموظفين
    await rules.lockAttendanceRuleMutation(em)

    const [config] = await em.query("SELECT [value] FROM dbo.requests_config WHERE [key] = N'payroll.cycle_start_day'")
    const cycleDay = config ? Number(config.value) : 1
    if (!Number.isInteger(cycleDay) || cycleDay < 1 || cycleDay > 28) throw new Error('payroll.cycle_start_day غير صالح؛ لا يمكن تحديد بداية الدورة')
    const [range] = await em.query(`SELECT CONVERT(varchar(10), MIN(d), 23) AS earliest FROM (
        SELECT MIN([date]) AS d FROM dbo.attendance_days UNION ALL SELECT MIN([startDate]) FROM dbo.payroll_runs) AS x`)
    const earliest = range && range.earliest ? range.earliest : rules.attendanceRuleToday()
    const effectiveFrom = cycleStart(earliest, cycleDay)
    const [actor] = await em.query("SELECT TOP (1) [id] FROM dbo.users WHERE [role] = N'super_admin' ORDER BY [id]")
    if (!actor) throw new Error('لا يوجد حساب super_admin لتوثيق النسخ المؤرخة')
    const actorUserId = Number(actor.id)
    const reason = label => `ترحيل 20260914_013: تثبيت ${label} بالقيم الحالية من بداية أول دورة رواتب مسجلة (${effectiveFrom}) لتشغيل الحضور والمسير على بيانات الشركة`.slice(0, 500)

    const created = { CALENDAR_GLOBAL: 0, CALENDAR_BRANCH: 0, WORK_SCHEDULE: 0, EMPLOYEE_ORG: 0, EMPLOYEE: 0 }
    const skipped = [], unresolved = []
    const has = (sourceType, sourceId) => em.getRepository(AttendanceRuleVersion).existsBy({ sourceType, sourceId })

    async function calendarSource(scope, sourceId, sourceType, label) {
      if (await has(sourceType, sourceId)) { skipped.push(`${sourceType}:${sourceId}`); return }
      const before = await calendar.readCalendarSource(em, scope, sourceId)
      await calendar.finishCalendarChange(em, before, { effectiveFrom, reason: reason(label),
        expectedRevision: before.revision, expectedCurrentSourceHash: before.currentSourceHash }, actorUserId)
      created[sourceType]++
    }

    await calendarSource('GLOBAL', 0, 'CALENDAR_GLOBAL', 'التقويم العام')
    for (const branch of await em.find(Branch, { order: { id: 'ASC' } })) {
      await calendarSource('BRANCH', branch.id, 'CALENDAR_BRANCH', `تقويم الفرع ${branch.id}`)
    }
    // قبل إسناد الموظفين: saveEmployeeAttendanceRule يتحقق أن الجدول فعال في تاريخ السريان
    for (const schedule of await em.find(WorkSchedule, { order: { id: 'ASC' } })) {
      if (await has('WORK_SCHEDULE', schedule.id)) { skipped.push(`WORK_SCHEDULE:${schedule.id}`); continue }
      const snapshot = await rules.attendanceSourceSnapshot(em, schedule)
      await rules.appendAttendanceRuleVersion(em, { sourceType: 'WORK_SCHEDULE', sourceId: schedule.id, before: { ...snapshot }, snapshot,
        effectiveFrom, actorUserId, reason: reason(`جدول العمل ${schedule.id}`) })
      created.WORK_SCHEDULE++
    }
    for (const employee of await em.find(Employee, { order: { id: 'ASC' } })) {
      if (employee.branchId == null) unresolved.push({ employeeId: employee.id, source: 'EMPLOYEE_ORG', reason: 'الموظف بلا فرع؛ لا نخترع فرعًا' })
      else await calendarSource('EMPLOYEE', employee.id, 'EMPLOYEE_ORG', `فرع الموظف ${employee.id}`)
      if (await has('EMPLOYEE', employee.id)) { skipped.push(`EMPLOYEE:${employee.id}`); continue }
      const version = await rules.saveEmployeeAttendanceRule(em, employee, { workScheduleId: employee.workScheduleId ?? null,
        effectiveFrom, reason: reason(`إسناد جدول الموظف ${employee.id}`), actorUserId })
      if (version) created.EMPLOYEE++
    }

    log(`effectiveFrom=${effectiveFrom} (earliest recorded ${earliest}, cycle day ${cycleDay}), actor=${actorUserId}`)
    log(`created: ${JSON.stringify(created)}; skipped: ${skipped.length}; unresolved: ${unresolved.length}`)
    return { effectiveFrom, earliestRecordedDate: earliest, cycleStartDay: cycleDay, actorUserId, created, skipped, unresolved }
  },
}
