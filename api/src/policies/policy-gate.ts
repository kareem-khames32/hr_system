import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import type { Observable } from 'rxjs'
import type { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { ALLOW_DURING_POLICY_GATE } from './policy-gate.decorator'
import { POLICY_ACK_REQUIRED, POLICY_ACK_REQUIRED_MESSAGE, policySchemaReady } from './policy-rules'

// B2.7-أ: بوابة الإقرار في الخادم. الحساب اللي عليه سياسة إلزامية عدّت مهلة السماح أي نداء منه بيترفض (403 بكود)، ماعدا المسارات المعلَّمة
// بـ@AllowDuringPolicyGate() (policy-gate.decorator.ts) — نفس شكل بوابة كلمة السر المؤقتة (auth/guards.ts)، بس الفحص هنا محتاج قاعدة، فمكانه معترض عام بعد حارس
// الدخول (زي ModuleAudienceInterceptor).
//
// مسار الطلب العادي مابيزوّدش ولا استعلام طول ما مفيش سياسة إلزامية منشورة: العلامة في الذاكرة، وبتتحسب عند الإقلاع، ومع أي كتابة على
// السياسات في العملية دي، وكل دقيقة من مؤقّت في الخلفية (خادم تاني نشر أو سحب، أو الترحيل اتطبق والخادم شغال).
// العلامة «مش معروفة» (لسه مااتحسبتش، أو آخر قراءة ليها فشلت، أو فيه كتابة على السياسات لسه القراءة اللي بعدها مارجعتش) = البوابة شغالة
// والحكم لفحص كل حساب: تعذّر معرفة الحالة مابيعدّيش حد.

/** كل قد إيه العلامة العامة بتتحسب لوحدها */
const MANDATORY_REFRESH_MS = 60_000
/** الحساب اللي اتأكدنا إنه مش مقفول مابيتفحصش تاني قبل المدة دي (المقفول بيتفحص كل نداء، فالإقرار بيفتح فورًا) */
const CLEAR_MS = 60_000

@Injectable()
export class PolicyGate implements OnApplicationBootstrap, OnModuleDestroy {
  /** فيه سياسة إلزامية منشورة؟ null = مش معروف (لسه مااتحسبتش، أو آخر قراءة فشلت، أو كتابة لسه قراءتها مارجعتش): البوابة شغالة لحد قراءة ناجحة */
  private mandatory: boolean | null = null
  /** آخر «مش مقفول» لكل حساب: للهوية اللي اتفحصت (موظفه وإصدار جلسته) ووقتها */
  private readonly clear = new Map<number, { identity: string; at: number }>()
  /** بيزيد مع كل كتابة على السياسات: فحص أو قراءة بدأوا قبل الكتابة نتيجتهم مابتتسجّلش بعدها */
  private generation = 0
  /** كتابات على السياسات شغالة دلوقتي في العملية دي: طول ما فيه واحدة مفيش قراءة للعلامة ولا «مش مقفول» بتتسجّل */
  private writes = 0
  /** رقم آخر قراءة للعلامة بدأت، ورقم آخر واحدة اتسجّلت: قراءة رجعت بعد قراءة بدأت بعدها مابتكتبش فوقها */
  private reads = 0
  private recorded = 0
  private timer: NodeJS.Timeout | null = null
  /** بيتحط من خدمة السياسات (هي اللي عارفة الجمهور والنسخ والإقرارات) */
  private overdueFor: ((user: JwtPayload) => Promise<boolean>) | null = null

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    // قاعدة مش متاحة لحظة الإقلاع: الحالة بتفضل «مش معروفة» (البوابة شغالة)، والمؤقّت بيحاول تاني
    await this.refresh()
    // زي عامل الطابور: من غير مؤقّت في الاختبارات (NODE_ENV=test) — الاختبار بينادي refresh بإيده، فمفيش استعلام خلفية وسط عدّ الاستعلامات
    if (process.env.NODE_ENV !== 'test') this.startBackgroundRefresh()
  }

  onModuleDestroy() { this.stopBackgroundRefresh() }

  /** التحديث الدوري للعلامة: خادم تاني نشر أو سحب، أو الترحيل اتطبق والخادم شغال */
  startBackgroundRefresh() {
    this.timer = setInterval(() => { void this.refresh() }, MANDATORY_REFRESH_MS)
    this.timer.unref()
  }

  stopBackgroundRefresh() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  bind(overdueFor: (user: JwtPayload) => Promise<boolean>) { this.overdueFor = overdueFor }

  /** حساب العلامة العامة من القاعدة (مش من مسار الطلب العادي). قراءة فشلت = الحالة «مش معروفة» لحد قراءة ناجحة (ومابترميش) */
  async refresh() {
    const generation = this.generation, read = ++this.reads
    let found: boolean | null
    try {
      const ready = await policySchemaReady(this.ds.manager)
      const rows: unknown[] = !ready ? [] : await this.ds.query(
        `SELECT TOP (1) p.[id] FROM [policies] p WHERE p.[status] = N'PUBLISHED' AND p.[isMandatory] = 1
           AND EXISTS (SELECT 1 FROM [policy_versions] v WHERE v.[policyId] = p.[id])`)
      found = rows.length > 0
    } catch {
      found = null
    }
    // القراءة دي (نجحت أو فشلت) مابتتسجّلش لو كتابة على السياسات حصلت وهي شغالة، أو فيه كتابة لسه شغالة، أو قراءة بدأت بعدها سبقتها
    if (generation === this.generation && !this.writes && read > this.recorded) {
      this.recorded = read
      this.mandatory = found
    }
  }

  /**
   * أي كتابة على السياسات (نشر، تعديل، سحب) بتتنفّذ من هنا. من قبل ما تبدأ ولحد ما القراءة اللي بعدها ترجع العلامة «مش معروفة» (مش قيمتها
   * اللي قبل الكتابة) و«مش مقفول» المحفوظة متنسية، فالبوابة شغالة والحكم لفحص كل حساب — سواء الكتابة نجحت أو فشلت (ممكن تكون اتثبتت
   * وردّها ضاع).
   */
  async write<T>(work: () => Promise<T>): Promise<T> {
    this.writes++
    this.reset()
    try {
      return await work()
    } finally {
      this.writes--
      await this.changed()
    }
  }

  /**
   * السياسات اتغيّرت: العلامة والحسابات «المش مقفولة» بيتحسبوا من جديد. فشل قراءة العلامة هنا مابيبقاش فشل للطلب (الكتابة اتثبتت قبله، وكان
   * هيتعاد ويتكرر): الحالة بتفضل «مش معروفة»، فالبوابة شغالة والحكم لفحص كل حساب لحد القراءة الجاية.
   */
  async changed() {
    this.reset()
    await this.refresh()
  }

  /** البوابة ممكن تقفل حد دلوقتي؟ (من غير استعلام). «مش معروف» = أيوه؛ و«لأ» بس لما آخر قراءة قالت مفيش سياسة إلزامية منشورة (أو مفيش جداول) */
  active(): boolean { return this.mandatory !== false }

  /** الهوية اللي نتيجة الفحص تخصها: موظف الحساب وإصدار جلسته (ربطه بموظف تاني، أو تغيير دوره أو صلاحياته = جلسة جديدة) */
  private identityOf(user: JwtPayload) { return `${user.employeeId}:${user.tokenVersion ?? 0}` }

  /** الحساب مقفول على إقرار دلوقتي؟ */
  async blocks(user: JwtPayload): Promise<boolean> {
    if (!this.active() || !user.employeeId || !this.overdueFor) return false
    const seen = this.clear.get(user.sub)
    // «مش مقفول» المحفوظة بتعدّي نفس الموظف ونفس الجلسة بس، ولمدتها
    if (seen && seen.identity === this.identityOf(user) && Date.now() - seen.at < CLEAR_MS) return false
    const generation = this.generation
    const overdue = await this.overdueFor(user)
    // كتابة على السياسات حصلت والفحص شغال، أو لسه شغالة: «مش مقفول» دي ممكن تكون قديمة، فماتتسجّلش
    if (!overdue && generation === this.generation && !this.writes) this.clear.set(user.sub, { identity: this.identityOf(user), at: Date.now() })
    return overdue
  }

  /** نسيان العلامة والحسابات «المش مقفولة»: الحالة «مش معروفة» لحد القراءة الجاية */
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
