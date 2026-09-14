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
import { Repository } from 'typeorm'
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
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { EmployeesService } from '../employees/employees.service'
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

class HireCandidateDto {
  @IsString({ message: 'كود الموظف (البصمة) مطلوب' })
  employeeCode: string

  @Type(() => Number)
  @IsInt({ message: 'الفرع مطلوب' })
  branchId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number

  @IsOptional()
  @Type(() => Number)
  basicSalary?: number

  @IsOptional()
  joinDate?: string
}

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

  @Get()
  list() {
    return this.candidates.find({ order: { createdAt: 'DESC' } })
  }

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.candidates.save(this.candidates.create(dto))
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateDto
  ) {
    const c = await this.candidates.findOne({ where: { id } })
    if (!c) throw new NotFoundException('المرشح غير موجود')
    if (c.stage === 'hired') {
      throw new BadRequestException('المرشح مُعيَّن بالفعل — لا يُعدَّل')
    }
    Object.assign(c, dto)
    return this.candidates.save(c)
  }

  // التعيين: ينشئ الموظف فعلياً (بكل تحقق الموظفين) ويقفل المرشح
  @Post(':id/hire')
  async hire(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HireCandidateDto,
    @CurrentUser() user: JwtPayload
  ) {
    const c = await this.candidates.findOne({ where: { id } })
    const scope = branchScopeOf(user)
    if (!c || (scope !== null && c.branchId != null && c.branchId !== scope)) throw new NotFoundException('المرشح غير موجود')
    if (scope !== null && dto.branchId !== scope) throw new ForbiddenException('لا يمكنك تعيين الموظف خارج نطاق فرعك')
    if (c.stage === 'hired') throw new BadRequestException('المرشح مُعيَّن بالفعل')
    if (c.stage === 'rejected') {
      throw new BadRequestException('المرشح مرفوض — أعد فتح مرحلته أولاً')
    }
    const employee = await this.employeesService.create({
      employeeCode: dto.employeeCode,
      fullName: c.fullName,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      jobTitle: c.positionTitle,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      basicSalary: dto.basicSalary,
      joinDate: dto.joinDate ?? new Date().toISOString().slice(0, 10),
      status: 'probation',
    } as any, user.sub)
    c.stage = 'hired'
    c.hiredEmployeeId = employee.id
    await this.candidates.save(c)
    return { candidate: c, employee }
  }
}
