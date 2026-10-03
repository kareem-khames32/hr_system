// B1.11 / D12: الموظفين اللي مديرهم المسجل في الملف غير قائد فريقهم — كشف للعرض بس، والخادم بيحسبه بنطاق الحساب.
// المدير المسجل بيتقدم على قائد الفريق في «المدير المباشر»، فاعتمادات الموظفين دول بتروح للمسجل مش للقائد.
// مسارات نسبية (لا @/) عشان اختبارات الخادم بتحمّل الملف ده.
import { apiFetch } from './api'

export interface ApiMismatchPerson {
  // null = موظف خارج نطاق الحساب (اسمه مايتقالش)
  id: number | null
  employeeCode: string | null
  fullName: string | null
  isActive: boolean | null
}

export interface ApiManagerLeaderMismatch {
  employeeId: number
  employeeCode: string
  fullName: string
  team: { id: number | null; name: string }
  recordedManager: ApiMismatchPerson
  teamLeader: ApiMismatchPerson
}

export const fetchManagerLeaderMismatches = () =>
  apiFetch<{ rows: ApiManagerLeaderMismatch[]; total: number }>('/teams/manager-mismatches')

// اسم الشخص في الكشف: الكود والاسم، والملف المحذوف «موظف #رقم»، والموقوف عليه علامة
export const mismatchPersonLabel = (person: ApiMismatchPerson): string => {
  if (person.fullName == null) return person.id != null ? `موظف #${person.id}` : '—'
  const name = person.employeeCode ? `${person.employeeCode} — ${person.fullName}` : person.fullName
  return person.isActive === false ? `${name} (غير نشط)` : name
}
