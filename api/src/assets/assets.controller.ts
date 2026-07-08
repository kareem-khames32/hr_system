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
import { In, Repository } from 'typeorm'
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
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
}

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
    private readonly employees: Repository<Employee>
  ) {}

  // ===== الأصول =====
  @Perm('custody.assign')
  @Get('assets')
  async listAssets() {
    const rows = await this.assets.find({ order: { id: 'ASC' } })
    const holderIds = [...new Set(rows.map((a) => a.currentHolderId).filter(Boolean))]
    const holders = holderIds.length
      ? await this.employees.find({ where: { id: In(holderIds as number[]) } })
      : []
    const byId = new Map(holders.map((h) => [h.id, h.fullName]))
    return rows.map((a) => ({
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
    @Body() dto: Partial<CreateAssetDto>
  ) {
    const asset = await this.assets.findOne({ where: { id } })
    if (!asset) throw new NotFoundException('الأصل غير موجود')
    Object.assign(asset, dto)
    return this.assets.save(asset)
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
      assetName: byId.get(r.assetId)?.name ?? '#' + r.assetId,
      assetCategory: byId.get(r.assetId)?.category ?? '',
      serialNumber: byId.get(r.assetId)?.serialNumber ?? null,
    }))
  }

  // عهد مرؤوسيّ المباشرين بانتظار اعتمادي (بعد تأكيد الموظف)
  @Get('custody/pending-my-confirm')
  async pendingMyConfirm(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return []
    const reports = await this.employees.find({
      where: { managerEmployeeId: user.employeeId },
    })
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
  async assign(@Body() dto: AssignCustodyDto) {
    const asset = await this.assets.findOne({ where: { id: dto.assetId } })
    if (!asset) throw new BadRequestException('الأصل غير موجود')
    if (asset.currentHolderId) {
      throw new BadRequestException('الأصل مسلَّم بالفعل لموظف آخر — أرجعه أولاً')
    }
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new BadRequestException('الموظف غير موجود')
    const open = await this.custody.findOne({
      where: {
        assetId: dto.assetId,
        status: In(['PENDING_ACK', 'ACTIVE', 'RETURN_REQUESTED']),
      },
    })
    if (open) throw new BadRequestException('يوجد إسناد مفتوح لهذا الأصل')
    return this.custody.save(
      this.custody.create({
        assetId: dto.assetId,
        employeeId: dto.employeeId,
        status: 'PENDING_ACK',
      })
    )
  }

  @Perm('custody.assign')
  @Post('custody/:id/return')
  async returnCustody(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnCustodyDto
  ) {
    const row = await this.custody.findOne({ where: { id } })
    if (!row) throw new NotFoundException('الإسناد غير موجود')
    if (!['PENDING_ACK', 'ACTIVE', 'RETURN_REQUESTED'].includes(row.status)) {
      throw new BadRequestException('الإسناد مقفول بالفعل')
    }
    row.status = 'RETURNED'
    row.returnedAt = new Date()
    row.condition = dto.condition ?? 'سليمة'
    await this.custody.save(row)
    await this.assets.update({ id: row.assetId }, { currentHolderId: null as any })
    return row
  }
}
