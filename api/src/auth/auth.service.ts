import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from './user.entity'

// حمولة التوكن — الدور والفرع هما أساس عزل البيانات
export interface JwtPayload {
  sub: number
  email: string
  role: string
  branchId: number | null
  employeeId: number | null
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService
  ) {}

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

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId ?? null,
      employeeId: user.employeeId ?? null,
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
