'use client'

// B3.7: «نماذج التقييم» (لإدارة الأداء) — نموذج بمقياس تقدير وأقسام موزونة مجموعها 100: أهداف (بنوده أهداف الموظف)، جدارات وأسئلة (بنود تقدير أو نص).
// (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus, Trash2, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { REVIEW_SECTION_LABELS, createReviewTemplate, fetchReviewTemplates, updateReviewTemplate, type ApiReviewTemplate, type ReviewSectionKind } from '@/lib/reviews-api'

interface DraftItem { label: string; type: 'rating' | 'text'; required: boolean }
interface DraftSection { title: string; kind: ReviewSectionKind; weight: string; items: DraftItem[] }
const STARTER: DraftSection[] = [
  { title: 'الأهداف', kind: 'GOALS', weight: '50', items: [] },
  { title: 'الجدارات', kind: 'COMPETENCIES', weight: '50', items: [{ label: 'التعاون والعمل مع الفريق', type: 'rating', required: true }, { label: 'الالتزام والمواعيد', type: 'rating', required: true }] },
]

export default function ReviewTemplatesPage() {
  const [templates, setTemplates] = useState<ApiReviewTemplate[] | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(0)

  const load = useCallback(() => {
    setError('')
    fetchReviewTemplates()
      .then((data) => { setTemplates(data.templates); setNotice(data.available ? '' : data.message ?? '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل النماذج'))
  }, [])
  useEffect(load, [load])

  const toggle = async (template: ApiReviewTemplate) => {
    setBusy(template.id)
    setError('')
    try {
      await updateReviewTemplate(template.id, { isActive: !template.isActive })
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تعديل النموذج')
    } finally {
      setBusy(0)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText size={24} className="text-primary-600" />
              نماذج التقييم
            </h1>
            <p className="text-gray-500 mt-1">
              أقسام موزونة ومقياس تقدير — الدورة بتاخد نسخة من النموذج وقت إطلاقها ·{' '}
              <Link href="/performance/cycles" className="text-primary-600 hover:underline">
                دورات التقييم
              </Link>
            </p>
          </div>
          {templates && !notice && (
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              نموذج جديد
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {templates && !notice && templates.length === 0 && <EmptyState title="مفيش نماذج تقييم لسه" icon={FileText} />}
        {templates && templates.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-templates>
            {templates.map((template) => (
              <div key={template.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{template.name}</h2>
                    <p className="text-xs text-gray-500 mt-1">مقياس من 1 لـ{template.ratingMax}</p>
                    {template.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{template.description}</p>}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${template.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{template.isActive ? 'متاح' : 'موقوف'}</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-2">
                  {template.sections.map((section) => (
                    <li key={section.key}>
                      <span className="font-medium">{section.title}</span>
                      <span className="text-xs text-gray-500">
                        {' '}
                        · {REVIEW_SECTION_LABELS[section.kind]} · {section.weight}%
                      </span>
                      {section.items.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{section.items.map((item) => item.label).join('، ')}</p>}
                    </li>
                  ))}
                </ul>
                <button onClick={() => toggle(template)} disabled={busy === template.id} className="btn-secondary text-sm disabled:opacity-50">
                  {template.isActive ? 'إيقاف' : 'إتاحة'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {adding && <TemplateModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
    </MainLayout>
  )
}

function TemplateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ratingMax, setRatingMax] = useState('5')
  const [sections, setSections] = useState<DraftSection[]>(STARTER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const patch = (at: number, change: Partial<DraftSection>) => setSections((prev) => prev.map((section, index) => (index === at ? { ...section, ...change } : section)))
  const patchItem = (at: number, itemAt: number, change: Partial<DraftItem>) =>
    patch(at, { items: sections[at].items.map((item, index) => (index === itemAt ? { ...item, ...change } : item)) })
  const total = sections.reduce((sum, section) => sum + (/^\d{1,3}$/.test(section.weight.trim()) ? Number(section.weight) : 0), 0)
  const sectionOk = (section: DraftSection) =>
    section.title.trim().length >= 2 && /^\d{1,3}$/.test(section.weight.trim()) &&
    (section.kind === 'GOALS' || (section.items.length >= 1 && section.items.every((item) => item.label.trim().length >= 2) && (Number(section.weight) === 0 || section.items.some((item) => item.type === 'rating'))))
  const valid = name.trim().length >= 3 && /^\d{1,2}$/.test(ratingMax.trim()) && Number(ratingMax) >= 3 && Number(ratingMax) <= 10 && sections.length >= 1 && sections.every(sectionOk) && total === 100 &&
    sections.filter((section) => section.kind === 'GOALS').length <= 1

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await createReviewTemplate({ name: name.trim(), description: description.trim() || null, ratingMax: Number(ratingMax),
        sections: sections.map((section) => ({ title: section.title.trim(), kind: section.kind, weight: Number(section.weight),
          ...(section.kind === 'GOALS' ? {} : { items: section.items.map((item) => ({ label: item.label.trim(), type: item.type, required: item.required })) }) })) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ النموذج')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="نموذج تقييم جديد">
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">نموذج تقييم جديد</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <label className="block text-sm text-gray-700 sm:col-span-3">
              اسم النموذج
              <input className="input w-full mt-1" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-700">
              أعلى درجة (3–10)
              <input type="number" min={3} max={10} className="input w-full mt-1" value={ratingMax} onChange={(e) => setRatingMax(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm text-gray-700">
            الوصف (اختياري)
            <input className="input w-full mt-1" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">الأقسام</p>
            <p className={`text-sm tabular-nums ${total === 100 ? 'text-gray-500' : 'text-red-600'}`}>مجموع الأوزان: {total}% (لازم 100)</p>
          </div>
          {sections.map((section, at) => (
            <div key={at} className="border border-gray-200 rounded-xl p-4 space-y-3" data-section>
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                <label className="block text-sm text-gray-700 col-span-2 sm:col-span-5">
                  عنوان القسم
                  <input className="input w-full mt-1" maxLength={100} value={section.title} onChange={(e) => patch(at, { title: e.target.value })} />
                </label>
                <label className="block text-sm text-gray-700 sm:col-span-3">
                  النوع
                  <select
                    className="input w-full mt-1"
                    value={section.kind}
                    onChange={(e) => patch(at, { kind: e.target.value as ReviewSectionKind, items: e.target.value === 'GOALS' ? [] : section.items.length ? section.items : [{ label: '', type: 'rating', required: true }] })}
                  >
                    {(Object.keys(REVIEW_SECTION_LABELS) as ReviewSectionKind[]).map((key) => (
                      <option key={key} value={key}>
                        {REVIEW_SECTION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-gray-700 sm:col-span-3">
                  الوزن %
                  <input type="number" min={0} max={100} className="input w-full mt-1" value={section.weight} onChange={(e) => patch(at, { weight: e.target.value })} />
                </label>
                <button onClick={() => setSections((prev) => prev.filter((_, index) => index !== at))} disabled={sections.length === 1} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 sm:col-span-1" aria-label="حذف القسم">
                  <Trash2 size={18} />
                </button>
              </div>
              {section.kind === 'GOALS' ? (
                <p className="text-xs text-gray-500">بنود القسم ده هي أهداف الموظف السارية في فترة الدورة (من شاشة الأهداف)، بأوزانها.</p>
              ) : (
                <div className="space-y-2">
                  {section.items.map((item, itemAt) => (
                    <div key={itemAt} className="flex items-center gap-2 flex-wrap">
                      <input className="input text-sm flex-1 min-w-[10rem]" maxLength={200} placeholder="عنوان البند" value={item.label} onChange={(e) => patchItem(at, itemAt, { label: e.target.value })} />
                      <select className="input text-sm w-28" value={item.type} onChange={(e) => patchItem(at, itemAt, { type: e.target.value as 'rating' | 'text' })}>
                        <option value="rating">تقدير</option>
                        <option value="text">نص</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        <input type="checkbox" checked={item.required} onChange={(e) => patchItem(at, itemAt, { required: e.target.checked })} />
                        مطلوب
                      </label>
                      <button onClick={() => patch(at, { items: section.items.filter((_, index) => index !== itemAt) })} disabled={section.items.length === 1} className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30" aria-label="حذف البند">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => patch(at, { items: [...section.items, { label: '', type: 'rating', required: true }] })} disabled={section.items.length >= 20} className="text-sm text-primary-600 hover:underline disabled:opacity-50">
                    + بند
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setSections((prev) => [...prev, { title: '', kind: 'QUESTIONS', weight: '0', items: [{ label: '', type: 'text', required: false }] }])}
            disabled={sections.length >= 8}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            + قسم
          </button>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button onClick={submit} disabled={!valid || saving} title="الاسم، ومقياس من 3 لـ10، وأقسام أوزانها 100، وكل قسم موزون فيه بند تقدير" className="btn-primary disabled:opacity-50">
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}
