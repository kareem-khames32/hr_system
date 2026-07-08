import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards'
import { RequestsService } from './requests.service'

class CreateRequestDto {
  @IsString()
  typeCode: string

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>

  @IsOptional()
  submit?: boolean
}

class ActDto {
  @IsIn(['APPROVE', 'REJECT', 'RETURN'])
  action: 'APPROVE' | 'REJECT' | 'RETURN'

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string
}

class ResubmitDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  // كتالوج الأنواع — لبناء شاشة «طلب جديد»
  @Get('types')
  catalog() {
    return this.service.catalog()
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  // صندوق الموافقات: المنتظر فعلي حسب دوره
  @Get('inbox')
  inbox(@CurrentUser() user: JwtPayload) {
    return this.service.inbox(user)
  }

  @Get(':id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.detail(user, id)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.service.create(user, dto)
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.submit(user, id)
  }

  @Post(':id/act')
  act(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActDto
  ) {
    return this.service.act(user, id, dto)
  }

  @Post(':id/resubmit')
  resubmit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResubmitDto
  ) {
    return this.service.resubmit(user, id, dto.payload)
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.cancel(user, id)
  }

  // تأكيد استلام العهدة — السجل الملزِم قانونياً
  @Post('custody/:assignmentId/acknowledge')
  acknowledge(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.acknowledgeCustody(user, assignmentId)
  }

  // تشغيل يدوي لمحركي التصعيد والنقل المجدول (للأدمن — والـ cron يشغلهما تلقائياً)
  @Roles('super_admin', 'hr_manager')
  @Post('engine/run-escalations')
  runEscalations() {
    return this.service.runEscalations()
  }

  @Roles('super_admin', 'hr_manager')
  @Post('engine/run-scheduled-transfers')
  runScheduledTransfers() {
    return this.service.runScheduledTransfers()
  }
}
