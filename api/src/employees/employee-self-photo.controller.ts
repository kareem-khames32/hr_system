import { BadRequestException, Body, Controller, NotFoundException, Put, UseGuards } from '@nestjs/common'
import { IsInt, Min, ValidateIf } from 'class-validator'
import { DataSource, Not } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { linkEmployeeFiles } from '../files/link-employee-files'
import { StoredFile } from '../files/stored-file.entity'
import { Employee } from './employee.entity'

export class SetOwnPhotoDto {
  // رقم الملف من POST /files/upload (entityType=employee_photo)، أو null لمسح الصورة
  @ValidateIf((_object, value) => value !== null)
  @IsInt({ message: 'ابعت رقم الصورة اللي اترفعت (fileId)، أو null لمسح الصورة' })
  @Min(1, { message: 'ابعت رقم الصورة اللي اترفعت (fileId)، أو null لمسح الصورة' })
  fileId: number | null
}

// صورة الموظف لنفسه من «ملفي الشخصي» (قرار المالك 30 سبتمبر): من غير اعتماد ومن غير employees.edit — ملف صاحب الحساب بس
// (user.employeeId)، مايقدرش يلمس صورة موظف تاني. الصورة لازم يكون رافعها هو بنفسه (stored_files.uploadedBy) كصورة موظف،
// وبعد الربط صاحبها بيشوفها وأي حد عنده employees.view في نطاق فرعه (نفس قاعدة files.controller).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeSelfPhotoController {
  constructor(private readonly ds: DataSource) {}

  @Put('me/photo')
  setOwnPhoto(@CurrentUser() user: JwtPayload, @Body() dto: SetOwnPhotoDto) {
    const employeeId = user.employeeId
    if (!employeeId) throw new BadRequestException('حسابك مش مربوط بملف موظف — الصورة بتتغير من ملف الموظف عند الموارد البشرية')
    return this.ds.transaction(async em => {
      const employee = await em.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
      if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException('الموظف غير موجود')
      const fileId = dto.fileId
      if (fileId !== null) {
        const file = await em.findOne(StoredFile, { where: { id: fileId } })
        // ملف مش هو اللي رافعه = نفس رد الملف الغايب (مايكشفش ملفات غيره)
        if (!file || file.uploadedBy !== user.sub) throw new NotFoundException('الصورة مش موجودة — ارفعها تاني وبعدين احفظ')
        if (file.entityType !== 'employee_photo' || !String(file.mime ?? '').startsWith('image/')) {
          throw new BadRequestException('الملف ده مش صورة شخصية — ارفع صورة JPG أو PNG أو WEBP')
        }
        if ((file.employeeId != null && file.employeeId !== employee.id) ||
            await em.findOne(Employee, { select: { id: true }, where: { photoFileId: fileId, id: Not(employee.id) } })) {
          throw new BadRequestException('الصورة دي مربوطة بموظف تاني — ارفع صورتك من جديد')
        }
        await linkEmployeeFiles(em, employee.id, [`file:${fileId}`], user.sub)
      }
      await em.update(Employee, { id: employee.id }, { photoFileId: fileId as number })
      return { photoFileId: fileId }
    })
  }
}
