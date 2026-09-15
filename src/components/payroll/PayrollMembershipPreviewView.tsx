'use client'

// الخطوة 17: عرض معاينة العضوية (قراءة فقط) — الداخلون بالتغطية وراتب الشهر، والمستبعدون بسبب مكتوب بالعربي.
import {
  MEMBERSHIP_EXCLUSION_LABELS, payrollExclusionCandidates, type PayrollExclusionCandidate, type PayrollMembershipPreview,
} from '../../lib/payroll-runs-api'
import { formatMoney } from '../../lib/money'

// الخطوة 22 (B5): منسّق المبالغ الموحد
const money = (value: number) => formatMoney(value)
const salaryKind: Record<string, string> = { MONTHLY_HISTORY: 'سجل الأجر الشهري', CURRENT_FILE_UNVERIFIED: 'راتب الملف — غير موثق' }
const statusText: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'مراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }

export function PayrollMembershipPreviewView({ preview, currency, onExclude, excludedIds = [], disabled }: {
  preview: PayrollMembershipPreview; currency: string
  // اختياري: زر «استبعاد بسبب» للداخلين والمستبعدين تلقائيًا داخل النطاق — المعاينة نفسها لا تكتب شيئًا.
  onExclude?: (candidate: PayrollExclusionCandidate) => void
  excludedIds?: number[]
  disabled?: boolean
}) {
  const { totals } = preview
  const candidates = new Map(onExclude ? payrollExclusionCandidates(preview, excludedIds).map(row => [row.employeeId, row]) : [])
  const excludeButton = (employeeId: number, tone: string) => {
    const candidate = candidates.get(employeeId)
    return candidate && onExclude ? <button type="button" disabled={disabled} onClick={() => onExclude(candidate)}
      className={`mt-1 text-xs underline disabled:opacity-50 ${tone}`} data-exclude-employee={employeeId}>استبعاد بسبب مكتوب</button> : null
  }
  const chips: Array<[string, number | string, string]> = [
    ['داخل نطاق آخر يوم', totals.candidates, 'bg-gray-100 text-gray-700'],
    ['الداخلون', totals.included, 'bg-success-50 text-success-700'],
    ['المستبعدون', totals.excluded, 'bg-amber-50 text-amber-800'],
    ['تغطية جزئية', totals.partial, 'bg-blue-50 text-blue-700'],
    ['في مسير معتمد آخر', totals.alreadyInRun, 'bg-red-50 text-red-700'],
    ['انتقلوا خارج النطاق', totals.transferredOut, 'bg-purple-50 text-purple-700'],
    ['بيانات خدمة غير مكتملة', totals.dataProblems, 'bg-amber-50 text-amber-800'],
  ]
  return (
    <div className="space-y-4" data-testid="payroll-membership-preview">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900 space-y-1">
        <p className="font-bold">معاينة للقراءة فقط — لا تحفظ شيئًا ولا تغيّر أي رقم</p>
        <p>
          الفترة <span dir="ltr">{preview.run.startDate} ← {preview.run.endDate}</span> (شهر {preview.run.period})
          {preview.run.policy && <> • معادلات الرواتب «{preview.run.policy.name}»</>}
        </p>
        <p className="text-xs">العضوية بمكان الموظف في آخر يوم من الفترة؛ من التحق أو ترك داخل الفترة يُحسب له أيامه فقط.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(([label, value, tone]) => <span key={label} className={`badge ${tone}`}>{label}: {value}</span>)}
        <span className="badge bg-gray-100 text-gray-700">راتب الشهر للداخلين: {money(totals.monthlyGross)} {currency}</span>
        <span className="badge bg-gray-100 text-gray-700">المستحق قبل البنود: {money(totals.earnedGross)} {currency}</span>
      </div>
      {preview.emptyScopeRequiresConfirmation && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
        النطاق لا يضم أي موظف في آخر يوم من الفترة؛ الحفظ يتطلب تأكيدًا صريحًا مع السبب.</p>}
      {preview.unusedExclusions.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        {preview.unusedExclusions.length} استبعاد لا ينطبق على أحد داخل النطاق.</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-right px-3 py-2">الداخلون ({totals.included})</th>
              <th className="text-right px-3 py-2">المكان آخر يوم</th>
              <th className="text-center px-3 py-2">التغطية</th>
              <th className="text-center px-3 py-2">الأيام</th>
              <th className="text-center px-3 py-2">راتب الشهر</th>
              <th className="text-center px-3 py-2">المستحق قبل البنود</th>
              <th className="text-right px-3 py-2">مصدر الراتب</th>
            </tr>
          </thead>
          <tbody>
            {preview.included.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">لا يوجد داخلون في هذه المعاينة</td></tr>}
            {preview.included.map(row => (
              <tr key={row.employeeId} className="table-row">
                <td className="table-cell">
                  <p className="font-medium text-gray-800">{row.fullName}</p>
                  <p className="text-xs text-gray-400">{row.employeeCode}{row.inclusionSource === 'MANUAL_INCLUDE' ? ' • من القائمة' : ''}</p>
                  {excludeButton(row.employeeId, 'text-amber-700')}
                  {row.draftConflicts.length > 0 && <p className="text-xs text-amber-700">مدرج في مسير آخر لنفس الأيام</p>}
                  {row.orgIssues.map(issue => <p key={issue.code} className="text-xs text-amber-700">{issue.message}</p>)}
                </td>
                <td className="table-cell text-xs">{[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ') || '—'}</td>
                <td className="table-cell text-center text-xs" dir="ltr">{row.coverFrom} → {row.coverTo}</td>
                <td className="table-cell text-center font-mono">{row.coverDays}</td>
                <td className="table-cell text-center font-mono">{money(row.monthlyGross)}</td>
                <td className="table-cell text-center font-mono">{money(row.earnedGross)}</td>
                <td className={`table-cell text-xs ${row.salarySource.kind === 'MONTHLY_HISTORY' ? 'text-gray-600' : 'text-amber-700'}`}>
                  {salaryKind[row.salarySource.kind] ?? 'غير معروف'} {row.salarySource.effectivePayrollPeriod ? `(يسري من ${row.salarySource.effectivePayrollPeriod})` : ''}
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
              <th className="text-right px-3 py-2">السبب</th>
              <th className="text-right px-3 py-2">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {preview.excluded.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">لا يوجد مستبعدون</td></tr>}
            {preview.excluded.map(row => (
              <tr key={row.employeeId} className={`table-row ${row.dataProblem ? 'bg-amber-50' : ''}`}>
                <td className="table-cell">
                  <p className="font-medium text-gray-800">{row.fullName}</p>
                  <p className="text-xs text-gray-400">{row.employeeCode} • {[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ')}</p>
                  {excludeButton(row.employeeId, 'text-amber-700')}
                </td>
                <td className="table-cell text-xs text-amber-900">{MEMBERSHIP_EXCLUSION_LABELS[row.code ?? ''] ?? row.label ?? 'سبب غير معروف'}</td>
                <td className="table-cell text-xs">
                  {row.manualReason && <span>السبب المكتوب: {row.manualReason}</span>}
                  {row.otherRun && <span>{row.otherRun.name || 'مسير آخر'} ({statusText[row.otherRun.status] ?? 'غير معروف'})</span>}
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
