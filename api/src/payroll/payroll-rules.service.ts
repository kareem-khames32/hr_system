import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LatenessTier, LatenessTierMode } from './payroll-rules.entities'

// إدارة معادلات الرواتب: شرائح التأخير (CRUD) — تُقرأ في حساب المسير
@Injectable()
export class PayrollRulesService {
  constructor(
    @InjectRepository(LatenessTier)
    private readonly tiers: Repository<LatenessTier>
  ) {}

  listTiers() {
    return this.tiers.find({ order: { fromMinutes: 'ASC' } })
  }

  // الشرائح النشطة مرتبة تصاعدياً — لتطبيقها في المسير
  activeTiers() {
    return this.tiers.find({
      where: { isActive: true },
      order: { fromMinutes: 'ASC' },
    })
  }

  async createTier(dto: {
    fromMinutes: number
    toMinutes?: number | null
    mode: LatenessTierMode
    value?: number
    label?: string
  }) {
    const from = Number(dto.fromMinutes)
    if (!Number.isFinite(from) || from < 0) {
      throw new BadRequestException('«من دقيقة» رقم غير سالب')
    }
    const to = dto.toMinutes == null ? null : Number(dto.toMinutes)
    if (to != null && to < from) {
      throw new BadRequestException('«إلى» يجب أن يكون ≥ «من»')
    }
    if (dto.mode !== 'FRACTION' && dto.mode !== 'MINUTES') {
      throw new BadRequestException('النمط: FRACTION (كسر يوم) أو MINUTES (بالدقيقة)')
    }
    const value = dto.mode === 'FRACTION' ? Number(dto.value ?? 0) : 0
    if (dto.mode === 'FRACTION' && !(value > 0)) {
      throw new BadRequestException('كسر اليوم يجب أن يكون أكبر من صفر (مثل 0.25)')
    }
    return this.tiers.save(
      this.tiers.create({
        fromMinutes: from,
        toMinutes: to as any,
        mode: dto.mode,
        value,
        label: dto.label ?? (null as any),
        isActive: true,
      })
    )
  }

  async updateTier(
    id: number,
    dto: Partial<{
      fromMinutes: number
      toMinutes: number | null
      mode: LatenessTierMode
      value: number
      label: string
      isActive: boolean
    }>
  ) {
    const row = await this.tiers.findOne({ where: { id } })
    if (!row) throw new NotFoundException('الشريحة غير موجودة')
    if (dto.fromMinutes !== undefined) row.fromMinutes = Number(dto.fromMinutes)
    if (dto.toMinutes !== undefined) row.toMinutes = dto.toMinutes as any
    if (dto.mode !== undefined) row.mode = dto.mode
    if (dto.value !== undefined) row.value = Number(dto.value)
    if (dto.label !== undefined) row.label = dto.label
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    if (row.toMinutes != null && Number(row.toMinutes) < Number(row.fromMinutes)) {
      throw new BadRequestException('«إلى» يجب أن يكون ≥ «من»')
    }
    return this.tiers.save(row)
  }

  async deleteTier(id: number) {
    const row = await this.tiers.findOne({ where: { id } })
    if (!row) throw new NotFoundException('الشريحة غير موجودة')
    await this.tiers.delete({ id })
    return { ok: true }
  }
}
