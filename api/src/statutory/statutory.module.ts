import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StatutoryCalculatorsService } from './statutory-calculators.service'
import { StatutoryPackController } from './statutory-pack.controller'
import { StatutoryPackService } from './statutory-pack.service'
import { StatutoryDefinition, StatutoryValue } from './statutory.entities'
import { StatutorySeedService } from './statutory.service'

// القيم القانونية المؤرخة (خطة التنفيذ B1.5 — بشكل «حزمة الدولة» B4.2): الجدولين والبيانات الأولية وقت الإقلاع.
// القراءة بالدالة readStatutoryEntries(em) من غير حقن (الحاسبات بتقراها مرة لكل حساب مسير).
// B4.2: شاشة «حزمة الدولة» (عرض بصلاحية الإعدادات، وتعديل لمدير النظام بس).
@Module({
  imports: [TypeOrmModule.forFeature([StatutoryDefinition, StatutoryValue])],
  controllers: [StatutoryPackController],
  providers: [StatutorySeedService, StatutoryPackService, StatutoryCalculatorsService],
})
export class StatutoryModule {}
