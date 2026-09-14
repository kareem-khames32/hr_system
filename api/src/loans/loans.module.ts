import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoansController } from './loans.controller'
import { LoanCapPolicy, LoanRecoveryBalance, LoanRecoveryEvent, LoanRepayment } from './loans.entities'
import { LoansService } from './loans.service'

// C6: السلف — السقوف والاستثناء والسداد المبكر والرصيد بعد الإنهاء ودفتر الموظف.
// منطق الطلبات والتصفية يستدعي دوال loan-request-caps/loan-recovery داخل معاملاتها مباشرة.
@Module({
  imports: [TypeOrmModule.forFeature([LoanCapPolicy, LoanRepayment, LoanRecoveryBalance, LoanRecoveryEvent])],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
