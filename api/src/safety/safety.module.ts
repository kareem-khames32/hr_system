import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SafetyIncident, SafetyIncidentAction } from './safety'
import { SafetyController } from './safety.controller'
import { SafetyService } from './safety.service'

// B5.7: السلامة وإصابات العمل — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: safety)
@Module({
  imports: [TypeOrmModule.forFeature([SafetyIncident, SafetyIncidentAction])],
  controllers: [SafetyController],
  providers: [SafetyService],
})
export class SafetyModule {}
