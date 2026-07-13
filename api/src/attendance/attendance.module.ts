import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BiometricDevice, PublicHoliday, Shift, WorkSchedule } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { AttendanceCorrection, OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  OvertimePeriod,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
  ScheduleExceptionRule,
} from './attendance.entities'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { DeviceSyncService } from './device-sync.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunch,
      ScheduleEntry,
      AttendanceDay,
      Employee,
      OvertimeEntry,
      AttendanceCorrection,
      RequestsConfig,
      Leave,
      Request,
      BiometricDevice,
      Branch,
      PublicHoliday,
      ScheduleDayOverride,
      PermissionType,
      ScheduleExceptionRule,
      OvertimePeriod,
      WorkSchedule,
      Shift,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, DeviceSyncService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
