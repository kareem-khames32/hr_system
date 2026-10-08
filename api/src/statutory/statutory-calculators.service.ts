import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { EG_TAX_BRACKETS_KEY, EG_TAX_COUNTRY, EG_TAX_HIGH_INCOME_KEY } from '../payroll/eg-salary-tax'
import { EG_OVERTIME_KEY, OVERTIME_LEGAL_MINIMUM_KEY, SA_OVERTIME_KEY } from '../attendance/overtime-legal-minimum'
import { PENALTY_FINE_CAP_KEY, SA_DEDUCTION_CAPS_KEY } from '../cases/penalty-fine-cap'
import { Branch } from '../org/entities/branch.entity'
import { branchCountryOf } from '../org/branch-currency'
import { EG_HEALTH_BRANCHES_KEY, EG_HEALTH_ENABLED_KEY, EG_HEALTH_KEY, EG_MARTYRS_ENABLED_KEY, EG_MARTYRS_FUND_KEY, EG_TAX_ENABLED_KEY, EG_TAX_START_PERIOD_KEY,
  parseStatutoryBranchIds } from '../payroll/payroll-statutory-run'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { StatutoryDefinition } from './statutory.entities'

// B4.4 (ج): تفعيل الحسابات القانونية اللي ورا إعداد (ضريبة كسب العمل، صندوق الشهداء) — المسار الوحيد اللي بيفتحها.
// مقدمة المرحلة 4: الحساب اللي بيعتمد على رقم «محتاج تحقق» مقفول لحد ما المالك يعلّم إنه اتراجع — فالتفعيل لمدير النظام بس، وبس لو صفوف
// الحزمة السارية النهارده والجاية متعلّمة «اتأكد»، تحت قفل صفوفها. وطول ما الحساب مفتوح حزمة الدولة مابتقبلش صف «محتاج تحقق» لمفاتيحه.
// التفعيل بيسري على المسيرات اللي هتتحسب بعده بس — المحسوب والمعتمد لقطته زي ما هي.

export const CALCULATOR_ADMIN_ONLY = 'تفعيل الحسابات القانونية لمدير النظام بس'
export const CALCULATOR_UNKNOWN = 'الحساب ده مش من الحسابات القانونية'
export const CALCULATOR_ENABLED_VALUE = '«مفعّل» نعم أو لا'
export const CALCULATOR_START_PERIOD = 'فترة البداية لازم شهر بصيغة YYYY-MM'
export const CALCULATOR_UNVERIFIED = 'الحساب مايتفعّلش وفيه صفوف له «محتاج تحقق» في حزمة الدولة — راجعها وعلّم «اتأكد» الأول'
export const CALCULATOR_NO_ROWS = 'الحساب مايتفعّلش من غير صف ساري له في حزمة الدولة'
export const CALCULATOR_NOTHING = 'مفيش تغيير'
export const CALCULATOR_BRANCHES = 'اختار الفروع المطبّق فيها الحساب: فروع موجودة ودولتها مصر (فرع واحد على الأقل عند التفعيل)'
export const CALCULATOR_ROW_IN_USE = 'الصف ده بيتحسب بيه دلوقتي (حسابه مفعّل) — لازم يفضل «اتأكد». اقفل الحساب الأول لو محتاج تراجعه'

export interface StatutoryCalculator {
  code: string; label: string; note: string; enabledKey: string; startPeriodKey?: string
  /** B4.4 (د): حساب بيتطبق في فروع مختارة بس (قايمة أرقام فروع من دولة country) */
  branchesKey?: string; country?: string
  /** مفاتيح الحزمة اللي الحساب بيقراها؛ required = لازم يبقى ليه صف ساري */
  keys: Array<{ country: string; key: string; required: boolean }>
}
export const STATUTORY_CALCULATORS: readonly StatutoryCalculator[] = [
  { code: 'EG_SALARY_TAX', label: 'ضريبة كسب العمل (مصر)', note: 'بتتخصم من صافي موظفي فروع مصر في المسيرات اللي هتتحسب من فترة البداية وطالع، بالطريقة التراكمية',
    enabledKey: EG_TAX_ENABLED_KEY, startPeriodKey: EG_TAX_START_PERIOD_KEY,
    keys: [{ country: EG_TAX_COUNTRY, key: EG_TAX_BRACKETS_KEY, required: true }, { country: EG_TAX_COUNTRY, key: EG_TAX_HIGH_INCOME_KEY, required: false }] },
  { code: 'EG_MARTYRS_FUND', label: 'صندوق الشهداء (مصر)', note: 'نسبة من إجمالي استحقاقات موظفي فروع مصر في المسير الأساسي',
    enabledKey: EG_MARTYRS_ENABLED_KEY, keys: [{ country: EG_TAX_COUNTRY, key: EG_MARTYRS_FUND_KEY, required: true }] },
  { code: 'EG_HEALTH_INSURANCE', label: 'التأمين الصحي الشامل (مصر)', note: 'حصة الموظف ومعاليه المؤمَّن عليهم من أجر التأمين، لموظفي الفروع المختارة (المحافظات اللي اتطبق فيها) في المسير الأساسي',
    enabledKey: EG_HEALTH_ENABLED_KEY, branchesKey: EG_HEALTH_BRANCHES_KEY, country: EG_TAX_COUNTRY, keys: [{ country: EG_TAX_COUNTRY, key: EG_HEALTH_KEY, required: true }] },
  // B4.5 (ب): الحد القانوني لمعامل الإضافي — للدولتين، وكل دولة بصفها لو موجود
  { code: 'OVERTIME_LEGAL_MINIMUM', label: 'الحد القانوني لمعامل الإضافي', note: 'تسعير الإضافي الجديد ياخد الأعلى من معامل الشركة والحد القانوني لدولة فرع الموظف (مصر: نهار العمل ويوم الراحة؛ السعودية: أجر الساعة + نسبة من الأساسي). المعتمد والمصروف مابيتغيّرش',
    enabledKey: OVERTIME_LEGAL_MINIMUM_KEY, keys: [{ country: 'EG', key: EG_OVERTIME_KEY, required: false }, { country: 'SA', key: SA_OVERTIME_KEY, required: false }] },
  // B4.5 (د): الحد القانوني لغرامات الشهر في لائحة الجزاءات (السعودية؛ مصر مالهاش رقم في الحزمة)
  { code: 'PENALTY_FINE_CAP', label: 'الحد القانوني لغرامات الشهر', note: 'جزاء «خصم أيام» لموظف فرعه في السعودية بيترفض لو أيامه لوحده أو مع غرامات نفس شهر الخصم عدّت الحد. الجزاءات الموقّعة قبل التفعيل زي ما هي',
    enabledKey: PENALTY_FINE_CAP_KEY, keys: [{ country: 'SA', key: SA_DEDUCTION_CAPS_KEY, required: true }] },
]
/** مفاتيح إعدادات التفعيل — ليها مسارها ده بس (شاشة الإعدادات العامة مابتكتبهاش) */
export const STATUTORY_CALCULATOR_CONFIG_KEYS: readonly string[] = STATUTORY_CALCULATORS.flatMap((entry) => [entry.enabledKey, ...(entry.startPeriodKey ? [entry.startPeriodKey] : []),
  ...(entry.branchesKey ? [entry.branchesKey] : [])])
export const STATUTORY_CALCULATOR_CONFIG_REFUSAL = 'تفعيل الحسابات القانونية من «الإعدادات ← حزمة الدولة» — مش من هنا'

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/
const day = (value: unknown): string => String(value).slice(0, 10)

export interface CalculatorInput { enabled?: unknown; startPeriod?: unknown; branchIds?: unknown }

/** الحسابات المفعّلة اللي بتقرا مفتاح حزمة معيّن (تحت معاملة اللي بيعدّل صف المفتاح) */
export async function enabledCalculatorsOf(em: EntityManager, country: string, key: string): Promise<StatutoryCalculator[]> {
  const using = STATUTORY_CALCULATORS.filter((entry) => entry.keys.some((used) => used.country === country && used.key === key))
  if (!using.length) return []
  const on = new Set((await em.getRepository(RequestsConfig).find({ where: { key: In(using.map((entry) => entry.enabledKey)) } })).filter((row) => row.value === 'true').map((row) => row.key))
  return using.filter((entry) => on.has(entry.enabledKey))
}

@Injectable()
export class StatutoryCalculatorsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** صفوف مفاتيح الحساب السارية النهارده والجاية (القديمة اللي اتبدّلت مش بتتحسب بيها) */
  private async rowsOf(em: EntityManager, calculator: StatutoryCalculator, lock: boolean) {
    const today = localDateOf(new Date())
    const result: Array<{ key: string; required: boolean; effectiveFrom: string; verified: boolean; current: boolean }> = []
    for (const used of calculator.keys) {
      const rows = await em.getRepository(StatutoryDefinition).find({ where: { country: used.country, key: used.key }, order: { effectiveFrom: 'ASC', id: 'ASC' },
        ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
      const current = [...rows].reverse().find((row) => day(row.effectiveFrom) <= today)
      for (const row of rows) {
        if (current && day(row.effectiveFrom) < day(current.effectiveFrom)) continue
        result.push({ key: used.key, required: used.required, effectiveFrom: day(row.effectiveFrom), verified: row.verified === true, current: row.id === current?.id })
      }
    }
    return result
  }

  private blockersOf(calculator: StatutoryCalculator, rows: Awaited<ReturnType<StatutoryCalculatorsService['rowsOf']>>): string[] {
    const blockers: string[] = []
    if (calculator.keys.some((used) => used.required && !rows.some((row) => row.key === used.key && row.current))) blockers.push(CALCULATOR_NO_ROWS)
    if (rows.some((row) => !row.verified)) blockers.push(CALCULATOR_UNVERIFIED)
    return blockers
  }

  async list(user: JwtPayload) {
    const em = this.ds.manager
    const values = new Map((await em.getRepository(RequestsConfig).find({ where: { key: In([...STATUTORY_CALCULATOR_CONFIG_KEYS]) } })).map((row) => [row.key, row.value]))
    const calculators = []
    const branches = await em.getRepository(Branch).find({ select: { id: true, name: true, country: true }, order: { id: 'ASC' } })
    for (const calculator of STATUTORY_CALCULATORS) {
      const rows = await this.rowsOf(em, calculator, false)
      const options = calculator.branchesKey ? branches.filter((branch) => branchCountryOf(branch.country) === calculator.country).map((branch) => ({ id: branch.id, name: branch.name })) : []
      calculators.push({ code: calculator.code, label: calculator.label, note: calculator.note, enabled: values.get(calculator.enabledKey) === 'true',
        needsStartPeriod: !!calculator.startPeriodKey, startPeriod: calculator.startPeriodKey ? values.get(calculator.startPeriodKey) ?? null : null,
        needsBranches: !!calculator.branchesKey, branchOptions: options,
        // المختار من الفروع اللي لسه دولتها دولة الحساب
        branchIds: calculator.branchesKey ? parseStatutoryBranchIds(values.get(calculator.branchesKey)).filter((id) => options.some((option) => option.id === id)) : [],
        rows: rows.map(({ key, effectiveFrom, verified, current }) => ({ key, effectiveFrom, verified, current })), blockers: this.blockersOf(calculator, rows) })
    }
    return { canEdit: user.role === 'super_admin', calculators }
  }

  /** تفعيل أو قفل حساب (وفترة بدايته) — لمدير النظام، والحكم على صفوف الحزمة تحت قفلها */
  async update(user: JwtPayload, code: string, input: CalculatorInput) {
    if (user.role !== 'super_admin') throw new ForbiddenException(CALCULATOR_ADMIN_ONLY)
    const calculator = STATUTORY_CALCULATORS.find((entry) => entry.code === code)
    if (!calculator) throw new NotFoundException(CALCULATOR_UNKNOWN)
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new BadRequestException(CALCULATOR_ENABLED_VALUE)
    if (input.startPeriod !== undefined && (!calculator.startPeriodKey || typeof input.startPeriod !== 'string' || !PERIOD.test(input.startPeriod))) throw new BadRequestException(CALCULATOR_START_PERIOD)
    if (input.branchIds !== undefined && (!calculator.branchesKey || !Array.isArray(input.branchIds) || input.branchIds.some((id) => !Number.isSafeInteger(id) || (id as number) < 1))) {
      throw new BadRequestException(CALCULATOR_BRANCHES)
    }
    await this.ds.transaction(async (em) => {
      // صفوف الحزمة الأول (نفس ترتيب اللي بيعدّل صف: الصف ثم الإعداد)، وبعدها الحكم
      const rows = await this.rowsOf(em, calculator, true)
      const keys = [calculator.enabledKey, ...(calculator.startPeriodKey ? [calculator.startPeriodKey] : []), ...(calculator.branchesKey ? [calculator.branchesKey] : [])]
      const stored = new Map((await em.getRepository(RequestsConfig).find({ where: { key: In(keys) } })).map((row) => [row.key, row.value]))
      const before = { enabled: stored.get(calculator.enabledKey) === 'true', startPeriod: calculator.startPeriodKey ? stored.get(calculator.startPeriodKey) ?? null : null }
      const after = { enabled: input.enabled === undefined ? before.enabled : input.enabled, startPeriod: input.startPeriod === undefined ? before.startPeriod : input.startPeriod as string }
      // الفروع: المبعوت لازم كله فروع موجودة ودولتها دولة الحساب دلوقتي
      const storedBranches = calculator.branchesKey ? parseStatutoryBranchIds(stored.get(calculator.branchesKey)) : []
      let branchIds = storedBranches
      if (calculator.branchesKey && input.branchIds !== undefined) {
        branchIds = [...new Set(input.branchIds as number[])].sort((a, b) => a - b)
        const found = branchIds.length ? await em.getRepository(Branch).find({ where: { id: In(branchIds) }, select: { id: true, country: true } }) : []
        if (found.length !== branchIds.length || found.some((branch) => branchCountryOf(branch.country) !== calculator.country)) throw new BadRequestException(CALCULATOR_BRANCHES)
      }
      const branchesChanged = JSON.stringify(branchIds) !== JSON.stringify(storedBranches)
      if (after.enabled === before.enabled && after.startPeriod === before.startPeriod && !branchesChanged) throw new BadRequestException(CALCULATOR_NOTHING)
      if (after.enabled) {
        const blockers = this.blockersOf(calculator, rows)
        if (blockers.length) throw new BadRequestException(blockers[0])
        if (calculator.startPeriodKey && !(after.startPeriod && PERIOD.test(after.startPeriod))) throw new BadRequestException(CALCULATOR_START_PERIOD)
        if (calculator.branchesKey && !branchIds.length) throw new BadRequestException(CALCULATOR_BRANCHES)
      }
      const write = async (key: string, value: string) => {
        const updated = await em.getRepository(RequestsConfig).update({ key }, { value })
        if (!updated.affected) await em.getRepository(RequestsConfig).insert({ key, value })
      }
      if (after.enabled !== before.enabled) await write(calculator.enabledKey, after.enabled ? 'true' : 'false')
      if (calculator.startPeriodKey && after.startPeriod !== before.startPeriod && after.startPeriod) await write(calculator.startPeriodKey, after.startPeriod)
      if (calculator.branchesKey && branchesChanged) await write(calculator.branchesKey, JSON.stringify(branchIds))
      await recordAudit(em, { category: 'SETTINGS', action: 'STATUTORY_CALCULATOR_CHANGED', entityType: 'statutory_calculator', entityId: calculator.code, actorUserId: user.sub,
        summary: `حزمة الدولة: ${after.enabled ? (before.enabled ? 'تعديل' : 'تفعيل') : 'قفل'} «${calculator.label}»${after.enabled && after.startPeriod ? ` من فترة ${after.startPeriod}` : ''}`, before: { ...before, ...(calculator.branchesKey ? { branchIds: storedBranches } : {}) }, after: { ...after, ...(calculator.branchesKey ? { branchIds } : {}) } })
    })
    return this.list(user)
  }
}
