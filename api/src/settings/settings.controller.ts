import {
  BadRequestException,
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
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'

class UpsertConfigDto {
  @IsString()
  @MaxLength(100)
  key: string

  @IsString()
  @MaxLength(500)
  value: string
}

class CreateLeaveTypeDto {
  @IsString({ message: 'كود نوع الإجازة مطلوب' })
  @MinLength(2)
  @MaxLength(50)
  code: string

  @IsString({ message: 'اسم نوع الإجازة مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  nameAr: string

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'], {
    message: 'مصدر الرصيد: annual أو sick أو none',
  })
  balanceSource?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  requiredAttachment?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDays?: number

  @IsOptional()
  @IsBoolean()
  oncePerService?: boolean
}

class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'])
  balanceSource?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  requiredAttachment?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDays?: number

  @IsOptional()
  @IsBoolean()
  oncePerService?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

class UpdateStepDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  slaDays?: number

  @IsOptional()
  @IsString()
  @MaxLength(60)
  escalateTo?: string

  @IsOptional()
  @Type(() => Number)
  thresholdValue?: number
}

// إعدادات النظام — كلها للأدمن/HR
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'hr_manager')
@Controller('settings')
export class SettingsController {
  constructor(
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    @InjectRepository(LeaveType)
    private readonly leaveTypes: Repository<LeaveType>,
    @InjectRepository(ApprovalChain)
    private readonly chains: Repository<ApprovalChain>,
    @InjectRepository(ApprovalStep)
    private readonly steps: Repository<ApprovalStep>
  ) {}

  // ===== إعدادات المحرك (مفاتيح/قيم) =====
  @Get('config')
  listConfig() {
    return this.config.find({ order: { key: 'ASC' } })
  }

  @Patch('config')
  async upsertConfig(@Body() dto: UpsertConfigDto) {
    // مفاتيح جديدة غير مسموحة إلا من الكود — نعدّل الموجود فقط
    const row = await this.config.findOne({ where: { key: dto.key } })
    if (!row) throw new NotFoundException(`المفتاح ${dto.key} غير معروف`)
    row.value = dto.value
    return this.config.save(row)
  }

  // ===== أنواع الإجازات =====
  @Get('leave-types')
  listLeaveTypes() {
    return this.leaveTypes.find({ order: { id: 'ASC' } })
  }

  @Post('leave-types')
  async createLeaveType(@Body() dto: CreateLeaveTypeDto) {
    const dup = await this.leaveTypes.findOne({ where: { code: dto.code } })
    if (dup) throw new BadRequestException(`الكود ${dto.code} مستخدم بالفعل`)
    return this.leaveTypes.save(this.leaveTypes.create(dto))
  }

  @Patch('leave-types/:id')
  async updateLeaveType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveTypeDto
  ) {
    const row = await this.leaveTypes.findOne({ where: { id } })
    if (!row) throw new NotFoundException('نوع الإجازة غير موجود')
    Object.assign(row, dto)
    return this.leaveTypes.save(row)
  }

  // ===== سلاسل الاعتماد (عرض + تعديل SLA/العتبات) =====
  @Get('approval-chains')
  async listChains() {
    const chains = await this.chains.find({ order: { id: 'ASC' } })
    const allSteps = await this.steps.find({ order: { stepOrder: 'ASC' } })
    return chains.map((c) => ({
      ...c,
      steps: allSteps.filter((s) => s.chainId === c.id),
    }))
  }

  @Patch('approval-steps/:id')
  async updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepDto
  ) {
    const step = await this.steps.findOne({ where: { id } })
    if (!step) throw new NotFoundException('الخطوة غير موجودة')
    Object.assign(step, dto)
    return this.steps.save(step)
  }
}
