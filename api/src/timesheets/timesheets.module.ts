import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TimesheetEntry, TimesheetProject, TimesheetProjectTask, TimesheetWeek } from './timesheets'
import { TimesheetsController } from './timesheets.controller'
import { TimesheetsService } from './timesheets.service'

// B5.8: ساعات المشاريع — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: timesheets)
@Module({
  imports: [TypeOrmModule.forFeature([TimesheetProject, TimesheetProjectTask, TimesheetWeek, TimesheetEntry])],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
})
export class TimesheetsModule {}
