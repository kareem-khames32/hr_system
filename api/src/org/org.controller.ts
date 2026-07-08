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
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'

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
  createBranch(@Body() body: Partial<Branch>) {
    return this.org.createBranch(body)
  }

  @Patch('branches/:id')
  @Roles('super_admin', 'hr_manager')
  updateBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<Branch>
  ) {
    return this.org.updateBranch(id, body)
  }

  // ===== الأقسام =====
  @Get('departments')
  departments(@CurrentUser() user: JwtPayload) {
    return this.org.findDepartments(branchScopeOf(user))
  }

  @Post('departments')
  @Roles('super_admin', 'hr_manager')
  createDepartment(@Body() body: Partial<Department>) {
    return this.org.createDepartment(body)
  }

  // ===== الفرق =====
  @Get('teams')
  teams(@CurrentUser() user: JwtPayload) {
    return this.org.findTeams(branchScopeOf(user))
  }

  @Post('teams')
  @Roles('super_admin', 'hr_manager')
  createTeam(@Body() body: Partial<Team>) {
    return this.org.createTeam(body)
  }
}
