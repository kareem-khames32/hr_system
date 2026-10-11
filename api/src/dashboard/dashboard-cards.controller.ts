import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { DashboardCardsService } from './dashboard-cards.service'
import { DashboardModulesService } from './dashboard-modules.service'
import type { DashboardCardKey } from './dashboard-cards'

interface CardQuery {
  date?: string
  branchId?: string
  departmentIds?: string
  teamId?: string
  group?: string
  bucket?: string
}

// B-ADD.3: كروت لوحة الإدارة — مسار لكل كارت (كل كارت بيتحمّل لوحده، فالبطيء مايوقّفش الصفحة).
// الكل ورا «لوحة التحكم الإدارية»، وكل كارت فوقها بصلاحية شاشته وموديوله (requireCard): الموديول المقفول 404 والصلاحية الناقصة 403.
// النطاق من التوكن، وفلتر اللوحة الموحد (branchId وdepartmentIds وteamId) تضييق فوقه، وgroup = المستوى المفتوح (unit:12 · team:5 …).
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('dashboard.view_all')
@Controller('dashboard/cards')
export class DashboardCardsController {
  constructor(private readonly cards: DashboardCardsService, private readonly strip: DashboardModulesService) {}

  private async open(key: DashboardCardKey, user: JwtPayload, request: { originalUrl?: string; url?: string }, query: CardQuery) {
    await this.cards.requireCard(key, user, request.originalUrl ?? request.url ?? '')
    return this.cards.context(user, { branchId: query.branchId, departmentIds: query.departmentIds, teamId: query.teamId })
  }

  // الكروت اللي الحساب يشوفها، ويوم الشركة، وهل له مبالغ وأرقام تليفونات
  @Get()
  access(@CurrentUser() user: JwtPayload) {
    return this.cards.access(user)
  }

  // B-ADD.7: شريط الموديولات — أعداد بس، وكل بند بموديوله وصلاحية شاشته ونطاقها (الفحص في الخدمة لكل بند)
  @Get('modules')
  modules(@CurrentUser() user: JwtPayload, @Query() query: CardQuery) {
    return this.strip.strip(user, { branchId: query.branchId })
  }

  @Get('attendance')
  async attendance(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    const date = this.cards.dayOf(query.date)
    return this.cards.attendanceCard(await this.open('attendance', user, request, query), date, query.group)
  }

  // قايمة أسماء: بيانات موظفين — بنفس صلاحية شاشة الحضور
  @Get('attendance/employees')
  async attendanceEmployees(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    const date = this.cards.dayOf(query.date)
    return this.cards.attendanceEmployees(await this.open('attendance', user, request, query), date, query.group, query.bucket)
  }

  @Get('absent-late')
  async absentLate(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    const date = this.cards.dayOf(query.date)
    return this.cards.absentLateCard(await this.open('absentLate', user, request, query), date)
  }

  @Get('leaves')
  async leaves(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    const date = this.cards.dayOf(query.date)
    return this.cards.leavesCard(await this.open('leaves', user, request, query), date)
  }

  @Get('workforce')
  async workforce(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.workforceCard(await this.open('workforce', user, request, query), query.group)
  }

  // B-ADD.7: تعيينات مقابل خروج بالشهور — أعداد بس، بنفس صلاحية كارت القوى العاملة
  @Get('workforce/monthly')
  async workforceMonthly(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.workforceMonthly(await this.open('workforce', user, request, query))
  }

  @Get('requests')
  async requests(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.requestsCard(await this.open('requests', user, request, query))
  }

  @Get('tasks')
  async tasks(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.tasksCard(await this.open('tasks', user, request, query))
  }

  @Get('overtime')
  async overtime(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.overtimeCard(await this.open('overtime', user, request, query))
  }

  // كارت الفلوس: صلاحية عرض الرواتب (وموديول الرواتب) — من غيرها المسار نفسه مرفوض
  @Get('payroll')
  async payroll(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    return this.cards.payrollCard(await this.open('payroll', user, request, query))
  }

  @Get('trends')
  async trends(@CurrentUser() user: JwtPayload, @Req() request: any, @Query() query: CardQuery) {
    const date = this.cards.dayOf(query.date)
    return this.cards.trendsCard(await this.open('trends', user, request, query), date, query.group)
  }
}
