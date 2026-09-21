import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common'
import { Allow, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PAYROLL_CHAIN_MANAGE_PERMISSION } from './payroll-approval-chain'
import { PayrollApprovalChainService } from './payroll-approval-chain.service'

// الخطوات والسبب يُتحقق منهما في الخدمة برسائل عربية ورموز (لا نص class-validator الإنجليزي)
class PayrollChainSaveDto {
  @Allow() steps?: unknown
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) expectedRevision?: number
}
class PayrollSeriesChainSaveDto extends PayrollChainSaveDto {
  @Allow() seriesName?: unknown
}
class PayrollChainRejectDto {
  @Allow() reason?: unknown
}
class PayrollApproverSearchDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollApprovalChainController {
  constructor(private readonly service: PayrollApprovalChainService) {}

  // ===== إعداد السلاسل: سلسلة الشركة + سلسلة خاصة بمسير دائم =====
  @Perm(PAYROLL_CHAIN_MANAGE_PERMISSION)
  @Get('approval-chain/config')
  config(@CurrentUser() user: JwtPayload) {
    return this.service.config(user)
  }

  @Perm(PAYROLL_CHAIN_MANAGE_PERMISSION)
  @Get('approval-chain/approvers')
  approvers(@CurrentUser() user: JwtPayload, @Query() query: PayrollApproverSearchDto) {
    return this.service.approvers(user, query.search)
  }

  @Perm(PAYROLL_CHAIN_MANAGE_PERMISSION)
  @Put('approval-chain/config/company')
  saveCompany(@CurrentUser() user: JwtPayload, @Body() dto: PayrollChainSaveDto) {
    return this.service.saveCompanyChain(user, dto)
  }

  // قائمة خطوات فاضية = شيل السلسلة الخاصة فيرجع المسير لسلسلة الشركة
  @Perm(PAYROLL_CHAIN_MANAGE_PERMISSION)
  @Put('approval-chain/config/series')
  saveSeries(@CurrentUser() user: JwtPayload, @Body() dto: PayrollSeriesChainSaveDto) {
    return this.service.saveSeriesChain(user, dto)
  }

  // ===== المعتمد: بلا @Perm — التسمية في السلسلة هي المنحة والخدمة هي اللي بتحكم =====
  @Get('approval-chain/my-pending')
  myPending(@CurrentUser() user: JwtPayload) {
    return this.service.myPending(user)
  }

  @Get('approval-chain/my-pending/count')
  myPendingCount(@CurrentUser() user: JwtPayload) {
    return this.service.myPendingCount(user)
  }

  @Get('approval-chain/runs/:id/review')
  review(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.review(user, id)
  }

  @Get('runs/:id/approval-chain')
  runChain(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.runChain(user, id)
  }

  @Post('runs/:id/approval-chain/approve')
  approveStep(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.approveStep(user, id)
  }

  @Post('runs/:id/approval-chain/reject')
  rejectStep(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollChainRejectDto) {
    return this.service.rejectStep(user, id, dto.reason)
  }
}
