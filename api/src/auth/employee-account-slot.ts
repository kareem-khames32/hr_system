import type { EntityManager } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { User } from './user.entity'

/**
 * CRP3I (P3I-B01): حجز «حساب الموظف». صف الموظف بيتقفل لآخر المعاملة، فكل مسار بيعمل حساب للموظف أو بيربط حساب بيه (الدخول بحساب
 * الشركة، مزامنة المجال، إنشاء حساب، تغيير ربط حساب) بيتحكم واحد ورا التاني — والحكم بيتعاد هنا على الموظف وحساباته زي ما هم دلوقتي.
 * الترتيب في كل الكتّاب: صف الدور (لو فيه)، ثم صف الموظف، ثم صف الحساب.
 */
export async function lockEmployeeAccountSlot(em: EntityManager, employeeId: number): Promise<{ employee: Employee | null; accounts: User[] }> {
  const employee = await em.getRepository(Employee).findOne({ where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
  const accounts = employee ? await em.getRepository(User).find({ where: { employeeId }, order: { id: 'ASC' } }) : []
  return { employee, accounts }
}
