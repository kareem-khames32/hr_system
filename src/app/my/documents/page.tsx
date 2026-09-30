'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, XCircle } from 'lucide-react'
import { docTypeLabel } from '@/lib/doc-types'
import { localToday } from '@/lib/dates'
import { getCurrentUser, fetchDocuments, type ApiDocument } from '@/lib/api'
import { fetchMyHiringDocuments, type MyHiringDocuments } from '@/lib/hiring-documents-api'

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
  const today = localToday()
  if (d.expired ?? expiry < today) return 'expired'
  const limit = new Date(Date.now() + EXPIRING_DAYS * 86400000).toISOString().slice(0, 10)
  return expiry <= limit ? 'expiring' : 'valid'
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [hiring, setHiring] = useState<MyHiringDocuments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hiringError, setHiringError] = useState('')

  useEffect(() => {
    const employeeId = getCurrentUser()?.employeeId
    if (!employeeId) { setError('الحساب غير مرتبط بموظف؛ لا تتوفر مستندات شخصية.'); setLoading(false); return }
    fetchDocuments({ employeeId })
      .then(setDocuments)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل مستنداتك'))
      .finally(() => setLoading(false))
    // مسوغات التعيين المطلوبة منك — فشلها مايخبّيش مستنداتك
    fetchMyHiringDocuments()
      .then(setHiring)
      .catch((e) => setHiringError(e instanceof Error ? e.message : 'تعذر تحميل مسوغات التعيين المطلوبة منك'))
  }, [])

  const expiredCount = documents.filter((d) => statusOf(d) === 'expired').length
  const expiringCount = documents.filter((d) => statusOf(d) === 'expiring').length
  const required = hiring?.documents ?? []

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مستنداتي</h1>
          <p className="text-gray-500 mt-1">
            مستنداتك الرسمية المسجلة في ملفك وتواريخ انتهائها
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* مسوغات التعيين المطلوبة منك — كل نوع معلَّم «مطلوب للتعيين» وهل مرفوع على ملفك */}
        {hiringError && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">{hiringError}</div>}
        {required.length > 0 && (
          <div className="card p-4 sm:p-6 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="font-bold text-gray-800">مسوغات التعيين المطلوبة منك</h2>
              <span className={`badge text-xs ${hiring!.missingCount ? 'badge-danger' : 'badge-success'}`}>
                {hiring!.missingCount ? `ناقص ${hiring!.missingCount} من ${required.length}` : 'كاملة ✓'}
              </span>
            </div>
            {hiring!.missingCount > 0 && (
              <p className="text-sm text-gray-500">
                سلّم المستندات الناقصة للموارد البشرية عشان تترفع على ملفك
              </p>
            )}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {required.map((doc) => (
                <li
                  key={doc.code}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    doc.present ? 'border-success-100 bg-success-50/50' : 'border-red-100 bg-red-50/50'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-800 min-w-0 break-words">{doc.nameAr}</span>
                  {doc.present ? (
                    <span className="flex items-center gap-1 text-sm text-success-700 shrink-0">
                      <CheckCircle2 size={16} />
                      ✓
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-red-600 shrink-0">
                      <XCircle size={16} />
                      ناقص
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* تنبيه الانتهاء */}
        {(expiredCount > 0 || expiringCount > 0) && (
          <div className="bg-warning-50 border border-warning-200 text-warning-700 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">
              {expiredCount > 0 && `لديك ${expiredCount} مستند منتهي`}
              {expiredCount > 0 && expiringCount > 0 && ' و'}
              {expiringCount > 0 && `${expiringCount} مستند يقارب على الانتهاء`}
              {' — بادر بتجديدها لدى الموارد البشرية'}
            </p>
          </div>
        )}

        {/* Documents */}
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
              <>
                {/* الموبايل: كارت لكل مستند بدل الجدول العريض */}
                <ul className="sm:hidden divide-y divide-gray-100">
                  {documents.map((d) => {
                    const status = statusOf(d)
                    return (
                      <li key={d.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={18} className="text-blue-500 shrink-0" />
                            <p className="font-medium text-gray-800 text-sm break-words">{docTypeLabel(d.docType)}</p>
                          </div>
                          <span className={`badge text-xs shrink-0 ${statusColors[status]}`}>{statusLabels[status]}</span>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <dt className="text-gray-400">الرقم</dt>
                          <dd className="text-gray-700 font-mono break-all" dir="ltr">{d.number ?? '—'}</dd>
                          <dt className="text-gray-400">تاريخ الإصدار</dt>
                          <dd className="text-gray-700" dir="ltr">{fmtDate(d.issueDate)}</dd>
                          <dt className="text-gray-400">تاريخ الانتهاء</dt>
                          <dd className="text-gray-700" dir="ltr">{fmtDate(d.expiryDate)}</dd>
                        </dl>
                        {d.notes && <p className="text-xs text-gray-500 break-words">{d.notes}</p>}
                      </li>
                    )
                  })}
                </ul>
                <div className="hidden sm:block overflow-x-auto">
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
                                <p className="font-medium text-gray-800 text-sm">{docTypeLabel(d.docType)}</p>
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
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
