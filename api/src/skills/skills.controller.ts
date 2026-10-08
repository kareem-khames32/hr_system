import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { SkillsService } from './skills.service'

// القيم بتتفحص في الخدمة برسايلها
class SkillDto {
  @IsOptional() name?: unknown
  @IsOptional() category?: unknown
  @IsOptional() description?: unknown
  @IsOptional() isActive?: unknown
}
class RequirementsDto {
  @IsOptional() requirements?: unknown
}
class AssessmentDto {
  @IsOptional() level?: unknown
  @IsOptional() source?: unknown
  @IsOptional() validUntil?: unknown
}

// B5.4: «المهارات والإحلال» — موديول skills (مقفول افتراضيًا)
@RequireModule('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('skills')
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  // (أ) المكتبة — القراءة بصلاحية الموديول، والكتابة لحساب بكل الفروع
  @Perm('skills.manage')
  @Get('catalog')
  catalog(@CurrentUser() user: JwtPayload) {
    return this.service.catalog(user)
  }

  @Perm('skills.manage')
  @Post('catalog')
  createSkill(@CurrentUser() user: JwtPayload, @Body() dto: SkillDto) {
    return this.service.createSkill(user, dto)
  }

  @Perm('skills.manage')
  @Patch('catalog/:id')
  updateSkill(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SkillDto) {
    return this.service.updateSkill(user, id, dto)
  }

  // (أ) المهارات المطلوبة للوظائف المعتمدة في نطاق الحساب
  @Perm('skills.manage')
  @Get('positions')
  positions(@CurrentUser() user: JwtPayload) {
    return this.service.positions(user)
  }

  @Perm('skills.manage')
  @Put('positions/:positionId')
  setRequirements(@CurrentUser() user: JwtPayload, @Param('positionId', ParseIntPipe) positionId: number, @Body() dto: RequirementsDto) {
    return this.service.setRequirements(user, positionId, dto)
  }

  // (أ) مصفوفة الفجوة لموظفين نطاق الحساب
  @Perm('skills.manage')
  @Get('matrix')
  matrix(@CurrentUser() user: JwtPayload) {
    return this.service.matrix(user)
  }

  // مصفوفة مرؤوسي صاحب الحساب المباشرين — «المدير المباشر» موقع في الهيكل (الحكم في الخدمة)
  @Get('my-team')
  myTeam(@CurrentUser() user: JwtPayload) {
    return this.service.myTeam(user)
  }

  // فجوة صاحب الحساب هو
  @Get('my')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  // تقييم مهارة موظف — لصاحب الصلاحية في نطاقه أو لمديره المباشر (الحكم في الخدمة تحت قفل صف الموظف)
  @Put('employees/:employeeId/:skillId')
  assess(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number, @Param('skillId', ParseIntPipe) skillId: number, @Body() dto: AssessmentDto) {
    return this.service.assess(user, employeeId, skillId, dto)
  }
}
