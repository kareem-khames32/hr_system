import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DeleteResult, Repository } from 'typeorm'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import {
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Perm,
  RolesGuard,
  userHasPerm,
} from '../auth/guards'
import { Employee } from './employee.entity'
import {
  EmployeeCertification,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeLanguage,
  EmployeeSkill,
} from './qualifications.entities'

// ===== DTOs — التحقق في الباك مهما كان الفرونت =====
class EducationDto {
  @IsString({ message: 'المؤهل مطلوب' })
  @MinLength(2)
  @MaxLength(40)
  degree: string

  @IsOptional() @IsString() @MaxLength(150) major?: string
  @IsOptional() @IsString() @MaxLength(200) institution?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  graduationYear?: number

  @IsOptional() @IsString() @MaxLength(500) fileRef?: string
}

class CertificationDto {
  @IsString({ message: 'اسم الشهادة مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsOptional() @IsString() @MaxLength(200) issuer?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الحصول بصيغة YYYY-MM-DD' })
  issueDate?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الانتهاء بصيغة YYYY-MM-DD' })
  expiryDate?: string

  @IsOptional() @IsString() @MaxLength(500) fileRef?: string
}

class ExperienceDto {
  @IsString({ message: 'اسم الشركة مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  company: string

  @IsOptional() @IsString() @MaxLength(150) jobTitle?: string
  @IsOptional() @IsString() @MaxLength(60) country?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ البداية بصيغة YYYY-MM-DD' })
  fromDate?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ النهاية بصيغة YYYY-MM-DD' })
  toDate?: string

  @IsOptional() @IsString() @MaxLength(300) leaveReason?: string
}

class SkillDto {
  @IsString({ message: 'اسم المهارة مطلوب' })
  @MinLength(2)
  @MaxLength(150)
  name: string

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced', 'expert'], {
    message: 'المستوى: beginner/intermediate/advanced/expert',
  })
  level?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number
}

const LANG_LEVELS = ['basic', 'good', 'very_good', 'native']
class LanguageDto {
  @IsString({ message: 'اللغة مطلوبة' })
  @MinLength(2)
  @MaxLength(80)
  language: string

  @IsOptional() @IsIn(LANG_LEVELS, { message: 'مستوى التحدث غير صالح' }) speaking?: string
  @IsOptional() @IsIn(LANG_LEVELS, { message: 'مستوى الكتابة غير صالح' }) writing?: string
  @IsOptional() @IsIn(LANG_LEVELS, { message: 'مستوى القراءة غير صالح' }) reading?: string
}

// مؤهلات الموظف وخبراته — خمس قوائم مستقلة (إضافة/عرض/حذف)
// العرض: صاحب الملف أو employees.view · التعديل: employees.edit
// غير صاحب الملف مقفول على نطاق فرعه، والحذف مربوط بالموظف نفسه
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees/:id')
export class QualificationsController {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(EmployeeEducation)
    private readonly education: Repository<EmployeeEducation>,
    @InjectRepository(EmployeeCertification)
    private readonly certifications: Repository<EmployeeCertification>,
    @InjectRepository(EmployeeExperience)
    private readonly experiences: Repository<EmployeeExperience>,
    @InjectRepository(EmployeeSkill)
    private readonly skills: Repository<EmployeeSkill>,
    @InjectRepository(EmployeeLanguage)
    private readonly languages: Repository<EmployeeLanguage>
  ) {}

  // الموظف يرى مؤهلاته؛ غيره يحتاج employees.view وداخل نطاق فرعه
  private async assertCanView(user: JwtPayload, employeeId: number) {
    if (user.employeeId === employeeId) return
    if (!userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض مؤهلات الموظفين')
    }
    await this.assertEmployee(user, employeeId)
  }

  // الموظف موجود وداخل نطاق فرع المستخدم — نفس سلوك employees.service findOne
  private async assertEmployee(user: JwtPayload, employeeId: number) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    const scope = branchScopeOf(user)
    if (!emp || (scope != null && emp.branchId !== scope)) {
      throw new NotFoundException('الموظف غير موجود')
    }
  }

  // الحذف مربوط بالموظف: سجل لموظف آخر = 404 (لا حذف عبر الملفات)
  private assertDeleted(res: DeleteResult) {
    if (!res.affected) {
      throw new NotFoundException('السجل غير موجود في ملف هذا الموظف')
    }
  }

  // نهاية الخبرة/الشهادة لا تسبق بدايتها
  private assertRange(from?: string, to?: string, label = 'التاريخ') {
    if (from && to && to < from) {
      throw new BadRequestException(`${label}: النهاية قبل البداية`)
    }
  }

  // ===== الملف الكامل: القوائم الخمس دفعة واحدة =====
  @Get('qualifications')
  async all(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    await this.assertCanView(user, id)
    const where = { employeeId: id }
    const order = { id: 'DESC' as const }
    const [education, certifications, experiences, skills, languages] =
      await Promise.all([
        this.education.find({ where, order }),
        this.certifications.find({ where, order }),
        this.experiences.find({ where, order }),
        this.skills.find({ where, order }),
        this.languages.find({ where, order }),
      ])
    return { education, certifications, experiences, skills, languages }
  }

  // ===== المؤهلات الدراسية =====
  @Perm('employees.edit')
  @Post('education')
  async addEducation(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EducationDto
  ) {
    await this.assertEmployee(user, id)
    return this.education.save(this.education.create({ ...dto, employeeId: id }))
  }

  @Perm('employees.edit')
  @Delete('education/:rowId')
  async delEducation(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rowId', ParseIntPipe) rowId: number
  ) {
    await this.assertEmployee(user, id)
    this.assertDeleted(await this.education.delete({ id: rowId, employeeId: id }))
    return { ok: true }
  }

  // ===== الشهادات المهنية =====
  @Perm('employees.edit')
  @Post('certifications')
  async addCertification(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CertificationDto
  ) {
    await this.assertEmployee(user, id)
    this.assertRange(dto.issueDate, dto.expiryDate, 'الشهادة')
    return this.certifications.save(
      this.certifications.create({ ...dto, employeeId: id })
    )
  }

  @Perm('employees.edit')
  @Delete('certifications/:rowId')
  async delCertification(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rowId', ParseIntPipe) rowId: number
  ) {
    await this.assertEmployee(user, id)
    this.assertDeleted(
      await this.certifications.delete({ id: rowId, employeeId: id })
    )
    return { ok: true }
  }

  // ===== الخبرات السابقة =====
  @Perm('employees.edit')
  @Post('experiences')
  async addExperience(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExperienceDto
  ) {
    await this.assertEmployee(user, id)
    this.assertRange(dto.fromDate, dto.toDate, 'الخبرة')
    return this.experiences.save(
      this.experiences.create({ ...dto, employeeId: id })
    )
  }

  @Perm('employees.edit')
  @Delete('experiences/:rowId')
  async delExperience(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rowId', ParseIntPipe) rowId: number
  ) {
    await this.assertEmployee(user, id)
    this.assertDeleted(
      await this.experiences.delete({ id: rowId, employeeId: id })
    )
    return { ok: true }
  }

  // ===== المهارات =====
  @Perm('employees.edit')
  @Post('skills')
  async addSkill(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SkillDto
  ) {
    await this.assertEmployee(user, id)
    return this.skills.save(this.skills.create({ ...dto, employeeId: id }))
  }

  @Perm('employees.edit')
  @Delete('skills/:rowId')
  async delSkill(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rowId', ParseIntPipe) rowId: number
  ) {
    await this.assertEmployee(user, id)
    this.assertDeleted(await this.skills.delete({ id: rowId, employeeId: id }))
    return { ok: true }
  }

  // ===== اللغات =====
  @Perm('employees.edit')
  @Post('languages')
  async addLanguage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LanguageDto
  ) {
    await this.assertEmployee(user, id)
    return this.languages.save(this.languages.create({ ...dto, employeeId: id }))
  }

  @Perm('employees.edit')
  @Delete('languages/:rowId')
  async delLanguage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('rowId', ParseIntPipe) rowId: number
  ) {
    await this.assertEmployee(user, id)
    this.assertDeleted(await this.languages.delete({ id: rowId, employeeId: id }))
    return { ok: true }
  }
}
