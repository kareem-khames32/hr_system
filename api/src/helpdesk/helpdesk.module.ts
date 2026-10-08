import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Comment } from '../comments/comment.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { PoliciesModule } from '../policies/policies.module'
import { Policy } from '../policies/policy.entities'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { HelpdeskController } from './helpdesk.controller'
import { RequestServiceRating } from './helpdesk.entities'
import { HelpdeskService } from './helpdesk.service'
import { KbArticle, KnowledgeService } from './knowledge.service'

// B3.10: مركز خدمات الموارد البشرية — على محرك الطلبات (فئة «استفسارات»)، مش نظام تذاكر جديد. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([RequestServiceRating, KbArticle, Request, RequestType, RequestsConfig, Comment, Employee, Branch, Department, Team, Policy]), PoliciesModule],
  controllers: [HelpdeskController],
  providers: [HelpdeskService, KnowledgeService],
  exports: [HelpdeskService],
})
export class HelpdeskModule {}
