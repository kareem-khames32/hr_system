'use client'

// شريط فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر) — واحد في كل شاشة فيها موظفين.
// أربع قوائم اختيارية مترابطة، كل واحدة بـ«الكل»: اختيار مستوى بيضيّق اختيارات اللي تحته، والإدارة أو القسم بأقسامه الفرعية جوه فرعه،
// والفريق بالظبط. حساب الفرع الواحد فرعه مختار ومقفول. «مسح الفلتر» بيظهر لما الفلتر يشتغل. بيلف على الموبايل (عمودين).
// الاستخدام: const org = useOrgFilter() ثم {org.element} في شريط الفلاتر، وorg.matches(row.employeeId) على الصفوف المحمّلة، أو
// org.params للخادم لما الشاشة بتترقّم أو بتتجمّع هناك. المنطق كله في lib/org-filter.ts؛ الخادم هو اللي بيفرض نطاق الفروع.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { getCurrentUser, isCompanyWideUser, lockedBranchIdOf } from '@/lib/api'
import {
  compileOrgFilter,
  describeOrgFilter,
  EMPTY_ORG_FILTER,
  initialOrgFilter,
  loadOrgFilterContext,
  orgFilterActive,
  orgFilterOptions,
  peekOrgFilterContext,
  updateOrgFilter,
  type OrgFilterContext,
  type OrgFilterLevel,
  type OrgFilterParams,
  type OrgFilterValue,
  type OrgPlacementInput,
} from '@/lib/org-filter'

const SELECT_CLASS = 'input min-w-0 sm:w-44'

export function OrgFilterBar({
  context,
  value,
  onChange,
  lockedBranchId = null,
  companyWide = false,
  disabled = false,
}: {
  context: OrgFilterContext | null
  value: OrgFilterValue
  onChange: (next: OrgFilterValue) => void
  // حساب الفرع الواحد: فرعه مختار والقائمة مقفولة
  lockedBranchId?: number | null
  // حساب على مستوى الشركة: «كل الفروع» — غيره «كل فروعك»
  companyWide?: boolean
  disabled?: boolean
}) {
  if (!context) return null
  const options = orgFilterOptions(context, value)
  const active = orgFilterActive(value, lockedBranchId)
  const pick = (level: OrgFilterLevel, raw: string) =>
    onChange(updateOrgFilter(context, value, level, raw === '' ? null : Number(raw), lockedBranchId))
  const locked = lockedBranchId !== null
  const branchOptions = locked ? options.branches.filter((b) => b.id === lockedBranchId) : options.branches

  return (
    <div
      className="grid grid-cols-2 gap-2 min-w-0 w-full sm:flex sm:flex-wrap sm:items-center sm:w-auto"
      data-org-filter
      data-org-filter-active={active ? 'true' : 'false'}
    >
      <select
        aria-label="الفرع"
        className={SELECT_CLASS}
        value={value.branchId ?? ''}
        disabled={disabled || locked}
        title={locked ? 'صلاحيتك على فرعك بس' : undefined}
        onChange={(e) => pick('branch', e.target.value)}
      >
        {!locked && <option value="">{companyWide ? 'كل الفروع' : 'كل فروعك'}</option>}
        {locked && branchOptions.length === 0 && <option value={lockedBranchId}>فرعك</option>}
        {branchOptions.map((b) => (
          <option key={b.id} value={b.id}>{b.label}</option>
        ))}
      </select>
      {(options.administrations.length > 0 || value.administrationId !== null) && (
        <select
          aria-label="الإدارة"
          className={SELECT_CLASS}
          value={value.administrationId ?? ''}
          disabled={disabled}
          onChange={(e) => pick('administration', e.target.value)}
        >
          <option value="">كل الإدارات</option>
          {options.administrations.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {(options.departments.length > 0 || value.departmentId !== null) && (
        <select
          aria-label="القسم"
          className={SELECT_CLASS}
          value={value.departmentId ?? ''}
          disabled={disabled}
          onChange={(e) => pick('department', e.target.value)}
        >
          <option value="">كل الأقسام</option>
          {options.departments.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {(options.teams.length > 0 || value.teamId !== null) && (
        <select
          aria-label="الفريق"
          className={SELECT_CLASS}
          value={value.teamId ?? ''}
          disabled={disabled}
          onChange={(e) => pick('team', e.target.value)}
        >
          <option value="">كل الفرق</option>
          {options.teams.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {active && (
        <button
          type="button"
          data-org-filter-clear
          disabled={disabled}
          onClick={() => onChange(initialOrgFilter(lockedBranchId))}
          className="inline-flex items-center justify-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50 px-1 py-2"
        >
          <X size={13} />
          مسح الفلتر
        </button>
      )}
    </div>
  )
}

export interface OrgFilterHandle {
  // شريط الفلتر — يتحط في شريط فلاتر الشاشة
  element: ReactNode
  // الموظف ده في الفلتر؟ (مش شغال = أيوه؛ موظف مش معروف والفلتر شغال = لأ)
  matches: (employeeId: number | null | undefined) => boolean
  // صف شايل مكانه بنفسه (فرع/قسم/فريق — زي صفوف المسير من لقطته)
  matchesPlacement: (placement: OrgPlacementInput) => boolean
  active: boolean
  reset: () => void
  // للخادم: {branchId?, departmentIds?, teamId?} — فاضي لما الفلتر مش شغال
  params: OrgFilterParams
  // مفتاح ثابت للـparams (لاعتماديات useEffect)
  paramsKey: string
  value: OrgFilterValue
  // وصف الاختيار في سطر («فرع النصر ← إدارة المبيعات») — فاضي لما الفلتر مش شغال
  label: string
  ready: boolean
}

// مهلة قبل ما موظف مش معروف يستدعي تحديث الشجرة (الشجرة لسه جاية = الموظف فعلًا برّاها)
const REFRESH_AFTER_MS = 5_000

export function useOrgFilter(
  options: {
    disabled?: boolean
    // فرع ثابت تفرضه الشاشة (مثلًا فرع الإقفال المختار في «إقفال سنة الإجازات») — بيتقفل زي فرع حساب الفرع الواحد
    lockBranchId?: number | null
    // false = الفلتر مش في الشاشة دي (مكوّن مشترك في شاشة تانية): مابيحمّلش حاجة ومابيعرضش حاجة وكل الصفوف مطابقة
    enabled?: boolean
  } = {}
): OrgFilterHandle {
  const enabled = options.enabled !== false
  const [context, setContext] = useState<OrgFilterContext | null>(null)
  const [sessionLock, setSessionLock] = useState<number | null>(null)
  const [companyWide, setCompanyWide] = useState(false)
  const [value, setValue] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const lockedBranchId = options.lockBranchId ?? sessionLock
  const appliedLock = useRef<number | null>(null)
  const loadedAt = useRef(0)
  const unknownSeen = useRef(false)
  const refreshed = useRef(false)

  // الفرع المقفول (حساب الفرع الواحد أو فرع تفرضه الشاشة) بيتحط أول ما يتعرف أو يتغير، واللي تحته اللي مابقاش يصلح بيتشال
  useEffect(() => {
    if (appliedLock.current === lockedBranchId) return
    appliedLock.current = lockedBranchId
    setValue((current) => updateOrgFilter(context, current, 'branch', lockedBranchId, lockedBranchId))
  }, [lockedBranchId, context])

  // الحساب والشجرة بعد التركيب (مفيش جلسة في الخادم وقت العرض الأول)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const user = getCurrentUser()
    setSessionLock(lockedBranchIdOf(user))
    setCompanyWide(isCompanyWideUser(user))
    const cached = peekOrgFilterContext()
    if (cached) {
      setContext(cached.data)
      loadedAt.current = cached.at
    }
    loadOrgFilterContext()
      .then((data) => {
        if (!alive) return
        setContext(data)
        loadedAt.current = peekOrgFilterContext()?.at ?? Date.now()
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [enabled])

  // موظف مش معروف في شجرة عمرها أكتر من شوية (اتضاف بعد ما اتحمّلت): تحديث واحد بس للشاشة دي
  useEffect(() => {
    if (!unknownSeen.current || refreshed.current || !context) return
    if (Date.now() - loadedAt.current < REFRESH_AFTER_MS) return
    refreshed.current = true
    let alive = true
    loadOrgFilterContext(true)
      .then((data) => {
        if (!alive) return
        setContext(data)
        loadedAt.current = Date.now()
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  })

  const compiled = useMemo(() => compileOrgFilter(context, value, lockedBranchId), [context, value, lockedBranchId])
  const matches = useCallback(
    (employeeId: number | null | undefined) => {
      if (!compiled.active) return true
      if (!compiled.known(employeeId)) {
        if (employeeId != null) unknownSeen.current = true
        return false
      }
      return compiled.matches(employeeId)
    },
    [compiled]
  )
  const reset = useCallback(() => setValue(initialOrgFilter(lockedBranchId)), [lockedBranchId])
  const paramsKey = JSON.stringify(compiled.params)

  return {
    element: (
      <OrgFilterBar
        context={context}
        value={value}
        onChange={setValue}
        lockedBranchId={lockedBranchId}
        companyWide={companyWide}
        disabled={options.disabled}
      />
    ),
    matches,
    matchesPlacement: compiled.matchesPlacement,
    active: compiled.active,
    reset,
    params: compiled.params,
    paramsKey,
    value,
    label: describeOrgFilter(context, value, lockedBranchId),
    ready: context !== null,
  }
}

export default OrgFilterBar
