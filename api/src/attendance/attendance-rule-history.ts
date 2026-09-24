import { BadRequestException, ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { Shift, WorkSchedule } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُقفل دوام الموظف في فترته
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { AttendanceDay, ScheduleDayOverride, ScheduleEntry } from './attendance.entities'
import { AttendanceRuleSourceType, AttendanceRuleVersion, EmployeeAttendanceRuleSnapshot } from './attendance-rule.entities'

export interface AttendanceFlexPolicySnapshot {
  countEarlyWorkTowardRequired: boolean
  prorateWindowOnPartialLeave: boolean
  unpaidBreakMinutes: number
  maxSessionMinutes: number
  windowSupersedesGrace: boolean
  missingCheckoutPolicy: 'MANUAL_ONLY'
  shortfallGraceMinutes: number
}

export function attendanceRuleDate(value: unknown): string {
  const date = typeof value === 'string' ? value : ''
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '1900-01-01') {
    throw new BadRequestException('تاريخ سريان إعداد الدوام مطلوب بصيغة YYYY-MM-DD صحيحة')
  }
  return date
}

export function attendanceRuleToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function attendanceRuleChange(input: { effectiveFrom?: unknown; changeReason?: unknown }, creation = false) {
  const effectiveFrom = attendanceRuleDate(input.effectiveFrom ?? (creation ? attendanceRuleToday() : undefined))
  const reason = input.changeReason ?? (creation ? 'إنشاء تعريف دوام جديد' : undefined)
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    throw new BadRequestException('سبب تغيير إعداد الدوام مطلوب ولا يتجاوز 500 حرف')
  }
  return { effectiveFrom, reason: reason.trim() }
}

export async function resolveAttendanceRule<T extends object>(
  em: EntityManager, sourceType: AttendanceRuleSourceType, sourceId: number, date: string, fallback: T
): Promise<{ snapshot: T; versionId: number | null; version: number | null; effectiveFrom: string | null; legacyBaseline: boolean; unavailable?: boolean }> {
  attendanceRuleDate(date)
  return pickAttendanceRule(await readAttendanceRuleVersions(em, sourceType, sourceId), date, fallback)
}

/** كل نسخ مصدر واحد — نفس قراءة resolveAttendanceRule؛ دفعة حساب الأيام بتقراها مرة للمصدر وتختار بـpickAttendanceRule. */
export function readAttendanceRuleVersions(em: EntityManager, sourceType: AttendanceRuleSourceType, sourceId: number) {
  return em.find(AttendanceRuleVersion, { where: { sourceType, sourceId }, order: { version: 'DESC' } })
}

// اختيار النسخة السارية من صفوف مصدر واحد محمّلة مسبقًا (مرتبة أو لا) — نفس قاعدة
// resolveAttendanceRule حرفيًا؛ القوائم الجماعية تقرأ الصفوف كلها باستعلام واحد (HRC-09)
export function pickAttendanceRule<T extends object>(
  loaded: AttendanceRuleVersion[], date: string, fallback: T
): { snapshot: T; versionId: number | null; version: number | null; effectiveFrom: string | null; legacyBaseline: boolean; unavailable?: boolean } {
  const rows = [...loaded].sort((a, b) => b.version - a.version)
  const active = rows.filter(row => row.effectiveFrom !== null && row.effectiveFrom <= date)
    .sort((a, b) => b.effectiveFrom!.localeCompare(a.effectiveFrom!) || b.version - a.version)[0]
  const row = active ?? rows.find(candidate => candidate.legacyBaseline && candidate.effectiveFrom === null)
  if (row) return { snapshot: row.snapshot as T, versionId: row.id, version: row.version, effectiveFrom: row.effectiveFrom, legacyBaseline: row.legacyBaseline }
  if (rows.length) return { snapshot: { ...fallback, isActive: false, flexEnabled: false }, versionId: null, version: null, effectiveFrom: null, legacyBaseline: false, unavailable: true }
  return { snapshot: { ...fallback }, versionId: null, version: null, effectiveFrom: null, legacyBaseline: true }
}

export async function attendanceFlexPolicy(em: EntityManager): Promise<AttendanceFlexPolicySnapshot> {
  const fields = {
    countEarlyWorkTowardRequired: ['count_early_work_toward_required', false],
    prorateWindowOnPartialLeave: ['prorate_window_on_partial_leave', false],
    unpaidBreakMinutes: ['unpaid_break_minutes', 0],
    maxSessionMinutes: ['max_session_minutes', 900],
    windowSupersedesGrace: ['window_supersedes_grace', true],
    missingCheckoutPolicy: ['missing_checkout_policy', 'MANUAL_ONLY'],
    shortfallGraceMinutes: ['shortfall_grace_minutes', 10],
  } as const
  const rows = await em.find(RequestsConfig, { where: { key: In(Object.values(fields).map(([key]) => `attendance.flex.${key}`)) } })
  const configs = new Map(rows.map(row => [row.key, row.value]))
  const result: Record<string, unknown> = {}
  for (const [field, [suffix, fallback]] of Object.entries(fields)) {
    const raw = configs.get(`attendance.flex.${suffix}`)
    let value: unknown = raw === undefined ? fallback : raw
    if (typeof fallback === 'boolean') {
      if (![true, false, 'true', 'false', '1', '0'].includes(value as any)) throw new BadRequestException(`إعداد attendance.flex.${suffix} غير صالح`)
      value = value === true || value === 'true' || value === '1'
    } else if (typeof fallback === 'number') {
      value = Number(value)
      if (!Number.isSafeInteger(value) || Number(value) < (field === 'maxSessionMinutes' ? 1 : 0) || Number(value) > 1440) throw new BadRequestException(`إعداد attendance.flex.${suffix} غير صالح`)
    } else if (value !== 'MANUAL_ONLY') throw new BadRequestException('سياسة بصمة الانصراف غير صالحة')
    result[field] = value
  }
  return result as unknown as AttendanceFlexPolicySnapshot
}

export async function attendanceSourceSnapshot(em: EntityManager, row: Record<string, any>) {
  const snapshot = { ...row }
  delete snapshot.employeeCount
  delete snapshot.attendanceRuleVersion
  // حفظ مصدر جديد أو تعديل مؤثر يطلب defaults جديدة بإفراغ flexPolicy؛ تعديل
  // الاسم وحده يحتفظ بالسياسة الموجودة. العام لا يتسرّب إلى النسخ المؤرخة لاحقًا.
  if (snapshot.flexPolicy == null || snapshot.generalGraceMinutes == null) {
    snapshot.generalGraceMinutes = await attendanceGeneralGrace(em)
  }
  snapshot.flexPolicy = snapshot.flexPolicy ?? await attendanceFlexPolicy(em)
  return snapshot
}

function validAttendanceGrace(value: unknown) {
  const minutes = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(minutes) || minutes < 0) {
    throw new BadRequestException('سماحية التأخير غير صالحة؛ راجع إعداد الدوام')
  }
  return minutes
}

export async function attendanceGeneralGrace(em: EntityManager) {
  const row = await em.findOneBy(RequestsConfig, { key: 'attendance.grace_minutes' })
  return validAttendanceGrace(row?.value ?? '10')
}

export type AttendanceGraceSource = 'SHIFT_OVERRIDE' | 'SOURCE_SNAPSHOT' | 'LEGACY_DAY_SNAPSHOT' | 'LEGACY_CURRENT_CONFIG'

export async function resolveAttendanceGrace(em: EntityManager, date: string, source: {
  sourceType: 'SHIFT' | 'WORK_SCHEDULE' | null; sourceId: number | null;
  sourceVersionId: number | null; sourceVersion: number | null; sourceSettings: Record<string, any> | null
}, savedDaySnapshot?: Record<string, any> | null,
// دفعة حساب الأيام بتمرر قراءة واحدة للسماحية العامة بدل قراءة لكل يوم (نفس الإعداد ونفس التحقق)
readGeneralGrace: () => Promise<number> = () => attendanceGeneralGrace(em)): Promise<{ minutes: number; source: AttendanceGraceSource }> {
  if (source.sourceSettings?.graceMinutes != null) {
    return { minutes: validAttendanceGrace(source.sourceSettings.graceMinutes), source: 'SHIFT_OVERRIDE' }
  }
  if (source.sourceSettings?.generalGraceMinutes != null) {
    return { minutes: validAttendanceGrace(source.sourceSettings.generalGraceMinutes), source: 'SOURCE_SNAPSHOT' }
  }
  // النسخة القديمة نفسها + اليوم نفسه: هذا دليل على القيمة المستخدمة فعليًا،
  // وليس تحديثًا أو اختراعًا لإعداد عام تاريخي داخل سجل النسخ غير القابل للتعديل.
  if (source.sourceVersionId != null && savedDaySnapshot?.date === date
    && savedDaySnapshot.sourceType === source.sourceType && savedDaySnapshot.sourceId === source.sourceId
    && savedDaySnapshot.sourceVersionId === source.sourceVersionId && savedDaySnapshot.sourceVersion === source.sourceVersion
    && savedDaySnapshot.graceMinutes != null) {
    return { minutes: validAttendanceGrace(savedDaySnapshot.graceMinutes),
      source: savedDaySnapshot.graceSource === 'LEGACY_CURRENT_CONFIG' ? 'LEGACY_CURRENT_CONFIG' : 'LEGACY_DAY_SNAPSHOT' }
  }
  return { minutes: await readGeneralGrace(), source: 'LEGACY_CURRENT_CONFIG' }
}

// يستدعيه حفظ الإعدادات العامة بعد الأقفال وقبل تعديل القيم؛ لا ينسب الماضي إلى
// defaults جديدة عند أول تعديل لاحق لتعريف قديم.
export async function captureLegacyAttendanceRuleBaselines(em: EntityManager, actorUserId?: number) {
  for (const [sourceType, entity] of [['SHIFT', Shift], ['WORK_SCHEDULE', WorkSchedule]] as const) {
    for (const row of await em.find(entity)) {
      if (await em.existsBy(AttendanceRuleVersion, { sourceType, sourceId: row.id })) continue
      await em.save(AttendanceRuleVersion, em.create(AttendanceRuleVersion, {
        sourceType, sourceId: row.id, version: 0, effectiveFrom: null, legacyBaseline: true,
        snapshot: await attendanceSourceSnapshot(em, row), actorUserId: actorUserId ?? null,
        reason: 'حفظ المصدر القديم وإعداداته قبل تغيير الإعداد العام؛ تاريخ السريان السابق غير مسجل',
      }))
    }
  }
}

// سماحية التأخير العامة مجمّدة داخل النسخة المؤرخة لكل تعريف دوام (resolveAttendanceGrace
// بيقرا sourceSettings.generalGraceMinutes)، فتغيير الإعداد لوحده كان مايوصلش لموظف عنده
// تعريف قائم — التعريف الجديد بس هو اللي بياخد القيمة الحيّة. الحل بنفس مسار تعديل تعريف
// الدوام: نسخة مؤرخة جديدة (appendAttendanceRuleVersion) بتاريخ التغيير لكل تعريف ساري.
// الأيام قبل تاريخ السريان تفضل على نسختها القديمة بقيمتها القديمة — الماضي ما يتغيرش.
// الـgraceMinutes على مستوى الوردية بيعلو العام كما هو (resolveAttendanceGrace بيقراه أولاً).
// يُستدعى بعد captureLegacyAttendanceRuleBaselines وقبل كتابة القيمة الجديدة في الإعدادات.
export async function applyGeneralGraceToAttendanceRules(em: EntityManager, minutes: number, effectiveFrom: string,
  reason: string, actorUserId?: number) {
  const from = attendanceRuleDate(effectiveFrom)
  const appended: Array<{ sourceType: AttendanceRuleSourceType; sourceId: number; versionId: number; version: number }> = []
  for (const [sourceType, entity] of [['SHIFT', Shift], ['WORK_SCHEDULE', WorkSchedule]] as const) {
    for (const row of await em.find(entity, { order: { id: 'ASC' } })) {
      const active = await resolveAttendanceRule<Record<string, any>>(em, sourceType, row.id, from, row as Record<string, any>)
      // تعريف كل نسخه مؤرخة في المستقبل: مالوش تعريف ساري في تاريخ التغيير، ونسخته
      // المستقبلية جمّدت قيمتها بنفسها — نسخة «بلا تعريف» هنا كانت هتوقّفه من اليوم.
      if (active.unavailable) continue
      const current = active.snapshot.generalGraceMinutes
      // نفس القيمة السارية = لا نسخة بلا داعٍ (ولا تكثير نسخ على كل حفظة إعدادات)
      if (current != null && Number(current) === minutes) continue
      const version = await appendAttendanceRuleVersion(em, { sourceType, sourceId: row.id,
        before: await attendanceSourceSnapshot(em, row), snapshot: { ...active.snapshot, generalGraceMinutes: minutes },
        effectiveFrom: from, actorUserId, reason })
      appended.push({ sourceType, sourceId: row.id, versionId: version.id, version: version.version })
    }
  }
  return appended
}

// لا كتابة في SQL قبل هذه الأقفال: حساب الرواتب يقرأ الدوام باتصال آخر وهو يحمل
// employee-finance؛ أخذ صف الدوام أولًا ثم انتظار الموظف يصنع دورة deadlock.
export async function lockAttendanceRuleMutation(em: EntityManager, employeeIds?: number[]) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Attendance rule mutation requires a transaction')
  const rows = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = N'hr:attendance-rule-mutations', @LockMode = 'Exclusive',
      @LockOwner = 'Transaction', @LockTimeout = 10000;
    SELECT @result AS lockResult;`)
  if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('توجد عملية تعديل دوام جارية؛ حاول مجددًا')
  const ids = employeeIds ?? (await em.find(Employee, { select: { id: true } })).map(employee => employee.id)
  await lockPayrollEmployees(em, ids)
}

// نفس الحاجز يحمي أي تغيير على أيام الموظف داخل مسير معتمد أو مصروف (الإيقاف عن العمل بيمرر رسالته)
export async function assertAttendanceRulePeriodOpen(em: EntityManager, employeeIds: number[], from: string, to = '9999-12-31',
  message = 'سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة') {
  attendanceRuleDate(from)
  for (const employeeId of [...new Set(employeeIds)]) {
    const locked = await em.query(`SELECT TOP (1) r.id FROM dbo.payroll_runs r
      WHERE r.status IN ('APPROVED','PAID') AND r.startDate<=@0 AND r.endDate>=@1
      AND (EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.runId=r.id AND i.employeeId=@2)
        OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.runId=r.id AND m.employeeId=@2 AND (m.membershipStatus IS NULL OR m.membershipStatus='INCLUDED')))
      AND ${payrollLineNotReversedSql('r.id', '@2')}`,
    [to, from, employeeId])
    if (locked.length) throw new ConflictException(message)
  }
}

export async function attendanceRuleChangeEnd(em: EntityManager, type: AttendanceRuleSourceType, id: number, from: string) {
  const next = (await em.find(AttendanceRuleVersion, { where: { sourceType: type, sourceId: id } }))
    .filter(row => row.effectiveFrom && row.effectiveFrom > from)
    .sort((a, b) => a.effectiveFrom!.localeCompare(b.effectiveFrom!))[0]
  if (!next?.effectiveFrom) return '9999-12-31'
  const date = new Date(`${next.effectiveFrom}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export async function attendanceSourceEmployees(em: EntityManager, type: 'SHIFT' | 'WORK_SCHEDULE', id: number, before: Record<string, any> | null, after: Record<string, any>) {
  if (type === 'SHIFT') {
    const rows = await Promise.all([
      em.find(ScheduleEntry, { where: [{ shiftId: id }, ...(before?.name ? [{ shiftName: before.name }] : [])] }),
      em.find(ScheduleDayOverride, { where: [{ shiftId: id }, ...(before?.name ? [{ shiftName: before.name }] : [])] }),
      em.find(AttendanceDay, { where: { shiftId: id } }),
    ])
    return [...new Set(rows.flat().map(row => row.employeeId))]
  }
  const versions = await em.find(AttendanceRuleVersion, { where: { sourceType: 'WORK_SCHEDULE', sourceId: id } })
  if (before?.isDefault || after.isDefault || versions.some(row => row.snapshot.isDefault)) {
    return (await em.find(Employee, { select: { id: true } })).map(employee => employee.id)
  }
  const assigned = await em.find(Employee, { where: { workScheduleId: id }, select: { id: true } })
  const employeeVersions = await em.find(AttendanceRuleVersion, { where: { sourceType: 'EMPLOYEE' } })
  return [...new Set([...assigned.map(employee => employee.id), ...employeeVersions.filter(row => row.snapshot.workScheduleId === id).map(row => row.sourceId)])]
}

export async function appendAttendanceRuleVersion(em: EntityManager, input: {
  sourceType: AttendanceRuleSourceType; sourceId: number; before: Record<string, any> | null;
  snapshot: Record<string, any>; effectiveFrom: string; actorUserId?: number; reason: string
}) {
  const repo = em.getRepository(AttendanceRuleVersion)
  const existing = await repo.find({ where: { sourceType: input.sourceType, sourceId: input.sourceId }, order: { version: 'DESC' } })
  let version = existing[0]?.version ?? 0
  if (!existing.length && input.before) {
    await repo.save(repo.create({ sourceType: input.sourceType, sourceId: input.sourceId, version: 0,
      effectiveFrom: null, snapshot: input.before, legacyBaseline: true, actorUserId: input.actorUserId ?? null,
      reason: 'حفظ القيم الموجودة في المصدر القديم قبل أول تعديل مؤرخ؛ تاريخها السابق غير مسجل' }))
  }
  version += 1
  return repo.save(repo.create({ sourceType: input.sourceType, sourceId: input.sourceId, version,
    effectiveFrom: attendanceRuleDate(input.effectiveFrom), snapshot: input.snapshot, legacyBaseline: false,
    actorUserId: input.actorUserId ?? null, reason: input.reason }))
}

export function employeeAttendanceFallback(employee: Pick<Employee, 'workScheduleId'>): EmployeeAttendanceRuleSnapshot {
  return { workScheduleId: employee.workScheduleId ?? null, flexOverrideMode: 'INHERIT' }
}

async function sourceForEmployeeDate(em: EntityManager, employee: Employee, state: EmployeeAttendanceRuleSnapshot, date: string) {
  const override = await em.findOneBy(ScheduleDayOverride, { employeeId: employee.id, date })
  const week = new Date(`${date}T12:00:00Z`)
  week.setUTCDate(week.getUTCDate() - week.getUTCDay())
  const entry = override ?? await em.findOneBy(ScheduleEntry, { employeeId: employee.id, weekStart: week.toISOString().slice(0, 10) })
  if (entry) {
    const shift = entry.shiftId ? await em.findOneBy(Shift, { id: entry.shiftId }) : await em.findOneBy(Shift, { name: entry.shiftName })
    if (!shift) return null
    return (await resolveAttendanceRule(em, 'SHIFT', shift.id, date, shift)).snapshot
  }
  if (state.workScheduleId) {
    const schedule = await em.findOneBy(WorkSchedule, { id: state.workScheduleId })
    if (schedule) {
      const resolved = await resolveAttendanceRule(em, 'WORK_SCHEDULE', schedule.id, date, schedule)
      if (!resolved.unavailable && resolved.snapshot.isActive !== false) return resolved.snapshot
    }
  }
  for (const schedule of await em.find(WorkSchedule, { order: { id: 'ASC' } })) {
    const resolved = await resolveAttendanceRule(em, 'WORK_SCHEDULE', schedule.id, date, schedule)
    if (!resolved.unavailable && resolved.snapshot.isDefault && resolved.snapshot.isActive) return resolved.snapshot
  }
  return null
}

export function validateAttendanceFlexSource(source: Record<string, any>, forceEnabled = false) {
  for (const key of ['flexWindowMinutes', 'requiredWorkMinutes']) {
    if (source[key] != null && (!Number.isSafeInteger(Number(source[key])) || Number(source[key]) < 1 || Number(source[key]) > 1440)) {
      throw new BadRequestException(`${key}: عدد دقائق صحيح بين 1 و1440 مطلوب`)
    }
  }
  const enabled = forceEnabled || source.flexEnabled === true || (source.flexEnabled == null && source.shiftMode === 'flexible')
  if (!forceEnabled && source.isActive === false) return
  if (!enabled) return
  const required = source.requiredWorkMinutes != null ? Number(source.requiredWorkMinutes)
    : source.requiredHours != null ? Math.round(Number(source.requiredHours) * 60) : null
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(source.startTime ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(source.endTime ?? '') || source.startTime === source.endTime) {
    throw new BadRequestException('تفعيل المرونة يحتاج بداية ونهاية دوام صالحتين')
  }
  if (!source.flexWindowMinutes || !required || source.flexWindowMinutes >= required) {
    throw new BadRequestException('تفعيل المرونة يحتاج مدة نافذة صريحة موجبة وأقل من دقائق العمل المطلوبة؛ أكمل تعريف الدوام القديم أولًا')
  }
  const policy: AttendanceFlexPolicySnapshot | undefined = source.flexPolicy
  if (policy && required + policy.unpaidBreakMinutes + Number(source.flexWindowMinutes) > policy.maxSessionMinutes) {
    throw new BadRequestException('النافذة والساعات المطلوبة تتجاوز الحد الأقصى لجلسة الدوام')
  }
}

// caller يمتلك القفل العام والمالي بالفعل؛ لا نعيد أخذهما داخل هذا المساعد.
export async function saveEmployeeAttendanceRule(em: EntityManager, employee: Employee, input: {
  workScheduleId?: number | null; flexOverrideMode?: unknown; effectiveFrom: string; reason: string; actorUserId?: number
}) {
  const from = attendanceRuleDate(input.effectiveFrom)
  const before = await resolveAttendanceRule(em, 'EMPLOYEE', employee.id, from, employeeAttendanceFallback(employee))
  const mode = input.flexOverrideMode ?? before.snapshot.flexOverrideMode
  if (!['INHERIT', 'ENABLED', 'DISABLED'].includes(String(mode))) throw new BadRequestException('اختيار المرونة: INHERIT أو ENABLED أو DISABLED فقط')
  const snapshot: EmployeeAttendanceRuleSnapshot = {
    workScheduleId: input.workScheduleId !== undefined ? input.workScheduleId : before.snapshot.workScheduleId,
    flexOverrideMode: mode as EmployeeAttendanceRuleSnapshot['flexOverrideMode'],
  }
  if (snapshot.workScheduleId != null) {
    if (!Number.isSafeInteger(snapshot.workScheduleId) || snapshot.workScheduleId < 1) throw new BadRequestException('جدول عمل الموظف غير صالح')
    const row = await em.findOneBy(WorkSchedule, { id: snapshot.workScheduleId })
    if (!row) throw new BadRequestException('جدول عمل الموظف غير موجود')
    // جدول خاص بفرع يتسند لموظفي فرعه بس (قرار المالك 16 سبتمبر) — من شاشة الموظف أو الإسناد الجماعي.
    // employee.branchId هنا = فرع الموظف بعد الحفظ (تعديل الملف بيحدّثه قبل النداء لو الفرع اتغير في نفس الحفظة)
    const issue = scheduleBranchIssue(row, employee.branchId)
    if (issue) throw new BadRequestException(issue)
    const resolved = await resolveAttendanceRule(em, 'WORK_SCHEDULE', row.id, from, row)
    if (resolved.unavailable || !resolved.snapshot.isActive) throw new BadRequestException('جدول العمل غير فعال في تاريخ السريان المختار')
  }
  if (snapshot.flexOverrideMode === 'ENABLED') {
    const source = await sourceForEmployeeDate(em, employee, snapshot, from)
    if (!source) throw new BadRequestException('لا يمكن تفعيل المرونة للموظف بلا تعريف دوام صالح لهذا اليوم')
    validateAttendanceFlexSource(await attendanceSourceSnapshot(em, source), true)
  }
  // Explicit first confirmation is evidence even when the legacy values match.
  if (JSON.stringify(snapshot) === JSON.stringify(before.snapshot) && !before.legacyBaseline) return null
  await assertAttendanceRulePeriodOpen(em, [employee.id], from, await attendanceRuleChangeEnd(em, 'EMPLOYEE', employee.id, from))
  const version = await appendAttendanceRuleVersion(em, { sourceType: 'EMPLOYEE', sourceId: employee.id,
    before: employeeAttendanceFallback(employee), snapshot, effectiveFrom: from, actorUserId: input.actorUserId, reason: input.reason })
  // العمود المرجعي يبقى آخر اختيار زمني للعرض القديم؛ محرك اليوم يقرأ النسخة أولًا.
  const latest = await resolveAttendanceRule(em, 'EMPLOYEE', employee.id, '9999-12-31', snapshot)
  employee.workScheduleId = latest.snapshot.workScheduleId as any
  return version
}

/**
 * جدول خاص بفرع تاني غير مسموح لموظف الفرع ده؛ جدول كل الشركة (branchId = null) مسموح للكل.
 * moving = true: نقل من تعديل الملف (الجدول الجديد بيتختار في نفس الحفظة).
 * moving = 'transfer': طلب نقل — جدول الفرع الجديد مينفعش يتسند قبل النقل، فالحل جدول لكل الشركة الأول.
 */
export function scheduleBranchIssue(schedule: { name: string; branchId: number | null } | null, branchId: number | null | undefined,
  moving: boolean | 'transfer' = false): string | null {
  if (!schedule || schedule.branchId == null || Number(schedule.branchId) === Number(branchId)) return null
  if (moving === 'transfer') {
    return `جدول العمل «${schedule.name}» خاص بفرع تاني؛ حوّل الموظف لجدول لكل الشركة الأول (ساري من تاريخ النقل أو قبله)، وبعد تنفيذ النقل اختار له جدول الفرع الجديد`
  }
  return moving
    ? `جدول العمل «${schedule.name}» خاص بفرع تاني؛ اختار جدول للفرع الجديد أو جدول لكل الشركة قبل نقل الموظف`
    : `جدول العمل «${schedule.name}» خاص بفرع تاني؛ اختار جدول لفرع الموظف أو جدول لكل الشركة`
}

/**
 * نقل الموظف لفرع تاني (تعديل الملف أو طلب نقل منفّذ): جدوله الساري من تاريخ النقل، وأي جدول مؤرخ بعده،
 * لازم يكون جدول للفرع الجديد أو لكل الشركة — وإلا يترفض النقل برسالة تطلب اختيار جدول مناسب.
 */
export async function assertEmployeeSchedulesFitBranch(em: EntityManager, employee: Pick<Employee, 'id' | 'workScheduleId'>, branchId: number, from: string,
  via: 'profile' | 'transfer' = 'profile') {
  attendanceRuleDate(from)
  const versions = await em.find(AttendanceRuleVersion, { where: { sourceType: 'EMPLOYEE', sourceId: employee.id } })
  const ids = new Set<number>()
  const active = pickAttendanceRule<EmployeeAttendanceRuleSnapshot>(versions, from, employeeAttendanceFallback(employee)).snapshot.workScheduleId
  if (active != null) ids.add(Number(active))
  for (const version of versions) {
    const later = (version.snapshot as EmployeeAttendanceRuleSnapshot | null)?.workScheduleId
    if (version.effectiveFrom && version.effectiveFrom > from && later != null) ids.add(Number(later))
  }
  if (!ids.size) return
  const schedules = await em.find(WorkSchedule, { where: { id: In([...ids]) }, order: { id: 'ASC' } })
  for (const schedule of schedules) {
    const issue = scheduleBranchIssue(schedule, branchId, via === 'transfer' ? 'transfer' : true)
    if (issue) throw new BadRequestException(issue)
  }
}
