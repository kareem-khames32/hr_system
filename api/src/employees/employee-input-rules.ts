import { BadRequestException } from '@nestjs/common'
import { normalizeIdentityNumber } from './employee-required-fields'

// employees.archiveReason nvarchar(300): الأطول كان يمر من الخدمة ثم يفشل في القاعدة بـ500
export const ARCHIVE_REASON_MAX = 300

export function assertArchiveReason(reason: unknown): void {
  if (reason === undefined) return
  if (typeof reason !== 'string') throw new BadRequestException('سبب الأرشفة نص')
  if (reason.trim().length > ARCHIVE_REASON_MAX) {
    throw new BadRequestException(`سبب الأرشفة بحد أقصى ${ARCHIVE_REASON_MAX} حرف`)
  }
}

// رقم الهوية / الجواز المحفوظ قبل قرار المالك (28 سبتمبر) ممكن يكون بمسافات أو حروف صغيرة أو أرقام عربية — التفرد
// بيقارن بنفس تطبيع normalizeIdentityNumber جوه SQL: الحروف اللي بيشيلها (مسافات وعلامات اتجاه/عرض صفري — محسوبة
// منه نفسه فمايختلفوش)، والأرقام العربية/الفارسية لاتينية، وحروف كبيرة. الترتيب الثنائي (BIN2) عشان الاستبدال والمقارنة
// يبقوا حرف بحرف مهما كان ترتيب القاعدة.
let identityStripped: number[] | null = null
const identityStrippedCodes = () => identityStripped ??= Array.from({ length: 0x10000 }, (_, code) => code)
  .filter(code => normalizeIdentityNumber(String.fromCharCode(code)) === '')

/** تعبير SQL Server لقيمة عمود رقم الهوية / الجواز بعد التطبيع (column = اسم عمود مهرّب زي [nationalId]). */
export function identityKeySql(column: string): string {
  let sql = `UPPER(${column}) COLLATE Latin1_General_100_BIN2`
  for (const code of identityStrippedCodes()) sql = `REPLACE(${sql}, NCHAR(${code}), N'')`
  for (let digit = 0; digit <= 9; digit++) {
    sql = `REPLACE(REPLACE(${sql}, NCHAR(${0x0660 + digit}), N'${digit}'), NCHAR(${0x06f0 + digit}), N'${digit}')`
  }
  return sql
}

const dateOnly = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

export interface OpeningBalanceLayer {
  openingDays?: unknown
  openingTaken?: unknown
  openingExpiry?: unknown
}

// الطبقة الافتتاحية بعد تعديلها: لا شيء عند تطابق الأيام والصلاحية، والمستخدم منها يبقى
// محدودًا بالأيام الجديدة (الزائد يُحمَّل على استحقاق السنة) بدل تصفيره.
export function nextOpeningBalance(current: OpeningBalanceLayer, days: number, expiry?: string | null) {
  const nextExpiry = dateOnly(expiry)
  if (Number(current.openingDays ?? 0) === days && dateOnly(current.openingExpiry) === nextExpiry) return null
  return {
    openingDays: days,
    openingTaken: Math.min(Math.max(0, Number(current.openingTaken ?? 0)), days),
    openingExpiry: nextExpiry,
  }
}
