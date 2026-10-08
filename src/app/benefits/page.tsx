'use client'

// B5.2 (أ): «المزايا والتأمين الطبي» — وثائق التأمين وفئاتها، ودرجات كل فئة، وتقرير أهلية الموظفين. تعريف الوثائق والفئات لحساب
// بكل الفروع؛ مفيش مسح (تعطيل بس). «حصة الموظف» رقم على الفئة للعلم — مفيش خصم من الشاشة دي.
import { useCallback, useEffect, useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { createInsuranceClass, createInsurancePolicy, fetchInsurance, fetchInsuranceEligibility, updateInsuranceClass, updateInsurancePolicy,
  type ApiEligibility, type ApiInsuranceClass, type ApiInsuranceOverview, type ApiInsurancePolicy, type PolicyState } from '@/lib/benefits-api'

const COUNTRY_LABELS: Record<string, string> = { EG: 'مصر', SA: 'السعودية' }
const STATE_CLASS: Record<PolicyState, string> = { UPCOMING: 'text-gray-600', ACTIVE: 'text-green-700', EXPIRING: 'text-amber-700', EXPIRED: 'text-red-700', DISABLED: 'text-gray-400' }
const BY_LABELS = { GRADE: 'بدرجته', DEFAULT: 'الفئة الافتراضية' } as const
const emptyPolicy = { name: '', insurerName: '', policyNumber: '', country: '', startDate: '', endDate: '', note: '' }
const emptyClass = { name: '', share: '', isDefault: false, gradeIds: [] as number[] }
const shareOf = (text: string): number | null => (text.trim() === '' ? 0 : /^\d{1,5}(\.\d{1,2})?$/.test(text.trim()) ? Number(text.trim()) : null)

export default function BenefitsPage() {
  const [data, setData] = useState<ApiInsuranceOverview | null>(null)
  const [eligibility, setEligibility] = useState<ApiEligibility | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [policy, setPolicy] = useState(emptyPolicy)
  const [openPolicy, setOpenPolicy] = useState<number | null>(null)
  const [classForm, setClassForm] = useState(emptyClass)
  const [editClass, setEditClass] = useState<number | null>(null)

  const load = useCallback(() => {
    fetchInsurance().then((result) => {
      setData(result)
      if (result.ready) fetchInsuranceEligibility().then(setEligibility).catch(() => setEligibility(null))
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل وثائق التأمين'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<ApiInsuranceOverview>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      setData(await work())
      setInfo(done)
      fetchInsuranceEligibility().then(setEligibility).catch(() => setEligibility(null))
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addPolicy() {
    const ok = await run(() => createInsurancePolicy({ name: policy.name.trim(), insurerName: policy.insurerName.trim(), startDate: policy.startDate, endDate: policy.endDate,
      country: policy.country || null, ...(policy.policyNumber.trim() ? { policyNumber: policy.policyNumber.trim() } : {}), ...(policy.note.trim() ? { note: policy.note.trim() } : {}) }), `اتضافت وثيقة «${policy.name.trim()}»`)
    if (ok) setPolicy(emptyPolicy)
  }
  const togglePolicy = (row: ApiInsurancePolicy) => run(() => updateInsurancePolicy(row.id, { isActive: !row.isActive }), row.isActive ? `اتعطّلت «${row.name}»` : `اتفعّلت «${row.name}»`)
  function startClass(row: ApiInsuranceClass | null) {
    setEditClass(row ? row.id : null)
    setClassForm(row ? { name: row.name, share: String(row.employeeShareMonthly), isDefault: row.isDefault, gradeIds: row.gradeIds } : emptyClass)
  }
  async function saveClass(policyId: number) {
    const share = shareOf(classForm.share)
    if (share === null) return setError('حصة الموظف رقم بمنزلتين بالكتير')
    const body = { name: classForm.name.trim(), employeeShareMonthly: share, isDefault: classForm.isDefault, gradeIds: classForm.gradeIds }
    const ok = await run(() => (editClass === null ? createInsuranceClass(policyId, body) : updateInsuranceClass(editClass, body)), editClass === null ? `اتضافت فئة «${body.name}»` : `اتعدّلت فئة «${body.name}»`)
    if (ok) startClass(null)
  }
  const toggleClass = (row: ApiInsuranceClass) => run(() => updateInsuranceClass(row.id, { isActive: !row.isActive }), row.isActive ? `اتعطّلت فئة «${row.name}»` : `اتفعّلت فئة «${row.name}»`)
  const toggleGrade = (gradeId: number) => setClassForm((current) => ({ ...current, gradeIds: current.gradeIds.includes(gradeId) ? current.gradeIds.filter((id) => id !== gradeId) : [...current.gradeIds, gradeId] }))

  const canEdit = data?.canEdit === true
  const canAddPolicy = policy.name.trim().length > 0 && policy.insurerName.trim().length > 0 && policy.startDate !== '' && policy.endDate !== '' && policy.endDate >= policy.startDate
  const gradeName = (id: number) => data?.grades.find((grade) => grade.id === id)?.name ?? `درجة ${id}`

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HeartPulse size={24} className="text-primary-600" />
            المزايا والتأمين الطبي
          </h1>
          <p className="text-gray-500 mt-1">وثائق التأمين الطبي وفئاتها، ومين يستحق أنهي فئة بدرجته الوظيفية.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4">جداول التأمين الطبي ناقصة — طبّق ترحيلات 143 و144 و145 الأول.</div>}

        {data?.ready && (
          <div className="card space-y-4" data-insurance-policies>
            <h2 className="text-lg font-semibold text-gray-800">وثائق التأمين</h2>
            {data.policies.length === 0 && <p className="text-gray-500 text-sm">مفيش وثائق متسجّلة.</p>}
            {data.policies.map((row) => (
              <div key={row.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-gray-800">{row.name}</span>
                  <span className="text-sm text-gray-600">{row.insurerName}{row.policyNumber ? <span dir="ltr"> · {row.policyNumber}</span> : null}</span>
                  <span className="text-xs bg-gray-50 rounded px-2 py-1">{row.country ? COUNTRY_LABELS[row.country] ?? row.country : 'كل الشركة'}</span>
                  <span className="text-sm text-gray-600">{formatDate(row.startDate)} ← {formatDate(row.endDate)}</span>
                  <span className={`text-sm font-semibold ${STATE_CLASS[row.state]}`}>
                    {row.stateLabel}{row.state === 'EXPIRING' && row.daysLeft !== null ? ` (باقي ${row.daysLeft} يوم)` : ''}
                  </span>
                  <span className="mr-auto inline-flex gap-2">
                    <button type="button" className="btn-secondary text-xs" onClick={() => { setOpenPolicy(openPolicy === row.id ? null : row.id); startClass(null) }}>
                      {openPolicy === row.id ? 'إخفاء الفئات' : `الفئات (${row.classes.length})`}
                    </button>
                    {canEdit && <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => togglePolicy(row)}>{row.isActive ? 'تعطيل' : 'تفعيل'}</button>}
                  </span>
                </div>
                {row.note && <p className="text-sm text-gray-600">{row.note}</p>}
                {openPolicy === row.id && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="table-header text-right">الفئة</th>
                            <th className="table-header text-center">حصة الموظف الشهرية</th>
                            <th className="table-header text-right">الدرجات</th>
                            <th className="table-header" />
                          </tr>
                        </thead>
                        <tbody>
                          {row.classes.map((item) => (
                            <tr key={item.id} className={`border-t border-gray-100 ${item.isActive ? '' : 'text-gray-400'}`}>
                              <td className="table-cell">{item.name}{item.isDefault && <span className="text-xs text-primary-600"> (الافتراضية)</span>}</td>
                              <td className="table-cell text-center font-mono">{item.employeeShareMonthly > 0 ? formatMoney(item.employeeShareMonthly) : '—'}</td>
                              <td className="table-cell">{item.gradeIds.length ? item.gradeIds.map(gradeName).join('، ') : '—'}</td>
                              <td className="table-cell text-left">
                                {canEdit && (
                                  <span className="inline-flex gap-2">
                                    <button type="button" className="btn-secondary text-xs" onClick={() => startClass(item)}>تعديل</button>
                                    <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => toggleClass(item)}>{item.isActive ? 'تعطيل' : 'تفعيل'}</button>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {row.classes.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش فئات في الوثيقة دي.</p>}
                    </div>
                    {canEdit && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-3" data-insurance-class-form>
                        <p className="text-sm font-semibold text-gray-700">{editClass === null ? 'فئة جديدة' : 'تعديل الفئة'}</p>
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-sm text-gray-600">
                            اسم الفئة
                            <input className="input mt-1" value={classForm.name} maxLength={60} onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} />
                          </label>
                          <label className="text-sm text-gray-600">
                            حصة الموظف الشهرية
                            <input className="input mt-1 w-32" dir="ltr" inputMode="decimal" value={classForm.share} placeholder="0" onChange={(event) => setClassForm({ ...classForm, share: event.target.value })} />
                          </label>
                          <label className="text-sm text-gray-600 inline-flex items-center gap-2">
                            <input type="checkbox" checked={classForm.isDefault} onChange={(event) => setClassForm({ ...classForm, isDefault: event.target.checked })} />
                            الفئة الافتراضية (للي درجته مش مربوطة بفئة)
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {data.grades.map((grade) => (
                            <label key={grade.id} className="text-sm text-gray-600 inline-flex items-center gap-2">
                              <input type="checkbox" checked={classForm.gradeIds.includes(grade.id)} onChange={() => toggleGrade(grade.id)} />
                              {grade.name}
                            </label>
                          ))}
                          {data.grades.length === 0 && <span className="text-sm text-gray-500">مفيش درجات وظيفية مفعّلة.</span>}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !classForm.name.trim() || shareOf(classForm.share) === null} onClick={() => saveClass(row.id)}>
                            {editClass === null ? 'إضافة الفئة' : 'حفظ'}
                          </button>
                          {editClass !== null && <button type="button" className="btn-secondary text-sm" onClick={() => startClass(null)}>إلغاء</button>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {canEdit ? (
              <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3" data-insurance-policy-form>
                <label className="text-sm text-gray-600">
                  اسم الوثيقة
                  <input className="input mt-1" value={policy.name} maxLength={150} onChange={(event) => setPolicy({ ...policy, name: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">
                  شركة التأمين
                  <input className="input mt-1" value={policy.insurerName} maxLength={150} onChange={(event) => setPolicy({ ...policy, insurerName: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">
                  رقم الوثيقة
                  <input className="input mt-1 w-36" dir="ltr" value={policy.policyNumber} maxLength={60} onChange={(event) => setPolicy({ ...policy, policyNumber: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">
                  الدولة
                  <select className="input mt-1" value={policy.country} onChange={(event) => setPolicy({ ...policy, country: event.target.value })}>
                    <option value="">كل الشركة</option>
                    <option value="SA">السعودية</option>
                    <option value="EG">مصر</option>
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  من
                  <input type="date" className="input mt-1" value={policy.startDate} onChange={(event) => setPolicy({ ...policy, startDate: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">
                  إلى
                  <input type="date" className="input mt-1" value={policy.endDate} onChange={(event) => setPolicy({ ...policy, endDate: event.target.value })} />
                </label>
                <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !canAddPolicy} onClick={addPolicy}>إضافة وثيقة</button>
              </div>
            ) : (
              <p className="text-xs text-gray-500">تعريف الوثائق والفئات لحساب على مستوى الشركة كلها.</p>
            )}
          </div>
        )}

        {eligibility && (
          <div className="card space-y-3" data-insurance-eligibility>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">أهلية الموظفين ({eligibility.rows.length})</h2>
              {eligibility.withoutPolicy > 0 && <span className="text-sm text-amber-700">{eligibility.withoutPolicy} من غير وثيقة سارية</span>}
              {eligibility.withoutClass > 0 && <span className="text-sm text-amber-700">{eligibility.withoutClass} من غير فئة</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الموظف</th>
                    <th className="table-header text-right">الدرجة</th>
                    <th className="table-header text-right">الوثيقة</th>
                    <th className="table-header text-right">الفئة</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibility.rows.map((row) => (
                    <tr key={row.employeeId} className="border-t border-gray-100">
                      <td className="table-cell">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                      <td className="table-cell">{row.gradeName ?? '—'}</td>
                      <td className={`table-cell ${row.policyName ? '' : 'text-amber-700'}`}>{row.policyName ?? 'مفيش وثيقة سارية'}</td>
                      <td className={`table-cell ${row.className ? '' : 'text-amber-700'}`}>
                        {row.className ?? (row.policyName ? 'من غير فئة' : '—')}{row.by ? <span className="text-xs text-gray-500"> ({BY_LABELS[row.by]})</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {eligibility.rows.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش موظفين في نطاقك.</p>}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
