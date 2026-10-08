import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Comment } from '../comments/comment.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { HelpdeskController } from './helpdesk.controller'
import { RequestServiceRating } from './helpdesk.entities'
import { HelpdeskService } from './helpdesk.service'

// B3.10: مركز خدمات الموارد البشرية — على محرك الطلبات (فئة «استفسارات»)، مش نظام تذاكر جديد. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([RequestServiceRating, Request, RequestType, RequestsConfig, Comment])],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
  exports: [HelpdeskService],
})
export class HelpdeskModule {}
