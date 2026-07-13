import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AttendanceService } from './attendance.service'

// المهمة الدورية لمحرك الحضور:
// - تجسيد الغياب: إنشاء صفوف 'absent' لأيام العمل غير الملموسة (بلا بصمة/إجازة)
//   حتى يظهر الغياب في التقارير واللوحات ويُخصم في المسير (لا يعتمد على تشغيل
//   المسير وحده). المسير أيضاً يجسّد الفترة عند الحساب — فالمهمة للعرض الحيّ.
@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name)

  constructor(private readonly attendance: AttendanceService) {}

  // كل يوم 01:00 — جسّد غياب آخر يومين (idempotent؛ يومان يمسكان تأخّر التصحيحات)
  @Cron('0 1 * * *')
  async materializeYesterday() {
    const ymd = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const to = new Date()
    to.setDate(to.getDate() - 1)
    const from = new Date(to)
    from.setDate(from.getDate() - 1)
    const created = await this.attendance.materializeAbsencesAll(ymd(from), ymd(to))
    if (created > 0) this.logger.log(`تم تجسيد ${created} يوم غياب`)
  }
}
