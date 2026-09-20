import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollDailyAccrualService } from './payroll-daily-accrual.service'
import { PAYROLL_ACCRUAL_ENABLED_KEY, PAYROLL_ACCRUAL_HOUR_KEY } from './payroll-daily-accrual'

// الجار الليلي لتراكم المسير (قرار المالك 20 سبتمبر):
// كل ليلة بيحسب «أمس» لكل مسير مفتوح (مسودة أو محسوب) في الشهر الجاري، وكمان أي يوم
// اتعلّم «متسخ» (تصحيح بصمة، إذن أو إجازة أو إضافي اتعتمد متأخر، إيقاف، تغيير راتب).
// النتيجة: آخر الشهر المسير يكون شبه جاهز، والاعتماد ياخد دقائق مش ساعات.
//
// آمن لإعادة التشغيل (نفس اليوم مرتين = نفس الصف)، مسير واحد في المرة (قفل الخدمة نفسها
// زي مزامنة الأجهزة فما فيش deadlock)، وما بيلمسش مسير معتمد أو مصروف، وبيسجل أعداد بس.
@Injectable()
export class PayrollDailyAccrualScheduler {
  private readonly logger = new Logger(PayrollDailyAccrualScheduler.name)

  constructor(
    private readonly accrual: PayrollDailyAccrualService,
    @InjectRepository(RequestsConfig) private readonly config: Repository<RequestsConfig>
  ) {}

  // كل ساعة عند الدقيقة 15، والشغل الحقيقي في الساعة المضبوطة بس (الافتراضي 02:15 —
  // بعد تجسيد الغياب 01:00 ومزامنة الأجهزة). الإعداد payroll.daily_accrual_hour بيغيّرها
  // بلا نشر جديد، والفحوصات التانية بترجع فورًا بلا أي استعلام تقيل.
  @Cron('15 * * * *')
  async hourly() {
    try {
      if ((await this.setting(PAYROLL_ACCRUAL_ENABLED_KEY, 'true')) !== 'true') return
      const hour = Number(await this.setting(PAYROLL_ACCRUAL_HOUR_KEY, '2'))
      const target = Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : 2
      // شبكة أمان: جهاز المكتب بيتقفل بالليل فساعة الجار ممكن تفوت خالص — بنلحق 10:15 صباحًا.
      // ما بيعملش شغل زيادة: اليوم المتراكم النضيف بيتقرا ويتعدى.
      const now = new Date().getHours()
      if (now !== target && now !== 10) return
      await this.run(now === target ? 'الجار الليلي' : 'لحاق')
    } catch (error) {
      this.logger.error(`تعذر فحص تراكم المسير اليومي: ${(error as Error).message}`)
    }
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  private async run(label: string) {
    try {
      const totals = await this.accrual.accrueOpenRuns()
      if (totals.disabled) return
      if (totals.computed > 0 || totals.runs > 0) {
        this.logger.log(`${label}: ${totals.runs} مسير مفتوح — ${totals.computed} يوم-موظف اتحسب، ${totals.reused} متراكم جاهز`)
      }
    } catch (error) {
      this.logger.error(`تعذر تراكم المسير اليومي (${label}): ${(error as Error).message}`)
    }
  }
}
