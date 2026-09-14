import { ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { parsePayrollPolicyConfigValue, PAYROLL_POLICY_CONFIG_KEYS } from './payroll-policy-settings'
import type { PayrollObligationProtectionSettings } from './payroll-obligation-protection'
import { DeductionRequestEvent } from './typed-deductions.entities'

// DD-09: قيد الدفتر يُحجز باسم المسير عند اعتماده، ويُستهلك عند الصرف بمبلغه المحصل،
// والباقي بعد حماية الصافي (DD-11) يُرحّل كقيد جديد مرتبط بالأصل. إعادة الفتح/الإلغاء تحرر الحجز.
const conflict = (code: string, message: string) => new ConflictException({ code, message })
function requireTransaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Obligation ledger requires a transaction')
}
const cents = (value: unknown) => Math.round(Number(value) * 100)
const moneyText = (value: number) => (value / 100).toFixed(2)

interface BreakdownLine { id: number; amount: number; collected: number; carried: number }

function consumedIds(breakdown: Record<string, any>): number[] {
  if (breakdown.obligationIds === undefined || breakdown.obligationIds === null) return []
  if (!Array.isArray(breakdown.obligationIds) || breakdown.obligationIds.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) < 1)) {
    throw conflict('PAYRUN-OBLIGATION-INVALID', 'مراجع قيود دفتر المديونيات في المسير غير صالحة؛ أعد حساب المسودة')
  }
  return [...new Set<number>(breakdown.obligationIds)].sort((a, b) => a - b)
}

function breakdownLines(breakdown: Record<string, any>): Map<number, BreakdownLine> | null {
  if (breakdown.obligationLines === undefined) return null
  if (!Array.isArray(breakdown.obligationLines)) throw conflict('PAYRUN-OBLIGATION-INVALID', 'تفصيل تحصيل قيود الدفتر غير صالح؛ أعد حساب المسودة')
  const map = new Map<number, BreakdownLine>()
  for (const line of breakdown.obligationLines) {
    if (!line || !Number.isSafeInteger(line.id) || ![line.amount, line.collected, line.carried].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
      cents(line.collected) + cents(line.carried) !== cents(line.amount) || map.has(line.id)) {
      throw conflict('PAYRUN-OBLIGATION-INVALID', 'تفصيل تحصيل قيود الدفتر غير متسق؛ أعد حساب المسودة')
    }
    map.set(line.id, line)
  }
  return map
}

export async function readPayrollNetProtectionSettings(em: EntityManager): Promise<PayrollObligationProtectionSettings> {
  const keys = [PAYROLL_POLICY_CONFIG_KEYS.minNetGuarantee, PAYROLL_POLICY_CONFIG_KEYS.netFloorPct, PAYROLL_POLICY_CONFIG_KEYS.maxDeductionPctOfGross]
  const rows = await em.getRepository(RequestsConfig).findBy({ key: In(keys) })
  const read = (field: 'minNetGuarantee' | 'netFloorPct' | 'maxDeductionPctOfGross') => {
    const row = rows.find(item => item.key === PAYROLL_POLICY_CONFIG_KEYS[field])
    // مفتاح غير مبذور بعد = بلا أرضية/سقف (نفس افتراض السياسة null)
    if (!row) return null
    const value = parsePayrollPolicyConfigValue(field, row.value)
    return value === null ? null : String(value)
  }
  return { minNetGuarantee: read('minNetGuarantee'), netFloorPct: read('netFloorPct'), maxDeductionPctOfGross: read('maxDeductionPctOfGross') }
}

async function validateRows(em: EntityManager, employeeId: number, runId: number, breakdown: Record<string, any>) {
  const ids = consumedIds(breakdown)
  if (!ids.length) return { ids, rows: [] as EmployeeObligation[], lines: null as Map<number, BreakdownLine> | null }
  const lines = breakdownLines(breakdown)
  const rows = await em.getRepository(EmployeeObligation).findBy({ id: In(ids), employeeId })
  if (rows.length !== ids.length) throw conflict('PAYRUN-OBLIGATION-CHANGED', 'أحد قيود دفتر المديونيات في المسير لم يعد موجودًا أو يخص موظفًا آخر؛ أعد حساب المسودة')
  for (const row of rows) {
    if (row.status !== 'PENDING') throw conflict('PAYRUN-OBLIGATION-CHANGED', `قيد الدفتر #${row.id} استُهلك أو أُلغي بعد الحساب؛ أعد حساب المسودة`)
    if (row.reservedPayrollRunId != null && row.reservedPayrollRunId !== runId) {
      throw conflict('PAYRUN-OBLIGATION-RESERVED', `قيد الدفتر #${row.id} محجوز لمسير آخر معتمد (#${row.reservedPayrollRunId})؛ أعد حساب المسودة`)
    }
    const line = lines?.get(row.id)
    if (lines && (!line || cents(line.amount) !== cents(row.amount) || cents(line.collected) <= 0)) {
      throw conflict('PAYRUN-OBLIGATION-CHANGED', `مبلغ قيد الدفتر #${row.id} تغيّر بعد الحساب؛ أعد حساب المسودة`)
    }
  }
  return { ids, rows: rows.sort((a, b) => a.id - b.id), lines }
}

/** حجز عند اعتماد المسير: مسير معتمد واحد فقط يحمل القيد. */
export async function reservePayrollObligations(em: EntityManager, employeeId: number, runId: number, breakdown: Record<string, any>) {
  requireTransaction(em)
  const { ids } = await validateRows(em, employeeId, runId, breakdown)
  if (!ids.length) return []
  const updated = await em.query(`UPDATE [employee_obligations] SET [reservedPayrollRunId]=@0,[reservedAt]=SYSUTCDATETIME()
    OUTPUT INSERTED.[id] WHERE [employeeId]=@1 AND [status]='PENDING' AND ([reservedPayrollRunId] IS NULL OR [reservedPayrollRunId]=@0)
    AND [id] IN (${ids.map((_, index) => `@${index + 2}`).join(',')})`, [runId, employeeId, ...ids])
  if (updated.length !== ids.length) throw conflict('PAYRUN-OBLIGATION-RESERVED', 'أحد قيود دفتر المديونيات حُجز لمسير آخر أثناء الاعتماد')
  return ids
}

/** فئة نوع الخصم المصنف وأولوية ترحيله من لقطة الطلب، لترتيب الخصم في حماية الصافي (DD-11). */
export async function readTypedObligationFacts(em: EntityManager, obligations: Array<{ id: number; deductionRequestId?: number | null }>) {
  const facts = new Map<number, { typedCategory: string | null; carryPriority: number | null }>()
  const requestIds = [...new Set(obligations.map(row => row.deductionRequestId).filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  if (!requestIds.length) return facts
  const rows: Array<{ id: number; typeSnapshot: string | null }> = await em.query(`SELECT [id], [typeSnapshot] FROM [deduction_requests]
    WHERE [id] IN (${requestIds.map((_, index) => `@${index}`).join(',')})`, requestIds)
  const byRequest = new Map(rows.map(row => {
    let snapshot: Record<string, unknown> = {}
    try { snapshot = JSON.parse(row.typeSnapshot ?? '{}') } catch { snapshot = {} }
    return [Number(row.id), { typedCategory: typeof snapshot.category === 'string' ? snapshot.category : null,
      carryPriority: Number.isInteger(snapshot.carryForwardPriority) ? Number(snapshot.carryForwardPriority) : null }]
  }))
  for (const row of obligations) {
    const fact = row.deductionRequestId ? byRequest.get(row.deductionRequestId) : undefined
    if (fact) facts.set(row.id, fact)
  }
  return facts
}

// DD-11 قاعدة 3/4: عدد مرات ترحيل القسط منذ آخر استئناف بقرار الموارد البشرية؛ تجاوز الحد يعلّق الابن
async function carryDepthSinceResume(em: EntityManager, row: EmployeeObligation) {
  const events: Array<{ payload: string | null }> = await em.query(`SELECT [payload] FROM [deduction_request_events] WHERE [requestId]=@0 AND [eventType]='CARRY_RESUMED'`, [row.deductionRequestId])
  const resumed = new Set(events.map(event => { try { return Number(JSON.parse(event.payload ?? '{}').obligationId) } catch { return 0 } }))
  let depth = 0, current: EmployeeObligation | null = row
  const seen = new Set<number>()
  while (current?.carriedFromObligationId && !resumed.has(current.id) && !seen.has(current.id) && depth < 100) {
    seen.add(current.id); depth++
    current = await em.getRepository(EmployeeObligation).findOneBy({ id: current.carriedFromObligationId })
  }
  return depth
}

async function maxCarryForwardCount(em: EntityManager) {
  const row = await em.getRepository(RequestsConfig).findOneBy({ key: 'deductions.max_carry_forward_count' })
  const value = Number(row?.value ?? '3')
  return Number.isInteger(value) && value >= 0 ? Math.min(99, value) : 3
}

/** الصرف: استهلاك المبلغ المحصل وترحيل الباقي كقيد PENDING جديد مستحق بعد نهاية فترة المسير. */
export async function postPayrollObligations(em: EntityManager, employeeId: number, run: { id: number; period: string; endDate: string }, breakdown: Record<string, any>, actorUserId: number) {
  requireTransaction(em)
  const { rows, lines } = await validateRows(em, employeeId, run.id, breakdown)
  const carriedIds: number[] = []
  let carryLimit: number | null = null
  for (const row of rows) {
    const line = lines?.get(row.id)
    const amountCents = cents(row.amount), collectedCents = line ? cents(line.collected) : amountCents, carriedCents = amountCents - collectedCents
    const done = await em.query(`UPDATE [employee_obligations] SET [status]='APPLIED',[appliedPayrollRunId]=@0,[appliedAt]=GETDATE(),
      [appliedAmount]=CAST(@1 AS decimal(18,2)),[reservedPayrollRunId]=@0,[reservedAt]=COALESCE([reservedAt],SYSUTCDATETIME())
      OUTPUT INSERTED.[id] WHERE [id]=@2 AND [employeeId]=@3 AND [status]='PENDING' AND ([reservedPayrollRunId] IS NULL OR [reservedPayrollRunId]=@0)`,
    [run.id, moneyText(collectedCents), row.id, employeeId])
    if (done.length !== 1) throw conflict('PAYRUN-OBLIGATION-CHANGED', 'أحد بنود التسوية استُهلك بالفعل؛ راجع المسير')
    if (carriedCents > 0) {
      const next = new Date(Date.parse(`${run.endDate}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
      const year = Number(run.period.slice(0, 4)), month = Number(run.period.slice(5, 7))
      const nextPeriod = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
      const repo = em.getRepository(EmployeeObligation)
      // قسط الخصم المصنف: الترحيل رقم (عمق السلسلة + 1) فوق الحد يُنشأ معلقًا بانتظار قرار الموارد البشرية
      let depth = 0, suspended = false
      if (row.deductionRequestId != null) {
        carryLimit ??= await maxCarryForwardCount(em)
        depth = await carryDepthSinceResume(em, row) + 1
        suspended = carryLimit > 0 && depth > carryLimit
      }
      const child = await repo.save(repo.create({
        employeeId, type: row.type, category: row.category, amount: carriedCents / 100,
        label: `مرحّل من قيد #${row.id} (مسير ${run.period}): ${row.label}`.slice(0, 300),
        status: suspended ? 'SUSPENDED' : 'PENDING', effectiveDate: next, sourceRequestId: row.sourceRequestId, sourceRef: row.sourceRef,
        createdByUserId: actorUserId, deductionRequestId: row.deductionRequestId ?? null, targetPeriod: nextPeriod, carriedFromObligationId: row.id,
      }))
      carriedIds.push(child.id)
      if (row.deductionRequestId != null) {
        await em.getRepository(DeductionRequestEvent).save({ requestId: row.deductionRequestId, eventType: suspended ? 'CARRY_SUSPENDED' : 'CARRY_FORWARD', actorUserId,
          fromStatus: null, toStatus: null, stepOrder: null,
          reason: suspended ? `تجاوز القسط حد الترحيل (${carryLimit} مرات)؛ عُلّق ${moneyText(carriedCents)} بانتظار قرار الموارد البشرية`
            : `رُحّل ${moneyText(carriedCents)} إلى مسير ${nextPeriod} لحماية الصافي (المرة ${depth})`,
          payload: JSON.stringify({ parentObligationId: row.id, childObligationId: child.id, amount: moneyText(carriedCents), runId: run.id, depth, limit: carryLimit }) })
      }
    }
  }
  return carriedIds
}

/** إعادة فتح المسير المعتمد أو إلغاؤه: يرجع القيد متاحًا لأي مسير. */
export async function releasePayrollObligations(em: EntityManager, runId: number) {
  requireTransaction(em)
  await em.query(`UPDATE [employee_obligations] SET [reservedPayrollRunId]=NULL,[reservedAt]=NULL
    WHERE [reservedPayrollRunId]=@0 AND [status]='PENDING'`, [runId])
}
