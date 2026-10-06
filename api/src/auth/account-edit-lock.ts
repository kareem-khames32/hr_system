import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { from, lastValueFrom, Observable } from 'rxjs'
import { DataSource } from 'typeorm'

// B2.8 (Codex CRP2Q-B01): تعديلات الحساب الواحد ورا بعض. مسار تعديل الحساب بيقرا الحساب، يسجّل ربطه القديم بالموظف، يحفظ الكيان كله
// ويبطّل الجلسات. تعديلين في نفس اللحظة كانوا بيقروا نفس الربط القديم: التاني بيسجّل ربط مش الربط اللي بيشيله فعلًا، أو بيحفظ فوق
// ربط جديد بكيان قديم من غير سجل (حتى لو هو تعديل صلاحيات بس) — وحساب كان مربوط بموظف في النص بيبقى من غير سجل، فيقرا التعليق الداخلي
// عن طلباته. القفل بيتاخد قبل ما المعالج يقرا الحساب وبيتساب بعد ما يحفظ: كل تعديل بيقرا اللي قبله بعد ما اتثبّت.
export const ACCOUNT_EDIT_BUSY = 'الحساب بيتعدّل دلوقتي من حد تاني — حاول تاني بعد لحظة'
const ACCOUNT_EDIT_WAIT_MS = 15000

// Codex CRP2R-B01: معاملة القفل ماسكة اتصال، والمعالج بيشتغل على اتصال تاني. من غير حد، تعديلات لحسابات مختلفة بعدد اتصالات المخزن
// كانت بتمسك الاتصالات كلها ومعالجاتها مستنية اتصال مش موجود (500 للكل). الحد: أقفال الحسابات المفتوحة في العملية الواحدة نص المخزن
// بالكتير، فنصه التاني فاضل لشغل المعالجات. اللي زاد بيستنى دوره من غير ما يمسك اتصال، ولو دوره ماجاش في المهلة بياخد نفس رد «مشغول».
const gate = { open: 0, waiting: [] as Array<{ grant: () => void }> }

/** أقصى عدد أقفال حسابات مفتوحة مع بعض: نص اتصالات المخزن. مخزن حجمه مش معروف = قفل واحد. مخزن باتصال واحد مافيهوش مكان لقفل */
export function accountEditLockLimit(ds: DataSource): number {
  const max = Number((ds.driver as any)?.master?.pool?.max)
  if (!Number.isSafeInteger(max) || max < 1) return 1
  return max < 2 ? 0 : Math.floor(max / 2)
}

function enterGate(limit: number, waitMs: number): Promise<void> {
  if (gate.open < limit) { gate.open++; return Promise.resolve() }
  return new Promise<void>((resolve, reject) => {
    const entry = { grant: () => { clearTimeout(timer); resolve() } }
    const timer = setTimeout(() => {
      const at = gate.waiting.indexOf(entry)
      if (at >= 0) gate.waiting.splice(at, 1)
      reject(new ConflictException(ACCOUNT_EDIT_BUSY))
    }, waitMs)
    gate.waiting.push(entry)
  })
}

// الدور بيتسلّم للي مستني من غير ما العدد ينزل: مفيش لحظة حد جديد يدخل فيها قبله
function leaveGate() {
  const next = gate.waiting.shift()
  if (next) next.grant()
  else gate.open--
}

/** للاختبارات: حالة الحد دلوقتي */
export const accountEditGateState = () => ({ open: gate.open, waiting: gate.waiting.length })

export async function accountEditLocked<T>(ds: DataSource, userId: number, work: () => Promise<T>, waitMs = ACCOUNT_EDIT_WAIT_MS): Promise<T> {
  const limit = accountEditLockLimit(ds), started = Date.now()
  // مخزن باتصال واحد: معاملة القفل كانت هتمسكه والمعالج مايلاقيش اتصال. التعديلات ورا بعض في العملية من غير قفل قاعدة
  await enterGate(Math.max(limit, 1), waitMs)
  try {
    if (limit < 1) return await work()
    return await ds.transaction(async em => {
      // مهلة واحدة للاتنين: اللي استناه في الدور بيتخصم من مهلة قفل القاعدة
      const left = Math.max(0, Math.trunc(waitMs - (Date.now() - started)))
      const [row]: Array<{ result: number }> = await em.query(`DECLARE @result int
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = ${left}
        SELECT @result AS [result]`, [`hr:user-account:${userId}`])
      if (!(Number(row?.result) >= 0)) throw new ConflictException(ACCOUNT_EDIT_BUSY)
      return work()
    })
  } finally { leaveGate() }
}

@Injectable()
export class AccountEditLock implements NestInterceptor {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const id = Number(context.switchToHttp().getRequest().params?.id)
    // رقم مش صحيح: المعالج نفسه بيرفضه (ParseIntPipe) من غير قفل
    if (!Number.isSafeInteger(id) || id < 1) return next.handle()
    return from(accountEditLocked(this.ds, id, () => lastValueFrom(next.handle())))
  }
}
