'use client'

// B3.3-أ: «وظائف داخلية» — الوظائف المنشورة داخليًا في فرع الموظف، والتقديم عليها من بيانات ملفه (مرة واحدة لكل وظيفة)
import { useCallback, useEffect, useState } from 'react'
import { Briefcase, CheckCircle2, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { applyToOpening, fetchInternalOpenings, type ApiInternalOpening, type ApiInternalOpenings } from '@/lib/recruitment-jobs-api'

export default function InternalJobsPage() {
  const [data, setData] = useState<ApiInternalOpenings | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<ApiInternalOpening | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchInternalOpenings()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الوظائف'))
  }, [])
  useEffect(load, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={24} className="text-primary-600" />
            وظائف داخلية
          </h1>
          <p className="text-gray-500 mt-1">الوظائف المفتوحة للموظفين في فرعك — التقديم ببيانات ملفك، ومسؤول التوظيف بيتواصل معاك</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {data && !data.canApply && data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            التقديم الداخلي للحسابات المربوطة بملف موظف شغال.
          </div>
        )}
        {data && data.jobs.length === 0 && <EmptyState title="مفيش وظائف داخلية مفتوحة دلوقتي" icon={Briefcase} />}
        {data && data.jobs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-internal-jobs>
            {data.jobs.map((job) => (
              <div key={job.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{job.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {job.code}
                      {job.departmentName ? ` · ${job.departmentName}` : ''}
                      {` · العدد ${job.openings}`}
                      {job.startDate ? ` · البدء ${formatDate(job.startDate)}` : ''}
                    </p>
                  </div>
                  {job.applied ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 whitespace-nowrap">
                      <CheckCircle2 size={14} />
                      قدّمت
                    </span>
                  ) : (
                    <button onClick={() => setOpen(job)} className="btn-primary text-sm whitespace-nowrap">
                      تقديم
                    </button>
                  )}
                </div>
                {job.description && <p className="text-sm text-gray-700 whitespace-pre-line">{job.description}</p>}
                {job.requirements && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">المتطلبات</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{job.requirements}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {open && (
        <ApplyModal
          job={open}
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

function ApplyModal({ job, onClose, onDone }: { job: ApiInternalOpening; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await applyToOpening(job.id, note.trim() || undefined)
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر التقديم')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="تقديم على وظيفة داخلية">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">تقديم على وظيفة داخلية</h2>
            <p className="text-sm text-gray-500 mt-1">
              {job.title} · {job.code}
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
          <p className="text-sm text-gray-600">اسمك وبريدك وموبايلك المسجّلين في ملفك بيتبعتوا لمسؤول التوظيف. التقديم مرة واحدة للوظيفة.</p>
          <label className="block text-sm text-gray-700">
            ملاحظة لمسؤول التوظيف (اختياري)
            <textarea className="input w-full mt-1" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-50">
            تأكيد التقديم
          </button>
        </div>
      </div>
    </div>
  )
}
