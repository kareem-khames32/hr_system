import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager, In, Not } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, isEmptyBranchScope } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { totalsByCurrency } from '../org/currency-totals'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { localDateOf } from '../attendance/attendance.service'
import { readGosiFirstRegistered } from '../employees/employee-gosi-registration'
import { readStatutoryEntries } from '../statutory/statutory.service'
import { SA_GOSI_NEW_TRACK_FROM } from '../statutory/statutory-data'
import { PayrollItem, PayrollRun } from './payroll.entities'
import {
  computeSocialInsurance, INSURANCE_SYSTEM_LABELS, InsuranceSystem, normalizeInsuranceSystem, parseSocialInsuranceSettings, SAUDI_BASE_INCLUDES_HOUSING_KEY,
  SOCIAL_INSURANCE_CONFIG_KEYS, SOCIAL_INSURANCE_DEFAULTS, SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY, SOCIAL_INSURANCE_REVIEWED_KEY, SocialInsuranceResult,
  SocialInsuranceSettingField, SocialInsuranceSettings, socialInsuranceRatesAt, socialInsuranceSettingsIssue, socialInsuranceSettingsShown,
} from './social-insurance'

const SETTING_KEYS = Object.values(SOCIAL_INSURANCE_CONFIG_KEYS)
const CONTEXT_KEYS = [...SETTING_KEYS, SOCIAL_INSURANCE_REVIEWED_KEY, SAUDI_BASE_INCLUDES_HOUSING_KEY, SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY]
const EG_LIMIT_FIELDS: SocialInsuranceSettingField[] = ['egyptianMinSalary', 'egyptianMaxSalary']
/** آخر يوم في شهر YYYY-MM */
const monthEnd = (period: string) => new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10)

/** إعدادات التأمينات ونظام كل فرع — يُقرأ مرة لكل حساب مسير. */
export async function readSocialInsuranceContext(em: EntityManager) {
  const rows = await em.getRepository(RequestsConfig).find({ where: { key: In(CONTEXT_KEYS) } })
  const values = new Map(rows.map(row => [row.key, row.value]))
  const branches = await em.getRepository(Branch).find({ select: { id: true, name: true, insuranceSystem: true } })
  const systems = new Map(branches.map(branch => [branch.id, normalizeInsuranceSystem(branch.insuranceSystem)]))
  // B1.5: القيم القانونية المؤرخة (قبل ترحيل 080 = فاضية = نفس حساب النهارده)
  const statutory = await readStatutoryEntries(em)
  const reviewedAt = values.get(SOCIAL_INSURANCE_REVIEWED_KEY) || null
  // قبل B1.5 كل حفظ للشاشة كان بيكتب حدود الأجر المصري، فلو مفتاحها لسه ماتكتبش = آخر حفظ للشاشة
  const egyptianLimitsSince = values.has(SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY) ? values.get(SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY) || null : reviewedAt
  const baseIncludesHousing = values.get(SAUDI_BASE_INCLUDES_HOUSING_KEY) === 'true'
  return {
    settings: parseSocialInsuranceSettings(values),
    reviewedAt,
    branches,
    systemOf: (branchId: number | null | undefined): InsuranceSystem => branchId == null ? 'NONE' : systems.get(Number(branchId)) ?? 'NONE',
    statutory, egyptianLimitsSince, baseIncludesHousing,
    /** القيم المؤرخة السارية يوم date — المسير بيبعت آخر يوم في فترته (قاعدة التاريخ الفعّال) */
    ratesAt: (date: string) => socialInsuranceRatesAt(statutory, date, egyptianLimitsSince, baseIncludesHousing),
  }
}

const cutReportMoney = (cents: number) => (cents / 100).toFixed(2)

@Injectable()
export class SocialInsuranceService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async settings(user: JwtPayload) {
    const context = await readSocialInsuranceContext(this.ds.manager)
    const scope = branchScopeOf(user)
    const today = context.ratesAt(localDateOf(new Date()))
    return {
      settings: socialInsuranceSettingsShown(context.settings, today),
      defaults: SOCIAL_INSURANCE_DEFAULTS,
      reviewedAt: context.reviewedAt,
      canEdit: scope === null,
      branches: context.branches.filter(branch => inBranchScope(scope, branch.id))
        .map(branch => ({ id: branch.id, name: branch.name, insuranceSystem: normalizeInsuranceSystem(branch.insuranceSystem) })),
      systems: INSURANCE_SYSTEM_LABELS,
      // B1.5: أساس السعودي (الأساسي + السكن لما أجر التأمين فاضي)، ومصدر حدود الأجر المصري النهارده، والقيم المؤرخة
      baseIncludesHousing: context.baseIncludesHousing,
      egyptianLimitsFrom: today.egyptianLimits ? { effectiveFrom: today.egyptianLimits.effectiveFrom, verified: today.egyptianLimits.verified } : null,
      saudiNewTrackFrom: SA_GOSI_NEW_TRACK_FROM,
      saudiNewTrackToday: today.saudiNewTrack,
      statutory: context.statutory,
    }
  }

  async updateSettings(user: JwtPayload, body: Partial<Record<SocialInsuranceSettingField | 'baseIncludesHousing', unknown>>) {
    assertCompanyWideWrite(user)
    const context = await readSocialInsuranceContext(this.ds.manager)
    const today = localDateOf(new Date())
    // المقارنة باللي ظاهر في الشاشة (حدود مصر السارية النهارده) — حفظ من غير تغيير الحدود مابيكتبهاش ولا بيغيّر تاريخها
    const current = socialInsuranceSettingsShown(context.settings, context.ratesAt(today))
    const next = { ...current } as SocialInsuranceSettings
    for (const field of Object.keys(SOCIAL_INSURANCE_DEFAULTS) as SocialInsuranceSettingField[]) {
      if (body?.[field] === undefined) continue
      const value = typeof body[field] === 'string' && String(body[field]).trim() !== '' ? Number(body[field]) : body[field]
      if (typeof value !== 'number') throw new BadRequestException('كل النسب والحدود لازم تكون أرقام')
      next[field] = value
    }
    const issue = socialInsuranceSettingsIssue(next)
    if (issue) throw new BadRequestException(issue)
    const housing = body?.baseIncludesHousing
    if (housing !== undefined && typeof housing !== 'boolean') throw new BadRequestException('«الأساسي + السكن» لازم يكون نعم أو لا')
    const egyptianChanged = EG_LIMIT_FIELDS.some(field => next[field] !== current[field])
    await this.ds.transaction(async em => {
      const repo = em.getRepository(RequestsConfig)
      for (const field of Object.keys(next) as SocialInsuranceSettingField[]) {
        if (EG_LIMIT_FIELDS.includes(field) && !egyptianChanged) continue
        await repo.save({ key: SOCIAL_INSURANCE_CONFIG_KEYS[field], value: String(next[field]) })
      }
      // تاريخ قرار حدود مصر: النهارده لو اتغيرت، وإلا بيفضل زي ما هو (أول مرة = آخر حفظ قبل كده)
      if (egyptianChanged || !(await repo.findOne({ where: { key: SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY } }))) {
        await repo.save({ key: SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY, value: egyptianChanged ? today : context.reviewedAt ?? '' })
      }
      if (housing !== undefined) await repo.save({ key: SAUDI_BASE_INCLUDES_HOUSING_KEY, value: housing ? 'true' : 'false' })
      await repo.save({ key: SOCIAL_INSURANCE_REVIEWED_KEY, value: new Date().toISOString().slice(0, 10) })
    })
    return this.settings(user)
  }

  /** تقرير الشهر: كل موظف نشط مسجل في فرع له نظام — من المسير لو اتحسب للشهر، وإلا تقديري من ملفه الحالي. */
  async report(user: JwtPayload, period: string | undefined, branchIdText: string | undefined) {
    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new BadRequestException('اختار الشهر (YYYY-MM)')
    if (branchIdText !== undefined && branchIdText !== '' && !/^[1-9]\d{0,9}$/.test(branchIdText)) throw new BadRequestException('الفرع غير صالح')
    const requested = branchIdText ? Number(branchIdText) : null
    const scope = branchScopeOf(user)
    if (requested !== null && !inBranchScope(scope, requested)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'مش مسموح تشوف فرع برّه فروعك' : 'مش مسموح تشوف فرع غير فرعك')
    }
    // الفروع المعروضة: الفرع المطلوب بعينه، وإلا فروع النطاق كلها (null = كل الفروع)
    const shown: BranchScope = requested !== null ? [requested] : scope
    // الفرع في الرد: المطلوب، أو فرع الحساب لو فرع واحد، وإلا null (كل الفروع اللي في النطاق)
    const branchId = requested ?? (scope !== null && scope.length === 1 ? scope[0] : null)
    const em = this.ds.manager
    const context = await readSocialInsuranceContext(em)
    // التقديري بالقيم السارية في آخر يوم في الشهر (نفس قاعدة المسير)
    const rates = context.ratesAt(monthEnd(period))
    const insuredBranches = context.branches.filter(branch => inBranchScope(shown, branch.id) && context.systemOf(branch.id) !== 'NONE')
    const branchNames = new Map(context.branches.map(branch => [branch.id, branch.name]))
    const employees = insuredBranches.length && !isEmptyBranchScope(scope) ? await em.getRepository(Employee).find({
      where: { branchId: In(insuredBranches.map(branch => branch.id)), isActive: true, isGosiRegistered: true },
      order: { employeeCode: 'ASC' },
    }) : []
    // المحسوب في مسيرات الشهر (آخر مسير غير ملغى لكل موظف)
    const saved = new Map<number, SocialInsuranceResult>()
    if (employees.length) {
      const runs = await em.getRepository(PayrollRun).find({ where: { period, status: Not('CANCELLED') }, select: { id: true }, order: { id: 'ASC' } })
      if (runs.length) {
        const ids = employees.map(employee => employee.id)
        for (let index = 0; index < ids.length; index += 1000) {
          const items = await em.getRepository(PayrollItem).find({ where: { runId: In(runs.map(run => run.id)), employeeId: In(ids.slice(index, index + 1000)) },
            select: { id: true, runId: true, employeeId: true, breakdown: true }, order: { runId: 'ASC' } })
          for (const item of items) {
            try {
              const detail = JSON.parse(item.breakdown || '{}').socialInsurance
              if (detail && typeof detail === 'object' && detail.applies) saved.set(item.employeeId, detail)
            } catch { /* تفصيل تالف: يبقى التقديري */ }
          }
        }
      }
    }
    const firstRegistered = await readGosiFirstRegistered(em, employees.map(employee => employee.id))
    const rows = employees.map(employee => {
      const fromPayroll = saved.get(employee.id)
      const result = fromPayroll ?? computeSocialInsurance({ system: context.systemOf(employee.branchId), registered: employee.isGosiRegistered,
        declaredSalary: employee.gosiBaseSalary, fallbackSalary: employee.basicSalary, nationality: employee.nationality,
        firstRegisteredAt: firstRegistered.get(employee.id) ?? null, housingSalary: employee.housingAllowance }, context.settings, rates)
      return { employeeId: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId,
        branchName: branchNames.get(employee.branchId) ?? null, nationality: employee.nationality ?? null, gosiNumber: employee.gosiNumber ?? null,
        system: result.system, category: result.category, salarySource: result.salarySource, insuredSalary: Number(result.insuredSalary),
        // B1.5: المسار (مسيرات قبل B1.5 كلها على القديم) و«ساري من» للقيم المؤرخة اللي اتطبقت
        track: result.track ?? (result.category === 'SAUDI' ? 'OLD' : null), ratesEffectiveFrom: result.ratesEffectiveFrom ?? null, ratesVerified: result.ratesVerified ?? null,
        employeePct: Number(result.employeePct), employerPct: Number(result.employerPct), employeeShare: Number(result.employeeShare), employerShare: Number(result.employerShare),
        source: fromPayroll ? 'PAYROLL' : 'ESTIMATE' }
    }).filter(row => row.insuredSalary > 0)
    const totalsOf = (list: readonly (typeof rows)[number][]) => {
      const cents = (pick: (row: typeof rows[number]) => number) => list.reduce((sum, row) => sum + Math.round(pick(row) * 100), 0)
      const employeeCents = cents(row => row.employeeShare), employerCents = cents(row => row.employerShare)
      return { employees: list.length, insuredSalary: cutReportMoney(cents(row => row.insuredSalary)), employeeShare: cutReportMoney(employeeCents),
        employerShare: cutReportMoney(employerCents), total: cutReportMoney(employeeCents + employerCents) }
    }
    // B1.1: الصف بعملة فرع الموظف (التأمينات السعودية بالريال والمصرية بالجنيه)، والإجمالي لكل عملة لوحده
    const currencyOfBranch = await readBranchCurrencyOf(em)
    const withCurrency = rows.map(row => ({ ...row, currency: currencyOfBranch(row.branchId) }))
    return {
      period, branchId, rows: withCurrency,
      totals: totalsOf(rows),
      byCurrency: totalsByCurrency(withCurrency, row => row.currency, totalsOf),
      settings: context.settings, reviewedAt: context.reviewedAt,
    }
  }
}
