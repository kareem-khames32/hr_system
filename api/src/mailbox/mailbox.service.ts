import { BadRequestException, ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { failureDelayMs } from '../auth/login-security'
import { EwsService, MailAuthRejected, type MailIdentity } from './ews.service'
import { MAIL_UNLOCK_LIMIT, vaultScopeOf } from './mail-vault'
import { MailVaultService } from './mail-vault.service'
import { MAIL_BAD_PASSWORD, MAIL_LOCKED, MAIL_NO_ACCESS, MAIL_NOT_CONFIGURED, MAIL_PASSWORD_REJECTED, MAIL_PASSWORD_REQUIRED } from './mailbox-rules'
import { readMailLogin } from './mailbox-store'
import { SharedMailboxesService } from './shared-mailboxes.service'

/** 428: البريد مقفول للجلسة دي — الواجهة بتعرض نموذج «افتح بريدك» (مش 401: 401 عند الواجهة = الجلسة نفسها انتهت) */
const locked = (message: string) => new HttpException({ statusCode: 428, code: 'MAIL_LOCKED', message }, 428)

/**
 * B-ADD.16: صندوق الموظف — مين بيدخل Exchange وبأنهي كلمة سر. الهوية كلها من الجلسة: الحساب من التوكن، وكلمة السر من مخزن الجلسة بمفتاح
 * المتصفح، واسم الدخول من المسجّل للحساب نفسه — مفيش معامل في طلب بيختار صندوق حد تاني. الصندوق المشترك بيتفتح للمضاف عليه بس.
 */
@Injectable()
export class MailboxService {
  constructor(
    private readonly ews: EwsService,
    private readonly vault: MailVaultService,
    private readonly shared: SharedMailboxesService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  private assertConfigured() {
    if (!this.ews.isConfigured()) throw new ServiceUnavailableException({ statusCode: 503, code: 'MAIL_NOT_CONFIGURED', message: MAIL_NOT_CONFIGURED })
  }

  /** اسم دخول الحساب على Exchange: اللي اتسجّل له وقت «الدخول بحساب الشركة»، وإلا بريد حسابه */
  private async loginOf(user: JwtPayload): Promise<string> {
    return (await readMailLogin(this.ds.manager, user.sub)) ?? user.email
  }

  /** حالة البريد للجلسة دي: مضبوط؟ مفتوح؟ وباسم مين بيدخل */
  async status(user: JwtPayload, browserKey: string | null) {
    const configured = this.ews.isConfigured()
    return {
      configured,
      unlocked: configured && this.vault.read(vaultScopeOf(user), browserKey) !== null,
      login: await this.loginOf(user),
      address: user.email,
    }
  }

  private async identity(user: JwtPayload, browserKey: string | null, target?: string): Promise<MailIdentity> {
    this.assertConfigured()
    const password = this.vault.read(vaultScopeOf(user), browserKey)
    if (password === null) throw locked(MAIL_LOCKED)
    // الصناديق المشتركة المعرّفة للحساب ده بس (وExchange بيتحقق من صلاحيته تاني)
    if (target && !(await this.shared.allowed(user.sub, target))) throw new ForbiddenException({ statusCode: 403, code: 'MAIL_NO_ACCESS', message: MAIL_NO_ACCESS })
    return { userId: user.sub, login: await this.loginOf(user), password, target }
  }

  /**
   * بينفّذ نداء على Exchange بهوية صاحب الجلسة. لو Exchange رفض كلمة السر (اتغيّرت في المجال وسط الجلسة) النص المخزّن بيتمسح والبريد
   * بيرجع «مقفول» — الموظف بيكتب الجديدة مرة.
   */
  async run<T>(user: JwtPayload, browserKey: string | null, target: string | undefined, work: (who: MailIdentity) => Promise<T>): Promise<T> {
    const who = await this.identity(user, browserKey, target)
    try {
      return await work(who)
    } catch (error) {
      if (!(error instanceof MailAuthRejected)) throw error
      this.vault.drop(vaultScopeOf(user))
      throw locked(MAIL_PASSWORD_REJECTED)
    }
  }

  /**
   * «افتح بريدك»: كلمة مرور بريد الشركة مرة واحدة للجلسة. بتتجرّب على Exchange نفسه بطلب صغير (باسم دخول الحساب — مش من الطلب)، ولو
   * اتقبلت بتتخزن مشفّرة والمفتاح بيرجع للمتصفح في cookie (المنادي بيكتبها). المحاولات الغلط بتتعدّ: خمسة ورا بعض = قفل ربع ساعة.
   * كلمة السر مابترجعش في رد، ومابتتكتبش في قاعدة ولا سجل ولا تدقيق ولا رسالة خطأ.
   */
  async unlock(user: JwtPayload, secret: unknown): Promise<string> {
    this.assertConfigured()
    if (typeof secret !== 'string' || !secret || secret.length > 400) throw new BadRequestException({ code: 'MAIL_PASSWORD_REQUIRED', message: MAIL_PASSWORD_REQUIRED })
    const attempts = this.vault.attempts
    const refused = (until: number) => new HttpException({ statusCode: 429, code: 'MAIL_UNLOCK_LOCKED', lockedUntil: new Date(until).toISOString(),
      message: `محاولات غلط كتير لكلمة مرور البريد — جرّب تاني بعد ${Math.max(1, Math.ceil((until - Date.now()) / 60_000))} دقيقة` }, 429)
    const lockedUntil = attempts.lockedUntil(user.sub)
    if (lockedUntil) throw refused(lockedUntil)
    try {
      await this.ews.unread({ userId: user.sub, login: await this.loginOf(user), password: secret })
    } catch (error) {
      if (!(error instanceof MailAuthRejected)) throw error
      const after = attempts.fail(user.sub)
      // نفس تأخير الدخول الغلط (AUTH_FAILURE_DELAY_MS بيصغّره في الاختبارات)
      const base = Number(process.env.AUTH_FAILURE_DELAY_MS ?? 1000)
      const wait = failureDelayMs(after.count, Number.isFinite(base) && base >= 0 ? base : 1000)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      if (after.lockedUntil) {
        await recordAudit(this.ds.manager, { category: 'LOGIN', action: 'MAIL_UNLOCK_LOCKED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
          summary: `«افتح بريدك» اتقفل ${MAIL_UNLOCK_LIMIT.minutes} دقيقة بعد ${MAIL_UNLOCK_LIMIT.maxAttempts} محاولات غلط` })
        throw refused(after.lockedUntil)
      }
      throw new BadRequestException({ code: 'MAIL_BAD_PASSWORD', message: MAIL_BAD_PASSWORD })
    }
    attempts.reset(user.sub)
    const exp = (user as JwtPayload & { exp?: number }).exp
    const key = this.vault.store(vaultScopeOf(user), secret, typeof exp === 'number' ? exp * 1000 : null)
    await recordAudit(this.ds.manager, { category: 'LOGIN', action: 'MAIL_UNLOCKED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
      summary: 'فتح البريد للجلسة بكلمة مرور بريد الشركة' })
    return key
  }

  /** قفل البريد للجلسة دي من غير خروج من النظام */
  lock(user: JwtPayload) {
    this.vault.drop(vaultScopeOf(user))
  }
}
