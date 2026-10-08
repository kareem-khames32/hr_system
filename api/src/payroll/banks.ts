import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B4.6 (ب): جدول البنوك بأكوادها (D04) — كل بنك بدولته وكوده في الآيبان (السعودي: رقمين بعد خانتي التحقق؛ المصري: 4 أرقام).
// كود بنك الموظف مش عمود جديد على ملفه: الآيبان نفسه فيه كود البنك، فبنك الموظف = صف الجدول اللي كوده في آيبانه — مرجع ثابت مش نص حر.
// الجدول فاضي (الافتراضي) = كشف البنك زي الأول بالحرف. لما يبقى فيه بنوك دولة: آيبان كوده مش في الجدول بيطلع تنبيه قبل الصرف.

@Entity('banks')
export class Bank {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_banks' })
  id: number

  /** دولة البنك (EG / SA) */
  @Column({ type: 'nvarchar', length: 2 })
  country: string

  /** كود البنك زي ما بيظهر في الآيبان */
  @Column({ type: 'nvarchar', length: 10 })
  ibanCode: string

  @Column({ type: 'nvarchar', length: 200 })
  nameAr: string

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  nameEn: string | null

  /** كود السويفت أو كود البنك في ملف التحويلات (اختياري) */
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  swiftCode: string | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

export const BANK_COUNTRIES: readonly string[] = ['EG', 'SA']
/** طول كود البنك في آيبان كل دولة (بعد حرفي الدولة وخانتي التحقق) */
export const IBAN_BANK_CODE_LENGTH: Readonly<Record<string, number>> = { SA: 2, EG: 4 }
const IBAN_SHAPE: Readonly<Record<string, RegExp>> = { SA: /^SA\d{22}$/, EG: /^EG\d{27}$/ }

export interface BankRef { country: string; ibanCode: string }
export interface BankCatalogEntry extends BankRef { nameAr: string; isActive: boolean }

/** دولة وكود البنك من آيبان سليم الشكل (سعودي أو مصري)، أو null */
export function ibanBankRef(iban: unknown): BankRef | null {
  const value = String(iban ?? '').replace(/[\s-]/g, '').toUpperCase(), country = value.slice(0, 2)
  if (!IBAN_SHAPE[country]?.test(value)) return null
  return { country, ibanCode: value.slice(4, 4 + IBAN_BANK_CODE_LENGTH[country]) }
}

/** بنك الآيبان من الجدول (المفعّل)، أو null لو كوده مش موجود */
export function bankOfIban<T extends BankCatalogEntry>(iban: unknown, banks: readonly T[]): T | null {
  const ref = ibanBankRef(iban)
  return ref ? banks.find(bank => bank.isActive && bank.country === ref.country && bank.ibanCode === ref.ibanCode) ?? null : null
}

/**
 * تنبيه «كود البنك مش في جدول البنوك»، أو null. بيتقال بس لما الجدول فيه بنوك مفعّلة لدولة الآيبان —
 * جدول فاضي أو دولة من غير بنوك = مفيش تنبيه (زي الأول)؛ والآيبان الغلط ليه تنبيهه القايم.
 */
export function bankCatalogIssue(iban: unknown, banks: readonly BankCatalogEntry[]): string | null {
  const ref = ibanBankRef(iban)
  if (!ref || !banks.some(bank => bank.isActive && bank.country === ref.country)) return null
  return bankOfIban(iban, banks) ? null : `كود البنك في الآيبان (${ref.ibanCode}) مش في جدول البنوك — ضيف البنك من «الإعدادات ← البنوك» أو صحّح الآيبان`
}

export interface BankInput { country?: unknown; ibanCode?: unknown; nameAr?: unknown; nameEn?: unknown; swiftCode?: unknown; isActive?: unknown }
const line = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** خانات بنك جديد أو المبعوت من تعديل (بعد التطبيع)، أو رسالة الخطأ. الدولة والكود مابيتغيّروش بعد الإضافة */
export function bankFields(input: BankInput, creating: boolean): { fields: Partial<Pick<Bank, 'country' | 'ibanCode' | 'nameAr' | 'nameEn' | 'swiftCode' | 'isActive'>>; error: null } | { fields: null; error: string } {
  const fail = (error: string) => ({ fields: null, error })
  const fields: Partial<Pick<Bank, 'country' | 'ibanCode' | 'nameAr' | 'nameEn' | 'swiftCode' | 'isActive'>> = {}
  if (creating) {
    const country = line(input.country).toUpperCase()
    if (!BANK_COUNTRIES.includes(country)) return fail('دولة البنك مصر أو السعودية')
    const ibanCode = line(input.ibanCode)
    if (!new RegExp(`^\\d{${IBAN_BANK_CODE_LENGTH[country]}}$`).test(ibanCode)) return fail(`كود البنك في الآيبان ${IBAN_BANK_CODE_LENGTH[country]} أرقام (${country === 'SA' ? 'السعودية' : 'مصر'})`)
    fields.country = country; fields.ibanCode = ibanCode
  } else if (input.country !== undefined || input.ibanCode !== undefined) return fail('دولة البنك وكوده مابيتغيّروش — عطّل البنك وضيف واحد جديد')
  if (creating || input.nameAr !== undefined) {
    const nameAr = line(input.nameAr)
    if (nameAr.length < 2 || nameAr.length > 200) return fail('اسم البنك من حرفين لـ200 حرف')
    fields.nameAr = nameAr
  }
  if (input.nameEn !== undefined) {
    const nameEn = line(input.nameEn)
    if (nameEn.length > 200) return fail('اسم البنك بالإنجليزي 200 حرف بحد أقصى')
    fields.nameEn = nameEn || null
  }
  if (input.swiftCode !== undefined) {
    const swiftCode = line(input.swiftCode).toUpperCase()
    if (swiftCode && !/^[A-Z0-9]{4,20}$/.test(swiftCode)) return fail('كود السويفت حروف إنجليزية وأرقام من 4 لـ20')
    fields.swiftCode = swiftCode || null
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') return fail('«مفعّل» أيوه أو لأ')
    fields.isActive = input.isActive
  } else if (creating) fields.isActive = true
  return { fields, error: null }
}

let ready: boolean | null = null
/** جدول ترحيل 138 موجود؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function banksReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.banks', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetBanksCache() { ready = null }

/** البنوك المفعّلة لكشف البنك وشاشة الصرف. قبل الترحيل: قايمة فاضية (من غير تنبيه) */
export async function readActiveBanks(em: EntityManager): Promise<BankCatalogEntry[]> {
  if (!(await banksReady(em))) return []
  const rows: Array<{ country: string; ibanCode: string; nameAr: string }> = await em.query('SELECT [country], [ibanCode], [nameAr] FROM dbo.banks WHERE [isActive] = 1')
  return rows.map(row => ({ country: String(row.country), ibanCode: String(row.ibanCode), nameAr: String(row.nameAr), isActive: true }))
}
