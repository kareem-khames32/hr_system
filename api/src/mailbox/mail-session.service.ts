import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { scrubSecrets } from '../auth/directory.types'
import { preboardingActive } from '../auth/preboarding'
import { readCookie, sessionCookieName, sessionCookieOptions } from '../auth/session-cookie'
import { ModulesService } from '../modules-registry/modules.service'
import { clearedMailKeyCookieHeader, mailKeyCookieHeader, vaultScopeOf } from './mail-vault'
import { MailVaultService } from './mail-vault.service'
import { MAIL_MODULE, mailboxConfigFrom, type MailboxConfig } from './mailbox-rules'
import { writeMailLogin } from './mailbox-store'

type HeaderResponse = { setHeader(name: string, value: string | string[]): unknown; getHeader?(name: string): unknown }

/** بيضيف Set-Cookie على اللي الرد شايله (cookie الجلسة بتتكتب قبله في نفس الرد) */
export function appendSetCookie(res: HeaderResponse, value: string) {
  const current = res.getHeader?.('Set-Cookie')
  const list = current === undefined || current === null ? [] : Array.isArray(current) ? current.map(String) : [String(current)]
  res.setHeader('Set-Cookie', [...list, value])
}

/**
 * B-ADD.16: نقط ربط البريد بالدخول والخروج — بتتنده من مسار الدخول (AuthService و AuthController) عشان الموظف مايكتبش كلمة مروره مرتين:
 *  - «الدخول بحساب الشركة» ناجح + موديول البريد مفعّل للحساب ← كلمة السر بتتخزن مشفّرة للجلسة (MailVaultService) ومفتاحها بيروح للمتصفح في cookie.
 *  - الخروج ← نص الجلسة بيتمسح، والـcookie بتتمسح.
 * أي فشل هنا مابيوقّفش الدخول ولا الخروج، وكلمة السر مابتتسجّلش ولا بترجع في رد.
 */
@Injectable()
export class MailSessionService {
  private readonly logger = new Logger(MailSessionService.name)
  readonly config: MailboxConfig

  constructor(
    config: ConfigService,
    private readonly vault: MailVaultService,
    private readonly jwt: JwtService,
    private readonly modules: ModulesService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {
    this.config = mailboxConfigFrom((key) => config.get(key))
  }

  /** البريد مضبوط على الخادم والموديول مفعّل للشركة؟ */
  private async open(): Promise<boolean> {
    return this.config.enabled && (await this.modules.isEnabled(MAIL_MODULE))
  }

  /**
   * اسم الموظف في المجال (UPN) بيتسجّل وقت «الدخول بحساب الشركة» — حتى لو الجلسة لسه مستنية رمز التحقق — عشان «افتح بريدك» يعرف يدخل
   * Exchange باسم مين. الاسم بس.
   */
  async rememberLogin(userId: number, userPrincipalName: string): Promise<void> {
    try {
      if (await this.open()) await writeMailLogin(this.ds.manager, userId, userPrincipalName)
    } catch (error) {
      this.logger.warn(`تعذّر تسجيل اسم دخول البريد للحساب ${userId}: ${String((error as Error)?.message ?? error).slice(0, 200)}`)
    }
  }

  /** توكن الجلسة اللي الرد لسه مسلّمها: من جسم الرد (جلسة توكن) أو من Set-Cookie (جلسة cookie). null = مفيش جلسة اتفتحت (مستني رمز التحقق) */
  private issuedToken(res: HeaderResponse, delivered: unknown): string | null {
    const inBody = (delivered as { accessToken?: unknown } | null)?.accessToken
    if (typeof inBody === 'string' && inBody) return inBody
    const header = res.getHeader?.('Set-Cookie')
    const name = sessionCookieName(sessionCookieOptions())
    for (const value of Array.isArray(header) ? header : header === undefined || header === null ? [] : [header]) {
      const token = readCookie(String(value).split(';')[0], name)
      if (token) return token
    }
    return null
  }

  /** بعد «الدخول بحساب الشركة»: لو اتفتحت جلسة كاملة والبريد مفعّل للحساب، كلمة السر بتتخزن مشفّرة ومفتاحها بيتبعت للمتصفح */
  async afterDomainLogin(res: HeaderResponse, delivered: unknown, secret: unknown): Promise<void> {
    if (typeof secret !== 'string' || !secret) return
    try {
      if (!(await this.open())) return
      const token = this.issuedToken(res, delivered)
      if (!token) return
      const payload = await this.jwt.verifyAsync<JwtPayload & { exp?: number }>(token)
      // جلسة مقيّدة (كلمة مؤقتة، تفعيل تطبيق المصادقة، بوابة التهيئة) مابتفتحش البريد، وجلستها الكاملة بتيجي برقم تاني
      if (payload.mustChangePassword === true || payload.totpSetupRequired === true || preboardingActive(payload)) return
      if (!(await this.modules.allowedFor(MAIL_MODULE, payload))) return
      const key = this.vault.store(vaultScopeOf(payload), secret, typeof payload.exp === 'number' ? payload.exp * 1000 : null)
      this.vault.attempts.reset(payload.sub)
      appendSetCookie(res, mailKeyCookieHeader(key, sessionCookieOptions()))
    } catch (error) {
      this.logger.warn(`تعذّر تجهيز البريد مع الدخول: ${scrubSecrets(String((error as Error)?.message ?? error), [secret]).slice(0, 200)}`)
    }
  }

  /** الخروج: نص الجلسة اللي التوكن ده بتاعها بيتمسح (توكن سليم التوقيع بس — توكن مزوّر مايمسحش بريد حد)، والـcookie بتتمسح من المتصفح */
  async afterLogout(res: HeaderResponse, token: string | null): Promise<void> {
    try {
      if (token) {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token).catch(() => null)
        if (payload && Number.isSafeInteger(payload.sub)) this.vault.drop(vaultScopeOf(payload))
      }
      // البريد مش مضبوط على الخادم أو موديوله مقفول = مفيش مفتاح بيتبعت، فرد الخروج زي ما هو بالحرف (P8A-N01). المفتاح مساره
      // /api/mail فمابيوصلش لطلب الخروج عشان نعرف منه؛ ولو الموديول اتقفل وفي متصفح مفتاح قديم، نصه على الخادم اتمسح فوق فمالوش قيمة.
      if (await this.open()) appendSetCookie(res, clearedMailKeyCookieHeader(sessionCookieOptions()))
    } catch (error) {
      this.logger.warn(`تعذّر قفل البريد مع الخروج: ${String((error as Error)?.message ?? error).slice(0, 200)}`)
    }
  }
}
