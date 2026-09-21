import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { In, IsNull, type EntityManager } from 'typeorm'
import { PayrollApprovalChain, PayrollRunApproval, type PayrollApprovalChainScope, type PayrollChainApproverKind } from './payroll-approval-chain.entities'
import { payrollRunSeriesName } from './payroll-run-membership-moves'

// سلسلة اعتماد المسير — المنطق الصافي وقراءة القاعدة بـEntityManager (بلا خدمة Nest، فتستورده PayrollService بلا دائرة اعتماد).
//
// آلة الحالة (المسير نفسه يفضل CALCULATED طول ما هو طالع السلسلة، فمفيش حالة جديدة تكسر باقي النظام):
//   حساب ← (خطوة 1 تعتمد ← خطوة 2 … ← آخر خطوة تعتمد = الاعتماد النهائي APPROVED بكل فحوصه وحجوزاته في نفس المعاملة)
//   أي خطوة ترفض بسبب ← القرارات السارية تتلغى، والنسخة «مرتجعة لمسؤول الرواتب»؛ مفيش اعتماد عليها تاني، وإعادة الحساب
//   (نسخة جديدة snapshotVersion+1) بتبدأ السلسلة من الأول. القرارات مربوطة بنسخة الحساب، فأي إعادة حساب بتصفّر التقدم تلقائيًا.
//   إعادة فتح مسير معتمد أو إلغاؤه ← القرارات السارية تتلغى (voidPayrollRunApprovals). تغيير السلسلة نفسها والمسير في نصها ←
//   بصمة السلسلة بتتغير فالقرارات القديمة مابتتحسبش، والاعتماد يبدأ من الأول.

export const PAYROLL_CHAIN_MAX_STEPS = 10
export const PAYROLL_CHAIN_MANAGE_PERMISSION = 'payroll.chain_manage'
export const PAYROLL_CHAIN_REASON_LIMITS = Object.freeze({ min: 3, max: 500 })
/** دور «موظف» بيحمله كل الناس؛ خطوة بيه معناها إن أي حد يعتمد المسير. */
export const PAYROLL_CHAIN_FORBIDDEN_ROLES: readonly string[] = ['employee']

export interface PayrollChainStep {
  order: number
  kind: PayrollChainApproverKind
  userId: number | null
  roleCode: string | null
  label: string
}
export interface PayrollChainStepInput { kind?: unknown; userId?: unknown; roleCode?: unknown; label?: unknown }

export interface ResolvedPayrollChain {
  chainId: number
  scope: PayrollApprovalChainScope
  seriesName: string
  revision: number
  steps: PayrollChainStep[]
  hash: string
}

const bad = (code: string, message: string, details: Record<string, unknown> = {}): never => {
  throw new BadRequestException({ code, message, ...details })
}

export const payrollChainDefaultLabel = (index: number, count: number) => index === count - 1 ? 'الاعتماد النهائي' : count > 2 ? `مراجعة ${index + 1}` : 'مراجعة'

/** خطوات السلسلة من الشاشة ← خطوات مرتبة نظيفة. الوجود الفعلي للمستخدم والدور يتحقق منه في الخدمة (القاعدة). */
export function normalizePayrollChainSteps(input: unknown): PayrollChainStep[] {
  if (!Array.isArray(input)) bad('PAYRUN-CHAIN-STEPS', 'ابعت خطوات السلسلة كقائمة مرتبة')
  const rows = input as PayrollChainStepInput[]
  if (rows.length > PAYROLL_CHAIN_MAX_STEPS) bad('PAYRUN-CHAIN-TOO-LONG', `السلسلة بحد أقصى ${PAYROLL_CHAIN_MAX_STEPS} خطوات`)
  const steps = rows.map((row, index): PayrollChainStep => {
    const kind = row?.kind === 'ROLE' ? 'ROLE' : row?.kind === 'USER' ? 'USER' : null
    if (!kind) bad('PAYRUN-CHAIN-STEP-KIND', `الخطوة ${index + 1}: اختار شخص بعينه أو دور`)
    const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : payrollChainDefaultLabel(index, rows.length)
    if (label.length > 100) bad('PAYRUN-CHAIN-STEP-LABEL', `الخطوة ${index + 1}: اسم الخطوة بحد أقصى 100 حرف`)
    if (kind === 'USER') {
      const userId = Number(row.userId)
      if (!Number.isSafeInteger(userId) || userId < 1) bad('PAYRUN-CHAIN-STEP-USER', `الخطوة ${index + 1}: اختار الشخص اللي هيعتمد`)
      return { order: index + 1, kind, userId, roleCode: null, label }
    }
    const roleCode = typeof row.roleCode === 'string' ? row.roleCode.trim() : ''
    if (!roleCode || roleCode.length > 50) bad('PAYRUN-CHAIN-STEP-ROLE', `الخطوة ${index + 1}: اختار الدور اللي هيعتمد`)
    if (PAYROLL_CHAIN_FORBIDDEN_ROLES.includes(roleCode)) bad('PAYRUN-CHAIN-STEP-ROLE-OPEN', `الخطوة ${index + 1}: دور «موظف» بيحمله كل الناس؛ اختار شخص بعينه أو دور إداري`)
    return { order: index + 1, kind: kind!, userId: null, roleCode, label }
  })
  const named = steps.filter(step => step.kind === 'USER').map(step => step.userId)
  if (new Set(named).size !== named.length) bad('PAYRUN-CHAIN-STEP-DUPLICATE', 'نفس الشخص متكرر في خطوتين — محدش بيعتمد خطوتين لنفس المسير')
  return steps
}

/** بصمة هوية المعتمدين بترتيبهم؛ اسم الخطوة برّه البصمة (تغيير الاسم وحده مايصفّرش التقدم). */
export const payrollChainHash = (steps: readonly PayrollChainStep[]) =>
  createHash('sha256').update(JSON.stringify(steps.map(step => [step.order, step.kind, step.userId, step.roleCode]))).digest('hex')

export function parsePayrollChainSteps(raw: string | null | undefined): PayrollChainStep[] {
  if (!raw) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new ConflictException({ code: 'PAYRUN-CHAIN-CORRUPT', message: 'خطوات سلسلة الاعتماد المحفوظة تالفة؛ احفظها من جديد من شاشة «سلسلة اعتماد المسير»' }) }
  if (!Array.isArray(parsed)) return []
  return (parsed as Array<Record<string, unknown>>).map((row, index) => ({ order: index + 1, kind: row.kind === 'ROLE' ? 'ROLE' as const : 'USER' as const,
    userId: row.kind === 'ROLE' ? null : Number(row.userId) || null, roleCode: row.kind === 'ROLE' ? String(row.roleCode ?? '') : null,
    label: typeof row.label === 'string' && row.label ? row.label : payrollChainDefaultLabel(index, (parsed as unknown[]).length) }))
}

const resolved = (row: PayrollApprovalChain, steps: PayrollChainStep[]): ResolvedPayrollChain =>
  ({ chainId: row.id, scope: row.scope, seriesName: row.seriesName, revision: row.revision, steps, hash: payrollChainHash(steps) })

/**
 * السلسلة اللي بتحكم مسير: الخاصة باسمه الدائم لو ليها خطوات، وإلا سلسلة الشركة، وإلا null = الاعتماد بخطوة واحدة (السلوك القديم بالحرف).
 * المفتاح هو اسم المسير الدائم — نفس «سلسلة المسير» اللي العضوية الدائمة ماشية عليها — فمسير الشهر الجديد بنفس الاسم
 * (من «إنشاء مسيرات الشهر الجديد» أو «مسير الشهر التالي» أو «مسير جديد») بياخد نفس السلسلة من غير نسخ.
 */
export async function resolvePayrollRunChain(em: EntityManager, run: { name: string | null }): Promise<ResolvedPayrollChain | null> {
  return (await payrollChainResolver(em))(run)
}

/** مفتاح مطابقة اسم المسير الدائم: مقصوص وبلا فرق حالة أحرف (زي مقارنة القاعدة لاسم المسير). */
export const payrollChainSeriesKey = (name: string | null | undefined) => payrollRunSeriesName(name).toLocaleLowerCase()

/** حل السلسلة لمجموعة مسيرات بقراءة واحدة (الجدول صغير: سلسلة الشركة + سلسلة لكل مسير دائم له سلسلة خاصة). */
export async function payrollChainResolver(em: EntityManager) {
  return buildPayrollChainResolver(await readPayrollChains(em))
}

export async function readPayrollChains(em: EntityManager): Promise<ResolvedPayrollChain[]> {
  const rows = await em.getRepository(PayrollApprovalChain).find({ order: { id: 'ASC' } })
  return rows.map(row => resolved(row, parsePayrollChainSteps(row.steps)))
}

/** الحل نفسه من قائمة سلاسل جاهزة (دالة صافية): يُستخدم أيضًا لمحاكاة أثر حفظ سلسلة قبل كتابتها. السلسلة بلا خطوات = غير موجودة. */
export function buildPayrollChainResolver(chains: readonly ResolvedPayrollChain[]) {
  const usable = chains.filter(chain => chain.steps.length)
  const company = usable.find(chain => chain.scope === 'COMPANY') ?? null
  const bySeries = new Map(usable.filter(chain => chain.scope === 'RUN_SERIES').map(chain => [payrollChainSeriesKey(chain.seriesName), chain]))
  return (run: { name: string | null }): ResolvedPayrollChain | null => {
    const key = payrollChainSeriesKey(run.name)
    return (key ? bySeries.get(key) : undefined) ?? company
  }
}

export type PayrollChainState = 'NONE' | 'INACTIVE' | 'WAITING' | 'RETURNED' | 'COMPLETED'
export interface PayrollChainStepProgress extends PayrollChainStep {
  status: 'APPROVED' | 'CURRENT' | 'PENDING'
  actorUserId: number | null
  decidedAt: Date | null
}
export interface PayrollChainRejection { stepOrder: number; stepLabel: string; reason: string | null; actorUserId: number; decidedAt: Date; snapshotVersion: number }
export interface PayrollChainProgress {
  state: PayrollChainState
  steps: PayrollChainStepProgress[]
  currentStep: PayrollChainStepProgress | null
  /** رفض ساري على نسخة الحساب الحالية: المسير مرتجع لمسؤول الرواتب لحد ما يعيد الحساب */
  rejection: PayrollChainRejection | null
  actedUserIds: number[]
}

/**
 * تقدم السلسلة من قرارات المسير (دالة صافية). القرارات المحسوبة: غير الملغاة، لنسخة الحساب الحالية.
 * مسير محسوب: ببصمة السلسلة الحالية بس. مسير معتمد/مصروف: الخطوات من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة بعدها).
 */
export function payrollChainProgress(input: {
  run: { status: string; snapshotVersion: number }
  chain: ResolvedPayrollChain | null
  approvals: ReadonlyArray<Pick<PayrollRunApproval, 'snapshotVersion' | 'chainHash' | 'stepOrder' | 'stepCount' | 'stepLabel' | 'approverKind' | 'approverRoleCode'
    | 'decision' | 'reason' | 'actorUserId' | 'decidedAt' | 'voidedAt'>>
}): PayrollChainProgress {
  const { run, chain } = input
  const live = input.approvals.filter(row => row.voidedAt == null && row.snapshotVersion === run.snapshotVersion)
  if (run.status === 'APPROVED' || run.status === 'PAID') {
    const approved = live.filter(row => row.decision === 'APPROVED').sort((a, b) => a.stepOrder - b.stepOrder)
    if (!approved.length) return { state: 'NONE', steps: [], currentStep: null, rejection: null, actedUserIds: [] }
    const steps = approved.map((row): PayrollChainStepProgress => ({ order: row.stepOrder, kind: row.approverKind, userId: row.approverKind === 'USER' ? row.actorUserId : null,
      roleCode: row.approverRoleCode, label: row.stepLabel, status: 'APPROVED', actorUserId: row.actorUserId, decidedAt: row.decidedAt }))
    return { state: 'COMPLETED', steps, currentStep: null, rejection: null, actedUserIds: approved.map(row => row.actorUserId) }
  }
  if (!chain) return { state: 'NONE', steps: [], currentStep: null, rejection: null, actedUserIds: [] }
  // الرفض يحجب نسخة الحساب مهما اتغيرت السلسلة بعده (تغيير السلسلة مايمسحش سبب الرفض)؛ الاعتمادات تُحسب ببصمة السلسلة الحالية بس
  const rejected = run.status === 'CALCULATED' ? live.filter(row => row.decision === 'REJECTED').sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime())[0] ?? null : null
  const approvedBy = new Map(live.filter(row => row.decision === 'APPROVED' && row.chainHash === chain.hash).map(row => [row.stepOrder, row]))
  // الخطوات بالترتيب: أول خطوة مش معتمدة هي الحالية؛ أي قرار بعدها (مايحصلش تحت القفل) مابيتحسبش
  let waitingOrder: number | null = null
  const steps = chain.steps.map((step): PayrollChainStepProgress => {
    const row = waitingOrder === null ? approvedBy.get(step.order) : undefined
    if (!row && waitingOrder === null) waitingOrder = step.order
    return { ...step, status: row ? 'APPROVED' : step.order === waitingOrder ? 'CURRENT' : 'PENDING', actorUserId: row?.actorUserId ?? null, decidedAt: row?.decidedAt ?? null }
  })
  const acted = steps.filter(step => step.status === 'APPROVED').map(step => step.actorUserId!)
  if (run.status !== 'CALCULATED') {
    return { state: 'INACTIVE', steps: steps.map(step => ({ ...step, status: 'PENDING' as const, actorUserId: null, decidedAt: null })), currentStep: null, rejection: null, actedUserIds: [] }
  }
  if (rejected) {
    return { state: 'RETURNED', steps: steps.map(step => ({ ...step, status: 'PENDING' as const, actorUserId: null, decidedAt: null })), currentStep: null, actedUserIds: [],
      rejection: { stepOrder: rejected.stepOrder, stepLabel: rejected.stepLabel, reason: rejected.reason, actorUserId: rejected.actorUserId, decidedAt: rejected.decidedAt, snapshotVersion: rejected.snapshotVersion } }
  }
  return { state: 'WAITING', steps, currentStep: steps.find(step => step.status === 'CURRENT') ?? null, rejection: null, actedUserIds: acted }
}

/** هل الخطوة دي بتاعة المستخدم ده؟ شخص بعينه = رقمه، دور = كود دوره في التوكن. */
export const payrollChainStepMatchesUser = (step: Pick<PayrollChainStep, 'kind' | 'userId' | 'roleCode'>, user: { sub: number; role: string }) =>
  step.kind === 'USER' ? step.userId === user.sub : !!step.roleCode && step.roleCode === user.role

export function payrollChainReason(value: unknown): string {
  const reason = typeof value === 'string' ? value.trim() : ''
  if (reason.length < PAYROLL_CHAIN_REASON_LIMITS.min || reason.length > PAYROLL_CHAIN_REASON_LIMITS.max) {
    bad('PAYRUN-CHAIN-REJECT-REASON', `اكتب سبب الرفض (من ${PAYROLL_CHAIN_REASON_LIMITS.min} إلى ${PAYROLL_CHAIN_REASON_LIMITS.max} حرف) عشان مسؤول الرواتب يعرف يصحح إيه`)
  }
  return reason
}

export const readPayrollRunApprovals = (em: EntityManager, runIds: number[]) =>
  runIds.length ? em.getRepository(PayrollRunApproval).find({ where: { runId: In(runIds) }, order: { id: 'ASC' } }) : Promise.resolve([] as PayrollRunApproval[])

/**
 * إلغاء القرارات السارية على مسير (بلا حذف). يرجّع عدد القرارات اللي اتلغت (لحدث المسير).
 * - REOPENED / CANCELLED / RECALCULATED: كل القرارات السارية (إعادة فتح المسير المعتمد، أو إلغاؤه، أو إعادة حسابه بنسخة جديدة)
 *   فالاعتماد الجاي يبدأ من الخطوة الأولى. (القرارات أصلًا مربوطة بنسخة الحساب فإعادة الحساب بتصفّر التقدم حتى بلا الإلغاء الصريح.)
 * - REJECTED: اعتمادات نسخة الحساب دي (الرفض نفسه بيتسجل بعدها ساريًا).
 * - CHAIN_CHANGED: اعتمادات نسخة الحساب ببصمة سلسلة غير الحالية (exceptHash) — الرفض الساري مايتلغيش بتغيير السلسلة.
 */
export async function voidPayrollRunApprovals(em: EntityManager, runId: number, voidReason: 'REJECTED' | 'REOPENED' | 'CANCELLED' | 'RECALCULATED' | 'CHAIN_CHANGED',
  only?: { snapshotVersion: number; exceptHash?: string }): Promise<number> {
  const repo = em.getRepository(PayrollRunApproval)
  const rows = (await repo.find({ where: { runId, voidedAt: IsNull(), ...(only ? { snapshotVersion: only.snapshotVersion } : {}) } }))
    .filter(row => voidReason !== 'CHAIN_CHANGED' || (row.decision === 'APPROVED' && row.chainHash !== only?.exceptHash))
  if (!rows.length) return 0
  await repo.update({ id: In(rows.map(row => row.id)) }, { voidedAt: new Date(), voidReason })
  return rows.length
}

/**
 * حارس نقطة «اعتماد المسير» القديمة: مسير تحكمه سلسلة لا يُعتمد بخطوة واحدة (صلاحية payroll.approve وحدها لا تتخطى السلسلة).
 * بلا سلسلة = لا مانع، والسلوك القديم كما هو.
 */
export async function assertPayrollRunHasNoChain(em: EntityManager, run: { name: string | null }) {
  const chain = await resolvePayrollRunChain(em, run)
  if (!chain) return
  throw new ConflictException({ code: 'PAYRUN-CHAIN-ACTIVE', chainSteps: chain.steps.length,
    message: `المسير ده ماشي بسلسلة اعتماد من ${chain.steps.length} خطوات — كل معتمد بيعتمد خطوته من «اعتمد خطوتي»، وآخر خطوة هي الاعتماد النهائي` })
}
