import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import type { JwtPayload } from './auth.service'

// كلمة مرور مؤقتة: التوكن اللي فيه mustChangePassword مايفتحش غير المسارات المعلَّمة بالديكوريتور ده
// (تغيير كلمة المرور و«مين أنا»). العلامة جوه التوكن متزامنة مع القاعدة: أي تغيير لـ users.mustChangePassword
// بيزوّد tokenVersion فيبطل التوكن القديم فورًا (JwtStrategy بيطابق الإصدار كل طلب).
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED'
const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPasswordChange'
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true)

// حارس JWT الافتراضي
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtPayload>(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
    status?: unknown
  ): TUser {
    const payload = super.handleRequest<TUser>(err, user, info, context, status)
    if (
      (payload as JwtPayload | undefined)?.mustChangePassword &&
      !Reflect.getMetadata(ALLOW_PENDING_PASSWORD_KEY, context.getHandler()) &&
      !Reflect.getMetadata(ALLOW_PENDING_PASSWORD_KEY, context.getClass())
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: PASSWORD_CHANGE_REQUIRED,
        message: 'لازم تغيّر كلمة المرور المؤقتة الأول قبل ما تستخدم النظام',
      })
    }
    return payload
  }
}

// @CurrentUser() — يحقن حمولة التوكن في المعامل
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user
  }
)

// @Roles('hr_manager', 'super_admin') — تقييد المسار بأدوار (توافق قديم)
export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

// @Perm('employees.create') — الفرض الدقيق بالصلاحيات (الأساس الجديد)
// أكثر من صلاحية = يكفي امتلاك أي واحدة منها
export const PERMS_KEY = 'perms'
export const Perm = (...perms: string[]) => SetMetadata(PERMS_KEY, perms)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const user: JwtPayload = ctx.switchToHttp().getRequest().user
    // super_admin يتخطى كل الفحوصات
    if (user?.role === 'super_admin' || user?.permissions?.includes('*')) {
      return true
    }

    // فحص الصلاحيات الدقيقة أولاً
    const perms = this.reflector.getAllAndOverride<string[]>(PERMS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (perms && perms.length > 0) {
      if (!user) return false
      return perms.some((p) => (user.permissions ?? []).includes(p))
    }

    // ثم فحص الأدوار (المسارات القديمة)
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required || required.length === 0) return true
    if (!user) return false
    if (required.includes(user.role)) return true
    return (user.permissions ?? []).some((p) => required.includes(p))
  }
}

// فحص برمجي داخل الخدمات
export const userHasPerm = (user: JwtPayload, perm: string): boolean =>
  user.role === 'super_admin' ||
  (user.permissions ?? []).includes('*') ||
  (user.permissions ?? []).includes(perm)

// نطاق الفرع (القاعدة الأساسية للعزل):
// super_admin يرى كل الفروع — أي دور آخر مقفول على فرعه
export const branchScopeOf = (user: JwtPayload): number | null =>
  user.role === 'super_admin'
    ? null
    : Number.isInteger(user.branchId) && Number(user.branchId) > 0
      ? Number(user.branchId)
      : -1 // Unassigned legacy accounts have an empty scope, never global access.

// عزل الفروع: إعداد يسري على كل الشركة (سياسات النظام، سقوف السلف، شرائح التأخير) لا يعدّله حساب مقفول على فرع،
// عشان تعديله بيغيّر الفروع التانية. يشوفه عادي، والتعديل لحساب على مستوى الشركة.
export const assertCompanyWideWrite = (user: JwtPayload): void => {
  if (branchScopeOf(user) !== null) throw new ForbiddenException('الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة')
}
