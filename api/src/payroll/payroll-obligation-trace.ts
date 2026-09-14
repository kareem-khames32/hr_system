import { EntityManager, In } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { PayrollDecimal } from './payroll-decimal'
import { DEDUCTION_LABELS, DEDUCTION_REVERSAL_OBLIGATION_CATEGORY } from './typed-deductions'
import { DeductionRequest } from './typed-deductions.entities'
import { BONUS_LABELS, BONUS_REVERSAL_OBLIGATION_CATEGORY } from './bonuses'
import { BonusRequest } from './bonuses.entities'

// تتبع قيود الدفتر في القسيمة والمسير (قرار المالك: الخصم يُتتبع في الطلب والمسير والقسيمة):
// لكل سطر محفوظ في breakdown.obligationLines: القيد ونوعه وتصنيفه، وللخصم المصنف نوعه وسببه ورقم طلبه
// ووحدات القسط وسعر اليوم/الساعة المستخدم. قراءة فقط؛ المبالغ المعروضة هي المحفوظة مع المسير.
export const PAYROLL_OBLIGATION_CATEGORY_LABELS: Record<string, string> = {
  typed_deduction: 'خصم مصنف', deduction_reversal: 'عكس خصم مصنف', custody_shortfall: 'عجز عهدة', fine: 'غرامة', adjustment: 'تسوية',
  expense: 'مصروف مسترد', manual: 'قيد يدوي', bonus: 'مكافأة', allowance: 'بدل', bonus_reversal: 'استرداد مكافأة',
}

export interface PayrollObligationDetail {
  obligationId: number
  type: 'DEBIT' | 'CREDIT' | null
  category: string | null
  categoryLabel: string
  label: string | null
  amount: string | null
  collected: string | null
  carried: string | null
  targetPeriod: string | null
  status: string | null
  carriedFromObligationId: number | null
  deduction: null | {
    requestId: number
    typeCode: string | null
    typeName: string | null
    categoryLabel: string | null
    calcMethodLabel: string
    inputValue: string
    reason: string
    incidentDate: string
    installmentNo: number | null
    installments: number
    units: string | null
    rate: string | null
    formula: string | null
    salarySource: string | null
    reversal: boolean
  }
  // C4 / الخطوة 27: قيد المكافأة (أو استردادها) بنوعها وسببها ورقم طلبها
  bonus: null | {
    requestId: number
    typeName: string | null
    calcMethodLabel: string
    inputValue: string
    reason: string
    formula: string | null
    reversal: boolean
  }
}

const moneyText = (value: unknown) => value === null || value === undefined || value === '' ? null
  : PayrollDecimal.from(typeof value === 'number' ? value.toFixed(4) : String(value)).format(2, 'HALF_UP')
const parse = <T>(text: string | null | undefined, fallback: T): T => { if (!text) return fallback; try { return JSON.parse(text) as T } catch { return fallback } }

export async function describePayrollObligationLines(em: EntityManager, breakdown: unknown): Promise<PayrollObligationDetail[]> {
  const source = breakdown && typeof breakdown === 'object' ? breakdown as Record<string, any> : {}
  // المسيرات الأقدم من حماية الصافي تحفظ المعرفات فقط: المبلغ المحصل = مبلغ القيد
  const lines: Array<{ id: number; type?: string; amount?: number; collected?: number; carried?: number }> = Array.isArray(source.obligationLines)
    ? source.obligationLines : Array.isArray(source.obligationIds) ? source.obligationIds.map((id: number) => ({ id })) : []
  const ids = [...new Set(lines.map(line => Number(line?.id)).filter(id => Number.isSafeInteger(id) && id > 0))]
  if (!ids.length) return []
  const rows = new Map((await em.getRepository(EmployeeObligation).find({ where: { id: In(ids) } })).map(row => [row.id, row]))
  const requestIds = [...new Set([...rows.values()].map(row => row.deductionRequestId).filter((id): id is number => !!id))]
  const requests = requestIds.length ? new Map((await em.getRepository(DeductionRequest).find({ where: { id: In(requestIds) } })).map(row => [row.id, row])) : new Map<number, DeductionRequest>()
  const bonusIds = [...new Set([...rows.values()].map(row => row.bonusRequestId).filter((id): id is number => !!id))]
  const bonuses = bonusIds.length ? new Map((await em.getRepository(BonusRequest).find({ where: { id: In(bonusIds) } })).map(row => [row.id, row])) : new Map<number, BonusRequest>()
  return lines.filter(line => rows.has(Number(line?.id))).map(line => {
    const row = rows.get(Number(line.id))!
    const request = row.deductionRequestId ? requests.get(row.deductionRequestId) ?? null : null
    let deduction: PayrollObligationDetail['deduction'] = null
    if (request) {
      const snapshot = parse<Record<string, any>>(request.typeSnapshot, {})
      const trace = parse<Record<string, any>>(request.amountTrace, {})
      const approvals = Array.isArray(trace.approvals) ? trace.approvals : []
      const parts: Array<Record<string, any>> = Array.isArray(approvals[approvals.length - 1]?.installments) ? approvals[approvals.length - 1].installments
        : Array.isArray(trace.installments) ? trace.installments : []
      const reversal = row.category === DEDUCTION_REVERSAL_OBLIGATION_CATEGORY
      const index = !reversal && row.carriedFromObligationId == null ? parts.findIndex(part => part?.period === row.targetPeriod) : -1
      const part = index >= 0 ? parts[index] : null
      deduction = {
        requestId: request.id, typeCode: snapshot.code ?? null, typeName: snapshot.nameAr ?? null,
        categoryLabel: snapshot.category ? (DEDUCTION_LABELS.categories as Record<string, string>)[snapshot.category] ?? null : null,
        calcMethodLabel: (DEDUCTION_LABELS.calcMethods as Record<string, string>)[request.calcMethod] ?? request.calcMethod,
        inputValue: PayrollDecimal.from(typeof request.inputValue === 'number' ? request.inputValue : String(request.inputValue)).canonical(),
        reason: request.reason, incidentDate: request.incidentDate, installmentNo: index >= 0 ? index + 1 : null, installments: request.installments,
        units: typeof part?.units === 'string' ? part.units : null, rate: typeof part?.rate === 'string' ? moneyText(part.rate) : null,
        formula: typeof part?.formula === 'string' ? part.formula : typeof trace.creation?.formula === 'string' && request.installments === 1 ? trace.creation.formula : null,
        salarySource: typeof part?.salarySource === 'string' ? part.salarySource : typeof trace.creation?.salarySource === 'string' ? trace.creation.salarySource : null,
        reversal,
      }
    }
    const bonusRequest = row.bonusRequestId ? bonuses.get(row.bonusRequestId) ?? null : null
    let bonus: PayrollObligationDetail['bonus'] = null
    if (bonusRequest) {
      const snapshot = parse<Record<string, any>>(bonusRequest.typeSnapshot, {})
      const trace = parse<Record<string, any>>(bonusRequest.amountTrace, {})
      const approvals = Array.isArray(trace.approvals) ? trace.approvals : []
      const finalTrace = approvals[approvals.length - 1]?.trace ?? trace.creation
      bonus = {
        requestId: bonusRequest.id, typeName: snapshot.nameAr ?? null,
        calcMethodLabel: (BONUS_LABELS.calcMethods as Record<string, string>)[bonusRequest.calcMethod] ?? bonusRequest.calcMethod,
        inputValue: PayrollDecimal.from(typeof bonusRequest.inputValue === 'number' ? bonusRequest.inputValue : String(bonusRequest.inputValue)).canonical(),
        reason: bonusRequest.reason, formula: typeof finalTrace?.formula === 'string' ? finalTrace.formula : null,
        reversal: row.category === BONUS_REVERSAL_OBLIGATION_CATEGORY,
      }
    }
    const amount = line.amount ?? row.amount
    return {
      obligationId: row.id, type: (line.type ?? row.type ?? null) as PayrollObligationDetail['type'], category: row.category ?? null,
      categoryLabel: PAYROLL_OBLIGATION_CATEGORY_LABELS[row.category] ?? row.category ?? 'قيد', label: row.label ?? null,
      amount: moneyText(amount), collected: moneyText(line.collected ?? amount), carried: moneyText(line.carried ?? 0),
      targetPeriod: row.targetPeriod ?? null, status: row.status ?? null, carriedFromObligationId: row.carriedFromObligationId ?? null, deduction, bonus,
    }
  })
}
