import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CandidateApplication } from './candidate-application.entity'
import { CandidateApplicationsService } from './candidate-applications.service'
import { RecruitmentJob } from './recruitment-job.entity'
import { RecruitmentJobsController } from './recruitment-jobs.controller'
import { RecruitmentJobsService } from './recruitment-jobs.service'
import { RecruitmentOpeningsController } from './recruitment-openings.controller'

// B3.2-أ: التوظيف — الوظائف الشاغرة (المرشحين القايمين في assets/candidates.controller.ts زي ما هم). وجهة طلب «احتياج توظيف»
// (requisition-requests.ts) دوال بمدير المعاملة بس، بينادي عليها محرك الطلبات.
// B3.3-أ: المرشح على وظيفة (candidate_applications) والتقديم الداخلي من البوابة.
@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentJob, CandidateApplication])],
  controllers: [RecruitmentJobsController, RecruitmentOpeningsController],
  providers: [RecruitmentJobsService, CandidateApplicationsService],
  exports: [RecruitmentJobsService, CandidateApplicationsService],
})
export class RecruitmentModule {}
