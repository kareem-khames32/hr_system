import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { CommentsService } from './comments.service'

// B2.8: حوار التعليقات على الطلب والمهمة. من غير صلاحية خاصة: الحق هو حق قراءة الكيان نفسه، والفحص في الخدمة
// (CommentsService.access) — اللي مايشوفش الطلب أو المهمة بياخد نفس رد قراءتهم.

class CommentDto {
  // الحد الفعلي (2000 بعد توحيد نهايات السطور) في الخدمة برسالته
  @IsString() @MaxLength(4100) body: string
  @IsOptional() @IsBoolean() internal?: boolean
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) targets?: string[]
  // مراجع تعليقات من نفس الحوار (مش أرقامها)
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) replyTo?: string[]
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsInt({ each: true }) fileIds?: number[]
  // B2.5 (إضافة المالك): تعليق مسؤول المهمة «مش بتاعتي» — بيتشاور فيه للي كلّف بيها
  @IsOptional() @IsBoolean() notMine?: boolean
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @RequireModule('requests')
  @Get('requests/:id/comments')
  requestThread(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.comments.list(user, 'request', id)
  }

  @RequireModule('requests')
  @Post('requests/:id/comments')
  requestComment(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CommentDto) {
    return this.comments.add(user, 'request', id, dto)
  }

  @RequireModule('tasks')
  @Get('tasks/:id/comments')
  taskThread(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.comments.list(user, 'task', id)
  }

  @RequireModule('tasks')
  @Post('tasks/:id/comments')
  taskComment(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CommentDto) {
    return this.comments.add(user, 'task', id, dto)
  }
}
