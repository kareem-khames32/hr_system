import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Dependent } from './dependent-rules'
import { DependentsController } from './dependents.controller'
import { DependentsService } from './dependents.service'

// B3.14: سجل المعالين — معالين الموظف بمستند هويتهم، بتعديل مباشر من الموارد البشرية أو بطلب «تحديث المعالين». موديول جديد مقفول لحد ما
// الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([Dependent, Employee])],
  controllers: [DependentsController],
  providers: [DependentsService],
  exports: [DependentsService],
})
export class DependentsModule {}
