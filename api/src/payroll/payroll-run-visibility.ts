import { In, type EntityManager } from 'typeorm'
import { branchScopeOf, inBranchScope, type BranchScope } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { PayrollRunMember } from './payroll.entities'

// CR34-B01: مراجع المسير في حمولة حدث (أي مفتاح runId أو ينتهي بـRunId وقيمته رقم، في أي عمق)
const RUN_REF_KEY = /^runId$|RunId$/
export function payloadRunIds(payload: unknown, out: number[] = []): number[] {
  if (Array.isArray(payload)) for (const value of payload) payloadRunIds(value, out)
  else if (payload && typeof payload === 'object' && !(payload instanceof Date)) {
    for (const [key, value] of Object.entries(payload)) RUN_REF_KEY.test(key) && typeof value === 'number' ? out.push(value) : payloadRunIds(value, out)
  }
  return out
}

/** نسخة من الحمولة: مرجع المسير المخفي = null، ولو فيه مرجع اتخفى مراجع الإعفاء (exemptionId) كمان. hidden = اتخفى حاجة */
export function maskPayloadRunRefs<T>(payload: T, visible: (runId: number) => boolean): { payload: T; hidden: boolean } {
  let hidden = false
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object' || value instanceof Date) return value
    const copy: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (RUN_REF_KEY.test(key) && typeof item === 'number' && !visible(item)) { copy[key] = null; hidden = true } else copy[key] = walk(item)
    }
    return copy
  }
  const masked = walk(payload) as T
  if (hidden && masked && typeof masked === 'object' && !Array.isArray(masked) && 'exemptionId' in (masked as Record<string, unknown>)) (masked as Record<string, unknown>).exemptionId = null
  return { payload: masked, hidden }
}

/** نص الحدث اللي مسيره مخفي: من غير «#رقم» (رقم إعفاء أو قيد أو مسير من الفرع التاني) ولا القوسين اللي فضيوا بعده */
export const scrubEventReferences = (text: string | null | undefined): string | null =>
  text == null ? null : text.replace(/\s*#\d+/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim()

// CR32-B01 وCR33-B01 (مراجعة Codex الجولتين 32 و33): مرجع مسير (رقمه أو اسمه أو حالته) في رد أو رسالة رفض أو عرض لحساب فرع بيظهر بس لو
// الموظف المعني عضو في المسير بلقطة فرع من نطاق الحساب — أو مسير قديم من غير أعضاء خالص على فرع من نطاقه. فالمسير اللي اتعمل في فرع
// تاني بعد نقل الموظف (حتى لو شايل قيد مختوم بفرع الحساب) مابيظهرش، زي قايمة المسيرات وقراءته. الموظف نفسه بيشوف مسيراته (قسيمته)،
// وحساب الشركة بيشوف الكل. نفس قاعدة «شيل خصم» (payroll-overview.service → runsInScope).
export async function payrollRunRefVisibility(em: EntityManager, scope: BranchScope, runIds: readonly (number | null | undefined)[],
  employeeIds: readonly (number | null | undefined)[], selfEmployeeId: number | null = null): Promise<(runId: number | null | undefined, employeeId: number) => boolean> {
  if (scope === null) return runId => runId != null
  const ids = [...new Set(runIds.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  const people = [...new Set(employeeIds.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  const visible = new Set<string>(), withMembers = new Set<number>(), runBranch = new Map<number, number | null>(), parentOf = new Map<number, number>()
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500)
    const runs: Array<{ id: number; branchId: number | null; hasMembers: number; runType: string | null; parentRunId: number | null }> = await em.query(`SELECT r.[id], r.[branchId],
        CASE WHEN EXISTS (SELECT 1 FROM [payroll_run_members] m WHERE m.[runId] = r.[id]) THEN 1 ELSE 0 END AS [hasMembers], r.[runType], r.[parentRunId]
      FROM [payroll_runs] r WHERE r.[id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(chunk)])
    for (const run of runs) {
      if (Number(run.hasMembers)) withMembers.add(Number(run.id))
      runBranch.set(Number(run.id), run.branchId == null ? null : Number(run.branchId))
      // CR35-N01: مسير العكس من غير أعضاء بيتحكم بمسيره الأصلي (نفس assertRunAccess)
      if (run.runType === 'REVERSAL' && run.parentRunId != null && !Number(run.hasMembers) && Number(run.parentRunId) !== Number(run.id)) parentOf.set(Number(run.id), Number(run.parentRunId))
    }
    for (let start = 0; start < people.length; start += 500) {
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId: In(chunk), employeeId: In(people.slice(start, start + 500)) },
        select: { id: true, runId: true, employeeId: true, snapshot: true } })
      for (const member of members) {
        const branchId = member.snapshot?.branchId
        if (branchId != null && inBranchScope(scope, Number(branchId))) visible.add(`${member.runId}:${member.employeeId}`)
      }
    }
  }
  const own = (runId: number, employeeId: number) => visible.has(`${runId}:${employeeId}`) ||
    (!withMembers.has(runId) && runBranch.get(runId) != null && inBranchScope(scope, runBranch.get(runId)!))
  // أصول مسيرات العكس: بنفس القاعدة (العكس مابيتعكسش، فمستوى واحد)
  const parents = [...new Set(parentOf.values())]
  const parentShown = parents.length ? await payrollRunRefVisibility(em, scope, parents, people, selfEmployeeId) : null
  return (runId, employeeId) => runId != null && (
    (selfEmployeeId != null && employeeId === selfEmployeeId) ||
    (parentOf.has(runId) ? !!parentShown && parentShown(parentOf.get(runId)!, employeeId) : own(runId, employeeId)))
}

/**
 * CR36-B01: صفوف خام (قيد دفتر، سجل إضافي، …) فيها مراجع مسير (runId أو *RunId في أي عمق) — المرجع المخفي للحساب لموظف الصف بيبقى
 * null. الصف من غير مرجع مخفي بيرجع زي ما هو بالظبط، والتواريخ والمبالغ مابتتلمسش. viewer = null (داخلي) = من غير حجب
 */
export async function scopeRunRefRows<T extends object>(em: EntityManager, viewer: JwtPayload | null, rows: readonly T[], employeeIdOf: (row: T) => number): Promise<T[]> {
  const refs = rows.map(row => payloadRunIds(row))
  if (!viewer || !refs.some(ids => ids.length)) return [...rows]
  const shown = await payrollRunRefVisibility(em, branchScopeOf(viewer), refs.flat(), rows.map(employeeIdOf), viewer.employeeId ?? null)
  return rows.map((row, index) => {
    if (!refs[index].length) return row
    const { payload, hidden } = maskPayloadRunRefs(row, runId => shown(runId, employeeIdOf(row)))
    return hidden ? payload : row
  })
}

/** مانع فيه مرجع مسير في تفاصيله (runId أو *RunId) ونص بديل من غير المرجع (redactedMessage) */
export interface PayrollRunRefBlocker { employeeId: number; message: string; details?: Record<string, unknown>; redactedMessage?: string }

/**
 * CR35-B01: موانع (عكس الصرف) للحساب ده — مرجع المسير اللي مش مرئي له لموظف المانع بيبقى null، والنص بيتبدل بالنص البديل اللي من غير
 * رقم المسير وحالته. المرئي زي ما هو. النص البديل نفسه مابيطلعش في الرد. viewer = null (داخلي) = من غير حجب
 */
export async function scopePayrollRunRefBlockers<T extends PayrollRunRefBlocker>(em: EntityManager, viewer: JwtPayload | null, blockers: readonly T[]): Promise<Array<Omit<T, 'redactedMessage'>>> {
  const strip = (blocker: T): Omit<T, 'redactedMessage'> => { const { redactedMessage: _redacted, ...rest } = blocker; return rest }
  const refs = blockers.map(blocker => payloadRunIds(blocker.details ?? null))
  if (!viewer || !refs.some(ids => ids.length)) return blockers.map(strip)
  const shown = await payrollRunRefVisibility(em, branchScopeOf(viewer), refs.flat(), blockers.map(blocker => blocker.employeeId), viewer.employeeId ?? null)
  return blockers.map(blocker => {
    const { payload: details, hidden } = maskPayloadRunRefs(blocker.details ?? null, runId => shown(runId, blocker.employeeId))
    if (!hidden) return strip(blocker)
    return { ...strip(blocker), message: blocker.redactedMessage ?? scrubEventReferences(blocker.message) ?? '', details: details ?? {} }
  })
}
