import { BadRequestException } from '@nestjs/common'

// employees.archiveReason nvarchar(300): الأطول كان يمر من الخدمة ثم يفشل في القاعدة بـ500
export const ARCHIVE_REASON_MAX = 300

export function assertArchiveReason(reason: unknown): void {
  if (reason === undefined) return
  if (typeof reason !== 'string') throw new BadRequestException('سبب الأرشفة نص')
  if (reason.trim().length > ARCHIVE_REASON_MAX) {
    throw new BadRequestException(`سبب الأرشفة بحد أقصى ${ARCHIVE_REASON_MAX} حرف`)
  }
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
