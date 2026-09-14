import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { DeactivateLoanCapPolicyDto, LoanCapPolicyDto, LoanCapPreviewQueryDto, LoanRecoveryCollectDto, LoanRecoveryWriteOffDto, LoanRepaymentDto } from './loans.dto'
import { LoansService } from './loans.service'

// C6 / الخطوة 29: سقوف السلف، السلفة الاستثنائية، السداد المبكر الجزئي، الرصيد بعد الإنهاء، ودفتر الموظف.
// GET /loans (قائمة الرواتب القديمة) يبقى في EmployeeExtrasController بصلاحية payroll.view.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  // دفتر الموظف نفسه فقط — بلا صلاحية ولا معرف من العميل
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) { return this.loans.myLoans(user) }

  // السقف الفعّال قبل التقديم (لنفسي، أو لموظف في النطاق لمن يملك صلاحية الموارد البشرية)
  @Get('cap-preview')
  capPreview(@CurrentUser() user: JwtPayload, @Query() query: LoanCapPreviewQueryDto) { return this.loans.capPreview(user, query) }

  @Perm('loans.policies', 'payroll.view')
  @Get('cap-policies')
  listPolicies() { return this.loans.listPolicies() }

  @Perm('loans.policies')
  @Post('cap-policies')
  createPolicy(@CurrentUser() user: JwtPayload, @Body() dto: LoanCapPolicyDto) { return this.loans.createPolicy(user, dto) }

  @Perm('loans.policies')
  @Post('cap-policies/:id/versions')
  createPolicyVersion(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LoanCapPolicyDto) {
    return this.loans.createPolicyVersion(user, id, dto)
  }

  @Perm('loans.policies')
  @Post('cap-policies/:id/deactivate')
  deactivatePolicy(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DeactivateLoanCapPolicyDto) {
    return this.loans.deactivatePolicy(user, id, dto.reason)
  }

  // المعتمد يرى لقطة التقديم مقابل السقف الآن وتنبيه تغيّر السياسة
  @Get('requests/:requestId/cap-review')
  capReview(@CurrentUser() user: JwtPayload, @Param('requestId', ParseIntPipe) requestId: number) { return this.loans.requestCapReview(user, requestId) }

  @Perm('payroll.view', 'loans.repay', 'loans.write_off')
  @Get('recoveries')
  listRecoveries(@CurrentUser() user: JwtPayload) { return this.loans.listRecoveries(user) }

  @Perm('loans.repay')
  @Post('recoveries/:id/collect')
  collectRecovery(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LoanRecoveryCollectDto) {
    return this.loans.collectRecovery(user, id, dto)
  }

  @Perm('loans.write_off')
  @Post('recoveries/:id/write-off')
  writeOffRecovery(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LoanRecoveryWriteOffDto) {
    return this.loans.writeOffRecovery(user, id, dto.reason)
  }

  // صاحب السلفة أو payroll.view في النطاق
  @Get(':id/ledger')
  ledger(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.loans.loanLedger(user, id) }

  @Perm('loans.repay')
  @Post(':id/repayments')
  repay(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LoanRepaymentDto) { return this.loans.repay(user, id, dto) }
}
