import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QueueModule } from '../queue/queue.module'
import { IntegrationKeyGuard } from './integration-key.guard'
import { IntegrationKeysService } from './integration-keys.service'
import { IntegrationsController } from './integrations.controller'
import { IntegrationKey, WebhookEndpoint } from './integrations.entities'
import { PublicApiController } from './public-api.controller'
import { PublicApiService } from './public-api.service'
import { WebhooksService } from './webhooks.service'

// B6.3: التكاملات — مفاتيح بنطاقات قراءة ونطاق فروع، والـAPI العام `/public/v1`. موديول جديد = مقفول لحد ما الشركة تفتحه (سجل الموديولات: integrations)
@Module({
  // QueueModule: الـwebhooks مستهلك على نفس الطابور والـoutbox (B2.3)
  imports: [TypeOrmModule.forFeature([IntegrationKey, WebhookEndpoint]), QueueModule],
  controllers: [IntegrationsController, PublicApiController],
  providers: [IntegrationKeysService, IntegrationKeyGuard, PublicApiService, WebhooksService],
})
export class IntegrationsModule {}
