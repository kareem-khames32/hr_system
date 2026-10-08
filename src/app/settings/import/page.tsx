'use client'

// B6.1 (ب): «استيراد بيانات التجهيز» — الهيكل (فروع وأقسام) والموظفين من Excel: نزّل القالب ← ارفع الملف للمعاينة (مفيش حاجة بتتحفظ) ← راجع الأخطاء بالصف ←
// طبّق. الموجود قبل كده بيتخطّى، فإعادة رفع نفس الملف آمنة. لحساب بكل الفروع بصلاحية الإعدادات (الخادم اللي بيحكم).
import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { ApiError, getCurrentUser, sessionInit } from '@/lib/api'
import { branchScopeOfUser } from '@/lib/branch-scope'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
type Kind = 'structure' | 'employees'
const KINDS: Array<{ key: Kind; label: string; hint: string }> = [
  { key: 'structure', label: 'الهيكل (الفروع والأقسام)', hint: 'ابدأ بيه: كل صف فرع (بكوده) أو قسم جوه فرع.' },
  { key: 'employees', label: 'الموظفين', hint: 'بعد الهيكل: كل موظف بكود فرعه واسم قسمه. كود الموظف بيتولّد لوحده.' },
]
interface PreviewRow { row: number; summary: string; status: 'NEW' | 'ERROR'; errors: string[] }
interface Preview { kind: Kind; total: number; toCreate: number; existing: number; withErrors: number; canApply: boolean; rows: PreviewRow[] }
interface Applied { kind: Kind; total: number; created: number; existing: number; stoppedAt: { row: number; summary: string; error: string } | null }

async function call(kind: Kind, step: 'template' | 'preview' | 'apply', file?: File): Promise<Response> {
  const body = new FormData()
  if (file) body.append('file', file)
  let res: Response
  try { res = await fetch(`${API_BASE}/setup-import/${kind}/${step}`, await sessionInit({ method: 'POST', body })) } catch { throw new ApiError(0, 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة') }
  if (!res.ok) {
    const failure = await res.json().catch(() => ({}))
    const message = Array.isArray(failure?.message) ? failure.message.join('، ') : String(failure?.message ?? '')
    throw new ApiError(res.status, /[؀-ۿ]/.test(message) ? message : res.status === 403 ? 'الاستيراد لحساب بكل الفروع بصلاحية الإعدادات' : `تعذر تنفيذ الطلب (${res.status})`)
  }
  return res
}
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function SetupImportPage() {
  const [kind, setKind] = useState<Kind>('structure')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [applied, setApplied] = useState<Applied | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  // الاستيراد لحساب بكل الفروع (نفس حكم الخادم): الحساب المقيّد بفروع بيشوف السبب بدل نموذج بيترفض
  const [wide, setWide] = useState(true)
  useEffect(() => setWide(branchScopeOfUser(getCurrentUser()) === null), [])

  function reset(next?: Kind) {
    if (next) setKind(next)
    setFile(null); setPreview(null); setApplied(null); setError('')
    if (input.current) input.current.value = ''
  }
  async function run(work: () => Promise<void>) {
    setBusy(true); setError('')
    try { await work() } catch (cause) { setError(cause instanceof Error ? cause.message : 'حصل خطأ غير متوقع') } finally { setBusy(false) }
  }
  const template = () => run(async () => saveBlob(await (await call(kind, 'template')).blob(), `import-${kind}-template.xlsx`))
  const check = (picked: File) => run(async () => { setApplied(null); setPreview(await (await call(kind, 'preview', picked)).json()) })
  const apply = () => { if (file) void run(async () => { setApplied(await (await call(kind, 'apply', file)).json()); setPreview(null) }) }
  const current = KINDS.find((item) => item.key === kind)!

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-primary-600" />
            استيراد بيانات التجهيز
          </h1>
          <p className="text-gray-500 mt-1">حمّل الهيكل والموظفين من Excel. الملف بيتراجع الأول ومفيش حاجة بتتحفظ قبل ما تأكد، والموجود قبل كده بيتخطّى.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {!wide && <div className="card text-gray-600">الاستيراد بيضيف فروع وموظفين في كل الشركة، فهو لحساب «كل الفروع» بس.</div>}

        {wide && <div className="card space-y-4" data-import-form>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((item) => (
              <button key={item.key} type="button" className={item.key === kind ? 'btn-primary' : 'btn-secondary'} onClick={() => reset(item.key)}>{item.label}</button>
            ))}
          </div>
          <p className="text-sm text-gray-600">{current.hint}</p>
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={template}>تنزيل القالب</button>
            <label className="text-sm text-gray-600">ملف Excel (القالب بعد ما تملاه)
              <input ref={input} type="file" accept=".xlsx,.csv" className="input mt-1 block" disabled={busy}
                onChange={(event) => { const picked = event.target.files?.[0] ?? null; setFile(picked); setPreview(null); setApplied(null); if (picked) void check(picked) }} />
            </label>
          </div>
        </div>}

        {preview && (
          <div className="card space-y-3" data-import-preview>
            <h2 className="text-lg font-semibold text-gray-800">المعاينة — {current.label}</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>الصفوف: <b>{preview.total}</b></span>
              <span className="text-green-700">هيتعمل: <b>{preview.toCreate}</b></span>
              <span className="text-gray-600">موجود قبل كده: <b>{preview.existing}</b></span>
              <span className={preview.withErrors ? 'text-red-700' : 'text-gray-600'}>فيه أخطاء: <b>{preview.withErrors}</b></span>
            </div>
            {preview.withErrors > 0 && <p className="text-sm text-red-700">صلّح الصفوف اللي فيها أخطاء في الملف وارفعه تاني — مفيش حاجة بتتحفظ طول ما فيه صف غلط.</p>}
            {preview.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-center">الصف</th>
                      <th className="table-header text-right">البيان</th>
                      <th className="table-header text-right">النتيجة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.row} className="border-t border-gray-100 align-top">
                        <td className="table-cell text-center" dir="ltr">{row.row}</td>
                        <td className="table-cell">{row.summary}</td>
                        <td className={`table-cell ${row.status === 'ERROR' ? 'text-red-700' : 'text-green-700'}`}>{row.status === 'ERROR' ? row.errors.join(' · ') : 'جديد'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !preview.canApply} onClick={apply}>تطبيق ({preview.toCreate})</button>
          </div>
        )}

        {applied && (
          <div className="card space-y-2" data-import-result>
            <h2 className="text-lg font-semibold text-gray-800">النتيجة</h2>
            <p className="text-sm text-green-700">اتعمل {applied.created} من {applied.total} صف{applied.existing ? ` — و${applied.existing} موجود قبل كده اتخطّى` : ''}.</p>
            {applied.stoppedAt && <p className="text-sm text-red-700">التطبيق وقف عند الصف {applied.stoppedAt.row} ({applied.stoppedAt.summary}): {applied.stoppedAt.error} — صلّحه وارفع الملف تاني؛ اللي اتعمل هيتخطّى.</p>}
            <button type="button" className="btn-secondary" onClick={() => reset()}>ملف تاني</button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
