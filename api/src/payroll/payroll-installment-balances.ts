import { ConflictException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { PayrollDecimal } from './payroll-decimal'

export interface LoanInstallmentPosition {
  id: number; loanId: number; employeeId: number; dueDate: string; originalDueDate: string
  amount: string; paidAmount: string; remainingAmount: string
  financialStatus: 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED'
  financialRevision: number; paid: boolean; parentInstallmentId: number | null; paidAt: Date | null
}
const invalid = () => new ConflictException({ code: 'LOAN_BALANCE_INVALID', message: 'رصيد أحد الأقساط أو سلسلة ترحيله غير متسق؛ راجعه ماليًا قبل المتابعة' })
const money = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{1,16}\.\d{2}$/.test(value)) throw invalid()
  return PayrollDecimal.from(value)
}

// جسر للمسير والتصفية القديمين فقط؛ لا تمر قيمة تفقد قرشًا عبر Number بصمت.
export function legacyInstallmentNumber(amount: string): number {
  const exact = money(amount), cents = exact.multiply(PayrollDecimal.from('100'))
  if (cents.integerInRange(0, Number.MAX_SAFE_INTEGER) === null) throw new ConflictException('مبلغ القسط يتجاوز الدقة الآمنة للمسار المالي القديم')
  const result = Number(amount)
  if (PayrollDecimal.from(result.toFixed(2)).compare(exact) !== 0) throw new ConflictException('تعذر تمثيل مبلغ القسط في المسار القديم دون فقد قرش')
  return result
}

/** AD-10/11: الأصل المغلق بالترحيل ليس مسددًا؛ الدين المفتوح على ابنه، والمسدد الفعلي على الأصل. */
export async function readLoanInstallmentPositions(em: EntityManager, employeeId: number, loanId?: number): Promise<LoanInstallmentPosition[]> {
  if (!Number.isSafeInteger(employeeId) || employeeId < 1 || (loanId !== undefined && (!Number.isSafeInteger(loanId) || loanId < 1))) throw invalid()
  const rows = await em.query(`SELECT i.[id],i.[loanId],l.[employeeId],
    CONVERT(varchar(10),i.[dueDate],23) AS [dueDate], CONVERT(varchar(10),i.[originalDueDate],23) AS [originalDueDate],
    CONVERT(varchar(40),i.[amount]) AS [amount],CONVERT(varchar(40),i.[paidAmount]) AS [paidAmount],
    i.[paid],i.[financialStatus],i.[financialRevision],i.[parentInstallmentId],i.[paidAt]
    FROM [loan_installments] i INNER JOIN [loans] l ON l.[id]=i.[loanId]
    WHERE l.[employeeId]=@0 ${loanId === undefined ? '' : 'AND l.[id]=@1'} ORDER BY i.[id]`, loanId === undefined ? [employeeId] : [employeeId, loanId])
  const result: LoanInstallmentPosition[] = rows.map((row: any) => {
    const amount = money(row.amount), paidAmount = money(row.paidAmount ?? (row.paid ? row.amount : '0.00'))
    const financialStatus = row.financialStatus ?? (row.paid ? 'PAID' : 'DUE'), revision = row.financialRevision ?? 1
    if (!['DUE', 'PARTIAL', 'DEFERRED', 'PAID', 'SETTLED'].includes(financialStatus) ||
        !Number.isSafeInteger(revision) || revision < 1 || paidAmount.compare(amount) > 0 ||
        (financialStatus === 'DUE' && (row.paid || !paidAmount.isZero())) ||
        (['PAID', 'SETTLED'].includes(financialStatus) && (!row.paid || paidAmount.compare(amount) !== 0)) ||
        (['PARTIAL', 'DEFERRED'].includes(financialStatus) && (row.paid || paidAmount.compare(amount) >= 0)) ||
        (financialStatus === 'DEFERRED' && !paidAmount.isZero()) ||
        (financialStatus === 'PARTIAL' && paidAmount.isZero()) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate) || (row.originalDueDate && row.originalDueDate > row.dueDate)) throw invalid()
    return { id: row.id, loanId: row.loanId, employeeId: row.employeeId, dueDate: row.dueDate,
      originalDueDate: row.originalDueDate ?? row.dueDate, amount: amount.format(2, 'HALF_UP'), paidAmount: paidAmount.format(2, 'HALF_UP'),
      remainingAmount: financialStatus === 'DUE' ? amount.format(2, 'HALF_UP') : '0.00', financialStatus,
      financialRevision: revision, paid: Boolean(row.paid), parentInstallmentId: row.parentInstallmentId ?? null, paidAt: row.paidAt ?? null }
  })
  const byId = new Map(result.map(row => [row.id, row])), children = new Map<number, LoanInstallmentPosition[]>()
  for (const row of result) if (row.parentInstallmentId !== null) {
    const parent = byId.get(row.parentInstallmentId)
    // الهوية المتزايدة تمنع الحلقات وتربط الجزء بنفس الموظف والسلفة دون استنتاج دين جديد.
    if (!parent || parent.id >= row.id || parent.loanId !== row.loanId || parent.originalDueDate !== row.originalDueDate || row.dueDate <= parent.dueDate) throw invalid()
    children.set(parent.id, [...(children.get(parent.id) ?? []), row])
  }
  for (const row of result) {
    const child = children.get(row.id) ?? []
    if (['PARTIAL', 'DEFERRED'].includes(row.financialStatus)) {
      if (child.length !== 1 || money(child[0].amount).add(money(row.paidAmount)).compare(money(row.amount)) !== 0) throw invalid()
    } else if (child.length) throw invalid()
  }
  return result
}
