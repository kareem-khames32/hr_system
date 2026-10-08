import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Ip,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Not, Repository, type EntityManager } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { AuthService } from './auth.service'
import { TotpService, totpReady } from './totp.service'
import type { JwtPayload } from './auth.service'
import {
  branchScopeCovers,
  branchScopeOf,
  branchScopeQb,
  cleanBranchIds,
  CurrentUser,
  effectiveBranchScope,
  inBranchScope,
  JwtAuthGuard,
  parseScopeBranchIds,
  Perm,
  RolesGuard,
  scopeWord,
} from './guards'
import {
  adminGrantViolation,
  ALL_PERMISSIONS,
  hasPerm,
  PERMISSIONS,
  ROLE_PRESETS,
  SUPER_ADMIN_ONLY_GRANTS,
} from './permissions'
import { Role } from './role.entity'
import { roleStampOf } from './role-stamp'
import { User, UserRole } from './user.entity'
import { Employee } from '../employees/employee.entity'
import { recordLoginAccountUnlinked } from '../employees/employee-change-log'
import { AccountEditLock } from './account-edit-lock'
import { Branch } from '../org/entities/branch.entity'
import { DomainSyncService } from './domain-sync.service'
import { legacyUnusablePasswordUserIds, needsPasswordFromLegacy } from './legacy-password-marker'
import { LoginSecurityService } from './login-security.service'
import { RequireModule } from '../modules-registry/module.guard'
import { recordAudit } from '../audit/audit'

// الصلاحيات الإضافية القابلة للمنح = سجل الصلاحيات المركزي كاملاً
// + أسماء قديمة للتوافق (كانت hardcoded قبل السجل)
const LEGACY_GRANTS = [
  'hr',
  'finance',
  'custody_officer',
  'it',
  'executive',
  'hr_manager',
  'branch_manager',
]
const GRANTABLE_PERMISSIONS = [...ALL_PERMISSIONS, ...LEGACY_GRANTS]

const validatePermissions = (perms?: string[]): string | undefined => {
  if (perms === undefined) return undefined
  if (!Array.isArray(perms)) {
    throw new BadRequestException('الصلاحيات مصفوفة نصوص')
  }
  const bad = perms.filter((p) => !GRANTABLE_PERMISSIONS.includes(p))
  if (bad.length > 0) {
    throw new BadRequestException(`صلاحيات غير معروفة: ${bad.join('، ')}`)
  }
  return JSON.stringify(perms)
}

class CreateUserDto {
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @MaxLength(200)
  email: string

  @IsString()
  @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل' })
  password: string

  @IsString({ message: 'اسم العرض مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  displayName: string

  // من جدول roles (موجود ومفعّل) — يُفحص في الكنترولر بدل قائمة ثابتة.
  // كود قانوني فقط (نفس قاعدة أكواد الأدوار، 30 = طول عمود users.role): الـcollation
  // لا يفرّق حالة الأحرف ولا المسافات الأخيرة → "SUPER_ADMIN" كان يطابق مدير النظام
  @IsString({ message: 'الدور غير صالح' })
  @Matches(/^[a-z0-9_]{3,30}$/, { message: 'الدور غير صالح' })
  role: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number

  @IsOptional()
  permissions?: string[]

  // «نطاقه: فرعه / كل الفروع» — منطقية فقط (1 أو "true" مرفوضة)، ولمدير النظام فقط
  @IsOptional()
  @IsBoolean({ message: 'نطاق الحساب غير صالح' })
  scopeAllBranches?: boolean

  // «نطاق الفروع» بعلامات صح: فرع أو أكتر (مش مبعوت/فاضي = فرعه الأصلي بس)
  @IsOptional()
  @IsArray({ message: 'فروع النطاق غير صالحة' })
  @ArrayMaxSize(200, { message: 'فروع النطاق كتير قوي' })
  @IsInt({ each: true, message: 'فروع النطاق غير صالحة' })
  scopeBranchIds?: number[]
}

class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'الدور غير صالح' })
  @Matches(/^[a-z0-9_]{3,30}$/, { message: 'الدور غير صالح' })
  role?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل' })
  @MaxLength(200, { message: 'كلمة المرور طويلة قوي' })
  password?: string

  // مع password بس: الكلمة دي مؤقتة ولازم صاحب الحساب يغيّرها أول دخول
  // (لو مابعتهاش: مؤقتة افتراضيًا، إلا لو بتغيّر كلمة حسابك إنت)
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number

  @IsOptional()
  permissions?: string[]

  // «نطاقه: فرعه / كل الفروع» — منطقية فقط، ولمدير النظام فقط (فتحًا وقفلًا)
  @IsOptional()
  @IsBoolean({ message: 'نطاق الحساب غير صالح' })
  scopeAllBranches?: boolean

  // «نطاق الفروع» بعلامات صح: فرع أو أكتر. null أو [] = يرجع لفرعه الأصلي بس
  @IsOptional()
  @IsArray({ message: 'فروع النطاق غير صالحة' })
  @ArrayMaxSize(200, { message: 'فروع النطاق كتير قوي' })
  @IsInt({ each: true, message: 'فروع النطاق غير صالحة' })
  scopeBranchIds?: number[] | null
}

// «نطاقه: كل الفروع» بيوسّع كل صلاحية يحملها الحساب على الشركة كلها، فهو تصعيد زي الصلاحيات الحصرية:
// مايفتحوش ولا يقفلوش غير مدير النظام، والحساب المفتوح له مايديروش (دور/صلاحيات/كلمة مرور/تفعيل/فرع) غير مدير النظام —
// وإلا مدير موارد بشرية مقفول على فرع يعيّن كلمة مرور لحساب «كل الفروع» في فرعه ويدخل بيه.
export const SCOPE_ALL_BRANCHES_SUPER_ADMIN_ONLY = 'تغيير نطاق الحساب «فرعه / كل الفروع» متاح لمدير النظام فقط'
export const SCOPE_ALL_BRANCHES_ACCOUNT_LOCKED = 'الحساب ده نطاقه «كل الفروع» — تعديله متاح لمدير النظام فقط'
// ونفس المنطق للفروع المختارة بعلامات صح: حساب فروع يدّي فروع جوه نطاقه بس، ومايديرش حساب نطاقه فيه فرع برّه نطاقه
// (وإلا مدير الفرع 2 يعيّن كلمة مرور لحساب على الفرع 2 و3 ويدخل بيه على الفرع 3)
export const SCOPE_BRANCHES_OUTSIDE_ACTOR = 'تقدر تدّي فروع جوه نطاقك بس'
/** الدور المطلوب إسناده اتغيّرت حزمته أو حالته بعد ما الإسناد اتحكم عليه — CRP3G */
export const ASSIGNED_ROLE_CHANGED = 'الدور المختار اتغيّرت صلاحياته — حدّث الصفحة وحاول تاني'
/** الحساب اتغيّر (دوره أو صلاحياته أو نطاقه أو حالته) بعد ما التعديل اتحكم عليه — CRP3F */
export const ACCOUNT_CHANGED_MEANWHILE = 'بيانات الحساب اتغيّرت — حدّث الصفحة وحاول تاني'
export const SCOPE_WIDER_ACCOUNT_LOCKED = 'الحساب ده نطاقه فيه فروع برّه نطاقك — تعديله لحساب نطاقه يغطي كل فروعه'

/**
 * نطاق الحساب للشاشة: scopeBranchIds = المختارة بعلامات صح ([] = مفيش اختيار صريح، فرعه الأصلي بس)،
 * وbranchIds = النطاق الفعّال (null = كل الفروع) — نفس اللي بيتكتب في توكنه.
 */
export const scopeView = (user: Pick<User, 'role' | 'scopeAllBranches' | 'scopeBranchIds' | 'branchId'>) => ({
  scopeBranchIds: parseScopeBranchIds(user.scopeBranchIds),
  branchIds: effectiveBranchScope(user),
})

/**
 * الحساب ده ينفع المنفّذ يديره (كلمة مرور، دور، صلاحيات، فروع…)؟ حساب «كل الفروع» لمدير النظام بس (قرار 22 سبتمبر)،
 * وحساب نطاقه أوسع من نطاق المنفّذ (فيه فرع برّه نطاقه) لحساب نطاقه يغطيه بس. المنفّذ على مستوى الشركة يغطي أي فروع.
 */
export function assertManageableScope(actor: JwtPayload, target: User) {
  if (actor.role === 'super_admin') return
  if (target.role !== 'super_admin' && target.scopeAllBranches === true) throw new ForbiddenException(SCOPE_ALL_BRANCHES_ACCOUNT_LOCKED)
  if (!branchScopeCovers(branchScopeOf(actor), effectiveBranchScope(target))) throw new ForbiddenException(SCOPE_WIDER_ACCOUNT_LOCKED)
}

// مزامنة حسابات الدومين: معاينة افتراضيًّا، والكتابة محتاجة apply=true صريحة في الجسم
class DomainSyncDto {
  @IsOptional()
  @IsBoolean({ message: 'تطبيق المزامنة لازم يكون true أو false' })
  apply?: boolean
}

// المزامنة بتعمل حسابات في كل الفروع، فحساب مقفول على فرع مايشغّلهاش (نفس قاعدة «مايسندش فرع خارج نطاقه»)
export const DOMAIN_SYNC_COMPANY_WIDE_ONLY =
  'مزامنة حسابات الدومين بتعمل حسابات في كل الفروع — متاحة للحساب اللي نطاقه «كل الفروع» بس'

// B1.3: فلاتر سجل الدخول
class LoginEventsQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ بصيغة YYYY-MM-DD' })
  from?: string

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ بصيغة YYYY-MM-DD' })
  to?: string

  @IsOptional() @Type(() => Number) @IsInt()
  userId?: number

  @IsOptional() @Matches(/^[A-Z_]{2,30}$/, { message: 'النتيجة غير معروفة' })
  outcome?: string

  @IsOptional() @IsString() @MaxLength(100)
  search?: string
}

// كلمة مرور مؤقتة واحدة لكذا حساب مرة واحدة (الحسابات المنقولة من القديم جات من غير كلمة)
class TemporaryPasswordDto {
  @IsArray({ message: 'اختار المستخدمين' })
  @ArrayMinSize(1, { message: 'اختار مستخدم واحد على الأقل' })
  @ArrayMaxSize(200, { message: 'أقصى حاجة 200 مستخدم في المرة' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'أرقام المستخدمين غير صحيحة' })
  userIds: number[]

  @IsString({ message: 'اكتب كلمة المرور المؤقتة' })
  @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل' })
  @MaxLength(200, { message: 'كلمة المرور طويلة قوي' })
  password: string

  // افتراضيًا: لازم يغيّرها أول دخول
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean
}

// إدارة حسابات الدخول — منفصلة عن سجل الموظف نفسه
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('users.manage')
@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly auth: AuthService,
    private readonly domainSync: DomainSyncService,
    private readonly security: LoginSecurityService,
    private readonly totp: TotpService,
    @InjectDataSource() private readonly ds: DataSource
  ) {}

  // الدور القابل للإسناد = موجود في جدول roles ومفعّل (المخصصة مسموحة)
  // — fallback للـ presets لو الجدول لسه ما اتبذرش. مطابقة حرفية للكود المخزَّن
  // (البحث في القاعدة لا يفرّق حالة الأحرف) → لا يُحفظ إلا الكود القانوني
  /**
   * CRP3G-B02: حزمة الدور وحالته كنص للمقارنة (دور من غير صف = حزمته الأساسية في الكود). من غير مدير معاملة: القراية اللي الحكم بيتبني
   * عليها؛ وبمدير معاملة: صف الدور بيتقفل لآخرها، فتعديل حزمته يا ثبت قبلنا فنشوفه، يا بيستنى الحفظ
   */
  private async roleStamp(code: string, em?: EntityManager): Promise<string> {
    // CRP3H: دور من غير صف كان «قفله» مابيمسكش حاجة — إنشاء صف له بعد القراية كان بيعدّي والإسناد يكمل بحكم الحزمة الأساسية.
    // القفل دلوقتي بيمسك مكان الكود في الفهرس كمان (role-stamp.ts)
    return roleStampOf(em ?? this.roles.manager, code, !!em)
  }

  private async assertAssignableRole(code: string) {
    const row = await this.roles.findOne({ where: { code } })
    const ok = row
      ? row.code === code && row.isActive
      : ROLE_PRESETS.some((r) => r.code === code)
    if (!ok) throw new BadRequestException('الدور غير صالح أو معطّل')
  }

  // الفرع المُسند: في نطاق المنفّذ (حساب الفروع = فرع من فروعه فقط، ولا «بلا فرع») — وموجود فعلاً
  private async assertAssignableBranch(actor: JwtPayload, branchId: number | null) {
    const scope = branchScopeOf(actor)
    if (!inBranchScope(scope, branchId)) {
      throw new ForbiddenException(`لا يمكنك إسناد فرع خارج نطاق ${scopeWord(scope)}`)
    }
    if (branchId != null) {
      const branch = await this.branches.findOne({ where: { id: branchId } })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
  }

  // فرع الحساب الجديد لما محدش حدده ولا فيه موظف مربوط: المنفّذ على مستوى الشركة = بلا فرع (زي الأول)، وحساب
  // الفرع الواحد = فرعه، وحساب الفروع المتعددة لازم يختار — مفيش اختيار صامت
  private defaultBranchFor(actor: JwtPayload): number | null {
    const scope = branchScopeOf(actor)
    if (scope === null) return null
    if (scope.length === 1) return scope[0]
    if (scope.length === 0) throw new ForbiddenException('حسابك مش مربوط بفرع')
    throw new BadRequestException('حسابك على أكتر من فرع — اختار فرع الحساب')
  }

  /**
   * فروع النطاق المختارة بعلامات صح → النص اللي هيتخزن في users.scopeBranchIds (null = فرعه الأصلي بس).
   * كل فرع لازم يكون موجود، وحساب الفروع يدّي فروع جوه نطاقه بس (المنفّذ على مستوى الشركة يدّي أي فرع).
   * الاختيار اللي هو فرعه الأصلي بالظبط بيتخزن null: «فرعه بس» شكل واحد، وبيمشي مع فرعه لو اتغيّر.
   */
  private async scopeBranchIdsToStore(
    actor: JwtPayload,
    raw: number[] | null | undefined,
    homeBranchId: number | null
  ): Promise<string | null> {
    if (raw == null || raw.length === 0) return null
    const ids = cleanBranchIds(raw)
    if (ids.length !== raw.length) throw new BadRequestException('فروع النطاق غير صالحة أو مكررة')
    if (!branchScopeCovers(branchScopeOf(actor), ids)) throw new ForbiddenException(SCOPE_BRANCHES_OUTSIDE_ACTOR)
    const found = await this.branches.find({ where: { id: In(ids) }, select: ['id'] })
    if (found.length !== ids.length) throw new BadRequestException('فرع أو أكتر من فروع النطاق غير موجود')
    const sorted = [...ids].sort((a, b) => a - b)
    if (sorted.length === 1 && homeBranchId != null && sorted[0] === homeBranchId) return null
    return JSON.stringify(sorted)
  }

  // الموظف المربوط: موجود وفي نطاق المنفّذ، وغير مربوط بحساب آخر
  private async assertLinkableEmployee(
    actor: JwtPayload,
    employeeId: number,
    exceptUserId?: number
  ) {
    const scope = branchScopeOf(actor)
    const employee = await this.employees.findOne({ where: { id: employeeId } })
    if (!employee || !inBranchScope(scope, employee.branchId)) {
      throw new BadRequestException('الموظف غير موجود')
    }
    const linked = await this.users.findOne({
      where: exceptUserId
        ? { employeeId, id: Not(exceptUserId) }
        : { employeeId },
    })
    if (linked) {
      throw new ConflictException(`الموظف مرتبط بالفعل بحساب ${linked.email}`)
    }
    return employee
  }

  // كلمة المرور وإعادة التفعيل = السيطرة على الحساب: لو الحساب (بعد التعديل) يملك صلاحية إدارية
  // لا يملكها المنفّذ فسيدخل به ويرثها → لمدير النظام فقط. يرجّع أسماء الصلاحيات اللي فوق المنفّذ
  private async takeoverBeyond(actor: JwtPayload, target: User): Promise<string | null> {
    if (actor.role === 'super_admin') return null
    const perms = await this.auth.resolvePermissions(target)
    const beyond = [...SUPER_ADMIN_ONLY_GRANTS, '*'].filter(
      (p) => perms.includes(p) && !hasPerm(actor.permissions, p)
    )
    return beyond.length > 0
      ? beyond.map((p) => `«${PERMISSIONS[p] ?? 'كل الصلاحيات'}»`).join(' و')
      : null
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const query = this.users
      .createQueryBuilder('u')
      .addSelect(['u.mustChangePassword', 'u.passwordChangedAt'])
      .orderBy('u.id', 'ASC')
    // حساب الفروع يشوف حسابات فروعه (بفرعها الأصلي)
    if (scope !== null) query.where(...branchScopeQb('u.branchId', scope))
    const rows = await query.getMany()
    const legacyIds = legacyUnusablePasswordUserIds()
    // B1.3: الحسابات المقفولة دلوقتي (بعد محاولات غلط) — الشاشة بتعرض «مقفول لحد…» وزرار «فك القفل»
    const locked = await this.security.lockedAccounts()
    // B2.17-ج: الحسابات المفعّلة تطبيق المصادقة — الشاشة بتعرض «تطبيق مصادقة» وزرار «إعادة ضبط»
    const totpEnabled = await this.totpEnabledIds()
    // لا نُخرج الـ hash أبداً — بس علامة «مستخدم منقول — محتاج باسورد»
    return rows.map(({ passwordHash: _ph, ...rest }) => ({
      ...rest,
      mustChangePassword: !!rest.mustChangePassword,
      // «نطاقه: كل الفروع» — مدير النظام نطاقه كامل بدوره فالعلم عليه دايمًا false
      scopeAllBranches: rest.role !== 'super_admin' && rest.scopeAllBranches === true,
      ...scopeView(rest),
      legacyNeedsPassword: needsPasswordFromLegacy(rest, legacyIds),
      // «حساب دومين»: مربوط بحساب Active Directory (بيدخل بكلمة المجال، ومفيش كلمة عندنا).
      // الشاشة بتعلّمه عشان المالك يفرّق وهو بيسند الأدوار بين حساب المجال وحساب البريد+الكلمة.
      isDomainAccount: !!rest.domainObjectGuid,
      ...(locked.has(rest.id) ? { lockedUntil: locked.get(rest.id)!.toISOString() } : {}),
      ...(totpEnabled.has(rest.id) ? { totpEnabled: true } : {}),
    }))
  }

  /** B2.17-ج: أرقام الحسابات اللي تطبيق المصادقة مفعّل عليها (قبل ترحيل 102: ولا حساب) */
  private async totpEnabledIds(): Promise<Set<number>> {
    if (!(await totpReady(this.ds.manager))) return new Set()
    const rows: Array<{ userId: number }> = await this.ds.query('SELECT [userId] FROM [user_totp] WHERE [confirmedAt] IS NOT NULL')
    return new Set(rows.map(row => Number(row.userId)))
  }

  /**
   * B2.17-ج: إعادة ضبط تطبيق المصادقة لحساب (الموبايل ضاع): دخوله الجاي من غير رمز التطبيق، ولو دوره إلزامي بيفعّل من جديد.
   * الحساب برّه نطاق فروع المنفّذ = مش موجود؛ وحساب مدير نظام مايعيدش ضبطه غير مدير نظام؛ وصاحب الحساب نفسه من «الأمان» برمزه.
   */
  @Post(':id/totp-reset')
  @HttpCode(200)
  async totpReset(@CurrentUser() actor: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    const target = await this.users.findOne({ where: { id } })
    if (!target || !inBranchScope(branchScopeOf(actor), target.branchId)) throw new NotFoundException('المستخدم غير موجود')
    if (target.id === actor.sub) throw new BadRequestException('إلغاء تطبيق المصادقة لحسابك من «الأمان» برمز من التطبيق')
    if (target.role === 'super_admin' && actor.role !== 'super_admin') throw new ForbiddenException('إعادة ضبط تطبيق المصادقة لمدير النظام لمدير نظام بس')
    // CRP3D-B17-01: إلغاء الخطوة التانية نص السيطرة على الحساب، فحدوده حدود تغيير كلمة المرور: حساب «كل الفروع» أو نطاقه فيه فرع برّه نطاق
    // المنفّذ، أو فيه صلاحية إدارية مش مع المنفّذ = لمدير النظام بس. والحكم ده على الصف المقري هنا: adminReset بيقفل صف الحساب ويرفض لو اتغيّر
    assertManageableScope(actor, target)
    const beyond = await this.takeoverBeyond(actor, target)
    if (beyond) throw new ForbiddenException(`حساب ${target.displayName} فيه ${beyond} — إعادة ضبط تطبيق المصادقة له لمدير النظام بس`)
    return { id: target.id, reset: await this.totp.adminReset(actor, target) }
  }

  /**
   * مزامنة حسابات الدومين: كل موظف مطابق يبقى له حساب ظاهر في الشاشة قبل أي دخول، فالمالك يقدر
   * يسند دور أو صلاحية لحد قبل ما يسجّل دخول ولا مرة (قرار المالك 22 سبتمبر).
   * **معاينة افتراضيًّا**: بلا apply=true مفيش صف واحد بيتكتب، والرد بيقول اللي كان هيحصل.
   */
  @Post('domain-sync')
  @HttpCode(200)
  async domainSyncRun(@CurrentUser() actor: JwtPayload, @Body() dto: DomainSyncDto) {
    if (branchScopeOf(actor) !== null) throw new ForbiddenException(DOMAIN_SYNC_COMPANY_WIDE_ONLY)
    return this.domainSync.run({ apply: dto.apply === true })
  }

  /**
   * موظف واحد بالاسم — زرّ «مزامنة من AD» في ملف الموظف. نفس خطة المزامنة الجماعية ونفس الأسباب،
   * ومفيش معاينة هنا: صف واحد والمالك ضغط الزر بإيده. التمرير التاني مابيغيّرش حاجة.
   * نفس حراسة المزامنة الجماعية: users.manage (على الكلاس) + نطاق «كل الفروع».
   */
  @Post('domain-sync/employee/:id')
  @HttpCode(200)
  async domainSyncEmployee(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    if (branchScopeOf(actor) !== null) throw new ForbiddenException(DOMAIN_SYNC_COMPANY_WIDE_ONLY)
    return this.domainSync.syncEmployee(id)
  }

  // كلمة مرور مؤقتة واحدة لكل المختارين: bcrypt لكل حساب، و«لازم يغيّرها أول دخول» افتراضيًا،
  // وأي جلسة قديمة تبطل. كله أو ولا حاجة: حساب واحد مش مسموح = مفيش ولا حساب يتغيّر.
  @Post('temporary-password')
  @HttpCode(200)
  async setTemporaryPassword(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: TemporaryPasswordDto
  ) {
    const ids = [...new Set(dto.userIds)]
    if (ids.includes(actor.sub)) {
      throw new BadRequestException(
        'مينفعش تعيّن كلمة مؤقتة لحسابك إنت — غيّرها من «غيّر كلمة المرور»'
      )
    }
    const targets = await this.users.find({ where: { id: In(ids) } })
    const scope = branchScopeOf(actor)
    // خارج نطاق فروع المنفّذ = غير موجود (زي القائمة)
    const visible = targets.filter((u) => inBranchScope(scope, u.branchId))
    if (visible.length !== ids.length) {
      throw new NotFoundException('مستخدم أو أكتر من المختارين مش موجود')
    }
    for (const target of visible) {
      if (actor.role !== 'super_admin' && target.role === 'super_admin') {
        throw new ForbiddenException(
          `تغيير كلمة مرور ${target.displayName} (مدير النظام) متاح لمدير النظام فقط`
        )
      }
      // حساب «كل الفروع»: كلمة مروره = نطاق الشركة كلها، فتعيينها لمدير النظام بس
      if (actor.role !== 'super_admin' && target.scopeAllBranches === true) {
        throw new ForbiddenException(
          `حساب ${target.displayName} نطاقه «كل الفروع» — تغيير كلمة مروره لمدير النظام بس`
        )
      }
      // حساب نطاقه فيه فرع برّه نطاق المنفّذ: كلمة مروره = دخول على الفرع ده، فلحساب نطاقه يغطيه بس
      if (!branchScopeCovers(scope, effectiveBranchScope(target))) {
        throw new ForbiddenException(
          `حساب ${target.displayName} نطاقه فيه فروع برّه نطاقك — تغيير كلمة مروره لحساب نطاقه يغطي كل فروعه`
        )
      }
      const beyond = await this.takeoverBeyond(actor, target)
      if (beyond) {
        throw new ForbiddenException(
          `حساب ${target.displayName} فيه ${beyond} — تغيير كلمة مروره لمدير النظام بس`
        )
      }
    }
    // B1.3: سياسة كلمة السر (NIST) — الطول والشائعة وبريد الحساب واسمه
    for (const target of visible) await this.security.assertPassword(dto.password, { email: target.email, displayName: target.displayName })
    const mustChangePassword = dto.mustChangePassword ?? true
    const passwordChangedAt = new Date()
    const hashes = new Map<number, string>()
    for (const target of visible) hashes.set(target.id, await bcrypt.hash(dto.password, 10))
    await this.users.manager.transaction(async (em) => {
      for (const target of visible) {
        await em
          .createQueryBuilder()
          .update(User)
          .set({
            passwordHash: hashes.get(target.id) as string,
            mustChangePassword,
            passwordChangedAt,
            tokenVersion: () => 'tokenVersion + 1',
          })
          // CRP3G (مسح الصنف): حق المنفّذ اتحكم فوق على صلاحيات الحساب وقت القراية — حساب اترقّى أو اتغيّر بعدها إصداره اتحرك، فالكتابة
          // بشرط الإصدار اللي اتحكم عليه؛ مااتكتبش = 409 والدفعة كلها بترجع
          .where('id = :id AND tokenVersion = :seen', { id: target.id, seen: target.tokenVersion ?? 0 })
          .execute()
          .then((written) => {
            if (!written.affected) throw new ConflictException(ACCOUNT_CHANGED_MEANWHILE)
          })
        // B2.1: الكلمة المؤقتة في سجل التدقيق (إنها اتحطت بس — من غير أي قيمة)
        await recordAudit(em, { category: 'PERMISSIONS', action: 'TEMP_PASSWORD_SET', entityType: 'user', entityId: target.id, actorUserId: actor.sub,
          branchId: target.branchId ?? null, summary: `كلمة سر مؤقتة للحساب ${target.email}`, after: { mustChangePassword } })
      }
    })
    return { updated: visible.length, userIds: visible.map((u) => u.id), mustChangePassword }
  }

  @Post()
  async create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateUserDto) {
    // HR لا ينشئ حسابات أعلى من صلاحيته
    if (actor.role !== 'super_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException('إنشاء super_admin متاح للـ super_admin فقط')
    }
    // «نطاقه: كل الفروع» لمدير النظام فقط (false الصريحة = الوضع الافتراضي، مش تغيير)
    if (actor.role !== 'super_admin' && dto.scopeAllBranches === true) {
      throw new ForbiddenException(SCOPE_ALL_BRANCHES_SUPER_ADMIN_ONLY)
    }
    // CRP3G-B02: حزمة الدور المطلوب وحالته زي ما هيتحكم عليهم — بيتقارنوا بصف الدور تحت قفله وقت الحفظ
    const judgedRole = await this.roleStamp(dto.role)
    await this.assertAssignableRole(dto.role)
    const email = dto.email.toLowerCase().trim()
    const dup = await this.users.findOne({ where: { email } })
    if (dup) throw new ConflictException(`البريد ${email} مسجل بالفعل`)

    let employee: Employee | null = null
    if (dto.employeeId) {
      employee = await this.assertLinkableEmployee(actor, dto.employeeId)
    }

    // super_admin بلا فرع — غيره يرث فرع الموظف المربوط إن وُجد، وإلا فرع المنفّذ (لو فرع واحد)
    const branchId =
      dto.role === 'super_admin'
        ? null
        : (dto.branchId ?? employee?.branchId ?? this.defaultBranchFor(actor))
    if (dto.role !== 'super_admin') {
      await this.assertAssignableBranch(actor, branchId)
    }
    // «نطاق الفروع»: مدير النظام ونطاق «كل الفروع» مالهمش فروع مختارة؛ غيرهم الافتراضي فرعه الأصلي (null)
    const scopeAll = dto.role !== 'super_admin' && dto.scopeAllBranches === true
    const scopeBranchIds =
      dto.role === 'super_admin' || scopeAll
        ? null
        : await this.scopeBranchIdsToStore(actor, dto.scopeBranchIds, branchId)

    const permissions = validatePermissions(dto.permissions)
    // منح users/roles/settings.manage (بالدور أو بصلاحية إضافية) لمدير النظام فقط
    if (actor.role !== 'super_admin') {
      const effective = await this.auth.resolvePermissions(
        { role: dto.role, permissions } as User,
        { grants: [], revokes: [] }
      )
      const violation = adminGrantViolation(effective, [])
      if (violation) throw new ForbiddenException(violation)
    }

    // B1.3: سياسة كلمة السر (NIST)
    await this.security.assertPassword(dto.password, { email, displayName: dto.displayName })
    // CRP3G-B02: الحفظ في معاملة بتقفل صف الدور الأول: حزمته أو حالته اتغيّروا بعد الحكم = 409 (حساب جديد مايطلعش بصلاحية إدارية اتضافت
    // للدور والطلب في الطريق)
    const saved = await this.users.manager.transaction(async (em) => {
      if ((await this.roleStamp(dto.role, em)) !== judgedRole) throw new ConflictException(ASSIGNED_ROLE_CHANGED)
      return em.getRepository(User).save(
      em.getRepository(User).create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        passwordChangedAt: new Date(),
        displayName: dto.displayName,
        role: dto.role as UserRole,
        branchId: branchId as unknown as number,
        employeeId: dto.employeeId,
        permissions,
        // مدير النظام نطاقه كامل بدوره — العلم مالوش معنى عليه فمايتخزنش
        scopeAllBranches: scopeAll,
        scopeBranchIds,
      })
      )
    })
    const { passwordHash: _ph, ...rest } = saved
    return { ...rest, ...scopeView(saved) }
  }

  /** B1.3: فك قفل حساب اتقفل بعد محاولات دخول غلط (العداد صفر). الحساب برّه نطاق فروع المنفّذ = مش موجود. */
  @Post(':id/unlock')
  @HttpCode(200)
  async unlock(@CurrentUser() actor: JwtPayload, @Param('id', ParseIntPipe) id: number, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    const target = await this.users.findOne({ where: { id } })
    if (!target || !inBranchScope(branchScopeOf(actor), target.branchId)) throw new NotFoundException('المستخدم غير موجود')
    const unlocked = await this.security.reset(target.id)
    await this.security.record({ userId: target.id, identifier: target.email, method: 'ADMIN', outcome: unlocked ? 'UNLOCKED' : 'UNLOCK_NOOP',
      context: { ip, userAgent }, actorUserId: actor.sub })
    return { id: target.id, unlocked }
  }

  /**
   * B1.3: سجل الدخول — كل محاولة بوقتها ونتيجتها والـIP والجهاز، الأحدث الأول (500 بحد أقصى).
   * حساب الفروع بيشوف محاولات حسابات فروعه بس (المحاولات على بريد مش موجود لحساب الشركة بس).
   */
  @Get('login-events')
  async loginEvents(@CurrentUser() actor: JwtPayload, @Query() query: LoginEventsQueryDto) {
    const scope = branchScopeOf(actor)
    const params: unknown[] = []
    const where: string[] = []
    const param = (value: unknown) => { params.push(value); return `@${params.length - 1}` }
    if (query.from) where.push(`e.[at] >= ${param(new Date(`${query.from}T00:00:00`))}`)
    if (query.to) where.push(`e.[at] < DATEADD(day, 1, ${param(new Date(`${query.to}T00:00:00`))})`)
    if (query.userId) where.push(`e.[userId] = ${param(query.userId)}`)
    if (query.outcome) where.push(`e.[outcome] = ${param(query.outcome)}`)
    if (query.search?.trim()) where.push(`(e.[identifier] LIKE ${param(`%${query.search.trim().replace(/[%_[]/g, ch => `[${ch}]`)}%`)} OR u.[displayName] LIKE ${param(`%${query.search.trim().replace(/[%_[]/g, ch => `[${ch}]`)}%`)})`)
    if (scope !== null) where.push(scope.length ? `u.[branchId] IN (${scope.map(id => param(id)).join(', ')})` : '1 = 0')
    try {
      const rows: Array<Record<string, unknown>> = await this.users.manager.query(
        `SELECT TOP (500) e.[id], e.[at], e.[userId], u.[displayName], e.[identifier], e.[method], e.[outcome], e.[ip], e.[userAgent], e.[actorUserId], a.[displayName] AS [actorName]
         FROM dbo.login_events e LEFT JOIN dbo.users u ON u.[id] = e.[userId] LEFT JOIN dbo.users a ON a.[id] = e.[actorUserId]
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.[id] DESC`, params)
      return { available: true, rows }
    } catch (error) {
      // قبل ترحيل 078: الجدول مش موجود — الشاشة بتقول إن السجل لسه ماتفعّلش
      const numbers = [(error as any)?.number, (error as any)?.driverError?.number, (error as any)?.originalError?.info?.number]
      if (numbers.includes(208)) return { available: false, rows: [] }
      throw error
    }
  }

  // تعديلات الحساب الواحد ورا بعض (Codex CRP2Q-B01): القراءة وسجل الربط القديم والحفظ وإبطال الجلسات تحت قفل واحد
  @UseInterceptors(AccountEditLock)
  @Patch(':id')
  async update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ) {
    const user = await this.users.findOne({ where: { id } })
    // خارج نطاق فروع المنفّذ = غير موجود (زي القائمة) — يمنع أخذ حسابات فرع آخر
    const scope = branchScopeOf(actor)
    if (!user || !inBranchScope(scope, user.branchId)) {
      throw new NotFoundException('المستخدم غير موجود')
    }
    // CRP3F: الصف زي ما اتقري (قبل أي تعديل في الذاكرة) — الخانات اللي هتتغيّر بتتحسب منه، وإصداره بيتقارن تحت القفل وقت الحفظ
    const seen = { ...user }
    if (
      actor.role !== 'super_admin' &&
      (user.role === 'super_admin' || dto.role === 'super_admin')
    ) {
      throw new ForbiddenException('تعديل super_admin متاح للـ super_admin فقط')
    }
    // لا يعطّل المستخدم نفسه
    if (dto.isActive === false && actor.sub === id) {
      throw new BadRequestException('لا يمكنك تعطيل حسابك الحالي')
    }
    const perms = validatePermissions(dto.permissions)
    const roleChanged = dto.role !== undefined && dto.role !== user.role
    const permsChanged = perms !== undefined && perms !== user.permissions
    const branchChanged =
      dto.branchId !== undefined && dto.branchId !== user.branchId
    const employeeChanged =
      dto.employeeId !== undefined && dto.employeeId !== user.employeeId
    // مدير النظام نطاقه كامل بدوره: الترقية له بتقفل العلم، ومايتفتحش على حسابه
    const nextRole = dto.role ?? user.role
    const wasScopeAll = user.scopeAllBranches === true
    const nextScopeAll =
      nextRole === 'super_admin' ? false : (dto.scopeAllBranches ?? wasScopeAll)
    const scopeAllChanged = nextScopeAll !== wasScopeAll
    if (actor.role !== 'super_admin') {
      // فتح «كل الفروع» أو قفله = تصعيد/تنزيل نطاق — لمدير النظام فقط، زي الصلاحيات الحصرية
      if (dto.scopeAllBranches !== undefined && dto.scopeAllBranches !== wasScopeAll) {
        throw new ForbiddenException(SCOPE_ALL_BRANCHES_SUPER_ADMIN_ONLY)
      }
      // والحساب المفتوح له لا يديره (دور/صلاحيات/كلمة مرور/تفعيل/فرع/ربط) إلا مدير النظام
      if (wasScopeAll) throw new ForbiddenException(SCOPE_ALL_BRANCHES_ACCOUNT_LOCKED)
      // وحساب نطاقه فيه فرع برّه نطاق المنفّذ مايديروش غير حساب نطاقه يغطيه
      assertManageableScope(actor, user)
    }
    // «نطاق الفروع» بعلامات صح: مدير النظام و«كل الفروع» مالهمش فروع مختارة (بتتمسح)، وغيرهم اللي اتبعت
    // (بعد التحقق) أو المخزّن زي ما هو. الفرع الأصلي الجديد بيدخل في حساب «فرعه بس» (بيتخزن null)
    const nextBranchId = dto.branchId !== undefined ? (dto.branchId ?? null) : (user.branchId ?? null)
    const nextScopeBranchIds =
      nextRole === 'super_admin' || nextScopeAll
        ? null
        : dto.scopeBranchIds !== undefined
          ? await this.scopeBranchIdsToStore(actor, dto.scopeBranchIds, nextBranchId)
          : (user.scopeBranchIds ?? null)
    const scopeBranchesChanged = nextScopeBranchIds !== (user.scopeBranchIds ?? null)
    const scopeChanged = scopeAllChanged || scopeBranchesChanged
    // لا أحد يعدّل دوره أو صلاحياته أو ربط حسابه أو نطاقه بنفسه (تصعيد ذاتي / انتحال موظف)
    if (
      actor.sub === id &&
      (roleChanged || permsChanged || branchChanged || employeeChanged || scopeChanged)
    ) {
      throw new BadRequestException(
        'لا يمكنك تعديل دور حسابك أو صلاحياته أو ربطه بنفسك'
      )
    }
    // CRP3G-B02: الدور المقترح بيتثبّت — حزمته وحالته بيتقروا هنا قبل الحكم، وبيتقارنوا بصفه تحت القفل وقت الحفظ. (دور الحساب الحالي
    // تعديل حزمته بيحرّك إصدار الحساب نفسه؛ الدور المقترح لسه مش عليه، فإصداره مابيتحركش)
    const judgedRole = roleChanged ? await this.roleStamp(dto.role as string) : null
    if (roleChanged) await this.assertAssignableRole(dto.role as string)
    // منح users/roles/settings.manage (بالدور أو بصلاحية إضافية) لمدير النظام فقط
    if (actor.role !== 'super_admin' && (roleChanged || permsChanged)) {
      const before = await this.auth.resolvePermissions(user)
      const after = await this.auth.resolvePermissions({
        ...user,
        role: (dto.role ?? user.role) as UserRole,
        permissions: perms ?? user.permissions,
      })
      const violation = adminGrantViolation(after, before)
      if (violation) throw new ForbiddenException(violation)
    }
    // كلمة المرور وإعادة التفعيل = السيطرة على الحساب: لو الحساب (بعد التعديل) يملك
    // صلاحية إدارية لا يملكها المنفّذ فسيدخل به ويرثها → لمدير النظام فقط
    // (التعطيل مسموح: لا يمنح شيئاً، وسحب الصلاحيات نفسه مسموح)
    const reactivating = dto.isActive === true && !user.isActive
    if (dto.password || reactivating) {
      const beyond = await this.takeoverBeyond(actor, {
        ...user,
        role: (dto.role ?? user.role) as UserRole,
        permissions: perms ?? user.permissions,
      })
      if (beyond) {
        throw new ForbiddenException(
          `تغيير كلمة المرور أو تفعيل حساب يملك ${beyond} متاح لمدير النظام فقط`
        )
      }
    }
    if (dto.mustChangePassword !== undefined && !dto.password) {
      throw new BadRequestException('«يغيّرها أول دخول» بتتبعت مع كلمة المرور الجديدة')
    }
    // نفس فحوص الإنشاء: الفرع في النطاق، والموظف موجود وفي النطاق وغير مربوط بغيره
    if (branchChanged) {
      await this.assertAssignableBranch(actor, dto.branchId ?? null)
    }
    if (employeeChanged && dto.employeeId != null) {
      await this.assertLinkableEmployee(actor, dto.employeeId, id)
    }
    if (dto.password) {
      // B1.3: سياسة كلمة السر (NIST)
      await this.security.assertPassword(dto.password, { email: user.email, displayName: user.displayName })
      user.passwordHash = await bcrypt.hash(dto.password, 10)
      // إعادة التعيين من المدير = كلمة مؤقتة افتراضيًا (إلا حسابك إنت)
      user.mustChangePassword = dto.mustChangePassword ?? actor.sub !== id
      user.passwordChangedAt = new Date()
    }
    // B2.8 (Codex CRP2P-B03): حساب مربوط بموظف وربطه بيتغيّر: الربط القديم بيتسجّل على الموظف قبل الحفظ (مفيش لحظة الحساب فيها اتغيّر
    // ربطه من غير سجل). حوار الطلبات بيقراه عشان الحساب يفضل على جانب الموظف في طلبات الموظف ده. والمسار كله تحت قفل الحساب
    // (AccountEditLock): الربط اللي اتقري فوق هو اللي في القاعدة دلوقتي
    const unlinkedEmployeeId = employeeChanged && user.employeeId != null ? user.employeeId : null
    if (dto.role !== undefined) user.role = dto.role as UserRole
    if (dto.isActive !== undefined) user.isActive = dto.isActive
    if (dto.branchId !== undefined) user.branchId = dto.branchId
    if (dto.employeeId !== undefined) user.employeeId = dto.employeeId
    if (perms !== undefined) user.permissions = perms
    if (scopeAllChanged) user.scopeAllBranches = nextScopeAll
    if (scopeBranchesChanged) user.scopeBranchIds = nextScopeBranchIds
    // تغيير أمني (دور/صلاحيات/تعطيل/كلمة مرور/فرع/موظف مربوط/نطاق الفروع) → أبطِل التوكنات
    // القائمة فوراً (الفرع والموظف و«كل الفروع» والفروع المختارة داخل الـJWT: نطاق البيانات وهوية الخدمة الذاتية)
    if (
      dto.role !== undefined ||
      perms !== undefined ||
      dto.isActive !== undefined ||
      dto.password ||
      branchChanged ||
      employeeChanged ||
      scopeChanged
    ) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1
    }
    // CRP3F: الحكم فوق اتعمل على صف اتقري من غير قفل، وحفظ الكيان كله كان بيكتب قيمه القديمة (ومنها إصدار الحساب) فوق تغيير حصل بعد
    // القراية (ترقية من حزمة الدور أو من المنح الفردية بتزوّد الإصدار). الحفظ بقى في معاملة: صف الحساب بيتقفل ويتقري من جديد، ولو إصداره
    // اتحرك بعد الحكم = 409 (الحكم بيتعاد على الصف الجديد)، والخانات اللي التعديل ده غيّرها بس بتتحط على الصف الحالي ويتحفظ — فإصدار
    // الحساب مابيرجعش، وسطر التدقيق (من مستمع الحفظ) زي ما هو. وسجل فك الربط القديم في نفس المعاملة
    const seenVersion = seen.tokenVersion ?? 0
    const changed = (Object.keys(user) as Array<keyof User>).filter((key) => user[key] !== seen[key])
    const saved = await this.users.manager.transaction(async (em) => {
      // CRP3G-B02: صف الدور المقترح بيتقفل الأول (نفس ترتيب تعديل الدور: صف الدور ثم صفوف حساباته)، وبعده صف الحساب
      if (judgedRole !== null && (await this.roleStamp(dto.role as string, em)) !== judgedRole) throw new ConflictException(ASSIGNED_ROLE_CHANGED)
      const fresh = await em.getRepository(User).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!fresh || (fresh.tokenVersion ?? 0) !== seenVersion) throw new ConflictException(ACCOUNT_CHANGED_MEANWHILE)
      if (unlinkedEmployeeId != null) {
        await recordLoginAccountUnlinked(em, { employeeId: unlinkedEmployeeId, userId: fresh.id, changedByUserId: actor.sub })
      }
      for (const key of changed) Object.assign(fresh, { [key]: user[key] })
      return changed.length ? em.getRepository(User).save(fresh) : fresh
    })
    const { passwordHash: _ph, ...rest } = saved
    return { ...rest, ...scopeView(saved) }
  }
}
