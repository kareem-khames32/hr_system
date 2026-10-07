import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from './auth.service'
import { jwtLifetimeSeconds } from './jwt-secret'
import type { LoginContext } from './login-security.service'
import { UserSession, type SessionEndReason } from './user-session.entity'
import { SESSION_KEEP_DAYS, SESSION_NOT_FOUND, SESSION_TOUCH_MINUTES, USER_SESSIONS_MIGRATION_MISSING, deviceLabel, userSessionsReady } from './user-sessions'

// B2.17-ب: الجلسات النشطة — صف لكل دخول، ورقمه في التوكن. صاحب الحساب بيشوف جلساته المفتوحة وبينهي أي واحدة منها؛ والخروج وتغيير
// كلمة المرور بينهوها من الخادم. قبل ترحيل 101: الجلسة بتتفتح من غير رقم (زي الأول)، والشاشة بتقول إن الترحيل ناقص.
// كل وقت هنا بساعة التطبيق (باراميتر Date) — نفس الساعة اللي الكيان بيكتب بيها: مشغّل القاعدة بيكتب ويقرا datetime2 بالتوقيت
// المحلي للتطبيق، فوقت مكتوب بساعة القاعدة (SYSUTCDATETIME) كان هيتقري مزاح بفرق المنطقة.
@Injectable()
export class UserSessionsService {
  private readonly logger = new Logger(UserSessionsService.name)

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly config: ConfigService) {}

  /** مدة الجلسة: نفس مدة التوكن (JWT_EXPIRES_IN) */
  private lifetimeMs(): number {
    return jwtLifetimeSeconds(this.config.get<string>('JWT_EXPIRES_IN', '8h')) * 1000
  }

  /** جلسة جديدة لدخول ناجح: بترجّع رقمها العشوائي للتوكن. null لو الترحيل لسه مااتطبقش (الجلسة من غير رقم) */
  async open(user: { id: number; tokenVersion?: number | null }, context: LoginContext = {}): Promise<string | null> {
    if (!(await userSessionsReady(this.ds.manager))) return null
    const now = new Date(), sid = crypto.randomBytes(24).toString('hex')
    await this.ds.getRepository(UserSession).insert({ sid, userId: user.id, tokenVersion: user.tokenVersion ?? 0, createdAt: now, lastSeenAt: now,
      expiresAt: new Date(now.getTime() + this.lifetimeMs()), ip: context.ip ? String(context.ip).slice(0, 64) : null,
      userAgent: context.userAgent ? String(context.userAgent).slice(0, 400) : null, revokedAt: null, revokedReason: null })
    void this.cleanup()
    return sid
  }

  /**
   * الجلسة دي لسه قايمة للحساب ده؟ (حارس الدخول بيسأل مع كل طلب توكنه فيه رقم جلسة.) صف مش موجود، أو لحساب تاني، أو اتنهى = لأ.
   * و«آخر نشاط» بيتحدّث لما يعدّي عليه كام دقيقة.
   */
  async active(sid: string, userId: number): Promise<boolean> {
    if (!(await userSessionsReady(this.ds.manager))) return true
    const [row]: Array<{ id: number; sid: string; userId: number; revokedAt: Date | null; lastSeenAt: Date }> = await this.ds.query(
      'SELECT [id], [sid], [userId], [revokedAt], [lastSeenAt] FROM [user_sessions] WHERE [sid] = @0', [sid])
    // المقارنة بالحرف: ترتيب القاعدة مش حسّاس لحالة الأحرف
    if (!row || row.sid !== sid || Number(row.userId) !== userId || row.revokedAt) return false
    if (Date.now() - new Date(row.lastSeenAt).getTime() > SESSION_TOUCH_MINUTES * 60_000) {
      await this.ds.query('UPDATE [user_sessions] SET [lastSeenAt] = @1 WHERE [id] = @0 AND [revokedAt] IS NULL', [row.id, new Date()]).catch(() => undefined)
    }
    return true
  }

  /** جلسات الحساب المفتوحة: مااتنهتش، ومدتها لسه ماخلصتش، وبإصدار الحساب الحالي — الأحدث نشاطًا أولًا. من غير رقم الجلسة نفسه */
  async list(user: JwtPayload) {
    if (!(await userSessionsReady(this.ds.manager))) return { available: false, message: USER_SESSIONS_MIGRATION_MISSING, items: [] }
    const rows: Array<{ id: number; sid: string; createdAt: Date; lastSeenAt: Date; expiresAt: Date; ip: string | null; userAgent: string | null }> = await this.ds.query(
      `SELECT s.[id], s.[sid], s.[createdAt], s.[lastSeenAt], s.[expiresAt], s.[ip], s.[userAgent]
       FROM [user_sessions] s INNER JOIN [users] u ON u.[id] = s.[userId]
       WHERE s.[userId] = @0 AND s.[revokedAt] IS NULL AND s.[expiresAt] > @1 AND s.[tokenVersion] = u.[tokenVersion]
       ORDER BY s.[lastSeenAt] DESC, s.[id] DESC`, [user.sub, new Date()])
    return { available: true, message: null, items: rows.map(row => ({ id: Number(row.id), current: !!user.sid && row.sid === user.sid, createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt, expiresAt: row.expiresAt, ip: row.ip, device: deviceLabel(row.userAgent) })) }
  }

  /** صاحب الحساب بينهي جلسة من جلساته برقم صفها. جلسة حساب تاني، أو منتهية، أو رقم مش موجود = نفس الرد */
  async end(user: JwtPayload, id: number): Promise<{ ended: true; current: boolean }> {
    if (!(await userSessionsReady(this.ds.manager))) throw new NotFoundException(SESSION_NOT_FOUND)
    return this.ds.transaction(async em => {
      const ended: Array<{ sid: string }> = Number.isSafeInteger(id) && id > 0 ? await em.query(
        `UPDATE [user_sessions] SET [revokedAt] = @2, [revokedReason] = N'USER' OUTPUT INSERTED.[sid]
         WHERE [id] = @0 AND [userId] = @1 AND [revokedAt] IS NULL`, [id, user.sub, new Date()]) : []
      if (!ended.length) throw new NotFoundException(SESSION_NOT_FOUND)
      const current = !!user.sid && ended[0].sid === user.sid
      await recordAudit(em, { category: 'LOGIN', action: 'SESSION_ENDED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
        summary: current ? 'إنهاء الجلسة الحالية من «جلساتي»' : 'إنهاء جلسة تانية من «جلساتي»', after: { sessionId: id } })
      return { ended: true as const, current }
    })
  }

  /** إنهاء كل جلسات الحساب ماعدا الحالية */
  async endOthers(user: JwtPayload): Promise<{ ended: number }> {
    if (!(await userSessionsReady(this.ds.manager))) return { ended: 0 }
    return this.ds.transaction(async em => {
      const ended: unknown[] = await em.query(
        `UPDATE [user_sessions] SET [revokedAt] = @2, [revokedReason] = N'USER' OUTPUT INSERTED.[id]
         WHERE [userId] = @0 AND [revokedAt] IS NULL AND [sid] <> @1`, [user.sub, user.sid ?? '', new Date()])
      if (ended.length) {
        await recordAudit(em, { category: 'LOGIN', action: 'SESSIONS_ENDED', entityType: 'user', entityId: user.sub, actorUserId: user.sub, branchId: user.branchId ?? null,
          summary: `إنهاء ${ended.length} جلسة تانية من «جلساتي»`, after: { count: ended.length } })
      }
      return { ended: ended.length }
    })
  }

  /** إنهاء جلسة برقمها (الخروج) — من غير خطأ لو مش موجودة أو منتهية */
  async revoke(sid: string, userId: number, reason: SessionEndReason): Promise<void> {
    if (!(await userSessionsReady(this.ds.manager))) return
    await this.ds.query(`UPDATE [user_sessions] SET [revokedAt] = @3, [revokedReason] = @2 WHERE [sid] = @0 AND [userId] = @1 AND [revokedAt] IS NULL`, [sid, userId, reason, new Date()])
  }

  /** إنهاء كل جلسات الحساب (تغيير كلمة المرور: الإصدار زاد والتوكنات القديمة ماتت — صفوفها بتتقفل معاها) */
  async revokeAll(userId: number, reason: SessionEndReason, em: EntityManager = this.ds.manager): Promise<void> {
    if (!(await userSessionsReady(em))) return
    await em.query(`UPDATE [user_sessions] SET [revokedAt] = @2, [revokedReason] = @1 WHERE [userId] = @0 AND [revokedAt] IS NULL`, [userId, reason, new Date()])
  }

  /** الصفوف اللي مدتها خلصت من زمان مش لازم تتراكم — تنضيف هادي من غير أي أثر على الدخول */
  private async cleanup(): Promise<void> {
    try {
      await this.ds.query('DELETE FROM [user_sessions] WHERE [expiresAt] < @0', [new Date(Date.now() - SESSION_KEEP_DAYS * 86_400_000)])
    } catch (error) {
      this.logger.debug(`تعذّر تنضيف الجلسات القديمة: ${(error as Error).message}`)
    }
  }
}
