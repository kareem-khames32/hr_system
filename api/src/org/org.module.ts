import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import { OrgController } from './org.controller'
import { OrgService } from './org.service'

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Department, Team, Employee])],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
