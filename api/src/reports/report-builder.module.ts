import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ReportDefinition } from './report-builder'
import { ReportBuilderController } from './report-builder.controller'
import { ReportBuilderService } from './report-builder.service'

// B5.9: بانِي التقارير (ميزة reports.builder، مقفولة افتراضيًا)
@Module({
  imports: [TypeOrmModule.forFeature([ReportDefinition])],
  controllers: [ReportBuilderController],
  providers: [ReportBuilderService],
})
export class ReportBuilderModule {}
