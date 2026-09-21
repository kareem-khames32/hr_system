import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
// وصف الشطب وحالة الإرجاع بحد عمود custody_assignments.condition ورسائل عربية
import { ReturnCustodyDto, WriteOffCustodyDto } from './custody.dto'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'
import {
  ASSET_NOT_FOUND, ASSET_UNBRANCHED_READ_ONLY, CUSTODY_NOT_FOUND, assertAllBranches, assertAssetWritable, assertValidBranchId,
  assetBranchMoveProblem, assetVisibleTo, assetWritableBy, custodyBranchProblem, employeeInScope,
} from './asset-branch'

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

  // فرع الأصل: حساب الفرع بيتختم أصله بفرعه تلقائي؛ حساب كل الفروع يختاره (أو يسيبه بلا فرع)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'الفرع غير صالح' })
  @Min(1, { message: 'الفرع غير صالح' })
  branchId?: number
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
  // تحديد/تغيير فرع الأصل — لحساب نطاقه كل الفروع بس
  @IsOptional() @Type(() => Number) @IsInt({ message: 'الفرع غير صالح' }) @Min(1, { message: 'الفرع غير صالح' })
  branchId?: number
}

// تحديد فرع دفعة أصول مرة واحدة (تنظيف الأصول القديمة اللي بلا فرع)
class SetAssetsBranchDto {
  @IsArray({ message: 'اختار الأصول' })
  @ArrayMinSize(1, { message: 'اختار أصل واحد على الأقل' })
  @ArrayMaxSize(500, { message: 'بحد أقصى 500 أصل في المرة' })
  @IsInt({ each: true, message: 'رقم الأصل غير صالح' })
  @Min(1, { each: true, message: 'رقم الأصل غير صالح' })
  assetIds: number[]

  @Type(() => Number)
  @IsInt({ message: 'اختار الفرع' })
  @Min(1, { message: 'اختار الفرع' })
  branchId: number
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


// إدارة العهدة والأصول (مسار HR المباشر — بجانب مسار الطلبات).
// عزل الفروع (تدقيق الأدوار D3): الأصل له فرع، وحساب الفرع يشوف ويعدّل أصول وعهد فرعه بس؛ القاعدة كلها في asset-branch.ts
// وبتحكم على ناتج branchScopeOf (null = كل الفروع) — مش على اسم الدور.
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
    const scope = branchScopeOf(user)
    if (scope !== null && scope < 1) return []
    // حساب الفرع: أصول فرعه + الأصول القديمة اللي لسه بلا فرع (قراءة بس)
    const rows = await this.assets.find({ where: scope === null ? {} : [{ branchId: scope }, { branchId: IsNull() }], order: { id: 'ASC' } })
    const holderIds = [...new Set(rows.map((a) => a.currentHolderId).filter(Boolean))]
    const holders = holderIds.length
      ? await this.employees.find({ where: { id: In(holderIds as number[]) } })
      : []
    const byId = new Map(holders.filter(h => employeeInScope(scope, h)).map((h) => [h.id, h.fullName]))
    const branchIds = [...new Set(rows.map((a) => a.branchId).filter((id): id is number => id != null))]
    const branches = branchIds.length ? await this.assets.manager.find(Branch, { where: { id: In(branchIds) }, select: { id: true, name: true } }) : []
    const branchName = new Map(branches.map((b) => [b.id, b.name]))
    // أصل قديم بلا فرع في عهدة موظف فرع تاني مايظهرش لحساب الفرع
    return rows.filter(a => a.branchId != null || !a.currentHolderId || byId.has(a.currentHolderId)).map((a) => ({
      ...a,
      branchName: a.branchId != null ? (branchName.get(a.branchId) ?? null) : null,
      holderName: a.currentHolderId ? (byId.get(a.currentHolderId) ?? null) : null,
      // حساب الفرع يشوف الأصل اللي بلا فرع ومايعدّلوش
      readOnly: !assetWritableBy(scope, a),
    }))
  }

  @Perm('custody.assign')
  @Post('assets')
  async createAsset(@Body() dto: CreateAssetDto, @CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const { branchId: requested, ...fields } = dto
    let branchId: number | null
    if (scope === null) branchId = requested === undefined ? null : await this.existingBranch(requested)
    else {
      if (scope < 1) throw new ForbiddenException('حسابك مش مربوط بفرع — مايقدرش يضيف أصول')
      if (requested !== undefined && requested !== scope) throw new ForbiddenException('حساب الفرع بيضيف أصول فرعه بس')
      // الأصل الجديد بيتختم بفرع اللي أضافه
      branchId = scope
    }
    return this.assets.save(this.assets.create({ ...fields, branchId }))
  }

  // تحديد فرع دفعة أصول — حساب نطاقه كل الفروع بس (تنظيف الأصول القديمة اللي بلا فرع). قبل :id
  @Perm('custody.assign')
  @Post('assets/branch')
  async setAssetsBranch(@Body() dto: SetAssetsBranchDto, @CurrentUser() user: JwtPayload) {
    assertAllBranches(branchScopeOf(user))
    return this.assets.manager.transaction(async em => {
      const branchId = await this.existingBranch(dto.branchId, em)
      const updated: number[] = [], unchanged: number[] = [], skipped: Array<{ id: number; reason: string }> = []
      for (const id of [...new Set(dto.assetIds)]) {
        const asset = await em.findOne(Asset, { where: { id }, lock: { mode: 'pessimistic_write' } })
        if (!asset) { skipped.push({ id, reason: ASSET_NOT_FOUND }); continue }
        if (asset.branchId === branchId) { unchanged.push(id); continue }
        const problem = await this.branchMoveProblem(em, asset, branchId)
        if (problem) { skipped.push({ id, reason: problem }); continue }
        await em.update(Asset, { id }, { branchId })
        updated.push(id)
      }
      return { branchId, updated, unchanged, skipped }
    })
  }

  @Perm('custody.assign')
  @Patch('assets/:id')
  async updateAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: JwtPayload
  ) {
    const scope = branchScopeOf(user)
    return this.assets.manager.transaction(async em => {
      const asset = assertAssetWritable(scope, await em.findOne(Asset, { where: { id }, lock: { mode: 'pessimistic_write' } }))
      // أصل في فرعي وحامله موظف فرع تاني (بيانات متعارضة): نفس رد الغايب
      if (asset.currentHolderId && !employeeInScope(scope, await em.findOneBy(Employee, { id: asset.currentHolderId }))) throw new NotFoundException(ASSET_NOT_FOUND)
      const { branchId, ...fields } = dto
      Object.assign(asset, fields)
      if (branchId !== undefined && branchId !== asset.branchId) {
        assertAllBranches(scope)
        const target = await this.existingBranch(branchId, em)
        const problem = await this.branchMoveProblem(em, asset, target)
        if (problem) throw new BadRequestException(problem)
        asset.branchId = target
      }
      return em.save(Asset, asset)
    })
  }

  // إحالة أصل للتقاعد (تالف/مستهلك) — ممنوعة وهو مُسنَد
  @Perm('custody.assign')
  @Post('assets/:id/retire')
  async retireAsset(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    const asset = assertAssetWritable(branchScopeOf(user), await this.assets.findOne({ where: { id } }))
    if (asset.status === 'ASSIGNED' || asset.currentHolderId || await this.custody.countBy({ assetId: id, status: In(OPEN_CUSTODY) })) {
      throw new BadRequestException('الأصل مُسنَد أو محجوز لموظف — أرجعه أولاً')
    }
    asset.status = 'RETIRED'
    return this.assets.save(asset)
  }

  // إعادة تفعيل أصل متقاعد
  @Perm('custody.assign')
  @Post('assets/:id/reactivate')
  async reactivateAsset(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    const asset = assertAssetWritable(branchScopeOf(user), await this.assets.findOne({ where: { id } }))
    if (asset.status !== 'RETIRED') {
      throw new BadRequestException('الأصل ليس متقاعداً')
    }
    asset.status = 'AVAILABLE'
    return this.assets.save(asset)
  }

  // الأصول المتاحة — لنموذج «طلب عهدة» (خدمة ذاتية، بيانات مختصرة): أصول فرع صاحب الحساب بس.
  // الأصل القديم اللي بلا فرع مايتطلبش من حساب فرع (طلبه كتابة عليه) فمايتعرضش له.
  @Get('assets/available')
  async availableAssets(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    if (scope !== null && scope < 1) return []
    const rows = await this.assets.find({
      where: { status: 'AVAILABLE', ...(scope === null ? {} : { branchId: scope }) },
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
    // حساب فرع بلا موظفين (أو نطاق فاضي) مالوش عهد يشوفها
    if (scope !== null && emps.length === 0) return []
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
    const scope = branchScopeOf(user)
    return this.assets.manager.transaction(async em => {
      const asset = await em.findOne(Asset, { where: { id: dto.assetId }, lock: { mode: 'pessimistic_write' } })
      // أصل فرع تاني = نفس رد الأصل الغايب
      if (!asset || !assetVisibleTo(scope, asset)) throw new BadRequestException(ASSET_NOT_FOUND)
      if (asset.status !== 'AVAILABLE' || asset.currentHolderId) throw new BadRequestException('الأصل غير متاح للإسناد')
      const emp = await this.assertEmployeeScope(user, dto.employeeId, em)
      if (!emp.isActive || ['archived', 'terminated'].includes(emp.status)) throw new BadRequestException('الموظف غير نشط')
      // العهدة جوه الفرع الواحد: أصل الفرع لموظف الفرع؛ والأصل اللي بلا فرع يسلّمه حساب كل الفروع بس
      const problem = custodyBranchProblem(scope, asset, emp)
      if (problem) throw problem === ASSET_UNBRANCHED_READ_ONLY ? new ForbiddenException(problem) : new BadRequestException(problem)
      if (await em.findOneBy(CustodyAssignment, { assetId: dto.assetId, status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد إسناد مفتوح لهذا الأصل')
      }
      // أصل بلا فرع سلّمه حساب كل الفروع: بيتختم بفرع الموظف من لحظة التسليم
      if (asset.branchId == null) await em.update(Asset, { id: asset.id }, { branchId: emp.branchId })
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
      const { asset, employee } = await this.scopedCustody(user, id, em)
      const row = await em.findOneOrFail(CustodyAssignment, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!OPEN_CUSTODY.includes(row.status)) throw new BadRequestException('الإسناد مقفول بالفعل')
      if (await em.findOneBy(CustodyAssignment, { assetId: row.assetId, id: Not(row.id), status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد نقل عهدة معلق لهذا الأصل — أكمله أو ألغِه أولاً')
      }
      row.status = 'RETURNED'
      row.returnedAt = new Date()
      row.condition = dto.condition ?? 'سليمة'
      await em.save(CustodyAssignment, row)
      await em.update(Asset, { id: row.assetId }, { currentHolderId: null as any, status: 'AVAILABLE', ...this.heldBranchStamp(asset, row, employee) })
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
      const { asset, employee } = await this.scopedCustody(user, id, em)
      const row = await em.findOneOrFail(CustodyAssignment, { where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!OPEN_CUSTODY.includes(row.status)) throw new BadRequestException('الإسناد مقفول بالفعل')
      if (await em.findOneBy(CustodyAssignment, { assetId: row.assetId, id: Not(row.id), status: In(OPEN_CUSTODY) })) {
        throw new BadRequestException('يوجد نقل عهدة معلق لهذا الأصل — أكمله أو ألغِه أولاً')
      }
      row.status = dto.lost === false ? 'DAMAGED' : 'LOST'
      row.returnedAt = new Date()
      row.condition = dto.condition ?? (dto.lost === false ? 'تالفة' : 'مفقودة')
      await em.save(CustodyAssignment, row)
      await em.update(Asset, { id: row.assetId }, { currentHolderId: null as any, status: 'RETIRED', ...this.heldBranchStamp(asset, row, employee) })
      return { ...row, assetValue: asset?.value ?? null,
        note: Number(asset?.value) > 0 ? 'تُدرج قيمة الأصل آلياً في تصفية إنهاء الخدمة؛ لا تضف الخصم مرة أخرى' : 'الأصل بلا قيمة مسجلة' }
    })
  }

  /**
   * عهدة في نطاق السائل مع قفل أصلها: العهدة الغايبة وعهدة موظف فرع تاني نفس الرد بالحرف (لا كاشف وجود).
   * عهدة موظف فرعي على أصل لسه تابع لفرع تاني (الطرف المستلم في نقل بين فرعين قبل اكتماله) ماتتقفلش من هنا.
   * الأصل القديم اللي بلا فرع: عهدته القائمة بتكمّل دورتها عادي في فرع موظفها.
   */
  private async scopedCustody(user: JwtPayload, id: number, em: EntityManager) {
    const scope = branchScopeOf(user)
    const current = await em.findOneBy(CustodyAssignment, { id })
    const employee = current ? await em.findOneBy(Employee, { id: current.employeeId }) : null
    if (!current || !employee || !employeeInScope(scope, employee)) throw new NotFoundException(CUSTODY_NOT_FOUND)
    const asset = await em.findOne(Asset, { where: { id: current.assetId }, lock: { mode: 'pessimistic_write' } })
    if (asset && !assetVisibleTo(scope, asset)) throw new ForbiddenException('الأصل لسه تابع لفرع تاني (نقل بين فرعين لم يكتمل) — يكمّله أو يلغيه حساب نطاقه كل الفروع')
    return { asset, employee }
  }

  /** أصل بلا فرع كان فعلًا في حوزة الموظف: بيرجع لمخزن فرع حامله — نفس قاعدة تعبئة الترحيل (فرع الحامل الحالي). */
  private heldBranchStamp(asset: Asset | null, row: CustodyAssignment, employee: Employee): { branchId?: number } {
    return asset && asset.branchId == null && asset.currentHolderId === row.employeeId ? { branchId: employee.branchId } : {}
  }

  private async existingBranch(value: unknown, em: EntityManager = this.assets.manager): Promise<number> {
    const id = assertValidBranchId(value)
    if (!(await em.countBy(Branch, { id }))) throw new BadRequestException('الفرع غير موجود')
    return id
  }

  /** الأصل اللي في عهدة مفتوحة أو مع حامل مايتنقلش لفرع غير فرع صاحب العهدة. */
  private async branchMoveProblem(em: EntityManager, asset: Asset, branchId: number): Promise<string | null> {
    const open = await em.find(CustodyAssignment, { where: { assetId: asset.id, status: In(OPEN_CUSTODY) }, select: { id: true, employeeId: true } })
    const employeeIds = [...new Set([...open.map(row => row.employeeId), ...(asset.currentHolderId ? [asset.currentHolderId] : [])])]
    if (!employeeIds.length) return null
    const holders = await em.find(Employee, { where: { id: In(employeeIds) }, select: { id: true, branchId: true } })
    // صاحب عهدة مش موجود في جدول الموظفين = فرع مجهول ⇒ مخالف
    return assetBranchMoveProblem(branchId, employeeIds.map(id => holders.find(holder => holder.id === id) ?? { branchId: null }))
  }

  private async assertEmployeeScope(user: JwtPayload, employeeId: number, em = this.employees.manager) {
    const scope = branchScopeOf(user)
    const emp = await em.findOneBy(Employee, { id: employeeId })
    if (!emp || (scope !== null && emp.branchId !== scope)) throw new NotFoundException('الموظف غير موجود')
    return emp
  }
}
