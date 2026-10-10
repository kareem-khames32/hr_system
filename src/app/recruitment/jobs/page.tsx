'use client'

// B3.2: «إدارة الوظائف» — الوظائف الشاغرة (من احتياج معتمد أو من الشاشة): الوصف والمتطلبات والعدد، والحالة: مسودة ← منشورة ↔ موقوفة ← مقفولة
import { useCallback, useEffect, useState } from 'react'
import { Briefcase, Link2, Plus, Rss, Share2, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import JobSharePanel from '@/components/recruitment/JobSharePanel'
import PublishingChannels from '@/components/recruitment/PublishingChannels'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import {
  RECRUITMENT_JOB_NEXT, createRecruitmentJob, fetchRecruitmentJobForm, fetchRecruitmentJobs, setRecruitmentJobStatus, updateRecruitmentJob,
  type ApiRecruitmentJob, type ApiRecruitmentJobForm, type ApiRecruitmentJobsList, type RecruitmentJobStatus,
} from '@/lib/recruitment-jobs-api'

const statusStyle: Record<RecruitmentJobStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PUBLISHED: 'bg-green-50 text-green-700', PAUSED: 'bg-amber-50 text-amber-800', CLOSED: 'bg-red-50 text-red-700',
}
const salaryText = (job: ApiRecruitmentJob) =>
  job.salaryFrom && job.salaryTo ? `${formatMoney(job.salaryFrom)} – ${formatMoney(job.salaryTo)}`
    : job.salaryFrom ? `من ${formatMoney(job.salaryFrom)}` : job.salaryTo ? `حتى ${formatMoney(job.salaryTo)}` : '—'
const placesText = (job: ApiRecruitmentJob) => [job.internal ? 'داخلي' : '', job.external ? 'خارجي' : ''].filter(Boolean).join(' + ') || '—'
// نفس حكم الخادم: النشر محتاج وصف (10 حروف) ومكان نشر
const publishable = (job: ApiRecruitmentJob) => (job.description ?? '').trim().length >= 10 && (job.internal || job.external)

export default function RecruitmentJobsPage() {
  const [data, setData] = useState<ApiRecruitmentJobsList | null>(null)
  const [form, setForm] = useState<ApiRecruitmentJobForm | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<RecruitmentJobStatus | 'all'>('all')
  const [editing, setEditing] = useState<ApiRecruitmentJob | 'new' | null>(null)
  const [busy, setBusy] = useState(0)
  const [copied, setCopied] = useState(0)
  // B-ADD.6: «انشر الوظيفة» (رقم الوظيفة المفتوحة لوحتها) و«قنوات النشر»
  const [sharing, setSharing] = useState(0)
  const [channels, setChannels] = useState(false)

  // B3.3-ب: لينك التقديم العام للوظيفة المنشورة «خارجي» (بيشتغل لما ميزة «صفحة الوظائف العامة» مفتوحة) — النسخ والتحديد اليدوي لو النسخ اترفض
  const copyLink = async (job: ApiRecruitmentJob) => {
    const link = `${window.location.origin}/careers/${job.id}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(job.id)
      setTimeout(() => setCopied(0), 2500)
    } catch {
      window.prompt('لينك التقديم', link)
    }
  }

  const load = useCallback(() => {
    setError('')
    fetchRecruitmentJobs()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الوظائف'))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    fetchRecruitmentJobForm().then(setForm).catch(() => setForm(null))
  }, [])

  const move = async (job: ApiRecruitmentJob, status: RecruitmentJobStatus) => {
    setBusy(job.id)
    setError('')
    try {
      await setRecruitmentJobStatus(job.id, status)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تغيير حالة الوظيفة')
    } finally {
      setBusy(0)
    }
  }

  const jobs = (data?.jobs ?? []).filter((job) => filter === 'all' || job.status === filter)
  const count = (status: RecruitmentJobStatus) => (data?.jobs ?? []).filter((job) => job.status === status).length

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Briefcase size={24} className="text-primary-600" />
              إدارة الوظائف
            </h1>
            <p className="text-gray-500 mt-1">الوظائف الشاغرة: من احتياج توظيف معتمد أو من هنا مباشرة، ونشرها وإيقافها وقفلها</p>
          </div>
          {data?.available && data.canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setChannels(true)} className="btn-secondary flex items-center gap-2" title="فيد XML للوظائف والنشر التلقائي على صفحة الشركة">
                <Rss size={18} />
                قنوات النشر
              </button>
              <button onClick={() => setEditing('new')} disabled={!form} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Plus size={18} />
                وظيفة جديدة
              </button>
            </div>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {data.message}
          </div>
        )}
        {data?.available && (
          <div className="flex items-center gap-2 flex-wrap" data-job-filters>
            {([['all', `الكل (${data.jobs.length})`], ['DRAFT', `مسودة (${count('DRAFT')})`], ['PUBLISHED', `منشورة (${count('PUBLISHED')})`],
              ['PAUSED', `موقوفة (${count('PAUSED')})`], ['CLOSED', `مقفولة (${count('CLOSED')})`]] as Array<[RecruitmentJobStatus | 'all', string]>).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`px-3 py-1.5 rounded-full text-sm ${filter === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {data?.available && jobs.length === 0 && (
          <EmptyState title={data.jobs.length === 0 ? 'مفيش وظائف شاغرة لسه' : 'مفيش وظائف بالحالة دي'} icon={Briefcase} />
        )}
        {data?.available && jobs.length > 0 && (
          <div className="card p-0 overflow-x-auto" data-job-list>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الوظيفة</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الفرع والقسم</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">العدد</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">المتقدمين</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">نطاق الراتب</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">النشر</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{job.title}</div>
                      <div className="text-xs text-gray-500">
                        {job.code}
                        {job.requestId ? ` · من احتياج معتمد (طلب ${job.requestId})` : ''}
                        {job.startDate ? ` · البدء ${formatDate(job.startDate)}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {job.branchName}
                      {job.departmentName ? ` · ${job.departmentName}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-800 tabular-nums">{job.openings}</td>
                    <td className="px-4 py-3 text-gray-800 tabular-nums">{job.applicants}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{salaryText(job)}</td>
                    <td className="px-4 py-3 text-gray-600">{placesText(job)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyle[job.status]}`}>{job.statusLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      {data.canManage && job.status !== 'CLOSED' && (
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {job.status === 'PUBLISHED' && job.external && (
                            <button onClick={() => copyLink(job)} className="btn-secondary text-sm inline-flex items-center gap-1" title="لينك التقديم العام (محتاج ميزة «صفحة الوظائف العامة» مفتوحة)">
                              <Link2 size={14} />
                              {copied === job.id ? 'اتنسخ' : 'لينك التقديم'}
                            </button>
                          )}
                          {job.status === 'PUBLISHED' && job.external && (
                            <button onClick={() => setSharing(job.id)} className="btn-secondary text-sm inline-flex items-center gap-1" title="بوست جاهز وصورة وأزرار مشاركة على السوشيال ميديا" data-job-share-open>
                              <Share2 size={14} />
                              انشر الوظيفة
                            </button>
                          )}
                          <button onClick={() => setEditing(job)} className="btn-secondary text-sm">
                            تعديل
                          </button>
                          {RECRUITMENT_JOB_NEXT[job.status].map((next) => (
                            <button
                              key={next.status}
                              onClick={() => move(job, next.status)}
                              disabled={busy === job.id || (next.status === 'PUBLISHED' && !publishable(job))}
                              title={next.status === 'PUBLISHED' && !publishable(job) ? 'النشر محتاج وصف للوظيفة (10 حروف على الأقل) ومكان نشر واحد على الأقل' : undefined}
                              className={`text-sm disabled:opacity-50 ${next.status === 'PUBLISHED' ? 'btn-primary' : 'btn-secondary'}`}
                            >
                              {next.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {sharing > 0 && <JobSharePanel jobId={sharing} onClose={() => setSharing(0)} />}
      {channels && <PublishingChannels onClose={() => setChannels(false)} />}
      {editing && form && (
        <JobModal
          job={editing === 'new' ? null : editing}
          form={form}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </MainLayout>
  )
}

function JobModal({ job, form, onClose, onDone }: { job: ApiRecruitmentJob | null; form: ApiRecruitmentJobForm; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(job?.title ?? '')
  const [branchId, setBranchId] = useState(job ? String(job.branchId) : form.branches.length === 1 ? String(form.branches[0].id) : '')
  const [departmentId, setDepartmentId] = useState(job?.departmentId ? String(job.departmentId) : '')
  const [openings, setOpenings] = useState(String(job?.openings ?? 1))
  const [reason, setReason] = useState(job?.reason ?? '')
  const [salaryFrom, setSalaryFrom] = useState(job?.salaryFrom ?? '')
  const [salaryTo, setSalaryTo] = useState(job?.salaryTo ?? '')
  const [startDate, setStartDate] = useState(job?.startDate ?? '')
  const [description, setDescription] = useState(job?.description ?? '')
  const [requirements, setRequirements] = useState(job?.requirements ?? '')
  const [internal, setInternal] = useState(job?.internal ?? true)
  const [external, setExternal] = useState(job?.external ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amountOk = (value: string) => value.trim() === '' || /^\d{1,11}(\.\d{1,2})?$/.test(value.trim())
  const rangeOk = amountOk(salaryFrom) && amountOk(salaryTo) && (salaryFrom.trim() === '' || salaryTo.trim() === '' || Number(salaryTo) >= Number(salaryFrom))
  const openingsOk = /^\d{1,4}$/.test(openings.trim()) && Number(openings) >= 1 && Number(openings) <= 1000
  const valid = title !== '' && branchId !== '' && openingsOk && rangeOk
  // مسمى الوظيفة الحالي لو اتقفل في الكتالوج بيفضل ظاهر في القايمة
  const titles = job && !form.jobTitles.some((row) => row.title === job.title) ? [{ id: 0, title: job.title }, ...form.jobTitles] : form.jobTitles
  const departments = form.departments.filter((row) => String(row.branchId) === branchId)

  const submit = async () => {
    setSaving(true)
    setError('')
    const text = (value: string) => (value.trim() === '' ? null : value.trim())
    const fields = {
      title, openings: Number(openings), reason: text(reason), salaryFrom: text(salaryFrom), salaryTo: text(salaryTo), startDate: text(startDate),
      description: text(description), requirements: text(requirements), internal, external,
    }
    try {
      if (job) await updateRecruitmentJob(job.id, fields)
      else await createRecruitmentJob({ ...fields, branchId: Number(branchId), departmentId: departmentId === '' ? null : Number(departmentId) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الوظيفة')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={job ? 'تعديل وظيفة' : 'وظيفة جديدة'}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{job ? 'تعديل وظيفة' : 'وظيفة جديدة'}</h2>
            <p className="text-sm text-gray-500 mt-1">{job ? `${job.code} · ${job.statusLabel}` : 'بتتعمل «مسودة» — النشر من القايمة بعد ما الوصف يكمل'}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700">
              المسمى الوظيفي
              <select className="input w-full mt-1" value={title} onChange={(e) => setTitle(e.target.value)}>
                <option value="">اختر المسمى</option>
                {titles.map((row) => (
                  <option key={`${row.id}-${row.title}`} value={row.title}>
                    {row.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              العدد المطلوب
              <input type="number" min={1} max={1000} className="input w-full mt-1" value={openings} onChange={(e) => setOpenings(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              الفرع
              <select
                className="input w-full mt-1 disabled:bg-gray-50"
                value={branchId}
                disabled={!!job}
                onChange={(e) => {
                  setBranchId(e.target.value)
                  setDepartmentId('')
                }}
              >
                <option value="">اختر الفرع</option>
                {job && !form.branches.some((row) => row.id === job.branchId) && <option value={job.branchId}>{job.branchName}</option>}
                {form.branches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              القسم (اختياري)
              <select className="input w-full mt-1 disabled:bg-gray-50" value={departmentId} disabled={!!job} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">من غير قسم</option>
                {job?.departmentId && !departments.some((row) => row.id === job.departmentId) && <option value={job.departmentId}>{job.departmentName}</option>}
                {departments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {job && <p className="text-xs text-gray-500">الفرع والقسم مابيتغيّروش — لوحدة تانية اقفل الوظيفة واعمل واحدة جديدة.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block text-sm text-gray-700">
              الراتب المعروض من (اختياري)
              <input inputMode="decimal" className="input w-full mt-1" value={salaryFrom} onChange={(e) => setSalaryFrom(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              إلى (اختياري)
              <input inputMode="decimal" className="input w-full mt-1" value={salaryTo} onChange={(e) => setSalaryTo(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              تاريخ البدء (اختياري)
              <input type="date" className="input w-full mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          </div>
          {!rangeOk && <p className="text-xs text-red-600">نطاق الراتب: أرقام بخانتين بالكتير، و«إلى» مش أقل من «من».</p>}
          <label className="block text-sm text-gray-700">
            سبب الاحتياج (اختياري)
            <input className="input w-full mt-1" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="block text-sm text-gray-700">
            وصف الوظيفة (مطلوب للنشر)
            <textarea className="input w-full mt-1" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block text-sm text-gray-700">
            المتطلبات (اختياري)
            <textarea className="input w-full mt-1" rows={3} maxLength={4000} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </label>
          <div className="flex items-center gap-6 text-sm text-gray-700">
            <span>مكان النشر:</span>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              داخلي (للموظفين)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} />
              خارجي (صفحة الوظائف)
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="المسمى والفرع والعدد (1–1000) مطلوبين" className="btn-primary disabled:opacity-50">
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}
