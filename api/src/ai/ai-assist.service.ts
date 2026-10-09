import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { fileStorage } from '../files/storage'
import { StoredFile } from '../files/stored-file.entity'
import type { ModuleKey } from '../modules-registry/registry'
import { ModulesService } from '../modules-registry/modules.service'
import { REVIEW_NOT_FOUND } from '../performance/review-rules'
import { ReviewsService } from '../performance/reviews.service'
import { CandidateApplication } from '../recruitment/candidate-application.entity'
import { assertCandidateCvAccess } from '../recruitment/candidate-applications'
import { CV_ENTITY_TYPE } from '../recruitment/careers'
import { RecruitmentJob } from '../recruitment/recruitment-job.entity'
import { AI_ASSIST_KINDS, AI_ASSIST_TEXT_MAX, AI_CV_MAX_BYTES, AI_KIND_CV, AI_KIND_RANKING, AI_KIND_REVIEW_DRAFT, AI_PROVIDER_FAILED, AI_SUGGESTION_DECIDED, AI_SUGGESTION_LABEL, AI_SUGGESTION_NOT_FOUND,
  AiAction, CV_SUMMARY_SYSTEM, parseRanking, RANKING_SYSTEM, redactForProvider, REVIEW_DRAFT_SYSTEM, sameSuggestionText } from './ai-rules'
import { AiService } from './ai.service'
import type { LlmMessage } from './llm-provider'

// B6.10: الـAI في التوظيف والأداء — اقتراحات بس. ولا دالة هنا بتكتب في ملف مرشح أو تقييم أو بتنقل مرحلة: الاقتراح بيتحفظ في سجل المساعد،
// وصاحبه بيسجّل إنه استخدمه زي ما هو أو غيّره أو رفضه، والحفظ الفعلي من شاشته العادية (بحكمها وصلاحيتها).

const CANDIDATE_NOT_FOUND = 'المرشح غير موجود'
const JOB_NOT_FOUND = 'الوظيفة غير موجودة'
interface StoredSuggestion { kind: string; entityId: number; text?: string; order?: Array<{ candidateId: number; reason: string | null }> }

@Injectable()
export class AiAssistService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly ai: AiService, private readonly modules: ModulesService, private readonly reviews: ReviewsService) {}

  private async open(module: ModuleKey, user: JwtPayload, missing: string) {
    if (!(await this.modules.allowedFor(module, user))) throw new NotFoundException(missing)
  }

  /** نداء واحد للنموذج (من غير أدوات) وتسجيل الاقتراح في `ai_actions` — نجح ولا فشل */
  private async suggest(user: JwtPayload, kind: string, question: string, entityId: number, system: string, message: LlmMessage, shape: (text: string) => Omit<StoredSuggestion, 'kind' | 'entityId'>) {
    const provider = await this.ai.engaged(user)
    let text = '', failed = false
    try { text = (await provider.turn({ system, messages: [message], tools: [] })).text.trim() } catch { failed = true }
    if (!failed && !text) failed = true
    const suggestion: StoredSuggestion | null = failed ? null : { kind, entityId, ...shape(text.slice(0, AI_ASSIST_TEXT_MAX)) }
    const repo = this.ds.getRepository(AiAction)
    const row = await repo.save(repo.create({ userId: user.sub, employeeId: user.employeeId ?? null, kind, question, tools: '[]', answer: null, suggestion: suggestion ? JSON.stringify(suggestion) : null,
      confirmed: null, confirmedByUserId: null, confirmedAt: null, provider: provider.name.slice(0, 40), model: provider.model.slice(0, 80), status: failed ? 'FAILED' : 'OK', createdAt: new Date() }))
    if (!suggestion) throw new ServiceUnavailableException(AI_PROVIDER_FAILED)
    return { id: row.id, suggestion: true as const, label: AI_SUGGESTION_LABEL, kind, entityId, stored: suggestion }
  }

  /** مرشح في نطاق فروع الحساب — نفس حكم شاشة المرشحين (برّه النطاق = غير موجود) */
  private async candidateOf(user: JwtPayload, id: number): Promise<Candidate> {
    const candidate = Number.isSafeInteger(id) && id > 0 ? await this.ds.getRepository(Candidate).findOne({ where: { id } }) : null
    if (!candidate || (candidate.branchId != null && !inBranchScope(branchScopeOf(user), candidate.branchId))) throw new NotFoundException(CANDIDATE_NOT_FOUND)
    return candidate
  }

  /** قراءة سيرة المرشح: ملخص مقترح لملاحظات ملفه. الملف بيتقري بحكم قراءة السيرة القايم، وبيتبعت للمزوّد زي ما هو (PDF). */
  async cvSummary(user: JwtPayload, candidateId: number) {
    await this.open('recruitment', user, CANDIDATE_NOT_FOUND)
    const candidate = await this.candidateOf(user, candidateId), em = this.ds.manager
    const application = await em.getRepository(CandidateApplication).findOne({ where: { candidateId: candidate.id }, order: { id: 'DESC' } })
    const file = application?.cvFileId ? await em.getRepository(StoredFile).findOne({ where: { id: application.cvFileId, entityType: CV_ENTITY_TYPE, entityId: candidate.id } }) : null
    if (!file) throw new BadRequestException('المرشح مالوش سيرة ذاتية مرفوعة')
    await assertCandidateCvAccess(em, user, file)
    if (file.mime !== 'application/pdf') throw new BadRequestException('قراءة السيرة للملفات PDF بس')
    if (Number(file.size) > AI_CV_MAX_BYTES) throw new BadRequestException('ملف السيرة أكبر من حد القراءة')
    const chunks: Buffer[] = []
    for await (const chunk of fileStorage().read(file.storedName)) chunks.push(Buffer.from(chunk as Buffer))
    const made = await this.suggest(user, AI_KIND_CV, `قراءة سيرة المرشح #${candidate.id}`, candidate.id, CV_SUMMARY_SYSTEM,
      { role: 'user', text: `لخّص السيرة الذاتية المرفقة لمرشح على وظيفة «${candidate.positionTitle ?? ''}».`, documents: [{ mediaType: 'application/pdf', base64: Buffer.concat(chunks).toString('base64') }] },
      text => ({ text }))
    return { id: made.id, suggestion: made.suggestion, label: made.label, kind: made.kind, candidateId: candidate.id, text: made.stored.text }
  }

  /** ترتيب مقترح لمرشحي وظيفة بسبب لكل واحد. مابيلمسش مرحلة حد، والنموذج بيشوف مراجع بأرقام من غير أسماء ولا بيانات اتصال. */
  async ranking(user: JwtPayload, jobId: number) {
    await this.open('recruitment', user, JOB_NOT_FOUND)
    const em = this.ds.manager
    const job = Number.isSafeInteger(jobId) && jobId > 0 ? await em.getRepository(RecruitmentJob).findOne({ where: { id: jobId } }) : null
    if (!job || !inBranchScope(branchScopeOf(user), job.branchId)) throw new NotFoundException(JOB_NOT_FOUND)
    const applications = await em.getRepository(CandidateApplication).find({ where: { jobId: job.id }, order: { id: 'ASC' } })
    const scope = branchScopeOf(user)
    const candidates = (applications.length ? await em.getRepository(Candidate).find({ where: { id: In(applications.map(row => row.candidateId)) }, order: { id: 'ASC' } }) : [])
      .filter(row => row.stage !== 'hired' && (row.branchId == null || inBranchScope(scope, row.branchId)))
    if (candidates.length < 2) throw new BadRequestException('الترتيب محتاج مرشحين اتنين على الأقل على الوظيفة')
    const ids = candidates.map(row => row.id)
    const made = await this.suggest(user, AI_KIND_RANKING, `ترتيب مرشحي الوظيفة #${job.id}`, job.id, RANKING_SYSTEM,
      { role: 'user', text: JSON.stringify(redactForProvider({ job: { title: job.title, description: job.description, requirements: job.requirements },
        candidates: candidates.map(row => ({ candidateId: row.id, stage: row.stage, notes: row.notes ?? null })) })) },
      text => ({ order: parseRanking(text, ids) }))
    const names = new Map(candidates.map(row => [row.id, row]))
    return { id: made.id, suggestion: made.suggestion, label: made.label, kind: made.kind, jobId: job.id,
      order: (made.stored.order ?? []).map((item, index) => ({ position: item.reason === null ? null : index + 1, candidateId: item.candidateId, fullName: names.get(item.candidateId)?.fullName ?? null,
        stage: names.get(item.candidateId)?.stage ?? null, reason: item.reason })) }
  }

  /** مسودة ملخص تقييم من أدلة النظام — للمدير المقيِّم بس وقبل ما يسلّم. من غير اسم الموظف، ومن غير أي درجة مقترحة. */
  async reviewDraft(user: JwtPayload, assignmentId: number) {
    await this.open('performance', user, REVIEW_NOT_FOUND)
    // نفس نموذج الشاشة بحكم علاقة الحساب بالتقييم (غير المعني = غير موجود)
    const form = await this.reviews.form(user, assignmentId)
    if (form.relation !== 'manager' || !form.canSubmit) throw new NotFoundException(REVIEW_NOT_FOUND)
    const made = await this.suggest(user, AI_KIND_REVIEW_DRAFT, `مسودة ملخص التقييم #${assignmentId}`, assignmentId, REVIEW_DRAFT_SYSTEM,
      { role: 'user', text: JSON.stringify(redactForProvider({ period: { from: form.periodStart, to: form.periodEnd }, goals: form.goals, evidence: form.evidence, selfComment: form.self?.comment ?? null })) },
      text => ({ text }))
    return { id: made.id, suggestion: made.suggestion, label: made.label, kind: made.kind, assignmentId, text: made.stored.text }
  }

  /**
   * قرار صاحب الاقتراح فيه — مرة واحدة (تحديث مشروط): رفضه، أو استخدمه. للنص: الخادم هو اللي بيقارن النص النهائي بالاقتراح
   * («زي ما هو» ولا «اتغيّر»)، والنص النهائي بيتحفظ جنب الاقتراح.
   */
  async outcome(user: JwtPayload, id: number, input: { used?: unknown; finalText?: unknown }) {
    const row = Number.isSafeInteger(id) && id > 0 ? await this.ds.getRepository(AiAction).findOne({ where: { id, userId: user.sub, kind: In([...AI_ASSIST_KINDS]) } }) : null
    let stored: StoredSuggestion | null = null
    try { stored = row?.suggestion ? JSON.parse(row.suggestion) as StoredSuggestion : null } catch { stored = null }
    // CRP6A-B05: الاقتراح لصاحبه بالحساب **وبملف الموظف** اللي طلبه بيه
    if (!row || !stored || (row.employeeId ?? null) !== (user.employeeId ?? null)) throw new NotFoundException(AI_SUGGESTION_NOT_FOUND)
    if (typeof input.used !== 'boolean') throw new BadRequestException('used: true لو استخدمت الاقتراح، false لو رفضته')
    let status = 'DISMISSED', finalText: string | null = null
    if (input.used) {
      if (stored.text !== undefined) {
        if (typeof input.finalText !== 'string' || !input.finalText.trim() || input.finalText.length > AI_ASSIST_TEXT_MAX) throw new BadRequestException('النص النهائي اللي اتحفظ مطلوب')
        finalText = input.finalText.trim()
        status = sameSuggestionText(finalText, stored.text) ? 'ACCEPTED' : 'CHANGED'
      } else status = 'ACCEPTED'
    }
    const claimed: unknown[] = await this.ds.query(`UPDATE dbo.ai_actions SET [confirmed] = @0, [confirmedByUserId] = @1, [confirmedAt] = @2, [status] = @3, [answer] = @4 OUTPUT inserted.[id]
      WHERE [id] = @5 AND [userId] = @1 AND [confirmed] IS NULL AND [status] = N'OK' AND ISNULL([employeeId], 0) = @6
        -- CRP6B-B05: وربط الحساب بالموظف دلوقتي لازم يساويه (تغيير الربط قبل القرار بيبطّله)
        AND ISNULL((SELECT u.[employeeId] FROM dbo.users u WHERE u.[id] = @1), 0) = @6`, [input.used ? 1 : 0, user.sub, new Date(), status, finalText, id, user.employeeId ?? 0])
    if (claimed.length !== 1) throw new ConflictException(AI_SUGGESTION_DECIDED)
    return { id, outcome: status }
  }
}
