import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { BonusBulkPreviewDto, BonusBulkSubmitDto, BonusDecisionDto, BonusListQueryDto, BonusReverseDto, BonusTypeDto, CreateBonusDto } from './bonuses.dto'
import { BonusesService } from './bonuses.service'

// C4 / الخطوة 27: المكافآت — الاقتراح للمدير الهيكلي على مرؤوسيه (مباشر/فريق/قسم/فرع) ولحامل bonuses.manage في نطاق فرعه،
// والقرار الأخير للموارد البشرية. الفحص الحقيقي للنطاق والسقف والخطوة داخل الخدمة.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bonuses')
export class BonusesController {
  constructor(private readonly service: BonusesService) {}

  // الكتالوج الكامل (الأكواد والقيم والسقوف وسلاسل الاعتماد) إعداد، مش قائمة اختيار: لحامل «إدارة أنواع المكافآت» بس
  // (تدقيق الأدوار D9 — كان مفتوحًا لأي حساب). نموذج الطلب بياخد أنواعه من creatable/candidates بنطاق صاحبه.
  @Perm('bonuses.manage')
  @Get('types')
  types(@CurrentUser() user: JwtPayload, @Query('includeInactive') includeInactive?: string) {
    return this.service.listTypes(user, includeInactive === 'true')
  }

  @Perm('bonuses.manage')
  @Post('types')
  createType(@CurrentUser() user: JwtPayload, @Body() dto: BonusTypeDto) {
    return this.service.createType(user, dto)
  }

  @Perm('bonuses.manage')
  @Patch('types/:id')
  updateType(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusTypeDto) {
    return this.service.updateType(user, id, dto)
  }

  @Get('creatable')
  creatable(@CurrentUser() user: JwtPayload) {
    return this.service.creatable(user)
  }

  @Get('candidates')
  candidates(@CurrentUser() user: JwtPayload, @Query('typeId') typeId?: string) {
    if (typeId !== undefined && !/^[1-9]\d{0,9}$/.test(typeId)) throw new BadRequestException('نوع المكافأة غير صالح')
    return this.service.candidates(user, typeId === undefined ? undefined : Number(typeId))
  }

  // الموظف يرى مكافآته من لحظة الاقتراح بحالتها
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post('preview')
  preview(@CurrentUser() user: JwtPayload, @Body() dto: BonusBulkPreviewDto) {
    return this.service.preview(user, dto)
  }

  @Post('bulk')
  bulk(@CurrentUser() user: JwtPayload, @Body() dto: BonusBulkSubmitDto) {
    return this.service.bulkSubmit(user, dto)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBonusDto) {
    return this.service.create(user, dto)
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: BonusListQueryDto) {
    return this.service.list(user, query)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user, id)
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusDecisionDto) {
    return this.service.approve(user, id, dto)
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusDecisionDto) {
    return this.service.reject(user, id, dto)
  }

  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusDecisionDto) {
    return this.service.withdraw(user, id, dto)
  }

  @Perm('bonuses.manage')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusDecisionDto) {
    return this.service.cancel(user, id, dto)
  }

  // عكس المكافأة المصروفة بقيد استرداد في المسير التالي (نفس قواعد DD-12)
  @Perm('bonuses.manage')
  @Post(':id/reverse')
  reverse(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BonusReverseDto) {
    return this.service.reverse(user, id, dto)
  }
}
