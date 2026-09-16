import type { EntityManager } from 'typeorm'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import type { AudiencePositions } from './request-audience'

// مناصب الموظف في الهيكل لجمهور «حسب المنصب»: يدير قسمًا؟ يقود فريقًا؟ يدير فرعًا؟
// قراءات متتالية لا متوازية: قد تُستدعى داخل معاملة على اتصال واحد.
export async function orgPositionsOf(em: EntityManager, employeeId: number | null | undefined): Promise<AudiencePositions> {
  if (!employeeId) return {}
  const departments = await em.getRepository(Department).count({ where: { managerEmployeeId: employeeId } })
  const teams = await em.getRepository(Team).count({ where: { leaderEmployeeId: employeeId } })
  const branches = await em.getRepository(Branch).count({ where: { managerEmployeeId: employeeId } })
  return { departmentManager: departments > 0, teamLeader: teams > 0, branchManager: branches > 0 }
}
