import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { In, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { DirectoryAuthError, type DirectoryUser } from './directory.types'
import { DirectoryService } from './directory.service'
import { DomainLoginService } from './domain-login.service'
import { effectiveBranchScope } from './guards'
import { MailSendError, MailService, maskEmail } from './mail.service'
import { effectivePermissions, ROLE_PRESETS } from './permissions'
import { Role, UserPermissionOverride } from './role.entity'
import { OTP, TWO_FACTOR_CONFIG_KEY, TwoFactorChallengeView, TwoFactorError, TwoFactorService } from './two-factor.service'
import { User } from './user.entity'
import { readUserLanguage, UI_LANGUAGES, userLanguageReady, writeUserLanguage } from './user-language'
import { PRODUCT_NAME } from '../settings/product-name'
import { failureDelayMs, lockedMessage, lockedNow } from './login-security'
import { LoginSecurityService, type LoginContext } from './login-security.service'
import { newCsrfToken } from './session-cookie'
import { UserSessionsService } from './user-sessions.service'
import { TotpService } from './totp.service'
import { TOTP_CHALLENGE_MARK, TOTP_FACTOR_CHANGED } from './totp'
import { PREBOARDING_SESSION_ROLE, preboardingActive, preboardingUntilOf } from './preboarding'
import { MailSessionService } from '../mailbox/mail-session.service'

// حمولة التوكن — الدور والفرع هما أساس عزل البيانات
export interface JwtPayload {
  sub: number
  email: string
  role: string
  branchId: number | null
  employeeId: number | null
  // صلاحيات إضافية فوق الدور (أدوار وظيفية ممنوحة)
  permissions?: string[]
  // إصدار التوكن وقت الإصدار — يُطابَق مع users.tokenVersion لإبطاله فوراً
  tokenVersion?: number
  // كلمة مرور مؤقتة: التوكن مايفتحش غير «غيّر كلمة المرور» (JwtAuthGuard)
  mustChangePassword?: boolean
  // «نطاقه: كل الفروع» (users.scopeAllBranches): بيتكتب في التوكن لما يكون مفتوح بس، وbranchScopeOf بيقرأه
  // بمقارنة حرفية `=== true`. تغييره في القاعدة بيزوّد tokenVersion فالتوكن اللي شايل القيمة القديمة يموت.
  scopeAllBranches?: boolean
  // فروع النطاق صريحة للحساب اللي مش «كل الفروع» (effectiveBranchScope: المختارة بعلامات صح، أو فرعه، أو [] = ولا فرع).
  // التوكن القديم من غيرها = فرعه (branchId) بس. تغيير الفروع المختارة بيزوّد tokenVersion زي «كل الفروع».
  branchIds?: number[]
  // B2.17: رمز CSRF بتاع جلسة الـcookie — طلب الكتابة بالـcookie لازم يبعته في ترويسة X-CSRF-Token (JwtStrategy).
  // توكن Bearer (السكربتات والاختبارات) من غيره
  csrf?: string
  // B2.17-ب: رقم الجلسة (user_sessions.sid) — الجلسة اللي صفها اتنهى مابتعدّيش من حارس الدخول. توكن من غير رقم (قبل ترحيل 101،
  // أو متوقّع برّه مسار الدخول) بيتحكم بالإصدار بس زي الأول
  sid?: string
  // B2.17-ج: تطبيق المصادقة إلزامي لدور الحساب ولسه مافعّلش — التوكن مايفتحش غير التفعيل (JwtAuthGuard). بعد التأكيد جلسة جديدة من غيرها
  totpSetupRequired?: boolean
  // B3.1-ب: تاريخ مباشرة موظف الحساب (YYYY-MM-DD) — لحد اليوم ده التوكن مايفتحش غير بوابة التهيئة (JwtAuthGuard)، ومن غير صلاحيات
  preboardingUntil?: string
}

/** B2.17: شكل الجلسة المطلوب من العميل. cookie = التوكن في cookie httpOnly (ومعاه رمز CSRF) بدل جسم الرد */
// factorProven (CRP3F): الدخول ده أثبت عامل الحساب الحالي — رمز تطبيق المصادقة اتقبل، أو الجلسة طالعة لصاحب جلسة قايمة (تغيير كلمة
// المرور، وبعد تأكيد التفعيل). من غيرها (كلمة السر لوحدها، أو رمز بريد) الجلسة مابتطلعش لحساب مفعّل تطبيق المصادقة
export interface SessionMode { cookie?: boolean; factorProven?: boolean }

/** الجلسة المفتوحة — نفس شكل رد الدخول الحالي بالحرف (الواجهة بتقرأه كما هو). */
export interface SessionResponse {
  accessToken: string
  user: {
    id: number
    email: string
    displayName: string
    role: string
    branchId: number | null
    employeeId: number | null
    permissions: string[]
    mustChangePassword: boolean
    scopeAllBranches: boolean
    // فروع النطاق للواجهة (نفس اللي في التوكن) — مابتتبعتش لحساب «كل الفروع»
    branchIds?: number[]
    // B1.2: حساب مربوط بالمجال (AD) — كلمة سره في الويندوز مش عندنا، فالواجهة ماتعرضش له «تغيير كلمة المرور».
    // بيتبعت للحساب المربوط بس (الحساب العادي رده زي ما هو بالحرف)
    domainAccount?: true
    // B2.17-ج: بيتبعت لما يكون true بس — الواجهة بتحوّل لشاشة تفعيل تطبيق المصادقة
    totpSetupRequired?: true
    // B3.1-ب: بيتبعت للحساب اللي في بوابة التهيئة بس — الواجهة بتعرض شاشات التهيئة لحد التاريخ ده
    preboardingUntil?: string
  }
  // B2.17: لجلسة الـcookie بس — رمز CSRF بتاعها (الجلسة العادية ردها زي ما هو بالحرف)
  csrfToken?: string
}

/** رد الدخول: جلسة كاملة (التحقق بخطوتين مقفول) أو حالة معلَّقة تنتظر الرمز (مفتوح). */
export type LoginResult = SessionResponse | TwoFactorChallengeView

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserPermissionOverride)
    private readonly overrides: Repository<UserPermissionOverride>,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly directory: DirectoryService,
    private readonly domain: DomainLoginService,
    private readonly mail: MailService,
    private readonly security: LoginSecurityService,
    private readonly sessions: UserSessionsService,
    private readonly totp: TotpService,
    // B-ADD.16: اختياري — الاختبارات اللي بتبني الخدمة بإيدها من غيره
    @Optional() private readonly mailSession?: MailSessionService
  ) {}

  // B1.3: تأخير رد المحاولة الغلط (ثانية ثم 2 ثم 4) — AUTH_FAILURE_DELAY_MS بيصغّره في الاختبارات
  private async failureDelay(failedCount: number) {
    const base = Number(process.env.AUTH_FAILURE_DELAY_MS ?? 1000)
    const ms = failureDelayMs(failedCount, Number.isFinite(base) && base >= 0 ? base : 1000)
    if (ms > 0) await new Promise(resolve => setTimeout(resolve, ms))
  }

  // الحساب مقفول: 423 بكود ثابت ولحد إمتى
  private lockedError(lockedUntil: Date) {
    return new HttpException({ code: 'AUTH_ACCOUNT_LOCKED', message: lockedMessage(lockedUntil), lockedUntil: lockedUntil.toISOString() }, HttpStatus.LOCKED)
  }

  // الصلاحيات النهائية = حزمة الدور + GRANTs − REVOKEs
  // proposed: تجاوزات مقترحة بدل المحفوظة — لحساب أثر التعديل قبل حفظه (منع التصعيد)
  async resolvePermissions(
    user: User,
    proposed?: { grants: string[]; revokes: string[] }
  ): Promise<string[]> {
    return (await this.permissionBreakdown(user, proposed)).effective
  }

  // نفس الحساب بمكوّناته — لشاشة المستخدمين: «النهائي = حزمة الدور ∪ المنح − السحب» ومصدر كل صلاحية
  // (roleActive=false: الدور معطَّل فحزمته لا تمنح شيئًا؛ legacyGrants: العمود القديم users.permissions)
  async permissionBreakdown(
    user: User,
    proposed?: { grants: string[]; revokes: string[] }
  ): Promise<{
    rolePermissions: string[]
    roleActive: boolean
    grants: string[]
    revokes: string[]
    legacyGrants: string[]
    effective: string[]
  }> {
    // مطابقة حرفية: الـcollation لا يفرّق حالة الأحرف ولا المسافات الأخيرة →
    // دور مخزَّن كـ "SUPER_ADMIN" لا يرث حزمة super_admin (الحراس تقارن حرفياً)
    const found = await this.roles.findOne({ where: { code: user.role } })
    const roleRow = found && found.code === user.role ? found : null
    const ovr: Array<{ permission: string; effect: string }> = proposed
      ? [
          ...proposed.grants.map((permission) => ({ permission, effect: 'GRANT' })),
          ...proposed.revokes.map((permission) => ({ permission, effect: 'REVOKE' })),
        ]
      : await this.overrides.find({ where: { userId: user.id } })
    return this.composeBreakdown(user, roleRow, ovr)
  }

  // نفس الصلاحيات النهائية لمجموعة حسابات باستعلامين بدل اتنين لكل حساب — تحذير محرر السلاسل (B1.11) بيعدّ
  // مين بيحمل كل خطوة وظيفية في كل فرع. نفس composeBreakdown بالحرف (مطابقة الدور الحرفية والعمود القديم والسحب)
  async resolvePermissionsMany(users: User[]): Promise<Map<number, string[]>> {
    const result = new Map<number, string[]>()
    if (users.length === 0) return result
    const codes = [...new Set(users.map((user) => user.role).filter(Boolean))]
    const roleRows = codes.length ? await this.roles.find({ where: { code: In(codes) } }) : []
    const ids = users.map((user) => user.id)
    const overrides: UserPermissionOverride[] = []
    // حد معاملات SQL Server (2100) — دفعات
    for (let offset = 0; offset < ids.length; offset += 1000) {
      overrides.push(...(await this.overrides.find({ where: { userId: In(ids.slice(offset, offset + 1000)) } })))
    }
    for (const user of users) {
      const roleRow = roleRows.find((row) => row.code === user.role) ?? null
      result.set(user.id, this.composeBreakdown(user, roleRow, overrides.filter((row) => row.userId === user.id)).effective)
    }
    return result
  }

  /**
   * B2.4: هوية الحساب زي ما التوكن بيشيلها (الدور والصلاحيات النهائية والموظف والنطاق — نفس حقول issueSession بالحرف)، لمجموعة حسابات
   * من غير دخول. محرك الإشعارات بيسأل بيها نفس قواعد الصلاحية والنطاق اللي الطلب بيتفحص بيها («الخطوة دي على الحساب ده؟»).
   */
  async accountPayloads(users: User[]): Promise<JwtPayload[]> {
    const permissions = await this.resolvePermissionsMany(users)
    return users.map((user) => {
      const scopeAllBranches = user.role !== 'super_admin' && user.scopeAllBranches === true
      const branchIds = effectiveBranchScope(user)
      return {
        sub: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId ?? null,
        employeeId: user.employeeId ?? null,
        permissions: permissions.get(user.id) ?? [],
        ...(scopeAllBranches ? { scopeAllBranches: true } : {}),
        ...(branchIds !== null ? { branchIds } : {}),
      }
    })
  }

  // حزمة الدور (صفه الحرفي أو الـpreset) + المنح + العمود القديم − السحب
  private composeBreakdown(
    user: User,
    roleRow: Role | null,
    ovr: Array<{ permission: string; effect: string }>
  ) {
    let rolePerms: string[] = []
    let roleActive = true
    if (roleRow) {
      // الدور المعطَّل لا يمنح شيئاً — تبقى تجاوزات المستخدم فقط
      roleActive = !!roleRow.isActive
      if (roleRow.isActive) {
        try {
          rolePerms = JSON.parse(roleRow.permissions)
        } catch {
          rolePerms = []
        }
      }
    } else {
      // fallback للـ presets لو الجدول لسه ما اتبذرش
      rolePerms =
        ROLE_PRESETS.find((r) => r.code === user.role)?.permissions ?? []
    }
    const grants = ovr.filter((o) => o.effect === 'GRANT').map((o) => o.permission)
    const revokes = ovr.filter((o) => o.effect === 'REVOKE').map((o) => o.permission)

    // توافق خلفي: صلاحيات العمود القديم permissions (functional roles) كـ GRANTs
    const legacyGrants: string[] = []
    try {
      const legacy: string[] = user.permissions ? JSON.parse(user.permissions) : []
      const legacyMap: Record<string, string> = {
        hr: 'approve.hr',
        finance: 'approve.finance',
        it: 'approve.it',
        custody_officer: 'approve.custody',
        executive: 'approve.executive',
      }
      for (const l of legacy) legacyGrants.push(legacyMap[l] ?? l)
    } catch {
      /* تجاهل */
    }
    return {
      rolePermissions: rolePerms,
      roleActive,
      grants,
      revokes,
      legacyGrants,
      // السحب بيتطبق بعد كل المنح (التجاوزات والعمود القديم) — نفس الترتيب السابق بالحرف
      effective: effectivePermissions(rolePerms, [...grants, ...legacyGrants], revokes),
    }
  }

  // الحساب بعمودي كلمة المرور المؤقتة (select: false في الكيان — بيتقروا هنا صراحةً)
  private withPasswordState() {
    return this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
  }

  /**
   * الدخول بالبريد وكلمة المرور.
   * التحقق بخطوتين مقفول (الافتراضي) → الرد جلسة كاملة زي ما هو بالحرف.
   * مفتوح → الرد حالة معلَّقة بس (مفيش accessToken)، والجلسة بتتفتح بعد verifyTwoFactor.
   */
  async login(email: string, password: string, context: LoginContext = {}, session: SessionMode = {}): Promise<LoginResult> {
    const identifier = String(email ?? '').toLowerCase().trim()
    const user = await this.withPasswordState()
      .where('u.email = :email', { email: identifier })
      .getOne()
    // B1.3: كل محاولة في سجل الدخول. الحساب المش موجود والمعطّل نفس الرد بالحرف (مفيش كشف وجود)
    if (!user || !user.isActive) {
      await this.security.record({ userId: user?.id ?? null, identifier, method: 'PASSWORD', outcome: user ? 'INACTIVE' : 'UNKNOWN_ACCOUNT', context })
      throw new UnauthorizedException('بيانات الدخول غير صحيحة')
    }
    // B1.3: الحساب المقفول مابيتجربش عليه كلمة سر خالص — حتى الصح بيرجع «مقفول» لحد ما المدة تخلص أو المدير يفكه
    const lock = await this.security.lockState(user.id)
    if (lockedNow(lock.lockedUntil)) {
      await this.security.record({ userId: user.id, identifier, method: 'PASSWORD', outcome: 'LOCKED', context })
      throw this.lockedError(lock.lockedUntil!)
    }
    // الحسابات المنقولة من القديم: hash لسر عشوائي محدش يعرفه → المقارنة بتفشل دايمًا لحد ما المدير يعيّن كلمة
    // وحسابات المجال بس (بلا كلمة مرور عندنا) نفس الحكاية: المسار ده بيفشل عليها دايمًا
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      // العداد بيزيد، ولو وصل الحد الحساب بيتقفل (والمحاولة دي نفسها بترجع «اتقفل»)، والرد بيتأخر من المحاولة التالتة
      const after = await this.security.registerFailure(user.id, await this.security.lockoutSettings())
      const lockedNowAfter = !!after && lockedNow(after.lockedUntil)
      await this.security.record({ userId: user.id, identifier, method: 'PASSWORD', outcome: lockedNowAfter ? 'LOCKED_OUT' : 'BAD_PASSWORD', context })
      await this.failureDelay(after?.failedLoginCount ?? 0)
      if (lockedNowAfter) throw this.lockedError(after!.lockedUntil!)
      throw new UnauthorizedException('بيانات الدخول غير صحيحة')
    }
    await this.security.reset(user.id)
    return this.finishLogin(user, 'PASSWORD', user.email, context, identifier, session)
  }

  /**
   * الدخول بحساب الشركة: المجال بيثبت الهوية، وبعدها نطابق الموظف ونعمل/نربط الحساب في لحظته.
   * الصلاحيات والأدوار ونطاق الفروع من جداولنا — مفيش مجموعة AD بتتقري ولا بتمنح حاجة.
   */
  async domainLogin(username: string, password: string, context: LoginContext = {}, session: SessionMode = {}): Promise<LoginResult> {
    let directoryUser
    const identifier = String(username ?? '').trim()
    try {
      directoryUser = await this.directory.authenticate(username, password)
    } catch (error) {
      if (error instanceof DirectoryAuthError) {
        // B1.3: القفل بتاع حساب الشركة في الويندوز نفسه (سياسة المجال) — هنا التسجيل بس
        await this.security.record({ identifier, method: 'DOMAIN', outcome: `DOMAIN_${error.code}`.slice(0, 30), context })
        // السبب التقني في سجل الخادم بس — المستخدم بياخد الرسالة العربية المناسبة للسبب
        this.logger.warn(`رفض دخول بحساب الشركة [${error.code}]: ${error.detail ?? 'بلا تفاصيل'}`)
        if (error.code === 'DIRECTORY_UNAVAILABLE' || error.code === 'NOT_CONFIGURED') {
          throw new ServiceUnavailableException(error.message)
        }
        throw new UnauthorizedException(error.message)
      }
      throw error
    }
    const user = await this.domain.resolveUser(directoryUser)
    // B-ADD.16: اسم الموظف في المجال بيتسجّل لبريده (الاسم بس، ولما موديول البريد مفعّل) — بيه «افتح بريدك» بيعرف يدخل خادم البريد باسم مين
    await this.mailSession?.rememberLogin(user.id, directoryUser.userPrincipalName)
    // صندوق البريد من AD الأول (322 موظف بريدهم عندنا @maharah.local) وإلا بريد الحساب
    return this.finishLogin(user, 'DOMAIN', directoryUser.mail ?? user.email, context, identifier, session)
  }

  /**
   * B6.4: الدخول المؤسسي — الهوية أثبتها مزوّد المؤسسة واتحققت في SsoService (توقيع الـID token والمزوّد والتطبيق والـnonce والنطاق).
   * من هنا نفس حساب الشركة بالظبط: نفس مطابقة الموظف والربط (resolveUser)، ونفس الخطوة التانية والجلسة (finishLogin). مفيش دور ولا صلاحية من المزوّد.
   */
  async ssoLogin(identity: DirectoryUser, context: LoginContext = {}, session: SessionMode = {}): Promise<LoginResult> {
    const identifier = identity.userPrincipalName
    let user: User
    try {
      user = await this.domain.resolveUser(identity)
    } catch (error) {
      await this.security.record({ identifier, method: 'SSO', outcome: 'SSO_REFUSED', context })
      throw error
    }
    await this.security.record({ userId: user.id, identifier, method: 'SSO', outcome: 'SSO_IDENTITY', context })
    return this.finishLogin(user, 'DOMAIN', identity.mail ?? user.email, context, identifier, session)
  }

  /**
   * الخطوة الأخيرة المشتركة للمسارين: جلسة فورًا لما التحقق مقفول، وإلا رمز على البريد.
   * وحالة تالتة لازم تتفصل صريحة: **مش معروف**. قراءة مفتاح التحقق لما تفشل مش معناها إن المالك
   * قفله — فالدخول بيُرفض ومفيش جلسة ولا حالة معلَّقة (فشل مقفول).
   */
  private async finishLogin(
    user: User,
    method: 'PASSWORD' | 'DOMAIN',
    address: string,
    context: LoginContext = {},
    identifier: string = user.email,
    session: SessionMode = {}
  ): Promise<LoginResult> {
    // B2.17-ج: الحساب مفعّل تطبيق المصادقة = الخطوة التانية رمز التطبيق (مكان رمز البريد، ومن غير اعتماد على خادم البريد)
    if (await this.totp.enrolled(user.id)) {
      const challenge = await this.twoFactor.openTotp(user, method)
      await this.security.record({ userId: user.id, identifier, method, outcome: 'TOTP_ASKED', context })
      return challenge
    }
    // B1.3: التحقق العام مقفول بس دور الحساب في «التحقق بخطوتين إلزامي لأدوار…» = الرمز مطلوب
    const gate = await this.twoFactor.gate(user)
    if (gate === 'UNKNOWN') {
      this.logger.error(
        `رفض دخول ${method} للحساب ${user.id}: تعذّر قراءة مفتاح ${TWO_FACTOR_CONFIG_KEY} من قاعدة البيانات`
      )
      throw new ServiceUnavailableException(
        'تعذّر قراءة إعداد التحقق بخطوتين من قاعدة البيانات، ومنعرفش هل رمز البريد مطلوب — ' +
          'الدخول موقوف لحد ما القاعدة ترد. راجع اتصال قاعدة البيانات وسجل الخادم وحاول تاني.'
      )
    }
    if (gate === 'DISABLED') {
      // CRP3F: الجلسة بتتفتح الأول (وبتتحكم بعامل الحساب بعد فتح صفها: تفعيل ثبت بعد الفحص اللي فوق = مفيش جلسة)، وسطر «نجح» بعدها
      const opened = await this.issueSession(user, session, context).catch(async (error) => {
        if (error instanceof UnauthorizedException && error.message === TOTP_FACTOR_CHANGED) {
          await this.security.record({ userId: user.id, identifier, method, outcome: 'FACTOR_CHANGED', context })
        }
        throw error
      })
      await this.users.update({ id: user.id }, { lastLoginAt: new Date() })
      await this.security.record({ userId: user.id, identifier, method, outcome: 'SUCCESS', context })
      return opened
    }
    try {
      const challenge = await this.twoFactor.open(user, method, address)
      await this.security.record({ userId: user.id, identifier, method, outcome: 'CODE_SENT', context })
      return challenge
    } catch (error) {
      // فشل البريد ممنوع يدخّل حد: رفض صريح بالسبب الحقيقي، ومفيش جلسة ولا حالة معلَّقة
      if (error instanceof MailSendError) throw new ServiceUnavailableException(error.message)
      throw error
    }
  }

  /**
   * ترجمة رفض الرمز لحالة HTTP: رفض الرمز نفسه 401 (زي بيانات الدخول الغلط)،
   * والمهلة وحد إعادة الإرسال 429 (مش خطأ في البيانات — «استنى»).
   * مفيش حالة واحدة بتخرج بلا ترجمة (وإلا الإطار بيرجّع 500 برسالة إنجليزية).
   */
  private httpFor(error: unknown): unknown {
    if (!(error instanceof TwoFactorError)) return error
    if (error.code === 'RESEND_TOO_SOON' || error.code === 'RESEND_LIMIT') {
      return new HttpException(
        { statusCode: 429, message: error.message, ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) },
        429
      )
    }
    return new UnauthorizedException(error.message)
  }

  /** التحقق من رمز البريد → الجلسة. كل قواعد الحساب بتتقري من القاعدة من جديد هنا. */
  async verifyTwoFactor(challengeToken: string, code: string, context: LoginContext = {}, session: SessionMode = {}): Promise<SessionResponse> {
    const challenge = await this.twoFactor.verify(challengeToken, code, (userId, value) => this.totp.verifyLogin(userId, value),
      (userId) => this.totp.enrolled(userId)).catch(async (error) => {
      // B1.3: الرمز الغلط أو المنتهي في السجل (الحساب بيتعرف من الرمز لو صالح)
      await this.security.record({ identifier: '—', method: 'CODE',
        outcome: `CODE_${error?.code ?? 'REJECTED'}`.slice(0, 30), context })
      throw this.httpFor(error)
    })
    const user = await this.withPasswordState().where('u.id = :id', { id: challenge.userId }).getOne()
    // الحساب اتعطّل بين إرسال الرمز والتحقق منه؟ مفيش جلسة (نفس قاعدة الدخول)
    if (!user || !user.isActive) throw new UnauthorizedException('بيانات الدخول غير صحيحة')
    // CRP3D-B17-02: عامل الحساب اتغيّر بين قبول رمز البريد وفتح الجلسة (التطبيق اتفعّل دلوقتي)؟ مفيش جلسة
    if (challenge.codeHash !== TOTP_CHALLENGE_MARK && (await this.totp.enrolled(user.id))) throw new UnauthorizedException(TOTP_FACTOR_CHANGED)
    await this.users.update({ id: user.id }, { lastLoginAt: new Date() })
    // CRP3E: الجلسة بتتفتح الأول (وبتتحكم بعامل الحساب بعد فتح صفها)، وسطر «نجح» بيتسجّل بعدها؛ رفضها بيتسجّل باسمه
    const opened = await this.issueSession(user, { ...session, factorProven: challenge.codeHash === TOTP_CHALLENGE_MARK }, context).catch(async (error) => {
      if (error instanceof UnauthorizedException && error.message === TOTP_FACTOR_CHANGED) {
        await this.security.record({ userId: user.id, identifier: user.email, method: 'CODE', outcome: 'CODE_SUPERSEDED', context })
      }
      throw error
    })
    await this.security.record({ userId: user.id, identifier: user.email, method: 'CODE', outcome: 'SUCCESS', context })
    return opened
  }

  /** إعادة إرسال الرمز لنفس محاولة الدخول (بمهلة وحد أعلى) — مفيش جلسة بتتفتح هنا. */
  async resendTwoFactor(challengeToken: string) {
    try {
      return await this.twoFactor.resend(challengeToken)
    } catch (error) {
      if (error instanceof MailSendError) throw new ServiceUnavailableException(error.message)
      throw this.httpFor(error)
    }
  }

  /** ما تعرضه شاشة الدخول قبل أي مصادقة: هل زر «الدخول بحساب الشركة» يظهر (بلا أي تفصيل عن الخادم). */
  loginOptions() {
    return { domainLoginEnabled: this.directory.isConfigured() }
  }

  // تغيير كلمة المرور من صاحب الحساب — الطريق الوحيد المفتوح لتوكن «لازم يغيّر» (غير «مين أنا»)
  async changePassword(userId: number, currentPassword: string, newPassword: string, session: SessionMode = {}, context: LoginContext = {}) {
    const user = await this.withPasswordState().where('u.id = :id', { id: userId }).getOne()
    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب معطّل')
    }
    // 400 مش 401: الواجهة بتعتبر 401 انتهاء جلسة وبتطلّع المستخدم
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('كلمة المرور الحالية مش صح')
    }
    // B1.3: سياسة كلمة السر الجديدة (NIST): الطول، والشائعة، وبريد الحساب واسمه
    await this.security.assertPassword(newPassword, { email: user.email, displayName: user.displayName })
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException(
        user.mustChangePassword
          ? 'كلمة المرور الجديدة لازم تختلف عن المؤقتة'
          : 'كلمة المرور الجديدة لازم تختلف عن الحالية'
      )
    }
    const passwordChangedAt = new Date()
    await this.users.update(
      { id: user.id },
      {
        passwordHash: await AuthService.hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt,
        // أي جلسة تانية مفتوحة بالكلمة القديمة (أو بتوكن «لازم يغيّر») تبطل فورًا.
        // CRP3F: الزيادة في القاعدة نفسها — رقم محسوب من الصف المقري فوق كان بيتكتب فوق زيادة حصلت بعد قرايته (ترقية أو سحب صلاحية)
        tokenVersion: () => 'tokenVersion + 1',
      }
    )
    // B2.17-ب: الإصدار زاد فكل جلسات الحساب ماتت — صفوفها بتتقفل، والجلسة الجديدة بصف جديد
    await this.sessions.revokeAll(user.id, 'PASSWORD')
    // CRP3G-B01: الجلسة الجديدة من صف الحساب المقري من جديد بعد الكتابة — دوره وصلاحياته ونطاقه وإصداره مع بعض. الصف اللي اتقري فوق (قبل
    // فحص كلمة السر) ممكن يكون اتسحب منه دور أو صلاحية في الطريق، والإصدار الجديد مايتركّبش على هوية قديمة
    const current = await this.withPasswordState().where('u.id = :id', { id: user.id }).getOne()
    if (!current || !current.isActive) throw new UnauthorizedException('الحساب معطّل')
    return this.issueSession(current, { ...session, factorProven: true }, context)
  }

  // توكن + بيانات الحساب للواجهة (نفس رد الدخول)
  private async issueSession(user: User, session: SessionMode = {}, context: LoginContext = {}): Promise<SessionResponse> {
    // B3.1-ب: موظف الحساب مباشرته لسه جاية (والميزة مفتوحة) = جلسة بوابة التهيئة: بتاريخ المباشرة، ومن غير أي صلاحية (دوره بيشتغل
    // بصلاحياته من أول دخول بعد المباشرة)
    const preboardingUntil = await preboardingUntilOf(user)
    const permissions = preboardingUntil ? [] : await this.resolvePermissions(user)
    // Codex P3K-B01: ومن غير دور الحساب كمان — سلطة الدور باسمه (خطوة HR، مهام الدور) مابتفضلش مع الجلسة المقيدة
    const role = preboardingUntil ? PREBOARDING_SESSION_ROLE : user.role
    const mustChangePassword = !!user.mustChangePassword
    // «كل الفروع» من عمود القاعدة بقيمته الحرفية فقط (bit → true)؛ مدير النظام نطاقه كامل بدوره فمايتكتبش له
    const scopeAllBranches = user.role !== 'super_admin' && user.scopeAllBranches === true
    // غير كده الفروع صريحة في التوكن (حتى لو فرع واحد أو فاضية) — نفس حساب effectiveBranchScope بالحرف
    const branchIds = effectiveBranchScope(user)
    // B2.17: جلسة الـcookie بتشيل رمز CSRF بتاعها جوه التوكن نفسه (مربوط بيها، ومن غير جدول)
    const csrf = session.cookie ? newCsrfToken() : null
    // B2.17-ب: صف الجلسة ورقمه في التوكن (null قبل ترحيل 101: الجلسة من غير رقم زي الأول)
    const sid = await this.sessions.open(user, context)
    // B2.17-ج: تطبيق المصادقة إلزامي لدوره ولسه مافعّلش = الجلسة مابتفتحش غير التفعيل
    const totp = await this.totp.loginState(user)
    // CRP3E-B17-02: دخول برمز بريد والحساب بقى مفعّل تطبيق المصادقة — القراءة دي بعد ما صف الجلسة اتفتح، فتفعيل ثبت قبل فتح الصف بيتشاف
    // هنا: الصف بيتنهي ومفيش توكن بيطلع (تفعيل بيثبت بعد فتح الصف = جلسة اتفتحت قبله، الحد المعلن).
    // CRP3F: والحكم على كل مسار بيفتح جلسة دخول جديدة (كلمة السر لوحدها لما رمز البريد مقفول، وحساب الشركة، ورمز البريد): حساب مفعّل
    // مابياخدش جلسة غير من دخول أثبت رمز التطبيق، أو من جلسة قايمة
    if (totp.enrolled && !session.factorProven) {
      if (sid) await this.sessions.revoke(sid, user.id, 'LOGOUT')
      throw new UnauthorizedException(TOTP_FACTOR_CHANGED)
    }
    const totpSetupRequired = totp.required && !totp.enrolled

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
      branchId: user.branchId ?? null,
      employeeId: user.employeeId ?? null,
      permissions,
      tokenVersion: user.tokenVersion ?? 0,
      ...(mustChangePassword ? { mustChangePassword: true } : {}),
      ...(scopeAllBranches ? { scopeAllBranches: true } : {}),
      ...(branchIds !== null ? { branchIds } : {}),
      ...(csrf ? { csrf } : {}),
      ...(sid ? { sid } : {}),
      ...(totpSetupRequired ? { totpSetupRequired: true } : {}),
      ...(preboardingUntil ? { preboardingUntil } : {}),
    }

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
        branchId: user.branchId,
        employeeId: user.employeeId,
        permissions,
        mustChangePassword,
        scopeAllBranches,
        ...(branchIds !== null ? { branchIds } : {}),
        ...(user.domainObjectGuid ? { domainAccount: true as const } : {}),
        ...(totpSetupRequired ? { totpSetupRequired: true as const } : {}),
        ...(preboardingUntil ? { preboardingUntil } : {}),
      },
      ...(csrf ? { csrfToken: csrf } : {}),
    }
  }

  /**
   * B2.17-ج: جلسة جديدة لصاحب الجلسة الحالية بعد ما فعّل تطبيق المصادقة (من غير علامة «فعّل الأول»)، والجلسة اللي كانت مقيّدة بتتنهي.
   * الحساب بيتقري من القاعدة من جديد (معطّل = مفيش جلسة).
   */
  async reissueSession(current: JwtPayload, session: SessionMode = {}, context: LoginContext = {}): Promise<SessionResponse> {
    const user = await this.withPasswordState().where('u.id = :id', { id: current.sub }).getOne()
    if (!user || !user.isActive) throw new UnauthorizedException('الحساب معطّل')
    if (current.sid) await this.sessions.revoke(current.sid, current.sub, 'LOGOUT')
    return this.issueSession(user, { ...session, factorProven: true }, context)
  }

  /**
   * B2.17: بيانات الحساب للواجهة من الجلسة الحالية (نفس شكل user في رد الدخول: الهوية من التوكن نفسه، والاسم من القاعدة) ورمز
   * CSRF بتاعها. الواجهة بتناديه بعد تحديث الصفحة أو في تبويب جديد — مابقاش عندها توكن تقرا منه.
   */
  // B6.2: لغة عرض الواجهة لصاحب الحساب (تفضيل عرض بس — من غير أثر على التوكن ولا الصلاحيات)
  async language(payload: JwtPayload) {
    return { language: await readUserLanguage(this.users.manager, payload.sub), available: [...UI_LANGUAGES], changeable: await userLanguageReady(this.users.manager) }
  }

  async setLanguage(payload: JwtPayload, language: unknown) {
    return { language: await writeUserLanguage(this.users.manager, payload.sub, language), available: [...UI_LANGUAGES], changeable: true }
  }

  async sessionView(payload: JwtPayload) {
    const row = await this.users.findOne({ where: { id: payload.sub }, select: ['id', 'displayName', 'domainObjectGuid'] })
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        displayName: row?.displayName ?? '',
        role: payload.role,
        branchId: payload.branchId ?? null,
        employeeId: payload.employeeId ?? null,
        permissions: payload.permissions ?? [],
        mustChangePassword: payload.mustChangePassword === true,
        scopeAllBranches: payload.role !== 'super_admin' && payload.scopeAllBranches === true,
        ...(Array.isArray(payload.branchIds) ? { branchIds: payload.branchIds } : {}),
        ...(row?.domainObjectGuid ? { domainAccount: true as const } : {}),
        ...(payload.totpSetupRequired === true ? { totpSetupRequired: true as const } : {}),
        ...(preboardingActive(payload) ? { preboardingUntil: payload.preboardingUntil } : {}),
      },
      csrfToken: payload.csrf ?? null,
    }
  }

  /**
   * B2.17-ب: الخروج — الجلسة اللي التوكن ده بتاعها بتتنهي من الخادم (التوكن مابقاش يعدّي حتى لو لسه في مدته). توكن تالف أو منتهي أو
   * من غير رقم جلسة: ولا حاجة (مفيش صف يتنهي).
   */
  async endSessionOfToken(token: string | null): Promise<void> {
    if (!token) return
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token)
    } catch {
      return
    }
    if (payload?.sid && Number.isSafeInteger(payload.sub)) await this.sessions.revoke(payload.sid, payload.sub, 'LOGOUT')
  }

  /** رمز CSRF بتاع توكن جلسة سليم التوقيع (null = توكن من غير رمز)؛ undefined = توكن تالف أو منتهي — CRP3D-N02 */
  async csrfOfToken(token: string): Promise<string | null | undefined> {
    try {
      return (await this.jwt.verifyAsync<JwtPayload>(token))?.csrf ?? null
    } catch {
      return undefined
    }
  }

  async findById(id: number) {
    return this.users.findOne({ where: { id } })
  }

  /**
   * حالة الدخول بحساب الشركة والبريد والتحقق بخطوتين — لشاشة السياسات (مدير النظام).
   * بلا أي سر: كلمة حساب الخدمة وكلمة البريد مابيظهروش، بس «مضبوط / غير مضبوط».
   */
  async securityStatus() {
    const gate = await this.twoFactor.gate()
    return {
      // «مفتوح» بس اللي بيرجع true. لو قراءة المفتاح فشلت مابنقولش «مقفول» — بنقول مش معروف صراحةً
      twoFactorEnabled: gate === 'ENABLED',
      twoFactorState: gate,
      twoFactorConfigKey: TWO_FACTOR_CONFIG_KEY,
      mail: this.mail.status(),
      directory: this.directory.status(),
      code: { length: OTP.codeLength, ttlSeconds: OTP.ttlSeconds, maxAttempts: OTP.maxAttempts,
        resendCooldownSeconds: OTP.resendCooldownSeconds, maxResends: OTP.maxResends },
    }
  }

  /**
   * الفحص الذاتي قبل فتح التحقق بخطوتين: بيبعت رمزًا تجريبيًّا لعنوان واحد ويرجّع رد خادم البريد بالحرف.
   * مفيش حالة دخول بتتعمل ومفيش جلسة — إرسال بس.
   */
  async sendTestCode(to: string): Promise<{ ok: boolean; sentTo: string; response: string; detail?: string }> {
    const address = (to ?? '').trim()
    if (!address.includes('@')) throw new BadRequestException('اكتب عنوان بريد صالح للفحص')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    try {
      const result = await this.mail.send({
        to: address,
        subject: `فحص إرسال رمز الدخول — ${PRODUCT_NAME}`,
        text:
          `ده فحص إعداد البريد. رمز تجريبي: ${code}\n\n` +
          'وصلت الرسالة دي يعني إعداد SMTP سليم وينفع تفتح التحقق بخطوتين.',
      })
      this.logger.log(`فحص بريد ناجح إلى ${maskEmail(address)} — رد الخادم: ${result.response || 'بلا رد'}`)
      return { ok: true, sentTo: maskEmail(address), response: result.response || 'قبل الرسالة بلا رد نصي' }
    } catch (error) {
      const detail = error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error)
      this.logger.error(`فحص بريد فاشل إلى ${maskEmail(address)} — ${detail}`)
      return { ok: false, sentTo: maskEmail(address), response: '', detail }
    }
  }

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10)
  }
}
