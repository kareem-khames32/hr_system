import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { Leave } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun } from './payroll.entities'
import { PayrollController } from './payroll.controller'
import { PayrollService } from './payroll.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollItem,
      Employee,
      AttendanceDay,
      OvertimeEntry,
      Leave,
      Loan,
      LoanInstallment,
      RequestsConfig,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
