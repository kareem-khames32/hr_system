import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm'
import { recordAudit, type AuditEntryInput } from './audit'

// B2.1: الأحداث اللي ليها سجل قايم بتنزل في السجل المركزي من نفس الإدخال وفي نفس المعاملة (لو العملية رجعت، مفيش سطر):
// الدخول (login_events)، والموديولات (system_module_events)، والبيانات البنكية (employee_payment_changes)، وتغيير الراتب ومكوناته
// (employee_status_history بنوع SALARY)، وإجراءات المسير (payroll_run_events — من غير الحمولة، لأن حدث «محسوب» ممكن يبقى ميجات).

const branchOfUser = async (event: InsertEvent<any>, userId: unknown) =>
  Number.isSafeInteger(userId) && Number(userId) > 0 ? (await event.manager.query('SELECT [branchId] FROM [users] WHERE [id] = @0', [userId]))[0]?.branchId ?? null : null
const branchOfEmployee = async (event: InsertEvent<any>, employeeId: unknown) =>
  Number.isSafeInteger(employeeId) && Number(employeeId) > 0 ? (await event.manager.query('SELECT [branchId] FROM [employees] WHERE [id] = @0', [employeeId]))[0]?.branchId ?? null : null
// مسير فرع واحد = فرعه؛ غير كده على مستوى الشركة (اللي نطاقه «كل الفروع» بس بيشوف حدثه)
const branchOfRun = async (event: InsertEvent<any>, runId: unknown) => {
  if (!Number.isSafeInteger(runId) || Number(runId) <= 0) return null
  const [run] = await event.manager.query('SELECT [scopeType], [scopeIds], [branchId] FROM [payroll_runs] WHERE [id] = @0', [runId])
  if (!run) return null
  let ids: unknown[] = []
  try { ids = run.scopeIds ? JSON.parse(run.scopeIds) : run.branchId != null ? [run.branchId] : [] } catch { ids = [] }
  return run.scopeType === 'BRANCH' && ids.length === 1 && Number.isSafeInteger(Number(ids[0])) ? Number(ids[0]) : null
}

/** الحدث في السجل المركزي، أو null لو الجدول مش من الستة */
export async function auditEntryFor(event: InsertEvent<any>): Promise<AuditEntryInput | null> {
  const row = event.entity ?? {}
  switch (event.metadata.tableName) {
    case 'login_events':
      return { category: 'LOGIN', action: String(row.outcome ?? 'LOGIN'), entityType: 'user', entityId: row.userId ?? null,
        actorUserId: row.actorUserId ?? row.userId ?? null, branchId: await branchOfUser(event, row.userId),
        summary: `دخول (${row.method ?? '—'}): ${row.outcome ?? '—'} — ${row.identifier ?? ''}`, ip: row.ip ?? null, userAgent: row.userAgent ?? null }
    case 'system_module_events': {
      const what = row.kind === 'feature' ? 'ميزة' : row.kind === 'preset' ? 'باقة' : 'موديول'
      const state = row.enabled === true ? 'فتح' : row.enabled === false ? 'قفل' : 'تعديل'
      return { category: 'SETTINGS', action: `${String(row.kind ?? 'module').toUpperCase()}_${row.enabled === true ? 'ENABLED' : row.enabled === false ? 'DISABLED' : 'CHANGED'}`,
        entityType: row.kind ?? 'module', entityId: row.key ?? null, actorUserId: row.byUserId ?? null,
        summary: `${state} ${what} ${row.key ?? ''}`, after: { enabled: row.enabled ?? null, audience: row.audience ?? null } }
    }
    case 'employee_payment_changes':
      return { category: 'BANK_PAYROLL', action: 'BANK_CHANGED', entityType: 'employee', entityId: row.employeeId ?? null,
        actorUserId: row.changedByUserId ?? null, branchId: await branchOfEmployee(event, row.employeeId),
        summary: `تغيير ${row.field ?? 'بيانات الصرف'} (${row.source ?? '—'})`, before: { [row.field ?? 'value']: row.oldValue ?? null }, after: { [row.field ?? 'value']: row.newValue ?? null } }
    case 'employee_status_history':
      if (row.changeType !== 'SALARY') return null
      return { category: 'BANK_PAYROLL', action: 'SALARY_CHANGED', entityType: 'employee', entityId: row.employeeId ?? null,
        actorUserId: row.changedByUserId ?? null, branchId: await branchOfEmployee(event, row.employeeId),
        summary: `تغيير ${row.fieldName ?? 'الراتب'}${row.reason ? ` — ${String(row.reason).slice(0, 200)}` : ''}`,
        before: { [row.fieldName ?? 'value']: row.oldValue ?? null }, after: { [row.fieldName ?? 'value']: row.newValue ?? null } }
    case 'payroll_run_events':
      return { category: 'PAYROLL', action: String(row.eventType ?? 'RUN_EVENT'), entityType: 'payroll_run', entityId: row.runId ?? null,
        actorUserId: row.actorUserId ?? null, branchId: await branchOfRun(event, row.runId),
        summary: `${row.eventType ?? 'حدث'} على المسير${row.reason ? ` — ${String(row.reason).slice(0, 300)}` : ''}` }
    case 'roles':
      return { category: 'PERMISSIONS', action: 'ROLE_CREATED', entityType: 'role', entityId: row.code ?? row.id ?? null,
        summary: `دور جديد ${row.nameAr ?? row.code ?? ''}`, after: { permissions: parseList(row.permissions), isActive: row.isActive ?? true } }
    case 'users':
      return { category: 'PERMISSIONS', action: 'USER_CREATED', entityType: 'user', entityId: row.id ?? null, branchId: row.branchId ?? null,
        summary: `حساب دخول جديد ${row.email ?? ''}`, after: pick(row, USER_FIELDS) }
    default:
      return null
  }
}

// حقول الحساب اللي بتغيّر صلاحياته أو نطاقه (كلمة السر بتتسجل إنها اتغيرت بس، من غير أي قيمة)
const USER_FIELDS = ['role', 'branchId', 'scopeAllBranches', 'scopeBranchIds', 'isActive', 'employeeId'] as const
const SECRET_CONFIG = /key|secret|token|password|pass\b/i
const pick = (row: Record<string, any>, fields: readonly string[]) => Object.fromEntries(fields.filter(field => field in row).map(field => [field, row[field] ?? null]))
const parseList = (value: unknown) => { try { return typeof value === 'string' ? JSON.parse(value) : value ?? null } catch { return value } }
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** التعديل: مفتاح إعدادات اتغيّرت قيمته (المفاتيح الحساسة متخفية)، ودور اتغيّرت صلاحياته أو حالته، وحساب اتغيّر دوره أو نطاقه أو تفعيله أو كلمة سره */
export async function auditUpdateEntryFor(event: UpdateEvent<any>): Promise<AuditEntryInput | null> {
  const before = event.databaseEntity as Record<string, any> | undefined, after = (event.entity ?? {}) as Record<string, any>
  switch (event.metadata.tableName) {
    case 'requests_config': {
      if (!before || same(before.value, after.value)) return null
      const secret = SECRET_CONFIG.test(String(before.key ?? after.key ?? ''))
      return { category: 'SETTINGS', action: 'CONFIG_CHANGED', entityType: 'config', entityId: before.key ?? after.key ?? null,
        summary: `تغيير الإعداد ${before.key ?? after.key}`, before: { value: secret ? '***' : before.value ?? null }, after: { value: secret ? '***' : after.value ?? null } }
    }
    case 'roles': {
      if (!before) return null
      const fields = ['permissions', 'isActive', 'nameAr'].filter(field => field in after && !same(before[field], after[field]))
      if (!fields.length) return null
      const view = (row: Record<string, any>) => Object.fromEntries(fields.map(field => [field, field === 'permissions' ? parseList(row[field]) : row[field] ?? null]))
      return { category: 'PERMISSIONS', action: 'ROLE_UPDATED', entityType: 'role', entityId: before.code ?? before.id ?? null,
        summary: `تعديل الدور ${before.nameAr ?? before.code ?? ''}`, before: view(before), after: view(after) }
    }
    case 'users': {
      if (!before) return null
      const fields = USER_FIELDS.filter(field => field in after && !same(before[field], after[field]))
      const passwordChanged = 'passwordHash' in after && before.passwordHash !== undefined && before.passwordHash !== after.passwordHash
      if (!fields.length && !passwordChanged) return null
      return { category: 'PERMISSIONS', action: fields.length ? 'USER_UPDATED' : 'PASSWORD_CHANGED', entityType: 'user', entityId: before.id ?? null,
        branchId: after.branchId ?? before.branchId ?? null,
        summary: `${fields.length ? 'تعديل الحساب' : 'تغيير كلمة سر الحساب'} ${before.email ?? ''}`,
        before: { ...pick(before, fields), ...(passwordChanged ? { password: 'قديمة' } : {}) },
        after: { ...pick(after, fields), ...(passwordChanged ? { password: 'جديدة' } : {}) } }
    }
    default:
      return null
  }
}

@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(@InjectDataSource() dataSource: DataSource) {
    dataSource.subscribers.push(this)
  }

  async afterInsert(event: InsertEvent<any>) {
    if (event.metadata.tableName === 'audit_log') return
    const entry = await auditEntryFor(event)
    if (entry) await recordAudit(event.manager, entry)
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (event.metadata.tableName === 'audit_log') return
    const entry = await auditUpdateEntryFor(event)
    if (entry) await recordAudit(event.manager, entry)
  }
}
