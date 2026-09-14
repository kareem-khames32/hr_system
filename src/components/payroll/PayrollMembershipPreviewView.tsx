'use client'

// الخطوة 17: عرض معاينة العضوية (قراءة فقط) — الداخلون بالتغطية والمعامل وأساس الأيام، والمستبعدون بأكوادهم.
import Link from 'next/link'
import { MEMBERSHIP_EXCLUSION_LABELS, SELECTION_MODE_LABELS, type PayrollMembershipPreview } from '../../lib/payroll-runs-api'

const money = (value: number) => Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const salaryKind = { MONTHLY_HISTORY: 'سجل الأجر الشهري', CURRENT_FILE_UNVERIFIED: 'راتب الملف — غير موثق' } as const
const statusText: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'مراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }

export function PayrollMembershipPreviewView({ preview, currency }: { preview: PayrollMembershipPreview; currency: string }) {
  const { totals } = preview
  const chips: Array<[string, number | string, string]> = [
    ['داخل نطاق آخر يوم', totals.candidates, 'bg-gray-100 text-gray-700'],
    ['الداخلون', totals.included, 'bg-success-50 text-success-700'],
    ['المستبعدون', totals.excluded, 'bg-amber-50 text-amber-800'],
    ['تغطية جزئية', totals.partial, 'bg-blue-50 text-blue-700'],
    ['في مسير معتمد آخر', totals.alreadyInRun, 'bg-red-50 text-red-700'],
    ['انتقلوا خارج النطاق', totals.transferredOut, 'bg-purple-50 text-purple-700'],
    ['مشاكل بيانات', totals.dataProblems, 'bg-red-50 text-red-700'],
  ]
  return (
    <div className="space-y-4" data-testid="payroll-membership-preview">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900 space-y-1">
        <p className="font-bold">معاينة للقراءة فقط — لا تحفظ عضوية ولا تحجز موظفين ولا تغيّر أي رقم</p>
        <p>
          الفترة <span dir="ltr">{preview.run.startDate} ← {preview.run.endDate}</span> (شهر {preview.run.period})
          {preview.run.policy && <> • السياسة «{preview.run.policy.name}» نسخة {preview.run.policy.versionNo}</>}
          {' '}• أساس الأيام {preview.basis.monthlyDays} يومًا ({preview.basis.dayBasis}) • {SELECTION_MODE_LABELS[preview.selection.mode]}
        </p>
        <p className="text-xs">العضوية بمكان الموظف في التنظيم آخر يوم في الفترة؛ المعامل = أيام التغطية ÷ {preview.basis.monthlyDays} لمن لم يغطِّ الفترة كاملة.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(([label, value, tone]) => <span key={label} className={`badge ${tone}`}>{label}: {value}</span>)}
        <span className="badge bg-gray-100 text-gray-700">راتب الشهر للداخلين: {money(totals.monthlyGross)} {currency}</span>
        <span className="badge bg-gray-100 text-gray-700">المستحق قبل البنود: {money(totals.earnedGross)} {currency}</span>
      </div>
      {preview.emptyScopeRequiresConfirmation && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
        النطاق لا يضم أي موظف في آخر يوم من الفترة؛ الحفظ يتطلب تأكيدًا صريحًا مع السبب.</p>}
      {preview.unusedExclusions.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        استبعادات لا تنطبق على أحد داخل النطاق: {preview.unusedExclusions.map(row => `#${row.employeeId}`).join('، ')}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-right px-3 py-2">الداخلون ({totals.included})</th>
              <th className="text-right px-3 py-2">المكان آخر يوم</th>
              <th className="text-center px-3 py-2">التغطية</th>
              <th className="text-center px-3 py-2">الأيام</th>
              <th className="text-center px-3 py-2">المعامل</th>
              <th className="text-center px-3 py-2">راتب الشهر</th>
              <th className="text-center px-3 py-2">المستحق قبل البنود</th>
              <th className="text-right px-3 py-2">مصدر الراتب</th>
            </tr>
          </thead>
          <tbody>
            {preview.included.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">لا يوجد داخلون في هذه المعاينة</td></tr>}
            {preview.included.map(row => (
              <tr key={row.employeeId} className="table-row">
                <td className="table-cell">
                  <p className="font-medium text-gray-800">{row.fullName}</p>
                  <p className="text-xs text-gray-400">{row.employeeCode}{row.inclusionSource === 'MANUAL_INCLUDE' ? ' • من القائمة' : ''}</p>
                  {row.draftConflicts.length > 0 && <p className="text-xs text-amber-700">
                    تعارض مع مسودة: {row.draftConflicts.map(conflict => conflict.otherRunId ? `#${conflict.otherRunId}` : conflict.name).join('، ')} — يُعاد الفحص عند الاعتماد</p>}
                  {row.orgIssues.map(issue => <p key={issue.code} className="text-xs text-amber-700">{issue.message}</p>)}
                </td>
                <td className="table-cell text-xs">{[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ') || '—'}</td>
                <td className="table-cell text-center text-xs" dir="ltr">{row.coverFrom} → {row.coverTo}</td>
                <td className="table-cell text-center font-mono">{row.coverDays}</td>
                <td className="table-cell text-center font-mono">{row.partial ? row.prorataFactor.toFixed(6) : '1'}</td>
                <td className="table-cell text-center font-mono">{money(row.monthlyGross)}</td>
                <td className="table-cell text-center font-mono">{money(row.earnedGross)}</td>
                <td className={`table-cell text-xs ${row.salarySource.kind === 'MONTHLY_HISTORY' ? 'text-gray-600' : 'text-amber-700'}`}>
                  {salaryKind[row.salarySource.kind]} {row.salarySource.effectivePayrollPeriod ? `(يسري من ${row.salarySource.effectivePayrollPeriod})` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-amber-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-right px-3 py-2">المستبعدون ({totals.excluded})</th>
              <th className="text-right px-3 py-2">الكود</th>
              <th className="text-right px-3 py-2">السبب</th>
              <th className="text-right px-3 py-2">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {preview.excluded.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">لا يوجد مستبعدون</td></tr>}
            {preview.excluded.map(row => (
              <tr key={row.employeeId} className={`table-row ${row.dataProblem ? 'bg-red-50' : ''}`}>
                <td className="table-cell">
                  <p className="font-medium text-gray-800">{row.fullName}</p>
                  <p className="text-xs text-gray-400">{row.employeeCode} • {[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ')}</p>
                </td>
                <td className="table-cell font-mono text-xs" dir="ltr">{row.code}</td>
                <td className="table-cell text-xs text-amber-900">{MEMBERSHIP_EXCLUSION_LABELS[row.code ?? ''] ?? row.label ?? row.code}</td>
                <td className="table-cell text-xs">
                  {row.manualReason && <span>السبب المكتوب: {row.manualReason}</span>}
                  {row.otherRun && <span>
                    {row.otherRun.otherRunId ? <Link href={`/payroll?run=${row.otherRun.otherRunId}`} className="text-primary-700 underline">المسير #{row.otherRun.otherRunId}</Link> : row.otherRun.name}
                    {row.otherRun.otherRunId && row.otherRun.name ? ` «${row.otherRun.name}»` : ''} ({statusText[row.otherRun.status] ?? row.otherRun.status})
                    {' '}<span dir="ltr">{row.otherRun.startDate} → {row.otherRun.endDate}</span>
                  </span>}
                  {row.transferredOut && <span>آخر يوم داخل النطاق {row.transferredOut.lastInScopeDate}؛ مكانه آخر يوم: {[row.transferredOut.branchName, row.transferredOut.departmentName, row.transferredOut.teamName].filter(Boolean).join(' / ') || 'غير محدد'}</span>}
                  {!row.manualReason && !row.otherRun && !row.transferredOut && row.message && <span>{row.message}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
