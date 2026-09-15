import { ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollFinancialExemption, PayrollFinancialExemptionEvent } from './financial-exemptions.entities'
import {
  EXEMPTION_LABELS,
  exemptionTargetLabel,
  exemptionAttachmentThreshold,
  exemptionNeedsAttachment,
  exemptionNumericSetting,
  FINANCIAL_EXEMPTION_VERSION,
  type ExemptionDisposition,
  type ExemptionRule,
  type ExemptionScopeKind,
  type FinancialExemptionBreakdown,
} from './financial-exemptions'
import type { PayrollItem, PayrollRun } from './payroll.entities'
import { DeductionRequestEvent, DeductionType } from './typed-deductions.entities'

// ربط الإعفاء المالي بدورة المسير (الخطوة 26 — EX-01 قاعدة 4، EX-08):
// الحساب يقرأ الإعفاءات النشطة ← الاعتماد يتحقق أن الحساب طبّق المجموعة الحالية نفسها ويثبت المبلغ المُسقط (APPLIED) ويحجز القيود المُعفاة
// ← الصرف يعلّم القيد المصنف EXEMPTED (إسقاط) أو DEFERRED مع قسط جديد للشهر التالي بمرجع الإعفاء (أقساط السلف تُؤجل في دفتر الأقساط)
// ← إعادة الفتح تعيد APPLIED إلى ACTIVE، والإلغاء ينهي الحي EXPIRED. لا يُمس سطر الحضور ولا يُحذف قيد.
const conflict = (code: string, message: string, details: Record<string, unknown> = {}) => new ConflictException({ code, message, ...details })
const cents = (value: unknown) => Math.round(Number(value) * 100)
function requireTransaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Financial exemption ledger requires a transaction')
}

export const exemptionRuleOf = (row: Pick<PayrollFinancialExemption, 'id' | 'revision' | 'scopeKind' | 'targetKind' | 'deductionTypeId' | 'targetRef' | 'disposition'>): ExemptionRule => ({
  id: row.id, revision: row.revision, scopeKind: row.scopeKind as ExemptionScopeKind, targetKind: (row.targetKind ?? null) as ExemptionRule['targetKind'],
  deductionTypeId: row.deductionTypeId ?? null, targetRef: row.targetRef ?? null, disposition: row.disposition as ExemptionDisposition,
})

/** الإعفاءات النشطة لموظف في مسير (المسير الجديد بلا معرّف لا يحمل إعفاء). */
export async function readActiveRunExemptions(em: EntityManager, runId: number | null | undefined, employeeId: number): Promise<ExemptionRule[]> {
  if (!runId) return []
  const rows = await em.getRepository(PayrollFinancialExemption).find({ where: { runId, employeeId, status: 'ACTIVE' }, order: { id: 'ASC' } })
  return rows.map(exemptionRuleOf)
}

/** حقائق الخصم المصنف لكل قيد: نوعه وتصنيفه وقابليته للإعفاء واسمه ومُنشئه، من لقطة الطلب وقت إنشائه. */
export async function readExemptionObligationFacts(em: EntityManager, obligations: Array<{ id: number; deductionRequestId?: number | null }>) {
  const facts = new Map<number, { deductionTypeId: number | null; typedCategory: string | null; isExemptable: boolean | null; typeName: string | null; creatorUserId: number | null }>()
  const requestIds = [...new Set(obligations.map(row => row.deductionRequestId).filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  if (!requestIds.length) return facts
  const rows: Array<{ id: number; deductionTypeId: number; typeSnapshot: string | null; creatorUserId: number | null }> = []
  for (let index = 0; index < requestIds.length; index += 1000) {
    const chunk = requestIds.slice(index, index + 1000)
    rows.push(...await em.query(`SELECT [id],[deductionTypeId],[typeSnapshot],[creatorUserId] FROM [deduction_requests] WHERE [id] IN (${chunk.map((_, i) => `@${i}`).join(',')})`, chunk))
  }
  const byRequest = new Map(rows.map(row => {
    let snapshot: Record<string, unknown> = {}
    try { snapshot = JSON.parse(row.typeSnapshot ?? '{}') } catch { snapshot = {} }
    return [Number(row.id), { deductionTypeId: Number(row.deductionTypeId) || null, typedCategory: typeof snapshot.category === 'string' ? snapshot.category : null,
      isExemptable: typeof snapshot.isExemptable === 'boolean' ? snapshot.isExemptable : null, typeName: typeof snapshot.nameAr === 'string' ? snapshot.nameAr : null,
      creatorUserId: row.creatorUserId == null ? null : Number(row.creatorUserId) }]
  }))
  for (const row of obligations) {
    const fact = row.deductionRequestId ? byRequest.get(row.deductionRequestId) : undefined
    if (fact) facts.set(row.id, fact)
  }
  return facts
}

export async function recordExemptionEvent(em: EntityManager, row: Pick<PayrollFinancialExemption, 'id' | 'runId' | 'employeeId'>, eventType: string, actorUserId: number | null,
  fromStatus: string | null, toStatus: string | null, reason: string | null, payload: Record<string, unknown> | null) {
  await em.getRepository(PayrollFinancialExemptionEvent).save({ exemptionId: row.id, runId: row.runId, employeeId: row.employeeId, eventType, actorUserId,
    fromStatus, toStatus, reason: reason?.slice(0, 1000) ?? null, payload: payload === null ? null : JSON.stringify(payload) })
}

/** تفصيل الإعفاء المحفوظ مع البند؛ null = حُسب البند بلا إعفاء. الشكل التالف يوقف الاعتماد بدل أن يُفسر صامتًا. */
export function financialExemptionsOf(breakdown: unknown): FinancialExemptionBreakdown | null {
  const value = breakdown && typeof breakdown === 'object' ? (breakdown as Record<string, unknown>).financialExemptions : undefined
  if (value === undefined || value === null) return null
  const saved = value as FinancialExemptionBreakdown
  if (saved.version !== FINANCIAL_EXEMPTION_VERSION || !Array.isArray(saved.applied) || !Array.isArray(saved.lines) || !Array.isArray(saved.exemptedObligations) ||
    !Array.isArray(saved.deferredInstallments) || !saved.totals || !Array.isArray(saved.totals.byExemption)) {
    throw conflict('PAYRUN-EXEMPTION-INVALID', 'تفصيل الإعفاء المالي المحفوظ مع المسير غير صالح؛ أعد حساب المسير')
  }
  return saved
}
const parseBreakdown = (item: Pick<PayrollItem, 'breakdown'>) => {
  try { return item.breakdown ? JSON.parse(item.breakdown) : {} } catch { throw conflict('PAYRUN-EXEMPTION-INVALID', 'تفصيل المسير غير صالح؛ أعد حسابه') }
}
const appliedKey = (rows: Array<{ id: number; revision: number }>) => JSON.stringify([...rows].map(row => ({ id: Number(row.id), revision: Number(row.revision) })).sort((a, b) => a.id - b.id))

async function attachmentDays(em: EntityManager) {
  const row = await em.getRepository(RequestsConfig).findOneBy({ key: 'financial_exemptions.attachment_threshold_days' })
  return exemptionNumericSetting('financial_exemptions.attachment_threshold_days', row?.value)
}

/**
 * قبل اعتماد المسير (EX-01 قاعدة 4، EX-07 قاعدة 1): لا إعفاء بانتظار الاعتماد، والحساب طبّق الإعفاءات النشطة الحالية نفسها بمراجعاتها
 * (منح أو إلغاء بعد الحساب يلزم إعادة الحساب)، والمبلغ المُسقط فعلًا فوق حد المرفق يحتاج مرفقًا.
 */
export async function assertRunExemptionsForApproval(em: EntityManager, run: Pick<PayrollRun, 'id'>, items: PayrollItem[]) {
  const rows = await em.getRepository(PayrollFinancialExemption).find({ where: { runId: run.id, status: In(['PENDING_APPROVAL', 'ACTIVE']) }, order: { id: 'ASC' } })
  const pending = rows.filter(row => row.status === 'PENDING_APPROVAL')
  if (pending.length) {
    throw conflict('PAYRUN-EXEMPTION-PENDING', `يوجد ${pending.length} إعفاء مالي بانتظار الاعتماد على هذا المسير (${pending.map(row => `#${row.id}`).join('، ')})؛ اعتمده أو ارفضه ثم أعد الحساب قبل اعتماد المسير`,
      { exemptionIds: pending.map(row => row.id) })
  }
  const stale: number[] = []
  const days = await attachmentDays(em)
  for (const item of items) {
    const breakdown = parseBreakdown(item)
    const saved = financialExemptionsOf(breakdown)
    const active = rows.filter(row => row.employeeId === item.employeeId)
    if (appliedKey(saved?.applied ?? []) !== appliedKey(active)) { stale.push(item.employeeId); continue }
    const dayRate = Number(breakdown.gross) / Number(breakdown.monthlyDays || 30)
    for (const row of active) {
      const amount = saved?.totals.byExemption.find(entry => entry.exemptionId === row.id)?.amount ?? '0.00'
      if (exemptionNeedsAttachment(amount, dayRate, days, row.attachmentRef)) {
        throw conflict('EXEMPTION_ATTACHMENT_REQUIRED', `الإعفاء #${row.id} أسقط ${amount} وهو فوق حد ${exemptionAttachmentThreshold(dayRate, days)} بلا مرفق؛ أضف مرجع المرفق للإعفاء ثم أعد الاعتماد`,
          { exemptionId: row.id, amount, threshold: exemptionAttachmentThreshold(dayRate, days) })
      }
    }
  }
  if (stale.length) {
    throw conflict('PAYRUN-EXEMPTION-RECALC-REQUIRED', 'تغيّرت الإعفاءات المالية على هذا المسير بعد حسابه (منح أو اعتماد أو إلغاء)؛ أعد حساب المسير قبل اعتماده', { employeeIds: stale })
  }
}

/** حجز القيود المُعفاة باسم المسير المعتمد (مثل القيود المحصلة): لا يستهلكها مسير آخر حتى الصرف أو إعادة الفتح. */
export async function reserveExemptedObligations(em: EntityManager, employeeId: number, runId: number, breakdown: unknown) {
  requireTransaction(em)
  const saved = financialExemptionsOf(breakdown)
  const ids = [...new Set((saved?.exemptedObligations ?? []).map(row => Number(row.obligationId)))].sort((a, b) => a - b)
  if (!ids.length) return []
  const rows = await em.getRepository(EmployeeObligation).findBy({ id: In(ids), employeeId })
  if (rows.length !== ids.length) throw conflict('PAYRUN-OBLIGATION-CHANGED', 'أحد القيود المُعفاة لم يعد موجودًا أو يخص موظفًا آخر؛ أعد حساب المسير')
  for (const row of rows) {
    const line = saved!.exemptedObligations.find(entry => entry.obligationId === row.id)!
    if (row.status !== 'PENDING') throw conflict('PAYRUN-OBLIGATION-CHANGED', `القيد المُعفى #${row.id} استُهلك أو أُلغي بعد الحساب؛ أعد حساب المسير`)
    if (row.reservedPayrollRunId != null && row.reservedPayrollRunId !== runId) throw conflict('PAYRUN-OBLIGATION-RESERVED', `القيد المُعفى #${row.id} محجوز لمسير آخر معتمد (#${row.reservedPayrollRunId})`)
    if (cents(row.amount) !== cents(line.amount)) throw conflict('PAYRUN-OBLIGATION-CHANGED', `مبلغ القيد المُعفى #${row.id} تغيّر بعد الحساب؛ أعد حساب المسير`)
  }
  const updated = await em.query(`UPDATE [employee_obligations] SET [reservedPayrollRunId]=@0,[reservedAt]=SYSUTCDATETIME() OUTPUT INSERTED.[id]
    WHERE [employeeId]=@1 AND [status]='PENDING' AND ([reservedPayrollRunId] IS NULL OR [reservedPayrollRunId]=@0) AND [id] IN (${ids.map((_, i) => `@${i + 2}`).join(',')})`, [runId, employeeId, ...ids])
  if (updated.length !== ids.length) throw conflict('PAYRUN-OBLIGATION-RESERVED', 'أحد القيود المُعفاة حُجز لمسير آخر أثناء الاعتماد')
  return ids
}

/** عند اعتماد المسير: النشط لعضو له بند ← APPLIED بالمبلغ المُسقط وسطوره؛ النشط لموظف خارج البنود ← EXPIRED (لا ينتقل لمسير آخر). */
export async function markRunExemptionsApplied(em: EntityManager, run: Pick<PayrollRun, 'id' | 'snapshotVersion'>, items: PayrollItem[], actorUserId: number) {
  requireTransaction(em)
  const repo = em.getRepository(PayrollFinancialExemption)
  const rows = await repo.find({ where: { runId: run.id, status: 'ACTIVE' }, order: { id: 'ASC' } })
  for (const row of rows) {
    const item = items.find(entry => entry.employeeId === row.employeeId)
    if (!item) {
      await repo.update({ id: row.id, status: 'ACTIVE' }, { status: 'EXPIRED', decidedByUserId: actorUserId, decidedAt: new Date(), decisionReason: 'اعتُمد المسير دون أن يشمل الموظف', updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'EXPIRED', actorUserId, 'ACTIVE', 'EXPIRED', 'اعتُمد المسير دون أن يشمل الموظف؛ الإعفاء لا ينتقل لمسير آخر', { runSnapshotVersion: run.snapshotVersion })
      continue
    }
    const saved = financialExemptionsOf(parseBreakdown(item))
    const amount = saved?.totals.byExemption.find(entry => entry.exemptionId === row.id)?.amount ?? '0.00'
    const lines = (saved?.lines ?? []).filter(line => line.exemptionId === row.id)
    const done = await repo.update({ id: row.id, status: 'ACTIVE' }, { status: 'APPLIED', exemptedAmountSnapshot: amount, appliedLines: JSON.stringify(lines),
      appliedSnapshotVersion: run.snapshotVersion, updatedAt: new Date() })
    if (done.affected !== 1) throw conflict('PAYRUN-EXEMPTION-RECALC-REQUIRED', `تغيّرت حالة الإعفاء #${row.id} أثناء الاعتماد؛ أعد المحاولة`)
    await recordExemptionEvent(em, row, 'APPLIED', actorUserId, 'ACTIVE', 'APPLIED', null, { amount, lines: lines.length, runSnapshotVersion: run.snapshotVersion })
  }
}

const nextPeriodOf = (period: string) => {
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5, 7))
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * عند صرف المسير (EX-08 قاعدة 1/2): القيد المصنف المُعفى بإسقاط ← EXEMPTED نهائيًا بمرجع الإعفاء ولا يعود في أي مسير؛
 * وبتأجيل ← DEFERRED مع قسط PENDING جديد بنفس المبلغ للشهر التالي يحمل مرجع الإعفاء ويظهر للموظف «مؤجَّل من … بقرار إعفاء».
 */
export async function postExemptedObligations(em: EntityManager, employeeId: number, run: Pick<PayrollRun, 'id' | 'period' | 'endDate'>, breakdown: unknown, actorUserId: number) {
  requireTransaction(em)
  const saved = financialExemptionsOf(breakdown)
  if (!saved?.exemptedObligations.length) return []
  const repo = em.getRepository(EmployeeObligation)
  const children: number[] = []
  for (const entry of [...saved.exemptedObligations].sort((a, b) => a.obligationId - b.obligationId)) {
    const row = await repo.findOneBy({ id: entry.obligationId, employeeId })
    if (!row || row.status !== 'PENDING' || (row.reservedPayrollRunId != null && row.reservedPayrollRunId !== run.id) || cents(row.amount) !== cents(entry.amount)) {
      throw conflict('PAYRUN-OBLIGATION-CHANGED', `القيد المُعفى #${entry.obligationId} تغيّر أو استُهلك بعد الاعتماد؛ راجع المسير`)
    }
    const status = entry.disposition === 'DEFER_ONE_PERIOD' ? 'DEFERRED' : 'EXEMPTED'
    const done = await em.query(`UPDATE [employee_obligations] SET [status]=@0,[appliedPayrollRunId]=@1,[appliedAt]=GETDATE(),[appliedAmount]=CAST('0.00' AS decimal(18,2)),
      [financialExemptionId]=@2,[reservedPayrollRunId]=@1,[reservedAt]=COALESCE([reservedAt],SYSUTCDATETIME())
      OUTPUT INSERTED.[id] WHERE [id]=@3 AND [employeeId]=@4 AND [status]='PENDING' AND ([reservedPayrollRunId] IS NULL OR [reservedPayrollRunId]=@1)`,
    [status, run.id, entry.exemptionId, row.id, employeeId])
    if (done.length !== 1) throw conflict('PAYRUN-OBLIGATION-CHANGED', `القيد المُعفى #${row.id} استُهلك بالفعل؛ راجع المسير`)
    let childId: number | null = null
    if (status === 'DEFERRED') {
      const next = new Date(Date.parse(`${run.endDate}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
      const child = await repo.save(repo.create({ employeeId, type: row.type, category: row.category, amount: Number(row.amount),
        label: `مؤجَّل من مسير ${run.period} بقرار الإعفاء المالي #${entry.exemptionId}: ${row.label}`.slice(0, 300), status: 'PENDING', effectiveDate: next,
        sourceRequestId: row.sourceRequestId, sourceRef: row.sourceRef, createdByUserId: actorUserId, deductionRequestId: row.deductionRequestId ?? null,
        targetPeriod: nextPeriodOf(run.period), carriedFromObligationId: row.id, financialExemptionId: entry.exemptionId }))
      childId = child.id
      children.push(child.id)
    }
    if (row.deductionRequestId != null) {
      await em.getRepository(DeductionRequestEvent).save({ requestId: row.deductionRequestId, eventType: status === 'DEFERRED' ? 'DEFERRED_BY_EXEMPTION' : 'EXEMPTED', actorUserId,
        fromStatus: null, toStatus: null, stepOrder: null,
        reason: status === 'DEFERRED' ? `أُجّل ${entry.amount} من مسير ${run.period} إلى ${nextPeriodOf(run.period)} بقرار الإعفاء المالي #${entry.exemptionId}`
          : `أُسقط ${entry.amount} في مسير ${run.period} بقرار الإعفاء المالي #${entry.exemptionId}`,
        payload: JSON.stringify({ obligationId: row.id, childObligationId: childId, exemptionId: entry.exemptionId, runId: run.id, amount: entry.amount }) })
    }
  }
  return children
}

/** إعادة فتح المسير المعتمد تعيد الإعفاء المطبق نشطًا (يُعاد تثبيته عند الاعتماد التالي)؛ إلغاء المسير ينهي الحي (EX-08 قاعدة 5). */
export async function releaseRunExemptions(em: EntityManager, runId: number, toStatus: string, actorUserId: number, reason: string) {
  requireTransaction(em)
  const repo = em.getRepository(PayrollFinancialExemption)
  if (toStatus === 'CALCULATED') {
    for (const row of await repo.find({ where: { runId, status: 'APPLIED' } })) {
      await repo.update({ id: row.id, status: 'APPLIED' }, { status: 'ACTIVE', exemptedAmountSnapshot: null, appliedLines: null, appliedSnapshotVersion: null, updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'RUN_REOPENED', actorUserId, 'APPLIED', 'ACTIVE', reason, null)
    }
  } else if (toStatus === 'CANCELLED') {
    for (const row of await repo.find({ where: { runId, status: In(['PENDING_APPROVAL', 'ACTIVE']) } })) {
      await repo.update({ id: row.id }, { status: 'EXPIRED', decidedByUserId: actorUserId, decidedAt: new Date(), decisionReason: 'أُلغي المسير', updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'EXPIRED', actorUserId, row.status, 'EXPIRED', `أُلغي المسير: ${reason}`, null)
    }
  }
}

/**
 * القسيمة (EX-04 وقبول الخطوة 26): كل إعفاء طُبق على البند برقمه وحالته ونطاقه ومصيره وسببه والمانح بالدور لا بالاسم،
 * والمبلغ المُسقط من التفصيل المحفوظ مع المسير (إعادة الطباعة بعد سنة تعرض نفس السطر ونفس الرقم).
 */
export async function describePayslipExemptions(em: EntityManager, breakdown: unknown) {
  let saved: FinancialExemptionBreakdown | null
  try { saved = financialExemptionsOf(breakdown) } catch { return [] }
  const ids = [...new Set((saved?.applied ?? []).map(row => Number(row.id)).filter(id => Number.isSafeInteger(id) && id > 0))]
  if (!saved || !ids.length) return []
  const rows = await em.getRepository(PayrollFinancialExemption).find({ where: { id: In(ids) }, order: { id: 'ASC' } })
  const typeIds = [...new Set(rows.map(row => row.deductionTypeId).filter((id): id is number => !!id))]
  const typeNames = typeIds.length ? new Map((await em.getRepository(DeductionType).find({ where: { id: In(typeIds) }, select: { id: true, nameAr: true } })).map(row => [row.id, row.nameAr])) : new Map<number, string>()
  return rows.map(row => ({
    id: row.id, status: row.status, statusLabel: EXEMPTION_LABELS.statuses[row.status as keyof typeof EXEMPTION_LABELS.statuses] ?? row.status,
    scopeKind: row.scopeKind, scopeLabel: EXEMPTION_LABELS.scopes[row.scopeKind as keyof typeof EXEMPTION_LABELS.scopes] ?? row.scopeKind,
    targetLabel: exemptionTargetLabel(exemptionRuleOf(row), row.deductionTypeId ? typeNames.get(row.deductionTypeId) ?? null : null),
    disposition: row.disposition, dispositionLabel: EXEMPTION_LABELS.dispositions[row.disposition as keyof typeof EXEMPTION_LABELS.dispositions] ?? row.disposition,
    reason: row.reason, grantorBasis: row.grantorBasis, grantorBasisLabel: EXEMPTION_LABELS.bases[row.grantorBasis as keyof typeof EXEMPTION_LABELS.bases] ?? row.grantorBasis,
    grantedAt: row.createdAt, approvedAt: row.approvedAt, hasAttachment: !!row.attachmentRef,
    amount: saved!.totals.byExemption.find(entry => entry.exemptionId === row.id)?.amount ?? '0.00',
  }))
}

export { EXEMPTION_LABELS }
