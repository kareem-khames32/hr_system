import { BadRequestException, ConflictException, HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PRODUCT_NAME } from '../settings/product-name'
import type { JwtPayload } from './auth.service'
import {
  TOTP_ALREADY_ENABLED, TOTP_CHALLENGE_MARK, TOTP_MIGRATION_MISSING, TOTP_NOT_ENABLED, TOTP_NOT_STARTED, TOTP_REQUIRED_FOR_ROLE, TOTP_ROLES_KEY, TOTP_WRONG_CODE, groupedSecret, matchTotp,
  newTotpSecret, openTotpSecret, otpauthUrl, sealTotpSecret, totpRolesOf,
} from './totp'
import { UserTotp } from './user-totp.entity'

/** الحساب اللي بيتعاد ضبطه، بالخانات اللي حق المنفّذ اتحكم عليها (CRP3D-B17-01) */
export interface TotpResetTarget {
  id: number; email: string; branchId?: number | null
  role?: string | null; permissions?: string | null; scopeAllBranches?: boolean | null; scopeBranchIds?: string | null
  // CRP3E: إصدار الحساب — بيتحرك مع أي تغيير في صلاحياته الفعلية (حزمة دوره، المنح الفردية، دوره، نطاقه، تعطيله)
  tokenVersion?: number | null
}
export const TOTP_RESET_ACCOUNT_CHANGED = 'بيانات الحساب اتغيّرت — حدّث الصفحة وحاول تاني'
const accountStamp = (row: TotpResetTarget): string =>
  JSON.stringify([row.role ?? '', row.permissions ?? '', row.scopeAllBranches === true, row.scopeBranchIds ?? '', row.branchId ?? null, Number(row.tokenVersion ?? 0)])

/** رموز غلط ورا بعض قبل ما التحقق يتقفل، ومدة القفل */
export const TOTP_MAX_FAILURES = 5
export const TOTP_LOCK_MINUTES = 15

/** التحقق مقفول مؤقتًا بعد رموز غلط كتير */
export class TotpLockedError extends Error {
  constructor(readonly until: Date) {
    super(`رموز غلط كتير — التحقق بتطبيق المصادقة واقف ${Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000))} دقيقة`)
    this.name = 'TotpLockedError'
  }
}

let ready: boolean | null = null
/** جدول ترحيل 102 موجود؟ الموجود بيتحفظ. الناقص مابيتحفظش: بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function totpReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.user_totp', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الجدول */
export function resetTotpCache() { ready = null }

type Row = { id: number; secret: string; confirmedAt: Date | null; lastStep: number | null; failedCount: number; lockedUntil: Date | null }

// B2.17-ج: التحقق بتطبيق مصادقة — تفعيل الحساب (سر ← تأكيد برمز)، والتحقق في الدخول (الرمز مرة واحدة، وقفل مؤقت بعد رموز غلط)،
// وإلغاؤه برمز، وإعادة ضبطه من المدير. قبل ترحيل 102: ولا حساب مفعّل، والإلزام واقف (محدش يتقفل برّه)، والتفعيل برسالة الترحيل.
@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name)

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly config: ConfigService) {}

  private serverSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET')
  }

  private async assertReady(em: EntityManager = this.ds.manager) {
    if (!(await totpReady(em))) throw new BadRequestException(TOTP_MIGRATION_MISSING)
  }

  /** أكواد الأدوار اللي تطبيق المصادقة إلزامي ليها (الإعداد بيتقري كل مرة: تغييره بيسري من أول دخول بعده) */
  private async requiredRoles(em: EntityManager): Promise<string[]> {
    const row = await em.getRepository(RequestsConfig).findOne({ where: { key: TOTP_ROLES_KEY } })
    return totpRolesOf(row?.value ?? '')
  }

  private rowOf(em: EntityManager, userId: number, lock = false): Promise<Row | undefined> {
    return em.query(`SELECT [id], [secret], [confirmedAt], [lastStep], [failedCount], [lockedUntil] FROM [user_totp]${lock ? ' WITH (UPDLOCK, HOLDLOCK, ROWLOCK)' : ''} WHERE [userId] = @0`, [userId])
      .then((rows: Row[]) => rows[0])
  }

  /** الحساب مفعّل تطبيق المصادقة (سره مؤكَّد)؟ من جدول الأسرار بس — من غير قراءة الإعدادات. قبل ترحيل 102: لأ */
  async enrolled(userId: number): Promise<boolean> {
    const em = this.ds.manager
    return (await totpReady(em)) && !!(await this.rowOf(em, userId))?.confirmedAt
  }

  /**
   * حالة الحساب وقت فتح الجلسة: مفعّل (رمز التطبيق مطلوب للدخول)؟ إلزامي لدوره ولسه مافعّلش (الجلسة مابتفتحش غير التفعيل)؟
   * قبل ترحيل 102 لا ده ولا ده: الإلزام من غير جدول كان هيقفل أصحاب الأدوار برّه النظام.
   */
  async loginState(user: { id: number; role: string }): Promise<{ enrolled: boolean; required: boolean }> {
    const em = this.ds.manager
    if (!(await totpReady(em))) return { enrolled: false, required: false }
    const row = await this.rowOf(em, user.id)
    return { enrolled: !!row?.confirmedAt, required: (await this.requiredRoles(em)).includes(user.role) }
  }

  /** لشاشة «الأمان»: مفعّل؟ تفعيل بدأ ولسه مااتأكدش؟ إلزامي لدور الحساب؟ */
  async status(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await totpReady(em))) return { available: false, message: TOTP_MIGRATION_MISSING, enabled: false, pending: false, required: false }
    const row = await this.rowOf(em, user.sub)
    return { available: true, message: null, enabled: !!row?.confirmedAt, pending: !!row && !row.confirmedAt, required: (await this.requiredRoles(em)).includes(user.role) }
  }

  /**
   * بداية التفعيل: سر جديد للحساب (غير مؤكَّد — مابيتطلبش في الدخول لحد ما يتأكد برمز). بيرجع السر ورابط التطبيق **مرة واحدة هنا بس**.
   * بداية تانية قبل التأكيد بتبدّل السر (القديم بطل). حساب مفعّل بالفعل: مرفوض (يلغيه برمزه الأول).
   */
  async begin(user: JwtPayload) {
    await this.assertReady()
    const secret = newTotpSecret(), sealed = sealTotpSecret(secret, this.serverSecret())
    await this.ds.transaction(async em => {
      const row = await this.rowOf(em, user.sub, true)
      if (row?.confirmedAt) throw new BadRequestException(TOTP_ALREADY_ENABLED)
      if (row) await em.query('UPDATE [user_totp] SET [secret] = @1, [lastStep] = NULL, [failedCount] = 0, [lockedUntil] = NULL, [createdAt] = @2 WHERE [id] = @0', [row.id, sealed, new Date()])
      else await em.getRepository(UserTotp).insert({ userId: user.sub, secret: sealed, confirmedAt: null, lastStep: null, failedCount: 0, lockedUntil: null, createdAt: new Date() })
    })
    return { secret: groupedSecret(secret), otpauthUrl: otpauthUrl(PRODUCT_NAME, user.email, secret) }
  }

  /**
   * حكم رمز على صف الحساب المقفول (الصف ممسوك لآخر المعاملة: رمزين في نفس اللحظة واحد بس بيتقبل). رمز صح: خطوته بتتسجّل (مايتقبلش
   * تاني) والعدّاد بيتصفّر. رمز غلط: العدّاد بيزيد، وعند الحد التحقق بيتقفل مدة. مقفول = TotpLockedError من غير ما الرمز يتجرّب.
   */
  private async judge(em: EntityManager, row: Row, code: string): Promise<boolean> {
    // كل الأوقات بساعة التطبيق (باراميتر Date، زي الكيان): وقت القفل بيتكتب ويتقري ويتقارن بنفس الساعة
    const now = Date.now()
    if (row.lockedUntil && new Date(row.lockedUntil).getTime() > now) throw new TotpLockedError(new Date(row.lockedUntil))
    const secret = openTotpSecret(row.secret, this.serverSecret())
    if (!secret) this.logger.error(`سر تطبيق المصادقة لصف ${row.id} مابيتفكّش (سر الخادم اتغيّر؟) — صاحبه محتاج إعادة ضبط من المدير`)
    const step = secret ? matchTotp(secret, code, now, row.lastStep) : null
    if (step === null) {
      const failed = Number(row.failedCount ?? 0) + 1
      if (failed >= TOTP_MAX_FAILURES) {
        await em.query('UPDATE [user_totp] SET [failedCount] = 0, [lockedUntil] = @1 WHERE [id] = @0', [row.id, new Date(now + TOTP_LOCK_MINUTES * 60_000)])
      } else {
        await em.query('UPDATE [user_totp] SET [failedCount] = @1 WHERE [id] = @0', [row.id, failed])
      }
      return false
    }
    await em.query('UPDATE [user_totp] SET [lastStep] = @1, [failedCount] = 0, [lockedUntil] = NULL WHERE [id] = @0', [row.id, step])
    return true
  }

  /** رفض بحالته: مقفول = 429 برسالته، وإلا 400 «الرمز غلط» */
  private refusal(error: unknown): unknown {
    return error instanceof TotpLockedError ? new HttpException({ statusCode: 429, message: error.message }, 429) : error
  }

  /** تأكيد التفعيل برمز من التطبيق: من هنا الدخول بيطلب الرمز */
  async confirm(user: JwtPayload, code: string): Promise<void> {
    await this.assertReady()
    // حكم الرمز بيتثبّت (العدّاد والقفل) حتى لو الرد رفض: المعاملة بتكمّل والرفض بيتقال بعدها
    const outcome = await this.ds.transaction(async em => {
      const row = await this.rowOf(em, user.sub, true)
      if (row?.confirmedAt) return 'ENABLED' as const
      if (!row) return 'NONE' as const
      let ok: boolean
      try { ok = await this.judge(em, row, code) } catch (error) { if (error instanceof TotpLockedError) return error; throw error }
      if (!ok) return 'WRONG' as const
      await em.query('UPDATE [user_totp] SET [confirmedAt] = @1 WHERE [id] = @0', [row.id, new Date()])
      // CRP3D-B17-02: حالات الدخول المفتوحة برمز بريد للحساب بتتقفل مع التفعيل (في نفس المعاملة): رمز بريد اتبعت قبل التفعيل مايفتحش جلسة
      // بعد ما الحساب بقى بيدخل برمز التطبيق
      await em.query('UPDATE [login_challenges] SET [lockedAt] = @1 WHERE [userId] = @0 AND [consumedAt] IS NULL AND [lockedAt] IS NULL AND [codeHash] <> @2',
        [user.sub, new Date(), TOTP_CHALLENGE_MARK])
      await recordAudit(em, { category: 'LOGIN', action: 'TOTP_ENABLED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
        summary: 'تفعيل التحقق بتطبيق المصادقة' })
      return 'OK' as const
    })
    if (outcome instanceof TotpLockedError) throw this.refusal(outcome)
    if (outcome === 'ENABLED') throw new BadRequestException(TOTP_ALREADY_ENABLED)
    if (outcome === 'NONE') throw new BadRequestException(TOTP_NOT_STARTED)
    if (outcome === 'WRONG') throw new BadRequestException(TOTP_WRONG_CODE)
  }

  /**
   * التحقق في الدخول: الحساب مفعّل والرمز صح ولسه مااتقبلش؟ false = غلط (والعدّاد زاد). TotpLockedError لو التحقق مقفول مؤقتًا.
   * حساب مش مفعّل = false.
   */
  async verifyLogin(userId: number, code: string): Promise<boolean> {
    if (!(await totpReady(this.ds.manager))) return false
    const outcome = await this.ds.transaction(async em => {
      const row = await this.rowOf(em, userId, true)
      if (!row?.confirmedAt) return false
      try { return await this.judge(em, row, code) } catch (error) { if (error instanceof TotpLockedError) return error; throw error }
    })
    if (outcome instanceof TotpLockedError) throw outcome
    return outcome
  }

  /** إلغاء صاحب الحساب لتطبيق المصادقة برمز منه. مرفوض لو إلزامي لدوره */
  async disable(user: JwtPayload, code: string): Promise<void> {
    await this.assertReady()
    const outcome = await this.ds.transaction(async em => {
      const row = await this.rowOf(em, user.sub, true)
      if (!row?.confirmedAt) return 'NONE' as const
      if ((await this.requiredRoles(em)).includes(user.role)) return 'REQUIRED' as const
      let ok: boolean
      try { ok = await this.judge(em, row, code) } catch (error) { if (error instanceof TotpLockedError) return error; throw error }
      if (!ok) return 'WRONG' as const
      await em.query('DELETE FROM [user_totp] WHERE [id] = @0', [row.id])
      await recordAudit(em, { category: 'LOGIN', action: 'TOTP_DISABLED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
        summary: 'إلغاء التحقق بتطبيق المصادقة' })
      return 'OK' as const
    })
    if (outcome instanceof TotpLockedError) throw this.refusal(outcome)
    if (outcome === 'NONE') throw new BadRequestException(TOTP_NOT_ENABLED)
    if (outcome === 'REQUIRED') throw new BadRequestException(TOTP_REQUIRED_FOR_ROLE)
    if (outcome === 'WRONG') throw new BadRequestException(TOTP_WRONG_CODE)
  }

  /**
   * إعادة ضبط من المدير (موبايل ضاع): صف الحساب بيتمسح — دخوله الجاي من غير رمز التطبيق، ولو دوره إلزامي بيفعّل من جديد.
   * بيرجّع هل كان فيه حاجة اتمسحت.
   */
  async adminReset(actor: JwtPayload, target: TotpResetTarget): Promise<boolean> {
    if (!(await totpReady(this.ds.manager))) return false
    return this.ds.transaction(async em => {
      // CRP3D-B17-01: حق المنفّذ اتحكم على صف الحساب المقري قبل المعاملة. الصف بيتقفل هنا ويتقارن: دوره أو صلاحياته أو نطاقه اتغيّروا بعد
      // الحكم = رفض (المحاولة الجاية بتتحكم على الصف الجديد)، وأي تغيير تاني للحساب بيستنى المعاملة دي.
      // CRP3E: والمقارنة بإصدار الحساب كمان — تعديل حزمة الدور والمنح الفردية بيحرّكوا الإصدار في معاملتهم (من غير ما أعمدة الصف دي تتغيّر)،
      // فحكم اتعمل قبل ترقية ثبتت بيترفض، وترقية لسه ماثبتتش بتستنى القفل ده (إعادة الضبط سبقتها)
      const [fresh]: TotpResetTarget[] = await em.query(
        'SELECT [id], [email], [role], [permissions], [scopeAllBranches], [scopeBranchIds], [branchId], [tokenVersion] FROM [users] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [target.id])
      if (!fresh || accountStamp(fresh) !== accountStamp(target)) throw new ConflictException(TOTP_RESET_ACCOUNT_CHANGED)
      // الصف بيتقفل ويتقري الأول (رد جملة الحذف في المشغّل مش قايمة صفوف): مفيش صف = مفيش حاجة تتمسح ولا سطر تدقيق
      const row = await this.rowOf(em, target.id, true)
      if (!row) return false
      await em.query('DELETE FROM [user_totp] WHERE [id] = @0', [row.id])
      await recordAudit(em, { category: 'LOGIN', action: 'TOTP_RESET', entityType: 'user', entityId: target.id, actorUserId: actor.sub, branchId: target.branchId ?? null,
        summary: `إعادة ضبط تطبيق المصادقة للحساب ${target.email}` })
      return true
    })
  }
}
