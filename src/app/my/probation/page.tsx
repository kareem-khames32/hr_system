'use client'

// B3.1-ج: «فترات التجربة» — اللي تحت التجربة ونهايتهم، وقرار كل واحد: تثبيت، تمديد (لتاريخ بسبب)، أو إنهاء
import { useCallback, useEffect, useState } from 'react'
import { Hourglass, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { updateConfig } from '@/lib/api'
import { decideProbation, fetchProbation, PROBATION_DECISION_LABELS, type ApiProbationEmployee, type ApiProbationList, type ProbationDecision } from '@/lib/probation-api'

const leftText = (days: number | null) =>
  days === null ? 'من غير تاريخ نهاية' : days < 0 ? `عدّت من ${-days} يوم` : days === 0 ? 'النهارده' : `باقي ${days} يوم`
const leftStyle = (days: number | null, notice: number) =>
  days === null ? 'bg-gray-100 text-gray-600' : days < 0 ? 'bg-red-50 text-red-700' : days <= notice ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'

export default function ProbationPage() {
  const [data, setData] = useState<ApiProbationList | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<ApiProbationEmployee | null>(null)
  const [notice, setNotice] = useState('')
  const [duration, setDuration] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const load = useCallback(() => {
    setError('')
    fetchProbation()
      .then((list) => {
        setData(list)
        setNotice(String(list.noticeDays))
        setDuration(String(list.defaultDays))
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل فترات التجربة'))
  }, [])
  useEffect(load, [load])

  const validDays = (value: string) => /^\d{1,4}$/.test(value.trim())
  const saveSettings = async () => {
    setSavingSettings(true)
    setError('')
    try {
      await updateConfig('onboarding.probation_notice_days', String(Number(notice)))
      await updateConfig('onboarding.probation_days', String(Number(duration)))
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الإعدادات')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Hourglass size={24} className="text-primary-600" />
            فترات التجربة
          </h1>
          <p className="text-gray-500 mt-1">الموظفين اللي تحت التجربة ونهاية كل واحد، وقراره: تثبيت أو تمديد أو إنهاء</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {data?.canManageSettings && (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 flex-wrap text-sm text-gray-700" data-probation-settings>
            <span>مهمة القرار بتتفتح على المدير قبل النهاية بـ</span>
            <input type="number" min={0} className="input w-20 text-sm" value={notice} onChange={(e) => setNotice(e.target.value)} />
            <span>يوم (0 = من غير مهمة)، ومدة التجربة لملف من غير تاريخ نهاية</span>
            <input type="number" min={0} className="input w-20 text-sm" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <span>يوم (0 = من غير مدة افتراضية)</span>
            <button
              onClick={saveSettings}
              disabled={savingSettings || !validDays(notice) || !validDays(duration) || (Number(notice) === data.noticeDays && Number(duration) === data.defaultDays)}
              className="btn-secondary text-sm ms-auto disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        )}
        {data && data.employees.length === 0 && <EmptyState title="مفيش حد تحت التجربة دلوقتي" icon={Hourglass} />}
        {data && data.employees.length > 0 && (
          <div className="card p-0 overflow-x-auto" data-probation-list>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الفرع</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الالتحاق</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">نهاية التجربة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.employees.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{row.fullName}</div>
                      <div className="text-xs text-gray-500">
                        {row.employeeCode}
                        {row.jobTitle ? ` · ${row.jobTitle}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.branchName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.joinDate ? formatDate(row.joinDate) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">
                        {row.probationEndDate ? formatDate(row.probationEndDate) : '—'}
                        {row.endFromDefault && <span className="text-xs text-gray-400"> (بالمدة الافتراضية)</span>}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${leftStyle(row.daysLeft, data.noticeDays)}`}>{leftText(row.daysLeft)}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {row.canDecide && (
                        <button onClick={() => setOpen(row)} className="btn-primary text-sm">
                          القرار
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && data && (
        <DecisionModal
          employee={open}
          today={data.today}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null)
            load()
          }}
        />
      )}
    </MainLayout>
  )
}

function DecisionModal({ employee, today, onClose, onDone }: { employee: ApiProbationEmployee; today: string; onClose: () => void; onDone: () => void }) {
  const [decision, setDecision] = useState<ProbationDecision>('CONFIRM')
  const [newEndDate, setNewEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const needsReason = decision !== 'CONFIRM'
  const minDate = employee.probationEndDate && employee.probationEndDate > today ? employee.probationEndDate : today
  const valid = (!needsReason || reason.trim().length >= 3) && (decision !== 'EXTEND' || (newEndDate !== '' && newEndDate > minDate))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await decideProbation(employee.id, {
        decision,
        ...(decision === 'EXTEND' ? { newEndDate } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل القرار')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="قرار فترة التجربة">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">قرار فترة التجربة</h2>
            <p className="text-sm text-gray-500 mt-1">
              {employee.fullName} · {employee.employeeCode}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PROBATION_DECISION_LABELS) as ProbationDecision[]).map((key) => (
              <button
                key={key}
                onClick={() => setDecision(key)}
                aria-pressed={decision === key}
                className={`rounded-xl border p-3 text-sm font-medium ${decision === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {PROBATION_DECISION_LABELS[key]}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {decision === 'CONFIRM' && 'الموظف بيتثبّت: حالته بتبقى «نشط» والقرار بيتسجّل في سجل ملفه.'}
            {decision === 'EXTEND' && 'فترة التجربة بتتمد لتاريخ جديد بسبب، والقرار بيتسجّل في سجل ملفه.'}
            {decision === 'TERMINATE' && 'القرار بيتسجّل، ومهمة «فتح ملف إنهاء خدمة» بتتفتح على الموارد البشرية (الإنهاء نفسه من ملف إنهاء الخدمة).'}
          </p>
          {decision === 'EXTEND' && (
            <label className="block text-sm text-gray-700">
              نهاية التجربة الجديدة
              <input type="date" min={minDate} className="input w-full mt-1" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
            </label>
          )}
          <label className="block text-sm text-gray-700">
            السبب{needsReason ? '' : ' (اختياري)'}
            <textarea className="input w-full mt-1" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={!valid || saving}
            title="التمديد محتاج تاريخ بعد النهاية الحالية، والتمديد والإنهاء محتاجين سبب من 3 حروف"
            className="btn-primary disabled:opacity-50"
          >
            تسجيل القرار
          </button>
        </div>
      </div>
    </div>
  )
}
