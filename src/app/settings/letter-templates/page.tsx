'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, Copy, Download, Eye, FileCheck, FileSignature, FileText, GitBranch, Link2, Loader2, Plus, RefreshCw, Save, Search, Send, ShieldCheck, Sparkles, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import PdfPreview from '@/components/PdfPreview'
import {
  ApiError, bindLetterTemplate, createLetterTemplate, fetchLetterTemplates,
  previewLetterTemplate, publishLetterTemplate, updateLetterTemplate,
  type ApiLetterTemplate, type ApiLetterTemplateCatalog, type ApiLetterTemplateDraft,
  type ApiLetterTemplateVariable,
} from '@/lib/api'
import { DISPLAY_LOCALE } from '@/lib/dates'

type DraftField = keyof ApiLetterTemplateDraft
type Editor = { name: string; draft: ApiLetterTemplateDraft }
type Operation = 'load' | 'save' | 'publish' | 'preview' | 'active' | 'bind' | null
type Navigation = { kind: 'template'; id: number } | { kind: 'new' } | { kind: 'reload' }
const EMPTY_DRAFT: ApiLetterTemplateDraft = { title: '', greeting: '', body: '', closing: '', footer: '' }
const FIELDS: Array<{ key: DraftField; label: string; rows: number; limit: number }> = [
  { key: 'title', label: 'عنوان الخطاب', rows: 1, limit: 200 },
  { key: 'greeting', label: 'التحية', rows: 2, limit: 500 },
  { key: 'body', label: 'نص الخطاب', rows: 9, limit: 12000 },
  { key: 'closing', label: 'الخاتمة والتوقيع', rows: 3, limit: 1500 },
  { key: 'footer', label: 'تذييل الصفحة', rows: 3, limit: 1500 },
]
const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g
const variableKey = (key: string) => key.replace(/^\{\{\s*|\s*\}\}$/g, '')
const formatDate = (value: string) => new Date(value).toLocaleString(DISPLAY_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })

function mapTokens(text: string, variables: ApiLetterTemplateVariable[], mode: 'readable' | 'canonical' | 'sample') {
  return text.replace(TOKEN, (original, key: string) => {
    const variable = variables.find((item) => variableKey(item.key) === key.trim() || item.label === key.trim())
    if (!variable) return original
    if (mode === 'sample') {
      const value = String(variable.sample)
      return ['employee.employeeCode', 'employee.joinDate', 'employee.nationalId', 'company.phone', 'date', 'request.ref', 'salary.total', 'salary.currency'].includes(variableKey(variable.key)) ? `\u2066${value}\u2069` : value
    }
    return `{{${mode === 'readable' ? variable.label : variableKey(variable.key)}}}`
  })
}

function transformDraft(draft: ApiLetterTemplateDraft, variables: ApiLetterTemplateVariable[], mode: 'readable' | 'canonical' | 'sample'): ApiLetterTemplateDraft {
  return { title: mapTokens(draft.title, variables, mode), greeting: mapTokens(draft.greeting, variables, mode), body: mapTokens(draft.body, variables, mode), closing: mapTokens(draft.closing, variables, mode), footer: mapTokens(draft.footer, variables, mode) }
}

function TemplatesWorkspace() {
  const [catalog, setCatalog] = useState<ApiLetterTemplateCatalog | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editor, setEditor] = useState<Editor>({ name: '', draft: { ...EMPTY_DRAFT } })
  const [tab, setTab] = useState<'editor' | 'bindings'>('editor')
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState<Operation>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState(false)
  const [bindingChoices, setBindingChoices] = useState<Record<string, string>>({})
  const [pendingNavigation, setPendingNavigation] = useState<Navigation | null>(null)
  const [publishConfirmation, setPublishConfirmation] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')
  const busy = useRef(false)
  const inputRefs = useRef<Partial<Record<DraftField, HTMLTextAreaElement>>>({})
  const cursor = useRef<{ field: DraftField; start: number; end: number }>({ field: 'body', start: 0, end: 0 })
  const variables = catalog?.variables ?? []
  const selected = catalog?.templates.find((template) => template.id === selectedId)
  const canonicalDraft = transformDraft(editor.draft, variables, 'canonical')
  const isDirty = selected
    ? editor.name.trim() !== selected.name || FIELDS.some(({ key }) => canonicalDraft[key] !== selected.draft[key])
    : editor.name.trim() !== '' || Object.values(editor.draft).some((text) => text.trim() !== '')
  const unknownVariables = [...new Set(Object.values(editor.draft).flatMap((text) => [...text.matchAll(TOKEN)].map((match) => match[1].trim())))].filter((key) => !variables.some((item) => variableKey(item.key) === key || item.label === key))
  const fieldIssues = FIELDS.filter(({ key, limit }) => canonicalDraft[key].length > limit)
  const validContent = canonicalDraft.title.trim().length >= 2 && canonicalDraft.body.trim().length >= 10 && unknownVariables.length === 0 && fieldIssues.length === 0
  const validDraft = !!editor.name.trim() && editor.name.trim().length <= 150 && validContent
  const sampleDraft = transformDraft(editor.draft, variables, 'sample')
  const sampleValue = (key: string) => String(variables.find((item) => variableKey(item.key) === key)?.sample ?? '')
  const visibleTemplates = catalog?.templates.filter((template) => template.name.includes(search) || template.draft.title.includes(search)) ?? []
  const publishableTemplates = catalog?.templates.filter((template) => template.isActive && template.publishedRevision) ?? []
  const boundTypes = catalog?.bindings.filter((binding) => binding.templateId === selectedId).map((binding) => catalog.requestTypes.find((type) => type.code === binding.requestTypeCode)?.nameAr ?? binding.requestTypeCode) ?? []
  const draftDiffersFromPublished = !selected?.publishedRevision || FIELDS.some(({ key }) => selected.draft[key] !== selected.publishedRevision?.[key])

  const adoptTemplate = (template: ApiLetterTemplate, vars: ApiLetterTemplateVariable[]) => {
    setSelectedId(template.id)
    setEditor({ name: template.name, draft: transformDraft(template.draft, vars, 'readable') })
    setConflict(false)
    cursor.current = { field: 'body', start: 0, end: 0 }
  }
  const loadCatalog = useCallback(async (preferredId?: number | null) => {
    const result = await fetchLetterTemplates()
    setCatalog(result)
    setBindingChoices(Object.fromEntries(result.bindings.map((binding) => [binding.requestTypeCode, String(binding.templateId)])))
    const template = result.templates.find((item) => item.id === preferredId) ?? result.templates[0]
    if (template) adoptTemplate(template, result.variables)
    else { setSelectedId(null); setEditor({ name: '', draft: { ...EMPTY_DRAFT } }) }
  }, [])
  useEffect(() => {
    let active = true
    loadCatalog().catch((err) => { if (active) setError(err instanceof Error ? err.message : 'تعذر تحميل القوالب') }).finally(() => { if (active) setOperation(null) })
    return () => { active = false }
  }, [loadCatalog])
  useEffect(() => {
    if (!isDirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [isDirty])
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  const perform = async (kind: Exclude<Operation, null>, action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true; setOperation(kind); setError(''); setNotice('')
    try { await action() }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر إتمام العملية'); if (err instanceof ApiError && err.status === 409 && err.message.includes('جلسة أخرى')) setConflict(true) }
    finally { busy.current = false; setOperation(null) }
  }
  const acceptUpdatedTemplate = (template: ApiLetterTemplate) => {
    setCatalog((previous) => previous ? { ...previous, templates: previous.templates.some((item) => item.id === template.id) ? previous.templates.map((item) => item.id === template.id ? template : item) : [...previous.templates, template] } : previous)
    adoptTemplate(template, variables)
  }
  const saveDraft = () => perform('save', async () => {
    if (!validDraft) return
    const input = { name: editor.name.trim(), draft: canonicalDraft }
    const saved = selected ? await updateLetterTemplate(selected.id, { ...input, version: selected.version }) : await createLetterTemplate(input)
    acceptUpdatedTemplate(saved)
    setNotice('حُفظت المسودة. انشرها عندما تصبح جاهزة للاستخدام في الخطابات.')
  })
  const publish = () => perform('publish', async () => {
    setPublishConfirmation(false)
    if (!selected || isDirty) return
    const published = await publishLetterTemplate(selected.id, selected.version)
    acceptUpdatedTemplate(published)
    setNotice(`نُشرت النسخة ${published.publishedRevision?.revision ?? ''}. يمكنك ربطها بنوع الطلب من تبويب «ربط الطلبات».`)
  })
  const toggleActive = () => perform('active', async () => {
    if (!selected || isDirty) return
    const updated = await updateLetterTemplate(selected.id, { version: selected.version, isActive: !selected.isActive })
    acceptUpdatedTemplate(updated)
    setNotice(updated.isActive ? 'فُعّل القالب.' : 'أُوقف القالب. الخطابات الصادرة سابقًا محفوظة كما هي.')
  })
  const showPdf = () => perform('preview', async () => {
    const pdf = await previewLetterTemplate(canonicalDraft)
    setPreviewName(editor.draft.title || editor.name)
    setPdfUrl(URL.createObjectURL(pdf))
  })
  const saveBinding = (requestTypeCode: string) => perform('bind', async () => {
    const templateId = Number(bindingChoices[requestTypeCode]); if (!templateId) return
    const binding = await bindLetterTemplate(requestTypeCode, templateId)
    setCatalog((previous) => previous ? { ...previous, bindings: [...previous.bindings.filter((item) => item.requestTypeCode !== requestTypeCode), binding] } : previous)
    setNotice('حُفظ ربط القالب بنوع الطلب. الخطابات الجديدة تستخدم نسخته المنشورة.')
  })
  const applyNavigation = (navigation: Navigation) => {
    setPendingNavigation(null); setError(''); setNotice(''); setConflict(false)
    if (navigation.kind === 'new') { setSelectedId(null); setEditor({ name: '', draft: { ...EMPTY_DRAFT } }); setTab('editor') }
    else if (navigation.kind === 'reload') void perform('load', () => loadCatalog(selectedId))
    else { const template = catalog?.templates.find((item) => item.id === navigation.id); if (template) adoptTemplate(template, variables); setTab('editor') }
  }
  const navigate = (navigation: Navigation) => { if (operation) return; if (isDirty) setPendingNavigation(navigation); else applyNavigation(navigation) }
  const duplicate = () => {
    if (!selected || operation) return
    setSelectedId(null); setEditor((previous) => ({ name: `${previous.name} — نسخة`, draft: { ...previous.draft } })); setError(''); setConflict(false)
    setNotice('هذه نسخة جديدة غير محفوظة. عدّل اسمها ونصها ثم احفظ المسودة.')
  }
  const insertVariable = (variable: ApiLetterTemplateVariable) => {
    if (operation) return
    const { field, start, end } = cursor.current; const text = editor.draft[field]; const token = `{{${variable.label}}}`
    const position = Math.min(start, text.length); const after = position + token.length
    setEditor((previous) => ({ ...previous, draft: { ...previous.draft, [field]: text.slice(0, position) + token + text.slice(Math.max(position, end)) } }))
    cursor.current = { field, start: after, end: after }
    requestAnimationFrame(() => { const input = inputRefs.current[field]; input?.focus(); input?.setSelectionRange(after, after) })
  }
  const variableGroups = [
    { label: 'بيانات الموظف', prefix: 'employee.' }, { label: 'الشركة', prefix: 'company.' },
    { label: 'الراتب المسجل', prefix: 'salary.' }, { label: 'بيانات الخطاب', prefix: '' },
  ].map((group) => ({ ...group, items: variables.filter((variable) => group.prefix ? variableKey(variable.key).startsWith(group.prefix) : !['employee.', 'company.', 'salary.'].some((prefix) => variableKey(variable.key).startsWith(prefix))) }))

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center"><FileSignature size={25} /></div><div><div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Link href="/settings" className="hover:text-primary-700">الإعدادات</Link><ChevronLeft size={13} /><span>إصدار الخطابات</span></div><h1 className="text-2xl font-bold text-gray-800">قوالب الخطابات</h1><p className="text-sm text-gray-500 mt-1">صياغة الخطاب الذي يصل إلى الموظف بعد اعتماد طلبه.</p></div></div>
        <div className="flex gap-2"><button type="button" disabled={!!operation} onClick={() => navigate({ kind: 'reload' })} className="btn-secondary flex items-center gap-2"><RefreshCw size={16} className={operation === 'load' ? 'animate-spin' : ''} />تحديث</button><button type="button" disabled={!!operation || !catalog} onClick={() => navigate({ kind: 'new' })} className="btn-primary flex items-center gap-2"><Plus size={17} />قالب جديد</button></div>
      </div>
      <div className="rounded-2xl border border-primary-100 bg-gradient-to-l from-primary-50 to-white px-5 py-4"><div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-700">{[{ icon: FileText, label: 'اكتب المسودة' }, { icon: Send, label: 'انشر النسخة' }, { icon: Link2, label: 'اربط نوع الطلب' }, { icon: FileCheck, label: 'اعتماد الطلب وإصدار PDF' }].map((step, index) => <div key={step.label} className="flex items-center gap-3"><span className="flex items-center gap-2"><step.icon size={17} className="text-primary-600" />{step.label}</span>{index < 3 && <ArrowLeft size={14} className="text-primary-300" />}</div>)}</div><p className="text-xs text-gray-500 mt-2">التعديل على المسودة لا يغير النسخة المنشورة، والخطابات التي صدرت سابقًا تبقى محفوظة.</p></div>
      {catalog?.companyNameConfigured === false && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">أكمل اسم الشركة الرسمي قبل إصدار الخطابات. يمكنك تجهيز القوالب ومعاينتها الآن. <Link href="/settings/company" className="font-semibold underline">فتح بيانات الشركة</Link></div>}
      {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800"><p>{error}</p>{!catalog && <button type="button" onClick={() => void perform('load', () => loadCatalog())} disabled={!!operation} className="underline mt-2">إعادة المحاولة</button>}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-800"><CheckCircle2 size={18} className="shrink-0" /><p className="flex-1">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="إخفاء الرسالة"><X size={16} /></button></div>}
      {conflict && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">يوجد تحديث أحدث للقالب على الخادم</p><p className="mt-1">احتفظنا بالنص الذي تعدله هنا. يمكنك نسخه قبل تحميل آخر نسخة محفوظة.</p><button type="button" disabled={!!operation} onClick={() => navigate({ kind: 'reload' })} className="mt-2 underline font-semibold">تحميل آخر نسخة</button></div>}
      <div className="flex gap-1 border-b border-gray-200"><button type="button" onClick={() => setTab('editor')} className={`px-5 py-3 text-sm font-semibold border-b-2 ${tab === 'editor' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>تحرير القوالب</button><button type="button" onClick={() => setTab('bindings')} className={`px-5 py-3 text-sm font-semibold border-b-2 ${tab === 'bindings' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>ربط الطلبات</button></div>
      {operation === 'load' && !catalog ? <div className="card py-20 text-center text-gray-500"><Loader2 size={30} className="animate-spin mx-auto mb-3 text-primary-600" />جارٍ تحميل القوالب ونسخها المنشورة...</div> : catalog && tab === 'editor' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
          <aside className="card p-3 space-y-3"><div className="flex justify-between items-center px-1"><h2 className="font-bold text-gray-800">القوالب</h2><span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-1">{catalog.templates.length}</span></div><div className="relative"><Search size={15} className="absolute top-3 right-3 text-gray-400" /><input aria-label="بحث عن قالب" value={search} onChange={(event) => setSearch(event.target.value)} className="input pr-9 w-full text-sm" placeholder="بحث عن قالب..." /></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-2">{visibleTemplates.map((template) => <button key={template.id} type="button" disabled={!!operation} onClick={() => navigate({ kind: 'template', id: template.id })} className={`text-right p-3 rounded-xl border transition ${selectedId === template.id ? 'bg-primary-50 border-primary-300' : 'border-transparent hover:bg-gray-50'} disabled:opacity-60`}><div className="flex gap-2 items-start"><FileText size={17} className={`shrink-0 mt-0.5 ${selectedId === template.id ? 'text-primary-600' : 'text-gray-400'}`} /><p className="text-sm font-semibold text-gray-800 break-words">{template.name}</p></div><div className="flex flex-wrap gap-1 mt-2"><span className={`text-[10px] rounded-full px-2 py-0.5 ${!template.isActive ? 'bg-gray-200 text-gray-600' : template.publishedRevision ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{!template.isActive ? 'متوقف' : template.publishedRevision ? `منشور • نسخة ${template.publishedRevision.revision}` : 'مسودة'}</span></div></button>)}</div>{!visibleTemplates.length && <p className="text-center text-xs text-gray-400 py-4">{search ? 'لا توجد قوالب مطابقة' : 'ابدأ بإضافة أول قالب'}</p>}</aside>
          <div className="space-y-5 min-w-0">
            <section className="card p-5"><div className="flex flex-wrap justify-between gap-3 items-start"><div><div className="flex items-center gap-2"><h2 className="font-bold text-gray-900">{selected ? 'تحرير المسودة' : 'قالب جديد'}</h2>{isDirty && <span className="text-[10px] rounded-full px-2 py-1 bg-amber-50 text-amber-700">غير محفوظ</span>}</div><p className="text-xs text-gray-500 mt-1">{selected ? `آخر حفظ: ${formatDate(selected.updatedAt)}` : 'احفظ النص أولًا، ثم انشر نسخته عندما تكتمل.'}</p></div><div className="flex items-center gap-2">{selected && <button type="button" disabled={!!operation} onClick={duplicate} className="btn-secondary text-xs flex items-center gap-1.5"><Copy size={14} />نسخة جديدة</button>}<button type="button" disabled={!!operation || !validDraft || !isDirty} onClick={() => void saveDraft()} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">{operation === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}حفظ المسودة</button></div></div><div className="mt-5"><label className="label" htmlFor="template-name">اسم القالب في النظام</label><input id="template-name" maxLength={150} disabled={!!operation} value={editor.name} onChange={(event) => setEditor((previous) => ({ ...previous, name: event.target.value }))} className="input w-full" placeholder="مثال: تعريف راتب للجهات البنكية" /><p className="text-xs text-gray-400 mt-1">اسم داخلي؛ عنوان الخطاب أدناه هو الذي يظهر للموظف.</p></div></section>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(250px,0.95fr)] gap-5 items-start">
              <section className="card p-5 space-y-5 min-w-0">
                {FIELDS.map((field) => <div key={field.key}><div className="flex items-center justify-between gap-2 mb-2"><label htmlFor={`template-${field.key}`} className="text-sm font-semibold text-gray-700">{field.label}</label>{field.key === 'body' && <span className="text-xs text-gray-400">{editor.draft.body.length} حرف</span>}</div><textarea id={`template-${field.key}`} ref={(element) => { if (element) inputRefs.current[field.key] = element }} rows={field.rows} value={editor.draft[field.key]} disabled={!!operation} onFocus={(event) => { cursor.current = { field: field.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd } }} onSelect={(event) => { cursor.current = { field: field.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd } }} onChange={(event) => setEditor((previous) => ({ ...previous, draft: { ...previous.draft, [field.key]: event.target.value } }))} className="input w-full resize-y leading-7 text-sm" placeholder={field.key === 'body' ? 'اكتب فقرات الخطاب هنا...' : field.label} /></div>)}
                {fieldIssues.length > 0 && <div role="alert" className="rounded-xl bg-red-50 text-red-800 text-xs p-3">{fieldIssues.map((field) => `${field.label}: الحد الأقصى ${field.limit} حرف بعد إدراج المتغيرات`).join("، ")}</div>}
                {unknownVariables.length > 0 && <div className="rounded-xl bg-amber-50 text-amber-900 text-xs p-3">متغيرات غير معروفة: {unknownVariables.join('، ')}. استخدم أزرار البيانات المتاحة أدناه.</div>}
                <div className="border-t pt-4"><div className="flex items-center gap-2 text-sm font-bold text-gray-800"><Sparkles size={16} className="text-primary-600" />إدراج بيانات تلقائية</div><p className="text-xs text-gray-500 mt-1">حدد موضعًا داخل النص، ثم اضغط اسم البيان.</p><div className="space-y-3 mt-4">{variableGroups.filter((group) => group.items.length).map((group) => <div key={group.label}><p className="text-[11px] font-semibold text-gray-500 mb-2">{group.label}</p><div className="flex flex-wrap gap-1.5">{group.items.map((variable) => <button key={variable.key} type="button" disabled={!!operation} onMouseDown={(event) => event.preventDefault()} onClick={() => insertVariable(variable)} title={`مثال توضيحي: ${variable.sample}`} className="text-xs border border-primary-100 bg-primary-50 text-primary-800 hover:border-primary-300 hover:bg-primary-100 rounded-lg px-2.5 py-1.5 disabled:opacity-40">+ {variable.label}</button>)}</div></div>)}</div><p className="text-[11px] text-gray-400 mt-4 leading-5">متغيرات الراتب تستعمل القيم المسجلة في ملف الموظف. لا تحسب مسيرًا أو مستحقات جديدة.</p></div>
              </section>
              <div className="space-y-4 min-w-0 xl:sticky xl:top-4">
                <section className="rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden"><div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Eye size={17} className="text-primary-600" />معاينة حية</div><span className="text-[10px] px-2 py-1 bg-amber-50 rounded-full text-amber-700">بيانات توضيحية</span></div><div className="p-3 sm:p-4"><div className="bg-white min-h-[490px] shadow-sm p-5 text-gray-700 text-[12px] leading-7 break-words"><div className="border-b-2 border-primary-600 pb-3 flex justify-between gap-2"><p className="font-bold text-primary-800 text-sm">{sampleValue('company.name') || 'بيانات الشركة'}</p><p className="text-[9px] text-gray-400 text-left leading-5">{sampleValue('date')}<br />{sampleValue('request.ref')}</p></div><h3 className="font-bold text-center text-gray-900 text-base leading-7 my-7 whitespace-pre-wrap">{sampleDraft.title || 'عنوان الخطاب'}</h3><p className="whitespace-pre-wrap mb-4">{sampleDraft.greeting}</p><p className="whitespace-pre-wrap min-h-[130px]">{sampleDraft.body || 'سيظهر نص الخطاب هنا أثناء الكتابة.'}</p><p className="whitespace-pre-wrap mt-7 text-left">{sampleDraft.closing}</p><p className="whitespace-pre-wrap border-t mt-8 pt-3 text-[10px] text-gray-500 leading-5">{sampleDraft.footer}</p></div></div><div className="px-4 pb-4"><p className="text-[11px] text-gray-500 mb-3 leading-5">معاينة نصية ببيانات توضيحية؛ ملف PDF يعرض توزيع الصفحات النهائي.</p><button type="button" disabled={!!operation || !validContent} onClick={() => void showPdf()} className="btn-secondary w-full flex justify-center items-center gap-2 text-sm disabled:opacity-40">{operation === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}معاينة PDF من الخادم</button></div></section>
                <section className="card p-4 space-y-3"><div className="flex items-center gap-2 text-sm font-bold text-gray-800"><ShieldCheck size={17} className="text-green-600" />النسخة المستخدمة للإصدار</div>{selected?.publishedRevision ? <div><p className="text-sm text-green-700 font-semibold">النسخة المنشورة {selected.publishedRevision.revision}</p><p className="text-xs text-gray-500 mt-1">{formatDate(selected.publishedRevision.publishedAt)}</p></div> : <p className="text-xs text-gray-500 leading-5">لا توجد نسخة منشورة لهذا القالب بعد.</p>}{boundTypes.length > 0 && <p className="text-xs text-gray-500 leading-5">مرتبط بـ: {boundTypes.join('، ')}</p>}<button type="button" disabled={!!operation || !selected || !selected.isActive || isDirty || !validDraft || !draftDiffersFromPublished} onClick={() => setPublishConfirmation(true)} className="btn-primary w-full flex justify-center items-center gap-2 text-sm disabled:opacity-40"><Send size={15} />نشر المسودة</button><p className="text-[11px] text-gray-500 leading-5">{isDirty ? 'احفظ التعديلات أولًا لتتمكن من نشرها.' : !selected?.isActive && selected ? 'فعّل القالب قبل نشر مسودته.' : !draftDiffersFromPublished ? 'النص المحفوظ مطابق للنسخة المنشورة.' : 'النشر يجعل هذه الصياغة متاحة للإصدار عبر أنواع الطلبات المرتبطة.'}</p>{selected && <button type="button" disabled={!!operation || isDirty} onClick={() => void toggleActive()} className={`flex items-center gap-2 text-xs font-semibold ${selected.isActive ? 'text-gray-500 hover:text-red-700' : 'text-primary-700'} disabled:opacity-40`}>{selected.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{selected.isActive ? 'إيقاف القالب' : 'تفعيل القالب'}</button>}<button type="button" onClick={() => setTab('bindings')} className="text-primary-700 text-xs font-semibold flex items-center gap-1">إدارة ربط الطلبات<ArrowLeft size={13} /></button></section>
              </div>
            </div>
          </div>
        </div>
      ) : catalog && (
        <section className="space-y-5"><div className="flex gap-3 items-start"><div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><GitBranch size={21} /></div><div><h2 className="text-lg font-bold text-gray-900">أي قالب يصدر مع كل طلب؟</h2><p className="text-sm text-gray-500 mt-1">اختر قالبًا نشطًا له نسخة منشورة. تغيير الربط لا يعيد إنشاء الخطابات الصادرة سابقًا.</p></div></div><div className="grid lg:grid-cols-2 gap-4">{catalog.requestTypes.map((type) => {
          const currentId = catalog.bindings.find((binding) => binding.requestTypeCode === type.code)?.templateId
          const current = catalog.templates.find((template) => template.id === currentId)
          const choice = bindingChoices[type.code] ?? ''
          const chosen = publishableTemplates.find((template) => template.id === Number(choice))
          return <div key={type.code} className="card p-5"><div className="flex justify-between gap-3 items-start"><h3 className="font-bold text-gray-800">{type.nameAr}</h3>{current?.isActive && current.publishedRevision ? <CheckCircle2 size={18} className="text-green-600" /> : <span className="text-[10px] text-amber-700 bg-amber-50 rounded-full px-2 py-1">يحتاج ربطًا</span>}</div><p className="text-xs text-gray-500 mt-2 mb-4">{current ? `الحالي: ${current.name}${current.publishedRevision ? ` • نسخة ${current.publishedRevision.revision}` : ' • غير منشور'}${!current.isActive ? ' • متوقف' : ''}` : 'لا يوجد قالب مرتبط حاليًا'}</p><label htmlFor={`binding-${type.code}`} className="sr-only">القالب الخاص بـ{type.nameAr}</label><select id={`binding-${type.code}`} disabled={!!operation} value={choice} onChange={(event) => setBindingChoices((previous) => ({ ...previous, [type.code]: event.target.value }))} className="input w-full text-sm"><option value="">اختر قالبًا منشورًا</option>{current && !publishableTemplates.some((template) => template.id === current.id) && <option value={current.id} disabled>{current.name} — غير متاح للإصدار</option>}{publishableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} — نسخة {template.publishedRevision!.revision}</option>)}</select><div className="flex flex-wrap gap-3 justify-between items-center mt-4"><span className="text-xs text-gray-400">{chosen?.publishedRevision ? `آخر نشر: ${formatDate(chosen.publishedRevision.publishedAt)}` : 'انشر قالبًا أولًا ليظهر في القائمة.'}</span><button type="button" disabled={!!operation || !chosen || Number(choice) === currentId} onClick={() => void saveBinding(type.code)} className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-40"><Check size={14} />حفظ الربط</button></div></div>
        })}</div>{catalog.requestTypes.length === 0 && <div className="card p-10 text-center text-gray-500">لا توجد أنواع خطابات متاحة للربط.</div>}</section>
      )}
      {pendingNavigation && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="discard-title"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 id="discard-title" className="text-lg font-bold text-gray-900">توجد تعديلات غير محفوظة</h2><p className="text-sm text-gray-500 mt-3 leading-6">يمكنك العودة لحفظها، أو تجاهلها ومتابعة فتح القالب المطلوب.</p><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setPendingNavigation(null)} className="btn-secondary">العودة للتحرير</button><button type="button" onClick={() => applyNavigation(pendingNavigation)} className="btn-primary">تجاهل التعديلات والمتابعة</button></div></div></div>}
      {publishConfirmation && selected && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="publish-title"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><div className="w-12 h-12 bg-primary-50 text-primary-700 rounded-2xl flex items-center justify-center mb-4"><Send size={23} /></div><h2 id="publish-title" className="text-lg font-bold text-gray-900">نشر نسخة جديدة من «{selected.name}»</h2><p className="text-sm text-gray-500 mt-3 leading-6">ستصبح المسودة المحفوظة نسخة منشورة متاحة للخطابات الجديدة. الخطابات الصادرة سابقًا تبقى بنصها الأصلي.</p><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setPublishConfirmation(false)} className="btn-secondary">مراجعة النص</button><button type="button" onClick={() => void publish()} className="btn-primary">تأكيد النشر</button></div></div></div>}
      {pdfUrl && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pdf-title"><div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden"><div className="flex items-center justify-between gap-3 p-4 border-b"><div><h2 id="pdf-title" className="font-bold text-gray-900">معاينة PDF — {previewName}</h2><p className="text-xs text-amber-700 mt-1">بيانات توضيحية؛ لم يُصدر خطاب لموظف.</p></div><div className="flex items-center gap-3"><a href={pdfUrl} download="letter-template-preview.pdf" className="btn-secondary text-xs flex gap-1.5 items-center"><Download size={15} />تحميل المعاينة</a><button type="button" onClick={() => setPdfUrl(null)} aria-label="إغلاق معاينة PDF" className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button></div></div><PdfPreview url={pdfUrl} /><div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">إن لم تظهر المعاينة، <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary-700">افتح ملف PDF في نافذة مستقلة</a>.</div></div></div>}
    </div>
  )
}

export default function DocumentTemplatesPage() {
  return <MainLayout><TemplatesWorkspace /></MainLayout>
}
