import { BadRequestException, NotFoundException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { paidMonthlySalary } from '../employees/compensation'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { isDataPlaceholder } from '../common/data-placeholders'

// مفاتيح هوية الشركة التي يطبعها الخطاب
export const LETTER_COMPANY_KEYS = ['company.name', 'company.name_en', 'company.address', 'company.phone', 'company.commercial_register'] as const

export interface LetterIssuanceData {
  employee: Employee
  company: Record<string, string>
  salary: number
}

// بيانات إصدار الخطاب الإلزامية — نفس الفحص عند التقديم وعند التنفيذ بعد آخر اعتماد
// (كان يُكتشف النقص عند آخر اعتماد فقط فيبقى الطلب عالقًا في صندوق المعتمد)
export async function assertLetterIssuable(em: EntityManager, employeeId: number): Promise<LetterIssuanceData> {
  const employee = await em.getRepository(Employee).findOneBy({ id: employeeId })
  if (!employee) throw new NotFoundException('الموظف غير موجود')
  const config = await em.getRepository(RequestsConfig).findBy({ key: In([...LETTER_COMPANY_KEYS]) })
  const company = Object.fromEntries(config.map(c => [c.key, String(c.value ?? '').trim()]))
  const missing: string[] = []
  // القيمة المؤقتة التي كتبها ترحيل الخطوة 9 ليست بيانات حقيقية: تُعامل كحقل ناقص في الخطاب الرسمي
  if (!company['company.name'] || isDataPlaceholder(company['company.name'])) missing.push('اسم الشركة في الإعدادات')
  if (!employee.jobTitle?.trim() || isDataPlaceholder(employee.jobTitle)) missing.push('المسمى الوظيفي للموظف')
  if (!employee.joinDate) missing.push('تاريخ تعيين الموظف')
  if (missing.length) {
    throw new BadRequestException(`لا يمكن إصدار الخطاب قبل استكمال: ${missing.join('، ')} — راجع الموارد البشرية`)
  }
  // إجمالي الراتب المسجل بملف الموظف = المصروف كل شهر (الست + بدل ضغط العمل) — بيان راتب مش أساس مؤثرات
  const salary = paidMonthlySalary(employee)
  if (!Number.isFinite(salary) || salary < 0) throw new BadRequestException('بيانات راتب الموظف غير صالحة لإصدار الخطاب')
  return { employee, company, salary }
}
