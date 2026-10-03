import type { EntityManager } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'

// B1.7 — ضوابط الشخص الواحد (R10، R11، D08). كلها **مقفولة افتراضيًا** لحد ما المالك يرد على Q-002 وQ-008 وQ-009 (الخيار ج):
// شركته تفضل زي ما هي بالظبط، والعميل اللي عايز الضابط يفتحه من «سياسات النظام».
export const ONE_PERSON_CONTROL_KEYS = {
  /** اللي غيّر راتب أو حساب بنكي لموظف في المسير مايعتمدهوش لوحده */
  blockRecentChangers: 'payroll.approval.block_recent_changers',
  /** تغيير الآيبان والبنك بطلب «تغيير حساب بنكي» بس، ومن غير اعتماد فوري نيابةً، وبشخصين */
  bankSecurePathAlways: 'payroll.bank_change.secure_path_always',
  /** اليوم اللي فيه بصمة يدوية أو تصحيح مابيتعتمدش تلقائي، والفترة التلقائية محتاجة سقف شهري */
  overtimeExcludeManual: 'overtime.auto_approve.exclude_manual',
  /** النقل بين الفروع من التعديل وExcel بفحص العهدة والمدير */
  transferChecks: 'employees.transfer_checks.enabled',
} as const
export type OnePersonControl = keyof typeof ONE_PERSON_CONTROL_KEYS

export async function onePersonControlEnabled(em: EntityManager, control: OnePersonControl): Promise<boolean> {
  const row = await em.getRepository(RequestsConfig).findOne({ where: { key: ONE_PERSON_CONTROL_KEYS[control] } })
  return row?.value === 'true'
}

/** الحقول اللي طلب «تغيير حساب بنكي» بيغيّرها — المسار الأمني بيقفلها على التعديل وExcel لما يتفتح */
export const BANK_SECURE_FIELDS = ['iban', 'bankName'] as const
