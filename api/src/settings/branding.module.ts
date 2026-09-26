import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { StoredFile } from '../files/stored-file.entity'
import { BrandingController } from './branding.controller'

// هوية الشركة العامة لصفحة الدخول والقائمة الجانبية (طلب المالك 26 سبتمبر) — موديول صغير لوحده:
// بيقرا مفتاحين من الإعدادات (company.name وcompany.logo_file_id) وصف ملف الشعار بس، ومالوش حارس
@Module({
  imports: [TypeOrmModule.forFeature([RequestsConfig, StoredFile])],
  controllers: [BrandingController],
})
export class BrandingModule {}
