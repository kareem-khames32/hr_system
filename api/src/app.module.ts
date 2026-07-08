import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health/health.controller'
import { AuthModule } from './auth/auth.module'
import { OrgModule } from './org/org.module'
import { EmployeesModule } from './employees/employees.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // SQL Server المحلي
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '1433'), 10),
        username: config.get<string>('DB_USERNAME', 'sa'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'hr_system'),
        autoLoadEntities: true,
        // أول تشغيل فقط — بعدها false والاعتماد على DDL
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        options: {
          trustServerCertificate:
            config.get<string>('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
          encrypt: false, // سيرفر محلي
        },
      }),
    }),

    AuthModule,
    OrgModule,
    EmployeesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
