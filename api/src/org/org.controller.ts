import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Perm,
  RolesGuard,
} from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { OrgService } from './org.service'
import {
  CreateBranchDto,
  CreateDepartmentDto,
  CreateTeamDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateTeamDto,
} from './org.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OrgController {
  constructor(private readonly org: OrgService) {}

  // ===== الفروع — القراءة والتعديل كلاهما بنطاق المستخدم، والتعديل للأدمن/HR فقط =====
  @Get('branches')
  branches(@CurrentUser() user: JwtPayload) {
    return this.org.findBranches(branchScopeOf(user))
  }

  @Post('branches')
  @Perm('org.manage')
  createBranch(@CurrentUser() user: JwtPayload, @Body() dto: CreateBranchDto) {
    return this.org.createBranch(dto, branchScopeOf(user), user.sub)
  }

  @Patch('branches/:id')
  @Perm('org.manage')
  updateBranch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto
  ) {
    return this.org.updateBranch(id, dto, branchScopeOf(user), user.sub)
  }

  // ===== الأقسام =====
  @Get('departments')
  departments(@CurrentUser() user: JwtPayload) {
    return this.org.findDepartments(branchScopeOf(user))
  }

  @Post('departments')
  @Perm('org.manage')
  createDepartment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDepartmentDto
  ) {
    return this.org.createDepartment(dto, branchScopeOf(user))
  }

  @Patch('departments/:id')
  @Perm('org.manage')
  updateDepartment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto
  ) {
    return this.org.updateDepartment(id, dto, branchScopeOf(user))
  }

  // ===== الفرق =====
  @Get('teams')
  teams(@CurrentUser() user: JwtPayload) {
    return this.org.findTeams(branchScopeOf(user))
  }

  @Post('teams')
  @Perm('org.manage')
  createTeam(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeamDto) {
    return this.org.createTeam(dto, branchScopeOf(user))
  }

  @Patch('teams/:id')
  @Perm('org.manage')
  updateTeam(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto
  ) {
    return this.org.updateTeam(id, dto, branchScopeOf(user))
  }
}
