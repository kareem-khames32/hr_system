// محرّك الحضور — مصدر واحد لحساب التأخير من الجدول الأسبوعي المؤرَّخ
// عند بناء الـ Backend يقرأ من weekly_schedule_entries بدل هذه المرآة

export interface ShiftTime {
  name: string
  start: string // HH:mm
  end: string // HH:mm
}

export type ComputedStatus = 'present' | 'late' | 'absent' | 'early_leave'

const DEFAULT_SHIFT: ShiftTime = { name: 'صباحي', start: '08:00', end: '17:00' }
const GRACE_MINUTES = 10 // فترة السماح

// مفتاح الأسبوع = تاريخ الأحد الذي يقع فيه اليوم
export const weekKeyOf = (dateStr: string): string => {
  const d = new Date(dateStr)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // الأحد = 0
  return d.toISOString().slice(0, 10)
}

// مرآة الجدول الأسبوعي المؤرَّخ: أسبوع → موظف → وردية
// (نفس بيانات شاشة «الجدول الأسبوعي»: أحمد وردية 10 هذا الأسبوع ووردية 11 القادم)
const datedSchedules: Record<string, Record<string, ShiftTime>> = {
  '2026-07-05': {
    EMP001: { name: 'وردية 10', start: '10:00', end: '19:00' },
  },
  '2026-07-12': {
    EMP001: { name: 'وردية 11', start: '11:00', end: '20:00' },
  },
}

// وردية الموظف في يوم محدد — حسب أسبوع ذلك اليوم
export const shiftFor = (employeeId: string, dateStr: string): ShiftTime => {
  const week = datedSchedules[weekKeyOf(dateStr)]
  return week?.[employeeId] ?? DEFAULT_SHIFT
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export interface AttendanceComputation {
  status: ComputedStatus
  lateMinutes: number
  earlyLeaveMinutes: number
}

// الحساب الفعلي: البصمة مقابل وردية اليوم + فترة السماح
export const computeAttendance = (
  checkIn: string | null,
  checkOut: string | null,
  shift: ShiftTime,
  graceMinutes: number = GRACE_MINUTES
): AttendanceComputation => {
  if (!checkIn) {
    return { status: 'absent', lateMinutes: 0, earlyLeaveMinutes: 0 }
  }
  const lateRaw = toMinutes(checkIn) - toMinutes(shift.start)
  const lateMinutes = lateRaw > graceMinutes ? lateRaw : 0

  let earlyLeaveMinutes = 0
  if (checkOut) {
    const earlyRaw = toMinutes(shift.end) - toMinutes(checkOut)
    earlyLeaveMinutes = earlyRaw > graceMinutes ? earlyRaw : 0
  }

  const status: ComputedStatus =
    lateMinutes > 0 ? 'late' : earlyLeaveMinutes > 0 ? 'early_leave' : 'present'

  return { status, lateMinutes, earlyLeaveMinutes }
}

export const formatWorkHours = (
  checkIn: string | null,
  checkOut: string | null
): string | null => {
  if (!checkIn || !checkOut) return null
  const mins = toMinutes(checkOut) - toMinutes(checkIn)
  if (mins <= 0) return null
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}
