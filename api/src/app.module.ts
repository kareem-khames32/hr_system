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
import { DashboardController } from './dashboard/dashboard.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
  ],
  controllers: [HealthController, DashboardController],
})
export class AppModule {}
