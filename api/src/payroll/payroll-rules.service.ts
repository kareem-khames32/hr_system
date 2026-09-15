import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import { LatenessTier, LatenessTierMode } from './payroll-rules.entities'
import { PayrollLatenessTierSet, PayrollLatenessTierSetTier } from './payroll-lateness-tier-sets.entities'
import { PAYROLL_LATENESS_TIER_LIMITS, PAYROLL_LATENESS_TIER_MODE_LABELS, payrollLatenessTierPeriod, payrollLatenessTierSetHash, readPayrollLatenessTierSetById,
  validatePayrollLatenessTiers, type PayrollLatenessTierRow } from './payroll-lateness-tiers'

// إدارة معادلات الرواتب: شرائح التأخير — الخطوة 21: مجموعات مؤرخة متحقق منها (الجدول القديم أرشيف للقراءة فقط)
@Injectable()
export class PayrollRulesService {
  constructor(
    @InjectRepository(LatenessTier)
    private readonly tiers: Repository<LatenessTier>,
    @InjectRepository(PayrollLatenessTierSet)
    private readonly tierSets: Repository<PayrollLatenessTierSet>,
  ) {}

  // الخطوة 21: الكتابة في الجدول القديم أُغلقت؛ الحساب يقرأ مجموعات الشرائح المؤرخة فقط.
  legacyTierWritesClosed(): never {
    throw new GoneException({ code: 'LATE-TIERS-LEGACY-READONLY', message: 'شرائح التأخير القديمة للقراءة فقط: أنشئ «مجموعة شرائح» مؤرخة من شاشة معادلات الرواتب (POST /payroll/rules/lateness-tier-sets)؛ الحفظ يرفض التداخل ويحفظ بصمة المجموعة' })
  }

  private reasonOf(value: unknown) {
    const reason = typeof value === 'string' ? value.trim() : ''
    if (reason.length < 3 || reason.length > PAYROLL_LATENESS_TIER_LIMITS.reasonLength) throw new BadRequestException({ code: 'LATE-TIERS-REASON', message: `اكتب سببًا واضحًا من 3 إلى ${PAYROLL_LATENESS_TIER_LIMITS.reasonLength} حرف` })
    return reason
  }

  private assertManage(user: JwtPayload) {
    if (!userHasPerm(user, 'payroll.policy.manage')) throw new ForbiddenException('إدارة مجموعات شرائح التأخير تتطلب صلاحية إدارة سياسات الرواتب')
  }

  /** كل المجموعات بشرائحها (المفعّلة والموقوفة) + الجدول القديم كأرشيف. */
  async listTierSets() {
    const sets = await this.tierSets.find({ order: { effectivePeriod: 'DESC', id: 'DESC' } })
    const rows = []
    for (const set of sets) {
      let tiers: PayrollLatenessTierRow[] = [], integrity: 'VERIFIED' | 'HASH_MISMATCH' = 'VERIFIED'
      try { tiers = (await readPayrollLatenessTierSetById(this.tierSets.manager, set.id)).tiers } catch (error) {
        if (!(error instanceof ConflictException)) throw error
        integrity = 'HASH_MISMATCH'
      }
      rows.push({ ...set, tiers, integrity })
    }
    return { sets: rows, legacyTiers: await this.listTiers(), modes: PAYROLL_LATENESS_TIER_MODE_LABELS, limits: PAYROLL_LATENESS_TIER_LIMITS }
  }

  /** معاينة بلا حفظ: التطبيع والفجوات والبصمة وأمثلة دقائق (بلا مبالغ لأن سعر الدقيقة يتبع راتب كل موظف). */
  previewTierSet(dto: { effectivePeriod?: unknown; tiers?: unknown }) {
    const effectivePeriod = payrollLatenessTierPeriod(dto.effectivePeriod)
    const { tiers, gaps } = validatePayrollLatenessTiers(dto.tiers)
    const examples = [...new Set([15, 30, 45, 60, 61, 90, 120, 121, 180, ...tiers.flatMap(tier => [tier.fromMinutes, tier.toMinutes ?? tier.fromMinutes + 60])])]
      .filter(minutes => minutes > 0).sort((a, b) => a - b).slice(0, 16).map(minutes => {
        const tier = tiers.find(row => minutes >= row.fromMinutes && (row.toMinutes === null || minutes <= row.toMinutes))
        const effect = !tier ? `${minutes} دقيقة × سعر الدقيقة (بلا شريحة)` : tier.mode === 'FRACTION' ? `${Number(tier.value)} يوم × سعر اليوم`
          : tier.mode === 'MULTIPLIER' ? `${minutes} دقيقة × ${Number(tier.value)} × سعر الدقيقة` : tier.mode === 'MINUTES' ? `${minutes} دقيقة × سعر الدقيقة` : 'بلا خصم'
        return { minutes, tierSequence: tier?.sequence ?? null, effect }
      })
    return { effectivePeriod, tiers, gaps, examples, contentHash: payrollLatenessTierSetHash(effectivePeriod, tiers) }
  }

  /** حفظ مجموعة جديدة؛ المجموعة المفعّلة لنفس شهر السريان تُوقف بسبب واضح (المحتوى لا يُعدّل في مكانه). */
  async createTierSet(user: JwtPayload, dto: { effectivePeriod?: unknown; tiers?: unknown; reason?: unknown }) {
    this.assertManage(user)
    const preview = this.previewTierSet(dto)
    const reason = this.reasonOf(dto.reason)
    const savedId = await this.tierSets.manager.transaction(async em => {
      const lock = await em.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = 'hr:payroll:lateness-tier-sets', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000; SELECT @result AS lockResult;`)
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('مجموعات الشرائح قيد التحديث؛ حاول مجددًا')
      const sameMonth = await em.getRepository(PayrollLatenessTierSet).find({ where: { effectivePeriod: preview.effectivePeriod, isActive: true } })
      if (sameMonth.some(set => set.contentHash === preview.contentHash)) {
        throw new ConflictException({ code: 'LATE-TIERS-UNCHANGED', message: `مجموعة مطابقة مفعّلة بالفعل لشهر ${preview.effectivePeriod}؛ لا حاجة لنسخة جديدة` })
      }
      const saved = await em.getRepository(PayrollLatenessTierSet).save(em.getRepository(PayrollLatenessTierSet).create({ effectivePeriod: preview.effectivePeriod,
        contentHash: preview.contentHash, source: 'EDITOR', reason, isActive: true, createdBy: user.sub, supersedesSetId: sameMonth[0]?.id ?? null }))
      await em.getRepository(PayrollLatenessTierSetTier).save(preview.tiers.map(tier => ({ setId: saved.id, sequence: tier.sequence, fromMinutes: tier.fromMinutes,
        toMinutes: tier.toMinutes, mode: tier.mode, value: tier.value, label: tier.label })))
      for (const old of sameMonth) {
        await em.getRepository(PayrollLatenessTierSet).update({ id: old.id, isActive: true }, { isActive: false, deactivatedBy: user.sub, deactivatedAt: new Date(),
          deactivationReason: `استُبدلت بالمجموعة #${saved.id}: ${reason}`.slice(0, 500) })
      }
      // تحقق بعد الكتابة: المحتوى المقروء يطابق البصمة المحفوظة.
      await readPayrollLatenessTierSetById(em, saved.id)
      return saved.id
    })
    return { savedId, ...(await this.listTierSets()) }
  }

  async deactivateTierSet(user: JwtPayload, id: number, dto: { reason?: unknown }) {
    this.assertManage(user)
    const reason = this.reasonOf(dto.reason)
    const set = await this.tierSets.findOneBy({ id })
    if (!set) throw new NotFoundException('مجموعة الشرائح غير موجودة')
    if (!set.isActive) throw new ConflictException({ code: 'LATE-TIERS-INACTIVE', message: `المجموعة #${id} موقوفة بالفعل` })
    await this.tierSets.update({ id, isActive: true }, { isActive: false, deactivatedBy: user.sub, deactivatedAt: new Date(), deactivationReason: reason })
    return this.listTierSets()
  }

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
