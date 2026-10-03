import { createHmac, randomBytes } from 'node:crypto'
import { In, type EntityManager } from 'typeorm'
import { branchScopeOf, inBranchScope, type BranchScope } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { PayrollRunMember } from './payroll.entities'
import { PAYROLL_REVERSAL_LINES_TABLE } from './payroll-reversal-sql'

// CR34-B01: مراجع المسير في حمولة حدث (أي مفتاح runId أو ينتهي بـRunId وقيمته رقم، في أي عمق)
const RUN_REF_KEY = /^runId$|RunId$/
export function payloadRunIds(payload: unknown, out: number[] = []): number[] {
  if (Array.isArray(payload)) for (const value of payload) payloadRunIds(value, out)
  else if (payload && typeof payload === 'object' && !(payload instanceof Date)) {
    for (const [key, value] of Object.entries(payload)) RUN_REF_KEY.test(key) && typeof value === 'number' ? out.push(value) : payloadRunIds(value, out)
  }
  return out
}

/** نسخة من الحمولة: مرجع المسير المخفي = null، ولو فيه مرجع اتخفى مراجع الإعفاء (exemptionId) كمان. hidden = اتخفى حاجة */
export function maskPayloadRunRefs<T>(payload: T, visible: (runId: number) => boolean): { payload: T; hidden: boolean } {
  let hidden = false
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object' || value instanceof Date) return value
    const copy: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (RUN_REF_KEY.test(key) && typeof item === 'number' && !visible(item)) { copy[key] = null; hidden = true } else copy[key] = walk(item)
    }
    return copy
  }
  const masked = walk(payload) as T
  if (hidden && masked && typeof masked === 'object' && !Array.isArray(masked) && 'exemptionId' in (masked as Record<string, unknown>)) (masked as Record<string, unknown>).exemptionId = null
  return { payload: masked, hidden }
}

/** CR38-B02: الوصف العام لمسير مخفي في نص («عكس صرف مسير 2026-08» ← «عكس صرف مسير خارج نطاق صلاحيتك») */
export const HIDDEN_RUN_TEXT = 'مسير خارج نطاق صلاحيتك'

// «مسير YYYY-MM» أو قايمة فترات بعد كلمة «مسير» («عكس خصم #3 — مسير 2026-07، 2026-08»)
const RUN_PERIOD_TEXT = /مسير (\d{4}-\d{2}(?:، \d{4}-\d{2})*)/g

/**
 * CR38-B02: «مسير YYYY-MM» لفترة مسير مخفي بيبقى الوصف العام. تاريخ العمل والشهر المستهدف من غير كلمة «مسير» قبلهم مابيتلمسوش.
 * CR40: في القايمة («مسير 2026-07، 2026-08») كل فترة مخفية بتتشال، والمرئي يفضل والوصف العام بعده.
 */
export function scrubRunPeriods(text: string | null | undefined, hiddenPeriods: Iterable<string | null | undefined> = []): string | null {
  if (text == null) return null
  const hidden = new Set([...hiddenPeriods].filter((period): period is string => typeof period === 'string' && /^\d{4}-\d{2}$/.test(period)))
  if (!hidden.size) return text
  return text.replace(RUN_PERIOD_TEXT, (match, list: string) => {
    const periods = list.split('، ')
    if (!periods.some(period => hidden.has(period))) return match
    const shown = periods.filter(period => !hidden.has(period))
    return shown.length ? `مسير ${shown.join('، ')}، ${HIDDEN_RUN_TEXT}` : HIDDEN_RUN_TEXT
  })
}

/**
 * نص الحدث اللي مسيره مخفي: من غير «#رقم» (رقم إعفاء أو قيد أو مسير من الفرع التاني) ولا القوسين اللي فضيوا بعده،
 * ومن غير فترة المسير المخفي (CR38-B02 — hiddenPeriods = فترات المسيرات المخفية اللي الحدث بيشاور عليها)
 */
export const scrubEventReferences = (text: string | null | undefined, hiddenPeriods: Iterable<string | null | undefined> = []): string | null =>
  text == null ? null : (scrubRunPeriods(text, hiddenPeriods) as string).replace(/\s*#\d+/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim()

/** CR38-B02: فترة كل مسير (رقمه ← YYYY-MM) — لحجب فترة المسير المخفي في النصوص */
export async function payrollRunPeriods(em: EntityManager, runIds: Iterable<number | null | undefined>): Promise<Map<number, string>> {
  const ids = [...new Set([...runIds].filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  const periods = new Map<number, string>()
  for (let offset = 0; offset < ids.length; offset += 500) {
    const rows: Array<{ id: number; period: string }> = await em.query(`SELECT [id], [period] FROM [payroll_runs] WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`,
      [JSON.stringify(ids.slice(offset, offset + 500))])
    for (const row of rows) periods.set(Number(row.id), String(row.period))
  }
  return periods
}

/**
 * CR38-B02 (مسح الصنف): فترات المسيرات المخفية للحساب لكل موظف — كل مسير الموظف عضو فيه أو ليه بند فيه أو سطر عكس، والحساب مايشوفهوش
 * لموظفه. لنصوص من غير مراجع مسير منظمة (اسم قيد الدفتر: «مرحّل من قيد … (مسير 2026-08)»، «مؤجَّل من مسير …»، «إعادة قيد … بعد عكس صرف مسير …»).
 * فترة فيها مسير مرئي ومسير مخفي للموظف بتتحجب (الأأمن). scope = null (الشركة) = مفيش حجب.
 */
export async function hiddenRunPeriodsByEmployee(em: EntityManager, scope: BranchScope, employeeIds: Iterable<number | null | undefined>,
  selfEmployeeId: number | null = null): Promise<Map<number, Set<string>>> {
  const result = new Map<number, Set<string>>()
  if (scope === null) return result
  const people = [...new Set([...employeeIds].filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))].filter(id => id !== selfEmployeeId)
  if (!people.length) return result
  const pairs: Array<{ runId: number; employeeId: number }> = []
  for (let offset = 0; offset < people.length; offset += 500) {
    pairs.push(...await em.query(`SELECT DISTINCT x.[runId], x.[employeeId] FROM (
        SELECT [runId], [employeeId] FROM [payroll_run_members]
        UNION SELECT [runId], [employeeId] FROM [payroll_items]
        UNION SELECT [reversalRunId] AS [runId], [employeeId] FROM [${PAYROLL_REVERSAL_LINES_TABLE}]
      ) x WHERE x.[employeeId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(people.slice(offset, offset + 500))]))
  }
  if (!pairs.length) return result
  const shown = await payrollRunRefVisibility(em, scope, pairs.map(pair => Number(pair.runId)), people, selfEmployeeId)
  const periods = await payrollRunPeriods(em, pairs.map(pair => Number(pair.runId)))
  for (const pair of pairs) {
    const runId = Number(pair.runId), employeeId = Number(pair.employeeId), period = periods.get(runId)
    if (!period || shown(runId, employeeId)) continue
    if (!result.has(employeeId)) result.set(employeeId, new Set())
    result.get(employeeId)!.add(period)
  }
  return result
}

/**
 * CR40-B02: اتحاد الفترات المخفية للحساب لكل الموظفين — للرد اللي فيه صفوف كتير وأعمدة مشتركة (جدول المسير، سطور الشهر، مراجعة الاعتماد،
 * بنود المسير): المفتاح الواحد بيتحجب بنفس الشكل في كل الصفوف والأعمدة (الأأمن). viewer = null (داخلي) أو الشركة = فاضي
 */
export async function hiddenRunPeriodsUnion(em: EntityManager, viewer: JwtPayload | null, employeeIds: Iterable<number | null | undefined>): Promise<Set<string>> {
  if (!viewer) return new Set()
  const byEmployee = await hiddenRunPeriodsByEmployee(em, branchScopeOf(viewer), employeeIds, viewer.employeeId ?? null)
  return new Set([...byEmployee.values()].flatMap(periods => [...periods]))
}

// CR32-B01 وCR33-B01 (مراجعة Codex الجولتين 32 و33): مرجع مسير (رقمه أو اسمه أو حالته) في رد أو رسالة رفض أو عرض لحساب فرع بيظهر بس لو
// الموظف المعني عضو في المسير بلقطة فرع من نطاق الحساب — أو مسير قديم من غير أعضاء خالص على فرع من نطاقه. فالمسير اللي اتعمل في فرع
// تاني بعد نقل الموظف (حتى لو شايل قيد مختوم بفرع الحساب) مابيظهرش، زي قايمة المسيرات وقراءته. الموظف نفسه بيشوف مسيراته (قسيمته)،
// وحساب الشركة بيشوف الكل. نفس قاعدة «شيل خصم» (payroll-overview.service → runsInScope).
export async function payrollRunRefVisibility(em: EntityManager, scope: BranchScope, runIds: readonly (number | null | undefined)[],
  employeeIds: readonly (number | null | undefined)[], selfEmployeeId: number | null = null): Promise<(runId: number | null | undefined, employeeId: number) => boolean> {
  if (scope === null) return runId => runId != null
  const ids = [...new Set(runIds.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  const people = [...new Set(employeeIds.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
  const visible = new Set<string>(), withMembers = new Set<number>(), runBranch = new Map<number, number | null>(), parentOf = new Map<number, number>()
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500)
    const runs: Array<{ id: number; branchId: number | null; hasMembers: number; runType: string | null; parentRunId: number | null }> = await em.query(`SELECT r.[id], r.[branchId],
        CASE WHEN EXISTS (SELECT 1 FROM [payroll_run_members] m WHERE m.[runId] = r.[id]) THEN 1 ELSE 0 END AS [hasMembers], r.[runType], r.[parentRunId]
      FROM [payroll_runs] r WHERE r.[id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(chunk)])
    for (const run of runs) {
      if (Number(run.hasMembers)) withMembers.add(Number(run.id))
      runBranch.set(Number(run.id), run.branchId == null ? null : Number(run.branchId))
      // CR35-N01: مسير العكس من غير أعضاء بيتحكم بمسيره الأصلي (نفس assertRunAccess)
      if (run.runType === 'REVERSAL' && run.parentRunId != null && !Number(run.hasMembers) && Number(run.parentRunId) !== Number(run.id)) parentOf.set(Number(run.id), Number(run.parentRunId))
    }
    for (let start = 0; start < people.length; start += 500) {
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId: In(chunk), employeeId: In(people.slice(start, start + 500)) },
        select: { id: true, runId: true, employeeId: true, snapshot: true } })
      for (const member of members) {
        const branchId = member.snapshot?.branchId
        if (branchId != null && inBranchScope(scope, Number(branchId))) visible.add(`${member.runId}:${member.employeeId}`)
      }
    }
  }
  const own = (runId: number, employeeId: number) => visible.has(`${runId}:${employeeId}`) ||
    (!withMembers.has(runId) && runBranch.get(runId) != null && inBranchScope(scope, runBranch.get(runId)!))
  // أصول مسيرات العكس: بنفس القاعدة (العكس مابيتعكسش، فمستوى واحد)
  const parents = [...new Set(parentOf.values())]
  const parentShown = parents.length ? await payrollRunRefVisibility(em, scope, parents, people, selfEmployeeId) : null
  return (runId, employeeId) => runId != null && (
    (selfEmployeeId != null && employeeId === selfEmployeeId) ||
    (parentOf.has(runId) ? !!parentShown && parentShown(parentOf.get(runId)!, employeeId) : own(runId, employeeId)))
}

/**
 * CR36-B01: صفوف خام (قيد دفتر، سجل إضافي، …) فيها مراجع مسير (runId أو *RunId في أي عمق) — المرجع المخفي للحساب لموظف الصف بيبقى
 * null. الصف من غير مرجع مخفي بيرجع زي ما هو بالظبط، والتواريخ والمبالغ مابتتلمسش. viewer = null (داخلي) = من غير حجب
 */
export async function scopeRunRefRows<T extends object>(em: EntityManager, viewer: JwtPayload | null, rows: readonly T[], employeeIdOf: (row: T) => number): Promise<T[]> {
  if (!viewer || !rows.length) return [...rows]
  const refs = rows.map(row => payloadRunIds(row))
  // CR38-B02 (مسح الصنف): نص الصف (اسم القيد: «مرحّل من قيد … (مسير 2026-08)»، «مؤجَّل من مسير …») من غير فترة أي مسير مخفي للحساب لموظف الصف
  const periods = await hiddenRunPeriodsByEmployee(em, branchScopeOf(viewer), rows.map(employeeIdOf), viewer.employeeId ?? null)
  const shown = refs.some(ids => ids.length) ? await payrollRunRefVisibility(em, branchScopeOf(viewer), refs.flat(), rows.map(employeeIdOf), viewer.employeeId ?? null) : null
  return rows.map((row, index) => {
    const masked = shown && refs[index].length ? maskPayloadRunRefs(row, runId => shown(runId, employeeIdOf(row))) : { payload: row, hidden: false }
    const hiddenPeriods = periods.get(employeeIdOf(row))
    if (!hiddenPeriods?.size) return masked.hidden ? masked.payload : row
    return scrubRunPeriodsDeep(masked.payload, hiddenPeriods)
  })
}

/** CR38-B02 وCR39-B01: حقول النص اللي ممكن تحمل «مسير YYYY-MM» (اسم القيد، السبب، الملاحظة، واسم سطر القسيمة) في صفوف الدفتر والقسيمة وسجلات الإضافي */
const RUN_PERIOD_TEXT_KEYS = new Set(['label', 'reason', 'note', 'notes', 'description', 'name'])

// CR40-B01: بصمة المفتاح المحجوب HMAC بسر الخادم، مش hash علني للنص الأصلي: اللي معاه الرد بس مايقدرش يجرّب الشهور ويطابق البصمة.
// السر مشتق من JWT_SECRET (الإقلاع مابيتمش من غيره) بغرض منفصل، فالبصمة ثابتة بين القراءات وإعادة التشغيل. من غيره: سر عشوائي للعملية.
let lineKeySecret: Buffer | null = null
function lineKeyFingerprint(key: string): string {
  if (!lineKeySecret) lineKeySecret = createHmac('sha256', process.env.JWT_SECRET || randomBytes(32)).update('hr-system/payroll-run-line-key/v1').digest()
  return createHmac('sha256', lineKeySecret).update(key, 'utf8').digest('hex').slice(0, 16)
}

/**
 * CR39-B01: مفتاح سطر القسيمة أو عمود جدول المسير («ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: …»): نفس الحجب + بصمة من المفتاح الأصلي،
 * عشان مفتاحين مختلفين مايبقوش واحد بعد الحجب، ونفس المفتاح يفضل مطابق بين الصف والعمود وبين المسارات. المفتاح من غير فترة مخفية زي ما هو.
 * CR40-B01: البصمة معتمة (HMAC بسر الخادم) — مابتثبتش صحة تخمين للفترة المحجوبة.
 */
export function scrubRunLineKey(key: string, hiddenPeriods: Iterable<string | null | undefined>): string {
  const scrubbed = scrubRunPeriods(key, hiddenPeriods) as string
  return scrubbed === key ? key : `${scrubbed}~${lineKeyFingerprint(key)}`
}

/** CR38-B02: نسخة من القيمة (أي عمق) حقول نصها (ومفاتيح السطور) من غير فترة أي مسير مخفي — التواريخ والمبالغ والأرقام زي ما هي */
export function scrubRunPeriodsDeep<T>(value: T, hiddenPeriods: ReadonlySet<string> | undefined): T {
  if (!hiddenPeriods?.size) return value
  const walk = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(walk)
    if (!item || typeof item !== 'object' || item instanceof Date) return item
    const copy: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(item)) {
      copy[key] = typeof field === 'string' && RUN_PERIOD_TEXT_KEYS.has(key) ? scrubRunPeriods(field, hiddenPeriods)
        : typeof field === 'string' && key === 'key' ? scrubRunLineKey(field, hiddenPeriods) : walk(field)
    }
    return copy
  }
  return walk(value) as T
}

/** مانع فيه مرجع مسير في تفاصيله (runId أو *RunId) ونص بديل من غير المرجع (redactedMessage) */
export interface PayrollRunRefBlocker { employeeId: number; message: string; details?: Record<string, unknown>; redactedMessage?: string }

/**
 * CR35-B01: موانع (عكس الصرف) للحساب ده — مرجع المسير اللي مش مرئي له لموظف المانع بيبقى null، والنص بيتبدل بالنص البديل اللي من غير
 * رقم المسير وحالته. المرئي زي ما هو. النص البديل نفسه مابيطلعش في الرد. viewer = null (داخلي) = من غير حجب
 */
export async function scopePayrollRunRefBlockers<T extends PayrollRunRefBlocker>(em: EntityManager, viewer: JwtPayload | null, blockers: readonly T[]): Promise<Array<Omit<T, 'redactedMessage'>>> {
  const strip = (blocker: T): Omit<T, 'redactedMessage'> => { const { redactedMessage: _redacted, ...rest } = blocker; return rest }
  const refs = blockers.map(blocker => payloadRunIds(blocker.details ?? null))
  if (!viewer || !refs.some(ids => ids.length)) return blockers.map(strip)
  const shown = await payrollRunRefVisibility(em, branchScopeOf(viewer), refs.flat(), blockers.map(blocker => blocker.employeeId), viewer.employeeId ?? null)
  return blockers.map(blocker => {
    const { payload: details, hidden } = maskPayloadRunRefs(blocker.details ?? null, runId => shown(runId, blocker.employeeId))
    if (!hidden) return strip(blocker)
    return { ...strip(blocker), message: blocker.redactedMessage ?? scrubEventReferences(blocker.message) ?? '', details: details ?? {} }
  })
}
