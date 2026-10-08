import {
  BadRequestException,
  ForbiddenException,
  Body,
  Controller,
  Get,
  HttpCode,
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
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import { branchIdIn, branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, scopeWord, userHasPerm } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { EmployeesService } from '../employees/employees.service'
import { CreateEmployeeDto } from '../employees/employees.dto'
import { Candidate, CandidateStage } from './assets.entities'
import { RequireModule } from '../modules-registry/module.guard'
import { CandidateApplicationsService } from '../recruitment/candidate-applications.service'
import { CandidateStagesService } from '../recruitment/candidate-stages.service'

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

  // مطلوبة للمرشح من غير وظيفة شاغرة؛ مع jobId المسمى من الوظيفة
  @ValidateIf((dto: CreateCandidateDto) => dto.jobId == null)
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

  // B3.3-أ: المرشح على وظيفة شاغرة بعينها (اختياري) — المسمى والفرع بيتاخدوا منها. المصدر ورقم الهوية بيتفحصوا في الخدمة برسايلهم
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jobId?: number

  @IsOptional()
  source?: unknown

  @IsOptional()
  nationalId?: unknown
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

  // B3.4-أ: سبب النقل (اختياري) — بيتسجّل مع النقل في سجل المرشح. بيتفحص في الخدمة برسالته
  @IsOptional()
  reason?: unknown
}

// B3.4-أ: نقل جماعي — القيم كلها بتتفحص في الخدمة برسايلها
class MoveCandidatesDto {
  @IsOptional() ids?: unknown
  @IsOptional() stage?: unknown
  @IsOptional() reason?: unknown
}

// التعيين = بيانات إضافة الموظف كاملة بنفس الحقول الإجبارية والتحقق (الاسم بالعربي، الجنسية، الجنس، الميلاد، الجوال،
// الهوية، التعيين، الفرع، القسم، المسمى، الراتب، البصمة). الشاشة بتفتح نموذج الإضافة متعبّي من بيانات المرشح.
export class HireCandidateDto extends CreateEmployeeDto {}

// المرشحون — pipeline التوظيف حتى التعيين الفعلي
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage')
@Controller('candidates')
export class CandidatesController {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidates: Repository<Candidate>,
    private readonly employeesService: EmployeesService,
    private readonly applications: CandidateApplicationsService,
    private readonly stages: CandidateStagesService
  ) {}

  // فصل الفروع: المقيد بفروع يرى مرشحي فروعه (وغير المسندين لفرع — نفس قاعدة التعيين) فقط
  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const rows = await this.candidates.find({
      where: scope === null ? {} : [{ branchId: branchIdIn(scope) }, { branchId: IsNull() }],
      order: { createdAt: 'DESC' },
    })
    // B3.3-أ: وظيفة كل مرشح ومصدره (المرشح من غير وظيفة = null)
    return this.applications.attach(user, rows)
  }

  // ما ينشئه المقيد بفرع يبقى في فرعه؛ والمقيد بأكتر من فرع يختار فرع منها (مفيش اختيار صامت)
  @Post()
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: JwtPayload) {
    // B3.3-أ: على وظيفة شاغرة — الفرع والمسمى منها، والنطاق وفحص التكرار في الخدمة تحت قفل صف الوظيفة
    if (dto.jobId != null) {
      return this.applications.createOnJob(user, { jobId: dto.jobId, fullName: dto.fullName, email: dto.email, phone: dto.phone, notes: dto.notes, source: dto.source, nationalId: dto.nationalId })
    }
    if (dto.source !== undefined || dto.nationalId !== undefined) throw new BadRequestException('المصدر ورقم الهوية للمرشح على وظيفة شاغرة بس')
    const scope = branchScopeOf(user)
    if (scope !== null) {
      if (scope.length === 0) throw new ForbiddenException('حسابك مش مربوط بفرع')
      if (scope.length === 1) dto.branchId = scope[0]
      else if (dto.branchId == null) throw new BadRequestException('حسابك على أكتر من فرع — اختار فرع المرشح')
      else if (!scope.includes(dto.branchId)) throw new ForbiddenException('الفرع المختار خارج نطاق فروعك')
    }
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
    if (!c || (c.branchId != null && !inBranchScope(scope, c.branchId))) throw new NotFoundException('المرشح غير موجود')
    if (c.stage === 'hired') {
      throw new BadRequestException('المرشح مُعيَّن بالفعل — لا يُعدَّل')
    }
    // B3.4-أ: نقل المرحلة من مكانه الواحد (تحت قفل الصف، وبسطر في السجل)، وباقي الخانات المبعوتة بس بتتكتب (مش الكيان كله)
    if (dto.stage !== undefined && dto.stage !== c.stage) await this.stages.move(user, [id], dto.stage, dto.reason)
    else if (dto.reason !== undefined && dto.reason !== null) throw new BadRequestException('سبب النقل بيتبعت مع نقل المرحلة')
    const patch: Partial<Candidate> = {}
    if (dto.notes !== undefined) patch.notes = dto.notes
    if (dto.positionTitle !== undefined) patch.positionTitle = dto.positionTitle
    if (Object.keys(patch).length) await this.candidates.update({ id }, patch)
    return this.candidates.findOne({ where: { id } })
  }

  // B3.4-أ: نقل جماعي لمرحلة (كلهم أو ولا واحد)
  @Post('stage')
  @HttpCode(200)
  moveMany(@Body() dto: MoveCandidatesDto, @CurrentUser() user: JwtPayload) {
    return this.stages.move(user, dto.ids, dto.stage, dto.reason)
  }

  // B3.4-أ: سجل نقل المرشح بين المراحل
  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.stages.history(user, id)
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
    if (!c || (c.branchId != null && !inBranchScope(scope, c.branchId))) throw new NotFoundException('المرشح غير موجود')
    if (!inBranchScope(scope, dto.branchId)) throw new ForbiddenException(`لا يمكنك تعيين الموظف خارج نطاق ${scopeWord(scope)}`)
    if (c.stage === 'hired') throw new BadRequestException('المرشح مُعيَّن بالفعل')
    if (c.stage === 'rejected') {
      throw new BadRequestException('المرشح مرفوض — أعد فتح مرحلته أولاً')
    }
    const employee = await this.employeesService.create(Object.assign(dto, { status: dto.status ?? 'probation' }), user.sub, scope)
    const previousStage = c.stage
    c.stage = 'hired'
    c.hiredEmployeeId = employee.id
    await this.candidates.save(c)
    // B3.4-أ: التعيين سطر في سجل المرشح
    await this.stages.recordHire(user, c.id, previousStage)
    return { candidate: c, employee }
  }
}
