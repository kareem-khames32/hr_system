import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager, In, Not } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun } from './payroll.entities'
import {
  computeSocialInsurance, INSURANCE_SYSTEM_LABELS, InsuranceSystem, normalizeInsuranceSystem, parseSocialInsuranceSettings, SOCIAL_INSURANCE_CONFIG_KEYS,
  SOCIAL_INSURANCE_DEFAULTS, SOCIAL_INSURANCE_REVIEWED_KEY, SocialInsuranceResult, SocialInsuranceSettingField, SocialInsuranceSettings, socialInsuranceSettingsIssue,
} from './social-insurance'

const SETTING_KEYS = Object.values(SOCIAL_INSURANCE_CONFIG_KEYS)

/** إعدادات التأمينات ونظام كل فرع — يُقرأ مرة لكل حساب مسير. */
export async function readSocialInsuranceContext(em: EntityManager) {
  const rows = await em.getRepository(RequestsConfig).find({ where: { key: In([...SETTING_KEYS, SOCIAL_INSURANCE_REVIEWED_KEY]) } })
  const values = new Map(rows.map(row => [row.key, row.value]))
  const branches = await em.getRepository(Branch).find({ select: { id: true, name: true, insuranceSystem: true } })
  const systems = new Map(branches.map(branch => [branch.id, normalizeInsuranceSystem(branch.insuranceSystem)]))
  return {
    settings: parseSocialInsuranceSettings(values),
    reviewedAt: values.get(SOCIAL_INSURANCE_REVIEWED_KEY) || null,
    branches,
    systemOf: (branchId: number | null | undefined): InsuranceSystem => branchId == null ? 'NONE' : systems.get(Number(branchId)) ?? 'NONE',
  }
}

const cutReportMoney = (cents: number) => (cents / 100).toFixed(2)

@Injectable()
export class SocialInsuranceService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async settings(user: JwtPayload) {
    const context = await readSocialInsuranceContext(this.ds.manager)
    const scope = branchScopeOf(user)
    return {
      settings: context.settings,
      defaults: SOCIAL_INSURANCE_DEFAULTS,
      reviewedAt: context.reviewedAt,
      canEdit: scope === null,
      branches: context.branches.filter(branch => scope === null || branch.id === scope)
        .map(branch => ({ id: branch.id, name: branch.name, insuranceSystem: normalizeInsuranceSystem(branch.insuranceSystem) })),
      systems: INSURANCE_SYSTEM_LABELS,
    }
  }

  async updateSettings(user: JwtPayload, body: Partial<Record<SocialInsuranceSettingField, unknown>>) {
    assertCompanyWideWrite(user)
    const current = (await readSocialInsuranceContext(this.ds.manager)).settings
    const next = { ...current } as SocialInsuranceSettings
    for (const field of Object.keys(SOCIAL_INSURANCE_DEFAULTS) as SocialInsuranceSettingField[]) {
      if (body?.[field] === undefined) continue
      const value = typeof body[field] === 'string' && String(body[field]).trim() !== '' ? Number(body[field]) : body[field]
      if (typeof value !== 'number') throw new BadRequestException('كل النسب والحدود لازم تكون أرقام')
      next[field] = value
    }
    const issue = socialInsuranceSettingsIssue(next)
    if (issue) throw new BadRequestException(issue)
    await this.ds.transaction(async em => {
      const repo = em.getRepository(RequestsConfig)
      for (const field of Object.keys(next) as SocialInsuranceSettingField[]) {
        await repo.save({ key: SOCIAL_INSURANCE_CONFIG_KEYS[field], value: String(next[field]) })
      }
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
    if (scope !== null && requested !== null && requested !== scope) throw new ForbiddenException('مش مسموح تشوف فرع غير فرعك')
    const branchId = scope ?? requested
    const em = this.ds.manager
    const context = await readSocialInsuranceContext(em)
    const insuredBranches = context.branches.filter(branch => (branchId === null || branch.id === branchId) && context.systemOf(branch.id) !== 'NONE')
    const branchNames = new Map(context.branches.map(branch => [branch.id, branch.name]))
    const employees = insuredBranches.length && (scope === null || scope > 0) ? await em.getRepository(Employee).find({
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
    const rows = employees.map(employee => {
      const fromPayroll = saved.get(employee.id)
      const result = fromPayroll ?? computeSocialInsurance({ system: context.systemOf(employee.branchId), registered: employee.isGosiRegistered,
        declaredSalary: employee.gosiBaseSalary, fallbackSalary: employee.basicSalary, nationality: employee.nationality }, context.settings)
      return { employeeId: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId,
        branchName: branchNames.get(employee.branchId) ?? null, nationality: employee.nationality ?? null, gosiNumber: employee.gosiNumber ?? null,
        system: result.system, category: result.category, salarySource: result.salarySource, insuredSalary: Number(result.insuredSalary),
        employeePct: Number(result.employeePct), employerPct: Number(result.employerPct), employeeShare: Number(result.employeeShare), employerShare: Number(result.employerShare),
        source: fromPayroll ? 'PAYROLL' : 'ESTIMATE' }
    }).filter(row => row.insuredSalary > 0)
    const cents = (pick: (row: typeof rows[number]) => number) => rows.reduce((sum, row) => sum + Math.round(pick(row) * 100), 0)
    const employeeCents = cents(row => row.employeeShare), employerCents = cents(row => row.employerShare)
    return {
      period, branchId, rows,
      totals: { employees: rows.length, insuredSalary: cutReportMoney(cents(row => row.insuredSalary)), employeeShare: cutReportMoney(employeeCents),
        employerShare: cutReportMoney(employerCents), total: cutReportMoney(employeeCents + employerCents) },
      settings: context.settings, reviewedAt: context.reviewedAt,
    }
  }
}
