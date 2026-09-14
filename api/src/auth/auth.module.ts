import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { Role, UserPermissionOverride } from './role.entity'
import { RolesController } from './roles.controller'
import { User } from './user.entity'
import { UsersController } from './users.controller'
import { jwtLifetimeSeconds } from './jwt-secret'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employee, Branch, Role, UserPermissionOverride]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // بلا قيمة افتراضية — validateEnv يضمن وجوده وطوله وقت الإقلاع
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: jwtLifetimeSeconds(config.get<string>('JWT_EXPIRES_IN', '8h')),
        },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, RolesController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
