import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { EntityManager, In, Not } from 'typeorm'
import { assetVisibleTo, custodyTransferProblem, employeeInScope } from '../assets/asset-branch'
import { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import { Request } from './entities/request.entity'
import { assertEmployeeId } from './employment-destinations'

const open = ['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']
export async function custodyTransferTarget(em: EntityManager, assignmentId: number, toEmployeeId: number, req?: Request, actor?: JwtPayload, lock = false) {
  assertEmployeeId(assignmentId, 'إسناد العهدة')
  assertEmployeeId(toEmployeeId, 'الموظف المستلم')
  const found = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId })
  if (!found) throw new NotFoundException('إسناد العهدة غير موجود')
  // لا كاشف وجود عبر الفروع (مسار أمين العهدة المباشر): عهدة موظف خارج نطاق صاحب الإجراء = نفس رد الإسناد الغايب بالحرف
  const actorScope = actor ? branchScopeOf(actor) : null
  if (actor && !req && actorScope !== null) {
    const holder = await em.getRepository(Employee).findOne({ where: { id: found.employeeId }, select: { id: true, branchId: true } })
    if (!employeeInScope(actorScope, holder)) throw new NotFoundException('إسناد العهدة غير موجود')
  }
  const asset = await em.getRepository(Asset).findOne({ where: { id: found.assetId }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
  const row = await em.getRepository(CustodyAssignment).findOneBy({ id: assignmentId })
  if (!row || row.status !== 'ACTIVE') throw new BadRequestException('يُنقل فقط ما هو نشط بحوزة الموظف حالياً')
  if (req && row.employeeId !== req.requesterId) throw new ForbiddenException('العهدة ليست باسم صاحب الطلب')
  const owner = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
  const target = await em.getRepository(Employee).findOneBy({ id: toEmployeeId })
  // موظف مستلم خارج نطاق صاحب الإجراء = نفس رد الموظف الغايب (زي ملفات الموظفين)
  if (!owner || !target || !target.isActive || ['terminated', 'archived', 'suspended'].includes(target.status) || !employeeInScope(actorScope, target)) {
    throw new BadRequestException('الموظف المستلم غير موجود أو غير نشط')
  }
  if (target.id === owner.id) throw new BadRequestException('الموظف المستلم هو نفسه الحامل الحالي')
  // عزل الفروع (تدقيق الأدوار D3): النقل جوه الفرع الواحد. بين فرعين = قرار حساب نطاقه كل الفروع بنفسه من شاشة العهد
  // (الحكم على ناتج branchScopeOf مش على اسم الدور)؛ طلب نقل العهدة في الخدمة الذاتية يفضل جوه الفرع دايمًا
  // لأن تنفيذه بعد الاعتماد بيتم بلا صاحب إجراء. فرع الأصل بيتنقل لفرع المستلم لحظة اعتماد مديره (managerConfirmCustody).
  const scope = actor && !req ? branchScopeOf(actor) : undefined
  const crossBranch = custodyTransferProblem(scope, owner, target)
  if (crossBranch || (req?.branchId != null && req.branchId !== owner.branchId)) throw new ForbiddenException(crossBranch ?? 'نقل العهدة يتطلب موظفين في نفس الفرع')
  if (actor) {
    if (actorScope !== null && (owner.branchId !== actorScope || target.branchId !== actorScope)) throw new ForbiddenException('العهدة أو الموظف المستلم خارج نطاق فرعك')
    // والأصل نفسه مايكونش أصل فرع تاني (أصل قديم بلا فرع في حوزة موظف الفرع بيكمّل دورته، وبيتختم بفرع المستلم عند التنشيط)
    if (asset && !assetVisibleTo(actorScope, asset)) throw new ForbiddenException('العهدة أو الموظف المستلم خارج نطاق فرعك')
  }
  if (!asset || asset.status !== 'ASSIGNED' || asset.currentHolderId !== owner.id) throw new BadRequestException('سجل الأصل لا يطابق حامل العهدة الحالي — راجع المخزون')
  const pending = await em.getRepository(CustodyAssignment).count({ where: { assetId: row.assetId, id: Not(row.id), status: In(open) } })
  if (pending) throw new BadRequestException('للأصل إسناد أو نقل آخر بانتظار الاستلام')
  return { row, asset, owner, target }
}

export async function startCustodyTransfer(em: EntityManager, assignmentId: number, toEmployeeId: number, req?: Request, actor?: JwtPayload) {
  const { row, target } = await custodyTransferTarget(em, assignmentId, toEmployeeId, req, actor, true)
  // Source stays ACTIVE and currentHolderId stays the source employee until the
  // recipient's manager confirms. A pending transfer therefore has a clear owner.
  return em.getRepository(CustodyAssignment).save({ assetId: row.assetId, employeeId: target.id,
    assignedBy: row.employeeId, requestId: req?.id || undefined, status: 'PENDING_ACK' })
}

export async function finishCustodyRequest(em: EntityManager, requestId?: number) {
  if (!requestId) return
  const rows = await em.getRepository(CustodyAssignment).findBy({ requestId })
  if (!rows.length || rows.some(row => ['PENDING_ACK', 'PENDING_MANAGER_CONFIRM'].includes(row.status))) return
  const req = await em.getRepository(Request).findOneBy({ id: requestId })
  if (req?.status === 'IN_EXECUTION') {
    req.status = rows.every(row => row.status === 'REJECTED') ? 'REJECTED' : 'COMPLETED'
    req.completedAt = new Date()
    await em.getRepository(Request).save(req)
  }
}
