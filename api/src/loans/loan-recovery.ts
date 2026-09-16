import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { fromCents, loanMoney, settlementLoanRecovery, toCents } from './loan-caps'

// AD-13 (C6): رصيد السلف غير المغطى بمستحقات نهاية الخدمة يبقى مدينًا PENDING_RECOVERY ولا يُشطب تلقائيًا.
const RECOVERY_COLUMNS = `[id],[employeeId],[caseId],[status],[sourceSnapshot],[createdByUserId],[createdAt],[resolvedAt],[resolvedByUserId],
  CONVERT(varchar(40),[loanBalance]) AS [loanBalance],CONVERT(varchar(40),[coveredAmount]) AS [coveredAmount],CONVERT(varchar(40),[amount]) AS [amount],
  CONVERT(varchar(40),[recoveredAmount]) AS [recoveredAmount],CONVERT(varchar(40),[writtenOffAmount]) AS [writtenOffAmount]`
export const LOAN_RECOVERY_COLUMNS = RECOVERY_COLUMNS

function requireTransaction(em: EntityManager) { if (!em.queryRunner?.isTransactionActive) throw new Error('Loan recovery requires a transaction') }
const exact = (value: unknown) => {
  const number = typeof value === 'string' ? value : Number(value)
  if (typeof number === 'number' && !Number.isFinite(number)) throw new ConflictException('مبلغ أحد بنود التصفية غير صالح')
  return PayrollDecimal.from(typeof number === 'number' ? number.toFixed(2) : number).format(2, 'DOWN')
}
export const openRecoveryAmount = (row: { amount: string; recoveredAmount: string; writtenOffAmount: string }) =>
  fromCents(toCents(row.amount) - toCents(row.recoveredAmount) - toCents(row.writtenOffAmount))

/** يُستدعى داخل معاملة اعتماد التصفية بعد تثبيت لقطة مصادرها. */
export async function recordSettlementLoanRecovery(em: EntityManager, input: { caseId: number; employeeId: number; installmentAmount: number | string;
  installments: Array<{ id: number; loanId: number; amount: number }>; lines: Array<{ type: string; amount: number | string; label?: string }>; actorId: number | null }) {
  requireTransaction(em)
  let credits = 0n, debits = 0n
  for (const line of input.lines) {
    const cents = toCents(exact(line.amount))
    if (line.type === 'CREDIT') credits += cents
    else if (line.type === 'DEBIT') debits += cents
    else throw new ConflictException('نوع بند تصفية غير معروف؛ راجع البنود قبل الاعتماد')
  }
  const result = settlementLoanRecovery({ loanBalance: exact(input.installmentAmount), credits: fromCents(credits), debits: fromCents(debits) })
  const [existing] = await em.query(`SELECT ${RECOVERY_COLUMNS} FROM [loan_recovery_balances] WITH (UPDLOCK, HOLDLOCK) WHERE [caseId]=@0`, [input.caseId])
  if (!result) {
    if (existing && existing.status !== 'CANCELLED') throw new ConflictException('للتصفية رصيد سلف متبقٍ مسجل لا يطابق بنودها الحالية؛ راجعه ماليًا')
    return null
  }
  if (existing) {
    if (existing.employeeId !== input.employeeId || existing.amount !== result.uncovered || existing.loanBalance !== result.loanBalance) {
      throw new ConflictException('رصيد السلف المتبقي المسجل للتصفية لا يطابق بنودها الحالية؛ راجعه ماليًا')
    }
    return existing
  }
  const snapshot = { installments: input.installments, credits: fromCents(credits), debits: fromCents(debits), net: fromCents(credits - debits) }
  const [row] = await em.query(`INSERT INTO [loan_recovery_balances] ([employeeId],[caseId],[loanBalance],[coveredAmount],[amount],[recoveredAmount],[writtenOffAmount],[status],[sourceSnapshot],[createdByUserId])
    OUTPUT INSERTED.[id] VALUES(@0,@1,CAST(@2 AS decimal(18,2)),CAST(@3 AS decimal(18,2)),CAST(@4 AS decimal(18,2)),CAST('0.00' AS decimal(18,2)),CAST('0.00' AS decimal(18,2)),N'PENDING_RECOVERY',@5,@6)`,
  [input.employeeId, input.caseId, result.loanBalance, result.covered, result.uncovered, JSON.stringify(snapshot), input.actorId])
  await em.query(`INSERT INTO [loan_recovery_events] ([recoveryId],[action],[amount],[balanceAfter],[reference],[reason],[actorId])
    VALUES(@0,N'CREATED',CAST(@1 AS decimal(18,2)),CAST(@1 AS decimal(18,2)),NULL,@2,@3)`,
  [row.id, result.uncovered, `مقاصة رصيد السلف ${result.loanBalance} مع مستحقات التصفية؛ غُطي ${result.covered} وبقي ${result.uncovered} مدينًا`, input.actorId])
  const [created] = await em.query(`SELECT ${RECOVERY_COLUMNS} FROM [loan_recovery_balances] WHERE [id]=@0`, [row.id])
  return created
}

async function lockedRecovery(em: EntityManager, recoveryId: number) {
  requireTransaction(em)
  const [identity] = await em.query('SELECT [employeeId] FROM [loan_recovery_balances] WHERE [id]=@0', [recoveryId])
  if (!identity) throw new NotFoundException('رصيد السلفة المتبقي غير موجود')
  await lockPayrollEmployees(em, [identity.employeeId])
  const [row] = await em.query(`SELECT ${RECOVERY_COLUMNS} FROM [loan_recovery_balances] WITH (UPDLOCK, HOLDLOCK) WHERE [id]=@0`, [recoveryId])
  const [kase] = await em.query('SELECT [status] FROM [offboarding_cases] WHERE [id]=@0', [row.caseId])
  if (!kase || !['SETTLED', 'CLOSED'].includes(kase.status)) throw new ConflictException('ملف إنهاء الخدمة المرتبط غير معتمد؛ لا حركة على الرصيد')
  return row
}

async function finish(em: EntityManager, row: any, action: 'COLLECTED' | 'WRITTEN_OFF', amount: string, reference: string | null, reason: string | null, actorId: number) {
  const recovered = action === 'COLLECTED' ? toCents(row.recoveredAmount) + toCents(amount) : toCents(row.recoveredAmount)
  const writtenOff = action === 'WRITTEN_OFF' ? toCents(row.writtenOffAmount) + toCents(amount) : toCents(row.writtenOffAmount)
  const open = toCents(row.amount) - recovered - writtenOff
  const status = open > 0n ? 'PENDING_RECOVERY' : writtenOff > 0n ? 'WRITTEN_OFF' : 'RECOVERED'
  await em.query(`UPDATE [loan_recovery_balances] SET [recoveredAmount]=CAST(@0 AS decimal(18,2)),[writtenOffAmount]=CAST(@1 AS decimal(18,2)),[status]=@2,
    [resolvedAt]=CASE WHEN @2=N'PENDING_RECOVERY' THEN NULL ELSE SYSUTCDATETIME() END,[resolvedByUserId]=CASE WHEN @2=N'PENDING_RECOVERY' THEN NULL ELSE @3 END WHERE [id]=@4`,
  [fromCents(recovered), fromCents(writtenOff), status, actorId, row.id])
  await em.query(`INSERT INTO [loan_recovery_events] ([recoveryId],[action],[amount],[balanceAfter],[reference],[reason],[actorId]) VALUES(@0,@1,CAST(@2 AS decimal(18,2)),CAST(@3 AS decimal(18,2)),@4,@5,@6)`,
    [row.id, action, amount, fromCents(open), reference, reason, actorId])
  const [updated] = await em.query(`SELECT ${RECOVERY_COLUMNS} FROM [loan_recovery_balances] WHERE [id]=@0`, [row.id])
  return updated
}

/** تحصيل نقدي/تحويل بمرجع فريد لكل رصيد؛ لا يتجاوز المتبقي. */
export async function collectLoanRecovery(em: EntityManager, input: { recoveryId: number; amount: unknown; reference: string; reason?: string | null; actorId: number }) {
  const row = await lockedRecovery(em, input.recoveryId)
  const reference = String(input.reference ?? '').trim()
  if (!reference || reference.length > 100) throw new BadRequestException('مرجع التحصيل مطلوب حتى 100 حرف')
  const amount = loanMoney(input.amount, 'مبلغ التحصيل')
  const [prior] = await em.query(`SELECT [id],CONVERT(varchar(40),[amount]) AS [amount] FROM [loan_recovery_events] WHERE [recoveryId]=@0 AND [reference]=@1`, [row.id, reference])
  if (prior) {
    if (prior.amount !== amount) throw new ConflictException({ code: 'LOAN_RECOVERY_REFERENCE_USED', message: 'مرجع التحصيل مستخدم لحركة أخرى على هذا الرصيد' })
    return row
  }
  if (row.status !== 'PENDING_RECOVERY') throw new ConflictException('الرصيد مغلق بالفعل')
  const open = openRecoveryAmount(row)
  if (toCents(amount) > toCents(open)) throw new BadRequestException({ code: 'LOAN_RECOVERY_EXCEEDS_BALANCE', message: `مبلغ التحصيل يتجاوز المتبقي ${open}`, openAmount: open })
  return finish(em, row, 'COLLECTED', amount, reference, input.reason?.trim() || null, input.actorId)
}

/** الشطب إجراء صريح بصلاحية مستقلة وسبب، ويشطب المتبقي كله. */
export async function writeOffLoanRecovery(em: EntityManager, input: { recoveryId: number; reason: string; actorId: number }) {
  const row = await lockedRecovery(em, input.recoveryId)
  const reason = String(input.reason ?? '').trim()
  if (reason.length < 10 || reason.length > 500) throw new BadRequestException('سبب الشطب مطلوب من 10 إلى 500 حرف')
  if (row.status !== 'PENDING_RECOVERY') throw new ConflictException('الرصيد مغلق بالفعل')
  return finish(em, row, 'WRITTEN_OFF', openRecoveryAmount(row), null, reason, input.actorId)
}
