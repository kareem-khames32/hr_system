import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { RequestsModule } from '../requests/requests.module'
import { ConfigDefaultsService } from './config-defaults.service'
import { SettingsController } from './settings.controller'

@Module({
  imports: [
    // DestinationsService: قائمة الوجهات المنفّذة لبانِي الطلبات
    RequestsModule,
    TypeOrmModule.forFeature([
      RequestsConfig,
      LeaveType,
      ApprovalChain,
      ApprovalStep,
      RequestType,
    ]),
  ],
  controllers: [SettingsController],
  // مفاتيح الإعدادات الافتراضية الناقصة تُضاف عند الإقلاع
  providers: [ConfigDefaultsService],
})
export class SettingsModule {}
