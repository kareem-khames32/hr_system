import {
  BadRequestException,
  ForbiddenException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { EmployeesService } from '../employees/employees.service'
import { CreateEmployeeDto } from '../employees/employees.dto'
import { Candidate, CandidateStage } from './assets.entities'

const STAGES: CandidateStage[] = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
]

class CreateCandidateDto {
  @IsString({ message: 'اسم المرشح مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  fullName: string

  @IsOptional()
  @IsEmail({}, { message: 'بريد المرشح غير صالح' })
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsString({ message: 'الوظيفة المتقدم لها مطلوبة' })
  @MaxLength(200)
  positionTitle: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}

class UpdateCandidateDto {
  @IsOptional()
  @IsIn(STAGES, { message: 'مرحلة غير صالحة' })
  stage?: CandidateStage

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  positionTitle?: string
}

// التعيين = بيانات إضافة الموظف كاملة بنفس الحقول الإجبارية والتحقق (الاسم بالعربي، الجنسية، الجنس، الميلاد، الجوال،
// الهوية، التعيين، الفرع، القسم، المسمى، الراتب، البصمة). الشاشة بتفتح نموذج الإضافة متعبّي من بيانات المرشح.
export class HireCandidateDto extends CreateEmployeeDto {}

// المرشحون — pipeline التوظيف حتى التعيين الفعلي
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage')
@Controller('candidates')
export class CandidatesController {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidates: Repository<Candidate>,
    private readonly employeesService: EmployeesService
  ) {}

  // فصل الفروع: المقيد بفرع يرى مرشحي فرعه (وغير المسندين لفرع — نفس قاعدة التعيين) فقط
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    return this.candidates.find({
      where: scope === null ? {} : [{ branchId: scope }, { branchId: IsNull() }],
      order: { createdAt: 'DESC' },
    })
  }

  // ما ينشئه المقيد بفرع يبقى في فرعه
  @Post()
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    if (scope !== null) dto.branchId = scope
    return this.candidates.save(this.candidates.create(dto))
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: JwtPayload
  ) {
    const c = await this.candidates.findOne({ where: { id } })
    const scope = branchScopeOf(user)
    if (!c || (scope !== null && c.branchId != null && c.branchId !== scope)) throw new NotFoundException('المرشح غير موجود')
    if (c.stage === 'hired') {
      throw new BadRequestException('المرشح مُعيَّن بالفعل — لا يُعدَّل')
    }
    Object.assign(c, dto)
    return this.candidates.save(c)
  }

  // التعيين: ينشئ الموظف فعلياً (بكل تحقق الموظفين) ويقفل المرشح.
  // التعيين = إضافة موظف: محتاج employees.create كمان (فوق candidates.manage)، زي شاشة /employees/add بالظبط.
  @Post(':id/hire')
  async hire(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HireCandidateDto,
    @CurrentUser() user: JwtPayload
  ) {
    if (!userHasPerm(user, 'employees.create')) throw new ForbiddenException('تعيين المرشح محتاج صلاحية إضافة موظف')
    const c = await this.candidates.findOne({ where: { id } })
    const scope = branchScopeOf(user)
    if (!c || (scope !== null && c.branchId != null && c.branchId !== scope)) throw new NotFoundException('المرشح غير موجود')
    if (scope !== null && dto.branchId !== scope) throw new ForbiddenException('لا يمكنك تعيين الموظف خارج نطاق فرعك')
    if (c.stage === 'hired') throw new BadRequestException('المرشح مُعيَّن بالفعل')
    if (c.stage === 'rejected') {
      throw new BadRequestException('المرشح مرفوض — أعد فتح مرحلته أولاً')
    }
    const employee = await this.employeesService.create(Object.assign(dto, { status: dto.status ?? 'probation' }), user.sub, scope)
    c.stage = 'hired'
    c.hiredEmployeeId = employee.id
    await this.candidates.save(c)
    return { candidate: c, employee }
  }
}
