import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { AllowPreboarding } from '../auth/preboarding'
import { RequireModule } from '../modules-registry/module.guard'
import { FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { TASK_PRIORITIES, TASK_STATUSES } from './task.entity'
import { TasksService } from './tasks.service'

// B2.5: المهام العامة و«مهامي».
//  الحساب لنفسه (من غير صلاحية، والفحص في الخدمة): «مهامي» وعدّادها، و«فريقي»، وبيانات نموذج التكليف، والتكليف (المدير المباشر لمرؤوسيه،
//  أو «إدارة المهام» في نطاقها)، وقراءة مهمة وتعديلها وتغيير حالتها (المسؤول، أو مديره المباشر، أو صاحب الصلاحية — برّه كده 404؛ والإدارة
//  لصاحب «إدارة المهام» أو للي كلّف بيها وهو مدير مسؤولها).
//  قايمة كل المهام بصلاحية «عرض كل المهام» في نطاق فروع الحساب.

const DATE = /^\d{4}-\d{2}-\d{2}$/

class TaskDto {
  @IsString() @MinLength(2) @MaxLength(200) title: string
  @IsOptional() @IsString() @MaxLength(2000) description?: string
  @IsOptional() @IsInt() @Min(1) assigneeEmployeeId?: number
  @IsOptional() @IsIn([...FUNCTIONAL_APPROVER_ROLES]) assigneeRole?: string
  @IsOptional() @IsInt() @Min(1) branchId?: number
  @IsOptional() @Matches(DATE) dueDate?: string
  @IsOptional() @IsIn([...TASK_PRIORITIES]) priority?: string
  @IsOptional() @IsBoolean() requiresProof?: boolean
  @IsOptional() @IsBoolean() needsRating?: boolean
}

// B-ADD.1: المهمة الجماعية — خانات المهمة نفسها، و«على مين؟» بدل المسؤول (الجسم خام والحكم في الخدمة)
class TaskGroupDto {
  @IsString() @MinLength(2) @MaxLength(200) title: string
  @IsOptional() @IsString() @MaxLength(2000) description?: string
  @IsOptional() @Matches(DATE) dueDate?: string
  @IsOptional() @IsIn([...TASK_PRIORITIES]) priority?: string
  @IsOptional() @IsBoolean() requiresProof?: boolean
  @IsOptional() @IsBoolean() needsRating?: boolean
  @IsOptional() audience?: unknown
}

class TaskPatchDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string
  // null = من غير وصف أو من غير موعد
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(2000) description?: string | null
  @IsOptional() @IsInt() @Min(1) assigneeEmployeeId?: number
  @IsOptional() @IsIn([...FUNCTIONAL_APPROVER_ROLES]) assigneeRole?: string
  @IsOptional() @IsInt() @Min(1) branchId?: number
  @IsOptional() @ValidateIf((_, value) => value !== null) @Matches(DATE) dueDate?: string | null
  @IsOptional() @IsIn([...TASK_PRIORITIES]) priority?: string
  @IsOptional() @IsBoolean() requiresProof?: boolean
  @IsOptional() @IsBoolean() needsRating?: boolean
}

// إضافة المالك 6 أكتوبر: طلب تمديد الميعاد وقراره، وتقييم المهمة
class TaskExtensionDto {
  @Matches(DATE) dueDate: string
  @IsString() @MinLength(3) @MaxLength(500) reason: string
}

class TaskExtensionDecisionDto {
  @IsBoolean() approve: boolean
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

class TaskRatingDto {
  @IsInt() @Min(1) @Max(5) rating: number
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

class TaskStatusDto {
  @IsIn([...TASK_STATUSES]) status: string
  @IsOptional() @IsString() @MaxLength(500) note?: string
  @IsOptional() @IsString() @MaxLength(1000) proofNote?: string
  @IsOptional() @IsInt() @Min(1) proofFileId?: number
}

@RequireModule('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @AllowPreboarding()
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.tasks.mine(user)
  }

  @AllowPreboarding()
  @Get('mine/count')
  mineCount(@CurrentUser() user: JwtPayload) {
    return this.tasks.mineCount(user)
  }

  @Get('team')
  team(@CurrentUser() user: JwtPayload) {
    return this.tasks.team(user)
  }

  @Get('assignees')
  assignees(@CurrentUser() user: JwtPayload) {
    return this.tasks.assignees(user)
  }

  @Get()
  @Perm('tasks.view_all')
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('overdue') overdue?: string,
    @Query('assigneeEmployeeId') assigneeEmployeeId?: string, @Query('branchId') branchId?: string) {
    return this.tasks.list(user, { status, overdue, assigneeEmployeeId, branchId })
  }

  // تقرير الالتزام: الفحص في الخدمة (صاحب «عرض كل المهام» في نطاقه، وغيره على مهام فريقه واللي كلّف بيه)
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.tasks.report(user, { from, to })
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: TaskDto) {
    return this.tasks.create(user, dto)
  }

  // B-ADD.1: المهمة الجماعية — نفس المهمة لكل موظف في جمهور بالاستهداف الموحد (الفحص في الخدمة: «إدارة المهام» أو «تكليف أي موظف»، بنطاقه)
  @Post('group')
  createForGroup(@CurrentUser() user: JwtPayload, @Body() dto: TaskGroupDto) {
    return this.tasks.createForGroup(user, dto)
  }

  @AllowPreboarding()
  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.detail(user, id)
  }

  // سجل المهمة (إضافة المالك 6 أكتوبر): سطر لكل تغيير، للي يشوف المهمة (الفحص في الخدمة)
  @Get(':id/log')
  log(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.log(user, id)
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TaskPatchDto) {
    return this.tasks.update(user, id, dto)
  }

  @AllowPreboarding()
  @Post(':id/status')
  setStatus(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TaskStatusDto) {
    return this.tasks.setStatus(user, id, dto)
  }

  // المسؤول بيطلب تمديد الميعاد، واللي بيدير المهمة بيرد (الفحص في الخدمة)
  @Post(':id/extension')
  requestExtension(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TaskExtensionDto) {
    return this.tasks.requestExtension(user, id, dto)
  }

  @Post(':id/extension/decision')
  decideExtension(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TaskExtensionDecisionDto) {
    return this.tasks.decideExtension(user, id, dto)
  }

  // تقييم اللي كلّف بالمهمة بعد ما تخلص (الميزة الفرعية tasks.rating، والفحص في الخدمة)
  @Post(':id/rating')
  rate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TaskRatingDto) {
    return this.tasks.rate(user, id, dto)
  }
}
