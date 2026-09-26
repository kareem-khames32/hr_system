import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { In } from 'typeorm'
import type { FindOperator } from 'typeorm'
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

// ===== نطاق الفروع (القاعدة الأساسية للعزل) =====
// null = كل الفروع. مصفوفة = الفروع دي بالظبط (فرع أو أكتر — طلب المالك 26 سبتمبر: «اختيار الفروع بعلامات صح»،
// مثلًا مدير موارد بشرية على الفرع 2 و3 بس). **المصفوفة الفاضية = ولا فرع، ومش «الكل» أبدًا.**
export type BranchScope = null | number[]

// أرقام فروع صالحة (صحيحة موجبة) من غير تكرار وبترتيبها — أي قيمة تانية (نص، كسر، صفر، سالب) بتتشال
export const cleanBranchIds = (raw: unknown): number[] => {
  if (!Array.isArray(raw)) return []
  const ids: number[] = []
  for (const value of raw) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && !ids.includes(value)) ids.push(value)
  }
  return ids
}

// عمود users.scopeBranchIds (نص JSON زي "[2,3]"): نص تالف أو مفيش فيه رقم صالح = مفيش اختيار صريح ([])
export const parseScopeBranchIds = (raw: unknown): number[] => {
  if (Array.isArray(raw)) return cleanBranchIds(raw)
  if (typeof raw !== 'string' || !raw.trim()) return []
  try {
    return cleanBranchIds(JSON.parse(raw))
  } catch {
    return []
  }
}

/**
 * النطاق الفعّال لحساب من صفه في القاعدة — مصدر الحقيقة الوحيد (التوكن وشاشة المستخدمين والتحقق كل طلب):
 * مدير النظام أو «كل الفروع» (users.scopeAllBranches، قرار المالك 22 سبتمبر) → null.
 * وإلا الفروع المختارة بعلامات صح (users.scopeBranchIds) لو فيها رقم صالح → هي بالظبط.
 * وإلا فرعه الأصلي (users.branchId) → [فرعه]. وإلا → [] = ولا فرع (حساب بلا فرع مايشوفش حاجة، مش «الكل»).
 * المقارنة `=== true` حرفية: أي قيمة تانية = مقفول.
 */
export const effectiveBranchScope = (account: {
  role?: string | null
  scopeAllBranches?: boolean | null
  scopeBranchIds?: unknown
  branchId?: number | null
}): BranchScope => {
  if (account.role === 'super_admin' || account.scopeAllBranches === true) return null
  const chosen = parseScopeBranchIds(account.scopeBranchIds)
  if (chosen.length > 0) return chosen
  return Number.isSafeInteger(account.branchId) && Number(account.branchId) > 0 ? [Number(account.branchId)] : []
}

// نطاق الحساب من التوكن. النطاق مش صلاحية: الحساب لسه محتاج الصلاحية المحددة لكل فعل (RolesGuard ماتغيّرش).
// التوكن الجديد شايل الفروع صريحة (branchIds — حتى لو فرع واحد أو فاضية)؛ والتوكن القديم (قبل تعدد الفروع، أو
// متصنّع في الاختبارات) من غيرها = فرعه الأصلي بس — نفس السلوك القديم بالحرف. أي تغيير في «كل الفروع» أو الفروع
// المختارة أو الفرع بيزوّد tokenVersion فالتوكن القديم يموت فورًا، وJwtStrategy بيطابق النطاق مع القاعدة كمان.
export const branchScopeOf = (user: JwtPayload): BranchScope => {
  if (user.role === 'super_admin' || user.scopeAllBranches === true) return null
  if (Array.isArray(user.branchIds)) return cleanBranchIds(user.branchIds)
  return Number.isInteger(user.branchId) && Number(user.branchId) > 0 ? [Number(user.branchId)] : []
}

// نطاق فاضي = حساب مش على مستوى الشركة ومش مربوط بأي فرع (مكان «-1» القديم): مايشوفش ولا يكتب حاجة
export const isEmptyBranchScope = (scope: BranchScope): scope is number[] => scope !== null && scope.length === 0

// الفرع ده جوه النطاق؟ null = كل الفروع. سجل بلا فرع (null) مش جوه أي نطاق مقفول.
export const inBranchScope = (scope: BranchScope, branchId: number | null | undefined): boolean =>
  scope === null || (branchId != null && scope.includes(Number(branchId)))

// النطاق التاني (null = الكل) جوه الأول بالكامل؟ — للتحقق إن التوكن مابيدّيش أكتر من القاعدة، وإن المنفّذ مايدّيش
// حد فروع برّه نطاقه
export const branchScopeCovers = (outer: BranchScope, inner: BranchScope): boolean =>
  outer === null || (inner !== null && inner.every((id) => outer.includes(id)))

// شرط TypeORM على عمود الفرع لنطاق مقفول: In(الفروع). النطاق الفاضي = In([-1]) (رقم فرع مستحيل) فمفيش صف بيطلع —
// بدل In([]) اللي بيتحول لـ«IN ()» ويكسر الاستعلام. المنادي بيتخطى الشرط لما النطاق null.
export const branchIdIn = (scope: number[]): FindOperator<number> => In(scope.length > 0 ? scope : [-1])

// نفس الشرط لـQueryBuilder بمعامل مسمّى: [`عمود IN (:...param)`, {param: الفروع}]، والنطاق الفاضي ['1 = 0', {}].
// الاستخدام: `if (scope !== null) qb.andWhere(...branchScopeQb('e.branchId', scope))`
export const branchScopeQb = (column: string, scope: number[], param = 'scopeBranchIds'): [string, Record<string, number[]>] =>
  scope.length > 0 ? [`${column} IN (:...${param})`, { [param]: scope }] : ['1 = 0', {}]

// نفس الشرط لـSQL خام بمعاملات موضعية (@0, @1 …): أرقام الفروع بتتضاف لآخر params (اللي هتتبعت مع الاستعلام)
// والشرط بيرجع بأرقامها. null = '' (مفيش شرط)، فاضي = '1 = 0' (ولا صف)، غير كده `عمود IN (@n, @n+1 …)`.
// الأرقام مابتتلزقش في نص الاستعلام أبدًا — معاملات بس.
export const branchScopeSql = (column: string, scope: BranchScope, params: unknown[]): string => {
  if (scope === null) return ''
  if (scope.length === 0) return '1 = 0'
  return `${column} IN (${scope.map((id) => `@${params.push(id) - 1}`).join(', ')})`
}

// نفس branchScopeSql بـ«AND » قدامه لما فيه شرط — للصق في آخر WHERE موجود
export const andBranchScopeSql = (column: string, scope: BranchScope, params: unknown[]): string => {
  const clause = branchScopeSql(column, scope, params)
  return clause ? `AND ${clause}` : ''
}

/**
 * الفرع اللي هيتكتب عليه سجل جديد من حساب مقفول (لما السجل لازم يبقى في فرع واحد):
 * requested = الفرع اللي المستخدم اختاره (فاضي = مااختارش). حساب «كل الفروع» (null) → اللي اختاره أو null (المنادي يقرر).
 * حساب فرع واحد → فرعه (واختيار فرع تاني مرفوض). أكتر من فرع → لازم يختار واحد جوه نطاقه — مفيش اختيار صامت.
 * نطاق فاضي → مرفوض. requested غلط (مش رقم صحيح موجب) → مرفوض.
 */
export const branchForWrite = (scope: BranchScope, requested: unknown): number | null => {
  const empty = requested === undefined || requested === null || requested === ''
  const wanted = empty ? null : Number(requested)
  if (wanted !== null && (!Number.isSafeInteger(wanted) || wanted < 1)) throw new BadRequestException('الفرع المختار غير صحيح')
  if (scope === null) return wanted
  if (scope.length === 0) throw new ForbiddenException('حسابك مش مربوط بفرع')
  if (wanted !== null) {
    if (!scope.includes(wanted)) throw new ForbiddenException('الفرع المختار خارج نطاق فروعك')
    return wanted
  }
  if (scope.length === 1) return scope[0]
  throw new BadRequestException('حسابك على أكتر من فرع — اختار الفرع')
}

// وصف النطاق في رسائل الرفض: «فرعك» لحساب فرع واحد و«فروعك» لأكتر من فرع
export const scopeWord = (scope: BranchScope): string => (scope !== null && scope.length > 1 ? 'فروعك' : 'فرعك')

// عزل الفروع: إعداد يسري على كل الشركة (سياسات النظام، سقوف السلف، شرائح التأخير) لا يعدّله حساب مقفول على فرع،
// عشان تعديله بيغيّر الفروع التانية. يشوفه عادي، والتعديل لحساب على مستوى الشركة (مدير النظام، أو حساب نطاقه
// «كل الفروع» — والصلاحية نفسها بيفرضها @Perm على المسار قبل الوصول هنا).
export const assertCompanyWideWrite = (user: JwtPayload): void => {
  if (branchScopeOf(user) !== null) throw new ForbiddenException('الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة')
}
