// B3.1-ج: فترات التجربة — القايمة والقرار (الخادم بيحكم: عرض الموظفين بنطاق الفروع، أو المدير المباشر لمرؤوسيه)
import { apiFetch } from './api'

export type ProbationDecision = 'CONFIRM' | 'EXTEND' | 'TERMINATE'
export const PROBATION_DECISION_LABELS: Record<ProbationDecision, string> = { CONFIRM: 'تثبيت', EXTEND: 'تمديد', TERMINATE: 'إنهاء' }

export interface ApiProbationEmployee {
  id: number; employeeCode: string; fullName: string; jobTitle: string | null
  branchId: number | null; branchName: string | null; joinDate: string | null
  /** نهاية التجربة: المكتوبة على الملف، أو المحسوبة من المدة الافتراضية (endFromDefault)؛ null = من غير تاريخ */
  probationEndDate: string | null; endFromDefault: boolean; daysLeft: number | null
  canDecide: boolean
}
export interface ApiProbationList {
  today: string; noticeDays: number; defaultDays: number; canManageSettings: boolean
  employees: ApiProbationEmployee[]
}

export const fetchProbation = () => apiFetch<ApiProbationList>('/probation')
export const decideProbation = (employeeId: number, body: { decision: ProbationDecision; newEndDate?: string; reason?: string }) =>
  apiFetch<{ employeeId: number; decision: ProbationDecision; status: string; probationEndDate: string | null }>(`/probation/${employeeId}/decision`, {
    method: 'POST', body: JSON.stringify(body),
  })
