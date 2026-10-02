import { Global, Module } from '@nestjs/common'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModuleAudienceInterceptor, ModuleGuard } from './module.guard'
import { ModulesAdminController } from './modules-admin.controller'
import { ModulesController } from './modules.controller'
import { ModulesService } from './modules.service'
import { SystemModule, SystemModuleEvent, SystemModuleFeature } from './system-module.entities'

/**
 * نظام تشغيل وقفل الموديولات (خطة التنفيذ — الجزء 3). عام (@Global): أي خدمة بتحقن ModulesService من غير import،
 * والحارس والمعترض متسجّلين على التطبيق كله (APP_GUARD وAPP_INTERCEPTOR) فأي controller عليه @RequireModule بيتقفل لوحده.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemModule, SystemModuleFeature, SystemModuleEvent])],
  // الترتيب مهم: «enabled» و«catalog» الثابتين قبل «:key» بتاع شاشة الإعدادات
  controllers: [ModulesController, ModulesAdminController],
  providers: [
    ModulesService,
    { provide: APP_GUARD, useClass: ModuleGuard },
    { provide: APP_INTERCEPTOR, useClass: ModuleAudienceInterceptor },
  ],
  exports: [ModulesService],
})
export class ModulesRegistryModule {}
