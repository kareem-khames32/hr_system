'use client'

// محرر سلسلة الاعتماد (إنشاء / تعديل / «نسخة خاصة بفرع») — نفس المحرر في «الاعتمادات والموافقات» (مكتبة كل السلاسل)
// وفي «بانِي الطلبات» (سلسلة كل فئة جوّه الطلبات نفسها، طلب المالك 26 سبتمبر). جوّه تعديل السلسلة العامة جدول
// «سلسلة مختلفة لكل فرع»: اختار فرع → سلسلته؛ حساب الفرع بيشوف صفوف فروعه بس، والسلسلة العامة عنده للقراءة.
// مسارات نسبية (لا @/) عشان اختبارات الخادم بترسم المكوّن ده.
import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Lock, Plus, Trash2, Zap } from 'lucide-react'
import {
  createApprovalChain,
  getCurrentUser,
  replaceChainSteps,
  updateApprovalChain,
  type ApiBranch,
  type ApiEmployee,
} from '../../lib/api'
import { branchScopeOfUser, canSeeBranch, type BranchScope } from '../../lib/branch-scope'
import { EmployeePicker } from '../EmployeePicker'
import {
  branchesWithoutVersionOf,
  branchVersionsOfChain,
  buildChainSteps,
  emptyStep,
  escalationRoles,
  generalChainOf,
  roleLabels,
  stepFormOf,
  suggestCode,
  thresholdOps,
  validateChainForm,
  type ApiChain,
  type ChainForm,
  type StepForm,
} from './chainEditorModel'

export type ChainEditorTarget =
  | { kind: 'create' }
  | { kind: 'edit'; chainId: number }
  | { kind: 'branchCopy'; chainId: number; branchId?: number }

export const chainEditorTargetKey = (target: ChainEditorTarget): string =>
  target.kind === 'create' ? 'create' : target.kind === 'edit' ? `edit-${target.chainId}` : `copy-${target.chainId}-${target.branchId ?? ''}`

export interface ChainEditorModalProps {
  // null = المحرر مقفول
  target: ChainEditorTarget | null
  chains: ApiChain[]
  branches: ApiBranch[]
  employees: ApiEmployee[]
  // التنقل جوّه المحرر (من جدول الفروع لسلسلة فرع أو نسخة جديدة)
  onNavigate: (target: ChainEditorTarget) => void
  onClose: () => void
  // بعد الحفظ: الشاشة تعيد تحميل السلاسل وتعرض الرسالة — والمحرر يقفل بعدها
  onSaved: (notice: string) => void | Promise<void>
  // اسم نوع الطلب المربوط بالسلسلة (للنصوص)
  typeNameOf?: (chain: ApiChain) => string | null
  // الفئات اللي السلسلة دي سلسلتها (سلسلة فئة) — بأسمائها
  categoriesOf?: (chain: ApiChain) => string[]
  // نطاق فروع الحساب — الافتراضي من الحساب الحالي
  scope?: BranchScope
}

export function ChainEditorModal(props: ChainEditorModalProps) {
  const target = props.target
  if (!target) return null
  // مفتاح لكل هدف: فتح سلسلة تانية = نموذج جديد من أوله — ولو السلسلة وصلت بعد ما المحرر اتفتح (تحميل متأخر)
  // المحرر يتبني من جديد عليها بدل ما يفضل على نموذج فاضي
  const loaded = target.kind === 'create' || props.chains.some((c) => c.id === target.chainId)
  return <ChainEditorDialog key={`${chainEditorTargetKey(target)}${loaded ? '' : ':pending'}`} {...props} target={target} />
}

function ChainEditorDialog({
  target,
  chains,
  branches: allBranches,
  employees,
  onNavigate,
  onClose,
  onSaved,
  typeNameOf,
  categoriesOf,
  scope: scopeProp,
}: ChainEditorModalProps & { target: ChainEditorTarget }) {
  const [scope] = useState<BranchScope>(() => (scopeProp !== undefined ? scopeProp : branchScopeOfUser(getCurrentUser())))
  // الفروع اللي الحساب يشوفها (حساب الشركة: كلها)
  const branches = allBranches.filter((b) => canSeeBranch(scope, b.id))
  const targetChain = target.kind === 'create' ? null : chains.find((c) => c.id === target.chainId) ?? null
  const editingChain = target.kind === 'edit' ? targetChain : null
  // «نسخة خاصة بفرع»: السلسلة العامة اللي بتتنسخ لفرع (إنشاء بنفس كودها)
  const copyOf = target.kind === 'branchCopy' ? targetChain : null
  const branchesWithoutVersion = (chain: ApiChain) => branchesWithoutVersionOf(chain, chains, branches)
  const generalOf = (chain: ApiChain) => generalChainOf(chain, chains)
  const branchLabelOf = (branchId: number | null) =>
    branchId === null ? 'كل الفروع' : allBranches.find((b) => b.id === branchId)?.name ?? `فرع #${branchId}`
  const chainTypeName = (chain: ApiChain): string | null =>
    typeNameOf?.(chain) ?? chain.requestTypeName ?? (generalOf(chain) ? chainTypeName(generalOf(chain)!) : null)

  // النموذج زي ما اتفتح — مقارنته بالحالي بتقول لو فيه تعديلات مش محفوظة
  const [initialForm] = useState<ChainForm>(() => {
    if (editingChain) {
      return {
        name: editingChain.nameAr,
        code: editingChain.code,
        branchId: editingChain.branchId === null ? 'all' : String(editingChain.branchId),
        steps: editingChain.steps.map((s) => stepFormOf(s, `db-${s.id}`)),
      }
    }
    if (copyOf) {
      // «نسخة خاصة بفرع» (طلب المالك 24 سبتمبر): نفس كود السلسلة العامة لفرع بعينه بيتقدم عليها لطلبات موظفي الفرع ده
      // (resolveChain في الخادم)، والفرع اللي مالوش نسخة (أو نسخته معطلة) بيمشي على العامة. الكود مقفول على الأصل،
      // والخطوات منسوخة للتعديل، والفروع المتاحة بس.
      const free = branchesWithoutVersionOf(copyOf, chains, allBranches.filter((b) => canSeeBranch(scope, b.id)))
      const branch = free.find((b) => b.id === (target.kind === 'branchCopy' ? target.branchId : undefined)) ?? free[0]
      return {
        name: branch ? `${copyOf.nameAr} — ${branch.name}` : copyOf.nameAr,
        code: copyOf.code,
        branchId: branch ? String(branch.id) : '',
        steps: copyOf.steps.length ? copyOf.steps.map((s) => stepFormOf(s, `copy-${s.id}`)) : [emptyStep()],
      }
    }
    const own = scope === null ? null : scope[0] ?? null
    return { name: '', code: '', branchId: own === null ? 'all' : String(own), steps: [emptyStep()] }
  })
  const openedForm = JSON.stringify(initialForm)
  const [formData, setFormData] = useState<ChainForm>(initialForm)
  const [codeTouched, setCodeTouched] = useState(!!copyOf)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // السلسلة العامة (أو سلسلة فرع تاني) لحساب الفرع: للقراءة — نسخة فرعه من الجدول تحت
  const readOnly = !!editingChain && !canSeeBranch(scope, editingChain.branchId)
  const categories = editingChain ? categoriesOf?.(editingChain) ?? [] : []
  // سلسلة بتسري على كل الفروع: الأساسية لنوع طلب، أو سلسلة فئة — مابتتنقلش لفرع، والفرع ياخد نسخة بنفس الكود
  const sharedChain = !!editingChain && editingChain.branchId === null && (!!editingChain.isPrimary || categories.length > 0)
  const subject = categories.length
    ? `طلبات فئة «${categories.join('» و«')}»`
    : editingChain ? `طلب «${chainTypeName(editingChain) ?? editingChain.nameAr}»` : ''

  const handleOpenModal = (chain: ApiChain) => onNavigate({ kind: 'edit', chainId: chain.id })
  const handleOpenBranchCopy = (chain: ApiChain, branchId?: number) => onNavigate({ kind: 'branchCopy', chainId: chain.id, branchId })
  const leaveGeneralFor = (go: () => void) => {
    if (editingChain && JSON.stringify(formData) !== openedForm) {
      setModalError('فيه تعديلات على السلسلة دي لسه ما اتحفظتش — احفظها الأول (أو اضغط إلغاء) وبعدين افتح سلسلة الفرع')
      return
    }
    go()
  }

  // اسم الدورة يقترح الكود تلقائياً ما دام المستخدم لم يلمس حقل الكود
  const handleNameChange = (value: string) => {
    if (!editingChain && !codeTouched) {
      setFormData({ ...formData, name: value, code: suggestCode(value) })
    } else {
      setFormData({ ...formData, name: value })
    }
  }

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, emptyStep()] })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    })
  }

  const moveStep = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= formData.steps.length) return
    const steps = [...formData.steps]
    ;[steps[index], steps[next]] = [steps[next], steps[index]]
    setFormData({ ...formData, steps })
  }

  const updateStep = (index: number, field: keyof StepForm, value: string | boolean) => {
    const steps = formData.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    setFormData({ ...formData, steps })
  }

  const handleSave = async () => {
    if (readOnly) return
    const problem = validateChainForm(formData, !editingChain)
    if (problem) {
      setModalError(problem)
      return
    }
    if (copyOf && !formData.branchId) {
      setModalError('كل الفروع ليها نسخة خاصة من السلسلة دي — عدّل نسخة الفرع من الجدول')
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      const name = formData.name.trim()
      let notice: string
      if (editingChain) {
        // نقل النطاق (فرع ↔ عامة) يُرسل فقط لو تغيّر — null = دورة عامة
        const newBranchId = formData.branchId === 'all' ? null : Number(formData.branchId)
        await updateApprovalChain(editingChain.id, {
          nameAr: name,
          ...(newBranchId !== editingChain.branchId ? { branchId: newBranchId } : {}),
        })
        await replaceChainSteps(editingChain.id, buildChainSteps(formData))
        notice = `تم تحديث دورة «${name}» — الخطوات الجديدة تسري على الطلبات القادمة`
      } else {
        await createApprovalChain({
          code: formData.code.trim(),
          nameAr: name,
          branchId: formData.branchId === 'all' ? undefined : Number(formData.branchId),
          steps: buildChainSteps(formData),
        })
        notice = copyOf
          ? `تم إنشاء نسخة «${name}» — طلبات موظفي ${branchLabelOf(Number(formData.branchId))} هتمشي عليها بدل «${copyOf.nameAr}»`
          : `تم إنشاء دورة الاعتماد «${name}» بنجاح`
      }
      await onSaved(notice)
      onClose()
    } catch (err: any) {
      // رسالة الباك إند العربية كما هي
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // السلسلة اتشالت من القائمة (أو لسه ما اتحمّلتش)
  if (target.kind !== 'create' && !targetChain) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
          <p className="text-sm text-gray-700">السلسلة دي مش ظاهرة لحسابك أو اتشالت — حدّث الصفحة.</p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              قفل
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-chain-editor={target.kind}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {editingChain ? 'تعديل دورة الاعتماد' : copyOf ? `نسخة خاصة بفرع من «${copyOf.nameAr}»` : 'إنشاء دورة اعتماد جديدة'}
          </h2>
          {copyOf ? (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <AlertCircle size={15} className="shrink-0 text-primary-500" />
              الخطوات منسوخة من السلسلة العامة — عدّلها للفرع ده. طلبات موظفي الفرع هتمشي عليها، وباقي الفروع على العامة
            </p>
          ) : editingChain ? (
            <p className="text-sm text-warning-600 mt-2 flex items-center gap-1.5">
              <AlertCircle size={15} className="shrink-0" />
              تعديل الخطوات يسري على الطلبات الجديدة فقط — الطلبات الجارية تكمل
              بخطواتها المحلولة
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <AlertCircle size={15} className="shrink-0 text-primary-500" />
              ربط الطلبات بالسلاسل من «بانِي الطلبات» — أنشئ سلسلة يدوية هنا لحالة خاصة
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Modal Error — رسائل الباك إند العربية كما هي */}
          {modalError && (
            <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          {readOnly && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 flex items-start gap-2" data-chain-read-only>
              <Lock size={15} className="shrink-0 mt-0.5 text-gray-500" />
              <span>
                السلسلة دي لكل الشركة — بتتعدّل من حساب على مستوى الشركة. تقدر تعمل سلسلة خاصة لفرعك أو تعدّلها من جدول
                «سلسلة مختلفة لكل فرع» تحت.
              </span>
            </p>
          )}

          {/* الحساب اللي مايعدّلش السلسلة دي بيشوفها بس — كل خانات النموذج مقفولة مرة واحدة */}
          <fieldset disabled={readOnly || saving} className="space-y-6 min-w-0">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الدورة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="input w-full"
                  placeholder="مثال: اعتماد الإجازات"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كود الدورة *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setCodeTouched(true)
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }}
                  className="input w-full font-mono"
                  placeholder="CHAIN_X"
                  dir="ltr"
                  disabled={!!editingChain || !!copyOf}
                  title={editingChain ? 'الكود لا يتغير بعد الإنشاء' : copyOf ? 'نفس كود السلسلة العامة — هو اللي بيخلي النسخة تتقدم عليها لطلبات موظفي الفرع' : undefined}
                />
                {!editingChain && !copyOf && (
                  <p className="text-xs text-gray-400 mt-1">
                    يُقترح تلقائياً من الاسم — أحرف إنجليزية وأرقام و _ أو - (من 3 إلى 50)
                  </p>
                )}
              </div>
            </div>

            {sharedChain && editingChain ? (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
                {categories.length
                  ? `السلسلة دي سلسلة فئة «${categories.join('» و«')}» لكل الشركة — كل طلب في الفئة ماشي عليها بيستخدمها في أي فرع، إلا الفرع اللي ليه سلسلة خاصة (جدول «سلسلة مختلفة لكل فرع» تحت).`
                  : `السلسلة دي هي سلسلة «${chainTypeName(editingChain) ?? editingChain.nameAr}» لكل الشركة — طلبات أي فرع بتمشي عليها، إلا الفرع اللي ليه سلسلة خاصة (جدول «سلسلة مختلفة لكل فرع» تحت).`}
              </p>
            ) : editingChain && generalOf(editingChain) ? (
              <p className="text-sm text-gray-600 bg-amber-50 rounded-xl px-4 py-3">
                دي السلسلة الخاصة بـ<b>{branchLabelOf(editingChain.branchId)}</b> — طلبات موظفي الفرع ده بتمشي عليها، وباقي
                الفروع على «{generalOf(editingChain)!.nameAr}».
              </p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نطاق الفرع
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="input w-full"
                >
                  {!copyOf && scope === null && <option value="all">كل الفروع (دورة عامة)</option>}
                  {(copyOf ? branchesWithoutVersion(copyOf) : branches).map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      // سلسلة أساسية لنوع في فرع: ماتتنقلش لفرع تاني
                      disabled={!!editingChain?.isPrimary && b.id !== editingChain.branchId}
                    >
                      {b.name} فقط
                    </option>
                  ))}
                </select>
                {copyOf ? (
                  <p className="text-xs text-gray-400 mt-1">
                    الفروع اللي لسه مالهاش نسخة خاصة من «{copyOf.nameAr}» بس
                  </p>
                ) : editingChain?.isPrimary ? (
                  <p className="text-xs text-warning-600 mt-1">
                    دورة أساسية لنوع طلب — لتخصيص فرع أنشئ نسخة بنفس الكود ({editingChain.code}) لهذا الفرع
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    نسخة بفرع محدد تتقدم على العامة عند التنفيذ — طلبات موظفي الفرع تتبع
                    دورته الخاصة أولاً
                  </p>
                )}
              </div>
            )}

            {/* Approval Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  خطوات الاعتماد
                </label>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    إضافة خطوة
                  </button>
                )}
              </div>

              {formData.steps.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 flex items-center gap-2">
                  <Zap size={16} className="text-warning-500" />
                  {editingChain?.autoApprove
                    ? 'بلا خطوات — الطلب يُنفَّذ فور تقديمه (تنفيذ فوري مفعّل)'
                    : 'بلا خطوات — الطلب يقف لحد ما تضيف المعتمدين (إلا لو فعّلت «تنفيذ فوري بلا اعتمادات» من المكتبة)'}
                </div>
              )}

              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <div key={step.key} className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          الخطوة {index + 1}
                        </span>
                        <label
                          className={`flex items-center gap-1.5 mr-3 ${index === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={
                            index === 0
                              ? 'الخطوة الأولى لا يمكن أن تكون موازية'
                              : 'تُعتمد بالتوازي مع الخطوة السابقة (نفس الترتيب)'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={index > 0 && step.isParallel}
                            disabled={index === 0}
                            onChange={(e) => updateStep(index, 'isParallel', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                          />
                          <span className="text-xs text-gray-600">
                            موازية مع السابقة
                          </span>
                        </label>
                      </div>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStep(index, -1)}
                            disabled={index === 0}
                            title="نقل لأعلى"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 1)}
                            disabled={index === formData.steps.length - 1}
                            title="نقل لأسفل"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            title="حذف الخطوة"
                            className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          المعتمد
                        </label>
                        <select
                          value={step.approverRole}
                          onChange={(e) => updateStep(index, 'approverRole', e.target.value)}
                          className="input w-full text-sm"
                        >
                          {Object.entries(roleLabels).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          مهلة الرد (أيام — اختياري)
                        </label>
                        <input
                          type="number"
                          value={step.slaDays}
                          onChange={(e) => updateStep(index, 'slaDays', e.target.value)}
                          className="input w-full text-sm"
                          min={1}
                          placeholder="بلا مهلة"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          التصعيد إلى (اختياري)
                        </label>
                        <select
                          value={step.escalateTo}
                          onChange={(e) => updateStep(index, 'escalateTo', e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="">بدون تصعيد</option>
                          {escalationRoles.map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* اختيار الموظف — لخطوة «موظف بعينه» فقط */}
                    {step.approverRole === 'specific_employee' && (
                      <div>
                        <label htmlFor={`chain-step-employee-${index}`} className="text-xs text-gray-500 mb-1 block">
                          الموظف المعتمد *
                        </label>
                        {/* بحث بالاسم أو الكود؛ الموظف المحفوظ لو مش في قائمة الحساب (فرع تاني) يفضل ظاهر باسم رقمه */}
                        <EmployeePicker
                          id={`chain-step-employee-${index}`}
                          employees={employees}
                          value={step.specificEmployeeId}
                          onChange={(id) => updateStep(index, 'specificEmployeeId', id)}
                          disabled={readOnly || saving}
                          required
                          inputClassName="text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          هذا الموظف بعينه هو من يعتمد الخطوة أياً كان مقدم الطلب
                        </p>
                      </div>
                    )}

                    {/* شرط العتبة — الثلاثة معاً أو لا شيء */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        شرط العتبة (اختياري — الحقل والمعامل والقيمة معاً أو لا شيء)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={step.thresholdField}
                          onChange={(e) => updateStep(index, 'thresholdField', e.target.value)}
                          className="input w-full text-sm font-mono"
                          placeholder="amount"
                          dir="ltr"
                        />
                        <select
                          value={step.thresholdOp}
                          onChange={(e) => updateStep(index, 'thresholdOp', e.target.value)}
                          className="input w-full text-sm font-mono"
                          dir="ltr"
                        >
                          <option value="">—</option>
                          {thresholdOps.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={step.thresholdValue}
                          onChange={(e) => updateStep(index, 'thresholdValue', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="القيمة"
                          dir="ltr"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        مثال: amount &gt;= 1000 — الخطوة تُطبَّق فقط إذا تحقق الشرط على
                        بيانات الطلب
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          {/* «سلسلة مختلفة لكل فرع» (طلب المالك 24 سبتمبر): جوّه تعديل السلسلة العامة نفسها — لسلسلة نوع طلب أو سلسلة فئة.
              الطلب واحد لكل الشركة، وطلب الموظف بيمشي في سلسلة فرعه لو ليه سلسلة خاصة، وإلا في دي.
              حساب الفرع بيشوف صفوف فروعه بس (branch-scope.ts). */}
          {sharedChain && editingChain && (() => {
            const rows = allBranches.filter((b) => canSeeBranch(scope, b.id))
            return (
              <div className="border border-gray-200 rounded-xl" data-chain-branch-table>
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">سلسلة مختلفة لكل فرع</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {subject} واحدة لكل الشركة — وطلب كل موظف بيمشي في سلسلة فرعه لو ليه سلسلة خاصة، وإلا في السلسلة دي.
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-500">حسابك مش مربوط بفرع، فمفيش فروع تظهر هنا.</p>
                  )}
                  {rows.map((b) => {
                    const version = branchVersionsOfChain(editingChain, chains).find((c) => c.branchId === b.id) ?? null
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5" data-chain-branch-row={b.id}>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800">{b.name}</p>
                          <p className={`text-xs ${version?.isActive ? 'text-amber-700' : 'text-gray-500'}`}>
                            {version
                              ? version.isActive
                                ? `ليه سلسلة خاصة — ${version.steps.length} ${version.steps.length === 1 ? 'خطوة' : 'خطوات'}`
                                : 'سلسلته الخاصة معطّلة — ماشي على السلسلة دي'
                              : 'ماشي على السلسلة دي'}
                          </p>
                        </div>
                        {version ? (
                          <button type="button" className="btn-secondary text-sm shrink-0" disabled={saving}
                            onClick={() => leaveGeneralFor(() => handleOpenModal(version))}>
                            تعديل سلسلة الفرع
                          </button>
                        ) : (
                          <button type="button" className="btn-secondary text-sm shrink-0" disabled={saving}
                            onClick={() => leaveGeneralFor(() => handleOpenBranchCopy(editingChain, b.id))}>
                            اعمل سلسلة خاصة للفرع
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            {readOnly ? 'قفل' : 'إلغاء'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
              data-chain-editor-save
            >
              {saving ? 'جارٍ الحفظ...' : editingChain ? 'حفظ التغييرات' : 'إنشاء الدورة'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
