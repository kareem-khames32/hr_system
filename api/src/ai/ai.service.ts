import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, IsNull, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { ModulesService } from '../modules-registry/modules.service'
import { AttemptLimiter } from '../recruitment/careers'
import { AiProposalsService, type AiProposal } from './ai-proposals.service'
import { ACTION_ASSISTANT_SYSTEM, AI_ACTION_FEATURE, AI_ACTIONS_COMPANY_WIDE, AI_KIND_ACTION, AI_KIND_READ, AI_MAX_TURNS, AI_MIGRATION_MISSING, AI_NOT_AVAILABLE, AI_PROVIDER_FAILED, AI_QUESTION_MAX, AI_QUESTION_MIN, AI_QUESTIONS_PER_MINUTE,
  AI_RATE_LIMITED, AI_SUGGESTION_DECIDED, AI_SUGGESTION_EXPIRED, AI_SUGGESTION_NOT_FOUND, AI_SUGGESTION_TTL_MS, AiAction, cleanQuestion, READ_ASSISTANT_SYSTEM, toolResultText } from './ai-rules'
import { AiToolsService } from './ai-tools.service'
import { llmProviderFromEnv, type LlmMessage, type LlmProvider } from './llm-provider'

// B6.6: مساعد القراءة — حلقة «سؤال ← نموذج ← أدوات بهوية السائل ← رد»، وكل سؤال بيتسجّل في `ai_actions`.
// المزوّد من البيئة (من غيره المساعد «مش متاح»)؛ الاختبارات بتحط مزوّد وهمي بـ`useProvider`.

@Injectable()
export class AiService {
  private readonly logger = new Logger('Ai')
  private provider: LlmProvider | null | undefined
  private readonly limiter = new AttemptLimiter(AI_QUESTIONS_PER_MINUTE, AI_QUESTIONS_PER_MINUTE * 50, 60_000)
  private tableReady = false

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly tools: AiToolsService, private readonly proposals: AiProposalsService, private readonly modules: ModulesService) {}

  /** للاختبارات: مزوّد وهمي بدل مزوّد البيئة (null = من غير مزوّد) */
  useProvider(provider: LlmProvider | null) {
    this.provider = provider
  }

  private current(): LlmProvider | null {
    if (this.provider === undefined) this.provider = llmProviderFromEnv()
    return this.provider
  }

  private async ready(em: EntityManager): Promise<boolean> {
    if (this.tableReady) return true
    const [row]: Array<{ id: number | null }> = await em.query(`SELECT OBJECT_ID(N'dbo.ai_actions', N'U') AS [id]`)
    this.tableReady = row?.id != null
    return this.tableReady
  }

  /** حالة المساعد للشاشة: متاح (مزوّد + جدول السجل)، والأدوات المتاحة للحساب ده */
  async status(user: JwtPayload) {
    const available = this.current() !== null && await this.ready(this.ds.manager)
    return { available, limits: { questionMin: AI_QUESTION_MIN, questionMax: AI_QUESTION_MAX }, tools: available ? (await this.tools.available(user)).map(tool => ({ name: tool.name, label: this.tools.labelOf(tool.name) })) : [],
      // B6.7: مساعد التنفيذ مفتوح؟ (الشاشة بتعرض المعاينة وزرار التأكيد)
      actions: available && await this.modules.isFeatureEnabled(AI_ACTION_FEATURE) }
  }

  /** سؤال للمساعد: الأدوات بتتنفّذ بهوية السائل، والنتيجة بتتسجّل (نجحت ولا فشلت) */
  async ask(user: JwtPayload, raw: unknown) {
    const question = cleanQuestion(raw)
    if (!question) throw new BadRequestException(`السؤال من ${AI_QUESTION_MIN} لحد ${AI_QUESTION_MAX} حرف`)
    const provider = this.current()
    if (!provider) throw new ServiceUnavailableException(AI_NOT_AVAILABLE)
    if (!(await this.ready(this.ds.manager))) throw new ConflictException(AI_MIGRATION_MISSING)
    if (!this.limiter.take(String(user.sub))) throw new HttpException(AI_RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS)
    // B6.7: أدوات الاقتراح بتتضاف لما ميزة مساعد التنفيذ مفتوحة (وكل أداة ورا موديولها)
    const proposing = (await this.modules.isFeatureEnabled(AI_ACTION_FEATURE)) ? await this.proposals.available(user) : []
    const tools = [...await this.tools.available(user), ...proposing], allowed = new Set(tools.map(tool => tool.name)), proposes = new Set(proposing.map(tool => tool.name))
    const system = proposing.length ? ACTION_ASSISTANT_SYSTEM : READ_ASSISTANT_SYSTEM
    let proposal: AiProposal | null = null
    const messages: LlmMessage[] = [{ role: 'user', text: question }]
    const called: Array<{ name: string; input: Record<string, unknown>; ok: boolean }> = []
    let answer = '', failure: unknown = null
    try {
      for (let turn = 0; turn < AI_MAX_TURNS; turn++) {
        const reply = await provider.turn({ system, messages, tools })
        if (!reply.toolCalls.length) { answer = reply.text; break }
        messages.push({ role: 'assistant', text: reply.text, toolCalls: reply.toolCalls })
        for (const call of reply.toolCalls.slice(0, 6)) {
          // أداة برّه القايمة اللي اتبعتت للنموذج مابتتنفّذش
          let done: { ok: boolean; result: unknown }
          if (proposes.has(call.name)) {
            // أداة اقتراح: بتبني معاينة بس (مابتكتبش)؛ اقتراح واحد في السؤال — الأول بيفضل
            const built: { result: unknown; proposal: AiProposal | null } = proposal ? { result: 'فيه اقتراح اتجهّز في السؤال ده — اقتراح واحد في المرة', proposal: null } : await this.proposals.build(user, call.name, call.input)
            if (built.proposal) proposal = built.proposal
            done = { ok: !!built.proposal, result: built.result }
          } else done = allowed.has(call.name) ? await this.tools.run(user, call.name, call.input) : { ok: false, result: 'أداة مش معروفة' }
          called.push({ name: call.name, input: call.input, ok: done.ok })
          messages.push({ role: 'tool', toolCallId: call.id, name: call.name, result: toolResultText(done.result) })
        }
      }
    } catch (error) {
      failure = error
      this.logger.warn(`سؤال المساعد فشل عند المزوّد: ${error instanceof Error ? error.message : error}`)
    }
    if (!failure && !answer) answer = 'ماقدرتش أوصل لإجابة — جرّب تسأل بشكل تاني.'
    if (failure) proposal = null
    const row = await this.ds.getRepository(AiAction).save(this.ds.getRepository(AiAction).create({ userId: user.sub, employeeId: user.employeeId ?? null, kind: proposal ? AI_KIND_ACTION : AI_KIND_READ, question, tools: JSON.stringify(called),
      answer: failure ? null : answer.slice(0, 8000), suggestion: proposal ? JSON.stringify(proposal) : null, confirmed: null, confirmedByUserId: null, confirmedAt: null, provider: provider.name.slice(0, 40), model: provider.model.slice(0, 80), status: failure ? 'FAILED' : 'OK', createdAt: new Date() }))
    if (failure) throw new ServiceUnavailableException(AI_PROVIDER_FAILED)
    return { id: row.id, answer, sources: [...new Set(called.filter(item => item.ok && !proposes.has(item.name)).map(item => item.name))].map(name => ({ name, label: this.tools.labelOf(name) })),
      // B6.7: المعاينة اللي المستخدم بيأكدها (رقمها = رقم سطر السجل)
      suggestion: proposal ? { id: row.id, expiresAt: new Date(new Date(row.createdAt).getTime() + AI_SUGGESTION_TTL_MS).toISOString(), ...proposal.view } : null }
  }

  /** اقتراح لصاحبه ولسه مستني قراره — غير كده نفس رد اللي مش موجود */
  private async pendingSuggestion(user: JwtPayload, id: number): Promise<{ row: AiAction; proposal: AiProposal }> {
    const row = Number.isSafeInteger(id) && id > 0 && await this.ready(this.ds.manager) ? await this.ds.getRepository(AiAction).findOne({ where: { id, userId: user.sub, kind: AI_KIND_ACTION } }) : null
    const proposal = row?.suggestion ? this.proposals.parse(row.suggestion) : null
    if (!row || !proposal) throw new NotFoundException(AI_SUGGESTION_NOT_FOUND)
    if (row.confirmed !== null || row.status !== 'OK') throw new ConflictException(AI_SUGGESTION_DECIDED)
    if (Date.now() - new Date(row.createdAt).getTime() > AI_SUGGESTION_TTL_MS) throw new ConflictException(AI_SUGGESTION_EXPIRED)
    return { row, proposal }
  }

  /**
   * B6.8 — اقتراحات المستخدم نفسه اللي لسه مستنية قراره وجوه المهلة، من أي قناة جهّزتها (الشاشة، أو قناة صوت بتنادي نفس مسار السؤال):
   * بتظهر في البوابة عشان الكتابة تتأكد كتابةً. اقتراح حد تاني مابيظهرش.
   */
  async pendingSuggestions(user: JwtPayload) {
    if (!(await this.ready(this.ds.manager))) return { suggestions: [] }
    const rows = await this.ds.getRepository(AiAction).find({ where: { userId: user.sub, kind: AI_KIND_ACTION, status: 'OK', confirmed: IsNull() }, order: { id: 'DESC' }, take: 20 })
    const now = Date.now()
    return { suggestions: rows.flatMap(row => {
      const proposal = row.suggestion ? this.proposals.parse(row.suggestion) : null, created = new Date(row.createdAt).getTime()
      return proposal && now - created <= AI_SUGGESTION_TTL_MS ? [{ id: row.id, question: row.question, expiresAt: new Date(created + AI_SUGGESTION_TTL_MS).toISOString(), ...proposal.view }] : []
    }) }
  }

  /** حجز الاقتراح بتحديث مشروط: طلبين متزامنين = واحد بس بياخده (مفتاح منع التكرار) */
  private async claim(user: JwtPayload, id: number, confirmed: boolean, status: string): Promise<boolean> {
    const claimed: unknown[] = await this.ds.query(`UPDATE dbo.ai_actions SET [confirmed] = @0, [confirmedByUserId] = @1, [confirmedAt] = @2, [status] = @3 OUTPUT inserted.[id]
      WHERE [id] = @4 AND [userId] = @1 AND [kind] = @5 AND [confirmed] IS NULL AND [status] = N'OK'`, [confirmed ? 1 : 0, user.sub, new Date(), status, id, AI_KIND_ACTION])
    return claimed.length === 1
  }

  /**
   * B6.7 — تأكيد اقتراح: الحجز الأول (مرة واحدة بالظبط)، وبعده التنفيذ بنفس دالة مسار الشاشة بهوية المستخدم وبرّه أي معاملة للمساعد.
   * رفض الخدمة (صلاحية، نطاق، سقف، معاينة اتغيّرت) بيرجع للمستخدم زي ما الشاشة بترجّعه، والاقتراح بيتقفل (يتطلب من جديد).
   */
  async confirm(user: JwtPayload, id: number) {
    const { proposal } = await this.pendingSuggestion(user, id)
    if (!(await this.claim(user, id, true, 'EXECUTING'))) throw new ConflictException(AI_SUGGESTION_DECIDED)
    const repo = this.ds.getRepository(AiAction)
    try {
      const result = await this.proposals.execute(user, proposal)
      await repo.update({ id }, { status: 'EXECUTED', answer: JSON.stringify(result).slice(0, 8000) })
      return { id, executed: true, result }
    } catch (error) {
      const message = error instanceof HttpException ? error.message : 'تعذّر التنفيذ'
      await repo.update({ id }, { status: 'EXEC_FAILED', answer: String(message).slice(0, 1000) })
      throw error
    }
  }

  /** B6.7 — إلغاء اقتراح من غير تنفيذ (بيتسجّل إن صاحبه رفضه) */
  async dismiss(user: JwtPayload, id: number) {
    await this.pendingSuggestion(user, id)
    if (!(await this.claim(user, id, false, 'DISMISSED'))) throw new ConflictException(AI_SUGGESTION_DECIDED)
    return { id, dismissed: true }
  }

  /** سجل استخدام المساعد: لصاحب صلاحية سجل التدقيق بحساب «كل الفروع» بس (السؤال نص حر ممكن يذكر أي حد في الشركة). من غير نص الرد. */
  async actions(user: JwtPayload, query: { page?: unknown }) {
    if (branchScopeOf(user) !== null) throw new ForbiddenException(AI_ACTIONS_COMPANY_WIDE)
    if (!(await this.ready(this.ds.manager))) return { available: false, actions: [] }
    const page = Number(query.page ?? 1)
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new BadRequestException('page رقم صحيح من 1')
    const rows: Array<Record<string, unknown>> = await this.ds.query(`SELECT a.[id], a.[userId], u.[displayName], a.[kind], a.[question], a.[tools], a.[status], a.[provider], a.[model], a.[confirmed], a.[createdAt]
      FROM dbo.ai_actions a LEFT JOIN dbo.users u ON u.[id] = a.[userId] ORDER BY a.[id] DESC OFFSET @0 ROWS FETCH NEXT 50 ROWS ONLY`, [(page - 1) * 50])
    return { available: true, actions: rows.map(row => ({ ...row, id: Number(row.id), userId: Number(row.userId), tools: (() => { try { return (JSON.parse(String(row.tools)) as Array<{ name: string; ok: boolean }>).map(item => ({ name: item.name, ok: item.ok })) } catch { return [] } })() })) }
  }
}
