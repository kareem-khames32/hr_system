import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestsModule } from '../requests/requests.module'
import { TasksModule } from '../tasks/tasks.module'
import { Comment } from './comment.entity'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'

// B2.8: التعليقات والإشارات — الحق من محرك الطلبات ومحرك المهام، والإشعار من محرك الإشعارات (بيقرا من هنا مين يشوف التعليق)
@Module({
  imports: [TypeOrmModule.forFeature([Comment]), RequestsModule, TasksModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
