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
// «دوام أيام العطلات»: أوامر الموارد البشرية وطلبات الموظفين المعتمدة → بدل في المسير
import { HolidayWorkOrder } from './holiday-work.entities'
import { HolidayWorkController } from './holiday-work.controller'
import { HolidayWorkService } from './holiday-work.service'

import { ScheduleRule, ScheduleViolation, ShiftCoverageRule } from './schedule-checks'
import { SchedulePublication, ShiftRotation } from './schedule-tools'
import { ScheduleToolsController } from './schedule-tools.controller'
import { ScheduleToolsService } from './schedule-tools.service'
import { ShiftSwapConsent } from './swap-consents'
import { SwapConsentsController } from './swap-consents.controller'
import { SwapConsentsService } from './swap-consents.service'

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
      HolidayWorkOrder,
      // B5.5: أدوات الجدولة (ميزة shifts.advanced، مقفولة افتراضيًا)
      ShiftRotation,
      SchedulePublication,
      ScheduleRule,
      ShiftCoverageRule,
      ScheduleViolation,
      ShiftSwapConsent,
    ]),
  ],
  controllers: [AttendanceController, AttendanceExemptionsController, AttendanceRuleController, HolidayWorkController, ScheduleToolsController, SwapConsentsController],
  providers: [AttendanceService, DeviceSyncService, AttendanceScheduler, AttendanceExemptionsService, HolidayWorkService, ScheduleToolsService, SwapConsentsService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
