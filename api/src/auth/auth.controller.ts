import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { AuthService, JwtPayload } from './auth.service'
import { AllowPendingPasswordChange, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from './guards'

class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

// الدخول بحساب الشركة: sam أو DOMAIN\sam أو UPN كامل — التطبيع في DirectoryService
class DomainLoginDto {
  @IsString({ message: 'اكتب اسم المستخدم في الشركة' })
  @MinLength(1, { message: 'اكتب اسم المستخدم في الشركة' })
  @MaxLength(200)
  username: string

  @IsString({ message: 'اكتب كلمة المرور' })
  @MinLength(1, { message: 'اكتب كلمة المرور' })
  @MaxLength(400)
  password: string
}

class VerifyCodeDto {
  @IsString()
  @MinLength(8, { message: 'طلب الدخول مش معروف — ابدأ من جديد' })
  @MaxLength(200)
  challengeToken: string

  @IsString({ message: 'اكتب رمز التحقق' })
  @Matches(/^\d{6}$/, { message: 'رمز التحقق 6 أرقام' })
  code: string
}

class ResendCodeDto {
  @IsString()
  @MinLength(8, { message: 'طلب الدخول مش معروف — ابدأ من جديد' })
  @MaxLength(200)
  challengeToken: string
}

class MailTestDto {
  @IsEmail({}, { message: 'اكتب عنوان بريد صالح للفحص' })
  @MaxLength(200)
  to: string
}

class ChangePasswordDto {
  @IsString({ message: 'اكتب كلمة المرور الحالية' })
  @MinLength(1, { message: 'اكتب كلمة المرور الحالية' })
  @MaxLength(200)
  currentPassword: string

  @IsString({ message: 'اكتب كلمة المرور الجديدة' })
  @MinLength(8, { message: 'كلمة المرور الجديدة 8 حروف على الأقل' })
  @MaxLength(200, { message: 'كلمة المرور طويلة قوي' })
  newPassword: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password)
  }

  // ما تعرضه شاشة الدخول قبل أي مصادقة — هل زر «الدخول بحساب الشركة» يظهر. بلا أي تفصيل عن الخادم
  @Get('login/options')
  loginOptions() {
    return this.auth.loginOptions()
  }

  // «الدخول بحساب الشركة»: bind على Active Directory، وربط الموظف في لحظته (بلا إنشاء مسبق)
  @Post('login/domain')
  domainLogin(@Body() dto: DomainLoginDto) {
    return this.auth.domainLogin(dto.username, dto.password)
  }

  // الخطوة الثانية للمسارين: الرمز اللي وصل على البريد → الجلسة
  @Post('login/verify')
  @HttpCode(200)
  verify(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyTwoFactor(dto.challengeToken, dto.code)
  }

  // رمز جديد لنفس محاولة الدخول — بمهلة وبحد أعلى
  @Post('login/resend')
  @HttpCode(200)
  resend(@Body() dto: ResendCodeDto) {
    return this.auth.resendTwoFactor(dto.challengeToken)
  }

  // حالة الأمان (البريد مضبوط؟ المجال مضبوط؟ التحقق مفتوح؟) — لشاشة السياسات، بلا أي سر
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('settings.manage')
  @Get('security-status')
  securityStatus() {
    return this.auth.securityStatus()
  }

  // الفحص الذاتي قبل فتح التحقق بخطوتين: رمز تجريبي لعنوان واحد + رد خادم البريد بالحرف
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('settings.manage')
  @Post('mail-test')
  @HttpCode(200)
  mailTest(@Body() dto: MailTestDto) {
    return this.auth.sendTestCode(dto.to)
  }

  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user
  }

  // صاحب الحساب يغيّر كلمته — ومفتوح لتوكن «لازم يغيّر كلمة المرور المؤقتة»
  // الرد = جلسة جديدة (الإصدار زاد فالتوكن القديم بطل)
  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword)
  }
}
