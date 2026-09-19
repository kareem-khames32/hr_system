import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'
import { AuthService, JwtPayload } from './auth.service'
import { AllowPendingPasswordChange, CurrentUser, JwtAuthGuard } from './guards'

class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

class ChangePasswordDto {
  @IsString({ message: 'اكتب كلمة المرور الحالية' })
  @MinLength(1, { message: 'اكتب كلمة المرور الحالية' })
  @MaxLength(200)
  currentPassword: string

  @IsString({ message: 'اكتب كلمة المرور الجديدة' })
  @MinLength(8, { message: 'كلمة المرور الجديدة 8 حروف على الأقل' })
  @MaxLength(200, { message: 'كلمة المرور طويلة قوي' })
  newPassword: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password)
  }

  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user
  }

  // صاحب الحساب يغيّر كلمته — ومفتوح لتوكن «لازم يغيّر كلمة المرور المؤقتة»
  // الرد = جلسة جديدة (الإصدار زاد فالتوكن القديم بطل)
  @UseGuards(JwtAuthGuard)
  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword)
  }
}
