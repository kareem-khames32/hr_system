import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { EntityManager, Not } from 'typeorm'
import { User } from '../auth/user.entity'
import { EmployeeDocument } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from './stored-file.entity'

// Must run in the transaction saving the employee/document. A new-employee
// upload has no target id yet and may temporarily belong to its uploader.
export async function linkEmployeeFiles(em: EntityManager, employeeId: number, refs: (string | undefined)[], actorId?: number) {
  const ids = new Set<number>()
  for (const ref of refs) {
    if (!ref?.startsWith('file:')) continue // preserve legacy external references
    if (!/^file:[1-9]\d*$/.test(ref) || !Number.isSafeInteger(Number(ref.slice(5)))) throw new BadRequestException('مرجع الملف غير صالح')
    ids.add(Number(ref.slice(5)))
  }
  if (!ids.size) return
  const actor = actorId ? await em.findOneBy(User, { id: actorId }) : null
  for (const id of [...ids].sort((a, b) => a - b)) {
    const file = await em.findOne(StoredFile, { where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!file) throw new NotFoundException('الملف غير موجود')
    if (file.employeeId === employeeId) continue
    const preliminary = !!actor && file.uploadedBy === actor.id &&
      (file.employeeId == null || file.employeeId === actor.employeeId) &&
      file.entityId == null && !['request', 'company_logo'].includes(file.entityType)
    if (!preliminary ||
        await em.findOneBy(EmployeeDocument, { fileRef: `file:${id}`, employeeId: Not(employeeId) }) ||
        await em.findOneBy(Employee, { photoFileId: id, id: Not(employeeId) })) {
      throw new ForbiddenException('لا يمكن إرفاق ملف يخص موظفاً أو سجلاً آخر')
    }
    file.employeeId = employeeId
    await em.save(StoredFile, file)
  }
}
