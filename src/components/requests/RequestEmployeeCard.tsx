'use client'

// بطاقة صاحب الطلب أعلى كل شاشة «تفاصيل الطلب» (بانتظار موافقتي، طلباتي، لوحة الطلبات):
// المعتمد كان بيشوف حمولة الطلب من غير ما يعرف الموظف مين ولا شغال فين، والموارد البشرية ماكانتش
// شايفة الطلب اللي قدّمته نيابةً اتقدّم لمين. البيانات من الخادم مع تفاصيل الطلب نفسها (بلا GET /employees)،
// والطلب السرّي المحجوب مايرجعش معاه أي بيانات — فالبطاقة مابتظهرش أصلًا.
import { UserRound } from 'lucide-react'
import type { ApiRequestRequester, ApiRequestSubmittedBy } from '@/lib/api'

export default function RequestEmployeeCard({ requester, submittedBy }: {
  requester?: ApiRequestRequester | null
  submittedBy?: ApiRequestSubmittedBy | null
}) {
  if (!requester) return null
  const rows: Array<[string, string | null]> = [
    ['المسمى الوظيفي', requester.jobTitle],
    ['القسم', requester.departmentName],
    ['الفرع', requester.branchName],
    ['الفريق', requester.teamName],
    ['المدير المباشر', requester.directManagerName],
  ]
  return (
    <section aria-label="بيانات الموظف صاحب الطلب" className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><UserRound size={20} /></span>
        <div className="min-w-0">
          <p className="font-bold text-gray-800 break-words">{requester.fullName}</p>
          {requester.employeeCode && <p className="text-xs text-gray-500">كود الموظف: <span dir="ltr">{requester.employeeCode}</span></p>}
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-sm text-gray-800 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {submittedBy && (
        <p className="text-xs rounded-lg bg-indigo-50 text-indigo-700 px-3 py-2">قدّمه نيابةً: {submittedBy.displayName || 'مستخدم آخر'}</p>
      )}
    </section>
  )
}
