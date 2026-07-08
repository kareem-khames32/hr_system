import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import type { JwtPayload } from './auth.service'

// حارس JWT الافتراضي
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// @CurrentUser() — يحقن حمولة التوكن في المعامل
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user
  }
)

// @Roles('hr_manager', 'super_admin') — تقييد المسار بأدوار
export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required || required.length === 0) return true
    const user: JwtPayload = ctx.switchToHttp().getRequest().user
    return !!user && required.includes(user.role)
  }
}

// نطاق الفرع (القاعدة الأساسية للعزل):
// super_admin يرى كل الفروع — أي دور آخر مقفول على فرعه
export const branchScopeOf = (user: JwtPayload): number | null =>
  user.role === 'super_admin' ? null : user.branchId
