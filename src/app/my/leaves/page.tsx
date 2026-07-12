'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  Calendar,
  ClipboardList,
  Layers,
  Plus,
  Stethoscope,
  Wallet,
  Zap,
} from 'lucide-react'
import {
  statusLabels,
  statusStyles,
  type RequestStatus,
} from '@/data/requestsCatalog'
import {
  fetchMyBalances,
  fetchMyRequests,
  fetchRequestTypes,
  type ApiBalance,
  type ApiRequest,
  type ApiRequestType,
} from '@/lib/api'

// أنواع الأرصدة كما يرجعها السيرفر
const balanceTypeConfig: Record<
  string,
  { label: string; icon: typeof Calendar; iconBg: string; iconColor: string }
> = {
  annual: { label: 'السنوية', icon: Calendar, iconBg: 'bg-primary-50', iconColor: 'text-primary-500' },
  sick: { label: 'المرضية', icon: Stethoscope, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  casual: { label: 'الطارئة', icon: Zap, iconBg: 'bg-warning-50', iconColor: 'text-warning-500' },
  unpaid: { label: 'بدون راتب', icon: Wallet, iconBg: 'bg-gray-100', iconColor: 'text-gray-500' },
}

// أكواد أنواع الإجازة → عربي — طلب الإجازة الموحّد (LEAVE) يحمل النوع في الـ payload
const leaveTypeLabels: Record<string, string> = {
  ANNUAL: 'إجازة سنوية',
  SICK: 'إجازة مرضية',
  CASUAL: 'إجازة عارضة',
  UNPAID: 'إجازة بدون راتب',
  MATERNITY: 'إجازة وضع',
  PATERNITY: 'إجازة أبوة',
  HAJJ: 'إجازة حج',
  MARRIAGE: 'إجازة زواج',
  BEREAVEMENT: 'إجازة وفاة/عدة',
  EXAM: 'إجازة امتحانات',
  COMPENSATORY: 'إجازة تعويضية',
}

const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export default function MyLeavesPage() {
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [leaveRequests, setLeaveRequests] = useState<ApiRequest[]>([])
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [bals, mine, typeList] = await Promise.all([
          fetchMyBalances(),
          fetchMyRequests(),
          fetchRequestTypes(),
        ])
        setBalances(bals)
        // طلبات الإجازة فقط من طلباتي — النوع الموحّد LEAVE + الأنواع القديمة LEAVE_*
        setLeaveRequests(
          mine.filter((r) => r.typeCode === 'LEAVE' || r.typeCode.startsWith('LEAVE_'))
        )
        setTypes(typeList)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل أرصدتك')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const typeNameOf = (code: string) =>
    types.find((t) => t.code === code)?.nameAr ?? 'إجازة'

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إجازاتي وأرصدتي</h1>
            <p className="text-gray-500 mt-1">
              رصيدك بطبقاته: المُرحّل بصلاحيته + استحقاق السنة − المستهلك (محسوب من السيرفر)
            </p>
          </div>
          <Link href="/leaves/request" className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            طلب إجازة
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Balance layer cards */}
            <div className="grid grid-cols-2 gap-4">
              {balances.length === 0 && (
                <div className="card p-8 text-center col-span-2">
                  <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">لا توجد أرصدة إجازات لحسابك</p>
                </div>
              )}
              {balances.map((b) => {
                const cfg =
                  balanceTypeConfig[b.balanceType.toLowerCase()] ?? {
                    label: b.balanceType,
                    icon: Calendar,
                    iconBg: 'bg-gray-100',
                    iconColor: 'text-gray-500',
                  }
                const TypeIcon = cfg.icon
                const remaining = Number(b.remaining)
                const openingAvailable = Number(b.opening.available)
                const hasOpening = Number(b.opening.days) > 0
                return (
                  <div key={b.balanceType} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${cfg.iconBg} rounded-2xl flex items-center justify-center`}>
                          <TypeIcon size={24} className={cfg.iconColor} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">إجازة {cfg.label}</h3>
                          <p className="text-xs text-gray-400">فترة {b.period}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-3xl font-bold ${remaining < 5 ? 'text-red-600' : 'text-success-600'}`}>
                          {remaining}
                        </p>
                        <p className="text-xs text-gray-400">يوم متبقٍ</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <p className="text-lg font-bold text-blue-700">{Number(b.entitled)}</p>
                        <p className="text-xs text-blue-600">مستحق السنة</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-xl">
                        <p className="text-lg font-bold text-red-700">{Number(b.totalTaken)}</p>
                        <p className="text-xs text-red-600">مستهلك</p>
                      </div>
                      <div className="p-3 bg-success-50 rounded-xl">
                        <p className="text-lg font-bold text-success-700">{remaining}</p>
                        <p className="text-xs text-success-600">متبقٍ</p>
                      </div>
                    </div>

                    {/* طبقة الرصيد المُرحّل وصلاحيتها */}
                    {hasOpening && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                        <Layers size={18} className="text-purple-500 shrink-0" />
                        <div className="text-xs text-purple-700">
                          <span className="font-bold">
                            طبقة مُرحّلة: {openingAvailable} يوم ساري
                          </span>{' '}
                          (أصلها {Number(b.opening.days)} − استهلك {Number(b.opening.taken)})
                          {' — '}
                          {b.opening.expired ? (
                            <span className="text-red-600 font-medium">سقطت بانتهاء صلاحيتها</span>
                          ) : b.opening.expiry ? (
                            <span>صالحة حتى {b.opening.expiry}</span>
                          ) : (
                            <span>بدون تاريخ انتهاء</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* My leave requests */}
            <div className="card overflow-hidden p-0">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">طلبات إجازاتي</h2>
                <span className="text-sm text-gray-400">{leaveRequests.length} طلب</span>
              </div>
              {leaveRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لم تقدّم طلبات إجازة بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-right px-4 py-3">النوع</th>
                        <th className="text-center px-4 py-3">من</th>
                        <th className="text-center px-4 py-3">إلى</th>
                        <th className="text-center px-4 py-3">الأيام</th>
                        <th className="text-center px-4 py-3">تاريخ التقديم</th>
                        <th className="text-center px-4 py-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((r) => {
                        const payload = parseJson<Record<string, unknown>>(r.payload, {})
                        const status = r.status as RequestStatus
                        // النوع الموحّد يحمل نوع الإجازة في الـ payload — نعرضه بدل الاسم العام
                        const leaveCode =
                          typeof payload.leaveType === 'string' ? payload.leaveType : ''
                        const typeName =
                          leaveTypeLabels[leaveCode] ?? typeNameOf(r.typeCode)
                        return (
                          <tr key={r.id} className="table-row">
                            <td className="table-cell">
                              <p className="font-medium text-gray-800 text-sm">
                                {typeName}
                              </p>
                              <p className="text-xs text-gray-400" dir="ltr">
                                REQ-{r.id}
                              </p>
                            </td>
                            <td className="table-cell text-center font-mono text-sm text-gray-600" dir="ltr">
                              {String(payload.fromDate ?? '—')}
                            </td>
                            <td className="table-cell text-center font-mono text-sm text-gray-600" dir="ltr">
                              {String(payload.toDate ?? '—')}
                            </td>
                            <td className="table-cell text-center font-bold text-gray-700">
                              {payload.days != null ? String(payload.days) : '—'}
                            </td>
                            <td className="table-cell text-center text-sm text-gray-500" dir="ltr">
                              {(r.submittedAt ?? r.createdAt).slice(0, 10)}
                            </td>
                            <td className="table-cell text-center">
                              <span className={`badge text-xs ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[status] ?? r.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
