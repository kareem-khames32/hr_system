import { In, IsNull, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { Employee } from '../employees/employee.entity'
import { HrCaseParty } from './case.entities'
import { caseConflict } from './case-rules'

// Codex P3K-B11: المطّلع على ملف قضية شخص مش حساب. صف العضوية بيتسجّل بموظف الحساب وقت الإضافة، والوصول بيتحكم بالهوية الحالية:
// حساب اتغيّر ربطه (بقى لموظف تاني) مابقاش مطّلع، وموظف الحساب لو مشكو في حقه في القضية أو مديره المباشر مش مطّلع عليها — حتى لو صف
// العضوية لسه موجود. كل أبواب القراءة والكتابة والمرفقات بتعدّي من هنا.

type Identity = Pick<JwtPayload, 'sub' | 'employeeId'>

/** القضايا اللي الهوية الحالية مطّلعة عليها (caseIds = حصر على قضايا بعينها) */
export async function handledCaseIds(em: EntityManager, user: Identity, caseIds?: number[]): Promise<Set<number>> {
  if (!user.sub || (caseIds && !caseIds.length)) return new Set()
  const parties = em.getRepository(HrCaseParty)
  const rows = await parties.find({ where: { role: 'HANDLER', userId: user.sub, employeeId: user.employeeId ? user.employeeId : IsNull(), ...(caseIds ? { caseId: In(caseIds) } : {}) } })
  const ids = new Set(rows.map((row) => row.caseId))
  if (!ids.size || !user.employeeId) return ids
  const respondents = await parties.find({ where: { caseId: In([...ids]), role: 'RESPONDENT' } })
  const employeeIds = [...new Set(respondents.map((row) => row.employeeId).filter((id): id is number => id != null))]
  const people = new Map((employeeIds.length ? await em.getRepository(Employee).find({ where: { id: In(employeeIds) } }) : []).map((row) => [row.id, row]))
  for (const party of respondents) {
    const respondent = party.employeeId != null ? people.get(party.employeeId) : undefined
    if (respondent && caseConflict([respondent], [user.employeeId])) ids.delete(party.caseId)
  }
  return ids
}

export const handlesCase = async (em: EntityManager, user: Identity, caseId: number): Promise<boolean> => (await handledCaseIds(em, user, [caseId])).has(caseId)
