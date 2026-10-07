import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Repository } from 'typeorm'
import type { JwtPayload } from './auth.service'
import { branchScopeCovers, branchScopeOf, effectiveBranchScope } from './guards'
import { User } from './user.entity'
import { auditRequestContext } from '../audit/audit'
import { CSRF_HEADER, CSRF_MESSAGE, CSRF_TOKEN_INVALID, csrfMatches, csrfSafeMethod, sessionCookieOf } from './session-cookie'
import { SESSION_ENDED_MESSAGE } from './user-sessions'
import { UserSessionsService } from './user-sessions.service'

type SessionRequest = { headers: Record<string, unknown>; method?: string }
// نفس قارئ ترويسة Bearer اللي كان شغال بالحرف — وهو اللي بيحكم «الجلسة جاية منين» في المكانين (القراءة وحكم CSRF)
const bearerFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()
/** B2.17-ب: توكن ترويسة Bearer بنفس القارئ (الخروج بينهي جلسة التوكن اللي الطلب شايله) */
export const bearerTokenOf = (req: SessionRequest): string | null => bearerFromHeader(req as never)
/** B2.17: الجلسة جاية من cookie المتصفح (مفيش توكن في ترويسة Bearer)؟ دي اللي طلب الكتابة فيها محتاج رمز CSRF */
export const sessionViaCookie = (req: SessionRequest): boolean => bearerFromHeader(req as never) === null && sessionCookieOf(req) !== null

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly sessions: UserSessionsService
  ) {
    super({
      // B2.17: ترويسة Bearer أولًا (السكربتات والاختبارات — زي ما هي)، وإلا cookie الجلسة (المتصفح)
      jwtFromRequest: (req: SessionRequest) => bearerFromHeader(req as never) ?? sessionCookieOf(req),
      ignoreExpiration: false,
      // بلا قيمة افتراضية — validateEnv يضمن وجوده وطوله وقت الإقلاع
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    })
  }

  // إبطال فوري: نتحقق من الحساب في القاعدة كل طلب — نشط؟ وإصدار التوكن مطابق؟
  // (تغيير الدور/الصلاحيات أو التعطيل يزيد tokenVersion فيبطل التوكن القديم فوراً)
  async validate(req: SessionRequest, payload: JwtPayload) {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: ['id', 'isActive', 'tokenVersion', 'scopeAllBranches', 'scopeBranchIds', 'branchId'],
    })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب معطّل')
    }
    if ((user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('انتهت صلاحية الجلسة — سجّل الدخول من جديد')
    }
    // «نطاقه: كل الفروع» داخل التوكن لازم يطابق القاعدة: الشاشة بتزوّد tokenVersion مع أي تغيير، وده حزام تاني
    // لو العمود اتقفل من برّه الشاشة (SQL مباشر) — توكن لسه شايل «كل الفروع» لحساب اتقفل نطاقه يموت هنا.
    // العكس (العمود اتفتح والتوكن قديم) بيفضل مقفول على الفرع لحد الدخول الجاي: فشل مقفول.
    if (payload.scopeAllBranches === true && user.scopeAllBranches !== true) {
      throw new UnauthorizedException('انتهت صلاحية الجلسة — سجّل الدخول من جديد')
    }
    // ونفس الحزام للفروع المختارة: التوكن اللي شايل فروع صريحة (branchIds) مايدّيش فرع مش في نطاق الحساب في القاعدة
    // دلوقتي (فرع اتشال بـSQL مباشر من غير tokenVersion) — يموت هنا. التضييق من القاعدة بس اللي بيقتله؛ التوسيع بيستنى
    // الدخول الجاي (فشل مقفول). الدور هنا من التوكن: تغيير الدور نفسه بيزوّد tokenVersion.
    if (payload.role !== 'super_admin' && payload.scopeAllBranches !== true && Array.isArray(payload.branchIds)) {
      const current = effectiveBranchScope({ role: payload.role, scopeAllBranches: user.scopeAllBranches,
        scopeBranchIds: user.scopeBranchIds, branchId: user.branchId })
      if (!branchScopeCovers(current, branchScopeOf(payload))) {
        throw new UnauthorizedException('انتهت صلاحية الجلسة — سجّل الدخول من جديد')
      }
    }
    // B2.17-ب: توكن فيه رقم جلسة لازم جلسته تكون لسه قايمة (ماتنهتش بالخروج ولا من «جلساتي»)
    if (payload.sid && !(await this.sessions.active(payload.sid, payload.sub))) {
      throw new UnauthorizedException(SESSION_ENDED_MESSAGE)
    }
    // B2.17: الـcookie المتصفح بيبعتها لوحده، فطلب الكتابة بيها لازم يثبت إنه من صفحتنا: رمز CSRF بتاع الجلسة نفسها في
    // ترويسة (موقع تاني مايعرفش يقراه ولا يحط ترويسة). طلب Bearer من غير الشرط: الترويسة نفسها مابتتبعتش من موقع تاني.
    if (sessionViaCookie(req) && !csrfSafeMethod(req.method) && !csrfMatches(payload.csrf, req.headers[CSRF_HEADER])) {
      throw new ForbiddenException({ statusCode: 403, code: CSRF_TOKEN_INVALID, message: CSRF_MESSAGE })
    }
    // B2.1: صاحب الطلب لسجل التدقيق (التغييرات اللي مالهاش عمود «مين» بتاخده من هنا)
    const audit = auditRequestContext.getStore()
    if (audit) audit.userId = payload.sub
    return payload
  }
}
