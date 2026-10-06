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

export async function accountEditLocked<T>(ds: DataSource, userId: number, work: () => Promise<T>): Promise<T> {
  return ds.transaction(async em => {
    const [row]: Array<{ result: number }> = await em.query(`DECLARE @result int
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = ${ACCOUNT_EDIT_WAIT_MS}
      SELECT @result AS [result]`, [`hr:user-account:${userId}`])
    if (!(Number(row?.result) >= 0)) throw new ConflictException(ACCOUNT_EDIT_BUSY)
    return work()
  })
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
