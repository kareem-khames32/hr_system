import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health/health.controller'
import { AuthModule } from './auth/auth.module'
import { OrgModule } from './org/org.module'
import { EmployeesModule } from './employees/employees.module'
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
import { DashboardController } from './dashboard/dashboard.controller'
import { ReportsController } from './reports/reports.controller'
import { CostCenterReportController } from './reports/cost-center-report.controller'
import { CostCenterReportService } from './reports/cost-center-report.service'
import { validateEnv } from './auth/jwt-secret'

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
          },
        }
      },
    }),

    ScheduleModule.forRoot(),

    AuthModule,
    OrgModule,
    EmployeesModule,
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
  ],
  controllers: [HealthController, DashboardController, ReportsController, CostCenterReportController],
  providers: [CostCenterReportService],
})
export class AppModule {}
