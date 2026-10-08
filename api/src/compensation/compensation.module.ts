import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CompensationBudget, CompensationCycle, CompensationProposal } from './compensation-cycles'
import { CompensationCyclesService } from './compensation-cycles.service'
import { CompensationController } from './compensation.controller'
import { CompensationService } from './compensation.service'

// B5.1: تخطيط الزيادات وسلّم الرواتب — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: compensation)
@Module({
  imports: [TypeOrmModule.forFeature([CompensationCycle, CompensationBudget, CompensationProposal])],
  controllers: [CompensationController],
  providers: [CompensationService, CompensationCyclesService],
})
export class CompensationModule {}
