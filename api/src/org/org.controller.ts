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

  // ===== الفروع — القراءة بنطاق المستخدم، والتعديل للأدمن/HR فقط =====
  @Get('branches')
  branches(@CurrentUser() user: JwtPayload) {
    return this.org.findBranches(branchScopeOf(user))
  }

  @Post('branches')
  @Perm('org.manage')
  createBranch(@Body() dto: CreateBranchDto) {
    return this.org.createBranch(dto)
  }

  @Patch('branches/:id')
  @Perm('org.manage')
  updateBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto
  ) {
    return this.org.updateBranch(id, dto)
  }

  // ===== الأقسام =====
  @Get('departments')
  departments(@CurrentUser() user: JwtPayload) {
    return this.org.findDepartments(branchScopeOf(user))
  }

  @Post('departments')
  @Perm('org.manage')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.org.createDepartment(dto)
  }

  @Patch('departments/:id')
  @Perm('org.manage')
  updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto
  ) {
    return this.org.updateDepartment(id, dto)
  }

  // ===== الفرق =====
  @Get('teams')
  teams(@CurrentUser() user: JwtPayload) {
    return this.org.findTeams(branchScopeOf(user))
  }

  @Post('teams')
  @Perm('org.manage')
  createTeam(@Body() dto: CreateTeamDto) {
    return this.org.createTeam(dto)
  }

  @Patch('teams/:id')
  @Perm('org.manage')
  updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto
  ) {
    return this.org.updateTeam(id, dto)
  }
}
