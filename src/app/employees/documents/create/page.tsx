'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, Eye, FileCheck, FilePlus2, FileText, Loader2, Plus, Printer, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import PdfPreview from '@/components/PdfPreview'
import { ApiError, can, isUncertainWriteError } from '@/lib/api'
import {
  downloadIssuedHrDocument, fetchHrDocumentEmployees, fetchIssuedHrDocuments, fetchPublishedHrDocumentTemplates,
  HR_DOCUMENT_CATEGORY_LABELS, issueHrDocument, previewHrDocument,
  type HrDocumentCatalog, type HrDocumentEmployee, type HrDocumentIssueInput, type IssuedHrDocument,
} from '@/lib/hr-documents'
import { hrDocumentAttemptFingerprint } from '@/lib/hr-document-template-editor'
import { printHrDocument } from '@/lib/print-hr-document'
import { DISPLAY_LOCALE } from '@/lib/dates'

type Operation = 'load' | 'preview' | 'issue' | 'download' | 'print' | null
type Attempt = { input: HrDocumentIssueInput; key: string; fingerprint: string }
type Preview = { url: string; title: string; saved: boolean; documentId?: number }
const dateLabel = (date: string) => new Date(date).toLocaleString(DISPLAY_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })

function IssueWorkspace() {
  const [catalog, setCatalog] = useState<HrDocumentCatalog | null>(null)
  const [employees, setEmployees] = useState<HrDocumentEmployee[]>([])
  const [templateId, setTemplateId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [issued, setIssued] = useState<IssuedHrDocument[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyVersion, setHistoryVersion] = useState(0)
  const [operation, setOperation] = useState<Operation>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revisionConflict, setRevisionConflict] = useState(false)
  const [uncertain, setUncertain] = useState<Attempt | null>(null)
  const [created, setCreated] = useState<{ document: IssuedHrDocument; fingerprint: string } | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const busy = useRef(false)
  const attempt = useRef<Attempt | null>(null)
  const selected = catalog?.templates.find(template => template.id === Number(templateId))
  const revision = selected?.publishedRevision
  const fields = revision?.customFields ?? []
  const requiresEmployee = revision ? Object.values(revision.content).some(text => /\{\{\s*(employee|contract|salary)\./.test(text)) : false
  const hasSalary = revision ? Object.values(revision.content).some(text => /\{\{\s*salary\./.test(text)) : false
  const selectedEmployee = employees.find(employee => employee.id === Number(employeeId))
  const input: HrDocumentIssueInput | null = selected && revision ? {
    templateId: selected.id, revisionId: revision.id, ...(employeeId ? { employeeId: Number(employeeId) } : {}),
    values: Object.fromEntries(fields.map(field => [field.key, values[field.key] ?? ''])),
  } : null
  const fingerprint = input ? hrDocumentAttemptFingerprint(input) : ''
  const invalidFields = fields.filter(field => (field.required && !values[field.key]?.trim()) || (values[field.key]?.length ?? 0) > 4000)
  const valid = !!input && invalidFields.length === 0 && (!requiresEmployee || !!selectedEmployee) && (!employeeId || !!selectedEmployee)
  const currentCreated = created?.fingerprint === fingerprint ? created.document : null
  const inputsDisabled = !!operation || !!uncertain
  const visibleEmployees = employees.filter(employee => employee.id === Number(employeeId) || employee.fullName.includes(employeeSearch) || employee.employeeCode.includes(employeeSearch))

  const load = useCallback(async (initial = false) => {
    const [result, directory] = await Promise.all([fetchPublishedHrDocumentTemplates(), fetchHrDocumentEmployees()])
    setCatalog(result); setEmployees(directory)
    setTemplateId(previous => result.templates.some(template => String(template.id) === previous) ? previous : String(result.templates[0]?.id ?? ''))
    if (initial) {
      const rawId = new URLSearchParams(window.location.search).get('employeeId')
      if (rawId) {
        const id = Number(rawId)
        if (Number.isSafeInteger(id) && id > 0 && directory.some(employee => employee.id === id)) setEmployeeId(String(id))
        else setError('الموظف المطلوب غير متاح ضمن نطاق صلاحياتك. اختر موظفًا متاحًا قبل الإصدار.')
      }
    }
    setRevisionConflict(false)
  }, [])
  useEffect(() => {
    let active = true
    load(true).catch(err => { if (active) setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الإصدار') }).finally(() => { if (active) setOperation(null) })
    return () => { active = false }
  }, [load])
  useEffect(() => {
    if (!catalog) return
    let active = true
    setHistoryLoading(true); setHistoryError('')
    fetchIssuedHrDocuments(employeeId ? Number(employeeId) : undefined).then(result => { if (active) setIssued(result) }).catch(err => { if (active) { setIssued([]); setHistoryError(err instanceof Error ? err.message : 'تعذر تحميل سجل المستندات') } }).finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [catalog, employeeId, historyVersion])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  useEffect(() => {
    if (!uncertain) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [uncertain])

  const run = async (kind: Exclude<Operation, null>, action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true; setOperation(kind); setError(''); setNotice('')
    try { await action() }
    catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إتمام العملية')
      if (err instanceof ApiError && err.status === 409 && (kind === 'preview' || kind === 'issue')) setRevisionConflict(true)
    } finally { busy.current = false; setOperation(null) }
  }
  const changed = () => {
    if (preview && !preview.saved) setPreview(null)
    setError(''); setNotice(''); setRevisionConflict(false)
    attempt.current = null
  }
  const submit = (retry?: Attempt) => run('issue', async () => {
    if (!retry && (!input || !valid || currentCreated || revisionConflict)) return
    const currentInput = retry?.input ?? input!
    const currentFingerprint = retry?.fingerprint ?? fingerprint
    if (!retry && attempt.current?.fingerprint !== currentFingerprint) attempt.current = { input: currentInput, fingerprint: currentFingerprint, key: crypto.randomUUID() }
    const currentAttempt = retry ?? attempt.current!
    let document: IssuedHrDocument
    try { document = await issueHrDocument({ ...currentAttempt.input, idempotencyKey: currentAttempt.key }) }
    catch (err) {
      // انقطاع الاتصال (الحالة 0) أو مهلة أو خطأ خادم: ممكن المستند اتحفظ والرد ضاع — نقفل المدخلات ونعيد بنفس المفتاح
      if (isUncertainWriteError(err)) setUncertain(currentAttempt)
      else setUncertain(null)
      throw err
    }
    setUncertain(null); setRevisionConflict(false)
    setCreated({ document, fingerprint: currentAttempt.fingerprint })
    setHistoryVersion(previous => previous + 1)
    setPreview(null)
    setNotice(`صدر المستند وحُفظ بالمرجع ${document.reference}. يمكنك تنزيل ملفه المحفوظ أو طباعته.`)
  })
  const viewSaved = (document: IssuedHrDocument) => run('download', async () => {
    const blob = await downloadIssuedHrDocument(document.id)
    setPreview({ url: URL.createObjectURL(blob), title: document.reference, saved: true, documentId: document.id })
  })
  const downloadSaved = (document: IssuedHrDocument) => run('download', async () => {
    const blob = await downloadIssuedHrDocument(document.id)
    const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a')
    anchor.href = url; anchor.download = `${document.reference.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
    window.document.body.append(anchor); anchor.click(); anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  })
  const printSaved = (document: IssuedHrDocument) => run('print', () => printHrDocument(() => downloadIssuedHrDocument(document.id), document.reference))
  const startNew = () => {
    attempt.current = null; setCreated(null); setValues({}); setError(''); setNotice(''); setPreview(null); setRevisionConflict(false)
  }

  return <div className="space-y-6 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center"><FilePlus2 size={25} /></div><div><Link href="/employees/documents" className="text-xs text-gray-500 hover:underline">مستندات الموظفين</Link><h1 className="text-2xl font-bold text-gray-800">إصدار مستند</h1><p className="text-sm text-gray-500 mt-1">أصدر مستندًا عامًا أو مستندًا لموظف من قالب منشور، واحفظ نسخته النهائية.</p></div></div><div className="flex gap-2">{can('settings.manage') && <Link href="/settings/document-templates" className="btn-secondary">إدارة القوالب</Link>}<button type="button" disabled={inputsDisabled} onClick={() => void run('load', async () => { await load(); setNotice('حُدثت القوالب المنشورة. راجع الحقول ثم أعد المعاينة قبل الإصدار.') })} className="btn-secondary flex gap-2 items-center"><RefreshCw size={16} />تحديث القوالب</button></div></div>
    <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-gray-700 leading-7"><p>اختر القالب والموظف عند الحاجة، ثم أكمل الحقول وعاين PDF قبل الإصدار. بيانات الشركة والموظف تأتي من السجل الحالي. المستند الصادر يحتفظ بنسخته الأصلية حتى إذا تغيرت البيانات أو القالب لاحقًا.</p><p className="text-xs text-gray-500 flex items-center gap-2 mt-1"><ShieldCheck size={15} />تظهر القوالب والموظفون والمستندات المسموح لك بالوصول إليها.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">{error}{!catalog && <button type="button" disabled={!!operation} onClick={() => void run('load', () => load(true))} className="block underline mt-2">إعادة المحاولة</button>}</div>}
    {notice && <div role="status" className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-800 flex gap-2"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}
    {uncertain && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><p className="font-semibold">لم يصل تأكيد نهائي من الخادم</p><p className="mt-2 leading-6">قد يكون المستند حُفظ بالفعل. أبقينا نفس محاولة الإصدار وبياناتها لمنع التكرار. أعد المحاولة هنا قبل تغيير المدخلات أو مغادرة الصفحة.</p><button type="button" disabled={!!operation} onClick={() => void submit(uncertain)} className="btn-primary mt-3">إعادة محاولة نفس الإصدار</button></div>}
    {revisionConflict && !uncertain && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"><p>تغيرت إتاحة القالب أو نسخته المنشورة. احتفظنا بقيم الحقول؛ حدّث القوالب وراجع النسخة الجديدة قبل الإصدار.</p><button type="button" disabled={!!operation} onClick={() => void run('load', () => load())} className="underline mt-2">تحميل آخر نسخة منشورة</button></div>}
    {!catalog && operation === 'load' && <div className="card p-16 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-3" />جارٍ تحميل القوالب والموظفين...</div>}
    {catalog && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <section className="card p-5 space-y-5"><h2 className="font-bold">بيانات الإصدار</h2>{!catalog.templates.length ? <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500"><FileText size={30} className="mx-auto mb-3" /><p>لا توجد قوالب نشطة منشورة متاحة للإصدار.</p>{can('settings.manage') && <Link href="/settings/document-templates" className="text-primary-700 underline block mt-3">إنشاء قالب ونشره</Link>}</div> : <>
        <label className="block text-sm font-medium">القالب المنشور<select value={templateId} disabled={inputsDisabled} onChange={event => { changed(); setTemplateId(event.target.value); setValues({}) }} className="input w-full mt-2"><option value="">اختر قالبًا</option>{catalog.templates.map(template => <option key={template.id} value={template.id}>{template.name} — {HR_DOCUMENT_CATEGORY_LABELS[template.category]} — نسخة {template.publishedRevision?.revision}</option>)}</select></label>
        <div className="space-y-2"><label htmlFor="document-employee" className="text-sm font-medium">الموظف {requiresEmployee ? '(مطلوب لهذا القالب)' : '(اختياري)'}</label><input aria-label="البحث عن موظف" value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} disabled={inputsDisabled} className="input w-full text-sm" placeholder="ابحث بالاسم أو الرقم الوظيفي..." /><select id="document-employee" value={employeeId} disabled={inputsDisabled} onChange={event => { changed(); setEmployeeId(event.target.value) }} className="input w-full text-sm"><option value="">{requiresEmployee ? 'اختر موظفًا' : 'مستند عام — دون موظف'}</option>{visibleEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.fullName} — {employee.employeeCode}</option>)}</select><p className="text-xs text-gray-500">{requiresEmployee ? 'يحتوي القالب بيانات موظف أو عقد أو راتب؛ يجب اختيار الموظف.' : 'عند عدم اختيار موظف، يُحفظ المستند ضمن المستندات العامة في نطاقك.'}</p>{hasSalary && <p className="text-xs text-amber-700">يحتوي القالب بيانات راتب مسجلة؛ يتحقق الخادم من صلاحيتك المالية للموظف المختار.</p>}</div>
        {fields.length > 0 && <div className="border-t pt-4 space-y-4"><h3 className="font-bold text-sm">الحقول الإضافية</h3>{fields.map(field => <label key={field.key} className="block"><span className="text-sm font-medium">{field.label} {field.required && <span className="text-red-600">*</span>}</span><textarea value={values[field.key] ?? ''} rows={field.key === 'custom.terms' ? 8 : 3} maxLength={4000} disabled={inputsDisabled} required={field.required} onChange={event => { changed(); setValues(previous => ({ ...previous, [field.key]: event.target.value })) }} className="input w-full mt-2 leading-7" /><span className="text-[10px] text-gray-400">{values[field.key]?.length ?? 0} / 4000 حرف {field.required ? '• مطلوب' : '• اختياري'}</span></label>)}</div>}
        <div className="border-t pt-4 flex flex-wrap gap-3"><button type="button" disabled={inputsDisabled || !valid || revisionConflict} onClick={() => void run('preview', async () => { if (!input) return; const blob = await previewHrDocument(input); setPreview({ url: URL.createObjectURL(blob), title: selected?.name ?? 'المستند', saved: false }) })} className="btn-secondary flex gap-2 items-center disabled:opacity-40">{operation === 'preview' ? <Loader2 size={17} className="animate-spin" /> : <Eye size={17} />}معاينة PDF بالبيانات الحالية</button><button type="button" disabled={inputsDisabled || !valid || !!currentCreated || revisionConflict} onClick={() => void submit()} className="btn-primary flex gap-2 items-center disabled:opacity-40">{operation === 'issue' ? <Loader2 size={17} className="animate-spin" /> : <FileCheck size={17} />}إصدار المستند وحفظه</button></div>{invalidFields.some(field => field.required && !values[field.key]?.trim()) && <p className="text-xs text-gray-500">أكمل الحقول المطلوبة لتتمكن من المعاينة والإصدار.</p>}
      </>}</section>
      <aside className="space-y-4"><section className="card p-5 space-y-3"><h2 className="font-bold text-sm">القالب المختار</h2>{selected && revision ? <><p className="font-semibold text-primary-700">{selected.name}</p><p className="text-xs text-gray-500">{HR_DOCUMENT_CATEGORY_LABELS[selected.category]} • النسخة {revision.revision}</p><p className="text-xs text-gray-500">نُشرت في {dateLabel(revision.publishedAt)}</p><p className="text-xs text-gray-500">{selectedEmployee ? `الموظف: ${selectedEmployee.fullName}` : 'لم يُحدد موظف'}</p></> : <p className="text-xs text-gray-500">اختر قالبًا منشورًا.</p>}<p className="text-xs text-gray-500 border-t pt-3 leading-6">المعاينة لا تحفظ مستندًا. بعد الإصدار يمكنك فتح PDF المحفوظ أو تنزيله أو طباعته من السجل.</p></section>
        {currentCreated && <section className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3"><h2 className="font-bold text-green-800 flex gap-2 items-center"><CheckCircle2 size={18} />المستند محفوظ</h2><p className="text-sm text-green-800" dir="ltr">{currentCreated.reference}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={!!operation} onClick={() => void viewSaved(currentCreated)} className="btn-secondary text-xs">عرض</button><button type="button" disabled={!!operation} onClick={() => void downloadSaved(currentCreated)} className="btn-secondary text-xs">تنزيل PDF</button><button type="button" disabled={!!operation} onClick={() => void printSaved(currentCreated)} className="btn-secondary text-xs">طباعة</button></div><button type="button" disabled={inputsDisabled} onClick={startNew} className="text-xs text-primary-700 font-semibold flex items-center gap-1"><Plus size={14} />بدء مستند جديد</button></section>}
      </aside>
    </div>}
    {catalog && <section className="card overflow-hidden"><div className="p-5 border-b flex justify-between items-center gap-3"><div><h2 className="font-bold">سجل المستندات الصادرة</h2><p className="text-xs text-gray-500 mt-1">{selectedEmployee ? `مستندات ${selectedEmployee.fullName} ضمن صلاحياتك` : 'المستندات العامة ومستندات الموظفين المتاحة ضمن نطاق صلاحياتك'}</p></div><button type="button" disabled={historyLoading || !!operation} onClick={() => setHistoryVersion(previous => previous + 1)} className="btn-secondary text-xs flex items-center gap-1"><RefreshCw size={14} />تحديث السجل</button></div>{historyError && <div role="alert" className="m-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{historyError}</div>}{historyLoading ? <div className="p-10 text-center text-gray-500 text-sm">جارٍ تحميل السجل...</div> : issued.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="text-right p-4">المرجع</th><th className="text-right p-4">القالب</th><th className="text-right p-4">الموظف</th><th className="text-right p-4">تاريخ الإصدار</th><th className="text-right p-4">PDF المحفوظ</th></tr></thead><tbody>{issued.map(document => <tr key={document.id} className="border-t border-gray-100"><td className="p-4 font-medium" dir="ltr">{document.reference}</td><td className="p-4">{document.templateName}</td><td className="p-4">{document.employeeId ? employees.find(employee => employee.id === document.employeeId)?.fullName ?? `موظف #${document.employeeId}` : 'مستند عام'}</td><td className="p-4 text-xs text-gray-500 whitespace-nowrap">{dateLabel(document.createdAt)}</td><td className="p-4"><div className="flex gap-2"><button type="button" disabled={!!operation} onClick={() => void viewSaved(document)} aria-label={`عرض ${document.reference}`} title="عرض المستند المحفوظ" className="p-2 rounded-lg bg-primary-50 text-primary-700"><Eye size={16} /></button><button type="button" disabled={!!operation} onClick={() => void downloadSaved(document)} aria-label={`تنزيل ${document.reference}`} title="تنزيل PDF" className="p-2 rounded-lg bg-gray-100 text-gray-700"><Download size={16} /></button><button type="button" disabled={!!operation} onClick={() => void printSaved(document)} aria-label={`طباعة ${document.reference}`} title="طباعة PDF المحفوظ" className="p-2 rounded-lg bg-gray-100 text-gray-700"><Printer size={16} /></button></div></td></tr>)}</tbody></table></div> : !historyError && <p className="p-10 text-center text-gray-500 text-sm">لا توجد مستندات صادرة في هذا النطاق حتى الآن.</p>}</section>}
    {preview && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preview-title"><div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b"><div><h2 id="preview-title" className="font-bold">{preview.saved ? 'المستند المحفوظ' : 'معاينة قبل الإصدار'} — {preview.title}</h2><p className={`text-xs mt-1 ${preview.saved ? 'text-green-700' : 'text-amber-700'}`}>{preview.saved ? 'هذه نسخة PDF الأصلية التي حُفظت عند الإصدار.' : 'معاينة بالبيانات الحالية؛ لم يُصدر المستند ولم يُحفظ بعد.'}</p></div><div className="flex gap-2 items-center"><a href={preview.url} download={preview.saved ? `${preview.title}.pdf` : 'hr-document-preview.pdf'} className="btn-secondary text-xs flex gap-1 items-center"><Download size={15} />{preview.saved ? 'تنزيل PDF' : 'تنزيل المعاينة'}</a>{preview.saved && preview.documentId && <button type="button" disabled={!!operation} onClick={() => void run('print', () => printHrDocument(() => downloadIssuedHrDocument(preview.documentId!), preview.title))} className="btn-secondary text-xs flex gap-1 items-center"><Printer size={15} />طباعة</button>}<button type="button" onClick={() => setPreview(null)} aria-label="إغلاق معاينة المستند" className="p-2"><X size={20} /></button></div></div><PdfPreview url={preview.url} /></div></div>}
  </div>
}

export default function CreateHrDocumentPage() { return <MainLayout><IssueWorkspace /></MainLayout> }
