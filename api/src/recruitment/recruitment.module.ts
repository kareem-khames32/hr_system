import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CandidateApplication } from './candidate-application.entity'
import { CandidateApplicationsService } from './candidate-applications.service'
import { CandidateStageLog } from './candidate-stage-log.entity'
import { CandidateStagesService } from './candidate-stages.service'
import { CareersController } from './careers.controller'
import { CareersService } from './careers.service'
import { AuthModule } from '../auth/auth.module'
import { CandidateInterview, InterviewScorecard } from './interview.entities'
import { MyInterviewsController, RecruitmentInterviewsController } from './interviews.controller'
import { InterviewsService } from './interviews.service'
import { JobShareController } from './job-share.controller'
import { JobShareService } from './job-share.service'
import { CandidateOffer } from './offer.entity'
import { OfferLinkController, RecruitmentOffersController } from './offers.controller'
import { OffersService } from './offers.service'
import { RecruitmentMetricsService } from './recruitment-metrics.service'
import { RecruitmentJob } from './recruitment-job.entity'
import { RecruitmentJobsController } from './recruitment-jobs.controller'
import { RecruitmentJobsService } from './recruitment-jobs.service'
import { RecruitmentOpeningsController } from './recruitment-openings.controller'

// B3.2-أ: التوظيف — الوظائف الشاغرة (المرشحين القايمين في assets/candidates.controller.ts زي ما هم). وجهة طلب «احتياج توظيف»
// (requisition-requests.ts) دوال بمدير المعاملة بس، بينادي عليها محرك الطلبات.
// B3.3-أ: المرشح على وظيفة (candidate_applications) والتقديم الداخلي من البوابة.
// B3.3-ب: صفحة الوظائف العامة والتقديم من لينك (من غير دخول، بميزة مقفولة).
// B3.4-أ: نقل المرشح بين المراحل وسجله (candidate_stage_log).
// B3.4-ب: المقابلات وبطاقات التقييم (AuthModule لخدمة البريد: دعوة .ics).
// B3.5-أ: عروض العمل (candidate_offers) ولينك رد المرشح.
// B-ADD.6: «انشر الوظيفة» على السوشيال ميديا وفيد XML العام (قراءة بس — ConfigModule وموديول السجل عامّين).
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([RecruitmentJob, CandidateApplication, CandidateStageLog, CandidateInterview, InterviewScorecard, CandidateOffer])],
  controllers: [RecruitmentJobsController, RecruitmentOpeningsController, CareersController, RecruitmentInterviewsController, MyInterviewsController, RecruitmentOffersController,
    OfferLinkController, JobShareController],
  providers: [RecruitmentJobsService, CandidateApplicationsService, CareersService, CandidateStagesService, InterviewsService, OffersService, RecruitmentMetricsService, JobShareService],
  exports: [RecruitmentJobsService, CandidateApplicationsService, CandidateStagesService],
})
export class RecruitmentModule {}
