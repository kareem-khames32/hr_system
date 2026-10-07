import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SavedReport } from './saved-report.entity'
import { SavedReportsController } from './saved-reports.controller'
import { SavedReportsService } from './saved-reports.service'

// B2.13-ب: التقارير المحفوظة والمجدولة. الملف نفسه بيتبني في ReportsController (AppModule) والخدمة بتوصله بـModuleRef.
@Module({
  imports: [TypeOrmModule.forFeature([SavedReport])],
  controllers: [SavedReportsController],
  providers: [SavedReportsService],
  exports: [SavedReportsService],
})
export class SavedReportsModule {}
