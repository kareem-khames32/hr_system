'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Copy, Download, Eye, FileSignature, FileText, Loader2, Plus, RefreshCw, Save, Search, Send, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import PdfPreview from '@/components/PdfPreview'
import { ApiError, can } from '@/lib/api'
import {
  createHrDocumentTemplate, fetchHrDocumentTemplateCatalog, HR_DOCUMENT_CATEGORY_LABELS,
  previewHrDocumentTemplate, publishHrDocumentTemplate, updateHrDocumentTemplate,
  type HrDocumentCatalog, type HrDocumentCategory, type HrDocumentContent,
  type HrDocumentCustomField, type HrDocumentTemplate, type HrDocumentVariable,
} from '@/lib/hr-documents'
import { EMPTY_HR_DOCUMENT, HR_DOCUMENT_FIELDS, HR_DOCUMENT_STARTERS, hrDocumentEditorIssues, hrEditorVariables, hrVariableKey, transformHrDocument } from '@/lib/hr-document-template-editor'

type Editor = { name: string; category: HrDocumentCategory; draft: HrDocumentContent; customFields: HrDocumentCustomField[] }
type Operation = 'load' | 'save' | 'publish' | 'preview' | 'active' | null
type Navigation = { kind: 'template'; id: number } | { kind: 'new' } | { kind: 'reload' } | { kind: 'starter'; index: number }
const emptyEditor = (): Editor => ({ name: '', category: 'general', draft: { ...EMPTY_HR_DOCUMENT }, customFields: [] })
const sameFields = (left: HrDocumentCustomField[], right: HrDocumentCustomField[]) => JSON.stringify(left.map(({ key, label, required }) => [key, label, required])) === JSON.stringify(right.map(({ key, label, required }) => [key, label, required]))

function TemplatesWorkspace() {
  const [catalog, setCatalog] = useState<HrDocumentCatalog | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editor, setEditor] = useState<Editor>(emptyEditor)
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState<Operation>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<Navigation | null>(null)
  const [publishConfirmation, setPublishConfirmation] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const busy = useRef(false)
  const inputRefs = useRef<Partial<Record<keyof HrDocumentContent, HTMLTextAreaElement>>>({})
  const cursor = useRef<{ field: keyof HrDocumentContent; start: number; end: number }>({ field: 'body', start: 0, end: 0 })
  const builtins = catalog?.variables ?? []
  const variables = hrEditorVariables(builtins, editor.customFields)
  const selected = catalog?.templates.find(template => template.id === selectedId)
  const canonicalDraft = transformHrDocument(editor.draft, variables, 'canonical')
  const isDirty = selected
    ? editor.name.trim() !== selected.name || editor.category !== selected.category || !sameFields(editor.customFields, selected.customFields) || HR_DOCUMENT_FIELDS.some(({ key }) => canonicalDraft[key] !== selected.draft[key])
    : !!editor.name || editor.category !== 'general' || !!editor.customFields.length || Object.values(editor.draft).some(Boolean)
  const issues = hrDocumentEditorIssues(editor.draft, builtins, editor.customFields)
  const valid = !!editor.name.trim() && editor.name.trim().length <= 150 && issues.length === 0
  const sample = transformHrDocument(editor.draft, variables, 'sample')
  const visibleTemplates = catalog?.templates.filter(template => template.name.includes(search) || template.draft.title.includes(search)) ?? []
  const published = selected?.publishedRevision
  const unpublishedChanges = !published || selected?.name !== published.name || selected.category !== published.category || !sameFields(selected.customFields, published.customFields) || HR_DOCUMENT_FIELDS.some(({ key }) => selected.draft[key] !== published.content[key])

  const adopt = (template: HrDocumentTemplate, vars: HrDocumentVariable[]) => {
    setSelectedId(template.id)
    setEditor({ name: template.name, category: template.category, draft: transformHrDocument(template.draft, hrEditorVariables(vars, template.customFields), 'readable'), customFields: template.customFields.map(field => ({ ...field })) })
    setConflict(false)
    cursor.current = { field: 'body', start: 0, end: 0 }
  }
  const load = useCallback(async (preferredId?: number | null) => {
    const result = await fetchHrDocumentTemplateCatalog()
    setCatalog(result)
    const template = result.templates.find(item => item.id === preferredId) ?? result.templates[0]
    if (template) adopt(template, result.variables)
    else { setSelectedId(null); setEditor(emptyEditor()) }
  }, [])
  useEffect(() => {
    let active = true
    load().catch(err => { if (active) setError(err instanceof Error ? err.message : 'تعذر تحميل القوالب') }).finally(() => { if (active) setOperation(null) })
    return () => { active = false }
  }, [load])
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  const perform = async (kind: Exclude<Operation, null>, action: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true; setOperation(kind); setError(''); setNotice('')
    try { await action() }
    catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إتمام العملية')
      if (err instanceof ApiError && err.status === 409) setConflict(true)
    } finally { busy.current = false; setOperation(null) }
  }
  const accept = (template: HrDocumentTemplate) => {
    setCatalog(previous => previous ? { ...previous, templates: previous.templates.some(item => item.id === template.id) ? previous.templates.map(item => item.id === template.id ? template : item) : [...previous.templates, template] } : previous)
    adopt(template, builtins)
  }
  const save = () => perform('save', async () => {
    if (!valid || conflict) return
    const input = { name: editor.name.trim(), category: editor.category, draft: canonicalDraft, customFields: editor.customFields.map(field => ({ ...field, label: field.label.trim() })) }
    accept(selected ? await updateHrDocumentTemplate(selected.id, { ...input, version: selected.version }) : await createHrDocumentTemplate(input))
    setNotice('حُفظت المسودة. انشر النسخة عندما تصبح جاهزة لإصدار المستندات.')
  })
  const publish = () => perform('publish', async () => {
    setPublishConfirmation(false)
    if (!selected || isDirty || conflict) return
    const result = await publishHrDocumentTemplate(selected.id, selected.version)
    accept(result); setNotice(`نُشرت النسخة ${result.publishedRevision?.revision ?? ''} وأصبحت متاحة في صفحة إصدار المستندات.`)
  })
  const toggleActive = () => perform('active', async () => {
    if (!selected || isDirty || conflict) return
    const result = await updateHrDocumentTemplate(selected.id, { version: selected.version, isActive: !selected.isActive })
    accept(result); setNotice(result.isActive ? 'فُعّل القالب.' : 'أُوقف القالب للإصدارات الجديدة. المستندات الصادرة سابقًا تبقى محفوظة.')
  })
  const applyNavigation = (navigation: Navigation) => {
    setPendingNavigation(null); setError(''); setNotice(''); setConflict(false)
    if (navigation.kind === 'new') { setSelectedId(null); setEditor(emptyEditor()) }
    else if (navigation.kind === 'starter') {
      const starter = HR_DOCUMENT_STARTERS[navigation.index]
      if (!starter) return
      setSelectedId(null)
      setEditor({ ...starter, customFields: starter.customFields.map(field => ({ ...field })), draft: transformHrDocument(starter.draft, hrEditorVariables(builtins, starter.customFields), 'readable') })
      setNotice('حُمّلت بداية قابلة للتعديل. راجع النص والحقول ثم احفظ القالب وانشره؛ لم يُحفظ شيء على الخادم بعد.')
    }
    else if (navigation.kind === 'reload') void perform('load', () => load(selectedId))
    else { const template = catalog?.templates.find(item => item.id === navigation.id); if (template) adopt(template, builtins) }
  }
  const navigate = (navigation: Navigation) => { if (operation) return; if (isDirty) setPendingNavigation(navigation); else applyNavigation(navigation) }
  const duplicate = () => {
    if (operation || !selected) return
    setSelectedId(null); setEditor(previous => ({ ...previous, name: `${previous.name} — نسخة` })); setConflict(false); setError('')
    setNotice('هذه نسخة جديدة غير محفوظة. عدّلها ثم احفظ المسودة وانشرها.')
  }
  const insertVariable = (variable: HrDocumentVariable) => {
    const { field, start, end } = cursor.current; const text = editor.draft[field]; const token = `{{${variable.label}}}`
    const position = Math.min(start, text.length); const after = position + token.length
    setEditor(previous => ({ ...previous, draft: { ...previous.draft, [field]: text.slice(0, position) + token + text.slice(Math.max(position, end)) } }))
    cursor.current = { field, start: after, end: after }
    requestAnimationFrame(() => { inputRefs.current[field]?.focus(); inputRefs.current[field]?.setSelectionRange(after, after) })
  }
  const changeCustomField = (index: number, change: Partial<HrDocumentCustomField>) => {
    setEditor(previous => {
      const old = previous.customFields[index]
      const fields = previous.customFields.map((field, i) => i === index ? { ...field, ...change } : field)
      let draft = transformHrDocument(previous.draft, hrEditorVariables(builtins, previous.customFields), 'canonical')
      if (change.key && change.key !== old.key) {
        const rename = (text: string) => text.split(`{{${old.key}}}`).join(`{{${change.key}}}`)
        draft = { title: rename(draft.title), greeting: rename(draft.greeting), body: rename(draft.body), closing: rename(draft.closing), footer: rename(draft.footer) }
      }
      return { ...previous, customFields: fields, draft: transformHrDocument(draft, hrEditorVariables(builtins, fields), 'readable') }
    })
  }
  const removeCustomField = (index: number) => setEditor(previous => {
    const draft = transformHrDocument(previous.draft, hrEditorVariables(builtins, previous.customFields), 'canonical')
    const fields = previous.customFields.filter((_, i) => i !== index)
    return { ...previous, customFields: fields, draft: transformHrDocument(draft, hrEditorVariables(builtins, fields), 'readable') }
  })
  const groups = [
    { name: 'الشركة', prefix: 'company.' }, { name: 'الموظف', prefix: 'employee.' },
    { name: 'العقد', prefix: 'contract.' }, { name: 'الراتب المسجل', prefix: 'salary.' },
    { name: 'حقول إضافية', prefix: 'custom.' }, { name: 'بيانات المستند', prefix: '' },
  ].map(group => ({ ...group, items: variables.filter(variable => group.prefix ? hrVariableKey(variable.key).startsWith(group.prefix) : !['company.', 'employee.', 'contract.', 'salary.', 'custom.'].some(prefix => hrVariableKey(variable.key).startsWith(prefix))) }))

  return <div className="space-y-6 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-3"><div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center"><FileSignature size={25} /></div><div><Link href="/settings" className="text-xs text-gray-500 hover:underline">الإعدادات</Link><h1 className="text-2xl font-bold text-gray-900">قوالب المستندات</h1><p className="text-sm text-gray-500 mt-1">جهّز العقود والإقرارات والشهادات ومستندات الموارد البشرية.</p></div></div>
      <div className="flex flex-wrap gap-2">{can('documents.manage') && <Link href="/employees/documents/create" className="btn-secondary">إصدار مستند</Link>}<button type="button" disabled={!!operation} onClick={() => navigate({ kind: 'reload' })} className="btn-secondary flex gap-2 items-center"><RefreshCw size={16} />تحديث</button><button type="button" disabled={!!operation || !catalog} onClick={() => navigate({ kind: 'new' })} className="btn-primary flex gap-2 items-center"><Plus size={16} />قالب جديد</button></div>
    </div>
    <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5 text-sm text-gray-700 leading-7"><p className="font-semibold">اكتب النص ← أضف المتغيرات ← احفظ المسودة وانشرها ← أصدر PDF محفوظًا</p><p>يمكنك لصق نص الشركة هنا وإدراج البيانات المتغيرة. المحرر لا يستورد ملفات Word أو PDF ولا يحفظ تنسيقها الأصلي. الإصدار يستخدم بيانات الشركة الحالية والقالب المنشور.</p><Link href="/settings/letter-templates" className="text-primary-700 underline">قوالب الخطابات الصادرة بعد اعتماد الطلبات</Link></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">{error}{!catalog && <button type="button" disabled={!!operation} onClick={() => void perform('load', () => load())} className="block underline mt-2">إعادة المحاولة</button>}</div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 size={18} className="shrink-0" /><p className="flex-1">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="إخفاء الرسالة"><X size={16} /></button></div>}
    {conflict && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">يوجد تعارض مع نسخة القالب على الخادم</p><p className="mt-1">احتفظنا بتعديلاتك. يمكنك إنشاء نسخة جديدة منها، أو نسخ النص ثم تحميل أحدث نسخة محفوظة.</p><div className="flex gap-4 mt-3"><button type="button" disabled={!!operation} onClick={duplicate} className="underline">إنشاء قالب جديد من تعديلاتي</button><button type="button" disabled={!!operation} onClick={() => navigate({ kind: 'reload' })} className="underline">تحميل آخر نسخة</button></div></div>}
    {!catalog && operation === 'load' && <div className="card py-20 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-3" />جارٍ تحميل القوالب...</div>}
    {catalog && <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
      <aside className="card p-3 space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">القوالب</h2><span className="text-xs text-gray-500">{catalog.templates.length}</span></div><div className="relative"><Search size={15} className="absolute top-3 right-3 text-gray-400" /><input aria-label="البحث عن قالب" value={search} onChange={event => setSearch(event.target.value)} className="input pr-9 w-full text-sm" placeholder="بحث عن قالب..." /></div><div className="grid sm:grid-cols-2 xl:grid-cols-1 gap-2">{visibleTemplates.map(template => <button type="button" key={template.id} disabled={!!operation} onClick={() => navigate({ kind: 'template', id: template.id })} className={`text-right p-3 rounded-xl border ${template.id === selectedId ? 'bg-primary-50 border-primary-300' : 'border-transparent hover:bg-gray-50'}`}><p className="font-semibold text-sm text-gray-800">{template.name}</p><p className="text-xs text-gray-500 mt-1">{HR_DOCUMENT_CATEGORY_LABELS[template.category]}</p><span className={`inline-block mt-2 text-[10px] rounded-full px-2 py-1 ${!template.isActive ? 'bg-gray-200 text-gray-600' : template.publishedRevision ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{!template.isActive ? 'متوقف' : template.publishedRevision ? `منشور • نسخة ${template.publishedRevision.revision}` : 'مسودة'}</span></button>)}</div>{!visibleTemplates.length && <p className="text-center text-xs text-gray-500 p-4">{search ? 'لا توجد قوالب مطابقة' : 'ابدأ بإضافة أول قالب'}</p>}</aside>
      <div className="space-y-5 min-w-0">
        {!selected && <section className="rounded-2xl border border-primary-100 bg-white p-5 space-y-3"><h2 className="font-bold text-sm">ابدأ من نموذج جاهز</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{HR_DOCUMENT_STARTERS.map((starter, index) => <button type="button" key={starter.category} disabled={!!operation} onClick={() => navigate({ kind: 'starter', index })} className="rounded-xl border border-gray-200 p-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">{starter.name}</button>)}</div><p className="text-xs text-gray-500 leading-6">البدايات نصوص قابلة للتحرير. في عقد العمل تُكتب بنود شركتك في حقل «بنود العقد» المطلوب؛ لا تُضاف شروط قانونية تلقائيًا. النموذج العام يصلح للإصدار دون موظف.</p></section>}
        <section className="card p-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{selected ? 'تحرير المسودة' : 'قالب جديد'} {isDirty && <span className="mr-2 text-xs font-normal text-amber-700">غير محفوظ</span>}</h2><p className="text-xs text-gray-500 mt-1">المسودة لا تغيّر النسخة المنشورة أو المستندات التي صدرت سابقًا.</p></div><div className="flex gap-2">{selected && <button type="button" disabled={!!operation} onClick={duplicate} className="btn-secondary text-xs flex gap-2 items-center"><Copy size={15} />نسخة جديدة</button>}<button type="button" disabled={!!operation || !valid || !isDirty || conflict} onClick={() => void save()} className="btn-primary text-xs flex gap-2 items-center disabled:opacity-40">{operation === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}حفظ المسودة</button></div></div>
          <div className="grid md:grid-cols-2 gap-4"><label className="text-sm font-medium">اسم القالب<input value={editor.name} maxLength={150} disabled={!!operation} onChange={event => setEditor(previous => ({ ...previous, name: event.target.value }))} className="input w-full mt-2" placeholder="مثل: إقرار استلام أدوات العمل" /></label><label className="text-sm font-medium">الفئة<select value={editor.category} disabled={!!operation} onChange={event => setEditor(previous => ({ ...previous, category: event.target.value as HrDocumentCategory }))} className="input w-full mt-2">{Object.entries(HR_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        </section>
        <section className="card p-5 space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">الحقول الإضافية</h2><p className="text-xs text-gray-500 mt-1">قيم يدخلها مسؤول المستند عند الإصدار، مثل رقم الإقرار أو اسم الجهة.</p></div><button type="button" disabled={!!operation || editor.customFields.length >= 20} onClick={() => setEditor(previous => { let number = previous.customFields.length + 1; while (previous.customFields.some(field => field.key === `custom.field_${number}`)) number++; return { ...previous, customFields: [...previous.customFields, { key: `custom.field_${number}`, label: `حقل ${number}`, required: false }] } })} className="btn-secondary text-xs flex items-center gap-2"><Plus size={15} />إضافة حقل ({editor.customFields.length}/20)</button></div>
          {editor.customFields.map((field, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end rounded-xl bg-gray-50 p-3"><label className="text-xs text-gray-600">اسم الحقل<input value={field.label} maxLength={100} disabled={!!operation} onChange={event => changeCustomField(index, { label: event.target.value })} className="input w-full mt-1" /></label><label className="text-xs text-gray-600">رمز الحقل (حروف إنجليزية)<div dir="ltr" className="flex items-center gap-1 mt-1"><span className="text-gray-400">custom.</span><input value={field.key.replace(/^custom\./, '')} maxLength={50} disabled={!!operation} onChange={event => changeCustomField(index, { key: `custom.${event.target.value}` })} className="input w-full" /></div></label><label className="flex items-center gap-2 text-xs pb-3"><input type="checkbox" checked={field.required} disabled={!!operation} onChange={event => changeCustomField(index, { required: event.target.checked })} />مطلوب</label><button type="button" aria-label={`حذف ${field.label}`} disabled={!!operation} onClick={() => removeCustomField(index)} className="text-red-600 p-3 hover:bg-red-50 rounded-lg"><Trash2 size={17} /></button></div>)}
          {!editor.customFields.length && <p className="text-xs text-gray-400">لا توجد حقول إضافية. يمكنك استخدام بيانات الشركة والموظف من المتغيرات أدناه.</p>}
        </section>
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_250px] gap-5 items-start">
          <section className="card p-5 space-y-5"><h2 className="font-bold">نص القالب</h2>{HR_DOCUMENT_FIELDS.map(field => <label key={field.key} className="block"><span className="text-sm font-medium">{field.label}</span><textarea ref={element => { if (element) inputRefs.current[field.key] = element }} value={editor.draft[field.key]} rows={field.rows} disabled={!!operation} onChange={event => setEditor(previous => ({ ...previous, draft: { ...previous.draft, [field.key]: event.target.value } }))} onSelect={event => { cursor.current = { field: field.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd } }} onFocus={event => { cursor.current = { field: field.key, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd } }} className="input w-full mt-2 leading-7 resize-y" /><span className={`text-[10px] ${canonicalDraft[field.key].length > field.limit ? 'text-red-600' : 'text-gray-400'}`}>{canonicalDraft[field.key].length} / {field.limit} حرف</span></label>)}{isDirty && issues.length > 0 && <div role="status" className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800"><ul className="list-disc mr-4 space-y-1">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</section>
          <div className="space-y-4"><section className="card p-4 space-y-4"><div><h2 className="font-bold text-sm">إدراج بيانات متغيرة</h2><p className="text-xs text-gray-500 mt-1 leading-5">ضع المؤشر داخل النص، ثم اضغط اسم البيانات لإدراجها.</p></div>{groups.filter(group => group.items.length).map(group => <div key={group.name}><h3 className="text-xs font-semibold text-gray-500 mb-2">{group.name}</h3><div className="flex flex-wrap gap-1.5">{group.items.map(variable => <button type="button" key={variable.key} disabled={!!operation} onClick={() => insertVariable(variable)} className="text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg px-2 py-1.5">{variable.label}</button>)}</div></div>)}</section>
            <section className="card p-4 space-y-3"><h2 className="font-bold text-sm">النشر والإتاحة</h2>{published ? <p className="text-xs text-green-700">النسخة المنشورة {published.revision} • {new Date(published.publishedAt).toLocaleDateString('ar-EG-u-ca-gregory')}</p> : <p className="text-xs text-gray-500">لا توجد نسخة منشورة بعد.</p>}<button type="button" disabled={!!operation || !selected || !selected.isActive || isDirty || !valid || !unpublishedChanges || conflict} onClick={() => setPublishConfirmation(true)} className="btn-primary w-full text-sm flex justify-center items-center gap-2 disabled:opacity-40"><Send size={15} />نشر المسودة</button><p className="text-xs text-gray-500 leading-5">{isDirty ? 'احفظ التعديلات أولًا قبل النشر.' : !unpublishedChanges ? 'المسودة مطابقة للنسخة المنشورة.' : 'تستخدم الإصدارات الجديدة هذه النسخة بعد نشرها.'}</p>{selected && <button type="button" disabled={!!operation || isDirty || conflict} onClick={() => void toggleActive()} className="flex items-center gap-2 text-xs text-gray-600 disabled:opacity-40">{selected.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}{selected.isActive ? 'إيقاف القالب' : 'تفعيل القالب'}</button>}</section>
          </div>
        </div>
        <section className="card overflow-hidden"><div className="p-4 border-b flex flex-wrap justify-between items-center gap-3"><div><h2 className="font-bold flex items-center gap-2"><Eye size={18} />معاينة النص</h2><p className="text-xs text-amber-700 mt-1">بيانات توضيحية فقط؛ لا يُصدر مستند عند المعاينة.</p></div><button type="button" disabled={!!operation || issues.length > 0} onClick={() => void perform('preview', async () => setPdfUrl(URL.createObjectURL(await previewHrDocumentTemplate(canonicalDraft, editor.customFields))))} className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">{operation === 'preview' ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}معاينة PDF</button></div><div className="p-6 md:p-10 bg-white space-y-6 text-sm leading-8 break-words"><h3 className="text-lg font-bold text-center whitespace-pre-wrap">{sample.title || 'عنوان المستند'}</h3><p className="whitespace-pre-wrap">{sample.greeting}</p><p className="whitespace-pre-wrap">{sample.body || 'اكتب النص لتظهر معاينته هنا...'}</p><p className="whitespace-pre-wrap">{sample.closing}</p><p className="whitespace-pre-wrap border-t pt-4 text-xs text-gray-500">{sample.footer}</p></div></section>
      </div>
    </div>}
    {pendingNavigation && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="discard-title"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 id="discard-title" className="text-lg font-bold">توجد تعديلات غير محفوظة</h2><p className="text-sm text-gray-500 mt-3">احفظ تعديلاتك أولًا أو تجاهلها للمتابعة.</p><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setPendingNavigation(null)} className="btn-secondary">العودة للتحرير</button><button type="button" onClick={() => applyNavigation(pendingNavigation)} className="btn-primary">تجاهل التعديلات والمتابعة</button></div></div></div>}
    {publishConfirmation && selected && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="publish-title"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 id="publish-title" className="text-lg font-bold">نشر نسخة جديدة من «{selected.name}»</h2><p className="text-sm text-gray-500 mt-3 leading-6">ستتاح النسخة للإصدار. المستندات الصادرة سابقًا تحتفظ بنصها وملفات PDF الأصلية.</p><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setPublishConfirmation(false)} className="btn-secondary">مراجعة النص</button><button type="button" onClick={() => void publish()} className="btn-primary">تأكيد النشر</button></div></div></div>}
    {pdfUrl && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pdf-title"><div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden"><div className="flex items-center justify-between gap-3 p-4 border-b"><div><h2 id="pdf-title" className="font-bold">معاينة PDF</h2><p className="text-xs text-amber-700 mt-1">بيانات توضيحية؛ هذه المعاينة غير صادرة.</p></div><div className="flex items-center gap-3"><a href={pdfUrl} download="hr-document-template-preview.pdf" className="btn-secondary text-xs flex gap-2 items-center"><Download size={15} />تحميل المعاينة</a><button type="button" onClick={() => setPdfUrl(null)} aria-label="إغلاق المعاينة" className="p-2"><X size={20} /></button></div></div><PdfPreview url={pdfUrl} /></div></div>}
  </div>
}

export default function DocumentTemplatesPage() { return <MainLayout><TemplatesWorkspace /></MainLayout> }
