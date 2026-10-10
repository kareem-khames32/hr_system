import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { RequireModule } from '../modules-registry/module.guard'

// صلاحيات عرض الشاشات اللي فيها الفلتر الموحد (الموظفين والمستندات والعهد والنقل وإنهاء الخدمة والحضور والاستثناءات والإجازات
// والأرصدة والمسير والصرف والخصومات والمكافآت والطلبات والتقارير والمستخدمين)
export const ORG_FILTER_VIEW_PERMS = [
  'employees.view', 'documents.manage', 'custody.assign', 'transfers.view', 'offboarding.manage', 'attendance.view_all',
  'attendance_exemption.view', 'leaves.view_all', 'leave_balances.manage', 'payroll.view', 'payroll.disburse', 'deductions.view',
  'bonuses.view', 'requests.view_all', 'reports.view', 'users.manage',
]

// B-ADD.1: صلاحيات الشاشات اللي بتحدد جمهور بالاستهداف الموحد (يكفي واحدة): بتاخد شجرة النطاق وأسماء موظفينه ومعاينة الجمهور
export const ORG_AUDIENCE_PERMS = [
  'announcements.manage', 'policies.manage', 'helpdesk.manage', 'surveys.manage', 'settings.modules', 'settings.manage',
  'performance.manage', 'training.manage', 'tasks.manage', 'tasks.assign_any', 'employees.view',
  // B-ADD.2: فترات الإضافي (attendance.manage) والعطلات الرسمية (settings.manage فوق)
  'attendance.manage',
]

@RequireModule('org')
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

  // ===== فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد في كل شاشة فيها موظفين (طلب المالك 30 سبتمبر) =====
  // الشجرة ومكان كل موظف بنطاق فروع الحساب — لأي حساب عنده صلاحية عرض شاشة من الشاشات اللي بتستخدمه (يكفي واحدة)
  @Get('org/filter-context')
  @Perm(...ORG_FILTER_VIEW_PERMS)
  filterContext(@CurrentUser() user: JwtPayload) {
    return this.org.filterContext(branchScopeOf(user))
  }

  // ===== B-ADD.1: الاستهداف الموحد «على مين؟» (الشركة ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم + استثناء) =====
  // اللي بيحدد جمهور (إعلان، سياسة، مقال، استبيان، موديول، دورة، مهمة…) بياخد شجرة نطاقه وموظفينه الحاليين بأسمائهم عشان يختار
  // ويستثني بالاسم — بنطاق فروعه بس (الخادم هو اللي بيفرض النطاق).
  @Get('org/audience-context')
  @Perm(...ORG_AUDIENCE_PERMS)
  audienceContext(@CurrentUser() user: JwtPayload) {
    return this.org.audienceContext(branchScopeOf(user))
  }

  // المعاينة قبل الحفظ: «N موظف» وأسماؤهم بنفس المقيّم اللي هيحكم بعد الحفظ، وجوه نطاق فروع الحساب. الجسم خام والحكم في الخدمة
  @Post('org/audience-preview')
  @HttpCode(200)
  @Perm(...ORG_AUDIENCE_PERMS)
  audiencePreview(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    return this.org.audiencePreview(branchScopeOf(user), raw.audience)
  }

  // ===== الفرق =====
  @Get('teams')
  teams(@CurrentUser() user: JwtPayload) {
    return this.org.findTeams(branchScopeOf(user))
  }

  // B1.11 / D12: الموظفين اللي مديرهم المسجل غير قائد فريقهم (عرض بس، بنطاق الحساب)
  @Get('teams/manager-mismatches')
  @Perm('org.manage', 'employees.view')
  managerLeaderMismatches(@CurrentUser() user: JwtPayload) {
    return this.org.managerLeaderMismatches(branchScopeOf(user))
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
