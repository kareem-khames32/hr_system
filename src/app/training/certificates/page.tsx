'use client'

// B3.9: «الشهادات» (لإدارة التدريب) — شهادات التدريب اللي اتسجّلت للموظفين بتاريخ انتهائها، الأقرب انتهاءً الأول. الشهادة مستند في ملف الموظف،
// وتنبيه تجديدها من إعدادات أنواع المستندات. (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { fetchTrainingCertificates, type ApiTrainingCertificate } from '@/lib/training-api'

export default function TrainingCertificatesPage() {
  const [rows, setRows] = useState<ApiTrainingCertificate[] | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTrainingCertificates()
      .then((data) => { setRows(data.certificates); setNotice(data.available ? '' : data.message ?? '') })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الشهادات'))
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Award size={24} className="text-primary-600" />
            الشهادات
          </h1>
          <p className="text-gray-500 mt-1">شهادات التدريب المسجّلة للموظفين بتاريخ انتهائها — تنبيه التجديد من إعدادات أنواع المستندات</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {rows && !notice && rows.length === 0 && <EmptyState title="مفيش شهادات تدريب مسجّلة لسه" icon={Award} />}
        {rows && rows.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm" data-certificates>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الموظف</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الدورة</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الإصدار</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الانتهاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.enrollmentId}>
                    <td className="px-3 py-2 text-gray-800">{row.employeeName}</td>
                    <td className="px-3 py-2 text-gray-600">{row.courseName}</td>
                    <td className="px-3 py-2 tabular-nums">{row.issueDate ? formatDate(row.issueDate) : '—'}</td>
                    <td className={`px-3 py-2 tabular-nums ${row.expired ? 'text-red-600 font-medium' : ''}`}>
                      {row.expiryDate ? `${formatDate(row.expiryDate)}${row.expired ? ' — منتهية' : ''}` : 'من غير انتهاء'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
