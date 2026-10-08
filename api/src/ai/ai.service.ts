import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { AttemptLimiter } from '../recruitment/careers'
import { AI_ACTIONS_COMPANY_WIDE, AI_KIND_READ, AI_MAX_TURNS, AI_MIGRATION_MISSING, AI_NOT_AVAILABLE, AI_PROVIDER_FAILED, AI_QUESTION_MAX, AI_QUESTION_MIN, AI_QUESTIONS_PER_MINUTE, AI_RATE_LIMITED, AiAction, cleanQuestion, READ_ASSISTANT_SYSTEM, toolResultText } from './ai-rules'
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

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly tools: AiToolsService) {}

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
    return { available, limits: { questionMin: AI_QUESTION_MIN, questionMax: AI_QUESTION_MAX }, tools: available ? (await this.tools.available(user)).map(tool => ({ name: tool.name, label: this.tools.labelOf(tool.name) })) : [] }
  }

  /** سؤال للمساعد: الأدوات بتتنفّذ بهوية السائل، والنتيجة بتتسجّل (نجحت ولا فشلت) */
  async ask(user: JwtPayload, raw: unknown) {
    const question = cleanQuestion(raw)
    if (!question) throw new BadRequestException(`السؤال من ${AI_QUESTION_MIN} لحد ${AI_QUESTION_MAX} حرف`)
    const provider = this.current()
    if (!provider) throw new ServiceUnavailableException(AI_NOT_AVAILABLE)
    if (!(await this.ready(this.ds.manager))) throw new ConflictException(AI_MIGRATION_MISSING)
    if (!this.limiter.take(String(user.sub))) throw new HttpException(AI_RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS)
    const tools = await this.tools.available(user), allowed = new Set(tools.map(tool => tool.name))
    const messages: LlmMessage[] = [{ role: 'user', text: question }]
    const called: Array<{ name: string; input: Record<string, unknown>; ok: boolean }> = []
    let answer = '', failure: unknown = null
    try {
      for (let turn = 0; turn < AI_MAX_TURNS; turn++) {
        const reply = await provider.turn({ system: READ_ASSISTANT_SYSTEM, messages, tools })
        if (!reply.toolCalls.length) { answer = reply.text; break }
        messages.push({ role: 'assistant', text: reply.text, toolCalls: reply.toolCalls })
        for (const call of reply.toolCalls.slice(0, 6)) {
          // أداة برّه القايمة اللي اتبعتت للنموذج مابتتنفّذش
          const done = allowed.has(call.name) ? await this.tools.run(user, call.name, call.input) : { ok: false, result: 'أداة مش معروفة' }
          called.push({ name: call.name, input: call.input, ok: done.ok })
          messages.push({ role: 'tool', toolCallId: call.id, name: call.name, result: toolResultText(done.result) })
        }
      }
    } catch (error) {
      failure = error
      this.logger.warn(`سؤال المساعد فشل عند المزوّد: ${error instanceof Error ? error.message : error}`)
    }
    if (!failure && !answer) answer = 'ماقدرتش أوصل لإجابة — جرّب تسأل بشكل تاني.'
    const row = await this.ds.getRepository(AiAction).save(this.ds.getRepository(AiAction).create({ userId: user.sub, employeeId: user.employeeId ?? null, kind: AI_KIND_READ, question, tools: JSON.stringify(called),
      answer: failure ? null : answer.slice(0, 8000), suggestion: null, confirmed: null, confirmedByUserId: null, confirmedAt: null, provider: provider.name.slice(0, 40), model: provider.model.slice(0, 80), status: failure ? 'FAILED' : 'OK', createdAt: new Date() }))
    if (failure) throw new ServiceUnavailableException(AI_PROVIDER_FAILED)
    return { id: row.id, answer, sources: [...new Set(called.filter(item => item.ok).map(item => item.name))].map(name => ({ name, label: this.tools.labelOf(name) })) }
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
