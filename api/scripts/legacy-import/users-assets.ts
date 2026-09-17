// ===== مجال الحسابات والعهد (users-assets) =====
// حسابات الدخول (مربوطة بالموظف + الدور + نطاق الفرع + تجاوزات الصلاحيات) وأنواع الأصول والأصول وسجل العهد.
// المواصفة: mapping-users-docs-assets.md (مكتوبة من مخطط القاعدة — هنا نقرأ مخرجات الـAPI: UserResource وroles
// وAssetTypeResource وEmployeeAssetResource وحركات الأصل).
// - كلمات المرور غير متاحة: هاش bcrypt لسر عشوائي + تنبيه لكل حساب (المالك يعيد التعيين).
// - حساب مدير النظام الحالي عندنا لا يُلمس: لو بريد حساب قديم يطابقه يُربط المعرّف القديم به فقط.
// - المستندات في النظام القديم مربوطة دائمًا بموظف (documents.employee_id NOT NULL) ⇒ مجال الموظفين؛ لا مستندات هنا.
// - لا بيانات شخصية في التنبيهات: المعرّف القديم + وصف عام (أسماء الصلاحيات ليست بيانات شخصية).

import { readRaw, readRawEach, unusablePasswordHash, type Ctx, type Source } from './framework'
import { User } from '../../src/auth/user.entity'
import { Role, UserPermissionOverride } from '../../src/auth/role.entity'
import { ALL_PERMISSIONS, SUPER_ADMIN_ONLY_GRANTS } from '../../src/auth/permissions'
import { AssetType } from '../../src/assets/assets.entities'
import { Asset, type AssetStatus, type CustodyStatus } from '../../src/requests/entities/custody.entities'

export const DOMAIN = 'users-assets'
export const DEPENDS_ON: string[] = ['org', 'employees']

export const SOURCES: Source[] = [
  // UserResource: id, name, email, is_active, role (أول دور), permissions (دور + مباشرة), two_factor_enabled, auth_source, last_login_at
  { key: 'users', path: 'users', paginated: true, params: { per_page: 200 } },
  // التفاصيل تضيف branches (branch_user) — القائمة لا تحمّلها
  { key: 'user-details', path: 'users/{id}', each: { from: 'users' } },
  // [{id, name, scope_level, permissions:[{id,name}]}] — غير مُقسّم
  { key: 'roles', path: 'roles' },
  // AssetTypeResource[] — غير مُقسّم
  { key: 'asset-types', path: 'assets/types' },
  // ربط الحساب بالموظف (EmployeeResource.user_id) + عهد كل موظف. القائمة بلا status تستبعد المؤرشفين ⇒ مصدران
  { key: 'ua-employees', path: 'employees', paginated: true, params: { per_page: 200 } },
  { key: 'ua-employees-archived', path: 'employees', paginated: true, params: { per_page: 200, status: 'archived' } },
  { key: 'employee-assets', path: 'employees/{id}/assets', each: { from: 'ua-employees' } },
  { key: 'employee-assets-archived', path: 'employees/{id}/assets', each: { from: 'ua-employees-archived' } },
  // حركات كل عهدة: منفّذ الإسناد (actor_user_id) + ربط التحويلات بلا رقم تسلسلي
  { key: 'asset-movements', path: 'assets/{id}/movements', each: { from: 'employee-assets' } },
  { key: 'asset-movements-archived', path: 'assets/{id}/movements', each: { from: 'employee-assets-archived' } },
]

// ===================== أنواع مخرجات الـAPI القديم =====================

type Id = number | string
type LegacyUser = {
  id: Id
  name?: string | null
  email?: string | null
  is_active?: unknown
  role?: string | null
  permissions?: unknown
  branches?: Array<{ id: Id; name?: string | null }> | null
  two_factor_enabled?: unknown
  auth_source?: string | null
  last_login_at?: string | null
}
type LegacyRole = { id: Id; name: string; scope_level?: string | null; permissions?: Array<{ id?: Id; name: string } | string> }
type LegacyEmployee = { id: Id; employee_number?: string | null; user_id?: Id | null; name_ar?: string | null; name?: string | null }
type LegacyAssetType = { id: Id; name_ar?: string | null; name_en?: string | null; code?: string | null; value?: unknown; is_active?: unknown }
type LegacyEmployeeAsset = {
  id: Id
  employee_id?: Id | null
  asset_type_id?: Id | null
  identifier?: string | null
  status?: string | null
  condition?: string | null
  value?: unknown
  assigned_at?: string | null
  returned_at?: string | null
  notes?: string | null
  asset_type?: LegacyAssetType | null
  created_at?: string | null
}
type LegacyMovement = { id: Id; movement_type?: string | null; from_employee_id?: Id | null; to_employee_id?: Id | null; actor_user_id?: Id | null; occurred_at?: string | null }

// ===================== أدوات صغيرة =====================

const truthy = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true'
const str = (v: unknown): string => (v == null ? '' : String(v).trim())
const cut = (s: string, n: number): string => (s.length > n ? s.slice(0, n) : s)
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// الـAPI يرسل UTC (ISO بـZ، أو «Y-m-d H:i:s» بتوقيت UTC). Date ⇒ درايفر mssql يكتبها بالتوقيت المحلي (useUTC=false)
function legacyDate(v: unknown): Date | null {
  const s = str(v)
  if (!s) return null
  let d: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(`${s}T00:00:00Z`)
  else if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) d = new Date(s)
  else d = new Date(`${s.replace(' ', 'T')}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function idFrom(ctx: Ctx, kinds: string[], legacyId: unknown): number | undefined {
  const s = str(legacyId)
  if (!s) return undefined
  for (const k of kinds) {
    const v = ctx.ids.get(k, s)
    if (v) return v
  }
  return undefined
}

const permNames = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((p) => (typeof p === 'string' ? p : str((p as { name?: unknown })?.name))).filter(Boolean) : []

// ===================== ترجمة الصلاحيات (المواصفة §2.4) =====================

const P = (...perms: string[]) => perms
const PERM_MAP: Record<string, string[]> = {
  'employees:read': P('employees.view'), 'employees:export': P('employees.view'),
  'employees:create': P('employees.create'), 'employees:import': P('employees.create'),
  'employees:update': P('employees.edit'),
  'employees:delete': P('employees.archive'), 'employees:restore': P('employees.archive'),
  'documents:read': P('documents.manage'), 'documents:upload': P('documents.manage'), 'documents:delete': P('documents.manage'),
  'users:read': P('users.manage'), 'users:create': P('users.manage'), 'users:update': P('users.manage'), 'users:delete': P('users.manage'),
  'settings:roles:manage': P('roles.manage'), 'settings:permissions:manage': P('roles.manage'),
  'settings:branches:manage': P('org.manage'), 'settings:departments:manage': P('org.manage'), 'settings:teams:manage': P('org.manage'),
  'settings:job_titles:manage': P('org.manage'), 'settings:grades:manage': P('org.manage'), 'cost_centers:manage': P('org.manage'),
  'settings:manage': P('settings.manage'), 'settings:general:update': P('settings.manage'), 'settings:lookups:manage': P('settings.manage'),
  'settings:work_days:manage': P('settings.manage'), 'settings:policies:manage': P('settings.manage'),
  'settings:document_templates:manage': P('settings.manage'),
  'leave_types:create': P('settings.manage'), 'leave_types:update': P('settings.manage'), 'leave_types:delete': P('settings.manage'),
  'holidays:create': P('settings.manage'), 'holidays:update': P('settings.manage'), 'holidays:delete': P('settings.manage'),
  'notification:manage': P('settings.manage'), 'allowances:manage': P('settings.manage'), 'gosi:manage': P('settings.manage'),
  'formulas:manage': P('settings.manage'),
  'approvals:read': P('requests.view_all'), 'approvals:oversee': P('requests.view_all'),
  'approvals:submit_on_behalf': P('requests.create_on_behalf'), 'leaves:create': P('requests.create_on_behalf'),
  'exit_permits:create': P('requests.create_on_behalf'), 'loans:create': P('requests.create_on_behalf'),
  'approvals:manage': P('request_types.manage', 'approval_chains.manage'),
  'attendance:read': P('attendance.view_all'), 'attendance_reports:read': P('attendance.view_all'),
  'overtime:read': P('attendance.view_all'), 'exit_permits:read': P('attendance.view_all'),
  'attendance:create': P('attendance.manage'), 'attendance:update': P('attendance.manage'),
  'attendance:delete': P('attendance.manage'), 'attendance:configure': P('attendance.manage'),
  'biometric:manage': P('attendance.sync'),
  'overtime:manage': P('overtime.confirm'),
  'attendance:exemption:read': P('attendance_exemption.view'), 'attendance:exemption:manage': P('attendance_exemption.manage'),
  'leaves:read': P('leaves.view_all'), 'leave_balances:read': P('leaves.view_all'), 'leave_conflicts:read': P('leaves.view_all'),
  'leave_balances:adjust': P('leave_balances.manage'),
  'leave_conflicts:resolve': P('leaves.revoke'),
  'payroll:read': P('payroll.view'), 'payroll:export': P('payroll.view'), 'payroll:flags:read': P('payroll.view'),
  'payroll:parity:read': P('payroll.view'), 'payroll:policy:read': P('payroll.view'), 'loans:read': P('payroll.view'),
  'payroll:process': P('payroll.calculate'), 'payroll:parity:run': P('payroll.calculate'), 'payroll:flags:manage': P('payroll.calculate'),
  'payroll:approve': P('payroll.approve', 'payroll.pay'), 'payroll:rollout:approve': P('payroll.approve', 'payroll.pay'),
  'payroll:policy:manage': P('payroll.policy.manage'), 'payroll:policy:simulate': P('payroll.policy.manage'),
  'payroll:cost_allocation:manage': P('payroll.policy.manage'),
  'payroll:exemption:read': P('financial_exemption.view'), 'payroll:exemption:grant': P('financial_exemption.grant'),
  'loans:exceptional': P('loans.exceptional'), 'loans:settle': P('loans.repay'), 'loans:policy:manage': P('loans.policies'),
  'loans:write_off': P('loans.write_off'),
  'bonuses:create': P('bonuses.manage'), 'bonuses:approve': P('bonuses.approve'),
  'deductions:read': P('deductions.view'), 'deductions:manage': P('deductions.manage'), 'deductions:approve': P('deductions.approve'),
  'assets:read': P('custody.assign'), 'assets:manage': P('custody.assign'),
  'assets:clear': P('approve.custody'),
  'offboarding:manage': P('offboarding.manage'),
  'recruitment:read': P('candidates.manage'), 'recruitment:manage': P('candidates.manage'),
  'report:view': P('reports.view'), 'report:export': P('reports.view'), 'report:manage': P('reports.view'),
  'dashboard:statistics': P('dashboard.view_all'), 'dashboard:attendance': P('dashboard.view_all'),
  'dashboard:payroll': P('dashboard.view_all'), 'dashboard:recruitment': P('dashboard.view_all'),
  'calendar:manage': P('calendar.view_all'),
}
const PERM_PREFIX_MAP: Array<[string, string[]]> = [
  ['shifts:', P('attendance.manage')], ['schedules:', P('attendance.manage')],
  ['working_day_patterns:', P('attendance.manage')], ['attendance_calendars:', P('attendance.manage')],
]
// ضمنية عندنا (خدمة ذاتية/قراءة مفتوحة) أو يحددها مسار الاعتماد — تُتجاهل بلا تنبيه
const PERM_IMPLICIT = new Set([
  'employees:profile:read_own', 'payslip:read_own', 'dashboard:view', 'calendar:view', 'settings:read',
  'leave_types:read', 'holidays:read', 'cost_centers:read', 'allowances:read', 'gosi:read', 'formulas:read',
  'employees:salary:read', 'employees:salary:update', 'employees:pii:read',
  'approvals:act', 'leaves:approve', 'leaves:reject', 'exit_permits:approve', 'overtime:approve', 'approvals:override',
])
const isImplicit = (p: string) => PERM_IMPLICIT.has(p) || p.startsWith('messaging:') || (p.startsWith('settings:') && p.endsWith(':read'))

const KNOWN_TARGET = new Set(ALL_PERMISSIONS)
const SA_ONLY = new Set(SUPER_ADMIN_ONLY_GRANTS)

function translatePerms(source: string[]): { perms: Set<string>; unmapped: string[] } {
  const perms = new Set<string>()
  const unmapped: string[] = []
  for (const p of source) {
    const mapped = PERM_MAP[p] ?? PERM_PREFIX_MAP.find(([prefix]) => p.startsWith(prefix))?.[1]
    if (mapped) for (const t of mapped) if (KNOWN_TARGET.has(t)) perms.add(t)
    if (!mapped && !isImplicit(p)) unmapped.push(p)
  }
  return { perms, unmapped: [...new Set(unmapped)].sort() }
}

// ===================== الأدوار (المواصفة §2.3) =====================

const ROLE_DIRECT: Record<string, string> = {
  super_admin: 'super_admin', hr_manager: 'hr_manager', branch_manager: 'branch_manager', employee: 'employee',
  manager: 'employee', // المدير المباشر عندنا من الهيكل لا من الدور (سؤال مفتوح Q4)
}
const ROLE_NAME_AR: Record<string, string> = {
  data_entry: 'مدخل بيانات', payroll_manager: 'مدير الرواتب', recruitment_manager: 'مسؤول التوظيف', read_only: 'قراءة فقط',
}
type Scope = 'self' | 'team' | 'branch' | 'global'
function scopeOf(role: LegacyRole | undefined, name: string): Scope {
  if (name === 'super_admin') return 'global'
  const stored = str(role?.scope_level)
  if (stored === 'self' || stored === 'team' || stored === 'branch' || stored === 'global') return stored
  if (['hr_manager', 'data_entry', 'branch_manager'].includes(name)) return 'branch'
  return name === 'manager' ? 'team' : 'self'
}
const roleCodeFor = (name: string, legacyId: Id): string => {
  const code = cut(name.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''), 30).replace(/_$/, '')
  return /^[a-z]/.test(code) ? code : cut(`legacy_role_${legacyId}`, 30)
}

// ===================== التشغيل =====================

export async function run(ctx: Ctx): Promise<void> {
  const { em } = ctx

  // ---------- موظفو النظام القديم: ربط user_id ← الموظف ----------
  const legacyEmployees = new Map<string, LegacyEmployee>()
  for (const key of ['ua-employees', 'ua-employees-archived', 'employees'])
    for (const e of readRaw<LegacyEmployee>(key)) if (e && e.id != null && !legacyEmployees.has(String(e.id))) legacyEmployees.set(String(e.id), e)
  const empOfUser = new Map<string, string>()
  for (const e of legacyEmployees.values()) if (str(e.user_id)) empOfUser.set(str(e.user_id), String(e.id))

  const targetEmployees: Array<{ id: number; employeeCode: string | null; branchId: number | null }> = await em.query(
    'SELECT id, employeeCode, branchId FROM employees',
  )
  const empById = new Map(targetEmployees.map((e) => [e.id, e]))
  const empByCode = new Map(targetEmployees.filter((e) => str(e.employeeCode)).map((e) => [str(e.employeeCode).toUpperCase(), e.id]))
  const resolveEmployee = (legacyEmpId: unknown): number | undefined => {
    const mapped = idFrom(ctx, ['employee', 'employees'], legacyEmpId)
    if (mapped) return mapped
    const code = str(legacyEmployees.get(str(legacyEmpId))?.employee_number).toUpperCase()
    if (!code) return undefined
    return empByCode.get(code) ?? (/^\d+$/.test(code) ? empByCode.get(`EMP-${code.padStart(4, '0')}`) : undefined)
  }

  const targetBranches: Array<{ id: number; name: string | null }> = await em.query('SELECT id, name FROM branches')
  const branchByName = new Map(targetBranches.filter((b) => str(b.name)).map((b) => [str(b.name), b.id]))
  const resolveBranch = (b: { id: Id; name?: string | null }): number | undefined =>
    idFrom(ctx, ['branch', 'branches'], b.id) ?? (str(b.name) ? branchByName.get(str(b.name)) : undefined)

  // ---------- الأدوار ----------
  const legacyRoles = readRaw<LegacyRole>('roles').filter((r) => r && str(r.name))
  const legacyRoleByName = new Map(legacyRoles.map((r) => [str(r.name), r]))
  const targetRoles = new Map<string, { id: number; perms: string[] }>()
  for (const r of (await em.query('SELECT id, code, permissions FROM roles')) as Array<{ id: number; code: string; permissions: string | null }>) {
    let perms: string[] = []
    try {
      const parsed = JSON.parse(r.permissions || '[]')
      perms = Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      perms = []
    }
    targetRoles.set(r.code, { id: r.id, perms })
  }

  const roleCodeByLegacyName = new Map<string, string>()
  for (const role of [...legacyRoles].sort((a, b) => Number(a.id) - Number(b.id))) {
    const name = str(role.name)
    const { perms, unmapped } = translatePerms(permNames(role.permissions))
    if (unmapped.length) ctx.flag('ROLE_PERMISSIONS_UNMAPPED', role.id, `صلاحيات بلا مقابل عندنا لم تُنقل: ${unmapped.join(', ')}`)

    const direct = ROLE_DIRECT[name]
    if (direct) {
      roleCodeByLegacyName.set(name, direct)
      const existing = targetRoles.get(direct)
      if (existing) ctx.ids.set('role', role.id, existing.id)
      if (name === 'manager') ctx.flag('ROLE_MANAGER_AS_EMPLOYEE', role.id, 'دور «manager» صار «موظف»؛ اعتماداته من الهيكل التنظيمي (مدير مباشر)')
      else if (existing && !existing.perms.includes('*')) {
        const missing = [...perms].filter((p) => !existing.perms.includes(p))
        if (missing.length) ctx.flag('ROLE_SYSTEM_PRESET_KEPT', role.id, `الدور المدمج لم يُعدّل؛ صلاحيات كانت له في القديم وليست في الدور عندنا: ${missing.sort().join(', ')}`)
      }
      ctx.count('role_mapped')
      continue
    }

    const code = roleCodeFor(name, role.id)
    roleCodeByLegacyName.set(name, code)
    const existing = targetRoles.get(code)
    if (existing) {
      ctx.ids.set('role', role.id, existing.id)
      ctx.flag('ROLE_EXISTS_REUSED', role.id, 'دور بنفس الكود موجود عندنا — استُخدم كما هو دون تعديل صلاحياته')
      ctx.count('role_mapped')
      continue
    }
    const saOnly = [...perms].filter((p) => SA_ONLY.has(p)).sort()
    const granted = [...perms].filter((p) => !SA_ONLY.has(p)).sort()
    if (saOnly.length) ctx.flag('ROLE_SUPER_ADMIN_ONLY_SKIPPED', role.id, `صلاحيات حصرية لمدير النظام لم تُمنح للدور (سؤال مفتوح Q5): ${saOnly.join(', ')}`)
    const saved = await em.save(
      em.create(Role, { code, nameAr: cut(ROLE_NAME_AR[name] ?? name, 100), permissions: JSON.stringify(granted), isSystem: false, isActive: true }),
    )
    targetRoles.set(code, { id: saved.id, perms: granted })
    ctx.ids.set('role', role.id, saved.id)
    ctx.count('role_created')
  }

  // ---------- الحسابات ----------
  const details = new Map(readRaw<LegacyUser>('user-details').filter((u) => u && u.id != null).map((u) => [String(u.id), u]))
  const legacyUsers = new Map<string, LegacyUser>()
  for (const u of readRaw<LegacyUser>('users')) if (u && u.id != null) legacyUsers.set(String(u.id), { ...u, ...(details.get(String(u.id)) ?? {}) })
  for (const [id, u] of details) if (!legacyUsers.has(id)) legacyUsers.set(id, u)

  const existingUsers: Array<{ id: number; email: string; role: string; employeeId: number | null }> = await em.query(
    'SELECT id, email, role, employeeId FROM users',
  )
  const userByEmail = new Map(existingUsers.map((u) => [str(u.email).toLowerCase(), u]))
  const userByEmployee = new Map(existingUsers.filter((u) => u.employeeId).map((u) => [u.employeeId as number, u]))
  const employeeOfTargetUser = new Map(existingUsers.map((u) => [u.id, u.employeeId]))

  for (const u of [...legacyUsers.values()].sort((a, b) => Number(a.id) - Number(b.id))) {
    if (ctx.ids.get('user', u.id)) {
      ctx.count('user_already_mapped')
      continue
    }
    const legacyEmpId = empOfUser.get(String(u.id))
    const employeeId = legacyEmpId ? resolveEmployee(legacyEmpId) : undefined
    if (legacyEmpId && !employeeId) ctx.flag('USER_EMPLOYEE_NOT_IMPORTED', u.id, 'الحساب مربوط بموظف لم يُستورد — أُنشئ بلا ربط')

    // حساب موجود عندنا لنفس الموظف (مثلًا أنشأه مجال آخر) ⇒ ربط فقط
    const sameEmployee = employeeId ? userByEmployee.get(employeeId) : undefined
    if (sameEmployee) {
      ctx.ids.set('user', u.id, sameEmployee.id)
      ctx.flag('USER_EXISTS_FOR_EMPLOYEE', u.id, 'يوجد حساب للموظف نفسه — رُبط المعرّف القديم به دون تعديل')
      ctx.count('user_linked_existing')
      continue
    }

    let email = str(u.email).toLowerCase()
    if (!email || email.length > 200 || !/^[^@\s]+@[^@\s]+$/.test(email)) {
      email = `legacy-user-${u.id}@invalid.local`
      ctx.flag('USER_EMAIL_MISSING', u.id, 'بريد فارغ أو غير صالح — استُخدم بريد مؤقت')
    }
    const sameEmail = userByEmail.get(email)
    if (sameEmail) {
      // يشمل حساب مدير النظام الحالي: لا يُلمس، فقط يُربط به المعرّف القديم
      ctx.ids.set('user', u.id, sameEmail.id)
      ctx.flag('USER_EMAIL_EXISTS_LINKED', u.id, `البريد مستخدم لحساب قائم (${sameEmail.role === 'super_admin' ? 'مدير النظام' : 'حساب آخر'}) — رُبط به دون تعديل`)
      ctx.count('user_linked_existing')
      continue
    }

    const legacyRoleName = str(u.role)
    let role = legacyRoleName ? roleCodeByLegacyName.get(legacyRoleName) : undefined
    if (legacyRoleName && !role) role = ROLE_DIRECT[legacyRoleName]
    if (!role || !targetRoles.has(role)) {
      ctx.flag('USER_ROLE_UNMAPPED', u.id, legacyRoleName ? 'دور غير معروف عندنا — أُعطي «موظف»' : 'حساب بلا دور — أُعطي «موظف»')
      role = 'employee'
    }
    const scope = scopeOf(legacyRoleByName.get(legacyRoleName), legacyRoleName || 'employee')

    // نطاق الفرع (المواصفة §1.3)
    const employeeBranch = employeeId ? empById.get(employeeId)?.branchId ?? undefined : undefined
    const legacyBranches = Array.isArray(u.branches) ? u.branches.filter((b) => b && b.id != null) : []
    const mappedBranches = [...new Set(legacyBranches.map(resolveBranch).filter((b): b is number => !!b))].sort((a, b) => a - b)
    if (legacyBranches.length > mappedBranches.length) ctx.flag('USER_BRANCH_NOT_MAPPED', u.id, 'فرع مسند للحساب لم يُستورد')
    if (!Array.isArray(u.branches) && scope !== 'self' && scope !== 'team' && role !== 'super_admin')
      ctx.flag('USER_BRANCHES_UNKNOWN', u.id, 'تفاصيل الحساب (الفروع) غير مستخرجة — استُخدم فرع الموظف')
    let branchId: number | null = null
    if (role === 'super_admin') branchId = null
    else if (scope === 'self' || scope === 'team') branchId = employeeBranch ?? mappedBranches[0] ?? null
    else if (scope === 'global') {
      branchId = employeeBranch ?? mappedBranches[0] ?? null
      ctx.flag('USER_COMPANY_WIDE_SCOPE', u.id, 'كان يرى كل الشركة في القديم — عندنا مقفول على فرع الموظف أو بلا نطاق (سؤال مفتوح)')
    } else if (mappedBranches.length === 1) branchId = mappedBranches[0]
    else if (mappedBranches.length > 1) {
      branchId = employeeBranch && mappedBranches.includes(employeeBranch) ? employeeBranch : mappedBranches[0]
      ctx.flag('USER_MULTI_BRANCH', u.id, `الحساب يرى ${mappedBranches.length} فروع في القديم — عندنا فرع واحد فقط`)
    } else {
      branchId = employeeBranch ?? null
      if (Array.isArray(u.branches) && legacyBranches.length === 0)
        ctx.flag('USER_COMPANY_WIDE_SCOPE', u.id, 'كان يرى كل الشركة في القديم — عندنا مقفول على فرع الموظف أو بلا نطاق (سؤال مفتوح)')
    }
    if (branchId == null && role !== 'super_admin' && role !== 'employee')
      ctx.flag('USER_EMPTY_SCOPE', u.id, 'حساب إداري بلا فرع — نطاقه فارغ حتى يُحدد فرعه')

    let displayName = str(u.name)
    if (!displayName && legacyEmpId) displayName = str(legacyEmployees.get(legacyEmpId)?.name_ar) || str(legacyEmployees.get(legacyEmpId)?.name)
    if (!displayName) {
      displayName = email.split('@')[0]
      ctx.flag('USER_NAME_MISSING', u.id, 'حساب بلا اسم — استُخدم جزء البريد')
    }

    if (truthy(u.two_factor_enabled)) ctx.flag('USER_2FA_DROPPED', u.id, 'التحقق الثنائي كان مفعّلًا — غير مدعوم عندنا')
    if (str(u.auth_source).toLowerCase() === 'ldap') ctx.flag('USER_LDAP', u.id, 'حساب Active Directory — لا دخول AD عندنا')

    const saved = await em.save(
      em.create(User, {
        email,
        passwordHash: unusablePasswordHash(),
        displayName: cut(displayName, 200),
        role: role as User['role'],
        branchId: branchId as number,
        employeeId: (employeeId ?? null) as number,
        permissions: null as unknown as string,
        isActive: u.is_active == null ? true : truthy(u.is_active),
        tokenVersion: 0,
        lastLoginAt: legacyDate(u.last_login_at) as Date,
      }),
    )
    ctx.ids.set('user', u.id, saved.id)
    userByEmail.set(email, { id: saved.id, email, role, employeeId: employeeId ?? null })
    if (employeeId) userByEmployee.set(employeeId, { id: saved.id, email, role, employeeId })
    employeeOfTargetUser.set(saved.id, employeeId ?? null)
    ctx.flag('USER_PASSWORD_RESET_REQUIRED', u.id, 'كلمة المرور لا تُصدَّر من القديم — كلمة غير قابلة للاستخدام حتى إعادة التعيين')
    ctx.count('user')
    if (u.is_active != null && !truthy(u.is_active)) ctx.count('user_inactive')

    // صلاحيات فوق الدور (دور ثانٍ أو صلاحيات مباشرة) ⇒ GRANT
    const rolePerms = targetRoles.get(role)?.perms ?? []
    if (rolePerms.includes('*')) continue
    const { perms: userPerms, unmapped } = translatePerms(permNames(u.permissions))
    const extras = [...userPerms].filter((p) => !rolePerms.includes(p)).sort()
    if (!extras.length) continue
    if (scope === 'self' || scope === 'team') {
      ctx.flag('USER_EXTRA_PERMS_SKIPPED', u.id, `نطاقه في القديم ذاتي/فريق — لم تُمنح صلاحيات إضافية توسّع رؤيته: ${extras.join(', ')}`)
      continue
    }
    const saOnly = extras.filter((p) => SA_ONLY.has(p))
    const grants = extras.filter((p) => !SA_ONLY.has(p))
    if (saOnly.length) ctx.flag('USER_SUPER_ADMIN_ONLY_SKIPPED', u.id, `صلاحيات حصرية لمدير النظام لم تُمنح (سؤال مفتوح Q5): ${saOnly.join(', ')}`)
    const roleUnmapped = new Set(translatePerms(permNames(legacyRoleByName.get(legacyRoleName)?.permissions)).unmapped)
    const directUnmapped = unmapped.filter((p) => !roleUnmapped.has(p))
    if (directUnmapped.length) ctx.flag('USER_PERMISSIONS_UNMAPPED', u.id, `صلاحيات مباشرة بلا مقابل لم تُنقل: ${directUnmapped.join(', ')}`)
    if (grants.length) {
      await em.insert(UserPermissionOverride, grants.map((permission) => ({ userId: saved.id, permission, effect: 'GRANT' as const })))
      ctx.count('user_permission_override', grants.length)
      ctx.flag('USER_EXTRA_PERMS_GRANTED', u.id, 'صلاحيات فوق الدور (دور إضافي أو مباشرة) نُقلت كتجاوزات GRANT')
    }
  }

  // ---------- أنواع الأصول ----------
  const legacyTypes = new Map<string, LegacyAssetType>()
  for (const t of readRaw<LegacyAssetType>('asset-types')) if (t && t.id != null) legacyTypes.set(String(t.id), t)
  const custodyRows = new Map<string, LegacyEmployeeAsset>()
  for (const key of ['employee-assets', 'employee-assets-archived'])
    for (const group of readRawEach<LegacyEmployeeAsset>(key))
      for (const row of group.items) {
        if (!row || row.id == null || custodyRows.has(String(row.id))) continue
        custodyRows.set(String(row.id), { ...row, employee_id: row.employee_id ?? group.id })
        const nested = row.asset_type
        if (nested && nested.id != null && !legacyTypes.has(String(nested.id))) legacyTypes.set(String(nested.id), nested)
      }

  const existingTypes: Array<{ id: number; name: string }> = await em.query('SELECT id, name FROM asset_types')
  const typeByName = new Map(existingTypes.map((t) => [str(t.name).toLowerCase(), t.id]))
  const typeName = new Map<string, string>()
  for (const t of [...legacyTypes.values()].sort((a, b) => Number(a.id) - Number(b.id))) {
    let name = str(t.name_ar) || str(t.name_en) || str(t.code)
    if (!name) {
      name = `نوع أصل ${t.id}`
      ctx.flag('ASSET_TYPE_NAME_MISSING', t.id, 'نوع أصل بلا اسم — استُورد باسم مؤقت')
    }
    name = cut(name, 100)
    typeName.set(String(t.id), name)
    if (ctx.ids.get('asset_type', t.id)) continue
    const existing = typeByName.get(name.toLowerCase())
    if (existing) {
      ctx.ids.set('asset_type', t.id, existing)
      ctx.count('asset_type_matched')
      continue
    }
    const saved = await em.save(em.create(AssetType, { name, isActive: t.is_active == null ? true : truthy(t.is_active) }))
    typeByName.set(name.toLowerCase(), saved.id)
    ctx.ids.set('asset_type', t.id, saved.id)
    ctx.count('asset_type')
  }

  // ---------- الأصول والعهد ----------
  const movements = new Map<string, LegacyMovement[]>()
  for (const key of ['asset-movements', 'asset-movements-archived'])
    for (const group of readRawEach<LegacyMovement>(key)) if (!movements.has(group.id)) movements.set(group.id, group.items.filter(Boolean))

  const hasNotesColumn = ((await em.query("SELECT COL_LENGTH('dbo.custody_assignments', 'notes') AS n")) as Array<{ n: number | null }>)[0]?.n != null
  const rows = [...custodyRows.values()]
  const ts = (r: LegacyEmployeeAsset) => (legacyDate(r.assigned_at) ?? legacyDate(r.created_at))?.getTime() ?? 0
  const byTime = (a: LegacyEmployeeAsset, b: LegacyEmployeeAsset) => ts(a) - ts(b) || Number(a.id) - Number(b.id)

  // هوية الأصل: (النوع، الرقم التسلسلي) = أصل واحد؛ بلا رقم = أصل مستقل إلا لو حركة تحويل تربطه بسابقه
  const parent = new Map<string, string>()
  const find = (id: string): string => {
    let p = parent.get(id) ?? id
    while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p
    parent.set(id, p)
    return p
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }
  const bySerial = new Map<string, LegacyEmployeeAsset[]>()
  for (const r of rows) {
    const serial = str(r.identifier)
    if (!serial) continue
    const key = `${str(r.asset_type_id ?? r.asset_type?.id)}|${serial}`
    bySerial.set(key, [...(bySerial.get(key) ?? []), r])
  }
  for (const group of bySerial.values()) {
    group.sort(byTime)
    const open = group.filter((r) => str(r.status) === 'assigned')
    // نفس الرقم مع أكثر من عهدة مفتوحة ⇒ قطع مختلفة بنفس الوسم: كل مفتوحة أصل مستقل، والمغلقة مع الأحدث
    const anchor = open.length ? open[open.length - 1] : group[group.length - 1]
    for (const r of group) if (str(r.status) !== 'assigned' || r === anchor) union(String(anchor.id), String(r.id))
    if (open.length > 1) for (const r of open) ctx.flag('ASSET_SERIAL_SHARED', r.id, 'رقم تسلسلي مع أكثر من عهدة مفتوحة — كل واحدة أصل مستقل')
  }
  const usedPredecessor = new Set<string>()
  for (const r of rows.filter((x) => !str(x.identifier)).sort(byTime)) {
    const transfer = (movements.get(String(r.id)) ?? []).find((m) => str(m.movement_type) === 'transfer' && str(m.from_employee_id))
    if (!transfer) continue
    const at = ts(r)
    const candidates = rows
      .filter((p) => p !== r && !str(p.identifier) && !usedPredecessor.has(String(p.id)) && str(p.status) === 'transferred' &&
        str(p.employee_id) === str(transfer.from_employee_id) && str(p.asset_type_id ?? p.asset_type?.id) === str(r.asset_type_id ?? r.asset_type?.id))
      .sort((a, b) => Math.abs((legacyDate(a.returned_at)?.getTime() ?? 0) - at) - Math.abs((legacyDate(b.returned_at)?.getTime() ?? 0) - at))
    if (candidates[0]) {
      usedPredecessor.add(String(candidates[0].id))
      union(String(candidates[0].id), String(r.id))
      ctx.flag('ASSET_IDENTITY_GUESSED', r.id, 'عهدة محوّلة بلا رقم تسلسلي — رُبطت بالعهدة السابقة تقديريًا (النوع + المُحوِّل + أقرب تاريخ)')
    } else ctx.flag('ASSET_IDENTITY_GUESSED', r.id, 'عهدة محوّلة بلا رقم تسلسلي ولم يُعثر على سابقتها — استُوردت كأصل مستقل')
  }

  const assetGroups = new Map<string, LegacyEmployeeAsset[]>()
  for (const r of rows) assetGroups.set(find(String(r.id)), [...(assetGroups.get(find(String(r.id))) ?? []), r])

  const CUSTODY_STATUS: Record<string, CustodyStatus> = {
    assigned: 'ACTIVE', returned: 'RETURNED', transferred: 'TRANSFERRED', lost: 'LOST', damaged: 'DAMAGED',
  }
  const insertCols = ['requestId', 'assetId', 'employeeId', 'assignedByEmployeeId', 'assignedAt', 'acknowledgedAt', 'managerConfirmAt', 'returnedAt', 'condition', 'status', ...(hasNotesColumn ? ['notes'] : [])]
  const insertSql = `INSERT INTO custody_assignments (${insertCols.map((c) => `[${c}]`).join(', ')}) OUTPUT INSERTED.id AS id VALUES (${insertCols.map((_, i) => `@${i}`).join(', ')})`
  let notesDropped = false

  for (const group of [...assetGroups.values()].sort((a, b) => Math.min(...a.map((r) => Number(r.id))) - Math.min(...b.map((r) => Number(r.id))))) {
    group.sort(byTime)
    if (group.some((r) => ctx.ids.get('custody', r.id))) {
      ctx.count('custody_already_mapped', group.length)
      continue
    }
    const latest = group.filter((r) => str(r.status) === 'assigned').pop() ?? group[group.length - 1]
    const legacyTypeId = str(latest.asset_type_id ?? latest.asset_type?.id)
    let category = typeName.get(legacyTypeId)
    if (!category) {
      category = 'غير محدد'
      ctx.flag('ASSET_TYPE_MISSING', latest.id, 'نوع الأصل محذوف أو غير مستخرج — التصنيف «غير محدد»')
    }
    const serial = cut(str(latest.identifier), 100)
    const holder = latest.employee_id != null ? resolveEmployee(latest.employee_id) : undefined
    const latestStatus = str(latest.status)
    let status: AssetStatus = latestStatus === 'assigned' ? 'ASSIGNED' : latestStatus === 'lost' || latestStatus === 'damaged' ? 'RETIRED' : 'AVAILABLE'
    if (status === 'ASSIGNED' && !holder) status = 'AVAILABLE'
    const value = num(latest.value) ?? num(legacyTypes.get(legacyTypeId)?.value)

    const asset = await em.save(
      em.create(Asset, {
        name: cut(serial ? `${category} — ${serial}` : category, 200),
        category: cut(category, 100),
        serialNumber: (serial || null) as string,
        value: value as number,
        status,
        currentHolderId: (status === 'ASSIGNED' ? holder : null) as number,
      }),
    )
    ctx.count('asset')

    for (const r of group) {
      ctx.ids.set('asset', r.id, asset.id)
      const employeeId = r.employee_id != null ? resolveEmployee(r.employee_id) : undefined
      if (!employeeId) {
        ctx.flag('CUSTODY_EMPLOYEE_NOT_IMPORTED', r.id, 'عهدة لموظف لم يُستورد — لم تُنشأ (الأصل استُورد)')
        continue
      }
      const rawStatus = str(r.status)
      let custodyStatus = CUSTODY_STATUS[rawStatus]
      if (!custodyStatus) {
        custodyStatus = 'ACTIVE'
        ctx.flag('CUSTODY_STATUS_UNKNOWN', r.id, 'حالة عهدة غير معروفة — استُوردت «سارية»')
      }
      let assignedAt = legacyDate(r.assigned_at) ?? legacyDate(r.created_at)
      if (!assignedAt) {
        assignedAt = ctx.now
        ctx.flag('CUSTODY_DATE_MISSING', r.id, 'عهدة بلا تاريخ إسناد — استُخدم تاريخ الاستيراد')
      }
      const returnedAt = custodyStatus === 'ACTIVE' ? null : legacyDate(r.returned_at)
      const assignMove = (movements.get(String(r.id)) ?? []).find((m) => str(m.movement_type) === 'assign' && str(m.actor_user_id))
      const actorUser = assignMove ? ctx.ids.get('user', str(assignMove.actor_user_id)) : undefined
      const assignedBy = actorUser ? employeeOfTargetUser.get(actorUser) ?? null : null
      let condition = str(r.condition)
      if (condition.length > 100) {
        condition = cut(condition, 100)
        ctx.flag('CUSTODY_CONDITION_TRUNCATED', r.id, 'وصف الحالة أطول من 100 حرف — قُصّ')
      }
      const params: unknown[] = [null, asset.id, employeeId, assignedBy, assignedAt, assignedAt, assignedAt, returnedAt, condition || null, custodyStatus]
      const notes = str(r.notes)
      if (hasNotesColumn) {
        if (notes.length > 1000) ctx.flag('CUSTODY_NOTES_TRUNCATED', r.id, 'ملاحظات العهدة أطول من 1000 حرف — قُصّت')
        params.push(notes ? cut(notes, 1000) : null)
      } else if (notes) {
        notesDropped = true
        ctx.flag('CUSTODY_NOTES_NOT_STORED', r.id, 'ملاحظات العهدة لم تُحفظ — ترحيل 20260917_054 لم يُطبّق بعد')
      }
      const inserted = (await em.query(insertSql, params)) as Array<{ id: number }>
      ctx.ids.set('custody', r.id, inserted[0].id)
      ctx.count('custody_assignment')
      if (custodyStatus === 'ACTIVE') ctx.count('custody_active')
    }
  }
  if (notesDropped) ctx.count('custody_notes_dropped')
}
