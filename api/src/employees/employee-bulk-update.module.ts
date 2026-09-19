import { Module } from '@nestjs/common'
import { EmployeesModule } from './employees.module'
import { EmployeeBulkUpdateController } from './employee-bulk-update.controller'
import { EmployeeBulkUpdateService } from './employee-bulk-update.service'

// تحديث بيانات مجموعة موظفين من ملف — كل صف بيتحفظ عبر EmployeesService.update (نفس قواعد وسجلات تعديل الموظف)
@Module({
  imports: [EmployeesModule],
  controllers: [EmployeeBulkUpdateController],
  providers: [EmployeeBulkUpdateService],
})
export class EmployeeBulkUpdateModule {}
