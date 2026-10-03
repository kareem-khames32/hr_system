import { ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'
import type { PayrollSettlementSalary } from '../payroll/payroll-settlement-salary'

// B1.8b: التصفية بتلم قيود الدفتر المعلّقة اللي المسير مش هياخدها (قسط خصم مصنف لشهر جاي، باقي مترحّل، مكافأة لشهر لاحق،
// أو قيد شهره جه بعد ما مسير آخر شهر اتعمد). ورا إعداد مقفول: مقفول = التصفية زي ما كانت بالحرف.
export const SETTLEMENT_COLLECT_OBLIGATIONS_KEY = 'settlement.collect_pending_obligations'
export const SETTLEMENT_OBLIGATION_DEBIT_PREFIX = 'قيود دفتر معلّقة — خصومات'
export const SETTLEMENT_OBLIGATION_CREDIT_PREFIX = 'قيود دفتر معلّقة — إضافات'

export interface SettlementObligation { id: number; type: 'DEBIT' | 'CREDIT'; amount: number }

const cents = (value: unknown) => Math.round(Number(value) * 100)

/**
 * القيود اللي التصفية بتلمها: `PENDING` ومش محجوزة لمسير، وشهرها بعد شهر آخر يوم عمل (أو مسير آخر شهر اتعمد أو اتصرف أصلًا،
 * فمفيش مسير هياخدها). شهر آخر يوم عمل ونهايته من مسير آخر شهر لو موجود، وإلا من يوم بداية الدورة.
 * المحجوز لمسير معتمد بيتخصم في المسير ده (وده جوه «راتب آخر شهر»)، والمعلّق لقرار (`SUSPENDED`) مستني الموارد البشرية.
 */
export async function readSettlementPendingObligations(em: EntityManager, employeeId: number, lastWorkingDay: string,
  lastRun: Pick<PayrollSettlementSalary, 'found' | 'runId' | 'runStatus'>): Promise<SettlementObligation[]> {
  let period: string, endDate: string
  const run = lastRun.found && lastRun.runId ? (await em.query(
    'SELECT [period], CONVERT(nvarchar(10), [endDate], 23) AS [endDate] FROM [payroll_runs] WHERE [id] = @0', [lastRun.runId]))[0] : null
  if (run) {
    period = String(run.period); endDate = String(run.endDate)
  } else {
    const config = await em.getRepository(RequestsConfig).findOne({ where: { key: 'payroll.cycle_start_day' } })
    const cycleStartDay = Number(config?.value ?? '23')
    const day = Number.isInteger(cycleStartDay) && cycleStartDay >= 1 && cycleStartDay <= 31 ? cycleStartDay : 23
    period = payrollPeriodOfDate(String(lastWorkingDay).slice(0, 10), day)
    endDate = payrollPeriodBounds(period, day).endDate
  }
  const lastClosed = !!run && ['APPROVED', 'PAID'].includes(String(lastRun.runStatus))
  const rows = await em.getRepository(EmployeeObligation).find({ where: { employeeId, status: 'PENDING' }, order: { id: 'ASC' } })
  return rows
    .filter(row => row.reservedPayrollRunId == null)
    .filter(row => lastClosed || (!!row.targetPeriod && row.targetPeriod > period) || (!!row.effectiveDate && String(row.effectiveDate).slice(0, 10) > endDate))
    .filter(row => row.type === 'DEBIT' || row.type === 'CREDIT')
    .map(row => ({ id: row.id, type: row.type, amount: cents(row.amount) / 100 }))
    .filter(row => row.amount > 0)
}

/** مجموع كل نوع بالقروش (من غير كسور عائمة) */
export function settlementObligationTotals(obligations: SettlementObligation[]) {
  const total = (type: SettlementObligation['type']) => obligations.filter(row => row.type === type).reduce((sum, row) => sum + cents(row.amount), 0) / 100
  return { debit: total('DEBIT'), credit: total('CREDIT'),
    debitCount: obligations.filter(row => row.type === 'DEBIT').length, creditCount: obligations.filter(row => row.type === 'CREDIT').length }
}

/**
 * الاعتماد: القيود اللي التصفية لمّتها بتتعلّم مستهلكة (`APPLIED` من غير مسير) جوه معاملة الاعتماد، فالمسير مابياخدهاش تاني أبدًا.
 * لو قيد اتحجز لمسير أو اتلغى أو اتغيّر مبلغه بعد التوليد: 409 والمعاملة كلها بترجع.
 */
export async function applySettlementObligations(em: EntityManager, employeeId: number, obligations: SettlementObligation[]) {
  if (!obligations.length) return
  if (!em.queryRunner?.isTransactionActive) throw new Error('Settlement obligations require a transaction')
  const changed = () => new ConflictException('قيود الدفتر اللي في التصفية اتغيرت بعد توليد البنود؛ أعد توليد البنود وراجعها قبل الاعتماد')
  const ids = obligations.map(row => row.id)
  const current = await em.getRepository(EmployeeObligation).find({ where: { id: In(ids), employeeId } })
  for (const row of obligations) {
    const found = current.find(item => item.id === row.id)
    if (!found || found.status !== 'PENDING' || found.reservedPayrollRunId != null || found.type !== row.type || cents(found.amount) !== cents(row.amount)) throw changed()
  }
  const done = await em.query(`UPDATE [employee_obligations] SET [status]='APPLIED',[appliedAt]=GETDATE(),[appliedAmount]=[amount]
    OUTPUT INSERTED.[id] WHERE [employeeId]=@0 AND [status]='PENDING' AND [reservedPayrollRunId] IS NULL AND [id] IN (${ids.map((_, index) => `@${index + 1}`).join(', ')})`,
  [employeeId, ...ids])
  if (done.length !== ids.length) throw changed()
}
