import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  ScheduleEntry,
} from './attendance.entities'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunch,
      ScheduleEntry,
      AttendanceDay,
      Employee,
      OvertimeEntry,
      RequestsConfig,
      Leave,
      Request,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
