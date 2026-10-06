// أول استيراد: تصليح دقة الأعمدة العشرية في متغير جدول الإخراج بتاع TypeORM على SQL Server — قبل أي استعلام
import './common/typeorm-mssql-output-precision'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health/health.controller'
import { AuthModule } from './auth/auth.module'
import { OrgModule } from './org/org.module'
import { EmployeesModule } from './employees/employees.module'
import { EmployeeBulkUpdateModule } from './employees/employee-bulk-update.module'
import { RequestsModule } from './requests/requests.module'
import { AttendanceModule } from './attendance/attendance.module'
import { PayrollModule } from './payroll/payroll.module'
import { SettingsModule } from './settings/settings.module'
import { BrandingModule } from './settings/branding.module'
import { ExtrasModule } from './assets/extras.module'
import { OffboardingModule } from './offboarding/offboarding.module'
import { OnboardingModule } from './onboarding/onboarding.module'
import { FilesModule } from './files/files.module'
import { HrDocumentsModule } from './hr-documents/hr-documents.module'
import { LoansModule } from './loans/loans.module'
import { LeaveYearEndModule } from './requests/leave-year-end.module'
import { DashboardController } from './dashboard/dashboard.controller'
import { ReportsController } from './reports/reports.controller'
import { CostCenterReportController } from './reports/cost-center-report.controller'
import { CostCenterReportService } from './reports/cost-center-report.service'
import { FinancialReportModule } from './reports/financial-report.module'
import { ModulesRegistryModule } from './modules-registry/modules-registry.module'
import { ScheduledJobsModule } from './scheduler/scheduled-jobs.module'
// B2.1: سجل التدقيق المركزي
import { AuditModule } from './audit/audit.module'
import { QueueModule } from './queue/queue.module'
import { NotificationsModule } from './notifications/notifications.module'
import { TasksModule } from './tasks/tasks.module'
import { PoliciesModule } from './policies/policies.module'
import { StatutoryModule } from './statutory/statutory.module'
import { validateEnv } from './auth/jwt-secret'
import { dbPacketSize } from './common/sql-packet-size'

@Module({
  imports: [
    // validateEnv: الإقلاع يفشل لو JWT_SECRET ناقص أو قصير (بلا قيمة افتراضية)
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    // قاعدة البيانات المحلية — DB_TYPE يحدد النوع: mssql أو mysql
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DB_TYPE', 'mssql') as 'mssql' | 'mysql'
        const common = {
          host: config.get<string>('DB_HOST', 'localhost'),
          port: parseInt(
            config.get<string>('DB_PORT', dbType === 'mysql' ? '3306' : '1433'),
            10
          ),
          username: config.get<string>(
            'DB_USERNAME',
            dbType === 'mysql' ? 'root' : 'sa'
          ),
          password: config.get<string>('DB_PASSWORD', ''),
          database: config.get<string>('DB_DATABASE', 'hr_system'),
          autoLoadEntities: true,
          // أول تشغيل فقط — بعدها false والاعتماد على DDL
          synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        }
        if (dbType === 'mysql') {
          return { type: 'mysql' as const, ...common }
        }
        return {
          type: 'mssql' as const,
          ...common,
          options: {
            trustServerCertificate:
              config.get<string>('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
            encrypt: false, // سيرفر محلي
            // حزمة 32 كيلو بدل 4: الاستعلام الطويل بيروح في حزمة واحدة بدل ما يقف ~48 مللي (common/sql-packet-size.ts)
            packetSize: dbPacketSize(config.get<string>('DB_PACKET_SIZE')),
          },
        }
      },
    }),

    ScheduleModule.forRoot(),

    // B1.4: كل مواعيد المهام المجدولة، وتشغيلها مرة واحدة بقفل وسجل، وشاشتها
    ScheduledJobsModule,
    AuditModule,
    // B2.3: الطابور والـoutbox (Global — أي موديول بيسجّل مستهلكه)
    QueueModule,

    // B1.5: القيم القانونية المؤرخة (مسار GOSI الجديد وحدود الأجر المصري) بشكل «حزمة الدولة»
    StatutoryModule,

    // تشغيل وقفل الموديولات: حارس عام بيرجّع 404 لمسارات الموديول المقفول (@RequireModule)، وGET /api/modules/enabled
    ModulesRegistryModule,

    AuthModule,
    OrgModule,
    EmployeesModule,
    // تحديث بيانات مجموعة موظفين من ملف Excel/CSV
    EmployeeBulkUpdateModule,
    RequestsModule,
    AttendanceModule,
    PayrollModule,
    SettingsModule,
    // اسم الشركة وشعارها بلا تسجيل دخول (GET /api/branding) — لصفحة الدخول والقائمة الجانبية
    BrandingModule,
    ExtrasModule,
    OffboardingModule,
    OnboardingModule,
    FilesModule,
    HrDocumentsModule,
    LoansModule,
    // إقفال سنة الإجازات: معاينة وتسوية رصيد موظف وإقفال السنة
    LeaveYearEndModule,
    // التقارير المالية لشهر الرواتب (كشف الرواتب، التكلفة، الخصومات، السلف، الإضافي)
    FinancialReportModule,
    // B2.4: محرك الإشعارات (بريد وإشعار مخزّن) — أول مستهلك للطابور
    NotificationsModule,
    TasksModule,
    // B2.7: مكتبة السياسات وبوابة الإقرار
    PoliciesModule,
  ],
  controllers: [HealthController, DashboardController, ReportsController, CostCenterReportController],
  providers: [CostCenterReportService],
})
export class AppModule {}
