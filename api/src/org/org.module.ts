import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { CostCenter } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import { OrgController } from './org.controller'
import { OrgService } from './org.service'

@Module({
  imports: [
    // CostCenter: مركز تكلفة الفرع يُتحقق من الكتالوج (SET-13)
    TypeOrmModule.forFeature([Branch, Department, Team, Employee, CostCenter]),
    AttendanceModule, // إعادة حساب الحضور بعد تغيير دولة الفرع (عطلاته الرسمية)
  ],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
