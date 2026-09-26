import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsString, Matches, MaxLength } from 'class-validator'
import { DataSource, In } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { leaveView } from '../common/leave-contract'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { Leave } from './entities/leave.entities'
import { leaveAttachmentOverdue } from './leave-attachment-rules'

class AttachLeaveFileDto {
  // مرجع الملف المرفوع أولًا عبر POST /files/upload (نفس آلية مرفقات الطلبات)
  @IsString() @MaxLength(40) @Matches(/^file:\d+$/, { message: 'مرجع الملف بصيغة file:<رقم> من رفع الملفات' })
  fileRef: string
}

// مرفق الإجازة «بعد الرجوع»: الموظف نفسه أو الموارد البشرية (leaves.revoke) في نطاق فرعها يربط الملف المرفوع بالإجازة
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeaveAttachmentsController {
  constructor(private readonly ds: DataSource) {}

  @Post(':id/attachment')
  async attach(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: AttachLeaveFileDto) {
    const leave = await this.ds.getRepository(Leave).findOne({ where: { id } })
    if (!leave) throw new NotFoundException('الإجازة غير موجودة')
    const own = !!user.employeeId && leave.employeeId === user.employeeId
    if (!own) {
      if (!userHasPerm(user, 'leaves.revoke')) throw new ForbiddenException('يرفع مرفق الإجازة صاحبها أو الموارد البشرية')
      const scope = branchScopeOf(user)
      const emp = await this.ds.getRepository(Employee).findOne({ where: { id: leave.employeeId }, select: { id: true, branchId: true } })
      if (!emp || !inBranchScope(scope, emp.branchId)) throw new NotFoundException('الإجازة غير موجودة')
    }
    if (leave.status !== 'APPROVED') throw new BadRequestException('يُرفق المستند لإجازة معتمدة فقط')
    if (leave.attachmentStatus === 'MISSED') {
      throw new BadRequestException(`انتهت مهلة المرفق في ${leave.attachmentDueDate} وتحولت أيام الإجازة بدون راتب — راجع الموارد البشرية`)
    }
    // بلا موعد تسليم = الإجازة لا تنتظر مرفقًا بعد الرجوع (نوعه «مع الطلب»، والملف جاء مع الطلب واعتمده المعتمِد):
    // استبداله يكون بطلب جديد لا من هنا
    if (!leave.attachmentDueDate || (leave.attachmentStatus !== 'PENDING' && leave.attachmentStatus !== 'UPLOADED')) {
      throw new BadRequestException('هذه الإجازة لا تنتظر مرفقًا')
    }
    if (leave.attachmentStatus === 'PENDING' && leaveAttachmentOverdue(leave.attachmentDueDate, localDateOf(new Date()))) {
      throw new BadRequestException(`انتهت مهلة المرفق في ${leave.attachmentDueDate} — تتحول أيام الإجازة بدون راتب`)
    }
    const fileId = Number(dto.fileRef.slice(5))
    const file = Number.isSafeInteger(fileId) && fileId > 0 ? await this.ds.getRepository(StoredFile).findOne({ where: { id: fileId } }) : null
    // نفس قاعدة مرفقات الطلبات: الملف رفعه المستخدم نفسه أو يخص صاحب الإجازة
    if (!file || !(file.uploadedBy === user.sub || file.employeeId === leave.employeeId)) {
      throw new ForbiddenException('الملف غير موجود أو لا يخصك ولا يخص صاحب الإجازة')
    }
    const result = await this.ds.getRepository(Leave).update({ id, status: 'APPROVED', attachmentStatus: In(['PENDING', 'UPLOADED']) },
      { attachmentRef: dto.fileRef, attachmentStatus: 'UPLOADED' })
    if (!result.affected) throw new ConflictException('تغيّرت حالة الإجازة أثناء الرفع — حدّث الصفحة')
    return leaveView(await this.ds.getRepository(Leave).findOneOrFail({ where: { id } }))
  }
}
