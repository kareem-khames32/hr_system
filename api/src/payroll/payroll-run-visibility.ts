import { In, type EntityManager } from 'typeorm'
import { inBranchScope, type BranchScope } from '../auth/guards'
import { PayrollRunMember } from './payroll.entities'

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
