import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import {
  CreateDeductionDto,
  DeductionBulkPreviewDto,
  DeductionBulkSubmitDto,
  DeductionDecisionDto,
  DeductionListQueryDto,
  DeductionObjectionDto,
  DeductionObligationDecisionDto,
  DeductionReportQueryDto,
  DeductionReverseDto,
  DeductionTypeDto,
} from './typed-deductions.dto'
import { TypedDeductionsService } from './typed-deductions.service'

// الخصومات المصنّفة: الإنشاء متاح للمدير الهيكلي (مباشر/فريق/قسم/فرع) بحسب نطاق النوع،
// ولحامل deductions.manage في نطاق فرعه. الفحص الحقيقي للنطاق والخطوة داخل الخدمة.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deductions')
export class TypedDeductionsController {
  constructor(private readonly service: TypedDeductionsService) {}

  @Get('types')
  types(@CurrentUser() user: JwtPayload, @Query('includeInactive') includeInactive?: string) {
    return this.service.listTypes(user, includeInactive === 'true')
  }

  @Perm('deductions.manage')
  @Post('types')
  createType(@CurrentUser() user: JwtPayload, @Body() dto: DeductionTypeDto) {
    return this.service.createType(user, dto)
  }

  @Perm('deductions.manage')
  @Patch('types/:id')
  updateType(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionTypeDto) {
    return this.service.updateType(user, id, dto)
  }

  @Get('creatable')
  creatable(@CurrentUser() user: JwtPayload) {
    return this.service.creatable(user)
  }

  @Get('candidates')
  candidates(@CurrentUser() user: JwtPayload, @Query('typeId') typeId?: string) {
    if (typeId !== undefined && !/^[1-9]\d{0,9}$/.test(typeId)) throw new BadRequestException('نوع الخصم غير صالح')
    return this.service.candidates(user, typeId === undefined ? undefined : Number(typeId))
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  // DD-13: تقارير الخصومات بنطاق المستخدم (قبل :id)
  @Get('reports')
  reports(@CurrentUser() user: JwtPayload, @Query() query: DeductionReportQueryDto) {
    return this.service.reports(user, query)
  }

  // DD-11 قاعدة 4: قرار الموارد البشرية على قسط معلق
  @Perm('deductions.manage')
  @Post('obligations/:obligationId/decision')
  decideSuspended(@CurrentUser() user: JwtPayload, @Param('obligationId', ParseIntPipe) obligationId: number, @Body() dto: DeductionObligationDecisionDto) {
    return this.service.decideSuspended(user, obligationId, dto)
  }

  @Post('preview')
  preview(@CurrentUser() user: JwtPayload, @Body() dto: DeductionBulkPreviewDto) {
    return this.service.preview(user, dto)
  }

  @Post('bulk')
  bulk(@CurrentUser() user: JwtPayload, @Body() dto: DeductionBulkSubmitDto) {
    return this.service.bulkSubmit(user, dto)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeductionDto) {
    return this.service.create(user, dto)
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: DeductionListQueryDto) {
    return this.service.list(user, query)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user, id)
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionDecisionDto) {
    return this.service.approve(user, id, dto)
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionDecisionDto) {
    return this.service.reject(user, id, dto)
  }

  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionDecisionDto) {
    return this.service.withdraw(user, id, dto)
  }

  @Perm('deductions.manage')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionDecisionDto) {
    return this.service.cancel(user, id, dto)
  }

  // DD-12: عكس المستهلك في مسير مصروف بقيد موجب
  @Perm('deductions.manage')
  @Post(':id/reverse')
  reverse(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionReverseDto) {
    return this.service.reverse(user, id, dto)
  }

  // DD-08: اعتراض الموظف على خصم عليه (الخدمة تتحقق أنه صاحب الخصم وضمن المهلة)
  @Post(':id/objection')
  object(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionObjectionDto) {
    return this.service.object(user, id, dto)
  }

  @Post(':id/objection-response')
  respondObjection(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeductionObjectionDto) {
    return this.service.respondObjection(user, id, dto)
  }
}
