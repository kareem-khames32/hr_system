import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { canReadEmployeeFinance } from '../employees/employee-projection'
import type { StoredFile } from '../files/stored-file.entity'
import { HrIssuedDocument } from './hr-document.entities'

// Both download routes use this policy. Upload ownership is never document access.
export async function assertHrDocumentAccess(em: EntityManager, user: JwtPayload, document: HrIssuedDocument) {
  const employee = document.employeeId ? await em.findOneBy(Employee, { id: document.employeeId }) : null
  if (document.employeeId && !employee) throw new NotFoundException('الموظف المرتبط بالمستند غير موجود')
  const owner = !!employee && user.employeeId === employee.id
  const currentBranch = employee?.branchId ?? document.branchId
  if (!owner && (!userHasPerm(user, 'documents.manage') || !inBranchScope(branchScopeOf(user), currentBranch))) throw new ForbiddenException('لا تملك صلاحية الاطلاع على هذا المستند')
  if (document.isFinancial && (!employee || !canReadEmployeeFinance(user, employee.id))) throw new ForbiddenException('المستند يحتوي بيانات مالية لا تملك صلاحية الاطلاع عليها')
}

export async function assertHrDocumentFileAccess(em: EntityManager, user: JwtPayload, file: StoredFile) {
  const document = await em.findOneBy(HrIssuedDocument, { fileId: file.id })
  if (!document || document.id !== file.entityId || document.employeeId !== (file.employeeId ?? null)) throw new NotFoundException('سجل المستند غير موجود')
  await assertHrDocumentAccess(em, user, document)
  return document
}

/**
 * B2.7-ب: حكم الإدارة على المستند (إلغاء طلب إقراره) — صاحب «إدارة المستندات» وفرع الموظف دلوقتي في نطاقه، وبالحكم المالي للمستند المالي.
 * من غير اختصار «صاحب المستند» (ده للقراءة بس). الموظف بيتقري بقفل مشاركة لآخر المعاملة، فنقله في نفس اللحظة يا إما قبل الحكم (فالحكم
 * بفرعه الجديد) يا إما بعد ما المعاملة تخلص. false = المستند مش ظاهر للحساب، والمنادي بيرد زي المستند اللي مش موجود.
 */
export async function hrDocumentManageable(em: EntityManager, user: JwtPayload, document: HrIssuedDocument): Promise<boolean> {
  const employee = document.employeeId ? await em.findOne(Employee, { where: { id: document.employeeId }, lock: { mode: 'pessimistic_read' } }) : null
  if (document.employeeId && !employee) return false
  if (!userHasPerm(user, 'documents.manage') || !inBranchScope(branchScopeOf(user), employee?.branchId ?? document.branchId)) return false
  return !document.isFinancial || (!!employee && canReadEmployeeFinance(user, employee.id))
}
