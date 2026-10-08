import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AttemptLimiter } from '../recruitment/careers'
import { KEY_INVALID, KEY_RATE_LIMITED, KEY_SCOPE_MISSING, keyFromHeaders, type IntegrationIdentity, type IntegrationScope } from './integration-keys'
import { IntegrationKeysService } from './integration-keys.service'

// B6.3 (أ): حارس مسارات `/public/v1` — مفتاح تكامل صالح، وحد طلبات، ونطاق القراءة المطلوب للمسار. مفيش جلسة مستخدم هنا.
//  الترتيب: حد المحاولات بالعنوان (قبل أي قراءة) ← المفتاح ← حد المفتاح ← النطاق. الموديول المقفول بيرد 404 من حارس الموديولات قبل كده.

const REQUIRED_SCOPE = 'integration:scope'
/** النطاق اللي المسار محتاجه (من غيره: أي مفتاح صالح) */
export const RequireScope = (scope: IntegrationScope) => SetMetadata(REQUIRED_SCOPE, scope)
/** هوية التكامل اللي الحارس حطها على الطلب */
export const Integration = createParamDecorator((_: unknown, ctx: ExecutionContext): IntegrationIdentity => ctx.switchToHttp().getRequest().integration)

export const KEY_REQUESTS_PER_MINUTE = 120
export const ALL_KEYS_REQUESTS_PER_MINUTE = 3000
export const ADDRESS_ATTEMPTS_PER_MINUTE = 300

@Injectable()
export class IntegrationKeyGuard implements CanActivate {
  // حد لكل عنوان (مفتاح غلط أو صح) وحد لكل مفتاح — في الذاكرة، لكل نسخة خادم
  private readonly byAddress = new AttemptLimiter(ADDRESS_ATTEMPTS_PER_MINUTE, ALL_KEYS_REQUESTS_PER_MINUTE * 2, 60_000)
  private readonly byKey = new AttemptLimiter(KEY_REQUESTS_PER_MINUTE, ALL_KEYS_REQUESTS_PER_MINUTE, 60_000)

  constructor(private readonly reflector: Reflector, private readonly keys: IntegrationKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, unknown>; ip?: string; integration?: IntegrationIdentity }>()
    const limited = () => new HttpException(KEY_RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS)
    if (!this.byAddress.take(String(request.ip ?? 'unknown'))) throw limited()
    const identity = await this.keys.authenticate(keyFromHeaders(request.headers))
    // مفتاح ناقص أو شكله غلط أو ملغي أو مش مطابق: نفس الرد
    if (!identity) throw new UnauthorizedException(KEY_INVALID)
    if (!this.byKey.take(String(identity.id))) throw limited()
    const scope = this.reflector.getAllAndOverride<IntegrationScope | undefined>(REQUIRED_SCOPE, [ctx.getHandler(), ctx.getClass()])
    if (scope && !identity.scopes.includes(scope)) throw new ForbiddenException(KEY_SCOPE_MISSING)
    request.integration = identity
    return true
  }
}
