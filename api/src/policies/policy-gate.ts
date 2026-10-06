import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import type { Observable } from 'rxjs'
import type { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { ALLOW_DURING_POLICY_GATE } from './policy-gate.decorator'
import { POLICY_ACK_REQUIRED, POLICY_ACK_REQUIRED_MESSAGE, policySchemaKnown, policySchemaReady } from './policy-rules'

// B2.7-أ: بوابة الإقرار في الخادم. الحساب اللي عليه سياسة إلزامية عدّت مهلة السماح أي نداء منه بيترفض (403 بكود)، ماعدا المسارات المعلَّمة
// بـ@AllowDuringPolicyGate() (policy-gate.decorator.ts) — نفس شكل بوابة كلمة السر المؤقتة (auth/guards.ts)، بس الفحص هنا محتاج قاعدة، فمكانه معترض عام بعد حارس
// الدخول (زي ModuleAudienceInterceptor).
//
// مسار الطلب العادي مابيزوّدش ولا استعلام طول ما مفيش سياسة إلزامية منشورة: العلامة في الذاكرة، وبتتحسب عند الإقلاع، ومع أي كتابة على
// السياسات في العملية دي، وكل دقيقة من مؤقّت في الخلفية (خادم تاني نشر أو سحب، أو الترحيل اتطبق والخادم شغال).

/** كل قد إيه العلامة العامة بتتحسب لوحدها */
const MANDATORY_REFRESH_MS = 60_000
/** الحساب اللي اتأكدنا إنه مش مقفول مابيتفحصش تاني قبل المدة دي (المقفول بيتفحص كل نداء، فالإقرار بيفتح فورًا) */
const CLEAR_MS = 60_000

@Injectable()
export class PolicyGate implements OnApplicationBootstrap, OnModuleDestroy {
  /** فيه سياسة إلزامية منشورة؟ null = لسه مااتحسبش (بيتعامل «لأ» في مسار الطلب) */
  private mandatory: boolean | null = null
  private readonly clear = new Map<number, number>()
  /** بيزيد مع كل كتابة على السياسات: فحص أو قراءة بدأوا قبل الكتابة نتيجتهم مابتتسجّلش بعدها */
  private generation = 0
  private timer: NodeJS.Timeout | null = null
  /** بيتحط من خدمة السياسات (هي اللي عارفة الجمهور والنسخ والإقرارات) */
  private overdueFor: ((user: JwtPayload) => Promise<boolean>) | null = null

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    // قاعدة لسه من غير الجداول، أو مش متاحة لحظة الإقلاع: المؤقّت بيحاول تاني
    await this.refresh().catch(() => undefined)
    // زي عامل الطابور: من غير مؤقّت في الاختبارات (NODE_ENV=test) — الاختبار بينادي refresh بإيده، فمفيش استعلام خلفية وسط عدّ الاستعلامات
    if (process.env.NODE_ENV !== 'test') this.startBackgroundRefresh()
  }

  onModuleDestroy() { this.stopBackgroundRefresh() }

  /** التحديث الدوري للعلامة: خادم تاني نشر أو سحب، أو الترحيل اتطبق والخادم شغال */
  startBackgroundRefresh() {
    this.timer = setInterval(() => { void this.refresh().catch(() => undefined) }, MANDATORY_REFRESH_MS)
    this.timer.unref()
  }

  stopBackgroundRefresh() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  bind(overdueFor: (user: JwtPayload) => Promise<boolean>) { this.overdueFor = overdueFor }

  /** حساب العلامة العامة من القاعدة (مش من مسار الطلب العادي) */
  async refresh() {
    const generation = this.generation
    const ready = await policySchemaReady(this.ds.manager)
    const rows: unknown[] = !ready ? [] : await this.ds.query(
      `SELECT TOP (1) p.[id] FROM [policies] p WHERE p.[status] = N'PUBLISHED' AND p.[isMandatory] = 1
         AND EXISTS (SELECT 1 FROM [policy_versions] v WHERE v.[policyId] = p.[id])`)
    // كتابة على السياسات حصلت والقراءة شغالة: القراءة دي قديمة، واللي بعد الكتابة هي اللي بتتسجّل
    if (generation === this.generation) this.mandatory = rows.length > 0
  }

  /**
   * أي كتابة على السياسات (نشر، تعديل، سحب): العلامة والحسابات «المش مقفولة» بيتحسبوا من جديد. الكتابة نفسها اتثبتت قبل النداء ده، ففشل
   * قراءة العلامة مابيبقاش فشل للطلب (كان هيتعاد ويتكرر): البوابة بتفضل شغالة احتياطي والحكم لفحص كل حساب، لحد القراءة الجاية.
   */
  async changed() {
    const generation = ++this.generation
    this.clear.clear()
    // وكتابة أحدث حصلت قبل ما الفشل ده يرجع: قراءتها هي اللي بتحكم
    await this.refresh().catch(() => { if (generation === this.generation) this.mandatory = true })
  }

  /** البوابة ممكن تقفل حد دلوقتي؟ (من غير استعلام) */
  active(): boolean { return this.mandatory === true && policySchemaKnown() === true }

  /** الحساب مقفول على إقرار دلوقتي؟ */
  async blocks(user: JwtPayload): Promise<boolean> {
    if (!this.active() || !user.employeeId || !this.overdueFor) return false
    const seen = this.clear.get(user.sub)
    if (seen !== undefined && Date.now() - seen < CLEAR_MS) return false
    const generation = this.generation
    const overdue = await this.overdueFor(user)
    // كتابة على السياسات حصلت والفحص شغال: «مش مقفول» دي ممكن تكون قديمة، فماتتسجّلش
    if (!overdue && generation === this.generation) this.clear.set(user.sub, Date.now())
    return overdue
  }

  /** للاختبارات: نسيان الحالة */
  reset() { this.mandatory = null; this.generation++; this.clear.clear() }
}

@Injectable()
export class PolicyGateInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly gate: PolicyGate) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (ctx.getType() === 'http' && this.gate.active()) {
      const user = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>().user
      // كلمة السر المؤقتة الأول: حارس الدخول قافل الحساب ده على «غيّر كلمة المرور» و«مين أنا» بس، وبعد التغيير بوابة الإقرار بتشتغل
      if (user?.employeeId && !user.mustChangePassword
        && !this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_DURING_POLICY_GATE, [ctx.getHandler(), ctx.getClass()])
        && await this.gate.blocks(user)) {
        throw new ForbiddenException({ statusCode: 403, code: POLICY_ACK_REQUIRED, message: POLICY_ACK_REQUIRED_MESSAGE })
      }
    }
    return next.handle()
  }
}
