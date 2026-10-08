'use client'

// B3.5-ج: «أرقام التوظيف» — مدة ملء الشاغر، مدة التعيين، العبور بين المراحل، نسبة قبول العروض، المصادر، والوظائف المفتوحة وعمرها
import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchRecruitmentMetrics, type ApiRecruitmentMetrics } from '@/lib/recruitment-jobs-api'

const days = (value: number | null) => (value === null ? '—' : `${value} يوم`)

export default function RecruitmentMetricsPage() {
  const [data, setData] = useState<ApiRecruitmentMetrics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecruitmentMetrics()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الأرقام'))
  }, [])

  const peak = Math.max(1, ...(data?.stages.map((row) => Math.max(row.current, row.entered)) ?? [1]))
  const cards = data
    ? [
        { label: 'مدة ملء الشاغر', value: days(data.timeToFill.averageDays), hint: `متوسط من إنشاء الوظيفة لأول عرض مقبول — ${data.timeToFill.jobs} وظيفة` },
        { label: 'مدة التعيين', value: days(data.timeToHire.averageDays), hint: `متوسط من تسجيل المرشح لقبول العرض — ${data.timeToHire.offers} عرض` },
        { label: 'نسبة قبول العروض', value: data.offers.acceptanceRate === null ? '—' : `${data.offers.acceptanceRate}%`, hint: `${data.offers.accepted} مقبول · ${data.offers.declined} مرفوض` },
        { label: 'الوظائف المفتوحة', value: String(data.openJobs.count), hint: `متوسط عمرها ${days(data.openJobs.averageAgeDays)}` },
      ]
    : []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-primary-600" />
            أرقام التوظيف
          </h1>
          <p className="text-gray-500 mt-1">من بيانات الدورة نفسها — بنطاق فروعك{data ? ` · ${data.candidates} مرشح` : ''}</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-metric-cards>
              {cards.map((card) => (
                <div key={card.label} className="card">
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2 tabular-nums">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-2">{card.hint}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card" data-stage-flow>
                <h2 className="text-lg font-bold text-gray-800 mb-1">العبور بين المراحل</h2>
                <p className="text-xs text-gray-500 mb-4">كام مرشح دخل كل مرحلة (من سجل النقل)، وكام واقف فيها دلوقتي</p>
                <div className="space-y-3">
                  {data.stages.map((row) => (
                    <div key={row.stage}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{row.label}</span>
                        <span className="text-gray-500 tabular-nums">
                          دخلها {row.entered} · فيها {row.current}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(Math.max(row.entered, row.current) / peak) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" data-sources>
                <h2 className="text-lg font-bold text-gray-800 mb-1">مصادر المرشحين</h2>
                <p className="text-xs text-gray-500 mb-4">المرشحين اللي على وظائف شاغرة، بمصدر كل واحد</p>
                {data.sources.length === 0 ? (
                  <p className="text-sm text-gray-500">مفيش مرشحين على وظائف شاغرة لسه.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {data.sources.map((row) => (
                        <tr key={row.source}>
                          <td className="py-2 text-gray-700">{row.source}</td>
                          <td className="py-2 text-left text-gray-800 tabular-nums">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
