import type { EntityManager } from 'typeorm'
import type { Employee } from '../employees/employee.entity'

// فترة خدمة الموظف للحضور والورديات (قرار المالك 26 سبتمبر): من المباشرة الفعلية (أو التعيين) لحد آخر يوم عمل.
// آخر يوم عمل بييجي من ملف إنهاء الخدمة (أي حالة غير الملغي) — نفس أساس المسير في payroll-employment.ts —
// ولو مفيش ملف والموظف مؤرشف: تاريخ الأرشفة (السلوك القديم). كده الحضور ما يسجلش غياب بعد ما الموظف مشي
// (كان بيفضل «شغال» لحد ما الملف يتقفل ويتأرشف)، والإسناد الجماعي للورديات بيقف عند آخر يوم من غير ما يزعج حد.
export interface EmploymentWindow {
  from: string | null
  to: string | null
  toSource: 'OFFBOARDING' | 'ARCHIVE' | null
  // منتهية خدمته (terminated/archived) ومفيش تاريخ آخر يوم عمل ولا أرشفة موثّق — أغلب المرحّلين من النظام القديم.
  // الإسناد والعرض بيعاملوه كخارج الخدمة؛ حساب الحضور بيسيبه زي ما كان (مابنغيّرش تاريخ حد)
  endedUnknown?: boolean
}

type WindowEmployee = Pick<Employee, 'actualStartDate' | 'joinDate' | 'archivedAt'> & { status?: string | null }

// التاريخ المحلي YYYY-MM-DD (نفس localDateOf في خدمة الحضور — مكرر هنا عشان مانعملش استيراد دائري)
function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function dateOnly(value: unknown): string | null {
  if (value == null || value === '') return null
  const text = value instanceof Date ? localDate(value) : String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

export function employmentWindowOf(emp: WindowEmployee, lastWorkingDays?: string | null | Array<string | null>): EmploymentWindow {
  const from = dateOnly(emp.actualStartDate) ?? dateOnly(emp.joinDate)
  // ملف إنهاء قبل التعيين الحالي (إعادة تعيين) مايقفلش الخدمة الحالية — نفس فلتر المسير؛ ولو أكتر من ملف بعد التعيين
  // (حالة استثنائية المسير بيوقفها بسبب واضح) بناخد أبكر آخر يوم
  const end = (Array.isArray(lastWorkingDays) ? lastWorkingDays : [lastWorkingDays]).map(dateOnly)
    .filter((day): day is string => !!day && (!from || day >= from)).sort()[0]
  if (end) return { from, to: end, toSource: 'OFFBOARDING' }
  if (emp.archivedAt) {
    const archived = new Date(emp.archivedAt)
    if (Number.isFinite(archived.getTime())) return { from, to: localDate(archived), toSource: 'ARCHIVE' }
  }
  if (['terminated', 'archived'].includes(String(emp.status ?? ''))) return { from, to: null, toSource: null, endedUnknown: true }
  return { from, to: null, toSource: null }
}

export function inEmploymentWindow(window: EmploymentWindow, date: string): boolean {
  return (!window.from || date >= window.from) && (!window.to || date <= window.to)
}

// الإسناد (ورديات وجداول): يوم جوه فترة الخدمة، ومش لمنتهي خدمة من غير تاريخ موثّق
export function schedulableOn(window: EmploymentWindow, date: string): boolean {
  return !window.endedUnknown && inEmploymentWindow(window, date)
}

// هل فترة الخدمة بتلمس المدة [from, to]؟ (للإسناد والعرض — منتهي الخدمة من غير تاريخ مابيلمسش أي مدة)
export function employmentOverlaps(window: EmploymentWindow, from: string, to: string): boolean {
  if (window.endedUnknown) return false
  return (!window.from || window.from <= to) && (!window.to || window.to >= from)
}

// أيام «آخر يوم عمل» لكل موظف من ملفات إنهاء الخدمة غير الملغية — دفعات ألف (حد SQL Server 2100 باراميتر).
// الاختيار بينها (بعد تاريخ التعيين) في employmentWindowOf.
export async function lastWorkingDaysOf(em: EntityManager, employeeIds: number[]): Promise<Map<number, string[]>> {
  const ids = [...new Set(employeeIds.map(Number))].filter(id => Number.isSafeInteger(id) && id > 0)
  const result = new Map<number, string[]>()
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000)
    const rows: Array<{ employeeId: number; lastWorkingDay: string | null }> = await em.query(
      `SELECT [employeeId], CONVERT(varchar(10), [lastWorkingDay], 23) AS [lastWorkingDay]
         FROM [offboarding_cases]
        WHERE [status] <> 'CANCELLED' AND [employeeId] IN (${chunk.map((_, index) => `@${index}`).join(', ')})`,
      chunk,
    )
    for (const row of rows) {
      const day = dateOnly(row.lastWorkingDay)
      if (!day) continue
      const id = Number(row.employeeId)
      result.set(id, [...(result.get(id) ?? []), day])
    }
  }
  return result
}

// فترات الخدمة لمجموعة موظفين دفعة واحدة
export async function employmentWindowsOf(em: EntityManager, employees: Array<WindowEmployee & { id: number }>): Promise<Map<number, EmploymentWindow>> {
  const ends = await lastWorkingDaysOf(em, employees.map(emp => emp.id))
  return new Map(employees.map(emp => [emp.id, employmentWindowOf(emp, ends.get(emp.id) ?? [])]))
}
