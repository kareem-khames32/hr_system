import { CallHandler, CanActivate, ExecutionContext, Injectable, NestInterceptor, NotFoundException, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Observable } from 'rxjs'
import type { JwtPayload } from '../auth/auth.service'
import { ModulesService } from './modules.service'
import { isFeatureKey, isModuleKey, type ModuleKey } from './registry'

export const REQUIRE_MODULE_KEY = 'requireModule'
export const REQUIRE_FEATURE_KEY = 'requireFeature'
export const REQUIRE_MODULE_PARAM_KEY = 'requireModuleByParam'

const assertRegistered = (decorator: string, modules: readonly string[]) => {
  const unknown = modules.filter((module) => !isModuleKey(module))
  if (!modules.length || unknown.length) throw new Error(`${decorator}: موديول مش مسجّل في السجل (${unknown.join(', ') || 'فاضي'})`)
}

/**
 * @RequireModule('recruitment') — الـendpoint تابع للموديول ده: لو مقفول بيرجع 404 كأنه مش موجود.
 * على الـcontroller، أو على الـhandler لما الـcontroller بيخدم أكتر من موديول (بتاع الـhandler بيكسب على بتاع الـcontroller).
 * أكتر من موديول = كلهم لازم يبقوا مفعّلين. مفتاح مش في السجل = خطأ وقت الإقلاع، مش وقت الطلب.
 */
export const RequireModule = (...modules: ModuleKey[]) => {
  assertRegistered('@RequireModule', modules)
  return SetMetadata(REQUIRE_MODULE_KEY, modules)
}

/** @RequireFeature('recruitment.public_careers') — الـendpoint تابع لميزة فرعية: لو مقفولة (أو موديولها مقفول) بيرجع 404. */
export const RequireFeature = (...features: string[]) => {
  const unknown = features.filter((feature) => !isFeatureKey(feature))
  if (!features.length || unknown.length) throw new Error(`@RequireFeature: ميزة مش مسجّلة في السجل (${unknown.join(', ') || 'فاضي'})`)
  return SetMetadata(REQUIRE_FEATURE_KEY, features)
}

/**
 * @RequireModuleByParam('kind', { shifts: 'shifts', devices: 'attendance' }) — مسار واحد بيخدم أكتر من موديول حسب جزء من المسار
 * (زي /catalogs/:kind): قيمة الجزء بتحدد الموديول، والقيمة اللي مش في الخريطة بتفضل على موديول الـcontroller. بيتجمع مع @RequireModule.
 */
export const RequireModuleByParam = (param: string, map: Record<string, ModuleKey>) => {
  assertRegistered('@RequireModuleByParam', Object.values(map))
  return SetMetadata(REQUIRE_MODULE_PARAM_KEY, { param, map })
}

// نفس رد Nest لمسار مش موجود بالحرف: الموديول المقفول مايتفرقش عن مسار مالوش وجود (نفس فلسفة النطاق — مانكشفش إنه موجود)
const notFound = (ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string }>()
  return new NotFoundException(`Cannot ${request.method ?? 'GET'} ${request.originalUrl ?? request.url ?? ''}`)
}

function requiredOf(reflector: Reflector, ctx: ExecutionContext): { modules: ModuleKey[]; features: string[] } {
  const targets = [ctx.getHandler(), ctx.getClass()]
  const modules = [...(reflector.getAllAndOverride<ModuleKey[] | undefined>(REQUIRE_MODULE_KEY, targets) ?? [])]
  const byParam = reflector.getAllAndOverride<{ param: string; map: Record<string, ModuleKey> } | undefined>(REQUIRE_MODULE_PARAM_KEY, targets)
  if (byParam) {
    const value = ctx.switchToHttp().getRequest<{ params?: Record<string, unknown> }>().params?.[byParam.param]
    const module = typeof value === 'string' && Object.prototype.hasOwnProperty.call(byParam.map, value) ? byParam.map[value] : null
    if (module && !modules.includes(module)) modules.push(module)
  }
  return { modules, features: reflector.getAllAndOverride<string[] | undefined>(REQUIRE_FEATURE_KEY, targets) ?? [] }
}

/**
 * الحارس العام (APP_GUARD): بيشتغل قبل حارس الدخول، فالموديول المقفول 404 للكل — حتى من غير توكن.
 * جمهور التفعيل محتاج المستخدم، ففحصه في ModuleAudienceInterceptor بعد حارس الدخول.
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly modules: ModulesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true
    const required = requiredOf(this.reflector, ctx)
    if (!required.modules.length && !required.features.length) return true
    if (!this.modules.enabledIn(await this.modules.state(), required.modules, required.features)) throw notFound(ctx)
    return true
  }
}

/** جمهور التفعيل (APP_INTERCEPTOR — بعد كل الحراس): الموديول مفعّل بس مش للمستخدم ده = 404 برضه. */
@Injectable()
export class ModuleAudienceInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly modules: ModulesService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (ctx.getType() === 'http') {
      const user = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>().user
      if (user) {
        for (const module of requiredOf(this.reflector, ctx).modules) {
          if (!(await this.modules.allowedFor(module, user))) throw notFound(ctx)
        }
      }
    }
    return next.handle()
  }
}
