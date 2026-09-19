import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { EmployeeObligation } from './entities/financial.entities'
import { RequestsConfig } from './entities/requests-config.entity'
import { LeaveYearEndController } from './leave-year-end.controller'
import { LeaveBalanceSettlement } from './leave-year-end.entity'
import { LeaveYearEndService } from './leave-year-end.service'
import { RequestsModule } from './requests.module'

// شاشة «إقفال سنة الإجازات»: المعاينة والتسوية والإقفال فوق خدمة الأرصدة (من وحدة الطلبات)
@Module({
  imports: [RequestsModule, TypeOrmModule.forFeature([LeaveBalanceSettlement, Employee, EmployeeObligation, RequestsConfig])],
  controllers: [LeaveYearEndController],
  providers: [LeaveYearEndService],
})
export class LeaveYearEndModule {}
