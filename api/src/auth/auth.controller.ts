import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { AuthService, JwtPayload } from './auth.service'
import { AllowPendingPasswordChange, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from './guards'
import { jwtLifetimeSeconds } from './jwt-secret'
import { bearerTokenOf, sessionViaCookie } from './jwt.strategy'
import { clearedSessionCookieHeader, sessionCookieHeader, sessionCookieOf, sessionCookieOptions } from './session-cookie'
import { UserSessionsService } from './user-sessions.service'
import { RequireModule } from '../modules-registry/module.guard'
import { AllowDuringPolicyGate } from '../policies/policy-gate.decorator'

// B2.17: «جلسة cookie» بطلب العميل (الواجهة): التوكن في cookie httpOnly والرد من غيره. «تذكرني» = الـcookie بتفضل لآخر مدة
// الجلسة؛ من غيرها بتتمسح مع قفل المتصفح. من غير cookieSession الرد زي ما هو بالحرف (توكن في الجسم — السكربتات والاختبارات).
class SessionChoiceDto {
  @IsOptional()
  @IsBoolean({ message: 'cookieSession يقبل true أو false بس' })
  cookieSession?: boolean

  @IsOptional()
  @IsBoolean({ message: 'remember يقبل true أو false بس' })
  remember?: boolean
}

class LoginDto extends SessionChoiceDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

// الدخول بحساب الشركة: sam أو DOMAIN\sam أو UPN كامل — التطبيع في DirectoryService
class DomainLoginDto extends SessionChoiceDto {
  @IsString({ message: 'اكتب اسم المستخدم في الشركة' })
  @MinLength(1, { message: 'اكتب اسم المستخدم في الشركة' })
  @MaxLength(200)
  username: string

  @IsString({ message: 'اكتب كلمة المرور' })
  @MinLength(1, { message: 'اكتب كلمة المرور' })
  @MaxLength(400)
  password: string
}

class VerifyCodeDto extends SessionChoiceDto {
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

// «تذكرني» بس: شكل الجلسة الجديدة (cookie ولا توكن) هو شكل الجلسة اللي الطلب جه بيها
class ChangePasswordDto {
  @IsString({ message: 'اكتب كلمة المرور الحالية' })
  @MinLength(1, { message: 'اكتب كلمة المرور الحالية' })
  @MaxLength(200)
  currentPassword: string

  @IsString({ message: 'اكتب كلمة المرور الجديدة' })
  @MinLength(8, { message: 'كلمة المرور الجديدة 8 حروف على الأقل' })
  @MaxLength(200, { message: 'كلمة المرور طويلة قوي' })
  newPassword: string

  @IsOptional()
  @IsBoolean({ message: 'remember يقبل true أو false بس' })
  remember?: boolean
}

type CookieResponse = { setHeader(name: string, value: string): unknown }
type SessionRequest = { headers: Record<string, unknown>; method?: string; ip?: string }

@RequireModule('platform')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly sessions: UserSessionsService) {}

  /**
   * B2.17: تسليم الجلسة. جلسة cookie = التوكن في cookie httpOnly والرد من غير accessToken (سكربت الصفحة مايشوفوش)؛ غير كده، أو
   * رد مش جلسة (حالة التحقق بخطوتين المعلّقة)، الرد زي ما هو.
   */
  private deliver<T extends object>(res: CookieResponse, result: T, cookie: boolean, remember: boolean): T | Omit<T, 'accessToken'> {
    if (!cookie || typeof (result as { accessToken?: unknown }).accessToken !== 'string') return result
    const { accessToken, ...rest } = result as T & { accessToken: string }
    const lifetime = jwtLifetimeSeconds(this.config.get<string>('JWT_EXPIRES_IN', '8h'))
    res.setHeader('Set-Cookie', sessionCookieHeader(accessToken, sessionCookieOptions(), remember ? lifetime : null))
    return rest
  }

  // B1.3: الـIP والجهاز لسجل الدخول
  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: CookieResponse, @Headers('user-agent') userAgent?: string) {
    const cookie = dto.cookieSession === true
    return this.deliver(res, await this.auth.login(dto.email, dto.password, { ip, userAgent }, { cookie }), cookie, dto.remember === true)
  }

  // ما تعرضه شاشة الدخول قبل أي مصادقة — هل زر «الدخول بحساب الشركة» يظهر. بلا أي تفصيل عن الخادم
  @Get('login/options')
  loginOptions() {
    return this.auth.loginOptions()
  }

  // «الدخول بحساب الشركة»: bind على Active Directory، وربط الموظف في لحظته (بلا إنشاء مسبق)
  @Post('login/domain')
  async domainLogin(@Body() dto: DomainLoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: CookieResponse, @Headers('user-agent') userAgent?: string) {
    const cookie = dto.cookieSession === true
    return this.deliver(res, await this.auth.domainLogin(dto.username, dto.password, { ip, userAgent }, { cookie }), cookie, dto.remember === true)
  }

  // الخطوة الثانية للمسارين: الرمز اللي وصل على البريد → الجلسة
  @Post('login/verify')
  @HttpCode(200)
  async verify(@Body() dto: VerifyCodeDto, @Ip() ip: string, @Res({ passthrough: true }) res: CookieResponse, @Headers('user-agent') userAgent?: string) {
    const cookie = dto.cookieSession === true
    return this.deliver(res, await this.auth.verifyTwoFactor(dto.challengeToken, dto.code, { ip, userAgent }, { cookie }), cookie, dto.remember === true)
  }

  // رمز جديد لنفس محاولة الدخول — بمهلة وبحد أعلى
  @Post('login/resend')
  @HttpCode(200)
  resend(@Body() dto: ResendCodeDto) {
    return this.auth.resendTwoFactor(dto.challengeToken)
  }

  // B2.17: الخروج بيمسح cookie الجلسة من المتصفح (سكربت الصفحة مايقدرش يمسحها). من غير حارس: جلسة منتهية أو مرفوضة برضه بتتمسح.
  // وبيمسح لما الطلب نفسه شايل الـcookie بس: طلب من موقع تاني مابيشيلهاش (SameSite)، فمايعرفش يخرّج حد
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: SessionRequest, @Res({ passthrough: true }) res: CookieResponse) {
    const options = sessionCookieOptions()
    const cookie = sessionCookieOf(req, options)
    // B2.17-ب: والجلسة نفسها بتتنهي من الخادم (التوكن اللي الطلب شايله — ترويسة أو cookie)
    await this.auth.endSessionOfToken(bearerTokenOf(req) ?? cookie)
    if (cookie !== null) res.setHeader('Set-Cookie', clearedSessionCookieHeader(options))
    return { ok: true }
  }

  // B2.17-ب: «جلساتي» — جلسات الحساب المفتوحة، وإنهاء واحدة منها أو كل اللي غير الحالية. صاحب الحساب لنفسه بس
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  mySessions(@CurrentUser() user: JwtPayload) {
    return this.sessions.list(user)
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/end-others')
  @HttpCode(200)
  endOtherSessions(@CurrentUser() user: JwtPayload) {
    return this.sessions.endOthers(user)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async endSession(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Req() req: SessionRequest, @Res({ passthrough: true }) res: CookieResponse) {
    const result = await this.sessions.end(user, id)
    // أنهى جلسته الحالية وهي cookie: الـcookie بتتمسح معاها
    if (result.current && sessionViaCookie(req)) res.setHeader('Set-Cookie', clearedSessionCookieHeader(sessionCookieOptions()))
    return result
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
  @AllowDuringPolicyGate()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user
  }

  // B2.17: بيانات الحساب ورمز CSRF للجلسة الحالية — الواجهة بتناديه بعد تحديث الصفحة أو في تبويب جديد (مابقاش عندها توكن)
  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @AllowDuringPolicyGate()
  @Get('session')
  session(@CurrentUser() user: JwtPayload) {
    return this.auth.sessionView(user)
  }

  // صاحب الحساب يغيّر كلمته — ومفتوح لتوكن «لازم يغيّر كلمة المرور المؤقتة»
  // الرد = جلسة جديدة (الإصدار زاد فالتوكن القديم بطل)، بنفس شكل الجلسة اللي الطلب جه بيها (cookie أو توكن)
  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(200)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto, @Req() req: SessionRequest, @Res({ passthrough: true }) res: CookieResponse) {
    const cookie = sessionViaCookie(req)
    const context = { ip: req.ip ?? null, userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null }
    return this.deliver(res, await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword, { cookie }, context), cookie, dto.remember === true)
  }
}
