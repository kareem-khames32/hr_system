'use client'

// B3.13: «الاستبيانات» — استبيانات الموظف المفتوحة اللي لسه ماردّش عليها؛ ولصاحب الصلاحية: إنشاء استبيان وفتحه وقفله ونتايجه المجمّعة
// (من غير أسماء، ومن غير نتايج لمجموعة أقل من الحد الأدنى).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { can, fetchBranches, type ApiBranch } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import {
  SURVEY_KIND_LABELS, SURVEY_QUESTION_LABELS, closeSurvey, createSurvey, fetchMySurveys, fetchSurveyResults, fetchSurveys, openSurvey,
  type ApiMySurvey, type ApiSurvey, type ApiSurveyResults, type SurveyKind, type SurveyQuestionType, type SurveySummaryRow,
} from '@/lib/surveys-api'

export default function SurveysPage() {
  const manage = can('surveys.manage')
  const [mine, setMine] = useState<ApiMySurvey[] | null>(null)
  const [rows, setRows] = useState<ApiSurvey[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(0)
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState<ApiSurveyResults | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchMySurveys().then((data) => setMine(data.surveys)).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الاستبيانات'))
    if (manage) fetchSurveys().then((data) => { setRows(data.surveys); setNotice(data.available ? '' : data.message ?? '') }).catch(() => setRows([]))
  }, [manage])
  useEffect(load, [load])

  const run = async (id: number, work: () => Promise<string>) => {
    setBusy(id)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(0)
    }
  }
  const show = (id: number) => run(id, async () => { setResults(await fetchSurveyResults(id)); return '' })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={24} className="text-primary-600" />
              الاستبيانات
            </h1>
            <p className="text-gray-500 mt-1">رأيك بيفرق — والاستبيان المجهول ردّه مابيتربطش بصاحبه</p>
          </div>
          {manage && !notice && (
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              استبيان جديد
            </button>
          )}
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {mine && mine.length > 0 && (
          <div className="grid gap-3" data-my-surveys>
            {mine.map((row) => (
              <Link key={row.id} href={`/surveys/${row.id}`} className="card block hover:shadow-md transition-shadow">
                <p className="font-bold text-gray-800">{row.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {row.kindLabel} · {row.questionCount} سؤال · {row.isAnonymous ? 'مجهول' : 'بالاسم'}
                  {row.closeDate ? ` · آخر يوم ${formatDate(row.closeDate)}` : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
        {mine && mine.length === 0 && !manage && <EmptyState title="مفيش استبيانات مستنية ردّك" icon={ClipboardList} />}
        {manage && rows.length > 0 && (
          <div className="card overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-3">إدارة الاستبيانات</h2>
            <table className="w-full text-sm" data-surveys>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الاستبيان</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">النوع</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الحالة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الردود</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-gray-800">
                      {row.title} <span className="text-xs text-gray-400">· {row.isAnonymous ? 'مجهول' : 'بالاسم'}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.kindLabel}</td>
                    <td className="px-3 py-2 text-gray-600">{row.statusLabel}</td>
                    <td className="px-3 py-2 tabular-nums">{row.status === 'DRAFT' ? '—' : `${row.responded} من ${row.invited}`}</td>
                    <td className="px-3 py-2 text-left whitespace-nowrap">
                      {row.status === 'DRAFT' && (
                        <button onClick={() => run(row.id, async () => `الاستبيان اتفتح لـ${(await openSurvey(row.id)).invited} موظف.`)} disabled={busy === row.id} className="text-primary-600 hover:underline text-xs disabled:opacity-50">
                          فتح
                        </button>
                      )}
                      {row.status !== 'DRAFT' && (
                        <button onClick={() => show(row.id)} disabled={busy === row.id} className="text-primary-600 hover:underline text-xs ml-3 disabled:opacity-50">
                          النتايج
                        </button>
                      )}
                      {row.status === 'OPEN' && (
                        <button onClick={() => run(row.id, async () => { await closeSurvey(row.id); return 'الاستبيان اتقفل.' })} disabled={busy === row.id} className="text-red-600 hover:underline text-xs disabled:opacity-50">
                          قفل
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
      {adding && <SurveyModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); load() }} />}
      {results && <ResultsModal data={results} onClose={() => setResults(null)} />}
    </MainLayout>
  )
}

function Summary({ rows }: { rows: SurveySummaryRow[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row) => (
        <li key={row.key} className="text-gray-700">
          <span className="font-medium">{row.label}</span>{' '}
          {row.type === 'choice' ? (row.counts ?? []).map((entry) => `${entry.option}: ${entry.count}`).join(' · ') : `متوسط ${row.average ?? '—'}${row.type === 'enps' ? ` · eNPS ${row.enps ?? '—'}` : ''}`}
          <span className="text-xs text-gray-400"> ({row.answered} إجابة)</span>
        </li>
      ))}
    </ul>
  )
}

function ResultsModal({ data, onClose }: { data: ApiSurveyResults; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="نتايج الاستبيان">
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">نتايج «{data.survey.title}»</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4" data-survey-results>
          <p className="text-sm text-gray-600 tabular-nums">
            {data.total} رد من {data.survey.invited} مدعو · الحد الأدنى للعرض {data.minGroup}
          </p>
          {!data.visible && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">الردود لسه أقل من الحد الأدنى — مفيش نتايج تتعرض (حماية لسرية اللي ردّوا).</div>}
          {data.visible && (
            <>
              <div>
                <h3 className="font-bold text-gray-800 mb-2">الإجمالي</h3>
                <Summary rows={data.overall} />
              </div>
              {data.groups.map((group) => (
                <div key={group.name}>
                  <h3 className="font-bold text-gray-800 mb-2">
                    {group.name} <span className="text-xs text-gray-400">({group.count} رد)</span>
                  </h3>
                  <Summary rows={group.summary} />
                </div>
              ))}
              {data.groups.length === 0 && <p className="text-xs text-gray-500">تفصيل الأقسام مش معروض: فيه قسم ردوده أقل من الحد الأدنى (وعرض الباقي كان هيكشفه بالطرح).</p>}
              {data.commentsHidden ? (
                <p className="text-xs text-gray-500">التعليقات النصية بتتعرض لما الردود توصل حدها.</p>
              ) : (
                data.comments.map((entry) => (
                  <div key={entry.key}>
                    <h3 className="font-bold text-gray-800 mb-2">{entry.label}</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {entry.texts.map((text, index) => (
                        <li key={index} className="bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SurveyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<SurveyKind>('SATISFACTION')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [minGroup, setMinGroup] = useState('5')
  const [closeDate, setCloseDate] = useState('')
  const [branchIds, setBranchIds] = useState<number[]>([])
  const [questions, setQuestions] = useState<Array<{ label: string; type: SurveyQuestionType; required: boolean; options: string }>>([{ label: '', type: 'rating', required: true, options: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchBranches().then(setBranches).catch(() => setBranches([])) }, [])
  const patch = (index: number, change: Partial<(typeof questions)[number]>) => setQuestions(questions.map((entry, at) => (at === index ? { ...entry, ...change } : entry)))

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await createSurvey({ title: title.trim(), kind, isAnonymous, minGroup: Number(minGroup) || 5, closeDate: closeDate || null,
        audience: branchIds.length ? { mode: 'all', where: { mode: 'branches', ids: branchIds } } : null,
        questions: questions.map((entry) => ({ label: entry.label.trim(), type: entry.type, required: entry.required,
          ...(entry.type === 'choice' ? { options: entry.options.split('\n').map((option) => option.trim()).filter(Boolean) } : {}) })) })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الاستبيان')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="استبيان جديد">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">استبيان جديد (مسودة)</h2>
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
          <label className="block text-sm text-gray-600">
            العنوان
            <input className="input mt-1 w-full" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm text-gray-600">
              النوع
              <select className="input mt-1 w-full" value={kind} onChange={(e) => setKind(e.target.value as SurveyKind)}>
                {(Object.keys(SURVEY_KIND_LABELS) as SurveyKind[]).map((key) => (
                  <option key={key} value={key}>
                    {SURVEY_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-600">
              الحد الأدنى للعرض
              <input className="input mt-1 w-full" inputMode="numeric" value={minGroup} onChange={(e) => setMinGroup(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="block text-sm text-gray-600">
              آخر يوم للرد
              <input type="date" className="input mt-1 w-full" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            مجهول (الرد مايتربطش بصاحبه)
          </label>
          <div className="text-sm text-gray-600">
            الجمهور (من غير اختيار = كل الشركة)
            <div className="flex flex-wrap gap-2 mt-2">
              {branches.map((branch) => {
                const on = branchIds.includes(branch.id)
                return (
                  <button key={branch.id} type="button" onClick={() => setBranchIds(on ? branchIds.filter((value) => value !== branch.id) : [...branchIds, branch.id])}
                    className={`px-3 py-1 rounded-full text-sm ${on ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {branch.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">الأسئلة</p>
            {questions.map((entry, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input className="input flex-1" maxLength={300} placeholder={`السؤال ${index + 1}`} value={entry.label} onChange={(e) => patch(index, { label: e.target.value })} />
                  <select className="input" value={entry.type} onChange={(e) => patch(index, { type: e.target.value as SurveyQuestionType })}>
                    {(Object.keys(SURVEY_QUESTION_LABELS) as SurveyQuestionType[]).map((key) => (
                      <option key={key} value={key}>
                        {SURVEY_QUESTION_LABELS[key]}
                      </option>
                    ))}
                  </select>
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions(questions.filter((_, at) => at !== index))} className="text-red-600 text-xs hover:underline">
                      شيل
                    </button>
                  )}
                </div>
                {entry.type === 'choice' && (
                  <textarea className="input w-full text-sm" rows={3} placeholder="اختيار في كل سطر (من 2 لـ10)" value={entry.options} onChange={(e) => patch(index, { options: e.target.value })} />
                )}
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={entry.required} onChange={(e) => patch(index, { required: e.target.checked })} />
                  مطلوب
                </label>
              </div>
            ))}
            {questions.length < 30 && (
              <button onClick={() => setQuestions([...questions, { label: '', type: 'rating', required: true, options: '' }])} className="text-primary-600 text-sm hover:underline">
                + سؤال
              </button>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || title.trim().length < 3 || questions.some((entry) => entry.label.trim().length < 2)} className="btn-primary text-sm disabled:opacity-50">
              حفظ المسودة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
