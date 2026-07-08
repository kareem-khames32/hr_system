import { Column, Entity, PrimaryColumn } from 'typeorm'

// إعدادات محرك الطلبات القابلة للتغيير بدون نشر كود
// overtime.biometric_requires_confirmation / loan.finance_approval_threshold ...
@Entity('requests_config')
export class RequestsConfig {
  @PrimaryColumn({ length: 100 })
  key: string

  @Column({ length: 500 })
  value: string
}
