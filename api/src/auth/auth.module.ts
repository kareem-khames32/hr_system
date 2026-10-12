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
import { SsoService } from './sso.service'
import { DomainLoginService } from './domain-login.service'
import { DomainSyncService } from './domain-sync.service'
import { EmployeeLoginAccountController } from './employee-login-account.controller'
import { JwtStrategy } from './jwt.strategy'
import { LoginChallenge } from './login-challenge.entity'
import { LoginEvent } from './login-event.entity'
import { LoginSecurityService } from './login-security.service'
import { MailService } from './mail.service'
import { Role, UserPermissionOverride } from './role.entity'
import { RolesController } from './roles.controller'
import { TwoFactorService } from './two-factor.service'
import { User } from './user.entity'
import { UserSession } from './user-session.entity'
import { UserSessionsService } from './user-sessions.service'
import { UserTotp } from './user-totp.entity'
import { TotpService } from './totp.service'
import { UsersController } from './users.controller'
import { jwtLifetimeSeconds } from './jwt-secret'
import { MailSessionService } from '../mailbox/mail-session.service'
import { MailVaultService } from '../mailbox/mail-vault.service'

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
      // أمان الدخول (B1.3): سجل الدخول
      LoginEvent,
      // B2.17-ب: الجلسات النشطة
      UserSession,
      // B2.17-ج: سر تطبيق المصادقة
      UserTotp,
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
  controllers: [AuthController, UsersController, RolesController,
    // كارت «مرتبط بحساب دخول» في ملف الموظف — قراءة بصلاحية الملف نفسه، مش users.manage
    EmployeeLoginAccountController],
  // DirectoryService و MailService نسختين واحدتين: الاختبارات بتستبدل authenticate/send عليهما
  // بـ app.get(...) فمفيش اتصال LDAP ولا SMTP حقيقي في أي اختبار
  providers: [AuthService, JwtStrategy, DirectoryService, MailService, TwoFactorService, DomainLoginService, LoginSecurityService, UserSessionsService, TotpService,
    // B6.4: الدخول المؤسسي (OIDC) — بيكلّم المزوّد ويرجّع هوية؛ المطابقة والجلسة في AuthService
    SsoService,
    // المزامنة الجماعية: نفس DomainLoginService للإنشاء والربط، فمفيش روتين إنشاء تاني
    DomainSyncService,
    // B-ADD.16: مخزن كلمة سر البريد للجلسة (نص مشفّر في الذاكرة، ومفتاحه مع المتصفح بس)، ونقط ربطه بالدخول والخروج
    MailVaultService, MailSessionService],
  // DomainSyncService مصدَّرة عشان إضافة الموظف (EmployeesModule) تزوّده بحساب دخول في لحظته
  // من **نفس** الخدمة — مفيش روتين إنشاء تاني في النظام
  exports: [AuthService, DirectoryService, MailService, TwoFactorService, DomainSyncService, LoginSecurityService, TotpService, MailVaultService, MailSessionService],
})
export class AuthModule {}
