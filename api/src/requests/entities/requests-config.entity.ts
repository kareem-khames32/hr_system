import { Column, Entity, PrimaryColumn } from 'typeorm'

// إعدادات محرك الطلبات القابلة للتغيير بدون نشر كود
// overtime.biometric_requires_confirmation / loan.finance_approval_threshold ...
@Entity('requests_config')
export class RequestsConfig {
  @PrimaryColumn({ length: 100 })
  key: string

  // nvarchar(4000) من ترحيل 20260927_073 (قايمة أسباب إنهاء الخدمة المخصصة JSON في صف واحد) — حد
  // PATCH /settings/config العام للقيمة فاضل 500 (UpsertConfigDto)
  @Column({ length: 4000 })
  value: string
}
