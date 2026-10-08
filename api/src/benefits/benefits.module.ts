import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BenefitsMembersService } from './benefits-members.service'
import { BenefitsController } from './benefits.controller'
import { BenefitsService } from './benefits.service'
import { InsuranceClass, InsuranceClassGrade, InsurancePolicy } from './insurance'
import { InsuranceEnrollment, InsuranceMemberRequest } from './insurance-members'
import { TicketEntitlement } from './ticket-entitlements'

// B5.2: المزايا والتأمين الطبي — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: benefits)
@Module({
  imports: [TypeOrmModule.forFeature([InsurancePolicy, InsuranceClass, InsuranceClassGrade, InsuranceEnrollment, InsuranceMemberRequest, TicketEntitlement])],
  controllers: [BenefitsController],
  providers: [BenefitsService, BenefitsMembersService],
})
export class BenefitsModule {}
