import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StatutoryDefinition, StatutoryValue } from './statutory.entities'
import { StatutorySeedService } from './statutory.service'

// القيم القانونية المؤرخة (خطة التنفيذ B1.5 — بشكل «حزمة الدولة» B4.2): الجدولين والبيانات الأولية وقت الإقلاع.
// القراءة بالدالة readStatutoryEntries(em) من غير حقن (الحاسبات بتقراها مرة لكل حساب مسير).
@Module({
  imports: [TypeOrmModule.forFeature([StatutoryDefinition, StatutoryValue])],
  providers: [StatutorySeedService],
})
export class StatutoryModule {}
