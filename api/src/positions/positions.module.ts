import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApprovedPosition, PositionHolder } from './position.entities'
import { PositionsController } from './positions.controller'
import { PositionsService } from './positions.service'

// B2.11: الوظائف المعتمدة. مابيستوردش موديول الموظفين (هو اللي بيستورد ده عشان حكم التعيين جوه معاملة الإنشاء): الموظفين بيتقروا من
// المخزن مباشرة.
@Module({
  imports: [TypeOrmModule.forFeature([ApprovedPosition, PositionHolder])],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
