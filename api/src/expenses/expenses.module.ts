import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExpenseCategory, ExpenseLine, ExpenseReport } from './expense-reports'
import { ExpenseReportsService } from './expense-reports.service'
import { ExpensesController } from './expenses.controller'

// B5.3: تقارير المصروفات — ميزة فرعية مقفولة افتراضيًا جوه موديول المصروفات القائم (سجل الموديولات: expenses / expenses.reports)
@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategory, ExpenseReport, ExpenseLine])],
  controllers: [ExpensesController],
  providers: [ExpenseReportsService],
})
export class ExpensesModule {}
