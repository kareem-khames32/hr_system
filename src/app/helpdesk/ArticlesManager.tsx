'use client'

// B3.10: إدارة مقالات قاعدة المعرفة (لصاحب صلاحية مركز الخدمات) — مقال بنوع استفسار وكلمات بحث وجمهور، ونشره وسحبه.
// B-ADD.1: الجمهور بالاستهداف الموحد (الشركة ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم + «الكل ماعدا…» ومعاينة).
import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { OrgAudienceField } from '@/components/OrgAudienceField'
import { describeAudience, fetchOrgAudienceContext, type OrgAudienceContext, type StoredAudience } from '@/lib/org-audience'
import { createArticle, fetchManagedArticles, updateArticle, type ApiManagedArticle, type ArticleBody } from '@/lib/helpdesk-api'

interface Draft { id: number | null; title: string; body: string; typeCode: string; keywords: string; audience: StoredAudience | null; audienceComplete: boolean; isPublished: boolean }
const blank: Draft = { id: null, title: '', body: '', typeCode: '', keywords: '', audience: null, audienceComplete: true, isPublished: true }

export default function ArticlesManager() {
  const [rows, setRows] = useState<ApiManagedArticle[] | null>(null)
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([])
  const [orgContext, setOrgContext] = useState<OrgAudienceContext | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    setError('')
    fetchManagedArticles()
      .then((data) => { setRows(data.articles); setTypes(data.types); setNotice(data.available ? '' : data.message ?? '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المقالات'))
  }, [])
  useEffect(load, [load])
  useEffect(() => { fetchOrgAudienceContext().then(setOrgContext).catch(() => setOrgContext(null)) }, [])

  const edit = (row: ApiManagedArticle) => setDraft({ id: row.id, title: row.title, body: row.body, typeCode: row.typeCode ?? '', keywords: row.keywords ?? '',
    audience: (row.audience ?? null) as StoredAudience | null, audienceComplete: true, isPublished: row.isPublished })
  const save = async () => {
    if (!draft) return
    setBusy(true)
    setFormError('')
    const body = { title: draft.title.trim(), body: draft.body.trim(), typeCode: draft.typeCode || null, keywords: draft.keywords.trim() || null,
      audience: draft.audience as ArticleBody['audience'], isPublished: draft.isPublished }
    try {
      if (draft.id) await updateArticle(draft.id, body)
      else await createArticle(body)
      setDraft(null)
      load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'تعذر حفظ المقال')
    } finally {
      setBusy(false)
    }
  }
  const toggle = async (row: ApiManagedArticle) => {
    setError('')
    try {
      await updateArticle(row.id, { isPublished: !row.isPublished })
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تعديل المقال')
    }
  }

  return (
    <div className="space-y-4" data-articles-manager>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">مقالات قاعدة المعرفة</h2>
        {rows && !notice && (
          <button onClick={() => { setDraft({ ...blank }); setFormError('') }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            مقال جديد
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
      {rows && !notice && rows.length === 0 && <p className="text-sm text-gray-500">مفيش مقالات لسه.</p>}
      {rows && rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-start font-medium text-gray-600">العنوان</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">النوع</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">الجمهور</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">الحالة</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-800">{row.title}</td>
                  <td className="px-3 py-2 text-gray-600">{row.typeName ?? 'عام'}</td>
                  <td className="px-3 py-2 text-gray-600">{describeAudience(row.audience as StoredAudience | null, orgContext)}</td>
                  <td className="px-3 py-2 text-gray-600">{row.isPublished ? 'منشور' : 'مسودة'}</td>
                  <td className="px-3 py-2 text-end whitespace-nowrap">
                    <button onClick={() => edit(row)} className="text-primary-600 hover:underline text-xs me-3">
                      تعديل
                    </button>
                    <button onClick={() => toggle(row)} className="text-primary-600 hover:underline text-xs">
                      {row.isPublished ? 'سحب' : 'نشر'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {draft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="مقال">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{draft.id ? 'تعديل مقال' : 'مقال جديد'}</h2>
              <button onClick={() => setDraft(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                  {formError}
                </div>
              )}
              <label className="block text-sm text-gray-600">
                العنوان
                <input className="input mt-1 w-full" maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </label>
              <label className="block text-sm text-gray-600">
                النص
                <textarea className="input mt-1 w-full" rows={8} maxLength={20000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-gray-600">
                  نوع الاستفسار المرتبط
                  <select className="input mt-1 w-full" value={draft.typeCode} onChange={(e) => setDraft({ ...draft, typeCode: e.target.value })}>
                    <option value="">عام</option>
                    {types.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-gray-600">
                  كلمات البحث
                  <input className="input mt-1 w-full" maxLength={500} value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
                </label>
              </div>
              <div className="text-sm text-gray-600">
                <div className="mt-1" data-article-audience>
                  <OrgAudienceField value={draft.audience} disabled={busy}
                    onChange={(audience, complete) => setDraft((current) => (current ? { ...current, audience, audienceComplete: complete } : current))} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} />
                منشور للموظفين
              </label>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setDraft(null)} className="btn-secondary text-sm">
                  إلغاء
                </button>
                <button onClick={save} disabled={busy || !draft.audienceComplete || draft.title.trim().length < 3 || !draft.body.trim()} className="btn-primary text-sm disabled:opacity-50">
                  حفظ المقال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
