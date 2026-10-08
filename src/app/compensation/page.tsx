'use client'

// B5.1 (أ): «سلّم الرواتب» — نطاق كل درجة (أدنى، منتصف، أقصى) ونسبة المقارنة لكل موظف (راتبه ÷ منتصف نطاق درجته). قراءة بس.
// النطاق من «الإعدادات ← الدرجات الوظيفية»، وأساس المقارنة (الأساسي أو الإجمالي) من سياسات النظام.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Scale } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatMoney } from '@/lib/money'
import { fetchSalaryBands, type ApiBandEmployee, type ApiSalaryBands, type BandPosition } from '@/lib/compensation-api'

const POSITION_CLASS: Record<BandPosition, string> = { BELOW: 'text-amber-700', WITHIN: 'text-gray-700', ABOVE: 'text-red-700' }
type Filter = 'ALL' | 'OUT' | 'NO_GRADE'

export default function CompensationPage() {
  const [data, setData] = useState<ApiSalaryBands | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [gradeId, setGradeId] = useState('')

  const load = useCallback(() => {
    fetchSalaryBands().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل سلّم الرواتب'))
  }, [])
  useEffect(load, [load])

  const shown = useMemo(() => {
    const matches = (row: ApiBandEmployee) => (gradeId === '' || String(row.gradeId ?? '') === gradeId)
      && (filter === 'ALL' || (filter === 'OUT' ? row.position === 'BELOW' || row.position === 'ABOVE' : row.gradeId === null))
    return (data?.employees ?? []).filter(matches)
  }, [data, filter, gradeId])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Scale size={24} className="text-primary-600" />
            سلّم الرواتب والزيادات
          </h1>
          <p className="text-gray-500 mt-1">
            نطاق راتب كل درجة ونسبة المقارنة لكل موظف (راتبه ÷ منتصف نطاق درجته){data ? ` — على ${data.basisLabel}` : ''}. النطاقات بتتعدّل من{' '}
            <Link href="/settings/grades" className="text-primary-600 hover:underline">الدرجات الوظيفية</Link>.
          </p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {data && (
          <>
            <div className="card overflow-x-auto" data-salary-bands>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الدرجة</th>
                    <th className="table-header text-center">الأدنى</th>
                    <th className="table-header text-center">المنتصف</th>
                    <th className="table-header text-center">الأقصى</th>
                    <th className="table-header text-center">الموظفين</th>
                    <th className="table-header text-center">تحت الأدنى</th>
                    <th className="table-header text-center">فوق الأقصى</th>
                  </tr>
                </thead>
                <tbody>
                  {data.grades.map((grade) => (
                    <tr key={grade.id} className={`border-t border-gray-100 ${grade.isActive ? '' : 'text-gray-400'}`}>
                      <td className="table-cell">{grade.name}</td>
                      {grade.band ? (
                        <>
                          <td className="table-cell text-center font-mono">{formatMoney(grade.band.min)}</td>
                          <td className="table-cell text-center font-mono font-bold">{formatMoney(grade.band.mid)}</td>
                          <td className="table-cell text-center font-mono">{formatMoney(grade.band.max)}</td>
                        </>
                      ) : (
                        <td className="table-cell text-center text-gray-400" colSpan={3}>من غير نطاق — حدد الأدنى والأقصى في الدرجات الوظيفية</td>
                      )}
                      <td className="table-cell text-center font-mono">{grade.headcount}</td>
                      <td className="table-cell text-center font-mono text-amber-700">{grade.below || '—'}</td>
                      <td className="table-cell text-center font-mono text-red-700">{grade.above || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.grades.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش درجات وظيفية متسجّلة.</p>}
            </div>

            <div className="card space-y-3" data-band-employees>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">الموظفين ({shown.length})</h2>
                <select className="input" value={gradeId} onChange={(event) => setGradeId(event.target.value)} aria-label="الدرجة">
                  <option value="">كل الدرجات</option>
                  {data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                </select>
                <select className="input" value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="الموقع من النطاق">
                  <option value="ALL">الكل</option>
                  <option value="OUT">برّه النطاق</option>
                  <option value="NO_GRADE">من غير درجة ({data.withoutGrade})</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الموظف</th>
                      <th className="table-header text-right">الدرجة</th>
                      <th className="table-header text-center">{data.basisLabel}</th>
                      <th className="table-header text-center">نسبة المقارنة</th>
                      <th className="table-header text-center">الموقع من النطاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr key={row.employeeId} className="border-t border-gray-100">
                        <td className="table-cell">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                        <td className="table-cell">{row.gradeName ?? '—'}</td>
                        <td className="table-cell text-center font-mono">{formatMoney(row.salary)}</td>
                        <td className="table-cell text-center font-mono">{row.compaRatio === null ? '—' : row.compaRatio.toFixed(2)}</td>
                        <td className={`table-cell text-center ${row.position ? POSITION_CLASS[row.position] : 'text-gray-400'}`}>{row.positionLabel ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shown.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش موظفين بالفلتر ده.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
