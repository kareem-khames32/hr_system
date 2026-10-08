import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExpenseCategory, ExpenseCategoryLimit, ExpenseLine, ExpenseReport, PerDiemRate } from './expense-reports'
import { ExpenseReportsService } from './expense-reports.service'
import { ExpensesController } from './expenses.controller'
import { TravelAdvance } from './travel-advances'

// B5.3: تقارير المصروفات — ميزة فرعية مقفولة افتراضيًا جوه موديول المصروفات القائم (سجل الموديولات: expenses / expenses.reports)
@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategory, ExpenseCategoryLimit, PerDiemRate, ExpenseReport, ExpenseLine, TravelAdvance])],
  controllers: [ExpensesController],
  providers: [ExpenseReportsService],
})
export class ExpensesModule {}
