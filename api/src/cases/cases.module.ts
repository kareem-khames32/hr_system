import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { HrCase, HrCaseEvent, HrCaseParty } from './case.entities'
import { CasesController } from './cases.controller'
import { CasesService } from './cases.service'

// B3.11: الشكاوى والتحقيقات — ملف قضية بأطرافه ومطّلعيه وخطه الزمني، والاطلاع على مستوى القضية. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([HrCase, HrCaseParty, HrCaseEvent, Employee, User, RequestsConfig, StoredFile])],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
