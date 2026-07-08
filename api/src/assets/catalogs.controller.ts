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
import type { ObjectLiteral } from 'typeorm'
import { JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { AttendancePunch, PermissionType } from '../attendance/attendance.entities'
import { Branch } from '../org/entities/branch.entity'
import {
  AssetType,
  BiometricDevice,
  CostCenter,
  Grade,
  JobTitle,
  PublicHoliday,
  Shift,
} from './assets.entities'

// كتالوجات الإعدادات: عطلات/ورديات/أجهزة/مسميات/درجات/أنواع أصول
// CRUD موحّد بسيط — القراءة للجميع والتعديل للأدمن/HR
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @InjectRepository(BiometricDevice)
    private readonly devices: Repository<BiometricDevice>,
    @InjectRepository(JobTitle)
    private readonly jobTitles: Repository<JobTitle>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(AssetType)
    private readonly assetTypes: Repository<AssetType>,
    @InjectRepository(CostCenter)
    private readonly costCenters: Repository<CostCenter>,
    @InjectRepository(PermissionType)
    private readonly permissionTypes: Repository<PermissionType>,
    @InjectRepository(AttendancePunch)
    private readonly punches: Repository<AttendancePunch>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>
  ) {}

  private repoOf(kind: string): Repository<ObjectLiteral> {
    switch (kind) {
      case 'holidays':
        return this.holidays
      case 'shifts':
        return this.shifts
      case 'devices':
        return this.devices
      case 'job-titles':
        return this.jobTitles
      case 'grades':
        return this.grades
      case 'asset-types':
        return this.assetTypes
      case 'permission-types':
        return this.permissionTypes
      case 'cost-centers':
        return this.costCenters
      default:
        throw new NotFoundException('كتالوج غير معروف')
    }
  }

  @Get(':kind')
  async list(@Param('kind') kind: string) {
    const rows = await this.repoOf(kind).find({ order: { id: 'ASC' } })
    // الأجهزة: نُثري بآخر ظهور (آخر بصمة بالسيريال) واسم الفرع
    if (kind === 'devices') {
      const allBranches = await this.branches.find()
      const bById = new Map(allBranches.map((b) => [b.id, b.name]))
      const enriched = []
      for (const d of rows as BiometricDevice[]) {
        const last = await this.punches.findOne({
          where: { deviceSn: d.serialNumber },
          order: { punchTime: 'DESC' },
        })
        enriched.push({
          ...d,
          branchName: bById.get(d.branchId) ?? `#${d.branchId}`,
          lastSeen: last?.punchTime ?? null,
        })
      }
      return enriched
    }
    return rows
  }

  @Perm('settings.manage')
  @Post(':kind')
  async create(@Param('kind') kind: string, @Body() body: Record<string, unknown>) {
    const repo = this.repoOf(kind)
    this.validate(kind, body)
    try {
      return await repo.save(repo.create(body))
    } catch (e: any) {
      // قيود التفرد من القاعدة برسالة مفهومة
      if (String(e.message).includes('duplicate') || e.number === 2601 || e.number === 2627) {
        throw new BadRequestException('القيمة مكررة — الاسم/الكود مستخدم بالفعل')
      }
      throw e
    }
  }

  @Perm('settings.manage')
  @Patch(':kind/:id')
  async update(
    @Param('kind') kind: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>
  ) {
    const repo = this.repoOf(kind)
    const row = await repo.findOne({ where: { id } })
    if (!row) throw new NotFoundException('السجل غير موجود')
    delete body.id
    Object.assign(row, body)
    return repo.save(row)
  }

  // تحقق الحد الأدنى لكل كتالوج — رسائل عربية
  private validate(kind: string, b: Record<string, unknown>) {
    const need = (field: string, label: string) => {
      if (b[field] === undefined || b[field] === null || b[field] === '') {
        throw new BadRequestException(`${label} مطلوب`)
      }
    }
    const time = (field: string, label: string) => {
      if (b[field] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b[field]))) {
        throw new BadRequestException(`${label} بصيغة HH:mm (وقت صحيح)`)
      }
    }
    switch (kind) {
      case 'holidays':
        need('name', 'اسم العطلة')
        need('date', 'تاريخ العطلة')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) {
          throw new BadRequestException('تاريخ العطلة بصيغة YYYY-MM-DD')
        }
        break
      case 'shifts':
        need('name', 'اسم الوردية')
        need('startTime', 'بداية الوردية')
        need('endTime', 'نهاية الوردية')
        time('startTime', 'بداية الوردية')
        time('endTime', 'نهاية الوردية')
        break
      case 'devices':
        need('name', 'اسم الجهاز')
        need('serialNumber', 'السيريال')
        need('branchId', 'فرع الجهاز')
        break
      case 'job-titles':
        need('title', 'المسمى الوظيفي')
        break
      case 'grades':
        need('name', 'اسم الدرجة')
        break
      case 'asset-types':
        need('name', 'اسم النوع')
        break
      case 'permission-types':
        need('nameAr', 'اسم نوع الإذن')
        break
      case 'cost-centers':
        need('name', 'اسم مركز التكلفة')
        need('code', 'كود مركز التكلفة')
        break
    }
  }
}
