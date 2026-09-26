'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
// مسار نسبي (لا @/): محرر معادلات الرواتب يستورد الملف ده ويتحمّل في اختبارات الخادم
import { fetchBranches, getCurrentUser, isCompanyWideUser, type ApiBranch } from '../lib/api'
import { branchScopeOfUser, type BranchScope } from '../lib/branch-scope'

// ===== تعريفات الفرع (قرار المالك 16 سبتمبر) =====
// أنواع الإجازات وأنواع الطلبات والورديات ومعادلات الرواتب لكل الشركة افتراضيًا، والفرع يقدر يعمل تعريف خاص بيه.
// حساب الفرع الواحد بيضيف لفرعه تلقائيًا ويعدّل تعريفات فرعه بس؛ حساب الفروع المتعددة يختار فرع من فروعه؛
// حساب الشركة يختار «كل الشركة» أو فرع. (الخادم هو اللي بيفرض ده — الشاشة بتوضّحه بس.)

export interface DefinitionBranches {
  // null = حساب على مستوى الشركة · [فرع] = فرع الحساب · [فروع] = حساب على أكتر من فرع · [] = حساب مش مربوط بفرع
  scope: BranchScope
  // الحساب بيختار فرع التعريف بنفسه في النموذج: حساب الشركة (كل الشركة أو فرع) وحساب الفروع المتعددة (فرع من فروعه)
  choosesBranch: boolean
  branches: ApiBranch[]
  label: (branchId?: number | null) => string
  canEdit: (branchId?: number | null) => boolean
}

export function useDefinitionBranches(): DefinitionBranches {
  const [scope, setScope] = useState<BranchScope>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  useEffect(() => {
    const user = getCurrentUser()
    setScope(isCompanyWideUser(user) ? null : branchScopeOfUser(user))
    fetchBranches().then(setBranches).catch(() => { /* أسماء الفروع للعرض بس: من غيرها يظهر رقم الفرع */ })
  }, [])
  const label = useCallback((branchId?: number | null) => branchId == null
    ? 'كل الشركة'
    : branches.find(b => b.id === Number(branchId))?.name ?? `فرع رقم ${branchId}`, [branches])
  const canEdit = useCallback((branchId?: number | null) => scope === null
    || (branchId != null && scope.includes(Number(branchId))), [scope])
  return { scope, choosesBranch: scope === null || scope.length > 1, branches, label, canEdit }
}

// «متاح في»: اختيار الفرع عند الإضافة لحساب الشركة (أو فرع من فروع حساب الفروع المتعددة)، ونص ثابت لحساب الفرع الواحد
// أو عند التعديل
export function DefinitionBranchField({ value, onChange, editing, info, disabled }: {
  value: number | null
  onChange: (branchId: number | null) => void
  editing: boolean
  info: DefinitionBranches
  disabled?: boolean
}) {
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'
  if (editing || !info.choosesBranch) {
    const shown = editing ? value : info.scope?.[0] ?? null
    return <div>
      <p className={labelClass}>متاح في</p>
      <p className="input w-full bg-gray-50 text-gray-700 flex items-center gap-2"><Building2 size={16} className="text-gray-400" />{info.label(shown)}</p>
      <p className="text-xs text-gray-500 mt-1">{editing ? 'مايتغيرش بعد الإضافة — لفرع تاني أضف تعريف جديد' : 'هيتضاف لفرعك بس، ومش هيظهر في الفروع التانية'}</p>
    </div>
  }
  const scope = info.scope
  return <label className="block">
    <span className={labelClass}>متاح في</span>
    <select className="input w-full" value={value ?? ''} disabled={disabled} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}>
      {scope === null ? <option value="">كل الشركة</option> : value == null && <option value="" disabled>— اختار الفرع —</option>}
      {info.branches.filter(b => (b.isActive || b.id === value) && (scope === null || scope.includes(b.id))).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
    <span className="text-xs text-gray-500 mt-1 block">{scope === null
      ? 'لو اخترت فرع، التعريف ده يظهر ويتستخدم في الفرع ده بس'
      : 'التعريف ده يظهر ويتستخدم في الفرع اللي تختاره من فروعك بس'}</span>
  </label>
}

// شارة صغيرة في القوائم: يظهر فقط للتعريف الخاص بفرع
export function DefinitionBranchBadge({ branchId, info }: { branchId?: number | null; info: DefinitionBranches }) {
  if (branchId == null) return null
  return <span className="badge text-xs bg-amber-50 text-amber-700 inline-flex items-center gap-1"><Building2 size={11} />{info.label(branchId)} بس</span>
}
