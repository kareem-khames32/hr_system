import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequestCategoryChainsService } from './request-category-chains.service'

class SetCategoryChainDto {
  // سلسلة موجودة للفئة، أو null = الفئة من غير سلسلة (كل طلب بسلسلته)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'السلسلة المختارة غير صحيحة' })
  chainId?: number | null

  // أو سلسلة جديدة للفئة بنسخ خطوات السلسلة دي (ونسخ فروعها)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'السلسلة اللي بتنسخ منها غير صحيحة' })
  @Min(1, { message: 'السلسلة اللي بتنسخ منها غير صحيحة' })
  copyFromChainId?: number

  // اسم السلسلة الجديدة (الافتراضي «سلسلة <الفئة>»)
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'اسم السلسلة 3 حروف على الأقل' })
  @MaxLength(200)
  nameAr?: string

  // أنواع من نفس الفئة تتنقل للسلسلة (الماشيين على سلسلة الفئة القديمة بيتنقلوا لوحدهم)
  @IsOptional()
  @IsArray({ message: 'الطلبات اللي هتتنقل لازم تكون قائمة' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'اختيار غير صحيح في الطلبات' })
  repointTypeIds?: number[]
}

// ===== سلسلة اعتماد لكل فئة جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر) =====
// القراءة لأي حد من الاتنين؛ الكتابة محتاجة الصلاحيتين (بتتفحص جوّه الخدمة)، وربط الفئة إعداد لكل الشركة.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class RequestCategoryChainsController {
  constructor(private readonly service: RequestCategoryChainsService) {}

  // سلسلة كل فئة + وضع كل نوع (ماشي على الفئة/سلسلة خاصة) + عدد طلباته وآخر طلب
  @Perm('request_types.manage', 'approval_chains.manage')
  @Get('request-categories')
  map(@CurrentUser() user: JwtPayload) {
    return this.service.map(user)
  }

  // اختيار/تغيير/شيل سلسلة الفئة — الماشيين عليها بيتنقلوا معاها في نفس المعاملة
  @Perm('request_types.manage', 'approval_chains.manage')
  @Put('request-categories/:category/chain')
  setCategoryChain(
    @CurrentUser() user: JwtPayload,
    @Param('category') category: string,
    @Body() dto: SetCategoryChainDto
  ) {
    return this.service.setCategoryChain(user, category, dto)
  }

  // «خصّص سلسلة للطلب ده»
  @Perm('request_types.manage', 'approval_chains.manage')
  @Post('request-types/:id/customize-chain')
  customizeChain(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.customizeType(user, id)
  }

  // «رجّعه لسلسلة الفئة»
  @Perm('request_types.manage', 'approval_chains.manage')
  @Post('request-types/:id/follow-category')
  followCategory(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.followCategory(user, id)
  }
}
