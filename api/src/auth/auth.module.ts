import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { DirectoryService } from './directory.service'
import { DomainLoginService } from './domain-login.service'
import { JwtStrategy } from './jwt.strategy'
import { LoginChallenge } from './login-challenge.entity'
import { MailService } from './mail.service'
import { Role, UserPermissionOverride } from './role.entity'
import { RolesController } from './roles.controller'
import { TwoFactorService } from './two-factor.service'
import { User } from './user.entity'
import { UsersController } from './users.controller'
import { jwtLifetimeSeconds } from './jwt-secret'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Employee,
      Branch,
      Role,
      UserPermissionOverride,
      // التحقق بخطوتين: حالة الدخول المعلَّقة + مفتاح الفتح/القفل في requests_config
      LoginChallenge,
      RequestsConfig,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // بلا قيمة افتراضية — validateEnv يضمن وجوده وطوله وقت الإقلاع
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: jwtLifetimeSeconds(config.get<string>('JWT_EXPIRES_IN', '8h')),
        },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, RolesController],
  // DirectoryService و MailService نسختين واحدتين: الاختبارات بتستبدل authenticate/send عليهما
  // بـ app.get(...) فمفيش اتصال LDAP ولا SMTP حقيقي في أي اختبار
  providers: [AuthService, JwtStrategy, DirectoryService, MailService, TwoFactorService, DomainLoginService],
  exports: [AuthService, DirectoryService, MailService, TwoFactorService],
})
export class AuthModule {}
