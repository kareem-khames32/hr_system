import {
  BadRequestException,
  Body,
  Controller,
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
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { AuthService } from './auth.service'
import { JwtAuthGuard, Perm, RolesGuard } from './guards'
import { ALL_PERMISSIONS, PERMISSIONS } from './permissions'
import { Role, UserPermissionOverride } from './role.entity'
import { User } from './user.entity'

class CreateRoleDto {
  @IsString({ message: 'كود الدور مطلوب' })
  @Matches(/^[a-z0-9_]{3,50}$/, {
    message: 'كود الدور: حروف إنجليزية صغيرة وأرقام و_ فقط',
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

  @IsOptional()
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
  async list() {
    const rows = await this.roles.find({ order: { id: 'ASC' } })
    return rows.map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions),
    }))
  }

  @Perm('roles.manage')
  @Post('roles')
  async create(@Body() dto: CreateRoleDto) {
    const dup = await this.roles.findOne({ where: { code: dto.code } })
    if (dup) throw new BadRequestException(`كود الدور ${dto.code} مستخدم`)
    const perms = validatePermList(dto.permissions)
    if (perms.includes('*')) {
      throw new BadRequestException('صلاحية * لمدير النظام فقط')
    }
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto
  ) {
    const role = await this.roles.findOne({ where: { id } })
    if (!role) throw new NotFoundException('الدور غير موجود')
    if (role.code === 'super_admin') {
      throw new BadRequestException('دور مدير النظام لا يُعدَّل')
    }
    if (dto.permissions !== undefined) {
      const perms = validatePermList(dto.permissions)
      if (perms.includes('*')) {
        throw new BadRequestException('صلاحية * لمدير النظام فقط')
      }
      role.permissions = JSON.stringify(perms)
    }
    if (dto.nameAr !== undefined) role.nameAr = dto.nameAr
    if (dto.isActive !== undefined) {
      if (role.isSystem && dto.isActive === false) {
        throw new BadRequestException('الأدوار الأساسية لا تُعطَّل')
      }
      role.isActive = dto.isActive
    }
    const saved = await this.roles.save(role)
    return { ...saved, permissions: JSON.parse(saved.permissions) }
  }

  // ===== تجاوزات مستخدم: الصلاحيات النهائية + GRANT/REVOKE =====
  @Perm('users.manage', 'roles.manage')
  @Get('users/:id/permissions')
  async userPermissions(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new NotFoundException('المستخدم غير موجود')
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
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { grants?: string[]; revokes?: string[] }
  ) {
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new NotFoundException('المستخدم غير موجود')
    if (user.role === 'super_admin') {
      throw new BadRequestException('مدير النظام يملك كل الصلاحيات — لا تجاوزات')
    }
    const grants = validatePermList(dto.grants ?? [])
    const revokes = validatePermList(dto.revokes ?? [])
    const both = grants.filter((g) => revokes.includes(g))
    if (both.length > 0) {
      throw new BadRequestException(
        `لا يصح GRANT وREVOKE لنفس الصلاحية: ${both.join('، ')}`
      )
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
    return this.userPermissions(id)
  }
}
