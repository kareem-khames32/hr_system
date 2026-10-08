import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { EmployeesModule } from '../employees/employees.module'
import { OrgModule } from '../org/org.module'
import { PerformanceModule } from '../performance/performance.module'
import { PayrollModule } from '../payroll/payroll.module'
import { PoliciesModule } from '../policies/policies.module'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestsModule } from '../requests/requests.module'
import { AiAssistController } from './ai-assist.controller'
import { AiAssistService } from './ai-assist.service'
import { AiProposalsService } from './ai-proposals.service'
import { AiAction } from './ai-rules'
import { AiToolsService } from './ai-tools.service'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'

// B6.6: الذكاء الاصطناعي — حوكمة (سجل ai_actions) ومساعد قراءة بأدوات فوق خدمات الشاشات القايمة. موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: ai)
@Module({
  imports: [TypeOrmModule.forFeature([AiAction, LeaveType]), RequestsModule, AttendanceModule, PayrollModule, PoliciesModule, EmployeesModule, OrgModule, PerformanceModule],
  controllers: [AiController, AiAssistController],
  providers: [AiService, AiToolsService, AiProposalsService, AiAssistService],
})
export class AiModule {}
