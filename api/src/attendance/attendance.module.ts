import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BiometricDevice, PublicHoliday } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
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
      RequestsConfig,
      Leave,
      Request,
      BiometricDevice,
      Branch,
      PublicHoliday,
      ScheduleDayOverride,
      PermissionType,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, DeviceSyncService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
