import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { AuthService } from './auth.service'
import type { JwtPayload } from './auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from './guards'
import { adminGrantViolation, ALL_PERMISSIONS, PERMISSIONS } from './permissions'
import { Role, UserPermissionOverride } from './role.entity'
import { User } from './user.entity'

class CreateRoleDto {
  // حد 30 = طول عمود users.role — الكود الأطول لا يمكن إسناده لمستخدم
  @IsString({ message: 'كود الدور مطلوب' })
  @Matches(/^[a-z0-9_]{3,30}$/, {
    message: 'كود الدور: 3-30 من الحروف الإنجليزية الصغيرة والأرقام و_ فقط',
  })
  code: string

  @IsString({ message: 'اسم الدور مطلوب' })
  @MinLength(3)
  @MaxLength(100)
  nameAr: string

  // بدون الديكوريتر يحذفها whitelist من الجسم
  @IsArray({ message: 'الصلاحيات مصفوفة' })
  permissions: string[]
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nameAr?: string

  @IsOptional()
  @IsArray({ message: 'الصلاحيات مصفوفة' })
  permissions?: string[]

  // منطقية فقط — 1 أو "true" كانت تُحفظ تفعيلاً وتتخطى فحص إعادة التفعيل
  @IsOptional()
  @IsBoolean({ message: 'حالة التفعيل غير صالحة' })
  isActive?: boolean
}

const validatePermList = (perms: unknown): string[] => {
  if (!Array.isArray(perms)) {
    throw new BadRequestException('الصلاحيات مصفوفة')
  }
  const bad = perms.filter((p) => p !== '*' && !ALL_PERMISSIONS.includes(p))
  if (bad.length > 0) {
    throw new BadRequestException(`صلاحيات غير معروفة: ${bad.join('، ')}`)
  }
  return perms
}

// نفس المجموعة بغض النظر عن الترتيب
const sameSet = (a: string[], b: string[]) => {
  const sa = new Set(a)
  const sb = new Set(b)
  return sa.size === sb.size && [...sa].every((p) => sb.has(p))
}

// إدارة الأدوار (حزم الصلاحيات) + تجاوزات المستخدمين
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RolesController {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserPermissionOverride)
    private readonly overrides: Repository<UserPermissionOverride>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly auth: AuthService
  ) {}

  // سجل الصلاحيات الكامل — لشاشات الإدارة
  @Perm('roles.manage', 'users.manage')
  @Get('permissions-registry')
  registry() {
    return Object.entries(PERMISSIONS).map(([key, labelAr]) => ({
      key,
      labelAr,
      group: key.split('.')[0],
    }))
  }

  // ===== الأدوار =====
  @Perm('roles.manage', 'users.manage')
  @Get('roles')
  async list(@CurrentUser() actor: JwtPayload) {
    const rows = await this.roles.find({ order: { id: 'ASC' } })
    // عدد مستخدمي كل دور بنطاق فرع المنفّذ (كقائمة المستخدمين) — شاشة الأدوار
    // تعرضه دون GET /users (users.manage) فلا تسقط لمن يملك roles.manage وحدها
    const scope = branchScopeOf(actor)
    const qb = this.users
      .createQueryBuilder('u')
      .select('u.role', 'role')
      .addSelect('COUNT(*)', 'n')
      .groupBy('u.role')
    if (scope !== null) qb.where('u.branchId = :scope', { scope })
    const counts = new Map(
      (await qb.getRawMany<{ role: string; n: number | string }>()).map((c) => [
        c.role,
        Number(c.n),
      ])
    )
    return rows.map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions),
      userCount: counts.get(r.code) ?? 0,
    }))
  }

  @Perm('roles.manage')
  @Post('roles')
  async create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateRoleDto) {
    const dup = await this.roles.findOne({ where: { code: dto.code } })
    if (dup) throw new BadRequestException(`كود الدور ${dto.code} مستخدم`)
    const perms = validatePermList(dto.permissions)
    if (perms.includes('*')) {
      throw new BadRequestException('صلاحية * لمدير النظام فقط')
    }
    const violation =
      actor.role === 'super_admin' ? null : adminGrantViolation(perms, [])
    if (violation) throw new ForbiddenException(violation)
    const saved = await this.roles.save(
      this.roles.create({
        code: dto.code,
        nameAr: dto.nameAr,
        permissions: JSON.stringify(perms),
        isSystem: false,
      })
    )
    return { ...saved, permissions: perms }
  }

  @Perm('roles.manage')
  @Patch('roles/:id')
  async update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto
  ) {
    const role = await this.roles.findOne({ where: { id } })
    if (!role) throw new NotFoundException('الدور غير موجود')
    if (role.code === 'super_admin') {
      throw new BadRequestException('دور مدير النظام لا يُعدَّل')
    }
    const prevPerms: string[] = JSON.parse(role.permissions)
    const wasActive = role.isActive
    let permsChanged = false
    if (dto.permissions !== undefined) {
      const perms = validatePermList(dto.permissions)
      if (perms.includes('*')) {
        throw new BadRequestException('صلاحية * لمدير النظام فقط')
      }
      permsChanged = !sameSet(perms, prevPerms)
      if (actor.role !== 'super_admin' && permsChanged) {
        // لا يعدّل أحد حزمة دوره هو (تصعيد ذاتي)
        if (role.code === actor.role) {
          throw new BadRequestException('لا يمكنك تعديل صلاحيات دورك أنت')
        }
        const violation = adminGrantViolation(perms, prevPerms)
        if (violation) throw new ForbiddenException(violation)
      }
      role.permissions = JSON.stringify(perms)
    }
    if (dto.nameAr !== undefined) role.nameAr = dto.nameAr
    if (dto.isActive !== undefined) {
      if (role.isSystem && dto.isActive === false) {
        throw new BadRequestException('الأدوار الأساسية لا تُعطَّل')
      }
      if (actor.role !== 'super_admin' && dto.isActive !== wasActive) {
        // تفعيل دورك أو تعطيله = تعديل صلاحياتك بنفسك
        if (role.code === actor.role) {
          throw new BadRequestException('لا يمكنك تفعيل دورك أنت أو تعطيله')
        }
        // الدور المعطَّل لا يمنح شيئاً → إعادة تفعيله منحٌ لحزمته كاملة (بعد التعديل)
        if (dto.isActive) {
          const violation = adminGrantViolation(JSON.parse(role.permissions), [])
          if (violation) throw new ForbiddenException(violation)
        }
      }
      role.isActive = dto.isActive
    }
    const saved = await this.roles.save(role)
    // الصلاحيات داخل الـJWT (8 ساعات) → تغيير حزمة الدور أو تفعيله يُبطل فوراً
    // جلسات كل من عليه الدور (تغيير الاسم وحده لا يؤثر)
    if (permsChanged || saved.isActive !== wasActive) {
      await this.users.increment(
        { role: role.code as User['role'] },
        'tokenVersion',
        1
      )
    }
    return { ...saved, permissions: JSON.parse(saved.permissions) }
  }

  // المستخدم خارج نطاق فرع المنفّذ = غير موجود (زي قائمة المستخدمين)
  private async scopedUser(actor: JwtPayload, id: number) {
    const user = await this.users.findOne({ where: { id } })
    const scope = branchScopeOf(actor)
    if (!user || (scope !== null && user.branchId !== scope)) {
      throw new NotFoundException('المستخدم غير موجود')
    }
    return user
  }

  // ===== تجاوزات مستخدم: الصلاحيات النهائية + GRANT/REVOKE =====
  @Perm('users.manage', 'roles.manage')
  @Get('users/:id/permissions')
  async userPermissions(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    const user = await this.scopedUser(actor, id)
    const ovr = await this.overrides.find({ where: { userId: id } })
    return {
      role: user.role,
      grants: ovr.filter((o) => o.effect === 'GRANT').map((o) => o.permission),
      revokes: ovr.filter((o) => o.effect === 'REVOKE').map((o) => o.permission),
      effective: await this.auth.resolvePermissions(user),
    }
  }

  // استبدال كامل للتجاوزات — بسيط وواضح
  @Perm('users.manage', 'roles.manage')
  @Put('users/:id/permissions')
  async setUserPermissions(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { grants?: string[]; revokes?: string[] }
  ) {
    const user = await this.scopedUser(actor, id)
    if (user.role === 'super_admin') {
      throw new BadRequestException('مدير النظام يملك كل الصلاحيات — لا تجاوزات')
    }
    // لا أحد يعدّل صلاحياته هو (تصعيد ذاتي)
    if (actor.sub === id) {
      throw new BadRequestException('لا يمكنك تعديل صلاحياتك بنفسك')
    }
    const grants = validatePermList(dto.grants ?? [])
    const revokes = validatePermList(dto.revokes ?? [])
    // * لمدير النظام فقط — لا تُمنح كتجاوز (زي الأدوار)
    if (grants.includes('*') || revokes.includes('*')) {
      throw new BadRequestException('صلاحية * لمدير النظام فقط')
    }
    const both = grants.filter((g) => revokes.includes(g))
    if (both.length > 0) {
      throw new BadRequestException(
        `لا يصح GRANT وREVOKE لنفس الصلاحية: ${both.join('، ')}`
      )
    }
    // منح users/roles/settings.manage لمدير النظام فقط — بالأثر الفعلي
    // (يشمل فك سحب إحداها من حزمة الدور)
    if (actor.role !== 'super_admin') {
      const violation = adminGrantViolation(
        await this.auth.resolvePermissions(user, { grants, revokes }),
        await this.auth.resolvePermissions(user)
      )
      if (violation) throw new ForbiddenException(violation)
    }
    await this.overrides.delete({ userId: id })
    const rows = [
      ...grants.map((p) => ({ userId: id, permission: p, effect: 'GRANT' as const })),
      ...revokes.map((p) => ({ userId: id, permission: p, effect: 'REVOKE' as const })),
    ]
    if (rows.length > 0) await this.overrides.save(this.overrides.create(rows))
    // تغيّرت الصلاحيات الفعلية → أبطِل التوكنات القائمة فوراً
    user.tokenVersion = (user.tokenVersion ?? 0) + 1
    await this.users.save(user)
    return this.userPermissions(actor, id)
  }
}
