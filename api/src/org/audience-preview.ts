import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { BranchScope } from '../auth/guards'
import { isCurrentEmployee } from '../reports/metrics'
import { audienceNeedsPositions, parseRequestAudience, requestAudienceAllows, type AudiencePositions } from '../requests/request-audience'
import { orgPlaceOf, orgPlacesFor } from './org-audience'

// B-ADD.1: معاينة الجمهور قبل الحفظ — «N موظف» وأسماؤهم — بنفس المقيّم اللي هيحكم بعد الحفظ (requestAudienceAllows + isMember)،
// وبنطاق فروع الحساب اللي بيسأل: موظف من فرع برّه نطاقه لا بيتعدّ ولا اسمه بيرجع.

export const AUDIENCE_PREVIEW_NAMES = 300
const AUDIENCE_PREVIEW_MAX_TEXT = 20000

export interface AudiencePreviewRow { id: number; employeeCode: string | null; fullName: string; branchId: number | null; departmentId: number | null; teamId: number | null }
export interface AudiencePreview { count: number; employees: AudiencePreviewRow[]; truncated: boolean }

/** نص الجمهور للمعاينة: كائن «مين + فين» زي ما الشاشة هتبعته للحفظ (null = الشركة كلها). */
export function audiencePreviewText(audience: unknown): string | null {
  if (audience === null || audience === undefined) return null
  if (typeof audience !== 'object' || Array.isArray(audience)) throw new BadRequestException('الجمهور بصيغة غير صحيحة')
  const text = JSON.stringify(audience)
  if (text.length > AUDIENCE_PREVIEW_MAX_TEXT) throw new BadRequestException('الجمهور أكبر من الحد')
  return text
}

const inList = (values: unknown[], offset: number) => values.map((_, index) => `@${index + offset}`).join(', ')

/** الموظفين الحاليين اللي الجمهور ده بيشملهم دلوقتي، جوه نطاق القارئ. */
export async function audienceMembersNow(em: EntityManager, audience: string | null, scope: BranchScope): Promise<AudiencePreviewRow[]> {
  if (scope !== null && !scope.length) return []
  const rows: Array<AudiencePreviewRow & { status: string; isActive: unknown }> = await em.query(
    `SELECT [id], [employeeCode], [fullName], [branchId], [departmentId], [teamId], [status], [isActive] FROM [employees]
     WHERE [isActive] = 1${scope === null ? '' : ` AND [branchId] IN (${inList(scope, 0)})`} ORDER BY [id]`, scope ?? [])
  const current = rows.filter(row => isCurrentEmployee(row))
  if (!audience) return current.map(strip)
  const mode = parseRequestAudience(audience)?.mode
  // دور الحساب بيتقري لجمهور «أدوار» أو «حسب المنصب» بس (المنصب ممكن يكون دور)
  const roles = new Map<number, string>()
  if (mode === 'roles' || mode === 'positions') {
    for (const row of await em.query('SELECT [employeeId], [role] FROM [users] WHERE [isActive] = 1 AND [employeeId] IS NOT NULL ORDER BY [id]') as Array<{ employeeId: number; role: string }>) {
      if (!roles.has(Number(row.employeeId))) roles.set(Number(row.employeeId), row.role)
    }
  }
  const held = audienceNeedsPositions(audience) ? await positionSets(em) : null
  const places = await orgPlacesFor(em, [audience])
  return current.filter(row => {
    const role = roles.get(Number(row.id))
    const positions: AudiencePositions = held ? { departmentManager: held.departmentManagers.has(Number(row.id)), teamLeader: held.teamLeaders.has(Number(row.id)), branchManager: held.branchManagers.has(Number(row.id)) } : {}
    // زي الإعلانات والسياسات: دور مدير النظام مش دور وظيفي، ومن غير صلاحيات — السؤال «الموظف ده من الجمهور؟»
    return requestAudienceAllows(audience, { role: role && role !== 'super_admin' ? role : null, permissions: [], employeeId: Number(row.id),
      departmentId: row.departmentId == null ? null : Number(row.departmentId), teamId: row.teamId == null ? null : Number(row.teamId),
      branchId: row.branchId == null ? null : Number(row.branchId), positions, ...orgPlaceOf(places, row) }, 'submit')
  }).map(strip)
}

const strip = (row: AudiencePreviewRow): AudiencePreviewRow => ({ id: Number(row.id), employeeCode: row.employeeCode ?? null, fullName: row.fullName,
  branchId: row.branchId == null ? null : Number(row.branchId), departmentId: row.departmentId == null ? null : Number(row.departmentId), teamId: row.teamId == null ? null : Number(row.teamId) })

async function positionSets(em: EntityManager) {
  const ids = async (sql: string) => new Set((await em.query(sql) as Array<{ id: number | null }>).map(row => Number(row.id)).filter(id => id > 0))
  return { departmentManagers: await ids('SELECT [managerEmployeeId] AS [id] FROM [departments] WHERE [managerEmployeeId] IS NOT NULL'),
    teamLeaders: await ids('SELECT [leaderEmployeeId] AS [id] FROM [teams] WHERE [leaderEmployeeId] IS NOT NULL'),
    branchManagers: await ids('SELECT [managerEmployeeId] AS [id] FROM [branches] WHERE [managerEmployeeId] IS NOT NULL') }
}

/** المعاينة: العدد كله، والأسماء لحد الحد. */
export async function previewAudience(em: EntityManager, audience: unknown, scope: BranchScope): Promise<AudiencePreview> {
  const members = await audienceMembersNow(em, audiencePreviewText(audience), scope)
  return { count: members.length, employees: members.slice(0, AUDIENCE_PREVIEW_NAMES), truncated: members.length > AUDIENCE_PREVIEW_NAMES }
}
