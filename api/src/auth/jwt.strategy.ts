import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Repository } from 'typeorm'
import type { JwtPayload } from './auth.service'
import { User } from './user.entity'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // بلا قيمة افتراضية — validateEnv يضمن وجوده وطوله وقت الإقلاع
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  // إبطال فوري: نتحقق من الحساب في القاعدة كل طلب — نشط؟ وإصدار التوكن مطابق؟
  // (تغيير الدور/الصلاحيات أو التعطيل يزيد tokenVersion فيبطل التوكن القديم فوراً)
  async validate(payload: JwtPayload) {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: ['id', 'isActive', 'tokenVersion', 'scopeAllBranches'],
    })
    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب معطّل')
    }
    if ((user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException('انتهت صلاحية الجلسة — سجّل الدخول من جديد')
    }
    // «نطاقه: كل الفروع» داخل التوكن لازم يطابق القاعدة: الشاشة بتزوّد tokenVersion مع أي تغيير، وده حزام تاني
    // لو العمود اتقفل من برّه الشاشة (SQL مباشر) — توكن لسه شايل «كل الفروع» لحساب اتقفل نطاقه يموت هنا.
    // العكس (العمود اتفتح والتوكن قديم) بيفضل مقفول على الفرع لحد الدخول الجاي: فشل مقفول.
    if (payload.scopeAllBranches === true && user.scopeAllBranches !== true) {
      throw new UnauthorizedException('انتهت صلاحية الجلسة — سجّل الدخول من جديد')
    }
    return payload
  }
}
