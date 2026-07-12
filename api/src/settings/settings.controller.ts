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
  Matches,
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
  'payroll_officer',
  'it',
  'executive',
  'specific_employee',
]

class ChainStepDto {
  @IsIn(APPROVER_ROLES, { message: 'دور الموافقة غير صالح' })
  approverRole: string

  // متوازية مع الخطوة السابقة (نفس المستوى — كلهم يعتمدون)
  @IsOptional()
  @IsBoolean()
  isParallel?: boolean

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

  // نقل الدورة لفرع (أو null = عامة) — §2.2 تعديل كامل بعد الإنشاء
  @IsOptional()
  branchId?: number | null

  // تنفيذ فوري بلا اعتمادات (لسلسلة فاضية عمداً) — اختيار المالك
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean
}

// ===== بانِي أنواع الطلبات: نوع من الصفر بحقول مخصوصة وجمهور =====
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'file']
const AUDIENCE_MODES = ['all', 'departments', 'roles', 'employees']
// الوجهات المتاحة للبانِي (المنفذة فعلياً + بدون تنفيذ آلي)
const AVAILABLE_HANDLERS: Array<{ key: string; labelAr: string }> = [
  { key: 'none', labelAr: 'بدون تنفيذ آلي (الطلب نفسه هو السجل)' },
  { key: 'leave_calendar_balance', labelAr: 'إجازة تُخصم من الرصيد' },
  { key: 'leave_calendar_payroll', labelAr: 'إجازة بلا خصم رصيد' },
  { key: 'overtime_entries', labelAr: 'قيد أوفرتايم' },
  { key: 'attendance_corrections', labelAr: 'تصحيح بصمة' },
  { key: 'loans_installments', labelAr: 'سلفة بجدول أقساط' },
  { key: 'salary_update_history', labelAr: 'تحديث راتب' },
  { key: 'transfers_effective_date', labelAr: 'نقل بتاريخ سريان' },
  { key: 'employee_update_promotions', labelAr: 'ترقية' },
  { key: 'employee_record', labelAr: 'تحديث بيانات الموظف' },
  { key: 'payroll_bank_secure', labelAr: 'تغيير حساب بنكي (مسار أمني)' },
  { key: 'letter_pdf_generator', labelAr: 'خطاب PDF' },
  { key: 'custody_assignments_ack', labelAr: 'عهدة بتأكيد استلام' },
  { key: 'custody_transfer', labelAr: 'نقل عهدة لموظف آخر' },
  { key: 'overtime_auto', labelAr: 'اعتماد أوفرتايم مكتشف بالبصمة' },
  { key: 'employee_status', labelAr: 'تغيير حالة وظيفية (استقالة/تقاعد)' },
]

class CustomFieldDto {
  @IsString({ message: 'مفتاح الحقل مطلوب' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{1,40}$/, {
    message: 'مفتاح الحقل: حروف إنجليزية وأرقام و_ (يبدأ بحرف)',
  })
  key: string

  @IsString({ message: 'تسمية الحقل مطلوبة' })
  @MinLength(2)
  @MaxLength(100)
  label: string

  @IsIn(FIELD_TYPES, { message: 'نوع الحقل: text/number/date/select/file' })
  type: string

  @IsOptional()
  @IsBoolean()
  required?: boolean

  @IsOptional()
  @IsArray()
  options?: string[]
}

class CreateRequestTypeDto {
  @IsString({ message: 'اسم النوع مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  nameAr: string

  @IsIn(
    ['leaves', 'time_attendance', 'financial', 'employment_status', 'personal_data', 'letters', 'custody_assets', 'training', 'employee_relations'],
    { message: 'الفئة غير صالحة' }
  )
  category: string

  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]{2,40}$/, {
    message: 'الكود: حروف إنجليزية كبيرة وأرقام و_ (اتركه فارغاً للتوليد)',
  })
  code?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredAttachments?: string

  @IsOptional()
  @IsString()
  destinationHandler?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  approvalChainId?: number

  @IsOptional()
  visibleTo?: { mode: string; ids: Array<number | string> }
}

class UpdateRequestTypeFullDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  approvalChainId?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[]

  @IsOptional()
  visibleTo?: { mode: string; ids: Array<number | string> }

  @IsOptional()
  @IsString()
  destinationHandler?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredAttachments?: string
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
    // اسم النوع وفئته من مصدر واحد (مستقل عن فلترة الجمهور) —
    // شاشة السلاسل لا تعتمد على كتالوج الموظف المفلتر
    const types = await this.requestTypes.find()
    const typeByCode = new Map(types.map((t) => [t.code, t]))
    return chains.map((c) => ({
      ...c,
      steps: allSteps.filter((s) => s.chainId === c.id),
      requestTypeName: c.requestTypeCode
        ? typeByCode.get(c.requestTypeCode)?.nameAr ?? null
        : null,
      requestTypeCategory: c.requestTypeCode
        ? typeByCode.get(c.requestTypeCode)?.category ?? null
        : null,
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
    let order = 0
    for (const s of dto.steps) {
      if (!s.isParallel || order === 0) order++
      await this.steps.save(
        this.steps.create({
          chainId: chain.id,
          stepOrder: order,
          approverRole: s.approverRole as any,
          isParallel: !!s.isParallel,
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
    // نقل الدورة لفرع آخر: الكود لازم يفضل فريداً داخل النطاق الجديد
    if (dto.branchId !== undefined && dto.branchId !== chain.branchId) {
      const dup = await this.chains.findOne({
        where: { code: chain.code, branchId: (dto.branchId ?? null) as any },
      })
      if (dup && dup.id !== chain.id) {
        throw new BadRequestException(
          `الكود ${chain.code} مستخدم بالفعل في هذا النطاق`
        )
      }
      chain.branchId = dto.branchId as any
    }
    if (dto.nameAr !== undefined) chain.nameAr = dto.nameAr
    if (dto.isActive !== undefined) chain.isActive = dto.isActive
    if (dto.autoApprove !== undefined) chain.autoApprove = dto.autoApprove
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
    let order = 0
    for (const s of dto.steps) {
      if (!s.isParallel || order === 0) order++
      await this.steps.save(
        this.steps.create({
          chainId: id,
          stepOrder: order,
          approverRole: s.approverRole as any,
          isParallel: !!s.isParallel,
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

  // ===== بانِي الطلبات: عرض + إنشاء من الصفر + تعديل شامل =====
  @Perm('request_types.manage')
  @Get('request-types')
  listRequestTypes() {
    return this.requestTypes.find({ order: { category: 'ASC', id: 'ASC' } })
  }

  // الوجهات المتاحة — لقائمة اختيار البانِي
  @Perm('request_types.manage')
  @Get('destination-handlers')
  destinationHandlers() {
    return AVAILABLE_HANDLERS
  }

  private validateAudience(v?: { mode: string; ids: Array<number | string> }) {
    if (v === undefined) return undefined
    if (!v.mode || !AUDIENCE_MODES.includes(v.mode)) {
      throw new BadRequestException('جمهور النوع: all/departments/roles/employees')
    }
    if (v.mode !== 'all' && (!Array.isArray(v.ids) || v.ids.length === 0)) {
      throw new BadRequestException('حدد عناصر الجمهور (ids)')
    }
    return JSON.stringify({ mode: v.mode, ids: v.ids ?? [] })
  }

  private validateCustomFields(fields?: CustomFieldDto[]) {
    if (fields === undefined) return undefined
    const keys = new Set<string>()
    for (const f of fields) {
      if (keys.has(f.key)) {
        throw new BadRequestException(`مفتاح الحقل مكرر: ${f.key}`)
      }
      keys.add(f.key)
      if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) {
        throw new BadRequestException(`حقل القائمة «${f.label}» يحتاج خيارات`)
      }
    }
    return JSON.stringify(fields)
  }

  // §2.2: نوع طلب جديد من الصفر
  @Perm('request_types.manage')
  @Post('request-types')
  async createRequestType(@Body() dto: CreateRequestTypeDto) {
    // توليد كود من الاسم إن لم يُحدد
    let code = dto.code
    if (!code) {
      const count = await this.requestTypes.count()
      code = `CUSTOM_${count + 1}`
    }
    const dup = await this.requestTypes.findOne({ where: { code } })
    if (dup) throw new BadRequestException(`الكود ${code} مستخدم بالفعل`)
    const handler = dto.destinationHandler ?? 'none'
    if (!AVAILABLE_HANDLERS.some((h) => h.key === handler)) {
      throw new BadRequestException('الوجهة غير معروفة — اختر من القائمة')
    }
    if (dto.approvalChainId) {
      const chain = await this.chains.findOne({
        where: { id: dto.approvalChainId },
      })
      if (!chain) throw new BadRequestException('سلسلة الاعتماد غير موجودة')
    }
    const customFields = this.validateCustomFields(dto.customFields)
    // الحقول المطلوبة (القديمة) تُشتق من المخصّصة الإجبارية
    const requiredKeys = (dto.customFields ?? [])
      .filter((f) => f.required)
      .map((f) => f.key)

    // كل نوع لازم يكون له سلسلته الخاصة — لو المالك ما ربطش واحدة،
    // نُنشئ سلسلة فاضية مسمّاة باسمه (فاضية = توقف الطلب لحد ما تُضبط)
    let chainId = dto.approvalChainId
    if (!chainId) {
      const chainCode = `CH_${code}`
      let chain = await this.chains.findOne({ where: { code: chainCode } })
      if (!chain) {
        chain = await this.chains.save(
          this.chains.create({
            code: chainCode,
            nameAr: `سلسلة اعتماد ${dto.nameAr}`,
            requestTypeCode: code,
            autoApprove: false,
          })
        )
      }
      chainId = chain.id
    }

    return this.requestTypes.save(
      this.requestTypes.create({
        code,
        nameAr: dto.nameAr,
        category: dto.category as any,
        customFields,
        requiredFields: requiredKeys.length
          ? JSON.stringify(requiredKeys)
          : undefined,
        requiredAttachments: dto.requiredAttachments,
        destinationHandler: handler,
        approvalChainId: chainId,
        visibleTo: this.validateAudience(dto.visibleTo),
        phase: 'P1',
      })
    )
  }

  // تعديل شامل: اسم/تفعيل/سلسلة/حقول/جمهور/وجهة/مرفقات
  @Perm('request_types.manage')
  @Patch('request-types/:id')
  async updateRequestType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestTypeFullDto
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
    if (dto.destinationHandler !== undefined) {
      if (!AVAILABLE_HANDLERS.some((h) => h.key === dto.destinationHandler)) {
        throw new BadRequestException('الوجهة غير معروفة')
      }
      type.destinationHandler = dto.destinationHandler
    }
    if (dto.customFields !== undefined) {
      type.customFields = this.validateCustomFields(dto.customFields) as string
      const requiredKeys = dto.customFields
        .filter((f) => f.required)
        .map((f) => f.key)
      type.requiredFields = requiredKeys.length
        ? JSON.stringify(requiredKeys)
        : (null as any)
    }
    if (dto.visibleTo !== undefined) {
      type.visibleTo = this.validateAudience(dto.visibleTo) as string
    }
    if (dto.nameAr !== undefined) type.nameAr = dto.nameAr
    if (dto.requiredAttachments !== undefined) {
      type.requiredAttachments = dto.requiredAttachments
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
