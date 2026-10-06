'use client'

// B2.7-أ: مكتبة السياسات — سياسات الشركة بنسخها وجمهورها وإلزامها ومهلتها. لصاحب «إدارة السياسات» ونطاقه كل الفروع؛ حساب الفرع بيشوف بس.
// المحتوى مابيتعدلش بعد النشر: التعديل نسخة جديدة. والموظف بيقرّ بالنسخة السارية من شاشة الدخول أو من «سياساتي».
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Eye, Pencil, Plus, ScrollText, Send, Undo2, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { CompanyWideReadOnlyNote } from '@/components/CompanyWideReadOnly'
import EmptyState from '@/components/EmptyState'
import PdfPreview from '@/components/PdfPreview'
import PolicyReader from '@/components/policies/PolicyReader'
import { fetchBranches, fetchRolesFull, type ApiBranch, type ApiRole } from '@/lib/api'
import { formatDate, localToday } from '@/lib/dates'
import {
  createPolicy, fetchPolicies, POLICY_BODY_MAX, POLICY_GRACE_MAX, POLICY_STATUS_LABELS, policyGraceText, publishPolicyVersion, updatePolicy, uploadPolicyFile, withdrawPolicy,
  type ApiPolicies, type ApiPolicy, type PolicyAudience, type PolicyStatus,
} from '@/lib/policies-api'

// «حسب المنصب»: المنصب من الهيكل نفسه، مش من الدور (نفس اختيارات جمهور الموديولات)
const POSITIONS: Array<[string, string]> = [['DEPARTMENT_MANAGERS', 'مديرو الأقسام'], ['TEAM_LEADERS', 'قادة الفرق'], ['BRANCH_MANAGERS', 'مديرو الفروع']]
type WhoMode = 'all' | 'roles' | 'positions'
const STATUS_STYLES: Record<PolicyStatus, string> = { DRAFT: 'bg-gray-100 text-gray-600', PUBLISHED: 'bg-green-50 text-green-700', WITHDRAWN: 'bg-red-50 text-red-700' }
const errorText = (error: unknown) => (error instanceof Error ? error.message : 'حصل خطأ، جرّب تاني')
const pick = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value])

function Modal({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/40 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

type PolicyForm = { id: number | null; published: boolean; title: string; category: string; isMandatory: boolean; graceDays: string; who: WhoMode; whoIds: string[]; whereBranches: number[] }
// fileUrl: رابط محلي للملف المختار لمعاينته قبل النشر. fileShown: المعاينة اتعرضت فعلًا (ملف مابيتعرضش في المتصفح مابيتنشرش من هنا)
type VersionForm = { policy: ApiPolicy; kind: 'TEXT' | 'FILE'; bodyText: string; file: File | null; fileUrl: string | null; fileShown: 'loading' | 'rendered' | 'failed';
  effectiveDate: string; isMaterial: boolean }

export default function PoliciesPage() {
  const [data, setData] = useState<ApiPolicies | null>(null)
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState<PolicyForm | null>(null)
  const [version, setVersion] = useState<VersionForm | null>(null)
  const [withdrawing, setWithdrawing] = useState<ApiPolicy | null>(null)
  const [preview, setPreview] = useState<ApiPolicy | null>(null)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setError('')
    fetchPolicies().then(setData).catch(cause => setError(errorText(cause)))
  }, [])
  useEffect(() => {
    load()
    // الأدوار والفروع لمحرر الجمهور بس — تعذّرهم مايوقفش الشاشة
    fetchRolesFull().then(rows => setRoles(rows.filter(role => role.isActive && role.code !== 'super_admin'))).catch(() => setRoles([]))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [load])

  const audienceText = (audience: PolicyAudience | null) => {
    if (!audience) return 'كل الموظفين'
    const ids = (audience.ids ?? []).map(String)
    const label = (id: string) => roles.find(role => role.code === id)?.nameAr ?? POSITIONS.find(([key]) => key === id)?.[1] ?? id
    const who = audience.mode === 'roles' || audience.mode === 'positions' ? ids.map(label).join('، ')
      : audience.mode === 'employees' ? `${ids.length} موظف بعينه` : audience.mode === 'departments' ? `${ids.length} قسم` : 'الكل'
    const whereIds = (audience.where?.ids ?? []).map(Number)
    const where = !whereIds.length ? '' : audience.where?.mode === 'branches'
      ? ` في ${whereIds.map(id => branches.find(branch => branch.id === id)?.name ?? `فرع #${id}`).join('، ')}`
      : audience.where?.mode === 'departments' ? ` في ${whereIds.length} قسم` : ` في ${whereIds.length} فريق`
    return `${who}${where}`
  }

  const openForm = (policy: ApiPolicy | null) => {
    const audience = policy?.audience ?? null
    const who: WhoMode = audience?.mode === 'roles' || audience?.mode === 'positions' ? audience.mode : 'all'
    setModalError('')
    setForm({ id: policy?.id ?? null, published: !!policy && policy.status !== 'DRAFT', title: policy?.title ?? '', category: policy?.category ?? '', isMandatory: policy?.isMandatory ?? true, graceDays: String(policy?.graceDays ?? 7),
      who, whoIds: who === 'all' ? [] : (audience?.ids ?? []).map(String), whereBranches: audience?.where?.mode === 'branches' ? (audience.where.ids ?? []).map(Number) : [] })
  }
  // سياسة جمهورها متسجّل بشكل الشاشة دي مابتعرضوش (موظفين بعينهم، أقسام، فرق): التعديل مايلمسش الجمهور غير لو المدير غيّره
  const audienceEditable = (policy: ApiPolicy | undefined) => {
    const audience = policy?.audience
    return !audience || ((audience.mode === 'all' || audience.mode === 'roles' || audience.mode === 'positions') && (!audience.where || audience.where.mode === 'branches'))
  }

  const savePolicy = async () => {
    if (!form || saving) return
    const title = form.title.trim(), grace = Number(form.graceDays)
    if (title.length < 2) { setModalError('اكتب عنوان السياسة'); return }
    if (!Number.isInteger(grace) || grace < 0 || grace > POLICY_GRACE_MAX) { setModalError(`مهلة السماح من صفر لـ${POLICY_GRACE_MAX} يوم`); return }
    if (form.who !== 'all' && form.whoIds.length === 0) { setModalError('اختار مين السياسة عليهم، أو خلّيها «الكل»'); return }
    const existing = data?.policies.find(policy => policy.id === form.id)
    const audience: PolicyAudience | null = form.who === 'all' && form.whereBranches.length === 0 ? null
      : { mode: form.who, ids: form.who === 'all' ? [] : form.whoIds, where: form.whereBranches.length ? { mode: 'branches', ids: form.whereBranches } : null }
    // العنوان والفئة مابيتبعتوش لسياسة منشورة: الخادم مابيغيّرهمش بعد النشر
    const input = { ...(form.published ? {} : { title, category: form.category.trim() || null }), isMandatory: form.isMandatory, graceDays: grace, ...(audienceEditable(existing) ? { audience } : {}) }
    setSaving(true); setModalError('')
    try {
      if (form.id == null) await createPolicy(input); else await updatePolicy(form.id, input)
      setForm(null); load()
    } catch (cause) { setModalError(errorText(cause)) } finally { setSaving(false) }
  }

  // تعديل خانة في حوار النشر على آخر حالة (نتيجة المعاينة بتيجي من العارض في أي لحظة، فمفيش تعديل يكتب فوقها بحالة أقدم)
  const patchVersion = (patch: Partial<VersionForm>) => setVersion(current => (current ? { ...current, ...patch } : current))
  // الملف المختار للنشر: رابط محلي لمعاينته، والرابط القديم بيتلغي
  const chooseFile = (file: File | null) => {
    if (!version) return
    if (version.fileUrl) URL.revokeObjectURL(version.fileUrl)
    patchVersion({ file, fileUrl: file ? URL.createObjectURL(file) : null, fileShown: 'loading' })
  }
  // والنشر شغال الحوار مابيتقفلش: القفل مابيوقفش نشر اتبعت، والنشر تاني كان هيطلّع نسخة تانية
  const closeVersion = () => {
    if (saving) return
    if (version?.fileUrl) URL.revokeObjectURL(version.fileUrl)
    setVersion(null)
  }

  const publish = async () => {
    if (!version || saving) return
    if (version.kind === 'TEXT' && !version.bodyText.trim()) { setModalError('اكتب نص السياسة'); return }
    if (version.kind === 'TEXT' && version.bodyText.length > POLICY_BODY_MAX) { setModalError(`النص أطول من ${POLICY_BODY_MAX} حرف — ارفعه ملف PDF`); return }
    if (version.kind === 'FILE' && !version.file) { setModalError('اختار ملف PDF'); return }
    if (version.kind === 'FILE' && version.fileShown !== 'rendered') { setModalError('استنى معاينة الملف تظهر قبل النشر'); return }
    if (!version.effectiveDate) { setModalError('اختار تاريخ السريان'); return }
    setSaving(true); setModalError('')
    try {
      const fileId = version.kind === 'FILE' ? (await uploadPolicyFile(version.file!)).id : null
      await publishPolicyVersion(version.policy.id, { bodyText: version.kind === 'TEXT' ? version.bodyText : null, fileId, effectiveDate: version.effectiveDate, isMaterial: version.isMaterial })
      if (version.fileUrl) URL.revokeObjectURL(version.fileUrl)
      setVersion(null); load()
    } catch (cause) { setModalError(errorText(cause)) } finally { setSaving(false) }
  }

  const withdraw = async () => {
    if (!withdrawing || saving) return
    setSaving(true); setModalError('')
    try { await withdrawPolicy(withdrawing.id); setWithdrawing(null); load() } catch (cause) { setModalError(errorText(cause)) } finally { setSaving(false) }
  }

  const canManage = data?.available === true && data.canManage
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ScrollText size={24} className="text-primary-600" />مكتبة السياسات</h1>
            <p className="text-gray-500 mt-1">لوائح الشركة بنسخها، ومين عليه يقراها ويوافق، ومهلة الإقرار</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/policies/reports" className="btn-secondary flex items-center gap-2"><ClipboardCheck size={18} />تقرير الإقرارات</Link>
            {canManage && <button type="button" onClick={() => openForm(null)} className="btn-primary flex items-center gap-2" data-policy-new><Plus size={18} />سياسة جديدة</button>}
          </div>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {data && !data.available && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-policies-unavailable>مكتبة السياسات لسه مش متاحة: محتاجة ترحيل قاعدة البيانات 20261005_091.</div>}
        {data?.available && !data.canManage && <CompanyWideReadOnlyNote />}
        {data?.available && data.policies.length === 0 && <EmptyState title="مفيش سياسات لسه" icon={ScrollText} />}
        {data?.available && data.policies.length > 0 && (
          <div className="space-y-3" data-policies-list>
            {data.policies.map(policy => (
              <div key={policy.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-800 break-words">{policy.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {policy.category ? `${policy.category} · ` : ''}
                      {policy.isMandatory ? `إلزامية · ${policyGraceText(policy.graceDays)}` : 'غير إلزامية'}
                      {data.canManage ? ` · على: ${audienceText(policy.audience)}` : ''}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${STATUS_STYLES[policy.status]}`}>{POLICY_STATUS_LABELS[policy.status]}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {policy.current
                    ? `النسخة السارية: ${policy.current.versionNo} (${policy.current.kind === 'FILE' ? 'ملف PDF' : 'نص'}) من ${formatDate(policy.current.effectiveDate)}`
                    : policy.status === 'DRAFT' ? 'لسه من غير نسخة منشورة — الموظفين مش شايفينها' : 'مفيش نسخة سارية دلوقتي'}
                  {policy.upcoming && ` · نسخة ${policy.upcoming.versionNo} هتسري من ${formatDate(policy.upcoming.effectiveDate)}${policy.upcoming.isMaterial ? ' (تغيير جوهري: الكل يقرّ من جديد)' : ''}`}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {policy.current && <button type="button" onClick={() => setPreview(policy)} className="btn-secondary flex items-center gap-1"><Eye size={16} />معاينة</button>}
                  {policy.status !== 'DRAFT' && <Link href={`/policies/reports?id=${policy.id}`} className="btn-secondary flex items-center gap-1"><ClipboardCheck size={16} />مين أقرّ</Link>}
                  {canManage && policy.status !== 'WITHDRAWN' && (
                    <>
                      <button type="button" onClick={() => openForm(policy)} className="btn-secondary flex items-center gap-1"><Pencil size={16} />تعديل البيانات</button>
                      <button type="button" onClick={() => { setModalError(''); setVersion({ policy, kind: 'TEXT', bodyText: '', file: null, fileUrl: null, fileShown: 'loading', effectiveDate: localToday(), isMaterial: policy.versions === 0 }) }}
                        className="btn-primary flex items-center gap-1" data-policy-publish><Send size={16} />{policy.versions === 0 ? 'نشر أول نسخة' : 'نشر نسخة جديدة'}</button>
                      <button type="button" onClick={() => { setModalError(''); setWithdrawing(policy) }} className="text-red-600 hover:underline flex items-center gap-1"><Undo2 size={16} />سحب</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <Modal title={form.id == null ? 'سياسة جديدة' : 'تعديل بيانات السياسة'} onClose={() => setForm(null)}>
          <p className="text-sm text-gray-500">دي بيانات السياسة. محتواها بيتكتب وقت نشر النسخة، ومابيتعدلش بعدها.</p>
          {modalError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{modalError}</div>}
          <label className="block text-sm text-gray-700">العنوان
            <input className="input mt-1 w-full disabled:bg-gray-100 disabled:text-gray-500" value={form.title} maxLength={200} disabled={form.published}
              onChange={event => setForm({ ...form, title: event.target.value })} />
            {form.published && <span className="block text-xs text-gray-500 mt-1">العنوان والفئة مابيتغيّروش بعد النشر: الموظفين أقرّوا بالسياسة بيهم</span>}
          </label>
          <label className="block text-sm text-gray-700">الفئة (اختياري)
            <input className="input mt-1 w-full disabled:bg-gray-100 disabled:text-gray-500" value={form.category} maxLength={100} placeholder="لائحة داخلية، أمن المعلومات…" disabled={form.published}
              onChange={event => setForm({ ...form, category: event.target.value })} />
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={form.isMandatory} onChange={event => setForm({ ...form, isMandatory: event.target.checked })} />
            <span>إلزامية: بتظهر للموظف عند الدخول، وبعد مهلة السماح النظام مابيفتحش معاه غير لما يقرّ</span>
          </label>
          {form.isMandatory && (
            <label className="block text-sm text-gray-700">مهلة السماح بالأيام (صفر = من غير مهلة)
              <input type="number" min={0} max={POLICY_GRACE_MAX} className="input mt-1 w-32" dir="ltr" value={form.graceDays} onChange={event => setForm({ ...form, graceDays: event.target.value })} />
              <span className="block text-xs text-gray-500 mt-1">بتتحسب من الأبعد: سريان النسخة، أو تعيين الموظف، أو يوم ما السياسة تبقى إلزامية أو جمهورها يتغيّر. تقليل المهلة ممكن يقفل اللي لسه مااقرّش فورًا. واللي يدخل الجمهور بعد كده (نقل أو ترقية) مالوش مهلة جديدة</span>
            </label>
          )}
          {audienceEditable(data?.policies.find(policy => policy.id === form.id)) ? (
            <>
              <div>
                <p className="label">مين عليه السياسة</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {([['all', 'الكل'], ['roles', 'أدوار محددة'], ['positions', 'حسب المنصب']] as Array<[WhoMode, string]>).map(([mode, label]) => (
                    <label key={mode} className="flex items-center gap-2">
                      <input type="radio" name="policyWho" checked={form.who === mode} onChange={() => setForm({ ...form, who: mode, whoIds: [] })} />
                      {label}
                    </label>
                  ))}
                </div>
                {form.who !== 'all' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                    {(form.who === 'roles' ? roles.map(role => [role.code, role.nameAr] as [string, string]) : POSITIONS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input type="checkbox" checked={form.whoIds.includes(key)} onChange={() => setForm({ ...form, whoIds: pick(form.whoIds, key) })} />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="label">فين</p>
                <p className="text-xs text-gray-500 mb-2">من غير اختيار = كل الشركة</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {branches.map(branch => (
                    <label key={branch.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={form.whereBranches.includes(branch.id)} onChange={() => setForm({ ...form, whereBranches: pick(form.whereBranches, branch.id) })} />
                      {branch.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : <p className="text-sm text-gray-500">جمهور السياسة دي متحدد بشكل الشاشة مابتعرضوش، وهيفضل زي ما هو.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setForm(null)} className="btn-secondary">رجوع</button>
            <button type="button" onClick={savePolicy} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>
        </Modal>
      )}

      {version && (
        <Modal title={`نشر نسخة — ${version.policy.title}`} wide onClose={closeVersion}>
          <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">النسخة بعد النشر مابتتعدلش ولا بتتمسح. أي تعديل بعد كده نسخة جديدة.</p>
          {modalError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{modalError}</div>}
          <div className="flex flex-wrap gap-4 text-sm">
            {([['TEXT', 'نص'], ['FILE', 'ملف PDF']] as Array<['TEXT' | 'FILE', string]>).map(([kind, label]) => (
              <label key={kind} className="flex items-center gap-2">
                <input type="radio" name="policyKind" checked={version.kind === kind} onChange={() => patchVersion({ kind })} />
                {label}
              </label>
            ))}
          </div>
          {version.kind === 'TEXT'
            ? <textarea className="input w-full min-h-64 leading-7" value={version.bodyText} maxLength={POLICY_BODY_MAX} placeholder="نص السياسة زي ما الموظف هيقراه"
                onChange={event => patchVersion({ bodyText: event.target.value })} />
            : (
              <>
                <input type="file" accept="application/pdf" className="block text-sm" disabled={saving} onChange={event => chooseFile(event.target.files?.[0] ?? null)} />
                {/* الموظف مابيقرّش غير بعد ما الملف يتعرض قدامه: ملف مابيتعرضش هنا مش هيتعرض عنده */}
                {version.fileUrl && (
                  <div className="rounded-xl border border-gray-200 overflow-hidden" data-policy-publish-preview>
                    <PdfPreview key={version.fileUrl} url={version.fileUrl} subject="السياسة" failureText="الملف ده مابيتعرضش في المتصفح، فالموظفين مش هيقدروا يقرّوا بيه — اختار ملف PDF تاني."
                      onStatus={status => patchVersion({ fileShown: status })} />
                  </div>
                )}
              </>
            )}
          <label className="block text-sm text-gray-700">تسري من
            <input type="date" className="input mt-1 block" min={localToday()} value={version.effectiveDate} onChange={event => patchVersion({ effectiveDate: event.target.value })} />
          </label>
          {version.policy.versions === 0
            ? <p className="text-sm text-gray-500">أول نسخة: كل اللي عليهم السياسة هيقرّوا بيها.</p>
            : (
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input type="checkbox" className="mt-1" checked={version.isMaterial} onChange={event => patchVersion({ isMaterial: event.target.checked })} />
                <span>تغيير جوهري: الكل يقرّ من جديد (من غير العلامة دي، اللي أقرّ بنسخة قبلها إقراره لسه ساري)</span>
              </label>
            )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeVersion} disabled={saving} className="btn-secondary disabled:opacity-50">رجوع</button>
            <button type="button" onClick={publish} disabled={saving || (version.kind === 'FILE' && !!version.file && version.fileShown !== 'rendered')} className="btn-primary disabled:opacity-50">{saving ? 'جارٍ النشر…' : 'نشر'}</button>
          </div>
        </Modal>
      )}

      {withdrawing && (
        <Modal title="سحب السياسة" onClose={() => setWithdrawing(null)}>
          <p className="text-sm text-gray-700">«{withdrawing.title}» مش هتظهر للموظفين ولا هتقفل حد بعد السحب. نسخها وإقراراتها بتفضل محفوظة، والسحب مابيترجعش.</p>
          {modalError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{modalError}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setWithdrawing(null)} className="btn-secondary">رجوع</button>
            <button type="button" onClick={withdraw} disabled={saving} className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50">{saving ? 'جارٍ السحب…' : 'اسحب السياسة'}</button>
          </div>
        </Modal>
      )}

      {preview?.current && (
        <Modal title="معاينة النسخة السارية" wide onClose={() => setPreview(null)}>
          <PolicyReader versionId={preview.current.id} canAcknowledge={false} />
        </Modal>
      )}
    </MainLayout>
  )
}
