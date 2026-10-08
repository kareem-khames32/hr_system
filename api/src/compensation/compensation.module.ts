import { Module } from '@nestjs/common'
import { CompensationController } from './compensation.controller'
import { CompensationService } from './compensation.service'

// B5.1: تخطيط الزيادات وسلّم الرواتب — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: compensation)
@Module({
  controllers: [CompensationController],
  providers: [CompensationService],
})
export class CompensationModule {}
