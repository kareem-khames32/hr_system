import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { SettingsController } from './settings.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RequestsConfig,
      LeaveType,
      ApprovalChain,
      ApprovalStep,
      RequestType,
    ]),
  ],
  controllers: [SettingsController],
})
export class SettingsModule {}
