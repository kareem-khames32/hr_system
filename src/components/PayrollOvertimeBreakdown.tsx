import type { ApiPayrollItem } from '@/lib/api'
// الخطوة 22 (B5): منسّق المبالغ الموحد (أرقام لاتينية بفواصل الآلاف) بدل الأرقام المخلوطة
import { formatMoney, formatRate } from '../lib/money'

interface SavedOvertime {
  id: number; date: string; approvedMinutes: number; hours: number; multiplier: number; hourlyRate: number; amount: number
  provenance: 'APPROVAL_SNAPSHOT' | 'LEGACY'; dayKind: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | null
  originalPeriod: string; retroactive: boolean
}

// يُقرأ التفصيل من بند المسير نفسه، دون إعادة تسعير من راتب الموظف الحالي.
function savedOvertime(item: ApiPayrollItem): SavedOvertime[] | null {
  try {
    const rows: unknown = JSON.parse(item.breakdown || '{}').overtime
    if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row.id !== 'number' || typeof row.date !== 'string' ||
      !['APPROVAL_SNAPSHOT', 'LEGACY'].includes(row.provenance) ||
      !['approvedMinutes', 'hours', 'multiplier', 'hourlyRate', 'amount'].every(key => typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0))) return null
    if (new Set(rows.map(row => row.id)).size !== rows.length) return null
    const total = rows.reduce((sum, row) => sum + row.amount, 0)
    if (Math.abs(total - Number(item.overtimeAmount)) > 0.011) return null
    return rows
  } catch { return null }
}

export function PayrollOvertimeBreakdown({ item, currency, compact = false }: { item: ApiPayrollItem; currency: string; compact?: boolean }) {
  const rows = savedOvertime(item)
  if (!rows) return Number(item.overtimeAmount) > 0 ? <p className="text-xs text-gray-500 my-2">القيمة الإجمالية محفوظة؛ لا يوجد تفصيل تاريخي موثّق لأنواع الأيام في هذا البند.</p> : null
  const dayNames = { WEEKDAY: 'عمل', WEEKEND: 'راحة أسبوعية', HOLIDAY: 'عطلة رسمية' }
  const contents = <div className="overflow-x-auto">
    <table className="w-full text-sm text-right">
      <thead><tr className="bg-gray-50 text-gray-600"><th className="p-2">يوم العمل</th><th className="p-2">نوع اليوم</th><th className="p-2">الساعات المعتمدة</th><th className="p-2">أجر الساعة</th><th className="p-2">المضاعف</th><th className="p-2">القيمة ({currency})</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} className="border-t border-gray-100 align-top">
        <td className="p-2 whitespace-nowrap">{row.date}{row.retroactive && <p className="text-xs text-amber-700">بأثر رجعي عن {row.originalPeriod}</p>}</td>
        <td className="p-2">{row.dayKind ? dayNames[row.dayKind] ?? 'غير موثق' : 'غير موثق تاريخيًا'}</td>
        <td className="p-2">{Math.floor(row.approvedMinutes / 60)} س {row.approvedMinutes % 60} د</td>
        <td className="p-2">{formatRate(row.hourlyRate)}</td>
        <td className="p-2">×{row.multiplier}</td><td className="p-2 font-semibold text-success-700">{formatMoney(row.amount)}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-xs text-gray-500 mt-2">{rows.some(row => row.provenance === 'LEGACY') ? 'يتضمن سجلات سابقة محفوظة وقت حساب المسير.' : 'الساعات وأجر الساعة والمضاعف والقيمة مثبّتة عند اكتمال اعتماد الإضافي.'}</p>
  </div>
  return compact ? <details className="text-right font-sans mt-2 min-w-40"><summary className="text-xs text-primary-700 cursor-pointer">تفاصيل الإضافي</summary><div className="min-w-[560px] rounded-lg border p-3 my-2">{contents}</div></details> : <section className="border border-gray-200 rounded-xl p-4 mb-6 break-inside-avoid"><h3 className="font-bold text-gray-800 mb-3">تفصيل العمل الإضافي</h3>{contents}</section>
}
