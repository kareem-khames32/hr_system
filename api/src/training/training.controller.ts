import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { TrainingService } from './training.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class CourseDto {
  @IsOptional() name?: unknown
  @IsOptional() kind?: unknown
  @IsOptional() url?: unknown
  @IsOptional() durationHours?: unknown
  @IsOptional() provider?: unknown
  @IsOptional() description?: unknown
  @IsOptional() givesCertificate?: unknown
  @IsOptional() certificateValidMonths?: unknown
  @IsOptional() isActive?: unknown
}
class SessionDto {
  @IsOptional() courseId?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() startDate?: unknown
  @IsOptional() endDate?: unknown
  @IsOptional() location?: unknown
  @IsOptional() trainer?: unknown
  @IsOptional() capacity?: unknown
  @IsOptional() costPerSeat?: unknown
  @IsOptional() status?: unknown
}
class EnrollDto {
  @IsOptional() employeeIds?: unknown
}
class MarkDto {
  @IsOptional() status?: unknown
  @IsOptional() result?: unknown
}
class RateDto {
  @IsOptional() rating?: unknown
  @IsOptional() comment?: unknown
}

// B3.9: التدريب — الكتالوج والجلسات والتسجيل بصلاحية إدارة التدريب (والنطاق في الخدمة)؛ و«دوراتي» وتقييم التدريب للموظف نفسه
@RequireModule('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Perm('training.manage')
  @Get('courses')
  courses(@CurrentUser() user: JwtPayload) {
    return this.training.listCourses(user)
  }

  @Perm('training.manage')
  @Post('courses')
  createCourse(@CurrentUser() user: JwtPayload, @Body() dto: CourseDto) {
    return this.training.createCourse(user, dto)
  }

  @Perm('training.manage')
  @Patch('courses/:id')
  updateCourse(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CourseDto) {
    return this.training.updateCourse(user, id, dto)
  }

  @Perm('training.manage')
  @Get('sessions')
  sessions(@CurrentUser() user: JwtPayload) {
    return this.training.listSessions(user)
  }

  @Perm('training.manage')
  @Post('sessions')
  createSession(@CurrentUser() user: JwtPayload, @Body() dto: SessionDto) {
    return this.training.createSession(user, dto)
  }

  @Perm('training.manage')
  @Get('sessions/:id')
  session(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.training.sessionDetail(user, id)
  }

  @Perm('training.manage')
  @Patch('sessions/:id')
  updateSession(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SessionDto) {
    return this.training.updateSession(user, id, dto)
  }

  @Perm('training.manage')
  @Post('sessions/:id/enroll')
  @HttpCode(200)
  enroll(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: EnrollDto) {
    return this.training.enroll(user, id, dto.employeeIds)
  }

  @Perm('training.manage')
  @Post('enrollments/:id/mark')
  @HttpCode(200)
  mark(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MarkDto) {
    return this.training.mark(user, id, dto)
  }

  // B3.9-ب: شهادات التدريب بانتهائها
  @Perm('training.manage')
  @Get('certificates')
  certificates(@CurrentUser() user: JwtPayload) {
    return this.training.certificates(user)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.training.mine(user)
  }

  @Post('enrollments/:id/rate')
  @HttpCode(200)
  rate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RateDto) {
    return this.training.rate(user, id, dto)
  }
}
