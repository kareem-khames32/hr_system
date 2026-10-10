'use client'

// B-ADD.1 (إضافات المالك 11 أكتوبر): حقل «على مين؟» الموحد لكل شاشة بتحدد جمهور —
// الشركة كلها ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم (OrgTargetPicker)، ومعاه «أكتر من فرع»، و«الكل ماعدا…»،
// ومعاينة «N موظف» بالأسماء من الخادم قبل الحفظ (نفس المقيّم اللي بيحكم بعد الحفظ، وبنطاق فروع الحساب).
// القيمة هي الجمهور المحفوظ «مين + فين» نفسه؛ الجمهور المحفوظ بشكل تاني بيتعرض بوصفه ويفضل زي ما هو لحد ما يتغيّر.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Search, UserMinus } from 'lucide-react'
import { getCurrentUser } from '../lib/api'
import { branchScopeOfUser } from '../lib/branch-scope'
import { employeeSearchMatcher } from '../lib/employee-search'
import {
  audienceOfBranches, audienceOfOrgTarget, describeAudience, fetchOrgAudienceContext, pickerDepartments, pickerEmployees, pickerTeams, previewOrgAudience,
  shapeOfAudience, type AudiencePreview, type AudienceWho, type OrgAudienceContext, type StoredAudience,
} from '../lib/org-audience'
import { ORG_AUDIENCE_LEVELS, OrgTargetPicker, initialOrgTarget, resolveOrgTarget, type OrgTarget, type OrgTargetLevel } from './OrgTargetPicker'

type Mode = 'target' | 'branches' | 'other'

export function OrgAudienceField({
  value,
  onChange,
  who = null,
  disabled = false,
  exclusion = true,
  multiBranch = true,
}: {
  value: StoredAudience | null
  /** الجمهور الجديد (null = الشركة كلها)، وهل الاختيار مكتمل يتحفظ */
  onChange: (audience: StoredAudience | null, complete: boolean) => void
  /** شاشة فيها «مين» بالأدوار/المناصب: المنتقي بيحدد المكان والاستثناء بس (من غير «موظفين بالاسم») */
  who?: AudienceWho | null
  disabled?: boolean
  exclusion?: boolean
  /** «أكتر من فرع كامل» متاح؟ (العطلة الرسمية وفترة الإضافي جمهورهم جوه فرع واحد) */
  multiBranch?: boolean
}) {
  const [context, setContext] = useState<OrgAudienceContext | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const scope = useMemo(() => branchScopeOfUser(getCurrentUser()), [])
  const lockedBranchId = Array.isArray(scope) && scope.length === 1 ? scope[0] : null
  const whoActive = !!who && who.mode !== 'all'
  const levels: OrgTargetLevel[] = whoActive ? ORG_AUDIENCE_LEVELS.filter((level) => level !== 'employees') : ORG_AUDIENCE_LEVELS

  const [mode, setMode] = useState<Mode>('target')
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lockedBranchId, levels, scope))
  const [branchIds, setBranchIds] = useState<number[]>([])
  const [exclude, setExclude] = useState<number[]>([])
  const [excluding, setExcluding] = useState(false)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [showNames, setShowNames] = useState(false)
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchOrgAudienceContext().then((data) => { if (alive) setContext(data) }).catch((error) => { if (alive) setFailed(error instanceof Error ? error.message : 'تعذر تحميل الهيكل') })
    return () => { alive = false }
  }, [])

  // القيمة المحفوظة ← حالة المنتقي (مرة لكل قيمة جاية من برّه)
  useEffect(() => {
    if (!context) return
    const key = JSON.stringify(value ?? null)
    if (loadedFor.current === key) return
    loadedFor.current = key
    const shape = shapeOfAudience(value, context)
    if (shape.kind === 'other') { setMode('other'); return }
    setExclude(shape.exclude)
    setExcluding(shape.exclude.length > 0)
    if (shape.kind === 'branches') { setMode('branches'); setBranchIds(shape.branchIds); return }
    setMode('target')
    // حساب الفروع مالوش «الشركة كلها»: القيمة الفاضية بتبدأ من فرعه (وبتتبلّغ للشاشة عشان اللي يتحفظ هو اللي ظاهر)
    if (shape.target.level === 'company' && scope !== null) {
      const start = initialOrgTarget(lockedBranchId, levels, scope)
      setTarget(start)
      emit('target', start, [], shape.exclude)
      return
    }
    setTarget(shape.target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, value])

  const departments = useMemo(() => (context ? pickerDepartments(context) : []), [context])
  const teams = useMemo(() => (context ? pickerTeams(context) : []), [context])
  const employees = useMemo(() => (context ? pickerEmployees(context) : []), [context])

  const emit = (nextMode: Mode, nextTarget: OrgTarget, nextBranches: number[], nextExclude: number[]) => {
    const audience = nextMode === 'branches' ? audienceOfBranches(nextBranches, nextExclude, who) : audienceOfOrgTarget(nextTarget, nextTarget.level === 'employees' ? [] : nextExclude, who)
    loadedFor.current = JSON.stringify(audience ?? null)
    onChange(audience ?? null, audience !== undefined)
  }
  // «مين» اتغيّر في الشاشة (أدوار/مناصب): الجمهور بيتبني تاني بنفس المكان والاستثناء
  const whoKey = JSON.stringify(who ?? null)
  const firstWho = useRef(true)
  useEffect(() => {
    if (firstWho.current) { firstWho.current = false; return }
    if (mode === 'other' || !context) return
    // «مين» بقى أدوار/مناصب والاختيار كان «موظفين بالاسم»: المستوى ده مش متاح معاه، فبيرجع للفرع كله
    const next = whoActive && target.level === 'employees' ? { ...target, level: 'branch' as const, employeeIds: [] } : target
    if (next !== target) setTarget(next)
    emit(mode, next, branchIds, exclude)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whoKey])

  const current: StoredAudience | null | undefined = mode === 'other' ? value
    : mode === 'branches' ? audienceOfBranches(branchIds, exclude, who) : audienceOfOrgTarget(target, target.level === 'employees' ? [] : exclude, who)
  const currentKey = current === undefined ? 'incomplete' : JSON.stringify(current)

  // المعاينة من الخادم (بنفس المقيّم)، بتأخير بسيط عشان التعليم ورا بعض
  useEffect(() => {
    if (!context || current === undefined) { setPreview(null); return }
    let alive = true
    const timer = setTimeout(() => {
      previewOrgAudience(current).then((data) => { if (alive) setPreview(data) }).catch(() => { if (alive) setPreview(null) })
    }, 350)
    return () => { alive = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, currentKey])

  if (failed) return <p className="text-sm text-red-600" role="alert">{failed}</p>
  if (!context) return <p className="text-sm text-gray-400">جاري تحميل الهيكل…</p>

  if (mode === 'other') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-2" data-org-audience="other">
        <p>الجمهور المحفوظ: <b>{describeAudience(value, context)}</b> — متحدد بطريقة قديمة وهيفضل زي ما هو.</p>
        <button type="button" className="text-primary-600 hover:underline disabled:opacity-50" disabled={disabled}
          onClick={() => { const fresh = initialOrgTarget(lockedBranchId, levels, scope); setMode('target'); setTarget(fresh); setExclude([]); emit('target', fresh, [], []) }}>
          غيّر الجمهور
        </button>
      </div>
    )
  }

  const scopedBranches = context.branches
  // الموظفين اللي الاختيار بيشملهم (قبل الاستثناء) — قايمة «الكل ماعدا…»
  const covered = mode === 'branches' ? employees.filter((e) => e.branchId != null && branchIds.includes(e.branchId))
    : (() => { const ids = new Set(resolveOrgTarget(target, employees, departments)); return employees.filter((e) => ids.has(e.id)) })()
  const matches = employeeSearchMatcher(query)
  const canExclude = exclusion && !(mode === 'target' && target.level === 'employees')
  const toggleExclude = (id: number) => {
    const next = exclude.includes(id) ? exclude.filter((x) => x !== id) : [...exclude, id]
    setExclude(next)
    emit(mode, target, branchIds, next)
  }

  return (
    <div className="space-y-3" data-org-audience={mode}>
      {mode === 'target' ? (
        <OrgTargetPicker
          value={target}
          onChange={(next) => {
            // تغيير الفرع أو المستوى بيشيل المستثنين اللي مابقوش جوه الاختيار
            const ids = new Set(resolveOrgTarget(next, employees, departments))
            const kept = exclude.filter((id) => ids.has(id))
            setTarget(next); setExclude(kept); emit('target', next, branchIds, kept)
          }}
          branches={scopedBranches}
          departments={departments}
          teams={teams}
          employees={employees}
          levels={levels}
          lockedBranchId={lockedBranchId}
          branchScope={scope}
          disabled={disabled}
          showCount={false}
          tree
        />
      ) : (
        <div className="border border-gray-200 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1" data-org-audience-branches>
          {scopedBranches.map((b) => (
            <label key={b.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${branchIds.includes(b.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" disabled={disabled} checked={branchIds.includes(b.id)}
                onChange={() => {
                  const next = branchIds.includes(b.id) ? branchIds.filter((x) => x !== b.id) : [...branchIds, b.id]
                  const kept = exclude.filter((id) => { const e = employees.find((row) => row.id === id); return e?.branchId != null && next.includes(e.branchId) })
                  setBranchIds(next); setExclude(kept); emit('branches', target, next, kept)
                }} />
              <span className="text-sm text-gray-700">فرع: {b.name}</span>
            </label>
          ))}
        </div>
      )}

      {multiBranch && scopedBranches.length > 1 && (
        <button type="button" className="text-xs text-primary-600 hover:underline disabled:opacity-50" disabled={disabled}
          onClick={() => {
            if (mode === 'target') { const start = target.branchId != null ? [target.branchId] : []; setMode('branches'); setBranchIds(start); setExclude([]); emit('branches', target, start, []) }
            else { const fresh = initialOrgTarget(lockedBranchId, levels, scope); setMode('target'); setTarget(fresh); setExclude([]); emit('target', fresh, [], []) }
          }}>
          {mode === 'target' ? 'أكتر من فرع كامل؟ اختار الفروع بعلامات صح' : 'رجوع: فرع واحد وتفاصيله (إدارة / قسم / فريق / موظفين)'}
        </button>
      )}

      {canExclude && current !== undefined && (
        <div className="space-y-2" data-org-audience-exclude>
          <button type="button" className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center gap-1.5 disabled:opacity-50" disabled={disabled}
            onClick={() => setExcluding((open) => !open)}>
            <UserMinus size={15} /> الكل ماعدا…{exclude.length ? ` (${exclude.length} مستثنى)` : ''}
          </button>
          {excluding && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" className="input w-full ps-9" placeholder="دوّر بالاسم أو الكود على اللي هتستثنيه…" value={query} disabled={disabled} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="border border-gray-200 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                {covered.filter((e) => matches(e)).slice(0, 200).map((e) => (
                  <label key={e.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${exclude.includes(e.id) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300" disabled={disabled} checked={exclude.includes(e.id)} onChange={() => toggleExclude(e.id)} />
                    <span className="text-sm text-gray-700">{e.fullName}</span>
                    {e.employeeCode && <span className="text-xs text-gray-400 ms-auto">{e.employeeCode}</span>}
                  </label>
                ))}
                {covered.length === 0 && <p className="text-sm text-gray-400 text-center py-3">مفيش موظفين في الاختيار ده</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* المعاينة قبل الحفظ */}
      <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600" data-org-audience-preview={preview?.count ?? ''}>
        {current === undefined ? (
          <span className="text-amber-700">كمّل الاختيار عشان تشوف هينطبق على مين</span>
        ) : !preview ? (
          <span className="text-gray-400">جاري حساب العدد…</span>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span>{describeAudience(current, context)} — ينطبق على <b>{preview.count}</b> موظف</span>
              {preview.count > 0 && (
                <button type="button" className="text-primary-600 hover:underline inline-flex items-center gap-1 shrink-0" onClick={() => setShowNames((open) => !open)}>
                  <Eye size={14} /> {showNames ? 'إخفاء الأسماء' : 'عرض الأسماء'}
                </button>
              )}
            </div>
            {showNames && (
              <ul className="mt-2 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700" data-org-audience-names>
                {preview.employees.map((e) => <li key={e.id}>{e.fullName}{e.employeeCode ? ` (${e.employeeCode})` : ''}</li>)}
                {preview.truncated && <li className="text-gray-400">و{preview.count - preview.employees.length} غيرهم…</li>}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default OrgAudienceField
