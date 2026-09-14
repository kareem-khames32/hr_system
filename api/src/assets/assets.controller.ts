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
import { EntityManager, In, Not, Repository } from 'typeorm'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'

class CreateAssetDto {
  @IsString({ message: 'اسم الأصل مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsString({ message: 'فئة الأصل مطلوبة' })
  @MaxLength(100)
  category: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string

  // قيمة الأصل — اختيارية
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'القيمة لا تكون سالبة' })
  value?: number
}

class UpdateAssetDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  name?: string
  @IsOptional() @IsString() @MaxLength(100)
  category?: string
  @IsOptional() @IsString() @MaxLength(100)
  serialNumber?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  value?: number
}
class WriteOffCustodyDto {
  @IsOptional() @IsString() @MaxLength(100)
  condition?: string
  @IsOptional() @IsBoolean()
  lost?: boolean
}
const OPEN_CUSTODY = ['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']

class AssignCustodyDto {
  @Type(() => Number)
  @IsInt({ message: 'الأصل مطلوب' })
  assetId: number

  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number
}

class ReturnCustodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  condition?: string
}

// إدارة العهدة والأصول (مسار HR المباشر — بجانب مسار الطلبات)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssetsController {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(CustodyAssignment)
    private readonly custody: Repository<CustodyAssignment>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly resolver: ApproverResolver
  ) {}

  // ===== الأصول =====
  @Perm('custody.assign')
  @Get('assets')
  async listAssets(@CurrentUser() user: JwtPayload) {
    const rows = await this.assets.find({ order: { id: 'ASC' } })
    const holderIds = [...new Set(rows.map((a) => a.currentHolderId).filter(Boolean))]
    const holders = holderIds.length
      ? await this.employees.find({ where: { id: In(holderIds as number[]) } })
      : []
    const byId = new Map(holders.map((h) => [h.id, h.fullName]))
    const scope = branchScopeOf(user)
    const visible = new Set(holders.filter(h => scope === null || h.branchId === scope).map(h => h.id))
    return rows.filter(a => !a.currentHolderId || visible.has(a.currentHolderId)).map((a) => ({
      ...a,
      holderName: a.currentHolderId ? (byId.get(a.currentHolderId) ?? null) : null,
    }))
  }

  @Perm('custody.assign')
  @Post('assets')
  createAsset(@Body() dto: CreateAssetDto) {
    return this.assets.save(this.assets.create(dto))
  }

  @Perm('custody.assign')
  @Patch('assets/:id')
  async updateAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: JwtPayload
  ) {
    const asset = await this.assets.findOne({ where: { id } })
    if (!asset) throw new NotFoundException('الأصل غير موجود')
    if (asset.currentHolderId) await this.assertEmployeeScope(user, asset.currentHolderId)
    Object.assign(asset, dto)
    return this.assets.save(asset)
  }

  // إحالة أصل للتقاعد (تالف/مستهلك) — ممنوعة وهو مُسنَد
  @Perm('custody.assign')
  @Post('assets/:id/retire')
  async retireAsset(@Param('id', ParseIntPipe) id: number) {
    const asset = await this.assets.findOne({ where: { id } })
    if (!asset) throw new NotFoundException('الأصل غير موجود')
    if (asset.status === 'ASSIGNED' || asset.currentHolderId || await this.custody.countBy({ assetId: id, status: In(OPEN_CUSTODY) })) {
      throw new BadRequestException('الأصل مُسنَد أو محجوز لموظف — أرجعه أولاً')
    }
    asset.status = 'RETIRED'
    return this.assets.save(asset)
  }

  // إعادة تفعيل أصل متقاعد
  @Perm('custody.assign')
  @Post('assets/:id/reactivate')
  async reactivateAsset(@Param('id', ParseIntPipe) id: number) {
    const asset = await this.assets.findOne({ where: { id } })
    if (!asset) throw new NotFoundException('الأصل غير موجود')
    if (asset.status !== 'RETIRED') {
      throw new BadRequestException('الأصل ليس متقاعداً')
    }
    asset.status = 'AVAILABLE'
    return this.assets.save(asset)
  }

  // الأصول المتاحة — لنموذج «طلب عهدة» (خدمة ذاتية، بيانات مختصرة)
  @Get('assets/available')
  async availableAssets() {
    const rows = await this.assets.find({
      where: { status: 'AVAILABLE' },
      order: { category: 'ASC', name: 'ASC' },
    })
    // استبعد الأصول ذات إسناد عهدة مفتوح (تبقى AVAILABLE طوال PENDING_ACK)
    // حتى لا تُعرض للاختيار في طلب جديد فيُسنَد الأصل لموظفين
    const open = await this.custody.find({
      where: {
        status: In([
          'PENDING_ACK',
          'PENDING_MANAGER_CONFIRM',
          'ACTIVE',
          'RETURN_REQUESTED',
        ]),
      },
      select: ['assetId'],
    })
    const reserved = new Set(open.map((o) => o.assetId))
    return rows
      .filter((a) => !reserved.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber,
      }))
  }

  // عهدي — بورتال الموظف (خدمة ذاتية)
  @Get('custody/mine')
  async myCustody(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return []
    const rows = await this.custody.find({
      where: { employeeId: user.employeeId },
      order: { assignedAt: 'DESC' },
    })
    const assetIds = [...new Set(rows.map((r) => r.assetId))]
    const assetRows = assetIds.length
      ? await this.assets.find({ where: { id: In(assetIds) } })
      : []
    const byId = new Map(assetRows.map((a) => [a.id, a]))
    return rows.map((r) => ({
      ...r,
      assignedByEmployeeId: r.assignedBy ?? null,
      assetName: byId.get(r.assetId)?.name ?? '#' + r.assetId,
      assetCategory: byId.get(r.assetId)?.category ?? '',
      serialNumber: byId.get(r.assetId)?.serialNumber ?? null,
    }))
  }

  // عهد مرؤوسيّ المباشرين بانتظار اعتمادي (بعد تأكيد الموظف)
  @Get('custody/pending-my-confirm')
  async pendingMyConfirm(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return []
    const scope = branchScopeOf(user)
    const candidates = await this.custody.find({ where: { status: 'PENDING_MANAGER_CONFIRM' } })
    if (!candidates.length) return []
    const employees = await this.employees.find({
      where: { id: In([...new Set(candidates.map(c => c.employeeId))]), ...(scope !== null ? { branchId: scope } : {}) },
    })
    const reports: Employee[] = []
    for (const emp of employees) {
      if (await this.resolver.directManagerOf(emp.id) === user.employeeId) reports.push(emp)
    }
    if (reports.length === 0) return []
    const rows = await this.custody.find({
      where: {
        employeeId: In(reports.map((r) => r.id)),
        status: 'PENDING_MANAGER_CONFIRM',
      },
      order: { assignedAt: 'DESC' },
    })
    const assetIds = [...new Set(rows.map((r) => r.assetId))]
    const assetRows = assetIds.length
      ? await this.assets.find({ where: { id: In(assetIds) } })
      : []
    const aById = new Map(assetRows.map((a) => [a.id, a]))
    const eById = new Map(reports.map((e) => [e.id, e]))
    return rows.map((r) => ({
      ...r,
      assignedByEmployeeId: r.assignedBy ?? null,
      employeeName: eById.get(r.employeeId)?.fullName ?? `#${r.employeeId}`,
      assetName: aById.get(r.assetId)?.name ?? `#${r.assetId}`,
    }))
  }

  // ===== إسنادات العهدة =====
  @Perm('custody.assign')
  @Get('custody')
  async listCustody(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const rows = await this.custody.find({
      where: scope !== null ? { employeeId: In(emps.map((e) => e.id)) } : {},
      order: { assignedAt: 'DESC' },
    })
    const assetIds = [...new Set(rows.map((r) => r.assetId))]
    const assetRows = assetIds.length
      ? await this.assets.find({ where: { id: In(assetIds) } })
      : []
    const assetById = new Map(assetRows.map((a) => [a.id, a]))
    return rows.map((r) => ({
      ...r,
      assignedByEmployeeId: r.assignedBy ?? null,
      employeeName: empById.get(r.employeeId)?.fullName ?? `#${r.employeeId}`,
      employeeCode: empById.get(r.employeeId)?.employeeCode ?? '',
      assetName: assetById.get(r.assetId)?.name ?? `#${r.assetId}`,
      assetCategory: assetById.get(r.assetId)?.category ?? '',
      serialNumber: assetById.get(r.assetId)?.serialNumber ?? null,
    }))
  }

  // تسليم مباشر من HR — بانتظار تأكيد استلام الموظف (الملزِم قانونياً)
  @Perm('custody.assign')
  @Post('custody/assign')
  async assign(@Body() dto: AssignCustodyDto, @CurrentUser() user: JwtPayload) {
    return this.assets.manager.transaction(async em => {
      const asset = await em.findOne(Asset, { where: { id: dto.assetId }, lock: { mode: 'pessimistic_write' } })
      if (!asset) throw new BadRequestException('الأصل غير موجود')
      if (asset.status !== 'AVAILABLE' || asset.currentHolderId) throw new BadRequestException('الأصل غير متاح للإسناد')
      const emp = await this.assertEmployeeScope(user, dto.employeeId, em)
      if (!emp.isActive || ['archived', 'terminated'].includes(emp.status)) throw new BadRequestException('الموظف غير نشط')
      if (await em.findOneBy(CustodyAssignment, { assetId: dto.assetId, status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد إسناد مفتوح لهذا الأصل')
      }
      return em.save(CustodyAssignment, em.create(CustodyAssignment, {
        assetId: dto.assetId, employeeId: dto.employeeId,
        assignedBy: user.employeeId ?? undefined, status: 'PENDING_ACK' }))
    })
  }

  @Perm('custody.assign')
  @Post('custody/:id/return')
  async returnCustody(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnCustodyDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.custody.manager.transaction(async em => {
      const current = await em.findOneBy(CustodyAssignment, { id })
      if (!current) throw new NotFoundException('الإسناد غير موجود')
      await this.assertEmployeeScope(user, current.employeeId, em)
      await em.findOne(Asset, { where: { id: current.assetId }, lock: { mode: 'pessimistic_write' } })
      const row = await em.findOneOrFail(CustodyAssignment, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!OPEN_CUSTODY.includes(row.status)) throw new BadRequestException('الإسناد مقفول بالفعل')
      if (await em.findOneBy(CustodyAssignment, { assetId: row.assetId, id: Not(row.id), status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد نقل عهدة معلق لهذا الأصل — أكمله أو ألغِه أولاً')
      }
      row.status = 'RETURNED'
      row.returnedAt = new Date()
      row.condition = dto.condition ?? 'سليمة'
      await em.save(CustodyAssignment, row)
      await em.update(Asset, { id: row.assetId }, { currentHolderId: null as any, status: 'AVAILABLE' })
      return row
    })
  }

  // شطب عهدة مفقودة/تالفة: يقفل الإسناد ويتقاعد الأصل —
  // القيمة تُستخدم كخصم في تصفية إنهاء الخدمة
  @Perm('custody.assign')
  @Post('custody/:id/write-off')
  async writeOff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WriteOffCustodyDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.custody.manager.transaction(async em => {
      const current = await em.findOneBy(CustodyAssignment, { id })
      if (!current) throw new NotFoundException('الإسناد غير موجود')
      await this.assertEmployeeScope(user, current.employeeId, em)
      await em.findOne(Asset, { where: { id: current.assetId }, lock: { mode: 'pessimistic_write' } })
      const row = await em.findOneOrFail(CustodyAssignment, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!OPEN_CUSTODY.includes(row.status)) throw new BadRequestException('الإسناد مقفول بالفعل')
      if (await em.findOneBy(CustodyAssignment, { assetId: row.assetId, id: Not(row.id), status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد نقل عهدة معلق لهذا الأصل — أكمله أو ألغِه أولاً')
      }
      const asset = await em.findOneBy(Asset, { id: row.assetId })
      row.status = dto.lost === false ? 'DAMAGED' : 'LOST'
      row.returnedAt = new Date()
      row.condition = dto.condition ?? (dto.lost === false ? 'تالفة' : 'مفقودة')
      await em.save(CustodyAssignment, row)
      await em.update(Asset, { id: row.assetId }, { currentHolderId: null as any, status: 'RETIRED' })
      return { ...row, assetValue: asset?.value ?? null,
        note: Number(asset?.value) > 0 ? 'تُدرج قيمة الأصل آلياً في تصفية إنهاء الخدمة؛ لا تضف الخصم مرة أخرى' : 'الأصل بلا قيمة مسجلة' }
    })
  }

  private async assertEmployeeScope(user: JwtPayload, employeeId: number, em = this.employees.manager) {
    const scope = branchScopeOf(user)
    const emp = await em.findOneBy(Employee, { id: employeeId })
    if (!emp || (scope !== null && emp.branchId !== scope)) throw new NotFoundException('الموظف غير موجود')
    return emp
  }
}
