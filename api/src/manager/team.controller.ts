import { Controller, Get, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { TeamService } from './team.service'

// B2.14: لوحة «فريقي» للمدير الهيكلي. من غير مفتاح صلاحية: الحكم في الخدمة بموقع الحساب في الهيكل (تحته حد ولا لأ)، فقائد فريق
// بدور «موظف» بيشوف فريقه بس، واللي مالوش حد تحته بياخد `manager: false` من غير أي بيانات. قراءة بس.
@RequireModule('manager')
@UseGuards(JwtAuthGuard)
@Controller('manager')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    return this.team.status(user)
  }

  @Get('team')
  overview(@CurrentUser() user: JwtPayload) {
    return this.team.overview(user)
  }
}
