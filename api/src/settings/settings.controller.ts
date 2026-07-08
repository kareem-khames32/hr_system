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
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestType } from '../requests/entities/request-type.entity'
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

// أدوار الموافقة المسموحة — تُحل ديناميكياً وقت التشغيل
const APPROVER_ROLES = [
  'direct_manager_of_requester',
  'department_manager_of_requester',
  'branch_manager_of_requester',
  'receiving_team_manager',
  'hr',
  'finance',
  'custody_officer',
  'it',
  'executive',
  'specific_employee',
]

class ChainStepDto {
  @IsIn(APPROVER_ROLES, { message: 'دور الموافقة غير صالح' })
  approverRole: string

  // إجباري فقط عند اختيار «موظف بعينه»
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  specificEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(60)
  thresholdField?: string

  @IsOptional()
  @IsIn(['>=', '>', '<', '<='], { message: 'معامل العتبة: >= أو > أو < أو <=' })
  thresholdOp?: string

  @IsOptional()
  @Type(() => Number)
  thresholdValue?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  slaDays?: number

  @IsOptional()
  @IsIn(APPROVER_ROLES, { message: 'دور التصعيد غير صالح' })
  escalateTo?: string
}

class CreateChainDto {
  @IsString({ message: 'كود السلسلة مطلوب' })
  @MinLength(3)
  @MaxLength(50)
  code: string

  @IsString({ message: 'اسم السلسلة مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  nameAr: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  // بدون الديكوريتر كان whitelist يحذف الخطوات من الجسم كلياً
  @IsArray({ message: 'الخطوات مطلوبة (مصفوفة، ويمكن أن تكون فارغة للأوتوماتيك)' })
  @ValidateNested({ each: true })
  @Type(() => ChainStepDto)
  steps: ChainStepDto[]
}

class UpdateChainDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  isActive?: boolean
}

// إعدادات النظام — كلها للأدمن/HR
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('settings.manage')
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
    private readonly steps: Repository<ApprovalStep>,
    @InjectRepository(RequestType)
    private readonly requestTypes: Repository<RequestType>
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
  @Perm('approval_chains.manage')
  @Get('approval-chains')
  async listChains() {
    const chains = await this.chains.find({ order: { id: 'ASC' } })
    const allSteps = await this.steps.find({ order: { stepOrder: 'ASC' } })
    return chains.map((c) => ({
      ...c,
      steps: allSteps.filter((s) => s.chainId === c.id),
    }))
  }

  @Perm('approval_chains.manage')
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

  // ===== بانِي السلاسل: إنشاء سلسلة كاملة بخطواتها =====
  @Perm('approval_chains.manage')
  @Post('approval-chains')
  async createChain(@Body() dto: CreateChainDto) {
    if (!Array.isArray(dto.steps)) {
      throw new BadRequestException('الخطوات مطلوبة (مصفوفة، ويمكن أن تكون فارغة للأوتوماتيك)')
    }
    // الكود فريد داخل نفس النطاق (عام أو نفس الفرع) —
    // نفس الكود بفرع مختلف = نسخة فرعية تتقدم على العامة
    const dup = await this.chains.findOne({
      where: { code: dto.code, branchId: dto.branchId ?? (null as any) },
    })
    if (dup) {
      throw new BadRequestException(
        `الكود ${dto.code} مستخدم بالفعل في هذا النطاق`
      )
    }
    for (const s of dto.steps) {
      if (s.thresholdField && (!s.thresholdOp || s.thresholdValue === undefined)) {
        throw new BadRequestException(
          'الخطوة الشرطية تحتاج: حقل + معامل + قيمة عتبة'
        )
      }
      if (s.approverRole === 'specific_employee' && !s.specificEmployeeId) {
        throw new BadRequestException(
          'خطوة «موظف بعينه» تحتاج تحديد الموظف'
        )
      }
    }
    const chain = await this.chains.save(
      this.chains.create({
        code: dto.code,
        nameAr: dto.nameAr,
        branchId: dto.branchId,
      })
    )
    let order = 1
    for (const s of dto.steps) {
      await this.steps.save(
        this.steps.create({
          chainId: chain.id,
          stepOrder: order++,
          approverRole: s.approverRole as any,
          specificEmployeeId: s.specificEmployeeId,
          thresholdField: s.thresholdField,
          thresholdOp: s.thresholdOp as any,
          thresholdValue: s.thresholdValue,
          slaDays: s.slaDays,
          escalateTo: s.escalateTo,
        })
      )
    }
    const steps = await this.steps.find({
      where: { chainId: chain.id },
      order: { stepOrder: 'ASC' },
    })
    return { ...chain, steps }
  }

  @Perm('approval_chains.manage')
  @Patch('approval-chains/:id')
  async updateChain(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChainDto
  ) {
    const chain = await this.chains.findOne({ where: { id } })
    if (!chain) throw new NotFoundException('السلسلة غير موجودة')
    Object.assign(chain, dto)
    return this.chains.save(chain)
  }

  // استبدال خطوات سلسلة بالكامل — الطلبات الجارية لا تتأثر
  // (خطواتها محلولة ومخزنة على الطلب نفسه وقت التقديم)
  @Perm('approval_chains.manage')
  @Patch('approval-chains/:id/steps')
  async replaceChainSteps(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { steps: ChainStepDto[] }
  ) {
    const chain = await this.chains.findOne({ where: { id } })
    if (!chain) throw new NotFoundException('السلسلة غير موجودة')
    if (!Array.isArray(dto.steps)) {
      throw new BadRequestException('الخطوات مطلوبة')
    }
    for (const s of dto.steps) {
      if (!APPROVER_ROLES.includes(s.approverRole)) {
        throw new BadRequestException(`دور غير صالح: ${s.approverRole}`)
      }
    }
    await this.steps.delete({ chainId: id })
    let order = 1
    for (const s of dto.steps) {
      await this.steps.save(
        this.steps.create({
          chainId: id,
          stepOrder: order++,
          approverRole: s.approverRole as any,
          specificEmployeeId: s.specificEmployeeId,
          thresholdField: s.thresholdField,
          thresholdOp: s.thresholdOp as any,
          thresholdValue: s.thresholdValue,
          slaDays: s.slaDays,
          escalateTo: s.escalateTo,
        })
      )
    }
    const steps = await this.steps.find({
      where: { chainId: id },
      order: { stepOrder: 'ASC' },
    })
    return { ...chain, steps }
  }

  // ===== بانِي الطلبات (الحد الأدنى): كل الأنواع + تفعيل/ربط سلسلة =====
  @Perm('request_types.manage')
  @Get('request-types')
  listRequestTypes() {
    return this.requestTypes.find({ order: { category: 'ASC', id: 'ASC' } })
  }

  @Perm('request_types.manage')
  @Patch('request-types/:id')
  async updateRequestType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { isActive?: boolean; approvalChainId?: number }
  ) {
    const type = await this.requestTypes.findOne({ where: { id } })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')
    if (dto.approvalChainId !== undefined) {
      const chain = await this.chains.findOne({
        where: { id: dto.approvalChainId },
      })
      if (!chain) throw new BadRequestException('سلسلة الاعتماد غير موجودة')
      type.approvalChainId = dto.approvalChainId
    }
    if (dto.isActive !== undefined) type.isActive = dto.isActive
    return this.requestTypes.save(type)
  }

  // ===== مصفوفة الأدوار والصلاحيات (مصدر الحقيقة من الكود) =====
  @Get('roles')
  roles() {
    return [
      {
        role: 'super_admin',
        nameAr: 'مدير النظام',
        scope: 'كل الفروع',
        permissions: ['كل الصلاحيات', 'إدارة المستخدمين والأدوار', 'الإعدادات', 'اعتماد أي خطوة'],
      },
      {
        role: 'hr_manager',
        nameAr: 'مدير الموارد البشرية',
        scope: 'فرعه (أو الكل لو بلا فرع)',
        permissions: ['إدارة الموظفين', 'خطوات HR في الاعتمادات', 'الرواتب', 'الإعدادات', 'المستخدمون (دون super_admin)'],
      },
      {
        role: 'branch_manager',
        nameAr: 'مدير فرع',
        scope: 'فرعه فقط',
        permissions: ['موظفو فرعه', 'اعتمادات المدير المباشر', 'حضور الفرع', 'تأكيد الأوفرتايم'],
      },
      {
        role: 'employee',
        nameAr: 'موظف',
        scope: 'بياناته فقط',
        permissions: ['طلباته', 'أرصدته', 'حضوره', 'تأكيد استلام العهدة'],
      },
    ]
  }
}
