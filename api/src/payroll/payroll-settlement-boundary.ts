import { ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { OffboardingCase, SettlementLine } from '../offboarding/offboarding.entities'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { readLoanInstallmentPositions } from './payroll-installment-balances'
import type { LegacyExplicitOvertimeRequest } from './overtime-financial'

// ① / ح٢-ب: تثبيت المصادر المالية يمنع تكرارها بين المسير والتصفية.
export interface SettlementFinancialSnapshot {
  version: 1
  overtime: { id: number; payableHours: number; rate: number; amount: number;
    legacyExplicitRequest?: LegacyExplicitOvertimeRequest;
    financial?: { provenance: 'APPROVAL_SNAPSHOT'; approvedMinutes: number; hourlyRate: number; dayKind: string; originalPeriod: string | null } }[]
  installments: { id: number; loanId: number; amount: number }[]
  overtimeAmount: number
  installmentAmount: number
  overtimeLineId: number | null
  installmentLineId: number | null
  generatedAt: string
}

// قفل تطبيقي داخل المعاملة فقط؛ لا يقفل صف الموظف الذي تقرؤه خدمة الحضور باتصال آخر.
export async function lockPayrollEmployees(em: EntityManager, employeeIds: number[]) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Employee finance lock requires a transaction')
  const ids = [...new Set(employeeIds)].sort((a, b) => a - b)
  for (const id of ids) {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid employee finance lock identifier')
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`, [`hr:employee-finance:${id}`])
    if (!rows.length || Number(rows[0].lockResult) < 0) {
      throw new ConflictException('توجد عملية مالية جارية للموظف؛ حاول مجددًا بعد انتهائها')
    }
  }
}

export async function getSettlementFinancialClaims(em: EntityManager, employeeId: number, excludeCaseId?: number) {
  const cases = await em.getRepository(OffboardingCase).find({
    where: { employeeId, status: In(['SETTLED', 'CLOSED']) },
  })
  const overtimeIds = new Set<number>()
  const installmentIds = new Set<number>()
  for (const kase of cases) {
    if (kase.id === excludeCaseId) continue
    const snapshot = kase.settlementFinancialSnapshot
    if (!snapshot) {
      const lines = await em.getRepository(SettlementLine).find({ where: { caseId: kase.id, isAuto: true } })
      // أسماء البنود القديمة كانت قابلة للتعديل؛ لا تثبت التسمية أن المصدر لم يُسوَّ سابقًا.
      if (lines.length) {
        const overtime = await em.getRepository(OvertimeEntry).count({ where: { employeeId, status: 'APPROVED' } })
        const installments = (await readLoanInstallmentPositions(em, employeeId)).some(row => row.remainingAmount !== '0.00')
        if (overtime || installments) {
          throw new ConflictException(`التصفية السابقة رقم ${kase.id} بلا مصادر مالية مثبتة مع وجود إضافي أو سلف معلّقة؛ يلزم مراجعتها قبل حسابها في مسير أو تصفية أخرى`)
        }
      }
      continue
    }
    if (snapshot.version !== 1 || !Array.isArray(snapshot.overtime) || !Array.isArray(snapshot.installments)) {
      throw new ConflictException(`مصادر التصفية رقم ${kase.id} غير صالحة؛ يلزم مراجعتها ماليًا`)
    }
    for (const [entries, target] of [[snapshot.overtime, overtimeIds], [snapshot.installments, installmentIds]] as const) {
      for (const entry of entries) {
        if (!Number.isSafeInteger(entry.id) || entry.id < 1 || !Number.isFinite(Number(entry.amount))) {
          throw new ConflictException(`مصادر التصفية رقم ${kase.id} غير مكتملة؛ يلزم مراجعتها ماليًا`)
        }
        target.add(entry.id)
      }
    }
  }
  return { overtimeIds, installmentIds }
}
