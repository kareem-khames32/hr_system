import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestsModule } from '../requests/requests.module'
import { CommentsModule } from '../comments/comments.module'
import { AnnouncementsModule } from '../announcements/announcements.module'
import { AttendanceModule } from '../attendance/attendance.module'
import { AttendanceDay, AttendancePunch, PermissionType } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { EmployeesModule } from '../employees/employees.module'
import { Branch } from '../org/entities/branch.entity'
import { Team } from '../org/entities/team.entity'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'
import {
  EmployeeStatusHistory,
  Transfer,
} from '../requests/entities/employment.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { Leave, LeaveBalance } from '../requests/entities/leave.entities'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import {
  AssetType,
  BiometricDevice,
  CostCenter,
  Candidate,
  DocType,
  EmployeeDocument,
  Grade,
  JobTitle,
  PublicHoliday,
  Shift,
  WorkSchedule,
} from './assets.entities'
import { AssetsController } from './assets.controller'
import { CandidatesController } from './candidates.controller'
import { CatalogsController } from './catalogs.controller'
import { DocsController } from './docs.controller'
import { EmployeeExtrasController } from './employee-extras.controller'
import { PortalController } from './portal.controller'
import { DocTypesDefaultsService } from './doc-types-defaults.service'
import { NotificationRead } from './notification-read.entity'
import { Department } from '../org/entities/department.entity'
import { HiringDocumentReminder } from './hiring-document-reminder.entity'
import { HiringDocumentsController } from './hiring-documents.controller'
import { RecruitmentModule } from '../recruitment/recruitment.module'

// الملحقات: العهدة/المستندات/الكتالوجات/المرشحون/النقل/التقويم/الإشعارات
@Module({
  imports: [
    EmployeesModule,
    RequestsModule,
    CommentsModule, // B2.8: قايمة الإشعارات بتحكم إشعار الإشارة بحق قراءة تعليقه
    AnnouncementsModule, // B2.16: و«إعلان جديد» بإن الإعلان لسه ساري والحساب في جمهوره
    AttendanceModule, // لإعادة حساب الأيام بعد تعديل وردية في الكتالوج
    RecruitmentModule, // B3.3-أ: المرشح على وظيفة شاغرة (candidates.controller)
    TypeOrmModule.forFeature([
      Asset,
      CustodyAssignment,
      EmployeeDocument,
      PublicHoliday,
      Shift,
      WorkSchedule,
      BiometricDevice,
      JobTitle,
      Grade,
      AssetType,
      DocType,
      CostCenter,
      Candidate,
      Employee,
      Team,
      Branch,
      Transfer,
      EmployeeStatusHistory,
      Leave,
      LeaveBalance,
      Loan,
      LoanInstallment,
      Request,
      RequestType,
      RequestApproval,
      AttendancePunch,
      AttendanceDay,
      PermissionType,
      NotificationRead, // حالة الإشعارات لكل مستخدم (مقروء/محذوف)
      HiringDocumentReminder, // تذكيرات «مسوغات التعيين» (ترحيل 075)
      Department,
    ]),
  ],
  controllers: [
    AssetsController,
    DocsController,
    CatalogsController,
    CandidatesController,
    EmployeeExtrasController,
    PortalController,
    HiringDocumentsController,
  ],
  providers: [DocTypesDefaultsService],
})
export class ExtrasModule {}
