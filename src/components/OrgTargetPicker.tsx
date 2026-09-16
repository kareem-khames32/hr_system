'use client'

// منتقي الاستهداف الموحّد — ترتيب واحد في كل النظام:
// الشركة كلها ← فرع ← أقسام الفرع ده ← فرق الفرع ده ← موظفين من الفرع ده.
// اختيار الفرع بيحمّل أقسامه وفرقه وموظفينه بس، والفرق بتتفلتر بالأقسام المختارة.
// الشاشة بتحدد المستويات المسموحة (مثلًا فترات الإضافي: الشركة أو فرع بس)،
// ومستخدم الفرع بيتقفل على فرعه. مستوى الفرق بيظهر لما الشاشة تبعت الفرق (teams).
// الفرض الحقيقي للنطاق في الباك — هنا تسهيل الاختيار وعرض العدد.

import { useMemo, useState } from 'react'
import { Building2, Globe, Layers, Search, Users, UsersRound } from 'lucide-react'

export type OrgTargetLevel = 'company' | 'branch' | 'departments' | 'teams' | 'employees'

export interface OrgTarget {
  level: OrgTargetLevel
  branchId: number | null
  departmentIds: number[]
  // الفرق المختارة (مستوى «فرق من الفرع») — اختيارية عشان القيم القديمة تفضل شغالة
  teamIds?: number[]
  employeeIds: number[]
}

export interface OrgPickerBranch { id: number; name: string; isActive?: boolean }
export interface OrgPickerDepartment { id: number; name: string; branchId: number; isActive?: boolean }
export interface OrgPickerTeam { id: number; name: string; departmentId: number; isActive?: boolean }
export interface OrgPickerEmployee {
  id: number
  fullName: string
  employeeCode?: string
  branchId?: number | null
  departmentId?: number | null
  teamId?: number | null
  status?: string
}

export const ORG_TARGET_LEVELS: OrgTargetLevel[] = ['company', 'branch', 'departments', 'teams', 'employees']

// الموظفين اللي سابوا الشغل مايتستهدفوش
const INACTIVE_STATUSES = new Set(['terminated', 'archived'])
export const isTargetableEmployee = (e: OrgPickerEmployee) => !INACTIVE_STATUSES.has(String(e.status ?? ''))

// قيمة البداية: مستخدم الفرع يبدأ من فرعه كله، وغيره من الشركة كلها
export const initialOrgTarget = (
  lockedBranchId?: number | null,
  levels: OrgTargetLevel[] = ORG_TARGET_LEVELS
): OrgTarget => {
  if (lockedBranchId || !levels.includes('company')) {
    return { level: 'branch', branchId: lockedBranchId ?? null, departmentIds: [], teamIds: [], employeeIds: [] }
  }
  return { level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [] }
}

// فرق الفرع (فرع الفريق = فرع قسمه)، ولو فيه أقسام مختارة: فرق الأقسام دي بس
export function teamsOfBranch(
  teams: OrgPickerTeam[],
  departments: OrgPickerDepartment[],
  branchId: number | null,
  departmentIds: number[] = []
): OrgPickerTeam[] {
  if (branchId == null) return []
  const branchDeps = new Set(departments.filter((d) => d.branchId === branchId).map((d) => d.id))
  const chosen = new Set(departmentIds)
  return teams.filter((t) => t.isActive !== false && branchDeps.has(t.departmentId) && (chosen.size === 0 || chosen.has(t.departmentId)))
}

// الموظفين اللي عليهم الاختيار فعلًا (بالترتيب: شركة ← فرع ← أقسام ← فرق ← موظفين)
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
  if (target.level === 'teams') {
    const set = new Set(target.teamIds ?? [])
    return inBranch.filter((e) => e.teamId != null && set.has(e.teamId)).map((e) => e.id)
  }
  const set = new Set(target.employeeIds)
  return inBranch.filter((e) => set.has(e.id)).map((e) => e.id)
}

// جملة قصيرة بالاختيار: «فرع القاهرة — قسمين (الموارد البشرية، المبيعات)»
export function describeOrgTarget(
  target: OrgTarget,
  branches: OrgPickerBranch[],
  departments: OrgPickerDepartment[],
  teams: OrgPickerTeam[] = []
): string {
  if (target.level === 'company') return 'الشركة كلها'
  const branch = branches.find((b) => b.id === target.branchId)?.name ?? (target.branchId ? `فرع #${target.branchId}` : 'فرع')
  if (target.level === 'branch') return `${branch} كله`
  if (target.level === 'departments') {
    const names = target.departmentIds.map((id) => departments.find((d) => d.id === id)?.name ?? `قسم #${id}`)
    return names.length ? `${branch} — ${names.join('، ')}` : `${branch} — لسه ما اخترتش أقسام`
  }
  if (target.level === 'teams') {
    const names = (target.teamIds ?? []).map((id) => teams.find((t) => t.id === id)?.name ?? `فريق #${id}`)
    return names.length ? `${branch} — فرق: ${names.join('، ')}` : `${branch} — لسه ما اخترتش فرق`
  }
  return `${branch} — ${target.employeeIds.length} موظف مختار`
}

const LEVEL_LABELS: Record<Exclude<OrgTargetLevel, 'company'>, { label: string; icon: typeof Building2 }> = {
  branch: { label: 'الفرع كله', icon: Building2 },
  departments: { label: 'أقسام من الفرع', icon: Layers },
  teams: { label: 'فرق من الفرع', icon: UsersRound },
  employees: { label: 'موظفين من الفرع', icon: Users },
}

export function OrgTargetPicker({
  value,
  onChange,
  branches,
  departments = [],
  teams,
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
  // من غير فرق مستوى «فرق من الفرع» مابيظهرش (الشاشات القديمة زي ما هي)
  teams?: OrgPickerTeam[]
  employees?: OrgPickerEmployee[]
  levels?: OrgTargetLevel[]
  // مستخدم فرع: الشركة كلها مش متاحة، والفرع ثابت
  lockedBranchId?: number | null
  disabled?: boolean
  showCount?: boolean
}) {
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<number | ''>('')
  const [teamFilter, setTeamFilter] = useState<number | ''>('')
  const allowCompany = levels.includes('company') && !lockedBranchId
  const innerLevels = (['branch', 'departments', 'teams', 'employees'] as const)
    .filter((l) => levels.includes(l) && (l !== 'teams' || teams !== undefined))
  const teamIds = value.teamIds ?? []
  const allTeams = teams ?? []

  const branchDepartments = useMemo(
    () => departments.filter((d) => d.branchId === value.branchId && d.isActive !== false),
    [departments, value.branchId]
  )
  const branchTeams = useMemo(
    () => teamsOfBranch(allTeams, departments, value.branchId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams, departments, value.branchId]
  )
  // الفرق الظاهرة في مستوى الفرق: متفلترة بالأقسام المختارة لو فيه
  const pickableTeams = branchTeams.filter((t) => value.departmentIds.length === 0 || value.departmentIds.includes(t.departmentId))
  // فلتر الفرق في مستوى الموظفين: فرق القسم المختار في الفلتر
  const filterTeams = branchTeams.filter((t) => departmentFilter === '' || t.departmentId === departmentFilter)
  const branchEmployees = useMemo(
    () => employees.filter((e) => isTargetableEmployee(e) && e.branchId === value.branchId),
    [employees, value.branchId]
  )
  const countIn = (departmentId: number) => branchEmployees.filter((e) => e.departmentId === departmentId).length
  const countInTeam = (teamId: number) => branchEmployees.filter((e) => e.teamId === teamId).length
  const visibleEmployees = branchEmployees.filter((e) =>
    (departmentFilter === '' || e.departmentId === departmentFilter) &&
    (teamFilter === '' || e.teamId === teamFilter) &&
    (!query.trim() || e.fullName.includes(query.trim()) ||
      String(e.employeeCode ?? '').toLowerCase().includes(query.trim().toLowerCase()))
  )
  const count = resolveOrgTarget(value, employees).length

  // الخطوة 1: الشركة كلها أو فرع — تغيير الفرع يمسح الأقسام والفرق والموظفين المختارين
  const pickScope = (raw: string) => {
    setQuery('')
    setDepartmentFilter('')
    setTeamFilter('')
    if (raw === 'company') {
      onChange({ level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [] })
      return
    }
    const branchId = raw === '' ? null : Number(raw)
    const level = value.level === 'company' ? (innerLevels[0] ?? 'branch') : value.level
    onChange({ level, branchId, departmentIds: [], teamIds: [], employeeIds: [] })
  }

  // الأقسام المختارة بتفضل لما تنقل بين «أقسام» و«فرق» (الفرق متفلترة بيها)
  const pickLevel = (level: OrgTargetLevel) => {
    const keepDeps = (level === 'departments' || level === 'teams') && (value.level === 'departments' || value.level === 'teams')
    onChange({ ...value, level, departmentIds: keepDeps ? value.departmentIds : [], teamIds: [], employeeIds: [] })
  }

  // اختيار قسم في مستوى الفرق: الفرق اللي برا الأقسام المختارة بتتشال
  const toggleTeamDepartment = (departmentId: number) => {
    const departmentIds = toggle(value.departmentIds, departmentId)
    const kept = departmentIds.length === 0
      ? teamIds
      : teamIds.filter((id) => departmentIds.includes(allTeams.find((t) => t.id === id)?.departmentId ?? -1))
    onChange({ ...value, departmentIds, teamIds: kept })
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

      {/* 2) جوه الفرع: الفرع كله / أقسام / فرق / موظفين */}
      {value.level !== 'company' && value.branchId != null && innerLevels.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {innerLevels.map((level) => {
            const { label, icon: Icon } = LEVEL_LABELS[level]
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                onClick={() => pickLevel(level)}
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

      {/* 3ب) فرق الفرع المختار — ولو اخترت أقسام: فرقها بس */}
      {value.level === 'teams' && value.branchId != null && (
        <div className="space-y-2" data-org-target-teams>
          {branchDepartments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-gray-500">الأقسام (اختياري):</span>
              {branchDepartments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTeamDepartment(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    value.departmentIds.includes(d.id) ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
          <div className="border border-gray-200 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
            {pickableTeams.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">
                {value.departmentIds.length ? 'مفيش فرق في الأقسام المختارة' : 'مفيش فرق في الفرع ده'}
              </p>
            )}
            {pickableTeams.map((t) => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                  teamIds.includes(t.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={disabled}
                  checked={teamIds.includes(t.id)}
                  onChange={() => onChange({ ...value, teamIds: toggle(teamIds, t.id) })}
                />
                <span className="text-sm text-gray-700">{t.name}</span>
                <span className="text-xs text-gray-400">{departments.find((d) => d.id === t.departmentId)?.name ?? ''}</span>
                <span className="text-xs text-gray-400 mr-auto">{countInTeam(t.id)} موظف</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3ج) موظفين الفرع المختار بس — فلترة بالقسم ثم الفريق */}
      {value.level === 'employees' && value.branchId != null && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
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
                className="input w-40"
                value={departmentFilter === '' ? '' : String(departmentFilter)}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.value === '' ? '' : Number(e.target.value)
                  setDepartmentFilter(next)
                  if (next !== '' && teamFilter !== '' && allTeams.find((t) => t.id === teamFilter)?.departmentId !== next) setTeamFilter('')
                }}
                aria-label="فلترة بالقسم"
              >
                <option value="">كل أقسام الفرع</option>
                {branchDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {innerLevels.includes('teams') && filterTeams.length > 0 && (
              <select
                className="input w-40"
                value={teamFilter === '' ? '' : String(teamFilter)}
                disabled={disabled}
                onChange={(e) => setTeamFilter(e.target.value === '' ? '' : Number(e.target.value))}
                aria-label="فلترة بالفريق"
              >
                <option value="">{departmentFilter === '' ? 'كل فرق الفرع' : 'كل فرق القسم'}</option>
                {filterTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
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
                  {[departments.find((d) => d.id === e.departmentId)?.name, allTeams.find((t) => t.id === e.teamId)?.name]
                    .filter(Boolean)
                    .join(' — ')}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {showCount && (value.level !== 'company' ? value.branchId != null : true) && (
        <p className="text-xs text-gray-500" data-org-target-count={count}>
          {describeOrgTarget(value, branches, departments, allTeams)} — ينطبق على <b>{count}</b> موظف
        </p>
      )}
    </div>
  )
}

export default OrgTargetPicker
