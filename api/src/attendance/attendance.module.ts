import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BiometricDevice, PublicHoliday, Shift, WorkSchedule } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { AttendanceCorrection, OvertimeEntry } from '../requests/entities/attendance.entities'
import { OvertimeDayClaim, OvertimeEntryEvent } from '../requests/entities/overtime-workflow.entities'
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
import { AttendanceScheduler } from './attendance-scheduler.service'
import { DeviceSyncService } from './device-sync.service'
import { AttendanceExemption, AttendanceExemptionEvent } from './attendance-exemption.entities'
import { AttendanceExemptionsController } from './attendance-exemptions.controller'
import { AttendanceExemptionsService } from './attendance-exemptions.service'
import { AttendanceRuleVersion } from './attendance-rule.entities'
import { AttendanceRuleController } from './attendance-rule.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendancePunch,
      ScheduleEntry,
      AttendanceDay,
      Employee,
      OvertimeEntry,
      OvertimeDayClaim,
      OvertimeEntryEvent,
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
      AttendanceExemption,
      AttendanceExemptionEvent,
      AttendanceRuleVersion,
    ]),
  ],
  controllers: [AttendanceController, AttendanceExemptionsController, AttendanceRuleController],
  providers: [AttendanceService, DeviceSyncService, AttendanceScheduler, AttendanceExemptionsService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
