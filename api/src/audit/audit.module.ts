import { Injectable, MiddlewareConsumer, Module, NestMiddleware, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { NextFunction, Request, Response } from 'express'
import { auditRequestContext } from './audit'
import { AuditController } from './audit.controller'
import { AuditLog } from './audit-log.entity'
import { AuditService } from './audit.service'
import { AuditSubscriber } from './audit.subscriber'

/** سياق الطلب لسجل التدقيق: الـIP (بنفس «trust proxy» بتاع سجل الدخول) والجهاز، لكل اللي بيتعمل جوه الطلب */
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const agent = req.headers['user-agent']
    auditRequestContext.run({ ip: req.ip ?? null, userAgent: typeof agent === 'string' ? agent.slice(0, 300) : null }, next)
  }
}

// B2.1: سجل التدقيق المركزي
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, AuditSubscriber],
  exports: [AuditService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*')
  }
}
