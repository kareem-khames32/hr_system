import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, Not, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { BONUS_LABELS, bonusDecimal } from '../payroll/bonuses'
import { BonusRequest, BonusType } from '../payroll/bonuses.entities'
import { BonusesService } from '../payroll/bonuses.service'
import { ReviewAssignment, ReviewCycle, type ReviewAssignmentStatus } from './review.entities'
import { ReviewRewardSuggestion, type ReviewRewardStatus } from './review-reward.entity'
import { REVIEW_BANDS, REVIEW_CYCLE_NOT_FOUND, REVIEW_STATUS_LABELS, reviewBand, reviewsReady, type ReviewBandKey } from './review-rules'
import { REVIEWS_PERMISSION, reviewCycleInScope } from './reviews.service'

// B3.8-ب: الربط بالفلوس — من نتايج دورة تقييم، إدارة الأداء بتقترح مكافآت بقاعدة (تقدير ← قيمة). الاقتراح موجّه للمدير المباشر لكل موظف، وهو
// اللي بيقدّم طلب المكافأة بموديول المكافآت الموجود (نطاقه وسقفه وتكراره وسلسلة اعتماده زي ما هي). الاقتراح نفسه مالوش أثر مالي: مفيش قيد في
// الدفتر غير بعد آخر اعتماد في سلسلة المكافأة. إدارة الأداء مابتقدّمش من هنا بالنيابة (قرارها النهائي كان هيعتمد المكافأة فورًا).

export const REWARDS_MIGRATION_MISSING = 'مكافآت نتيجة التقييم محتاجة ترحيل 20261009_116 على قاعدة البيانات'
export const REWARD_NOT_FOUND = 'الاقتراح غير موجود'
export const REWARD_TAKEN = 'الاقتراح ده اتقدّم أو اتصرف عنه النظر قبل كده'
export const REWARD_PERIOD = 'شهر المسير المستهدف بصيغة YYYY-MM'
export const REWARD_VALUES = 'قيم المكافأة: قيمة موجبة لتقدير واحد على الأقل (والتقدير اللي من غير قيمة مابيتقترحلوش)'
export const REWARD_TYPE = 'نوع المكافأة غير متاح، أو مايقترحهوش المدير المباشر'
export const REWARD_PAYROLL_OFF = 'موديول الرواتب مقفول — المكافآت مش متاحة'
export const REWARD_BONUS_PERMISSION = 'اقتراح مكافآت الدورة محتاج صلاحية إدارة المكافآت كمان'
const BONUS_MANAGE = 'bonuses.manage'
const RESULT_STATUSES: ReviewAssignmentStatus[] = ['APPROVED', 'ANNOUNCED', 'ACKNOWLEDGED']
export const REWARD_STATUS_LABELS: Record<ReviewRewardStatus, string> = { SUGGESTED: 'مقترح — مستني المدير', CLAIMED: 'جاري التقديم', SUBMITTED: 'اتقدّم', DISMISSED: 'اتصرف عنه النظر' }
const number = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value))
/** القيمة نص عشري من غير أصفار زايدة (زي ما موديول المكافآت بياخدها) */
const plain = (value: unknown): string => Number(value).toFixed(4).replace(/\.?0+$/, '')

let ready: boolean | null = null
/** جدول ترحيل 116 موجود؟ الموجود بيتحفظ */
export async function rewardsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  if (!(await reviewsReady(em))) return false
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.review_reward_suggestions', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetRewardsCache() { ready = null }

/** قاعدة الاقتراح: قيمة لكل تقدير (الفاضي = من غير اقتراح) */
export function cleanRewardValues(raw: unknown): Partial<Record<ReviewBandKey, string>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException(REWARD_VALUES)
  const keys = REVIEW_BANDS.map((band) => band.key) as string[]
  const values: Partial<Record<ReviewBandKey, string>> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!keys.includes(key)) throw new BadRequestException(REWARD_VALUES)
    if (value === null || value === undefined || value === '') continue
    if (typeof value !== 'string' && typeof value !== 'number') throw new BadRequestException(REWARD_VALUES)
    try { values[key as ReviewBandKey] = bonusDecimal(value, 'قيمة المكافأة', { scale: 4, positive: true, max: '99999999999999' }) } catch { throw new BadRequestException(REWARD_VALUES) }
  }
  if (!Object.keys(values).length) throw new BadRequestException(REWARD_VALUES)
  return values
}

@Injectable()
export class ReviewRewardsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly bonuses: BonusesService, private readonly modules: ModulesService) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, REVIEWS_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة الأداء')
  }

  /** أنواع المكافآت اللي المدير المباشر يقدر يقترحها — لحامل إدارة المكافآت بس (كتالوج الأنواع إعداد)، ولما الرواتب مفتوحة له */
  private async suggestableTypes(user: JwtPayload) {
    if (!userHasPerm(user, BONUS_MANAGE) || !(await this.modules.allowedFor('payroll', user))) return []
    return (await this.bonuses.listTypes(user, false)).filter((type) => type.creatorScopes.includes('DIRECT_MANAGER'))
      .map((type) => ({ id: type.id, nameAr: type.nameAr, calcMethod: type.calcMethod, calcMethodLabel: type.calcMethodLabel }))
  }

  private async suggestionViews(em: EntityManager, rows: ReviewRewardSuggestion[]) {
    const types = new Map((rows.length ? await em.getRepository(BonusType).find({ where: { id: In([...new Set(rows.map((row) => row.bonusTypeId))]) } }) : []).map((row) => [row.id, row]))
    const made = rows.map((row) => row.bonusRequestId).filter((id): id is number => id != null)
    const requests = new Map((made.length ? await em.getRepository(BonusRequest).find({ where: { id: In(made) } }) : []).map((row) => [row.id, row.status]))
    return new Map(rows.map((row) => {
      const type = types.get(row.bonusTypeId), bonusStatus = row.bonusRequestId != null ? requests.get(row.bonusRequestId) ?? null : null
      return [row.id, { id: row.id, status: row.status, statusLabel: REWARD_STATUS_LABELS[row.status] ?? row.status, typeName: type?.nameAr ?? '—',
        calcMethodLabel: type ? BONUS_LABELS.calcMethods[type.calcMethod as keyof typeof BONUS_LABELS.calcMethods] ?? type.calcMethod : null, inputValue: plain(row.inputValue),
        targetPeriod: row.targetPeriod, band: row.band, bandLabel: REVIEW_BANDS.find((band) => band.key === row.band)?.label ?? row.band, finalScore: number(row.finalScore),
        bonusRequestId: row.bonusRequestId, bonusStatus, bonusStatusLabel: bonusStatus ? BONUS_LABELS.statuses[bonusStatus] ?? bonusStatus : null }] as const
    }))
  }

  /**
   * نتايج دورة ومكافآتها المقترحة (لإدارة الأداء): التقييمات المعتمدة والمعلنة لموظفين فرعهم الحالي في نطاق الحساب، بتقديرها، واقتراح كل واحد
   * (وحالة طلب المكافأة اللي اتعمل منه — التتبّع من التقدير لحد الصرف بيكمّل من شاشة المكافآت).
   */
  async cycleRewards(user: JwtPayload, cycleId: number) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await rewardsReady(em))) return { available: false, message: REWARDS_MIGRATION_MISSING, rows: [], types: [], bands: REVIEW_BANDS, canSuggest: false }
    const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: cycleId } })
    if (!cycle || cycle.status === 'DRAFT' || !reviewCycleInScope(user, cycle)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
    const scope = branchScopeOf(user)
    const all = await em.getRepository(ReviewAssignment).find({ where: { cycleId, status: In(RESULT_STATUSES) }, order: { id: 'ASC' } })
    const people = new Map((all.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(all.flatMap((row) => [row.employeeId, row.managerEmployeeId ?? row.employeeId]))]) } }) : []).map((row) => [row.id, row]))
    const rows = all.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null))
    const suggestions = rows.length ? await em.getRepository(ReviewRewardSuggestion).find({ where: { assignmentId: In(rows.map((row) => row.id)), status: Not('DISMISSED') }, order: { id: 'ASC' } }) : []
    const views = await this.suggestionViews(em, suggestions)
    const types = await this.suggestableTypes(user)
    return {
      available: true, cycle: { id: cycle.id, name: cycle.name }, bands: REVIEW_BANDS, types, canSuggest: types.length > 0,
      rows: rows.map((row) => {
        const final = number(row.finalScore), band = reviewBand(final), suggestion = suggestions.find((entry) => entry.assignmentId === row.id)
        const manager = row.managerEmployeeId != null ? people.get(row.managerEmployeeId) : undefined
        return { assignmentId: row.id, employeeName: people.get(row.employeeId)?.fullName ?? '—', managerName: manager && inBranchScope(scope, manager.branchId) ? manager.fullName : null,
          status: row.status, statusLabel: REVIEW_STATUS_LABELS[row.status] ?? row.status, finalScore: final, band, bandLabel: REVIEW_BANDS.find((entry) => entry.key === band)?.label ?? null,
          suggestion: suggestion ? views.get(suggestion.id) ?? null : null }
      }),
    }
  }

  /**
   * اقتراح مكافآت دورة بقاعدة (تقدير ← قيمة) — لإدارة الأداء اللي معاها إدارة المكافآت. تحت قفل صف الدورة: لكل تقييم معتمد أو معلن في نطاق
   * الحساب له تقدير بقيمة، وموظفه له مدير مباشر في ملفه دلوقتي، ومالوش اقتراح قايم ← اقتراح موجّه للمدير ده. ولا طلب مكافأة ولا قيد بيتعمل هنا.
   */
  async suggest(user: JwtPayload, cycleId: number, input: { bonusTypeId?: unknown; targetPeriod?: unknown; values?: unknown }) {
    this.assertManager(user)
    if (!userHasPerm(user, BONUS_MANAGE)) throw new ForbiddenException(REWARD_BONUS_PERMISSION)
    const values = cleanRewardValues(input.values)
    if (typeof input.targetPeriod !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.targetPeriod)) throw new BadRequestException(REWARD_PERIOD)
    const targetPeriod = input.targetPeriod
    if (!(await rewardsReady(this.ds.manager))) throw new BadRequestException(REWARDS_MIGRATION_MISSING)
    if (!(await this.modules.allowedFor('payroll', user))) throw new BadRequestException(REWARD_PAYROLL_OFF)
    const type = (await this.suggestableTypes(user)).find((entry) => entry.id === Number(input.bonusTypeId))
    if (!type) throw new BadRequestException(REWARD_TYPE)
    const result = await this.ds.transaction(async (em) => {
      const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: cycleId }, lock: { mode: 'pessimistic_write' } })
      if (!cycle || cycle.status === 'DRAFT' || !reviewCycleInScope(user, cycle)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
      const scope = branchScopeOf(user)
      const rows = await em.getRepository(ReviewAssignment).find({ where: { cycleId, status: In(RESULT_STATUSES) }, order: { id: 'ASC' } })
      const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In(rows.map((row) => row.employeeId)) } }) : []).map((row) => [row.id, row]))
      const live = new Set((rows.length ? await em.getRepository(ReviewRewardSuggestion).find({ where: { assignmentId: In(rows.map((row) => row.id)), status: Not('DISMISSED') } }) : []).map((row) => row.assignmentId))
      const skipped = { exists: 0, noValue: 0, noManager: 0 }, now = new Date(), made: Array<Partial<ReviewRewardSuggestion>> = []
      for (const row of rows) {
        const employee = people.get(row.employeeId)
        if (!employee || !inBranchScope(scope, employee.branchId)) continue
        const final = number(row.finalScore), band = reviewBand(final), value = band ? values[band] : undefined
        if (live.has(row.id)) skipped.exists += 1
        else if (!band || final === null || !value) skipped.noValue += 1
        // المدير المباشر من ملف الموظف دلوقتي (هو أساس «المدير المباشر» في موديول المكافآت)
        else if (!employee.managerEmployeeId || employee.managerEmployeeId === employee.id) skipped.noManager += 1
        else made.push({ cycleId: cycle.id, assignmentId: row.id, employeeId: row.employeeId, managerEmployeeId: employee.managerEmployeeId, bonusTypeId: type.id, band, finalScore: final.toFixed(2),
          inputValue: value, targetPeriod, status: 'SUGGESTED', bonusRequestId: null, createdByUserId: user.sub, createdAt: now, decidedByUserId: null, decidedAt: null })
      }
      if (made.length) {
        await em.getRepository(ReviewRewardSuggestion).insert(made)
        await recordAudit(em, { category: 'SETTINGS', action: 'REVIEW_REWARDS_SUGGESTED', entityType: 'review_cycle', entityId: cycle.id, actorUserId: user.sub, branchId: null,
          summary: `دورة التقييم «${cycle.name}»: اقتراح ${made.length} مكافأة «${type.nameAr}» لشهر ${targetPeriod}`, after: { count: made.length, bonusTypeId: type.id, targetPeriod, values } })
      }
      return { created: made.length, skipped }
    })
    return { ...result, ...(await this.cycleRewards(user, cycleId)) }
  }

  /** الاقتراحات الموجّهة للحساب (المدير المباشر): لموظفين فرعهم الحالي في نطاقه */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await rewardsReady(em))) return { suggestions: [] }
    const rows = await em.getRepository(ReviewRewardSuggestion).find({ where: { managerEmployeeId: user.employeeId, status: Not('DISMISSED') }, order: { id: 'DESC' } })
    if (!rows.length) return { suggestions: [] }
    const scope = branchScopeOf(user)
    const people = new Map((await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map((row) => row.employeeId))]) } })).map((row) => [row.id, row]))
    const cycles = new Map((await em.getRepository(ReviewCycle).find({ where: { id: In([...new Set(rows.map((row) => row.cycleId))]) } })).map((row) => [row.id, row.name]))
    const visible = rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null))
    const views = await this.suggestionViews(em, visible)
    return { suggestions: visible.map((row) => ({ ...views.get(row.id)!, employeeName: people.get(row.employeeId)?.fullName ?? '—', cycleName: cycles.get(row.cycleId) ?? '—', canSubmit: row.status === 'SUGGESTED' })) }
  }

  /** الاقتراح للحساب: المدير الموجّه له — وإلا غير موجود */
  private async owned(em: EntityManager, user: JwtPayload, id: number, lock = false): Promise<ReviewRewardSuggestion> {
    if (!(await rewardsReady(em))) throw new BadRequestException(REWARDS_MIGRATION_MISSING)
    const row = await em.getRepository(ReviewRewardSuggestion).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!row || !user.employeeId || row.managerEmployeeId !== user.employeeId) throw new NotFoundException(REWARD_NOT_FOUND)
    return row
  }

  /**
   * المدير بيقدّم المكافأة المقترحة: الاقتراح بيتحجز له أولًا (تحت قفل صفه، مرة واحدة)، وبعدين طلب المكافأة بيتعمل باسمه بموديول المكافآت —
   * برّه أي معاملة هنا — بكل أحكامه (النطاق، السقف، التكرار، الفترة) وبيدخل سلسلة اعتماده. لو المكافآت رفضت، الحجز بيرجع والرفض بيطلع زي ما هو.
   */
  async submit(user: JwtPayload, id: number) {
    const seen = await this.owned(this.ds.manager, user, id)
    if (seen.status !== 'SUGGESTED') throw new ConflictException(REWARD_TAKEN)
    if (!(await this.modules.allowedFor('payroll', user))) throw new BadRequestException(REWARD_PAYROLL_OFF)
    const cycle = await this.ds.getRepository(ReviewCycle).findOne({ where: { id: seen.cycleId } })
    const claimed = await this.ds.transaction(async (em) => {
      const row = await this.owned(em, user, id, true)
      if (row.status !== 'SUGGESTED') throw new ConflictException(REWARD_TAKEN)
      await em.getRepository(ReviewRewardSuggestion).update({ id: row.id }, { status: 'CLAIMED', decidedByUserId: user.sub, decidedAt: new Date() })
      return row
    })
    const bandLabel = REVIEW_BANDS.find((band) => band.key === claimed.band)?.label ?? claimed.band
    let made: { id: number }
    try {
      made = await this.bonuses.create(user, { employeeId: claimed.employeeId, bonusTypeId: claimed.bonusTypeId, inputValue: plain(claimed.inputValue), targetPeriod: claimed.targetPeriod,
        reason: `نتيجة دورة التقييم «${cycle?.name ?? claimed.cycleId}» — تقدير ${bandLabel} (${Number(claimed.finalScore)} من 100)` })
    } catch (error) {
      await this.ds.getRepository(ReviewRewardSuggestion).update({ id: claimed.id, status: 'CLAIMED' }, { status: 'SUGGESTED', decidedByUserId: null, decidedAt: null })
      throw error
    }
    await this.ds.getRepository(ReviewRewardSuggestion).update({ id: claimed.id, status: 'CLAIMED' }, { status: 'SUBMITTED', bonusRequestId: made.id })
    return { bonusRequestId: made.id, ...(await this.mine(user)) }
  }

  /** صرف النظر عن اقتراح لسه ماتقدّمش: المدير الموجّه له، أو إدارة الأداء في نطاقها */
  async dismiss(user: JwtPayload, id: number) {
    await this.ds.transaction(async (em) => {
      if (!(await rewardsReady(em))) throw new BadRequestException(REWARDS_MIGRATION_MISSING)
      const row = await em.getRepository(ReviewRewardSuggestion).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const mine = !!row && !!user.employeeId && row.managerEmployeeId === user.employeeId
      let hr = false
      if (row && !mine && userHasPerm(user, REVIEWS_PERMISSION)) {
        const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: row.cycleId } })
        const employee = await em.getRepository(Employee).findOne({ where: { id: row.employeeId } })
        hr = !!cycle && reviewCycleInScope(user, cycle) && !!employee && inBranchScope(branchScopeOf(user), employee.branchId)
      }
      if (!row || (!mine && !hr)) throw new NotFoundException(REWARD_NOT_FOUND)
      if (row.status !== 'SUGGESTED') throw new ConflictException(REWARD_TAKEN)
      await em.getRepository(ReviewRewardSuggestion).update({ id: row.id }, { status: 'DISMISSED', decidedByUserId: user.sub, decidedAt: new Date() })
    })
    return { dismissed: true }
  }
}
