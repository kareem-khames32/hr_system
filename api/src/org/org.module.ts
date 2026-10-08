import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { CostCenter } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import { CurrencyContextController } from './currency-context.controller'
import { LegalEntity } from './legal-entities'
import { LegalEntitiesController } from './legal-entities.controller'
import { LegalEntitiesService } from './legal-entities.service'
import { OrgController } from './org.controller'
import { OrgService } from './org.service'

@Module({
  imports: [
    // CostCenter: مركز تكلفة الفرع يُتحقق من الكتالوج (SET-13)
    TypeOrmModule.forFeature([Branch, Department, Team, Employee, CostCenter, LegalEntity]),
    AttendanceModule, // إعادة حساب الحضور بعد تغيير دولة الفرع (عطلاته الرسمية)
  ],
  // عملة الفرع للشاشات (GET settings/currency-context) — مع الفروع لأن العملة تبع دولة الفرع
  // B4.1: الكيانات القانونية وربط الفروع بيها
  controllers: [OrgController, CurrencyContextController, LegalEntitiesController],
  providers: [OrgService, LegalEntitiesService],
  exports: [OrgService],
})
export class OrgModule {}
