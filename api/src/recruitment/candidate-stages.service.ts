import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Candidate, type CandidateStage } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { User } from '../auth/user.entity'
import { CandidateStageLog } from './candidate-stage-log.entity'

export const CANDIDATE_STAGES: readonly CandidateStage[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = { applied: 'تقدّم', screening: 'فرز', interview: 'مقابلة', offer: 'عرض', hired: 'مُعيَّن', rejected: 'مرفوض' }
export const CANDIDATE_NOT_FOUND = 'المرشح غير موجود'
export const CANDIDATE_HIRED = 'المرشح مُعيَّن بالفعل — لا يُعدَّل'
export const STAGE_MOVE_MAX = 200
export const STAGE_REASON_MAX = 300
export const STAGE_MOVE_IDS = `اختار مرشحين للنقل (من 1 لـ${STAGE_MOVE_MAX})`

let ready: boolean | null = null
/** جدول ترحيل 106 موجود؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function candidateStageLogReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.candidate_stage_log', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetCandidateStageLogCache() { ready = null }

/** أرقام المرشحين: قايمة أرقام صحيحة موجبة من غير تكرار، وبحد أقصى */
export function cleanCandidateIds(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > STAGE_MOVE_MAX || raw.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException(STAGE_MOVE_IDS)
  return [...new Set(raw as number[])].sort((a, b) => a - b)
}
export function cleanStage(raw: unknown): CandidateStage {
  if (typeof raw !== 'string' || !(CANDIDATE_STAGES as readonly string[]).includes(raw)) throw new BadRequestException('مرحلة غير صالحة')
  return raw as CandidateStage
}
/** السبب: اختياري، نص قصير */
export function cleanStageReason(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException('سبب النقل نص')
  const value = raw.replace(/\s+/g, ' ').trim()
  if (value.length > STAGE_REASON_MAX) throw new BadRequestException(`سبب النقل لا يتجاوز ${STAGE_REASON_MAX} حرف`)
  return value || null
}

// B3.4-أ: نقل المرشح بين المراحل في مكان واحد، وكل نقل سطر في السجل (بعد ترحيل 106؛ قبله النقل شغال من غير سجل).
@Injectable()
export class CandidateStagesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * نقل قايمة مرشحين لمرحلة — معاملة واحدة (كلهم أو ولا واحد). الصفوف بتتقفل بترتيب أرقامها (مفيش انتظار دايري بين نقلين)، وكل مرشح
   * بيتحكم تحت قفله: في نطاق فروع الحساب (غير كده «غير موجود»)، ومش مُعيَّن. نفس المرحلة = من غير كتابة ولا سطر. الكتابة بخانة المرحلة بس.
   */
  async move(user: JwtPayload, rawIds: unknown, rawStage: unknown, rawReason?: unknown): Promise<{ moved: number }> {
    const ids = cleanCandidateIds(rawIds), stage = cleanStage(rawStage), reason = cleanStageReason(rawReason)
    const scope = branchScopeOf(user)
    return this.ds.transaction(async (em) => {
      const log = await candidateStageLogReady(em)
      const candidates = em.getRepository(Candidate)
      let moved = 0
      for (const id of ids) {
        const row = await candidates.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
        if (!row || (row.branchId != null && !inBranchScope(scope, row.branchId))) throw new NotFoundException(CANDIDATE_NOT_FOUND)
        if (row.stage === 'hired') throw new BadRequestException(CANDIDATE_HIRED)
        if (row.stage === stage) continue
        await candidates.update({ id: row.id }, { stage })
        if (log) await em.getRepository(CandidateStageLog).insert({ candidateId: row.id, fromStage: row.stage, toStage: stage, reason, byUserId: user.sub, createdAt: new Date() })
        moved++
      }
      return { moved }
    })
  }

  /** سطر «مُعيَّن» بعد التعيين (المرحلة اتكتبت في مسار التعيين نفسه) */
  async recordHire(user: JwtPayload, candidateId: number, fromStage: string): Promise<void> {
    const em = this.ds.manager
    if (!(await candidateStageLogReady(em))) return
    await em.getRepository(CandidateStageLog).insert({ candidateId, fromStage, toStage: 'hired', reason: null, byUserId: user.sub, createdAt: new Date() })
  }

  /** سجل نقل مرشح (الأحدث أولًا). المرشح برّه نطاق الحساب = غير موجود. اسم اللي نقل بيتعرض لو حسابه في نطاق القارئ (أو هو نفسه) */
  async history(user: JwtPayload, candidateId: number) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const candidate = await em.getRepository(Candidate).findOne({ where: { id: candidateId } })
    if (!candidate || (candidate.branchId != null && !inBranchScope(scope, candidate.branchId))) throw new NotFoundException(CANDIDATE_NOT_FOUND)
    if (!(await candidateStageLogReady(em))) return { available: false, lines: [] }
    const rows = await em.getRepository(CandidateStageLog).find({ where: { candidateId }, order: { id: 'DESC' } })
    const actors = new Map((rows.length ? await em.getRepository(User).find({ where: { id: In([...new Set(rows.map((row) => row.byUserId))]) } }) : []).map((row) => [row.id, row]))
    return {
      available: true,
      lines: rows.map((row) => {
        const actor = actors.get(row.byUserId)
        const visible = !!actor && (actor.id === user.sub || inBranchScope(scope, actor.branchId))
        return {
          id: row.id, fromStage: row.fromStage ?? null, fromLabel: row.fromStage ? CANDIDATE_STAGE_LABELS[row.fromStage as CandidateStage] ?? row.fromStage : null,
          toStage: row.toStage, toLabel: CANDIDATE_STAGE_LABELS[row.toStage as CandidateStage] ?? row.toStage, reason: row.reason ?? null, at: row.createdAt,
          byName: visible ? actor.displayName : null,
        }
      }),
    }
  }
}
