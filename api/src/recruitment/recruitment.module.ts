import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RecruitmentJob } from './recruitment-job.entity'
import { RecruitmentJobsController } from './recruitment-jobs.controller'
import { RecruitmentJobsService } from './recruitment-jobs.service'

// B3.2-أ: التوظيف — الوظائف الشاغرة (المرشحين القايمين في assets/candidates.controller.ts زي ما هم). وجهة طلب «احتياج توظيف»
// (requisition-requests.ts) دوال بمدير المعاملة بس، بينادي عليها محرك الطلبات.
@Module({
  imports: [TypeOrmModule.forFeature([RecruitmentJob])],
  controllers: [RecruitmentJobsController],
  providers: [RecruitmentJobsService],
  exports: [RecruitmentJobsService],
})
export class RecruitmentModule {}
