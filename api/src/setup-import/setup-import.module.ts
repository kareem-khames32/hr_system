import { Module } from '@nestjs/common'
import { EmployeesModule } from '../employees/employees.module'
import { OrgModule } from '../org/org.module'
import { SetupImportController } from './setup-import.controller'
import { SetupImportService } from './setup-import.service'

// B6.1 (ب): مستوردات تجهيز العميل من Excel — كل صف بيتكتب بخدمات الإنشاء القايمة (OrgService و EmployeesService)
@Module({
  imports: [OrgModule, EmployeesModule],
  controllers: [SetupImportController],
  providers: [SetupImportService],
})
export class SetupImportModule {}
