// تقرير مراكز التكلفة لشهر رواتب: تجميع بنود المسيرات لكل مركز تكلفة (عدد، إجمالي، خصومات، صافي، حصة صاحب العمل في التأمينات لو متاحة).
// الفلوس بقروش صحيحة BigInt — القيم المخزنة بمنزلتين، وأي منزلة زيادة تُقص (بلا تقريب).

export function costCenterCents(value: unknown): bigint {
  if (value === null || value === undefined || value === '') return 0n
  const text = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(6) : 'x') : String(value).trim()
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text)
  if (!match) return 0n
  const [, sign, whole, fraction = ''] = match
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  return sign ? -cents : cents
}

export function costCenterMoney(cents: bigint): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  return `${negative ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}

export const COST_CENTER_EARNING_FIELDS = ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions'] as const
export const COST_CENTER_DEDUCTION_FIELDS = ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction'] as const
type MoneyField = typeof COST_CENTER_EARNING_FIELDS[number] | typeof COST_CENTER_DEDUCTION_FIELDS[number] | 'netPay'

export type CostCenterReportRow = {
  runId: number; runName: string | null; runStatus: string
  employeeId: number; employeeCode: string | null; fullName: string | null
  branchId: number | null; branchName: string | null
  costCenterId: number | null; costCenterCode: string | null; costCenterName: string | null
  /** حصة صاحب العمل في التأمينات لو مصدرها متاح؛ null = غير متاح */
  employerInsurance?: string | null
} & Partial<Record<MoneyField, string | number | null>>

export interface CostCenterReportEmployee {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null
  runId: number; runName: string | null; runStatus: string
  gross: string; deductions: string; net: string; employerInsurance: string | null
}

export interface CostCenterReportGroup {
  costCenterId: number | null; code: string | null; name: string
  headcount: number; gross: string; deductions: string; net: string; employerInsurance: string | null
  employees: CostCenterReportEmployee[]
}

export const NO_COST_CENTER_NAME = 'بدون مركز تكلفة'

const sumFields = (row: CostCenterReportRow, fields: readonly MoneyField[]) =>
  fields.reduce<bigint>((sum, field) => sum + costCenterCents(row[field]), 0n)

export function aggregateCostCenterReport(rows: readonly CostCenterReportRow[], insuranceAvailable: boolean) {
  type Acc = { group: Omit<CostCenterReportGroup, 'gross' | 'deductions' | 'net' | 'employerInsurance' | 'headcount'>; ids: Set<number>
    gross: bigint; deductions: bigint; net: bigint; insurance: bigint }
  const groups = new Map<string, Acc>()
  const totals = { ids: new Set<number>(), gross: 0n, deductions: 0n, net: 0n, insurance: 0n }
  for (const row of rows) {
    const centerId = row.costCenterId === null || row.costCenterId === undefined ? null : Number(row.costCenterId)
    const key = centerId === null ? 'none' : String(centerId)
    let acc = groups.get(key)
    if (!acc) {
      acc = { group: { costCenterId: centerId, code: centerId === null ? null : row.costCenterCode ?? null,
        name: centerId === null ? NO_COST_CENTER_NAME : row.costCenterName || `#${centerId}`, employees: [] },
      ids: new Set(), gross: 0n, deductions: 0n, net: 0n, insurance: 0n }
      groups.set(key, acc)
    }
    const gross = sumFields(row, COST_CENTER_EARNING_FIELDS)
    const deductions = sumFields(row, COST_CENTER_DEDUCTION_FIELDS)
    const net = costCenterCents(row.netPay)
    const insurance = insuranceAvailable ? costCenterCents(row.employerInsurance) : 0n
    const employeeId = Number(row.employeeId)
    acc.ids.add(employeeId); totals.ids.add(employeeId)
    acc.gross += gross; acc.deductions += deductions; acc.net += net; acc.insurance += insurance
    totals.gross += gross; totals.deductions += deductions; totals.net += net; totals.insurance += insurance
    acc.group.employees.push({ employeeId, employeeCode: row.employeeCode ?? null, fullName: row.fullName ?? null, branchName: row.branchName ?? null,
      runId: Number(row.runId), runName: row.runName ?? null, runStatus: row.runStatus,
      gross: costCenterMoney(gross), deductions: costCenterMoney(deductions), net: costCenterMoney(net),
      employerInsurance: insuranceAvailable ? costCenterMoney(insurance) : null })
  }
  const centers: CostCenterReportGroup[] = [...groups.values()].map(acc => ({
    ...acc.group, headcount: acc.ids.size, gross: costCenterMoney(acc.gross), deductions: costCenterMoney(acc.deductions), net: costCenterMoney(acc.net),
    employerInsurance: insuranceAvailable ? costCenterMoney(acc.insurance) : null,
    employees: acc.group.employees.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '', 'ar') || a.runId - b.runId),
  }))
  // المراكز بالاسم، و«بدون مركز تكلفة» في الآخر
  centers.sort((a, b) => (a.costCenterId === null ? 1 : 0) - (b.costCenterId === null ? 1 : 0) || a.name.localeCompare(b.name, 'ar'))
  return {
    centers,
    totals: { headcount: totals.ids.size, gross: costCenterMoney(totals.gross), deductions: costCenterMoney(totals.deductions), net: costCenterMoney(totals.net),
      employerInsurance: insuranceAvailable ? costCenterMoney(totals.insurance) : null },
  }
}
