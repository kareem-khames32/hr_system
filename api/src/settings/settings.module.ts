import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { RequestsModule } from '../requests/requests.module'
import { AuthModule } from '../auth/auth.module'
import { ConfigDefaultsService } from './config-defaults.service'
import { RequestCategoryChainsController } from './request-category-chains.controller'
import { RequestCategoryChainsService } from './request-category-chains.service'
import { SettingsController } from './settings.controller'

// B4.8 (ب)
import { DataBreachIncident } from './data-protection'
import { DataProtectionController } from './data-protection.controller'
import { DataProtectionService } from './data-protection.service'

@Module({
  imports: [
    // DestinationsService: قائمة الوجهات المنفّذة لبانِي الطلبات
    RequestsModule,
    // AuthService: صلاحيات الحسابات النهائية لتحذير محرر السلاسل (B1.11) — AuthModule مابيستوردش SettingsModule فمفيش حلقة
    AuthModule,
    TypeOrmModule.forFeature([
      RequestsConfig,
      LeaveType,
      ApprovalChain,
      ApprovalStep,
      RequestType,
      // B4.8 (ب): سجل حوادث تسريب البيانات
      DataBreachIncident,
    ]),
  ],
  // سلسلة كل فئة طلبات جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر)، وعملة الشاشات لأي مستخدم داخل (30 سبتمبر)
  controllers: [SettingsController, RequestCategoryChainsController, DataProtectionController],
  // مفاتيح الإعدادات الافتراضية الناقصة تُضاف عند الإقلاع
  providers: [ConfigDefaultsService, RequestCategoryChainsService, DataProtectionService],
})
export class SettingsModule {}
