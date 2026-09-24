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

    AuthModule,
    OrgModule,
    EmployeesModule,
    // تحديث بيانات مجموعة موظفين من ملف Excel/CSV
    EmployeeBulkUpdateModule,
    RequestsModule,
    AttendanceModule,
    PayrollModule,
    SettingsModule,
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
  ],
  controllers: [HealthController, DashboardController, ReportsController, CostCenterReportController],
  providers: [CostCenterReportService],
})
export class AppModule {}
