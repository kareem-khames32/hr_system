import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { EmployeesModule } from '../employees/employees.module'
import { PayrollModule } from '../payroll/payroll.module'
import { PoliciesModule } from '../policies/policies.module'
import { RequestsModule } from '../requests/requests.module'
import { AiAction } from './ai-rules'
import { AiToolsService } from './ai-tools.service'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'

// B6.6: الذكاء الاصطناعي — حوكمة (سجل ai_actions) ومساعد قراءة بأدوات فوق خدمات الشاشات القايمة. موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: ai)
@Module({
  imports: [TypeOrmModule.forFeature([AiAction]), RequestsModule, AttendanceModule, PayrollModule, PoliciesModule, EmployeesModule],
  controllers: [AiController],
  providers: [AiService, AiToolsService],
})
export class AiModule {}
