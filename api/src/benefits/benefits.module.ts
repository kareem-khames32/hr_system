import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BenefitsController } from './benefits.controller'
import { BenefitsService } from './benefits.service'
import { InsuranceClass, InsuranceClassGrade, InsurancePolicy } from './insurance'

// B5.2: المزايا والتأمين الطبي — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: benefits)
@Module({
  imports: [TypeOrmModule.forFeature([InsurancePolicy, InsuranceClass, InsuranceClassGrade])],
  controllers: [BenefitsController],
  providers: [BenefitsService],
})
export class BenefitsModule {}
