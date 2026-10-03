import { In, type EntityManager } from 'typeorm'
import { inBranchScope, type BranchScope } from '../auth/guards'
import { PayrollRunMember } from './payroll.entities'

// CR34-B01: مراجع المسير في حمولة حدث (أي مفتاح runId أو ينتهي بـRunId وقيمته رقم، في أي عمق)
const RUN_REF_KEY = /^runId$|RunId$/
export function payloadRunIds(payload: unknown, out: number[] = []): number[] {
  if (Array.isArray(payload)) for (const value of payload) payloadRunIds(value, out)
  else if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) RUN_REF_KEY.test(key) && typeof value === 'number' ? out.push(value) : payloadRunIds(value, out)
  }
  return out
}

/** نسخة من الحمولة: مرجع المسير المخفي = null، ولو فيه مرجع اتخفى مراجع الإعفاء (exemptionId) كمان. hidden = اتخفى حاجة */
export function maskPayloadRunRefs<T>(payload: T, visible: (runId: number) => boolean): { payload: T; hidden: boolean } {
  let hidden = false
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object') return value
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
  const visible = new Set<string>(), withMembers = new Set<number>(), runBranch = new Map<number, number | null>()
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500)
    const runs: Array<{ id: number; branchId: number | null; hasMembers: number }> = await em.query(`SELECT r.[id], r.[branchId],
        CASE WHEN EXISTS (SELECT 1 FROM [payroll_run_members] m WHERE m.[runId] = r.[id]) THEN 1 ELSE 0 END AS [hasMembers]
      FROM [payroll_runs] r WHERE r.[id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(chunk)])
    for (const run of runs) {
      if (Number(run.hasMembers)) withMembers.add(Number(run.id))
      runBranch.set(Number(run.id), run.branchId == null ? null : Number(run.branchId))
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
  return (runId, employeeId) => runId != null && (
    (selfEmployeeId != null && employeeId === selfEmployeeId) || visible.has(`${runId}:${employeeId}`) ||
    (!withMembers.has(runId) && runBranch.get(runId) != null && inBranchScope(scope, runBranch.get(runId)!)))
}
