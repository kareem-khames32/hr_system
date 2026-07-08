'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, FileText, FolderOpen } from 'lucide-react'
import { fetchDocuments, type ApiDocument } from '@/lib/api'

// حالة المستند حسب تاريخ الانتهاء
type DocStatus = 'valid' | 'expiring' | 'expired' | 'none'

const statusLabels: Record<DocStatus, string> = {
  valid: 'ساري',
  expiring: 'قارب على الانتهاء',
  expired: 'منتهي',
  none: 'بلا تاريخ انتهاء',
}

const statusColors: Record<DocStatus, string> = {
  valid: 'bg-success-50 text-success-700',
  expiring: 'bg-warning-50 text-warning-700',
  expired: 'bg-red-100 text-red-700',
  none: 'bg-gray-100 text-gray-500',
}

const EXPIRING_DAYS = 60

const statusOf = (d: ApiDocument): DocStatus => {
  const expiry = d.expiryDate ? String(d.expiryDate).slice(0, 10) : ''
  if (!expiry) return 'none'
  const today = new Date().toISOString().slice(0, 10)
  if (d.expired ?? expiry < today) return 'expired'
  const limit = new Date(Date.now() + EXPIRING_DAYS * 86400000).toISOString().slice(0, 10)
  return expiry <= limit ? 'expiring' : 'valid'
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // الباك إند يقصر النتائج على مستندات الموظف نفسه تلقائياً
    fetchDocuments()
      .then(setDocuments)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل مستنداتك'))
      .finally(() => setLoading(false))
  }, [])

  const expiredCount = documents.filter((d) => statusOf(d) === 'expired').length
  const expiringCount = documents.filter((d) => statusOf(d) === 'expiring').length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مستنداتي</h1>
            <p className="text-gray-500 mt-1">
              مستنداتك الرسمية المسجلة في ملفك وتواريخ انتهائها
            </p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* تنبيه الانتهاء */}
        {(expiredCount > 0 || expiringCount > 0) && (
          <div className="bg-warning-50 border border-warning-200 text-warning-700 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-medium">
              {expiredCount > 0 && `لديك ${expiredCount} مستند منتهي`}
              {expiredCount > 0 && expiringCount > 0 && ' و'}
              {expiringCount > 0 && `${expiringCount} مستند يقارب على الانتهاء`}
              {' — بادر بتجديدها لدى الموارد البشرية'}
            </p>
          </div>
        )}

        {/* Documents Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            {documents.length === 0 ? (
              <div className="p-12 text-center">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد مستندات مسجلة في ملفك</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-right px-4 py-3">المستند</th>
                      <th className="text-right px-4 py-3">الرقم</th>
                      <th className="text-center px-4 py-3">تاريخ الإصدار</th>
                      <th className="text-center px-4 py-3">تاريخ الانتهاء</th>
                      <th className="text-center px-4 py-3">الحالة</th>
                      <th className="text-right px-4 py-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => {
                      const status = statusOf(d)
                      return (
                        <tr key={d.id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <FileText size={20} className="text-blue-500" />
                              </div>
                              <p className="font-medium text-gray-800 text-sm">{d.docType}</p>
                            </div>
                          </td>
                          <td className="table-cell text-sm font-mono text-gray-600" dir="ltr">
                            {d.number ?? '—'}
                          </td>
                          <td className="table-cell text-center text-sm text-gray-600" dir="ltr">
                            {fmtDate(d.issueDate)}
                          </td>
                          <td className="table-cell text-center text-sm text-gray-600" dir="ltr">
                            {fmtDate(d.expiryDate)}
                          </td>
                          <td className="table-cell text-center">
                            <span className={`badge text-xs ${statusColors[status]}`}>
                              {statusLabels[status]}
                            </span>
                          </td>
                          <td className="table-cell text-sm text-gray-500 max-w-[220px]">
                            {d.notes ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
