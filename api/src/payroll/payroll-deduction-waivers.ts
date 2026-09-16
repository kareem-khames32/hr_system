import type { EntityManager } from 'typeorm'

// «شيل خصم»: مطابقة قاعدة الشيل على الموظف (بمكانه في آخر يوم من فترة المسير) وتطبيقها على مبالغ الحساب.
// الترتيب الموحد: الشركة ← فرع ← أقسام الفرع ← فرق الفرع ← موظفين.

export const DEDUCTION_WAIVER_KINDS = ['LATENESS', 'EARLY_LEAVE', 'SHORTFALL', 'ABSENCE', 'UNPAID_LEAVE', 'SUSPENSION', 'SICK_LEAVE',
  'LOAN', 'TYPED_DEDUCTION', 'SOCIAL_INSURANCE', 'OTHER'] as const
export type DeductionWaiverKind = typeof DEDUCTION_WAIVER_KINDS[number]

export const DEDUCTION_WAIVER_KIND_LABELS: Record<DeductionWaiverKind, string> = {
  LATENESS: 'التأخير',
  EARLY_LEAVE: 'الخروج المبكر',
  SHORTFALL: 'نقص الساعات',
  ABSENCE: 'الغياب',
  UNPAID_LEAVE: 'إجازة بدون راتب',
  SUSPENSION: 'أيام الإيقاف',
  SICK_LEAVE: 'خصم الإجازة المرضية',
  LOAN: 'أقساط السلف',
  TYPED_DEDUCTION: 'الخصومات المسجلة',
  SOCIAL_INSURANCE: 'التأمينات (حصة الموظف)',
  OTHER: 'خصومات أخرى',
}

export const DEDUCTION_WAIVER_LEVELS = ['company', 'branch', 'departments', 'teams', 'employees'] as const
export type DeductionWaiverLevel = typeof DEDUCTION_WAIVER_LEVELS[number]

export interface DeductionWaiverRule {
  id?: number
  kind: string
  targetLevel: string
  branchId: number | null
  targetIds: number[]
}

export interface DeductionWaiverEmployeeOrg {
  employeeId: number
  branchId: number | null
  departmentId: number | null
  teamId: number | null
}

export const isDeductionWaiverKind = (value: unknown): value is DeductionWaiverKind =>
  typeof value === 'string' && (DEDUCTION_WAIVER_KINDS as readonly string[]).includes(value)

export function parseWaiverTargetIds(raw: string | null | undefined): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter(id => Number.isSafeInteger(id) && id > 0) : []
  } catch {
    return []
  }
}

// القاعدة تنطبق على الموظف؟ الأقسام والفرق جوه فرع القاعدة بس، والموظفين بالاسم مهما اتنقلوا.
export function deductionWaiverMatches(rule: DeductionWaiverRule, org: DeductionWaiverEmployeeOrg): boolean {
  if (rule.targetLevel === 'company') return true
  if (rule.targetLevel === 'employees') return rule.targetIds.includes(org.employeeId)
  if (rule.branchId == null || org.branchId !== rule.branchId) return false
  if (rule.targetLevel === 'branch') return true
  if (rule.targetLevel === 'departments') return org.departmentId != null && rule.targetIds.includes(org.departmentId)
  if (rule.targetLevel === 'teams') return org.teamId != null && rule.targetIds.includes(org.teamId)
  return false
}

export function waivedDeductionKinds(rules: readonly DeductionWaiverRule[], org: DeductionWaiverEmployeeOrg): Set<DeductionWaiverKind> {
  const kinds = new Set<DeductionWaiverKind>()
  for (const rule of rules) if (isDeductionWaiverKind(rule.kind) && deductionWaiverMatches(rule, org)) kinds.add(rule.kind)
  return kinds
}

// يوم الحضور: التأخير (ومعاه دقائق الإذن بخصم)، والنقص على الوردية الثابتة = خروج مبكر، وعلى المرنة = نقص ساعات.
export function waiveAttendanceDeductionDay<T extends { latenessAmount: number; permissionAmount: number; shortfallAmount: number; totalAmount: number }>(
  day: T, waived: ReadonlySet<DeductionWaiverKind>, fixedShift: boolean,
): T {
  if (!waived.size) return day
  const lateness = waived.has('LATENESS')
  const shortfall = waived.has(fixedShift ? 'EARLY_LEAVE' : 'SHORTFALL')
  if (!lateness && !shortfall) return day
  const next = { ...day }
  if (lateness) { next.latenessAmount = 0; next.permissionAmount = 0 }
  if (shortfall) next.shortfallAmount = 0
  next.totalAmount = Math.round((next.latenessAmount + next.shortfallAmount + next.permissionAmount) * 100) / 100
  return next
}

// نوع قيد الخصم في دفتر المديونيات (التأمينات عمود مستقل في البند مش قيد)
export function obligationWaiverKind(row: { type: string; deductionRequestId?: number | null }): DeductionWaiverKind | null {
  if (row.type !== 'DEBIT') return null
  return row.deductionRequestId ? 'TYPED_DEDUCTION' : 'OTHER'
}

export function withoutWaivedObligations<T extends { type: string; deductionRequestId?: number | null }>(
  rows: T[], waived: ReadonlySet<DeductionWaiverKind>,
): T[] {
  if (!waived.size) return rows
  return rows.filter(row => {
    const kind = obligationWaiverKind(row)
    return kind === null || !waived.has(kind)
  })
}

// مجاميع ظل الحضور (نصوص عشرية) بنفس القرار، عشان التكافؤ يقيس الحساب مش الشيل
export function waivePolicyShadowTotals<T extends { lateness: string; shortfall: string; absence: string }>(totals: T, waived: ReadonlySet<DeductionWaiverKind>): T {
  if (!waived.size) return totals
  const next = { ...totals }
  if (waived.has('LATENESS')) next.lateness = '0.00'
  if (waived.has('EARLY_LEAVE') && waived.has('SHORTFALL')) next.shortfall = '0.00'
  if (waived.has('ABSENCE')) next.absence = '0.00'
  return next
}

// القواعد السارية لشهر (الجدول ممكن يكون لسه مش متطبق: بلا قواعد)
export async function readActiveDeductionWaivers(em: EntityManager, period: string): Promise<DeductionWaiverRule[]> {
  let rows: Array<{ id: number; kind: string; targetLevel: string; branchId: number | null; targetIds: string | null }>
  try {
    rows = await em.query(`IF OBJECT_ID(N'dbo.payroll_deduction_waivers', N'U') IS NOT NULL
      SELECT [id], [kind], [targetLevel], [branchId], [targetIds] FROM [payroll_deduction_waivers] WHERE [period] = @0 AND [status] = 'ACTIVE'`, [period])
  } catch {
    return []
  }
  return (rows ?? []).map(row => ({ id: Number(row.id), kind: row.kind, targetLevel: row.targetLevel,
    branchId: row.branchId == null ? null : Number(row.branchId), targetIds: parseWaiverTargetIds(row.targetIds) }))
}
