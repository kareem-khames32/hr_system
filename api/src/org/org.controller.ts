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
  Roles,
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
  @Roles('super_admin', 'hr_manager')
  createBranch(@Body() dto: CreateBranchDto) {
    return this.org.createBranch(dto)
  }

  @Patch('branches/:id')
  @Roles('super_admin', 'hr_manager')
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
  @Roles('super_admin', 'hr_manager')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.org.createDepartment(dto)
  }

  @Patch('departments/:id')
  @Roles('super_admin', 'hr_manager')
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
  @Roles('super_admin', 'hr_manager')
  createTeam(@Body() dto: CreateTeamDto) {
    return this.org.createTeam(dto)
  }

  @Patch('teams/:id')
  @Roles('super_admin', 'hr_manager')
  updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto
  ) {
    return this.org.updateTeam(id, dto)
  }
}
