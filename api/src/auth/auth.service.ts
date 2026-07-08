import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { effectivePermissions, ROLE_PRESETS } from './permissions'
import { Role, UserPermissionOverride } from './role.entity'
import { User } from './user.entity'

// حمولة التوكن — الدور والفرع هما أساس عزل البيانات
export interface JwtPayload {
  sub: number
  email: string
  role: string
  branchId: number | null
  employeeId: number | null
  // صلاحيات إضافية فوق الدور (أدوار وظيفية ممنوحة)
  permissions?: string[]
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(UserPermissionOverride)
    private readonly overrides: Repository<UserPermissionOverride>,
    private readonly jwt: JwtService
  ) {}

  // الصلاحيات النهائية = حزمة الدور + GRANTs − REVOKEs
  async resolvePermissions(user: User): Promise<string[]> {
    let rolePerms: string[] = []
    const roleRow = await this.roles.findOne({ where: { code: user.role } })
    if (roleRow) {
      try {
        rolePerms = JSON.parse(roleRow.permissions)
      } catch {
        rolePerms = []
      }
    } else {
      // fallback للـ presets لو الجدول لسه ما اتبذرش
      rolePerms =
        ROLE_PRESETS.find((r) => r.code === user.role)?.permissions ?? []
    }
    const ovr = await this.overrides.find({ where: { userId: user.id } })
    const grants = ovr.filter((o) => o.effect === 'GRANT').map((o) => o.permission)
    const revokes = ovr.filter((o) => o.effect === 'REVOKE').map((o) => o.permission)

    // توافق خلفي: صلاحيات العمود القديم permissions (functional roles) كـ GRANTs
    try {
      const legacy: string[] = user.permissions ? JSON.parse(user.permissions) : []
      const legacyMap: Record<string, string> = {
        hr: 'approve.hr',
        finance: 'approve.finance',
        it: 'approve.it',
        custody_officer: 'approve.custody',
        executive: 'approve.executive',
      }
      for (const l of legacy) grants.push(legacyMap[l] ?? l)
    } catch {
      /* تجاهل */
    }
    return effectivePermissions(rolePerms, grants, revokes)
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase().trim() },
    })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة')
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة')
    }

    user.lastLoginAt = new Date()
    await this.users.save(user)

    const permissions = await this.resolvePermissions(user)

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId ?? null,
      employeeId: user.employeeId ?? null,
      permissions,
    }

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        branchId: user.branchId,
        employeeId: user.employeeId,
        permissions,
      },
    }
  }

  async findById(id: number) {
    return this.users.findOne({ where: { id } })
  }

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10)
  }
}
