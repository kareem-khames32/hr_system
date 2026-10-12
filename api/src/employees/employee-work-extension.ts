import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B-ADD.8 (ترحيل 188): «رقم التحويلة / رقم العمل» على الموظف — أرقام بس ومابيتكررش (كلمة المالك 12 أكتوبر 2026)، وهو اللي
// «الاتصال الداخلي» هيتعمل عليه بعدين. بيتقرا ويتكتب بـSQL صريح بس (العمود برّه الكيان، زي تاريخ أول تسجيل في التأمينات)،
// فقبل الترحيل القراءة بترجع فاضي وكتابة رقم بتقول إن الترحيل لازم يتطبق الأول.

export const WORK_EXTENSION_MAX = 10

const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown }; originalError?: { info?: { number?: unknown } } }
  const number = value?.driverError?.number ?? value?.number ?? value?.originalError?.info?.number
  return typeof number === 'number' ? number : undefined
}
// الأرقام العربية والفارسية بتتحوّل لأرقام عادية قبل الفحص — اللي بيكتب من كيبورد عربي مايترفضش
const asciiDigits = (text: string) => text.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))

/** القيمة المبعوتة من الشاشة: undefined = ماتتغيرش، null أو فاضي = تتمسح، وإلا أرقام بس لحد 10 خانات (الصفر في الأول بيتحفظ) */
export function normalizeWorkExtension(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string' && typeof value !== 'number') throw new BadRequestException('رقم التحويلة أرقام بس')
  if (String(value).trim() === '') return null
  const text = asciiDigits(String(value).trim())
  if (!new RegExp(`^\\d{1,${WORK_EXTENSION_MAX}}$`).test(text)) throw new BadRequestException(`رقم التحويلة أرقام بس (لحد ${WORK_EXTENSION_MAX} خانات)`)
  return text
}

/** رقم التحويلة لكل موظف من القايمة (الناقص = فاضي). قبل ترحيل 188 = خريطة فاضية */
export async function readWorkExtensions(em: EntityManager, employeeIds: readonly number[]): Promise<Map<number, string>> {
  const ids = [...new Set(employeeIds.filter(id => Number.isSafeInteger(id) && id > 0))]
  const result = new Map<number, string>()
  if (!ids.length) return result
  try {
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const rows: Array<{ id: number; value: string }> = await em.query(
        `SELECT [id], [workExtension] AS [value] FROM dbo.employees
         WHERE [workExtension] IS NOT NULL AND [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(ids.slice(offset, offset + 1000))])
      for (const row of rows) result.set(Number(row.id), String(row.value))
    }
  } catch (error) {
    if (sqlErrorNumber(error) === 207) return new Map()
    throw error
  }
  return result
}

/** حفظ الرقم جوه معاملة الملف نفسها (بعد قفل هويات الموظفين) — بيكتب لو اتغير بس. الرقم المستخدم عند موظف تاني بيترفض،
 *  وwhose بتقول اسم صاحبه لو في نطاق اللي بيحفظ. الفهرس الفريد (ترحيل 188) هو الحارس الأخير تحت التزامن */
export async function saveWorkExtension(em: EntityManager, employeeId: number, value: string | null,
  whose: (holder: { fullName: string; branchId: number }) => string): Promise<{ changed: boolean; before: string | null }> {
  const before = (await readWorkExtensions(em, [employeeId])).get(employeeId) ?? null
  if (before === value) return { changed: false, before }
  const taken = () => new ConflictException(`رقم التحويلة ${value} مستخدم بالفعل — لا يتكرر`)
  try {
    if (value !== null) {
      const holders: Array<{ fullName: string; branchId: number }> = await em.query(
        'SELECT TOP 1 [fullName], [branchId] FROM dbo.employees WHERE [workExtension] = @0 AND [id] <> @1', [value, employeeId])
      if (holders.length) throw new ConflictException(`رقم التحويلة ${value} مستخدم بالفعل${whose(holders[0])} — لا يتكرر`)
    }
    await em.query('UPDATE dbo.employees SET [workExtension] = @0 WHERE [id] = @1', [value, employeeId])
  } catch (error) {
    const number = sqlErrorNumber(error)
    if (number === 207) throw new BadRequestException('خانة «رقم التحويلة» محتاجة ترحيل 188 على السيرفر الأول')
    if (number === 2601 || number === 2627) throw taken()
    throw error
  }
  return { changed: true, before }
}
