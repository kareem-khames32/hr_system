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
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from './auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from './guards'
import { User, UserRole } from './user.entity'
import { Employee } from '../employees/employee.entity'

const ROLES: UserRole[] = ['super_admin', 'hr_manager', 'branch_manager', 'employee']

// الصلاحيات الإضافية القابلة للمنح — قدرات أدوار وظيفية فوق الدور الأساسي
const GRANTABLE_PERMISSIONS = [
  'hr', // خطوات HR في الاعتمادات + مسارات HR
  'finance', // خطوات المالية
  'custody_officer', // أمين العهدة
  'it', // خطوات IT
  'executive', // الخطوات التنفيذية
  'hr_manager', // كامل قدرات مدير HR في المسارات المحمية
  'branch_manager', // قدرات مدير الفرع
]

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

  @IsIn(ROLES, { message: 'الدور غير صالح' })
  role: UserRole

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
  @IsIn(ROLES, { message: 'الدور غير صالح' })
  role?: UserRole

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
@Roles('super_admin', 'hr_manager')
@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>
  ) {}

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
    const email = dto.email.toLowerCase().trim()
    const dup = await this.users.findOne({ where: { email } })
    if (dup) throw new ConflictException(`البريد ${email} مسجل بالفعل`)

    let employee: Employee | null = null
    if (dto.employeeId) {
      employee = await this.employees.findOne({
        where: { id: dto.employeeId },
      })
      if (!employee) throw new BadRequestException('الموظف غير موجود')
      const linked = await this.users.findOne({
        where: { employeeId: dto.employeeId },
      })
      if (linked) {
        throw new ConflictException(
          `الموظف مرتبط بالفعل بحساب ${linked.email}`
        )
      }
    }

    const saved = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        displayName: dto.displayName,
        role: dto.role,
        // super_admin بلا فرع — غيره يرث فرع الموظف المربوط إن وُجد
        branchId:
          dto.role === 'super_admin'
            ? (null as unknown as number)
            : (dto.branchId ?? employee?.branchId ?? (null as unknown as number)),
        employeeId: dto.employeeId,
        permissions: validatePermissions(dto.permissions),
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
    if (!user) throw new NotFoundException('المستخدم غير موجود')
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
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10)
    }
    if (dto.role !== undefined) user.role = dto.role
    if (dto.isActive !== undefined) user.isActive = dto.isActive
    if (dto.branchId !== undefined) user.branchId = dto.branchId
    if (dto.employeeId !== undefined) user.employeeId = dto.employeeId
    const perms = validatePermissions(dto.permissions)
    if (perms !== undefined) user.permissions = perms
    const saved = await this.users.save(user)
    const { passwordHash: _ph, ...rest } = saved
    return rest
  }
}
