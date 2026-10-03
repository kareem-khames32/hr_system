import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B1.5 (ترحيل 080): «تاريخ أول تسجيل في التأمينات» على الموظف — بيتقرا ويتكتب بـSQL صريح بس (العمود برّه الكيان)، فقبل الترحيل
// القراءة بترجع فاضي (= المسار القديم، زي ما كان) وكتابة تاريخ بتقول إن الترحيل لازم يتطبق الأول.

const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown }; originalError?: { info?: { number?: unknown } } }
  const number = value?.driverError?.number ?? value?.number ?? value?.originalError?.info?.number
  return typeof number === 'number' ? number : undefined
}
// التاريخ بيرجع نص من SQL نفسه (CONVERT 23) — كائن Date من المشغّل بيتزحزح يوم بفرق التوقيت
const dateText = (value: unknown): string | null => {
  const text = value == null ? '' : String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

/** تاريخ أول تسجيل لكل موظف من القايمة (الناقص = فاضي). قبل ترحيل 080 = خريطة فاضية */
export async function readGosiFirstRegistered(em: EntityManager, employeeIds: readonly number[]): Promise<Map<number, string>> {
  const ids = [...new Set(employeeIds.filter(id => Number.isSafeInteger(id) && id > 0))]
  const result = new Map<number, string>()
  if (!ids.length) return result
  try {
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const rows: Array<{ id: number; value: unknown }> = await em.query(
        `SELECT [id], CONVERT(nvarchar(10), [gosiFirstRegisteredAt], 23) AS [value] FROM dbo.employees
         WHERE [gosiFirstRegisteredAt] IS NOT NULL AND [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(ids.slice(offset, offset + 1000))])
      for (const row of rows) { const date = dateText(row.value); if (date) result.set(Number(row.id), date) }
    }
  } catch (error) {
    if (sqlErrorNumber(error) === 207) return new Map()
    throw error
  }
  return result
}

/** القيمة المبعوتة من الشاشة: undefined = ماتتغيرش، null أو فاضي = تتمسح، وإلا تاريخ صحيح مش في المستقبل */
export function normalizeGosiFirstRegistered(value: unknown, today: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || String(value).trim() === '') return null
  const text = String(value).trim()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
  if (!date || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('تاريخ أول تسجيل في التأمينات بصيغة YYYY-MM-DD صحيحة')
  }
  if (date > today) throw new BadRequestException('تاريخ أول تسجيل في التأمينات ماينفعش يكون في المستقبل')
  if (date < '1970-01-01') throw new BadRequestException('تاريخ أول تسجيل في التأمينات قديم جدًا')
  return date
}

/** حفظ التاريخ جوه معاملة الملف نفسها — بيكتب لو اتغير بس (فالفاضي على فاضي قبل الترحيل مابيلمسش القاعدة).
 *  بيرجّع القديم لسجل التغييرات، وتاريخ قبل ترحيل 080 = رسالة واضحة والحفظ كله بيرجع */
export async function saveGosiFirstRegistered(em: EntityManager, employeeId: number, value: string | null): Promise<{ changed: boolean; before: string | null }> {
  const before = (await readGosiFirstRegistered(em, [employeeId])).get(employeeId) ?? null
  if (before === value) return { changed: false, before }
  try {
    await em.query('UPDATE dbo.employees SET [gosiFirstRegisteredAt] = @0 WHERE [id] = @1', [value, employeeId])
  } catch (error) {
    if (sqlErrorNumber(error) === 207) throw new BadRequestException('خانة «تاريخ أول تسجيل في التأمينات» محتاجة ترحيل 080 على السيرفر الأول')
    throw error
  }
  return { changed: true, before }
}
