import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import { OrgController } from './org.controller'
import { OrgService } from './org.service'

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Department, Team])],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
