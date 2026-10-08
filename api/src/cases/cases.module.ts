import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { PayrollModule } from '../payroll/payroll.module'
import { DeductionType } from '../payroll/typed-deductions.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { HrCase, HrCaseEvent, HrCaseParty } from './case.entities'
import { CasesController } from './cases.controller'
import { CasesService } from './cases.service'
import { PenaltiesController } from './penalties.controller'
import { EmployeePenalty, PenaltiesService, PenaltyViolation } from './penalties.service'

// B3.11: الشكاوى والتحقيقات — ملف قضية بأطرافه ومطّلعيه وخطه الزمني، والاطلاع على مستوى القضية. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  // B3.12: الجزاء المالي بيتعمل بخدمة الخصومات المصنّفة نفسها
  imports: [PayrollModule, TypeOrmModule.forFeature([HrCase, HrCaseParty, HrCaseEvent, PenaltyViolation, EmployeePenalty, DeductionType, Employee, User, RequestsConfig, StoredFile])],
  controllers: [CasesController, PenaltiesController],
  providers: [CasesService, PenaltiesService],
  exports: [CasesService],
})
export class CasesModule {}
