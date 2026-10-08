import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { CasesService } from './cases.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class CaseDto {
  @IsOptional() kind?: unknown
  @IsOptional() title?: unknown
  @IsOptional() description?: unknown
  @IsOptional() complainantEmployeeId?: unknown
  @IsOptional() respondentEmployeeId?: unknown
}
class MemberDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() role?: unknown
}
class EventDto {
  @IsOptional() kind?: unknown
  @IsOptional() body?: unknown
  @IsOptional() employeeId?: unknown
}
class DecisionDto {
  @IsOptional() outcome?: unknown
  @IsOptional() note?: unknown
}
class ObjectionDto {
  @IsOptional() reason?: unknown
}

// B3.11: ملفات القضايا. فتح قضية يدويًا بصلاحية التحقيق؛ وكل اللي بعده بعضوية القضية نفسها (المطّلعين عليها بس — الفحص في الخدمة، وصاحب
// الصلاحية اللي مش متضاف = غير موجودة)؛ و«قضاياي» والاعتراض للموظف الطرف.
@RequireModule('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.cases.list(user)
  }

  @Perm('cases.investigate')
  @Post()
  open(@CurrentUser() user: JwtPayload, @Body() dto: CaseDto) {
    return this.cases.open(user, dto)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.cases.mine(user)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cases.detail(user, id)
  }

  @Post(':id/handlers')
  @HttpCode(200)
  addHandler(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MemberDto) {
    return this.cases.addHandler(user, id, dto.employeeId)
  }

  @Post(':id/investigator')
  @HttpCode(200)
  investigator(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MemberDto) {
    return this.cases.addHandler(user, id, dto.employeeId, true)
  }

  @Post(':id/parties')
  @HttpCode(200)
  addParty(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MemberDto) {
    return this.cases.addParty(user, id, dto)
  }

  @Post(':id/events')
  @HttpCode(200)
  addEvent(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: EventDto) {
    return this.cases.addEvent(user, id, dto)
  }

  @Post(':id/decision')
  @HttpCode(200)
  decide(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DecisionDto) {
    return this.cases.decide(user, id, dto)
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cases.close(user, id)
  }

  @Post(':id/objection')
  @HttpCode(200)
  object(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ObjectionDto) {
    return this.cases.object(user, id, dto.reason)
  }
}
