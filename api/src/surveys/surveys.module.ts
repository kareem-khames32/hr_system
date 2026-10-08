import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Survey, SurveyInvitation, SurveyResponse } from './survey-rules'
import { SurveysController } from './surveys.controller'
import { SurveysService } from './surveys.service'

// B3.13: الاستبيانات — مجهولة بسرية حقيقية (الرد مايتربطش بصاحبه) أو بالاسم، ونتايج بحد أدنى للمجموعة. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([Survey, SurveyInvitation, SurveyResponse, Employee, Branch, Department, Team, RequestsConfig])],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
