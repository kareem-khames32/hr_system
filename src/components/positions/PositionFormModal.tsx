'use client'
// B2.11: نموذج الوظيفة المعتمدة (جديدة أو تعديل). الوحدة (الفرع والقسم والفريق) بتتحدد عند الإنشاء بس؛ التعديل للمسمى والدرجة ومركز
// التكلفة والعدد والحالة والميزانية. القوايم من الخادم (GET /positions/form): فروع نطاق الحساب والكتالوجات النشطة.
import { useEffect, useState } from 'react'
import {
  createPosition, fetchPositionForm, updatePosition, POSITION_STATUS_LABELS, type ApiPosition, type ApiPositionForm, type PositionInput, type PositionStatus,
} from '../../lib/positions-api'

interface Props {
  /** وظيفة موجودة = تعديل */
  position?: ApiPosition | null
  onClose: () => void
  onSaved: (position: ApiPosition) => void
}

const numberOrNull = (value: string) => value ? Number(value) : null

export default function PositionFormModal({ position, onClose, onSaved }: Props) {
  const [lists, setLists] = useState<ApiPositionForm | null>(null)
  const [jobTitleId, setJobTitleId] = useState(position ? String(position.jobTitleId) : '')
  const [gradeId, setGradeId] = useState(position?.gradeId ? String(position.gradeId) : '')
  const [branchId, setBranchId] = useState(position ? String(position.branchId) : '')
  const [departmentId, setDepartmentId] = useState(position?.departmentId ? String(position.departmentId) : '')
  const [teamId, setTeamId] = useState(position?.teamId ? String(position.teamId) : '')
  const [costCenterId, setCostCenterId] = useState(position?.costCenterId ? String(position.costCenterId) : '')
  const [headcount, setHeadcount] = useState(position ? String(position.headcount) : '1')
  const [status, setStatus] = useState<PositionStatus>(position?.status ?? 'ACTIVE')
  const [budget, setBudget] = useState(position?.budget ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPositionForm().then(loaded => {
      setLists(loaded)
      if (!position && loaded.branches.length === 1) setBranchId(String(loaded.branches[0].id))
    }).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات النموذج'))
  }, [position])

  const departments = (lists?.departments ?? []).filter(row => String(row.branchId) === branchId)
  const teams = (lists?.teams ?? []).filter(row => String(row.departmentId) === departmentId)

  const save = async () => {
    setError('')
    const count = Number(headcount)
    if (!jobTitleId) { setError('اختار المسمى الوظيفي'); return }
    if (!position && !branchId) { setError('اختار فرع الوظيفة'); return }
    if (!Number.isInteger(count) || count < 1) { setError('العدد المعتمد رقم صحيح من 1'); return }
    if (budget.trim() && !/^\d{1,12}(\.\d{1,2})?$/.test(budget.trim())) { setError('الميزانية رقم مش سالب بخانتين عشريتين بالكتير'); return }
    const input: PositionInput = { jobTitleId: Number(jobTitleId), gradeId: numberOrNull(gradeId), costCenterId: numberOrNull(costCenterId), headcount: count, status,
      budget: budget.trim() || null,
      // الوحدة بتتبعت عند الإنشاء بس
      ...(position ? {} : { branchId: Number(branchId), departmentId: numberOrNull(departmentId), teamId: numberOrNull(teamId) }) }
    setBusy(true)
    try {
      onSaved(position ? await updatePosition(position.id, input) : await createPosition(input))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الوظيفة')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="position-form-title"
        onClick={event => event.stopPropagation()} data-position-form>
        <h2 id="position-form-title" className="text-lg font-semibold text-gray-800 mb-4">{position ? `تعديل الوظيفة ${position.code}` : 'وظيفة معتمدة جديدة'}</h2>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
        {!lists ? !error && <p className="text-sm text-gray-500">جاري التحميل…</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="position-title">المسمى الوظيفي *</label>
                <select id="position-title" className="input" value={jobTitleId} onChange={event => setJobTitleId(event.target.value)}>
                  <option value="">اختار</option>
                  {/* مسمى الوظيفة الحالي لو اتقفل في الكتالوج بيفضل ظاهر */}
                  {position && !lists.jobTitles.some(row => row.id === position.jobTitleId) && <option value={position.jobTitleId}>{position.title}</option>}
                  {lists.jobTitles.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="position-grade">الدرجة</label>
                <select id="position-grade" className="input" value={gradeId} onChange={event => setGradeId(event.target.value)}>
                  <option value="">من غير درجة</option>
                  {position?.gradeId && !lists.grades.some(row => row.id === position.gradeId) && <option value={position.gradeId}>{position.gradeName}</option>}
                  {lists.grades.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </div>
            </div>
            {position ? (
              <p className="text-sm text-gray-600" data-position-unit>الوحدة: {[position.branchName, position.departmentName, position.teamName].filter(Boolean).join(' · ')} <span className="text-xs text-gray-500">(مابتتغيّرش بعد الإنشاء)</span></p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label" htmlFor="position-branch">الفرع *</label>
                  <select id="position-branch" className="input" value={branchId} onChange={event => { setBranchId(event.target.value); setDepartmentId(''); setTeamId('') }}>
                    <option value="">اختار</option>
                    {lists.branches.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="position-department">القسم</label>
                  <select id="position-department" className="input" value={departmentId} disabled={!branchId} onChange={event => { setDepartmentId(event.target.value); setTeamId('') }}>
                    <option value="">على مستوى الفرع</option>
                    {departments.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="position-team">الفريق</label>
                  <select id="position-team" className="input" value={teamId} disabled={!departmentId} onChange={event => setTeamId(event.target.value)}>
                    <option value="">كل القسم</option>
                    {teams.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="position-headcount">العدد المعتمد *</label>
                <input id="position-headcount" type="number" min={1} max={10000} step={1} className="input" value={headcount} onChange={event => setHeadcount(event.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="position-status">الحالة</label>
                <select id="position-status" className="input" value={status} onChange={event => setStatus(event.target.value as PositionStatus)}>
                  {(Object.keys(POSITION_STATUS_LABELS) as PositionStatus[]).map(key => <option key={key} value={key}>{POSITION_STATUS_LABELS[key]}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="position-budget">الميزانية (اختياري)</label>
                <input id="position-budget" inputMode="decimal" className="input" value={budget} onChange={event => setBudget(event.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="position-cost-center">مركز التكلفة</label>
              <select id="position-cost-center" className="input" value={costCenterId} onChange={event => setCostCenterId(event.target.value)}>
                <option value="">من غير</option>
                {position?.costCenterId && !lists.costCenters.some(row => row.id === position.costCenterId) && <option value={position.costCenterId}>{position.costCenterName}</option>}
                {lists.costCenters.map(row => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
              </select>
            </div>
            {status !== 'ACTIVE' && <p className="text-xs text-gray-500" data-position-status-hint>{status === 'FROZEN' ? 'المجمّدة: معتمدة ومتوقف التعيين عليها.' : 'الملغية: مابتتحسبش في المعتمد، وشاغليها بيظهروا «زيادة».'}</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إلغاء</button>
          <button type="button" className="btn-primary" disabled={busy || !lists} onClick={() => void save()} data-position-save>{busy ? 'جاري الحفظ…' : 'حفظ'}</button>
        </div>
      </div>
    </div>
  )
}
