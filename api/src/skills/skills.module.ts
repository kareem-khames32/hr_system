import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PositionSkillRequirement, Skill } from './skills'
import { SkillsController } from './skills.controller'
import { SkillsService } from './skills.service'
import { CriticalPosition, SuccessionNomination, TalentPotential } from './succession'
import { SuccessionController } from './succession.controller'
import { SuccessionService } from './succession.service'

// B5.4: المهارات والإحلال — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: skills)
@Module({
  imports: [TypeOrmModule.forFeature([Skill, PositionSkillRequirement, CriticalPosition, SuccessionNomination, TalentPotential])],
  controllers: [SkillsController, SuccessionController],
  providers: [SkillsService, SuccessionService],
})
export class SkillsModule {}
