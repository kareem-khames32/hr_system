import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AttendanceService } from './attendance.service'

// المهمة الدورية لمحرك الحضور:
// - تجسيد الغياب: إنشاء صفوف 'absent' لأيام العمل غير الملموسة (بلا بصمة/إجازة)
//   حتى يظهر الغياب في التقارير واللوحات ويُخصم في المسير (لا يعتمد على تشغيل
//   المسير وحده). المسير أيضاً يجسّد الفترة عند الحساب — فالمهمة للعرض الحيّ.
@Injectable()
export class AttendanceScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(AttendanceScheduler.name)

  constructor(private readonly attendance: AttendanceService) {}

  // عند الإقلاع (بعد دقيقة، بلا انتظار — لا يؤخّر الإقلاع): لحاق فوري لو آخر يوم
  // مُنجز قبل أمس — سيرفر كان مقفولاً ليلة أو أكثر، أو أُعيد تشغيله أثناء تشغيل
  // سابق فلم يُسجَّل إنجازه، لا ينتظر فحص الساعة القادم
  onApplicationBootstrap() {
    const timer = setTimeout(() => void this.runCatchUp(true), 60_000)
    timer.unref?.()
  }

  // كل يوم 01:00 — جسّد الغياب من آخر يوم مُنجز حتى أمس (idempotent): ليلة فاتت
  // (السيرفر مقفول) تُلحق في أول تشغيل بعدها، وأول أمس يُعاد دائماً لتأخّر التصحيحات
  @Cron('0 1 * * *')
  async materializeYesterday() {
    await this.runCatchUp(false)
  }

  // شبكة أمان كل ساعة (02:30 → 23:30): سيرفر مقفول الساعة 01:00 كل ليلة (جهاز
  // مكتب يُطفأ ليلاً) كان لا يلحق أبداً — يلحق فقط لو آخر يوم مُنجز قبل أمس
  // (أو لم يُنجز شيء بعد)، وإلا لا يفعل شيئاً
  @Cron('30 2-23 * * *')
  async catchUpIfBehind() {
    await this.runCatchUp(true)
  }

  private async runCatchUp(onlyIfBehind: boolean) {
    try {
      const res = await this.attendance.materializeAbsencesCatchUp({ onlyIfBehind })
      if (res && res.created > 0) {
        this.logger.log(`تم تجسيد ${res.created} يوم غياب (${res.from} → ${res.to})`)
      }
    } catch (e) {
      this.logger.error(`تعذر لحاق تجسيد الغياب: ${(e as Error).message}`)
    }
  }
}
