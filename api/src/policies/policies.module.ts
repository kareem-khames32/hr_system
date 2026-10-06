import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PoliciesController } from './policies.controller'
import { PoliciesService } from './policies.service'
import { PolicyGate, PolicyGateInterceptor } from './policy-gate'
import { Policy, PolicyAcknowledgement, PolicyVersion } from './policy.entities'

// B2.7-أ: مكتبة السياسات والإقرار، وبوابة الإقرار العامة (معترض بعد حارس الدخول على كل المسارات)
@Module({
  imports: [TypeOrmModule.forFeature([Policy, PolicyVersion, PolicyAcknowledgement])],
  controllers: [PoliciesController],
  providers: [PolicyGate, PoliciesService, { provide: APP_INTERCEPTOR, useClass: PolicyGateInterceptor }],
})
export class PoliciesModule {}
