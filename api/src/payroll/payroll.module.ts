import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import {
  EmployeeObligation,
  Loan,
  LoanInstallment,
} from '../requests/entities/financial.entities'
import { Leave } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun } from './payroll.entities'
import { PayrollController } from './payroll.controller'
import { PayrollService } from './payroll.service'
import { ObligationsController } from './obligations.controller'
import { ObligationsService } from './obligations.service'

@Module({
  imports: [
    AttendanceModule,
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollItem,
      Employee,
      AttendanceDay,
      OvertimeEntry,
      Leave,
      Loan,
      LoanInstallment,
      EmployeeObligation,
      RequestsConfig,
    ]),
  ],
  controllers: [PayrollController, ObligationsController],
  providers: [PayrollService, ObligationsService],
})
export class PayrollModule {}
