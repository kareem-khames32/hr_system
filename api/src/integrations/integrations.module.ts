import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { IntegrationKeyGuard } from './integration-key.guard'
import { IntegrationKeysService } from './integration-keys.service'
import { IntegrationsController } from './integrations.controller'
import { IntegrationKey } from './integrations.entities'
import { PublicApiController } from './public-api.controller'
import { PublicApiService } from './public-api.service'

// B6.3: التكاملات — مفاتيح بنطاقات قراءة ونطاق فروع، والـAPI العام `/public/v1`. موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: integrations)
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationKey])],
  controllers: [IntegrationsController, PublicApiController],
  providers: [IntegrationKeysService, IntegrationKeyGuard, PublicApiService],
})
export class IntegrationsModule {}
