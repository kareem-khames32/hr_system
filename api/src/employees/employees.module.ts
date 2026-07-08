import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { Employee } from './employee.entity'
import { EmployeesController } from './employees.controller'
import { EmployeesService } from './employees.service'

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Branch, Department, Team])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
