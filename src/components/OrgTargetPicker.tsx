'use client'

// منتقي الاستهداف الموحّد — ترتيب واحد في كل النظام:
// الشركة كلها ← فرع ← أقسام الفرع ده ← موظفين من الفرع ده.
// اختيار الفرع بيحمّل أقسامه وموظفينه بس. الشاشة بتحدد المستويات المسموحة
// (مثلًا فترات الإضافي: الشركة أو فرع بس)، ومستخدم الفرع بيتقفل على فرعه.
// الفرض الحقيقي للنطاق في الباك — هنا تسهيل الاختيار وعرض العدد.

import { useMemo, useState } from 'react'
import { Building2, Globe, Layers, Search, Users } from 'lucide-react'

export type OrgTargetLevel = 'company' | 'branch' | 'departments' | 'employees'

export interface OrgTarget {
  level: OrgTargetLevel
  branchId: number | null
  departmentIds: number[]
  employeeIds: number[]
}

export interface OrgPickerBranch { id: number; name: string; isActive?: boolean }
export interface OrgPickerDepartment { id: number; name: string; branchId: number; isActive?: boolean }
export interface OrgPickerEmployee {
  id: number
  fullName: string
  employeeCode?: string
  branchId?: number | null
  departmentId?: number | null
  status?: string
}

export const ORG_TARGET_LEVELS: OrgTargetLevel[] = ['company', 'branch', 'departments', 'employees']

// الموظفين اللي سابوا الشغل مايتستهدفوش
const INACTIVE_STATUSES = new Set(['terminated', 'archived'])
export const isTargetableEmployee = (e: OrgPickerEmployee) => !INACTIVE_STATUSES.has(String(e.status ?? ''))

// قيمة البداية: مستخدم الفرع يبدأ من فرعه كله، وغيره من الشركة كلها
export const initialOrgTarget = (
  lockedBranchId?: number | null,
  levels: OrgTargetLevel[] = ORG_TARGET_LEVELS
): OrgTarget => {
  if (lockedBranchId || !levels.includes('company')) {
    return { level: 'branch', branchId: lockedBranchId ?? null, departmentIds: [], employeeIds: [] }
  }
  return { level: 'company', branchId: null, departmentIds: [], employeeIds: [] }
}

// الموظفين اللي عليهم الاختيار فعلًا (بالترتيب: شركة ← فرع ← أقسام ← موظفين)
export function resolveOrgTarget(target: OrgTarget, employees: OrgPickerEmployee[]): number[] {
  const active = employees.filter(isTargetableEmployee)
  if (target.level === 'company') return active.map((e) => e.id)
  if (target.branchId == null) return []
  const inBranch = active.filter((e) => e.branchId === target.branchId)
  if (target.level === 'branch') return inBranch.map((e) => e.id)
  if (target.level === 'departments') {
    const set = new Set(target.departmentIds)
    return inBranch.filter((e) => e.departmentId != null && set.has(e.departmentId)).map((e) => e.id)
  }
  const set = new Set(target.employeeIds)
  return inBranch.filter((e) => set.has(e.id)).map((e) => e.id)
}

// جملة قصيرة بالاختيار: «فرع القاهرة — قسمين (الموارد البشرية، المبيعات)»
export function describeOrgTarget(
  target: OrgTarget,
  branches: OrgPickerBranch[],
  departments: OrgPickerDepartment[]
): string {
  if (target.level === 'company') return 'الشركة كلها'
  const branch = branches.find((b) => b.id === target.branchId)?.name ?? (target.branchId ? `فرع #${target.branchId}` : 'فرع')
  if (target.level === 'branch') return `${branch} كله`
  if (target.level === 'departments') {
    const names = target.departmentIds.map((id) => departments.find((d) => d.id === id)?.name ?? `قسم #${id}`)
    return names.length ? `${branch} — ${names.join('، ')}` : `${branch} — لسه ما اخترتش أقسام`
  }
  return `${branch} — ${target.employeeIds.length} موظف مختار`
}

const LEVEL_LABELS: Record<Exclude<OrgTargetLevel, 'company'>, { label: string; icon: typeof Building2 }> = {
  branch: { label: 'الفرع كله', icon: Building2 },
  departments: { label: 'أقسام من الفرع', icon: Layers },
  employees: { label: 'موظفين من الفرع', icon: Users },
}

export function OrgTargetPicker({
  value,
  onChange,
  branches,
  departments = [],
  employees = [],
  levels = ORG_TARGET_LEVELS,
  lockedBranchId = null,
  disabled = false,
  showCount = true,
}: {
  value: OrgTarget
  onChange: (next: OrgTarget) => void
  branches: OrgPickerBranch[]
  departments?: OrgPickerDepartment[]
  employees?: OrgPickerEmployee[]
  levels?: OrgTargetLevel[]
  // مستخدم فرع: الشركة كلها مش متاحة، والفرع ثابت
  lockedBranchId?: number | null
  disabled?: boolean
  showCount?: boolean
}) {
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<number | ''>('')
  const allowCompany = levels.includes('company') && !lockedBranchId
  const innerLevels = (['branch', 'departments', 'employees'] as const).filter((l) => levels.includes(l))

  const branchDepartments = useMemo(
    () => departments.filter((d) => d.branchId === value.branchId && d.isActive !== false),
    [departments, value.branchId]
  )
  const branchEmployees = useMemo(
    () => employees.filter((e) => isTargetableEmployee(e) && e.branchId === value.branchId),
    [employees, value.branchId]
  )
  const countIn = (departmentId: number) => branchEmployees.filter((e) => e.departmentId === departmentId).length
  const visibleEmployees = branchEmployees.filter((e) =>
    (departmentFilter === '' || e.departmentId === departmentFilter) &&
    (!query.trim() || e.fullName.includes(query.trim()) ||
      String(e.employeeCode ?? '').toLowerCase().includes(query.trim().toLowerCase()))
  )
  const count = resolveOrgTarget(value, employees).length

  // الخطوة 1: الشركة كلها أو فرع — تغيير الفرع يمسح الأقسام والموظفين المختارين
  const pickScope = (raw: string) => {
    setQuery('')
    setDepartmentFilter('')
    if (raw === 'company') {
      onChange({ level: 'company', branchId: null, departmentIds: [], employeeIds: [] })
      return
    }
    const branchId = raw === '' ? null : Number(raw)
    const level = value.level === 'company' ? (innerLevels[0] ?? 'branch') : value.level
    onChange({ level, branchId, departmentIds: [], employeeIds: [] })
  }

  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const scopeValue = value.level === 'company' ? 'company' : value.branchId == null ? '' : String(value.branchId)

  return (
    <div className="space-y-3" data-org-target-picker>
      {/* 1) الشركة كلها أو فرع */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Globe size={15} className="text-gray-400" /> على مين؟
          </span>
        </label>
        <select
          className="input w-full"
          value={scopeValue}
          disabled={disabled || !!lockedBranchId}
          onChange={(e) => pickScope(e.target.value)}
          aria-label="الشركة أو الفرع"
        >
          {allowCompany && <option value="company">الشركة كلها</option>}
          {!allowCompany && !lockedBranchId && <option value="">— اختار الفرع —</option>}
          {branches
            .filter((b) => b.isActive !== false || b.id === value.branchId)
            .filter((b) => !lockedBranchId || b.id === lockedBranchId)
            .map((b) => (
              <option key={b.id} value={b.id}>
                فرع: {b.name}
              </option>
            ))}
        </select>
        {lockedBranchId ? (
          <p className="text-xs text-gray-400 mt-1">صلاحيتك على فرعك بس</p>
        ) : null}
      </div>

      {/* 2) جوه الفرع: الفرع كله / أقسام / موظفين */}
      {value.level !== 'company' && value.branchId != null && innerLevels.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {innerLevels.map((level) => {
            const { label, icon: Icon } = LEVEL_LABELS[level]
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, level, departmentIds: [], employeeIds: [] })}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                  value.level === level ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 3أ) أقسام الفرع المختار بس */}
      {value.level === 'departments' && value.branchId != null && (
        <div className="border border-gray-200 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
          {branchDepartments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">مفيش أقسام في الفرع ده</p>
          )}
          {branchDepartments.map((d) => (
            <label
              key={d.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                value.departmentIds.includes(d.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300"
                disabled={disabled}
                checked={value.departmentIds.includes(d.id)}
                onChange={() => onChange({ ...value, departmentIds: toggle(value.departmentIds, d.id) })}
              />
              <span className="text-sm text-gray-700">{d.name}</span>
              <span className="text-xs text-gray-400 mr-auto">{countIn(d.id)} موظف</span>
            </label>
          ))}
        </div>
      )}

      {/* 3ب) موظفين الفرع المختار بس */}
      {value.level === 'employees' && value.branchId != null && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input w-full pr-9"
                placeholder="دوّر بالاسم أو الكود..."
                value={query}
                disabled={disabled}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {branchDepartments.length > 0 && (
              <select
                className="input w-44"
                value={departmentFilter === '' ? '' : String(departmentFilter)}
                disabled={disabled}
                onChange={(e) => setDepartmentFilter(e.target.value === '' ? '' : Number(e.target.value))}
                aria-label="فلترة بالقسم"
              >
                <option value="">كل أقسام الفرع</option>
                {branchDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{value.employeeIds.length} مختار</span>
            <button
              type="button"
              className="text-primary-600 hover:underline disabled:opacity-50"
              disabled={disabled || visibleEmployees.length === 0}
              onClick={() => {
                const ids = visibleEmployees.map((e) => e.id)
                const allOn = ids.every((id) => value.employeeIds.includes(id))
                onChange({
                  ...value,
                  employeeIds: allOn
                    ? value.employeeIds.filter((id) => !ids.includes(id))
                    : [...new Set([...value.employeeIds, ...ids])],
                })
              }}
            >
              {visibleEmployees.length > 0 && visibleEmployees.every((e) => value.employeeIds.includes(e.id))
                ? 'شيل تحديد الظاهرين'
                : 'حدد الظاهرين'}
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
            {visibleEmployees.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">مفيش موظفين مطابقين</p>
            )}
            {visibleEmployees.map((e) => (
              <label
                key={e.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                  value.employeeIds.includes(e.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={disabled}
                  checked={value.employeeIds.includes(e.id)}
                  onChange={() => onChange({ ...value, employeeIds: toggle(value.employeeIds, e.id) })}
                />
                <span className="text-sm text-gray-700">{e.fullName}</span>
                <span className="text-xs text-gray-400 mr-auto">
                  {departments.find((d) => d.id === e.departmentId)?.name ?? ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {showCount && (value.level !== 'company' ? value.branchId != null : true) && (
        <p className="text-xs text-gray-500" data-org-target-count={count}>
          {describeOrgTarget(value, branches, departments)} — ينطبق على <b>{count}</b> موظف
        </p>
      )}
    </div>
  )
}

export default OrgTargetPicker
