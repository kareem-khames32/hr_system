import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CandidateApplication } from './candidate-application.entity'
import { CandidateApplicationsService } from './candidate-applications.service'
import { CandidateStageLog } from './candidate-stage-log.entity'
import { CandidateStagesService } from './candidate-stages.service'
import { CareersController } from './careers.controller'
import { CareersService } from './careers.service'
import { RecruitmentJob } from './recruitment-job.entity'
import { RecruitmentJobsController } from './recruitment-jobs.controller'
import { RecruitmentJobsService } from './recruitment-jobs.service'
import { RecruitmentOpeningsController } from './recruitment-openings.controller'

// B3.2-أ: التوظيف — الوظائف الشاغرة (المرشحين القايمين في assets/candidates.controller.ts زي ما هم). وجهة طلب «احتياج توظيف»
// (requisition-requests.ts) دوال بمدير المعاملة بس، بينادي عليها محرك الطلبات.
// B3.3-أ: المرشح على وظيفة (candidate_applications) والتقديم الداخلي من البوابة.
// B3.3-ب: صفحة الوظائف العامة والتقديم من لينك (من غير دخول، بميزة مقفولة).
// B3.4-أ: نقل المرشح بين المراحل وسجله (candidate_stage_log).
@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentJob, CandidateApplication, CandidateStageLog])],
  controllers: [RecruitmentJobsController, RecruitmentOpeningsController, CareersController],
  providers: [RecruitmentJobsService, CandidateApplicationsService, CareersService, CandidateStagesService],
  exports: [RecruitmentJobsService, CandidateApplicationsService, CandidateStagesService],
})
export class RecruitmentModule {}
