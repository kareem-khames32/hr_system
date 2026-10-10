import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In } from 'typeorm'
import { Candidate, type CandidateStage } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { CandidateApplication } from './candidate-application.entity'
import { candidateApplicationsReady } from './candidate-applications'
import { CandidateStageLog } from './candidate-stage-log.entity'
import { knownSourceLabel } from './job-share'
import { CANDIDATE_STAGES, CANDIDATE_STAGE_LABELS, candidateStageLogReady } from './candidate-stages.service'
import { CandidateOffer } from './offer.entity'
import { offersReady } from './offers.service'
import { RecruitmentJob } from './recruitment-job.entity'
import { recruitmentJobsReady } from './recruitment-rules'

const DAY = 86_400_000
/** الفرق بالأيام بخانة عشرية (مش أقل من صفر) */
export const daysBetween = (from: Date | string, to: Date | string): number => Math.max(0, Math.round(((new Date(to).getTime() - new Date(from).getTime()) / DAY) * 10) / 10)
/** متوسط بخانة عشرية، أو null لو مفيش قيم */
export const average = (values: number[]): number | null => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null)

// B3.5-ج: أرقام التوظيف — من بيانات الدورة نفسها (الوظائف، التقديمات، سجل المراحل، العروض)، وبنطاق فروع الحساب. قراءة بس.
@Injectable()
export class RecruitmentMetricsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async metrics(user: JwtPayload, now: Date = new Date()) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    // المرشحين اللي الحساب شايفهم (نفس قاعدة قايمة المرشحين: فرعه، أو من غير فرع)
    const candidates = (await em.getRepository(Candidate).find()).filter((row) => row.branchId == null || inBranchScope(scope, row.branchId))
    const ids = candidates.map((row) => row.id), byId = new Map(candidates.map((row) => [row.id, row]))
    const jobs = (await recruitmentJobsReady(em)) ? (await em.getRepository(RecruitmentJob).find()).filter((job) => inBranchScope(scope, job.branchId)) : []
    const jobById = new Map(jobs.map((job) => [job.id, job]))
    const applications = ids.length && (await candidateApplicationsReady(em)) ? await em.getRepository(CandidateApplication).find({ where: { candidateId: In(ids) } }) : []
    const offers = ids.length && (await offersReady(em)) ? await em.getRepository(CandidateOffer).find({ where: { candidateId: In(ids) } }) : []
    const moves = ids.length && (await candidateStageLogReady(em)) ? await em.getRepository(CandidateStageLog).find({ where: { candidateId: In(ids) } }) : []

    // الوظائف المفتوحة وعمرها (من النشر، وإلا من الإنشاء)
    const open = jobs.filter((job) => job.status === 'PUBLISHED' || job.status === 'PAUSED')
    // نسبة قبول العروض: المقبول من اللي اترد عليه
    const accepted = offers.filter((offer) => offer.status === 'ACCEPTED' && offer.respondedAt), declined = offers.filter((offer) => offer.status === 'DECLINED')
    // مدة التعيين: من تسجيل المرشح لقبول العرض
    const timeToHire = accepted.map((offer) => daysBetween(byId.get(offer.candidateId)!.createdAt, offer.respondedAt as Date))
    // مدة ملء الشاغر: من إنشاء الوظيفة (= اعتماد الاحتياج) لأول عرض مقبول عليها
    const firstAccept = new Map<number, Date>()
    for (const offer of accepted) {
      if (offer.jobId == null || !jobById.has(offer.jobId)) continue
      const at = offer.respondedAt as Date, seen = firstAccept.get(offer.jobId)
      if (!seen || at.getTime() < seen.getTime()) firstAccept.set(offer.jobId, at)
    }
    const timeToFill = [...firstAccept].map(([jobId, at]) => daysBetween(jobById.get(jobId)!.createdAt, at))
    // العبور بين المراحل: كام مرشح دخل كل مرحلة (من السجل)، وكام واقف فيها دلوقتي
    const entered = new Map<string, Set<number>>()
    for (const move of moves) (entered.get(move.toStage) ?? entered.set(move.toStage, new Set()).get(move.toStage)!).add(move.candidateId)
    const sources = new Map<string, number>()
    // B-ADD.6: المصدر المعروف (LinkedIn، Facebook…) بيتجمّع على اسمه مهما اتكتب (مفتاح اللينك، أو كتابة مسؤول التوظيف بالإيد)
    for (const application of applications) {
      const source = knownSourceLabel(application.source) ?? application.source ?? 'غير محدد'
      sources.set(source, (sources.get(source) ?? 0) + 1)
    }
    return {
      candidates: candidates.length,
      openJobs: { count: open.length, averageAgeDays: average(open.map((job) => daysBetween(job.publishedAt ?? job.createdAt, now))) },
      timeToFill: { averageDays: average(timeToFill), jobs: timeToFill.length },
      timeToHire: { averageDays: average(timeToHire), offers: timeToHire.length },
      offers: { accepted: accepted.length, declined: declined.length, acceptanceRate: accepted.length + declined.length ? Math.round((accepted.length / (accepted.length + declined.length)) * 1000) / 10 : null },
      stages: CANDIDATE_STAGES.map((stage: CandidateStage) => ({ stage, label: CANDIDATE_STAGE_LABELS[stage], current: candidates.filter((row) => row.stage === stage).length, entered: entered.get(stage)?.size ?? 0 })),
      sources: [...sources].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    }
  }
}
