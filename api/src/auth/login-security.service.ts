import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { LoginEvent } from './login-event.entity'
import {
  LOCKOUT_MAX_ATTEMPTS_KEY, LOCKOUT_MINUTES_KEY, PASSWORD_MIN_LENGTH_KEY, TWO_FACTOR_ROLES_KEY, lockoutSettingsOf, passwordMinLengthOf,
  passwordPolicyIssue, twoFactorRolesOf, type LockoutSettings, type PasswordContext,
} from './login-security'

export interface LoginContext { ip?: string | null; userAgent?: string | null }
export type LoginMethod = 'PASSWORD' | 'DOMAIN' | 'CODE' | 'ADMIN'
export interface LockState { failedLoginCount: number; lockedUntil: Date | null }

// أرقام أخطاء SQL Server: عمود (207) أو جدول (208) مش موجود — الكود اتنشر قبل ترحيل 078
const sqlErrorNumbers = (error: any): number[] =>
  [error?.number, error?.driverError?.number, error?.originalError?.info?.number, error?.driverError?.originalError?.info?.number].filter(Number.isFinite)
const schemaMissing = (error: unknown) => sqlErrorNumbers(error).some(number => number === 207 || number === 208)

/**
 * أمان الدخول (خطة التنفيذ B1.3): القفل المؤقت وسجل الدخول وسياسة كلمة السر والأدوار اللي التحقق بخطوتين إلزامي ليها.
 * الكود شغال قبل ترحيل 078 وبعده: العمودين أو الجدول مش موجودين = مفيش قفل ولا سجل (والدخول نفسه زي الأول بالحرف)، وتحذير واحد في سجل الخادم.
 */
@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name)
  private missingWarned = false

  constructor(private readonly ds: DataSource) {}

  private warnMissing(error: unknown) {
    if (!schemaMissing(error)) throw error
    if (!this.missingWarned) {
      this.missingWarned = true
      this.logger.warn('أعمدة القفل أو جدول سجل الدخول مش موجودين (ترحيل 078 لسه ماتطبقش) — القفل والسجل متوقفين لحد ما يتطبق')
    }
  }

  private async config(keys: string[]): Promise<Record<string, string | null>> {
    const rows: Array<{ key: string; value: string | null }> = await this.ds.query(
      `SELECT [key], [value] FROM dbo.requests_config WHERE [key] IN (${keys.map((_, index) => `@${index}`).join(', ')})`, keys)
    return Object.fromEntries(rows.map(row => [row.key, row.value]))
  }

  async lockoutSettings(): Promise<LockoutSettings> {
    return lockoutSettingsOf(await this.config([LOCKOUT_MAX_ATTEMPTS_KEY, LOCKOUT_MINUTES_KEY]))
  }

  async twoFactorRoles(): Promise<string[]> {
    return twoFactorRolesOf((await this.config([TWO_FACTOR_ROLES_KEY]))[TWO_FACTOR_ROLES_KEY])
  }

  /** سياسة كلمة السر الجديدة — رفض 400 بكود PASSWORD_POLICY ورسالة عربية. */
  async assertPassword(password: unknown, context: PasswordContext = {}) {
    const minLength = passwordMinLengthOf((await this.config([PASSWORD_MIN_LENGTH_KEY]))[PASSWORD_MIN_LENGTH_KEY])
    const issue = passwordPolicyIssue(password, minLength, context)
    if (issue) throw new BadRequestException({ code: 'PASSWORD_POLICY', message: issue, minLength })
  }

  /** حالة القفل للحساب (قبل الترحيل: مش مقفول). */
  async lockState(userId: number): Promise<LockState> {
    try {
      const [row] = await this.ds.query('SELECT [failedLoginCount], [lockedUntil] FROM dbo.users WHERE [id] = @0', [userId])
      return { failedLoginCount: Number(row?.failedLoginCount ?? 0), lockedUntil: row?.lockedUntil ? new Date(row.lockedUntil) : null }
    } catch (error) { this.warnMissing(error); return { failedLoginCount: 0, lockedUntil: null } }
  }

  /** الحسابات المقفولة دلوقتي ولحد إمتى — استعلام واحد لشاشة المستخدمين (قبل الترحيل: ولا حساب). */
  async lockedAccounts(now = new Date()): Promise<Map<number, Date>> {
    try {
      const rows: Array<{ id: number; lockedUntil: Date }> = await this.ds.query('SELECT [id], [lockedUntil] FROM dbo.users WHERE [lockedUntil] > @0', [now])
      return new Map(rows.map(row => [Number(row.id), new Date(row.lockedUntil)]))
    } catch (error) { this.warnMissing(error); return new Map() }
  }

  /**
   * محاولة كلمة سر غلط: العداد بيزيد ذريًا (قفل منتهي = العداد يبدأ من 1)، ولو وصل الحد الحساب بيتقفل للمدة.
   * بيرجّع الحالة بعد المحاولة (قبل الترحيل: null).
   */
  async registerFailure(userId: number, settings: LockoutSettings, now = new Date()): Promise<LockState | null> {
    const until = new Date(now.getTime() + settings.minutes * 60_000)
    try {
      const rows: Array<{ failedLoginCount: number; lockedUntil: Date | null }> = await this.ds.query(
        `UPDATE dbo.users SET
           [failedLoginCount] = CASE WHEN [lockedUntil] IS NOT NULL AND [lockedUntil] <= @1 THEN 1 ELSE [failedLoginCount] + 1 END,
           [lockedUntil] = CASE
             WHEN (CASE WHEN [lockedUntil] IS NOT NULL AND [lockedUntil] <= @1 THEN 1 ELSE [failedLoginCount] + 1 END) >= @2 THEN @3
             WHEN [lockedUntil] IS NOT NULL AND [lockedUntil] <= @1 THEN NULL
             ELSE [lockedUntil] END
         OUTPUT inserted.[failedLoginCount] AS [failedLoginCount], inserted.[lockedUntil] AS [lockedUntil]
         WHERE [id] = @0`, [userId, now, settings.maxAttempts, until])
      const row = rows[0]
      return row ? { failedLoginCount: Number(row.failedLoginCount), lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null } : null
    } catch (error) { this.warnMissing(error); return null }
  }

  /** دخول صح أو فك قفل: العداد صفر والقفل بيتشال. */
  async reset(userId: number, em: EntityManager | DataSource = this.ds): Promise<boolean> {
    try {
      const rows: unknown[] = await em.query(
        `UPDATE dbo.users SET [failedLoginCount] = 0, [lockedUntil] = NULL OUTPUT inserted.[id]
         WHERE [id] = @0 AND ([failedLoginCount] <> 0 OR [lockedUntil] IS NOT NULL)`, [userId])
      return rows.length > 0
    } catch (error) { this.warnMissing(error); return false }
  }

  /** سطر في سجل الدخول (قبل الترحيل: مفيش سجل). فشل الكتابة مايوقفش الدخول نفسه. */
  async record(entry: { userId?: number | null; identifier: string; method: LoginMethod; outcome: string; context?: LoginContext; actorUserId?: number | null }) {
    try {
      await this.ds.getRepository(LoginEvent).insert({
        at: new Date(), userId: entry.userId ?? null, identifier: String(entry.identifier ?? '').trim().slice(0, 200) || '—', method: entry.method,
        outcome: entry.outcome.slice(0, 30), ip: entry.context?.ip ? String(entry.context.ip).slice(0, 64) : null,
        userAgent: entry.context?.userAgent ? String(entry.context.userAgent).slice(0, 400) : null, actorUserId: entry.actorUserId ?? null,
      })
    } catch (error) {
      if (schemaMissing(error)) return this.warnMissing(error)
      this.logger.error(`تعذّر تسجيل محاولة الدخول في السجل: ${(error as Error).message}`)
    }
  }
}
