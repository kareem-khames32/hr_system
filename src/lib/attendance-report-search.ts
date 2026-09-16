// بحث شاشة تقارير الحضور: نفس المطابقة للجدولين — الاسم أو الرقم الوظيفي
export interface ReportSearchRow { employeeId: number; fullName?: string | null; employeeCode?: string | null }

export const matchesEmployeeSearch = (row: ReportSearchRow, term: string): boolean =>
  (row.fullName ?? '').includes(term) || (row.employeeCode ?? '').toLowerCase().includes(term.toLowerCase())

// صفوف الساعات الإضافية مفيهاش رقم وظيفي: الصف يظهر لو اسمه طابق، أو لو نفس الموظف طابق في جدول الحضور (بالرقم مثلاً)
export function filterAttendanceReportRows<A extends ReportSearchRow, O extends ReportSearchRow>(attendance: A[], overtime: O[], term: string) {
  const matchedAttendance = attendance.filter(row => matchesEmployeeSearch(row, term))
  const matchedIds = new Set(matchedAttendance.map(row => Number(row.employeeId)))
  const matchedOvertime = overtime.filter(row => matchesEmployeeSearch(row, term) || matchedIds.has(Number(row.employeeId)))
  return { attendance: matchedAttendance, overtime: matchedOvertime }
}
