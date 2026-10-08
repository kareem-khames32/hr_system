import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PositionSkillRequirement, Skill } from './skills'
import { SkillsController } from './skills.controller'
import { SkillsService } from './skills.service'

// B5.4: المهارات والإحلال — موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: skills)
@Module({
  imports: [TypeOrmModule.forFeature([Skill, PositionSkillRequirement])],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
