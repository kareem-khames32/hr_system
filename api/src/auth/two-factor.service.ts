import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThan, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { LoginChallenge, LoginChallengeMethod } from './login-challenge.entity'
import { MailSendError, MailService, maskEmail } from './mail.service'
import { User } from './user.entity'

// ===== التحقق بخطوتين: رمز 6 أرقام على البريد لكل مسارات الدخول =====
// قرار المالك 22 سبتمبر: التحقق لكل الحسابات، ومدير النظام نفسه. وبيُسلَّم **مقفول**:
// مفتاح requests_config واحد (auth.two_factor_enabled = 'false') هو اللي بيفتحه، وبيتقفل من الترمينال
// بـ node api/scripts/two-factor-off.cjs من غير ما التطبيق يشتغل (مفتاح الطوارئ).
export { TWO_FACTOR_CONFIG_KEY } from './two-factor-gate'
import { TWO_FACTOR_CONFIG_KEY } from './two-factor-gate'

/** ثوابت الرمز في مكان واحد — مش مفاتيح إعدادات (المالك رفض تضخيم لوحة الإعدادات). */
export const OTP = {
  codeLength: 6,
  /** عمر الرمز — 5 دقايق */
  ttlSeconds: 300,
  /** إدخال غلط أكتر من كده يقفل الحالة المعلَّقة */
  maxAttempts: 5,
  /** مهلة بين إعادتي إرسال */
  resendCooldownSeconds: 60,
  /** أقصى عدد إعادات إرسال لنفس محاولة الدخول */
  maxResends: 3,
  challengeTokenBytes: 32,
  /** الحالات المعلَّقة الأقدم من كده تُنضَّف مع أي دخول جديد */
  cleanupAfterHours: 24,
  /**
   * أقصى عدد مرات لإعادة كتابة عدّاد (المحاولات أو إعادة الإرسال) لما صف الحالة يتغيّر تحت إيدينا.
   * الحد ده مش سياسة أمان: هو حاجز ضد دوران بلا نهاية تحت ضغط متوازي — ولو اتخطى في عدّ المحاولات
   * بنقفل الحالة، وفي إعادة الإرسال بنرفض الإرسال بس (الحالة مابتتقفلش).
   */
  attemptWriteRounds: 12,
} as const

/** سبب رفض الرمز — الرسالة عربية صريحة، بلا لبس بين «غلط» و«منتهي» و«مستخدم» و«اتبدّل». */
export type TwoFactorRejection =
  | 'UNKNOWN'
  | 'CONSUMED'
  | 'LOCKED'
  | 'EXPIRED'
  | 'WRONG_CODE'
  /** الرمز اللي قارنّاه استبدلته إعادة إرسال وإحنا بنقارن — بطل، ومايتقبلش */
  | 'SUPERSEDED'
  | 'RESEND_TOO_SOON'
  | 'RESEND_LIMIT'

/**
 * حالة بوابة التحقق بخطوتين — **تلات حالات مش اتنين**:
 * - `ENABLED` / `DISABLED`: قيمة قريناها من القاعدة بنجاح (والمفتاح الغايب أو الفاضي = المُسلَّم، مقفول).
 * - `UNKNOWN`: قراءة الإعداد نفسها فشلت، فمش معروف هل الرمز مطلوب.
 * `UNKNOWN` **ممنوع** يتعامل معاملة `DISABLED`: ده بيخلّي خلل في قراءة الإعداد يفتح جلسة بلا رمز.
 */
export type TwoFactorGate = 'ENABLED' | 'DISABLED' | 'UNKNOWN'

export class TwoFactorError extends Error {
  constructor(
    readonly code: TwoFactorRejection,
    message: string,
    /** ثواني باقية — لإعادة الإرسال المبكرة */
    readonly retryAfterSeconds?: number
  ) {
    super(message)
    this.name = 'TwoFactorError'
  }
}

/** ما بيرجع للعميل بعد نجاح كلمة المرور/الـbind وقبل أي جلسة — مفيش توكن جلسة هنا. */
export interface TwoFactorChallengeView {
  twoFactor: true
  challengeToken: string
  /** العنوان مقنَّعًا — صاحب الحساب بيعرف منه فين الرمز */
  sentTo: string
  expiresInSeconds: number
  resendAfterSeconds: number
  codeLength: number
}

const rawCode = (length: number): string => {
  let out = ''
  // crypto.randomInt: توزيع منتظم بلا انحياز باقي القسمة
  for (let i = 0; i < length; i++) out += String(crypto.randomInt(0, 10))
  return out
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name)

  constructor(
    @InjectRepository(LoginChallenge)
    private readonly challenges: Repository<LoginChallenge>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly mail: MailService
  ) {}

  /**
   * حالة التحقق بخطوتين: تُقرأ من القاعدة كل محاولة دخول (بلا كاش) عشان مفتاح الطوارئ
   * يسري في نفس اللحظة بلا إعادة تشغيل.
   *
   * الفرق اللي بيحمي الدخول: **مفتاح غايب أو فاضي ≠ قراءة فشلت.**
   * - صف مش موجود، أو قيمته فاضية، أو أي قيمة غير 'true' → `DISABLED`: دي قيمة قريناها بنجاح
   *   ومعناها المُسلَّم (مقفول) — السلوك المقصود زي ما هو.
   * - استثناء من القراءة (القاعدة مش رادة، الجدول مش موجود، مهلة) → `UNKNOWN`: مانعرفش هل الرمز
   *   مطلوب، والمتصل لازم **يرفض الدخول** (فشل مقفول). قبل كده كانت بترجّع false هنا، فخلل قراءة
   *   واحد كان بيفتح جلسة بلا رمز ولا حالة معلَّقة.
   */
  async gate(): Promise<TwoFactorGate> {
    try {
      const row = await this.config.findOne({ where: { key: TWO_FACTOR_CONFIG_KEY } })
      return (row?.value ?? '').trim().toLowerCase() === 'true' ? 'ENABLED' : 'DISABLED'
    } catch (error) {
      this.logger.error(
        `تعذّر قراءة ${TWO_FACTOR_CONFIG_KEY} — حالة التحقق بخطوتين مش معروفة والدخول بيُرفض: ${(error as Error).message}`
      )
      return 'UNKNOWN'
    }
  }

  /** البريد مضبوط؟ الشاشة بتسأل قبل ما المالك يفتح التحقق. */
  mailConfigured(): boolean {
    return this.mail.isConfigured()
  }

  /**
   * فتح حالة دخول معلَّقة: بيولّد الرمز، **يبعته الأول**، وبعد نجاح الإرسال بس بيكتب الصف.
   * فشل البريد = MailSendError بيطلع لبرّه → الدخول بيُرفض ومفيش جلسة ولا حالة معلَّقة (مفيش دخول صامت).
   */
  async open(user: User, method: LoginChallengeMethod, address: string): Promise<TwoFactorChallengeView> {
    const to = (address ?? '').trim()
    if (!to || !to.includes('@')) {
      throw new MailSendError(
        `مفيش عنوان بريد صالح للحساب ${user.id} (المصدر: ${method === 'DOMAIN' ? 'AD ثم بريد الحساب' : 'بريد الحساب'})`,
        this.mail.isConfigured()
      )
    }
    const code = rawCode(OTP.codeLength)
    const now = new Date()
    let result: { response: string; messageId: string | null }
    try {
      result = await this.mail.send({
        to,
        subject: 'رمز الدخول لنظام الموارد البشرية',
        text:
          `رمز الدخول: ${code}\n\n` +
          `الرمز صالح ${Math.round(OTP.ttlSeconds / 60)} دقائق ولمرة واحدة.\n` +
          'لو مش إنت اللي طلب الدخول، بلّغ الدعم الفني ولا تشارك الرمز مع أي حد.',
      })
    } catch (error) {
      // السبب الحقيقي في سجل الخادم (رد خادم البريد بالحرف) — والمستخدم بياخد رسالة عربية واضحة
      const detail = error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error)
      this.logger.error(
        `رفض دخول ${method} للحساب ${user.id}: فشل إرسال رمز التحقق إلى ${maskEmail(to)} — ${detail}`
      )
      throw error
    }
    this.logger.log(
      `رمز تحقق اتبعت للحساب ${user.id} (${method}) إلى ${maskEmail(to)} — رد خادم البريد: ${result.response || 'بلا رد'}`
    )

    // أي حالة معلَّقة تانية لنفس الحساب تُغلق: الرمز مربوط بمحاولة دخول واحدة بس
    await this.challenges.update(
      { userId: user.id, consumedAt: IsNull(), lockedAt: IsNull() },
      { consumedAt: now }
    )
    const token = crypto.randomBytes(OTP.challengeTokenBytes).toString('hex')
    await this.challenges.insert({
      token,
      userId: user.id,
      codeHash: await bcrypt.hash(code, 10),
      method,
      sentTo: to.slice(0, 200),
      expiresAt: new Date(now.getTime() + OTP.ttlSeconds * 1000),
      attempts: 0,
      resendCount: 0,
      lastSentAt: now,
      consumedAt: null,
      lockedAt: null,
      createdAt: now,
    })
    void this.cleanup()
    return {
      twoFactor: true,
      challengeToken: token,
      sentTo: maskEmail(to),
      expiresInSeconds: OTP.ttlSeconds,
      resendAfterSeconds: OTP.resendCooldownSeconds,
      codeLength: OTP.codeLength,
    }
  }

  /**
   * التحقق من الرمز. النجاح بيستهلك الحالة (مرة واحدة) ويرجّع الصف عشان auth.service يفتح الجلسة.
   * أي رفض بيرمي TwoFactorError برسالة عربية — ومفيش جلسة في أي حالة رفض.
   *
   * **الصف بيتقرا تاني بعد المقارنة.** مقارنة bcrypt بتاخد وقتًا محسوسًا (عشرات المللي)، والصف
   * ممكن يتغيّر خلالها: محاولة متوازية بتزوّد العدّاد، أو إعادة إرسال بتبدّل الرمز. فأي قرار بعد
   * المقارنة (العدّ والقفل، والاستهلاك) مبني على القراءة الجديدة وعلى تحديث مشروط بها — مش على
   * النسخة اللي دخلنا بيها المقارنة.
   */
  async verify(token: string, code: string): Promise<LoginChallenge> {
    const row = await this.challenges.findOne({ where: { token: (token ?? '').trim() } })
    // المقارنة حرفية: الـcollation مش حسّاس لحالة الأحرف ولا للمسافات الأخيرة، فتوكن مختلف مايتقبلش
    if (!row || row.token !== (token ?? '').trim()) {
      throw new TwoFactorError('UNKNOWN', 'طلب الدخول مش معروف أو انتهى — ابدأ تسجيل الدخول من جديد')
    }
    this.assertOpen(row)
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new TwoFactorError('EXPIRED', 'انتهت صلاحية الرمز — ابدأ تسجيل الدخول من جديد واطلب رمزًا جديدًا')
    }
    const clean = String(code ?? '').replace(/\D/g, '')
    const ok = clean.length === OTP.codeLength && (await bcrypt.compare(clean, row.codeHash))
    const fresh = await this.reread(row.id)
    if (!ok) {
      const { attempts, locked } = await this.countWrongAttempt(row.id, fresh)
      this.logger.warn(`رمز تحقق غلط للحساب ${row.userId} (محاولة ${attempts}/${OTP.maxAttempts})${locked ? ' — الطلب اتقفل' : ''}`)
      throw new TwoFactorError(
        locked ? 'LOCKED' : 'WRONG_CODE',
        locked
          ? 'الرمز غلط والمحاولات خلصت — ابدأ تسجيل الدخول من جديد'
          : `الرمز غلط — باقي لك ${OTP.maxAttempts - attempts} محاولة`
      )
    }
    // الرمز صح، لكن لازم يكون **لسه** رمز الحالة: إعادة إرسال بدّلت الـhash وإحنا بنقارن؟ القديم بطل.
    // المقارنة هنا حرفية في JS لأن الـcollation مش حسّاس لحالة الأحرف (نفس سبب مقارنة التوكن فوق)
    this.assertOpen(fresh)
    if (fresh.codeHash !== row.codeHash) {
      throw new TwoFactorError('SUPERSEDED', 'الرمز ده بطل بعد إرسال رمز جديد — استخدم آخر رمز وصلك')
    }
    // استهلاك بشرط: تحديث واحد مشروط بأن الصف لسه مفتوح **وأن الرمز لسه هو اللي قارنّاه**، فطلبين
    // متوازيين بنفس الرمز مايفتحوش جلستين، ورمز استبدلته إعادة إرسال مايُستهلكش ولو كان التحقق جارٍ
    const consumed = await this.challenges.update(
      { id: row.id, codeHash: row.codeHash, consumedAt: IsNull(), lockedAt: IsNull() },
      { consumedAt: new Date() }
    )
    if (!consumed.affected) {
      throw new TwoFactorError('CONSUMED', 'الرمز ده استُخدم قبل كده — ابدأ تسجيل الدخول من جديد')
    }
    return row
  }

  /** الصف لسه مفتوح؟ مستهلك أو مقفول = رفض بنفس رسائل النهاردة بالحرف. */
  private assertOpen(row: LoginChallenge): void {
    if (row.consumedAt) {
      throw new TwoFactorError('CONSUMED', 'الرمز ده استُخدم قبل كده — ابدأ تسجيل الدخول من جديد')
    }
    if (row.lockedAt) {
      throw new TwoFactorError('LOCKED', 'المحاولات خلصت وطلب الدخول اتقفل — ابدأ تسجيل الدخول من جديد')
    }
  }

  /** الصف من القاعدة من جديد بمعرّفه (التوكن اتحقق قبل كده) — واختفاؤه = طلب دخول مش معروف. */
  private async reread(id: number): Promise<LoginChallenge> {
    const row = await this.challenges.findOne({ where: { id } })
    if (!row) {
      throw new TwoFactorError('UNKNOWN', 'طلب الدخول مش معروف أو انتهى — ابدأ تسجيل الدخول من جديد')
    }
    return row
  }

  /**
   * عدّ محاولة غلط — بحيث المتوازي مايضيّعش أي محاولة:
   * الزيادة بتتكتب بتحديث **مشروط** بالقيمة اللي قريناها لتوّنا
   * (`WHERE id = @id AND attempts = @seen AND consumedAt IS NULL AND lockedAt IS NULL`).
   * لو استدعاء تاني سبقنا وزوّد العدّاد، التحديث مايأثّرش على أي صف (SQL Server بيعيد تقييم شرط
   * الـWHERE بعد ما قفل الصف يُفك)، فنقرأ القيمة الجديدة من القاعدة ونزوّد من فوقها. القفل بيتكتب
   * في **نفس** التحديث اللي بيوصل للحد، فمفيش نافذة بين وصول العدّاد للحد وكتابة القفل.
   * القرار بيرجع من القيمة اللي القاعدة قبلتها، مش من القيمة المقروءة قبل المقارنة (سبب فقدان
   * المحاولات المتوازية قبل كده: `row.attempts + 1` محسوبة في JS ومكتوبة بالتعيين).
   */
  private async countWrongAttempt(
    id: number,
    seen: LoginChallenge
  ): Promise<{ attempts: number; locked: boolean }> {
    let current = seen
    for (let round = 0; round < OTP.attemptWriteRounds; round++) {
      // استدعاء متوازي قفل الحالة أو استهلكها؟ مفيش عدّ ولا رسالة «باقي لك» — الرفض بسببه الحقيقي
      this.assertOpen(current)
      const attempts = current.attempts + 1
      const locked = attempts >= OTP.maxAttempts
      const written = await this.challenges.update(
        { id, attempts: current.attempts, consumedAt: IsNull(), lockedAt: IsNull() },
        { attempts, ...(locked ? { lockedAt: new Date() } : {}) }
      )
      if (written.affected) return { attempts, locked }
      current = await this.reread(id)
    }
    // الصف بيتغيّر تحت إيدينا أكتر من الحد: ضغط متوازي على رمز واحد، مش استخدام عادي → نقفل
    this.logger.error(`ضغط متوازي على حالة دخول واحدة (${id}) فوق الحد المسموح — الحالة اتقفلت`)
    await this.challenges.update({ id, consumedAt: IsNull(), lockedAt: IsNull() }, { lockedAt: new Date() })
    return { attempts: OTP.maxAttempts, locked: true }
  }

  /**
   * شروط إعادة الإرسال بترتيبها ورسائلها زي ما هي بالحرف: الحالة لسه مفتوحة، المهلة عدّت، والحد ما اتخطاش.
   * منفصلة عن `assertOpen` بقصد — رسائل مسار إعادة الإرسال مختلفة بالحرف عن رسائل مسار التحقق.
   */
  private assertResendAllowed(row: LoginChallenge): void {
    if (row.consumedAt) throw new TwoFactorError('CONSUMED', 'طلب الدخول ده خلص — ابدأ تسجيل الدخول من جديد')
    if (row.lockedAt) throw new TwoFactorError('LOCKED', 'طلب الدخول اتقفل — ابدأ تسجيل الدخول من جديد')
    const waited = Math.floor((Date.now() - row.lastSentAt.getTime()) / 1000)
    if (waited < OTP.resendCooldownSeconds) {
      const remaining = OTP.resendCooldownSeconds - waited
      throw new TwoFactorError('RESEND_TOO_SOON', `استنى ${remaining} ثانية قبل طلب رمز جديد`, remaining)
    }
    if (row.resendCount >= OTP.maxResends) {
      throw new TwoFactorError('RESEND_LIMIT', 'وصلت أقصى عدد لإعادة إرسال الرمز — ابدأ تسجيل الدخول من جديد')
    }
  }

  /**
   * حجز خانة إعادة إرسال **قبل** ما أي رسالة تتبعت — بنفس أسلوب `countWrongAttempt` بالحرف:
   * الزيادة بتتكتب بتحديث **مشروط** بالقيمة اللي قريناها لتوّنا
   * (`WHERE id = @id AND resendCount = @seen AND consumedAt IS NULL AND lockedAt IS NULL`).
   * لو استدعاء تاني سبقنا، التحديث مايأثّرش على أي صف، فنقرأ الصف من جديد ونعيد فحص الشروط على القيم
   * اللي القاعدة قبلتها — والمهلة محمية بالتبعية: الكاسب كتب `lastSentAt` فالتاني بياخد «استنى ثانية»
   * بدل رسالة تانية في نفس النافذة. قبل كده كانت الزيادة بالتعيين (`row.resendCount + 1` محسوبة في JS)،
   * فطلبان في نفس اللحظة كانا بيكتبوا نفس الرقم — رسالتان بخانة واحدة، والحد المعلن بيتخطى.
   *
   * العدّاد لوحده كافٍ للإقصاء المتبادل (كل حجز بيزوّده)، و`lastSentAt` **مقصود** إنه مش في الشرط:
   * اتقيس على SQL حقيقي — الكتابة بتروح بنوع العمود فتتخزن بالتوقيت المحلي (`02:30:21.621`)، لكن باراميتر
   * الـ`Date` في `WHERE` بيتبعت بلا نوع (نص ISO بـUTC: `23:30:21.621Z`)، فالمساواة بتطابق **صفر** صفوف
   * بالسكوت وكل الحجوزات بتفضل تدوّر لحد الحد. الشرط على العدّاد رقم صحيح — مفيش لبس فيه.
   */
  private async claimResend(seen: LoginChallenge): Promise<{ resendCount: number; sentAt: Date }> {
    let current = seen
    for (let round = 0; round < OTP.attemptWriteRounds; round++) {
      this.assertResendAllowed(current)
      const sentAt = new Date()
      const resendCount = current.resendCount + 1
      const written = await this.challenges.update(
        { id: current.id, resendCount: current.resendCount, consumedAt: IsNull(), lockedAt: IsNull() },
        { resendCount, lastSentAt: sentAt }
      )
      if (written.affected) return { resendCount, sentAt }
      current = await this.reread(current.id)
    }
    // الصف بيتغيّر تحت إيدينا أكتر من الحد: ضغط متوازي على طلب دخول واحد، مش استخدام عادي.
    // الرفض هنا على الإرسال بس — الحالة مابتتقفلش، فالرمز اللي في إيد صاحب الحساب يفضل شغّال.
    this.logger.error(`ضغط متوازي على إعادة إرسال حالة دخول واحدة (${seen.id}) فوق الحد المسموح — مفيش رسالة اتبعت`)
    throw new TwoFactorError('RESEND_LIMIT', 'وصلت أقصى عدد لإعادة إرسال الرمز — ابدأ تسجيل الدخول من جديد')
  }

  /**
   * إعادة إرسال رمز جديد لنفس محاولة الدخول — بمهلة وبحد أعلى، والمحاولات الغلط مابتتصفّرش.
   * **الترتيب: نحجز الأول وبعدين نبعت.** الحجز تحديث مشروط بيزوّد العدّاد، فمستحيل عدد الرسايل
   * يزيد على `OTP.maxResends` مهما كان التوازي. وفشل الإرسال بيفضل بياكل الخانة زي النهاردة بالحرف
   * (السلوك المقصود: إعادة الإرسال مش طبنجة على خادم بريد واقع) — والرمز القديم بيفضل صالح.
   */
  async resend(token: string): Promise<{ sentTo: string; resendAfterSeconds: number; expiresInSeconds: number }> {
    const row = await this.challenges.findOne({ where: { token: (token ?? '').trim() } })
    if (!row || row.token !== (token ?? '').trim()) {
      throw new TwoFactorError('UNKNOWN', 'طلب الدخول مش معروف أو انتهى — ابدأ تسجيل الدخول من جديد')
    }
    // الرفض المبكر زي ما هو: طلب مرفوض مايستهلكش أي شغل تشفير ولا يلمس الصف
    this.assertResendAllowed(row)
    const code = rawCode(OTP.codeLength)
    // الـhash قبل الحجز: نافذة «اتبعت والـhash لسه ما اتكتبش» تفضل أضيق ما يمكن
    const codeHash = await bcrypt.hash(code, 10)
    const claim = await this.claimResend(row)
    try {
      const result = await this.mail.send({
        to: row.sentTo,
        subject: 'رمز الدخول لنظام الموارد البشرية',
        text:
          `رمز الدخول الجديد: ${code}\n\n` +
          `الرمز صالح ${Math.round(OTP.ttlSeconds / 60)} دقائق ولمرة واحدة، والرمز القديم بطل.\n` +
          'لو مش إنت اللي طلب الدخول، بلّغ الدعم الفني ولا تشارك الرمز مع أي حد.',
      })
      // الرمز الجديد بيتثبت بعد نجاح الإرسال بس، ومشروط بحجزنا: لو إعادة إرسال أحدث كسبت خانة بعدينا
      // مانكتبش hash أقدم فوق الأحدث (نفس منطق الاستهلاك المشروط في `verify`).
      const stored = await this.challenges.update(
        { id: row.id, resendCount: claim.resendCount, consumedAt: IsNull(), lockedAt: IsNull() },
        { codeHash, expiresAt: new Date(claim.sentAt.getTime() + OTP.ttlSeconds * 1000) }
      )
      if (!stored.affected) {
        this.logger.warn(`حالة الدخول ${row.id} اتغيرت بعد الحجز — الرمز المبعوت ما اتثبتش، والصالح هو آخر رمز اتثبت`)
      }
      this.logger.log(
        `إعادة إرسال رمز للحساب ${row.userId} إلى ${maskEmail(row.sentTo)} — رد خادم البريد: ${result.response || 'بلا رد'}`
      )
    } catch (error) {
      // الإرسال فشل: الرمز القديم بيفضل صالح (مابنكتبش hash جديد)، والخانة المحجوزة بتفضل متحسبة —
      // المهلة والحد بيسريان برضه عشان إعادة الإرسال ماتبقاش طبنجة على خادم بريد واقع
      const detail = error instanceof MailSendError ? error.detail : String((error as Error)?.message ?? error)
      this.logger.error(`فشل إعادة إرسال رمز للحساب ${row.userId} إلى ${maskEmail(row.sentTo)} — ${detail}`)
      throw error
    }
    return {
      sentTo: maskEmail(row.sentTo),
      resendAfterSeconds: OTP.resendCooldownSeconds,
      expiresInSeconds: OTP.ttlSeconds,
    }
  }

  /** الحالات القديمة (مستهلكة أو منتهية) مش لازم تتراكم — تنضيف هادي بلا أي أثر على الدخول. */
  private async cleanup(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - OTP.cleanupAfterHours * 3600 * 1000)
      await this.challenges.delete({ createdAt: LessThan(cutoff) })
    } catch (error) {
      this.logger.debug(`تعذّر تنضيف حالات الدخول القديمة: ${(error as Error).message}`)
    }
  }
}
