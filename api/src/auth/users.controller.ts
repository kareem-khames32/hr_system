import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
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
import type { JwtPayload } from './auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from './guards'
import {
  adminGrantViolation,
  ALL_PERMISSIONS,
  hasPerm,
  PERMISSIONS,
  ROLE_PRESETS,
  SUPER_ADMIN_ONLY_GRANTS,
} from './permissions'
import { Role } from './role.entity'
import { User, UserRole } from './user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'

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
  password?: string

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
}

// إدارة حسابات الدخول — منفصلة عن سجل الموظف نفسه
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
    private readonly auth: AuthService
  ) {}

  // الدور القابل للإسناد = موجود في جدول roles ومفعّل (المخصصة مسموحة)
  // — fallback للـ presets لو الجدول لسه ما اتبذرش. مطابقة حرفية للكود المخزَّن
  // (البحث في القاعدة لا يفرّق حالة الأحرف) → لا يُحفظ إلا الكود القانوني
  private async assertAssignableRole(code: string) {
    const row = await this.roles.findOne({ where: { code } })
    const ok = row
      ? row.code === code && row.isActive
      : ROLE_PRESETS.some((r) => r.code === code)
    if (!ok) throw new BadRequestException('الدور غير صالح أو معطّل')
  }

  // الفرع المُسند: في نطاق المنفّذ (غير مدير النظام = فرعه فقط، ولا «بلا فرع»
  // لأن حساباً غير super_admin بلا فرع يرى كل الفروع) — وموجود فعلاً
  private async assertAssignableBranch(actor: JwtPayload, branchId: number | null) {
    const scope = branchScopeOf(actor)
    if (scope !== null && branchId !== scope) {
      throw new ForbiddenException('لا يمكنك إسناد فرع خارج نطاق فرعك')
    }
    if (branchId != null) {
      const branch = await this.branches.findOne({ where: { id: branchId } })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
  }

  // الموظف المربوط: موجود وفي نطاق المنفّذ، وغير مربوط بحساب آخر
  private async assertLinkableEmployee(
    actor: JwtPayload,
    employeeId: number,
    exceptUserId?: number
  ) {
    const scope = branchScopeOf(actor)
    const employee = await this.employees.findOne({ where: { id: employeeId } })
    if (!employee || (scope !== null && employee.branchId !== scope)) {
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

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const rows = await this.users.find({
      where: scope !== null ? { branchId: scope } : {},
      order: { id: 'ASC' },
    })
    // لا نُخرج الـ hash أبداً
    return rows.map(({ passwordHash: _ph, ...rest }) => rest)
  }

  @Post()
  async create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateUserDto) {
    // HR لا ينشئ حسابات أعلى من صلاحيته
    if (actor.role !== 'super_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException('إنشاء super_admin متاح للـ super_admin فقط')
    }
    await this.assertAssignableRole(dto.role)
    const email = dto.email.toLowerCase().trim()
    const dup = await this.users.findOne({ where: { email } })
    if (dup) throw new ConflictException(`البريد ${email} مسجل بالفعل`)

    let employee: Employee | null = null
    if (dto.employeeId) {
      employee = await this.assertLinkableEmployee(actor, dto.employeeId)
    }

    // super_admin بلا فرع — غيره يرث فرع الموظف المربوط إن وُجد، وإلا فرع المنفّذ
    const branchId =
      dto.role === 'super_admin'
        ? null
        : (dto.branchId ?? employee?.branchId ?? branchScopeOf(actor))
    if (dto.role !== 'super_admin') {
      await this.assertAssignableBranch(actor, branchId)
    }

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

    const saved = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        displayName: dto.displayName,
        role: dto.role as UserRole,
        branchId: branchId as unknown as number,
        employeeId: dto.employeeId,
        permissions,
      })
    )
    const { passwordHash: _ph, ...rest } = saved
    return rest
  }

  @Patch(':id')
  async update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ) {
    const user = await this.users.findOne({ where: { id } })
    // خارج نطاق فرع المنفّذ = غير موجود (زي القائمة) — يمنع أخذ حسابات فرع آخر
    const scope = branchScopeOf(actor)
    if (!user || (scope !== null && user.branchId !== scope)) {
      throw new NotFoundException('المستخدم غير موجود')
    }
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
    // لا أحد يعدّل دوره أو صلاحياته أو ربط حسابه بنفسه (تصعيد ذاتي / انتحال موظف)
    if (
      actor.sub === id &&
      (roleChanged || permsChanged || branchChanged || employeeChanged)
    ) {
      throw new BadRequestException(
        'لا يمكنك تعديل دور حسابك أو صلاحياته أو ربطه بنفسك'
      )
    }
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
    if (actor.role !== 'super_admin' && (dto.password || reactivating)) {
      const target = await this.auth.resolvePermissions({
        ...user,
        role: (dto.role ?? user.role) as UserRole,
        permissions: perms ?? user.permissions,
      })
      const beyond = [...SUPER_ADMIN_ONLY_GRANTS, '*'].filter(
        (p) => target.includes(p) && !hasPerm(actor.permissions, p)
      )
      if (beyond.length > 0) {
        throw new ForbiddenException(
          `تغيير كلمة المرور أو تفعيل حساب يملك ${beyond
            .map((p) => `«${PERMISSIONS[p] ?? 'كل الصلاحيات'}»`)
            .join(' و')} متاح لمدير النظام فقط`
        )
      }
    }
    // نفس فحوص الإنشاء: الفرع في النطاق، والموظف موجود وفي النطاق وغير مربوط بغيره
    if (branchChanged) {
      await this.assertAssignableBranch(actor, dto.branchId ?? null)
    }
    if (employeeChanged && dto.employeeId != null) {
      await this.assertLinkableEmployee(actor, dto.employeeId, id)
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10)
    }
    if (dto.role !== undefined) user.role = dto.role as UserRole
    if (dto.isActive !== undefined) user.isActive = dto.isActive
    if (dto.branchId !== undefined) user.branchId = dto.branchId
    if (dto.employeeId !== undefined) user.employeeId = dto.employeeId
    if (perms !== undefined) user.permissions = perms
    // تغيير أمني (دور/صلاحيات/تعطيل/كلمة مرور/فرع/موظف مربوط) → أبطِل التوكنات
    // القائمة فوراً (الفرع والموظف داخل الـJWT: نطاق البيانات وهوية الخدمة الذاتية)
    if (
      dto.role !== undefined ||
      perms !== undefined ||
      dto.isActive !== undefined ||
      dto.password ||
      branchChanged ||
      employeeChanged
    ) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1
    }
    const saved = await this.users.save(user)
    const { passwordHash: _ph, ...rest } = saved
    return rest
  }
}
