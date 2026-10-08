import { HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { definitionBranchWhere } from '../common/definition-branch'
import type { ModuleKey } from '../modules-registry/registry'
import { ModulesService } from '../modules-registry/modules.service'
import { BONUS_SELECTION_MODES } from '../payroll/bonuses'
import { BonusBulkPreviewDto, BonusBulkSubmitDto } from '../payroll/bonuses.dto'
import { BonusesService } from '../payroll/bonuses.service'
import { hasHrOverride } from '../requests/approver-resolver.service'
import { LeaveType } from '../requests/entities/leave.entities'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { RequestsService } from '../requests/requests.service'
import { AI_SUGGESTION_NOT_FOUND, AI_UNAVAILABLE_DATA } from './ai-rules'
import type { LlmToolDef } from './llm-provider'

// B6.7: مساعد التنفيذ — أدوات الاقتراح. الأداة بتبني معاينة بهوية السائل من دوال المعاينة القايمة ومابتكتبش؛
// والتنفيذ (بعد تأكيد المستخدم بزرار) بينادي دالة مسار الشاشة نفسها: نفس الصلاحيات والنطاق والسقوف وسلسلة الاعتماد.

export interface ProposalView {
  kind: 'BONUS_BULK' | 'LEAVE_REQUEST'
  title: string
  details: Array<{ label: string; value: string }>
  /** صف لكل موظف في المعاينة: مبلغه وحالته وسلسلة اعتماده */
  rows: Array<{ name: string; code: string | null; amount: string | null; ready: boolean; note: string | null; chain: string[] }>
  total: string | null
  /** تنبيه ظاهر فوق زرار التأكيد (زي: هتتعتمد فورًا) */
  notice: string | null
}
export type AiProposal =
  | { kind: 'BONUS_BULK'; dto: { bonusTypeId: number; inputValue: string; reason: string; targetPeriod: string; selection: { mode: string; ids: number[] } }; previewHash: string; view: ProposalView }
  | { kind: 'LEAVE_REQUEST'; dto: { leaveTypeCode: string; fromDate: string; toDate: string; days: number; reason?: string }; view: ProposalView }
interface Built { result: unknown; proposal: AiProposal | null }

const text = (value: unknown, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : typeof value === 'number' && Number.isFinite(value) ? String(value) : '')
const lower = (value: unknown) => text(value).toLowerCase()
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/
const needs = (missing: string, options: string[] = []): Built => ({ result: { status: 'NEEDS_INPUT', missing, options: options.slice(0, 12) }, proposal: null })
const unavailable = (): Built => ({ result: AI_UNAVAILABLE_DATA, proposal: null })
/** نفس فحص شكل المدخلات اللي المسار بيعمله (ValidationPipe) قبل نداء دالته */
function shaped<T extends object>(dto: new () => T, plain: object): T {
  const instance = plainToInstance(dto, plain)
  const issue = validateSync(instance, { whitelist: true })[0]
  if (issue) throw new HttpException(Object.values(issue.constraints ?? issue.children?.[0]?.constraints ?? { shape: 'مدخلات غير صالحة' })[0], 400)
  return instance
}
const TARGET_LABELS: Record<string, string> = { EMPLOYEES: 'موظفين', TEAM: 'فريق', DEPARTMENT: 'قسم', BRANCH: 'فرع' }

@Injectable()
export class AiProposalsService {
  private readonly tools: Array<{ def: LlmToolDef; module: ModuleKey; needsFile: boolean; build(user: JwtPayload, input: Record<string, unknown>): Promise<Built> }>

  constructor(private readonly modules: ModulesService, private readonly bonuses: BonusesService, private readonly requests: RequestsService, private readonly balances: LeaveBalancesService,
    @InjectRepository(LeaveType) private readonly leaveTypes: Repository<LeaveType>) {
    this.tools = [
      { module: 'payroll', needsFile: false, build: (user, input) => this.bonus(user, input), def: { name: 'propose_bonus',
        description: 'بتجهّز معاينة مكافأة لموظفين أو فريق أو قسم أو فرع (مابتنفّذش): الأسماء والمبلغ لكل واحد والإجمالي وسلسلة الاعتماد. المستخدم هو اللي بيأكد بعدها.',
        inputSchema: { type: 'object', additionalProperties: false, required: ['amount', 'targetKind', 'targetNames', 'reason'], properties: {
          bonusType: { type: 'string', description: 'اسم نوع المكافأة لو المستخدم ذكره' },
          amount: { type: 'string', description: 'القيمة زي ما المستخدم قالها (رقم)' },
          targetKind: { type: 'string', enum: [...BONUS_SELECTION_MODES], description: 'موظفين بالاسم، أو فريق، أو قسم، أو فرع' },
          targetNames: { type: 'array', items: { type: 'string' }, description: 'اسم الفريق/القسم/الفرع، أو أسماء الموظفين أو أكوادهم' },
          reason: { type: 'string', description: 'سبب المكافأة بكلام المستخدم' },
          targetPeriod: { type: 'string', description: 'الشهر المستهدف YYYY-MM لو المستخدم حدده' } } } } },
      { module: 'leave', needsFile: true, build: (user, input) => this.leave(user, input), def: { name: 'propose_leave_request',
        description: 'بتجهّز معاينة طلب إجازة للمستخدم نفسه (مابتنفّذش). المستخدم هو اللي بيأكد بعدها والطلب بيدخل سلسلة اعتماده.',
        inputSchema: { type: 'object', additionalProperties: false, required: ['fromDate', 'toDate'], properties: {
          leaveType: { type: 'string', description: 'اسم نوع الإجازة لو المستخدم ذكره (سنوية، مرضية…)' },
          fromDate: { type: 'string', description: 'أول يوم YYYY-MM-DD' }, toDate: { type: 'string', description: 'آخر يوم YYYY-MM-DD' },
          reason: { type: 'string', description: 'السبب لو المستخدم ذكره' } } } } },
    ]
  }

  /** أدوات الاقتراح المتاحة للمستخدم: موديولها مفعّل له (وطلب الإجازة لحساب له ملف موظف) */
  async available(user: JwtPayload): Promise<LlmToolDef[]> {
    const defs: LlmToolDef[] = []
    for (const tool of this.tools) if ((!tool.needsFile || user.employeeId) && await this.modules.allowedFor(tool.module, user)) defs.push(tool.def)
    return defs
  }

  /** بناء معاينة من نداء النموذج. رفض الخدمة بشكل المدخلات (400) بيرجع للنموذج برسالته عشان يسأل المستخدم؛ وأي رفض تاني = «مش متاح». */
  async build(user: JwtPayload, name: string, input: Record<string, unknown>): Promise<Built> {
    const tool = this.tools.find(candidate => candidate.def.name === name)
    if (!tool || (tool.needsFile && !user.employeeId) || !(await this.modules.allowedFor(tool.module, user))) return unavailable()
    try {
      return await tool.build(user, input && typeof input === 'object' ? input : {})
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 400) return { result: { status: 'REFUSED', message: String(error.message).slice(0, 300) }, proposal: null }
      return unavailable()
    }
  }

  /** الاقتراح المحفوظ في السجل ← كائن (التالف = مفيش اقتراح) */
  parse(stored: string): AiProposal | null {
    try {
      const parsed = JSON.parse(stored) as AiProposal
      return parsed && (parsed.kind === 'BONUS_BULK' || parsed.kind === 'LEAVE_REQUEST') && parsed.dto && typeof parsed.dto === 'object' ? parsed : null
    } catch { return null }
  }

  /** التنفيذ بعد تأكيد المستخدم: دالة مسار الشاشة نفسها بهويته. الموديول بيتراجع تاني (ممكن يكون اتقفل بعد المعاينة). */
  async execute(user: JwtPayload, proposal: AiProposal) {
    if (proposal.kind === 'BONUS_BULK') {
      if (!(await this.modules.allowedFor('payroll', user))) throw new NotFoundException(AI_SUGGESTION_NOT_FOUND)
      // نفس `POST /bonuses/bulk`: ببصمة المعاينة — لو حاجة اتغيّرت الخدمة بترفض ومفيش مكافأة بتتعمل
      const done = await this.bonuses.bulkSubmit(user, shaped(BonusBulkSubmitDto, { ...proposal.dto, previewHash: proposal.previewHash }))
      return { kind: proposal.kind, batchId: done.batchId, created: done.created.length, skipped: done.skipped.length, totalAmount: done.totals.totalAmount,
        statuses: [...new Set(done.created.map(row => row.status))] }
    }
    if (!user.employeeId || !(await this.modules.allowedFor('leave', user))) throw new NotFoundException(AI_SUGGESTION_NOT_FOUND)
    // نفس `POST /requests` بإرسال: التحقق كله (الرصيد، التعارض، المرفقات) والسلسلة من المحرك
    const made = await this.requests.create(user, { typeCode: 'LEAVE', payload: { ...proposal.dto }, submit: true }) as unknown as { id: number; status: string }
    return { kind: proposal.kind, requestId: made.id, status: made.status }
  }

  // ===== المكافأة =====
  private async bonus(user: JwtPayload, input: Record<string, unknown>): Promise<Built> {
    const amount = text(input.amount, 30), reason = text(input.reason, 1000), kind = text(input.targetKind).toUpperCase()
    const names = (Array.isArray(input.targetNames) ? input.targetNames : [input.targetNames]).map(name => lower(name)).filter(name => name.length >= 2).slice(0, 30)
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount)) return needs('قيمة المكافأة (رقم)')
    if (!(BONUS_SELECTION_MODES as readonly string[]).includes(kind) || !names.length) return needs('المكافأة لمين (اسم الفريق أو القسم أو الفرع أو الموظفين)')
    if (!reason) return needs('سبب المكافأة')
    // الأنواع اللي المستخدم يقدر يقترحها — من غيرها مفيش حاجة يجهّزها
    const creatable = await this.bonuses.creatable(user)
    if (!creatable.types.length) return unavailable()
    const wanted = lower(input.bonusType)
    const matched = wanted ? creatable.types.filter(type => String(type.nameAr ?? '').toLowerCase().includes(wanted) || String(type.code ?? '').toLowerCase() === wanted) : creatable.types
    if (matched.length !== 1) return needs('نوع المكافأة', (matched.length ? matched : creatable.types).map(type => String(type.nameAr)))
    const type = matched[0]
    // الأسماء ← أرقام من مرشحي المستخدم لنوع المكافأة ده بس (اللي برّه نطاقه مش فيهم: نفس رد اللي مش موجود)
    const candidates = await this.bonuses.candidates(user, type.id)
    const ids = new Set<number>()
    for (const name of names) {
      const found = new Map<number, string>()
      for (const row of candidates) {
        if (kind === 'TEAM' && row.teamId && String(row.teamName ?? '').toLowerCase().includes(name)) found.set(row.teamId, String(row.teamName))
        else if (kind === 'DEPARTMENT' && row.departmentId && String(row.departmentName ?? '').toLowerCase().includes(name)) found.set(row.departmentId, String(row.departmentName))
        else if (kind === 'BRANCH' && String(row.branchName ?? '').toLowerCase().includes(name)) found.set(row.branchId, String(row.branchName))
        else if (kind === 'EMPLOYEES' && (row.fullName.toLowerCase().includes(name) || String(row.employeeCode ?? '').toLowerCase() === name)) found.set(row.id, row.fullName)
      }
      if (!found.size) return unavailable()
      if (found.size > 1) return needs(`الاسم بالظبط (أكتر من ${TARGET_LABELS[kind]} بالاسم ده)`, [...found.values()])
      ids.add([...found.keys()][0])
    }
    const period = text(input.targetPeriod)
    const dto = { bonusTypeId: type.id, inputValue: amount, reason, targetPeriod: PERIOD.test(period) ? period : creatable.currentPeriod, selection: { mode: kind, ids: [...ids].sort((a, b) => a - b) } }
    // نفس `POST /bonuses/preview`
    const preview = await this.bonuses.preview(user, shaped(BonusBulkPreviewDto, dto))
    if (!preview.totals.ready) return { result: { status: 'NOTHING_READY', reasons: [...new Set(preview.rows.map(row => row.message).filter(Boolean))].slice(0, 5) }, proposal: null }
    const instant = hasHrOverride(user), skipped = preview.totals.candidates - preview.totals.ready
    const view: ProposalView = { kind: 'BONUS_BULK', title: `مكافأة «${type.nameAr}» لـ${preview.totals.ready} موظف`,
      details: [{ label: 'نوع المكافأة', value: String(type.nameAr) }, { label: 'القيمة المدخلة', value: amount }, { label: 'الشهر المستهدف', value: dto.targetPeriod }, { label: 'السبب', value: reason },
        { label: 'جاهز للإرسال', value: String(preview.totals.ready) }, ...(skipped ? [{ label: 'مش هيتبعت له', value: String(skipped) }] : [])],
      rows: preview.rows.slice(0, 200).map(row => ({ name: row.fullName ?? `موظف #${row.employeeId}`, code: row.employeeCode ?? null, amount: row.amount ?? null, ready: row.status === 'READY', note: row.message ?? null,
        chain: row.steps.map(step => String(step.roleLabel)) })),
      total: preview.totals.totalAmount,
      notice: instant ? 'هتتعتمد فورًا من غير سلسلة اعتماد: قرارك كموارد بشرية نهائي.' : 'بعد التأكيد كل مكافأة بتدخل سلسلة اعتمادها.' }
    return { proposal: { kind: 'BONUS_BULK', dto, previewHash: preview.previewHash, view },
      result: { status: 'PREVIEW_READY', type: type.nameAr, targetPeriod: dto.targetPeriod, ready: preview.totals.ready, skipped, totalAmount: preview.totals.totalAmount, instant } }
  }

  // ===== طلب الإجازة (للمستخدم نفسه) =====
  private async leave(user: JwtPayload, input: Record<string, unknown>): Promise<Built> {
    const fromDate = text(input.fromDate), toDate = text(input.toDate) || fromDate, reason = text(input.reason, 500)
    if (!DATE.test(fromDate) || !DATE.test(toDate) || toDate < fromDate) return needs('تاريخ أول يوم وآخر يوم في الإجازة')
    // نفس قايمة أنواع الإجازات اللي نموذج الطلب بيعرضها للحساب (العام + فرعه)
    const types = await this.leaveTypes.find({ where: definitionBranchWhere<LeaveType>(user, { isActive: true }), order: { id: 'ASC' } })
    const wanted = lower(input.leaveType)
    const matched = wanted ? types.filter(type => String(type.nameAr ?? '').toLowerCase().includes(wanted) || type.code.toLowerCase() === wanted) : []
    if (matched.length !== 1) return types.length ? needs('نوع الإجازة', (matched.length ? matched : types).map(type => String(type.nameAr))) : unavailable()
    const type = matched[0]
    const balance = type.balanceType ? (await this.balances.allBalances(user.employeeId!)).find(row => row.balanceType === type.balanceType) : null
    // «days» خانة مطلوبة في نموذج الطلب: مدى التقويم زي ما الشاشة بتبعته، والمحرك بيعيد حساب أيام الإجازة الفعلية بطريقة عدّ النوع
    const days = Math.round((new Date(`${toDate}T12:00:00`).getTime() - new Date(`${fromDate}T12:00:00`).getTime()) / 86400000) + 1
    const dto = { leaveTypeCode: type.code, fromDate, toDate, days, ...(reason ? { reason } : {}) }
    const view: ProposalView = { kind: 'LEAVE_REQUEST', title: `طلب ${type.nameAr}`,
      details: [{ label: 'نوع الإجازة', value: String(type.nameAr) }, { label: 'من', value: fromDate }, { label: 'إلى', value: toDate }, ...(reason ? [{ label: 'السبب', value: reason }] : []),
        ...(balance ? [{ label: 'رصيدك المتبقي دلوقتي', value: String(balance.remaining) }] : [])],
      rows: [], total: null, notice: 'عدد الأيام والتحقق (الرصيد، التعارض، المرفقات) بيتحسبوا عند الإرسال، والطلب بيدخل سلسلة اعتماده العادية.' }
    return { proposal: { kind: 'LEAVE_REQUEST', dto, view }, result: { status: 'PREVIEW_READY', leaveType: type.nameAr, fromDate, toDate, remaining: balance?.remaining ?? null } }
  }
}
