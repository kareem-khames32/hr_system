'use client'

// لوحة الموظف — كل بياناتها من السيرفر لصاحب الحساب: حضور اليوم ووردية اليوم
// (GET /attendance/my-today)، وطلباتي (/requests/mine)، وأرصدتي، وعهدي. كانت كلها
// مكتوبة في الكود («صباح الخير، أحمد» ووردية 10-7 وطلبات REQ-1042 وهمية لأي أحد)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileText,
  Fingerprint,
  Layers,
  Package,
  UserX,
  Wallet,
} from 'lucide-react'
import {
  fetchMyBalances,
  fetchMyCustody,
  fetchMyRequests,
  fetchMyToday,
  fetchRequestTypes,
  getCurrentUser,
  type ApiBalance,
  type ApiCustody,
  type ApiMyToday,
  type ApiRequest,
  type ApiRequestType,
  type CurrentUser,
} from '@/lib/api'
import {
  getTypeByCode,
  statusLabels,
  statusStyles,
  type RequestStatus,
} from '@/data/requestsCatalog'

// حالة يوم الحضور كما يحسبها السيرفر
const dayStatusLabels: Record<string, string> = {
  present: 'حاضر',
  late: 'متأخر',
  early_leave: 'خروج مبكر',
  absent: 'غائب',
  leave: 'في إجازة',
  partial_leave: 'إجازة جزئية',
  holiday: 'عطلة',
  mission: 'مأمورية',
  remote: 'عمل عن بُعد',
  missing_punch: 'بصمة ناقصة',
}

// أنواع الأرصدة كما يرجعها السيرفر (تسميات «إجازاتي وأرصدتي» نفسها)
const balanceTypeConfig: Record<string, { label: string; color: string }> = {
  annual: { label: 'السنوية', color: 'bg-primary-500' },
  sick: { label: 'المرضية', color: 'bg-red-400' },
  casual: { label: 'الطارئة', color: 'bg-warning-400' },
  unpaid: { label: 'بدون راتب', color: 'bg-gray-400' },
}

// العهد الجارية فقط — المُرجَعة/المنقولة/المشطوبة سجل تاريخي في «عهدي»
const custodyStatusLabels: Record<string, string> = {
  PENDING_ACK: 'بانتظار تأكيدك',
  PENDING_MANAGER_CONFIRM: 'بانتظار اعتماد المدير المباشر',
  ACTIVE: 'عهدة نشطة',
  RETURN_REQUESTED: 'بانتظار تأكيد الاستلام',
}

const custodyStatusStyles: Record<string, string> = {
  PENDING_ACK: 'bg-amber-100 text-amber-700',
  PENDING_MANAGER_CONFIRM: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-success-50 text-success-700',
  RETURN_REQUESTED: 'bg-indigo-100 text-indigo-700',
}

const halfDayLabels: Record<string, string> = { MORNING: 'صباحية', EVENING: 'مسائية' }

// HH:mm → 12 ساعة (09:52 → 9:52 ص)
const to12h = (hhmm?: string | null): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '')
  if (!m) return hhmm ?? ''
  const h = Number(m[1])
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'ص' : 'م'}`
}

interface ActionItem {
  id: string
  title: string
  description?: string
  icon: typeof Package
  color: string
  cta: string
  href: string
}

export default function EmployeeHome() {
  // اللوحة لا تُرسم إلا على العميل بعد التركيب (الصفحة تنتظر قراءة الجلسة)
  const [user] = useState<CurrentUser | null>(() => getCurrentUser())
  const [today, setToday] = useState<ApiMyToday | null>(null)
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [custody, setCustody] = useState<ApiCustody[]>([])
  const [loading, setLoading] = useState(true)
  // ويدجتات تعذر تحميلها — فشل نداء لا يُسقط اللوحة كلها
  const [failed, setFailed] = useState<string[]>([])

  useEffect(() => {
    if (!getCurrentUser()?.employeeId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const errs: string[] = []
    const soft = <T,>(p: Promise<T>, fallback: T, label?: string) =>
      p.catch(() => {
        if (label) errs.push(label)
        return fallback
      })
    Promise.all([
      soft(fetchMyToday(), null, 'حضور اليوم'),
      soft(fetchMyRequests(), [] as ApiRequest[], 'طلباتي'),
      // أسماء الأنواع: فشلها لا يُذكر — الاسم من الكتالوج احتياطاً
      soft(fetchRequestTypes(), [] as ApiRequestType[]),
      soft(fetchMyBalances(), [] as ApiBalance[], 'أرصدة الإجازات'),
      soft(fetchMyCustody(), [] as ApiCustody[], 'العهد'),
    ]).then(([myToday, mine, typeList, bals, myCustody]) => {
      if (cancelled) return
      setToday(myToday)
      setRequests(mine)
      setTypes(typeList)
      setBalances(bals)
      setCustody(myCustody)
      setFailed(errs)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'
  const day = today?.day ?? null
  const fullDayLeave = today?.leave?.period === 'FULL'
  const halfDayLeave =
    today?.leave && !fullDayLeave ? halfDayLabels[today.leave.period] : null

  // سطر الوردية: صف اليوم المحسوب إن وُجد، وإلا جدول اليوم (حتى قبل أول بصمة)
  let shiftLine: string | null = null
  if (today) {
    if (fullDayLeave) shiftLine = 'أنت في إجازة معتمدة اليوم'
    else if (day?.unscheduled || (!day && today.workingDay && !today.shift))
      shiftLine = 'لا توجد وردية مُسندة لك اليوم — راجع الموارد البشرية'
    else if (day)
      shiftLine = `ورديتك اليوم: ${day.shiftName} (${to12h(day.shiftStart)} — ${to12h(day.shiftEnd)})`
    else if (!today.workingDay) shiftLine = 'اليوم عطلة — لا دوام مجدول لك'
    else if (today.shift)
      shiftLine = `ورديتك اليوم: ${today.shift.name} (${to12h(today.shift.start)} — ${to12h(today.shift.end)})`
    if (halfDayLeave && shiftLine) shiftLine += ` — إجازة نصف يوم ${halfDayLeave}`
  }

  const typeNameOf = (code: string) =>
    types.find((t) => t.code === code)?.nameAr ?? getTypeByCode(code)?.nameAr ?? 'طلب'

  // مطلوب منك: من بياناتك الفعلية فقط (عهدة تنتظر تأكيدك، طلب مُرجَع لاستكمال معلومات)
  const pendingCustody = custody.filter((c) => c.status === 'PENDING_ACK')
  const returnedRequests = requests.filter((r) => r.status === 'RETURNED_FOR_INFO')
  const actionItems: ActionItem[] = [
    ...(pendingCustody.length > 0
      ? [
          {
            id: 'custody-ack',
            title: `${pendingCustody.length} عهدة بانتظار تأكيد استلامك`,
            description: pendingCustody
              .slice(0, 3)
              .map((c) => c.assetName ?? `أصل #${c.assetId}`)
              .join('، '),
            icon: Package,
            color: 'bg-blue-100 text-blue-600',
            cta: 'تأكيد الاستلام',
            href: '/my/custody',
          },
        ]
      : []),
    ...(returnedRequests.length > 0
      ? [
          {
            id: 'returned-requests',
            title: `${returnedRequests.length} طلب مُرجَع لاستكمال معلومات`,
            description: returnedRequests
              .slice(0, 3)
              .map((r) => `${typeNameOf(r.typeCode)} REQ-${r.id}`)
              .join('، '),
            icon: FileText,
            color: 'bg-orange-50 text-orange-600',
            cta: 'استكمال الطلب',
            href: '/requests',
          },
        ]
      : []),
  ]

  const currentCustody = custody.filter((c) => c.status in custodyStatusLabels)
  // الطبقة المُرحّلة السارية (عادةً السنوية) — تنبيه بصلاحيتها من السيرفر
  const carried = balances.find(
    (b) => Number(b.opening.available) > 0 && !b.opening.expired
  )

  return (
    <div className="space-y-6">
      {/* ترحيب + حالة اليوم */}
      <div className="card p-6 bg-gradient-to-l from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {greeting}، {user?.displayName ?? ''} 👋
            </h2>
            {shiftLine && <p className="text-primary-100 mt-1">{shiftLine}</p>}
          </div>
          {today && (
            <div className="text-left shrink-0">
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
                <Fingerprint size={20} />
                <div>
                  <p className="text-xs text-primary-100">بصمة الحضور اليوم</p>
                  {day?.checkIn ? (
                    <p className="font-bold flex items-center gap-1">
                      <span dir="ltr">{to12h(day.checkIn)}</span>
                      <CheckCircle2 size={14} />
                      {day.checkOut && (
                        <span className="text-xs font-normal text-primary-100">
                          · انصراف <span dir="ltr">{to12h(day.checkOut)}</span>
                        </span>
                      )}
                    </p>
                  ) : day?.checkOut ? (
                    <p className="font-bold text-sm">
                      انصراف فقط <span dir="ltr">{to12h(day.checkOut)}</span>
                    </p>
                  ) : (
                    <p className="font-bold text-sm">
                      {fullDayLeave
                        ? 'في إجازة'
                        : !today.workingDay
                        ? 'لا دوام اليوم'
                        : 'لم تُسجَّل بعد'}
                    </p>
                  )}
                  {day && (
                    <p className="text-xs text-primary-100 mt-0.5">
                      {dayStatusLabels[day.status] ?? day.status}
                      {day.status === 'late' && Number(day.lateMinutes) > 0
                        ? ` ${Number(day.lateMinutes)} دقيقة`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !user?.employeeId ? (
        <div className="card p-12 text-center">
          <UserX size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            حسابك غير مرتبط بملف موظف — تواصل مع الموارد البشرية لربط حسابك
          </p>
        </div>
      ) : (
        <>
          {failed.length > 0 && (
            <div className="bg-red-50 text-red-700 rounded-xl p-4">
              تعذر تحميل: {failed.join('، ')} — أعد تحميل الصفحة
            </div>
          )}

          {/* مطلوب منك — من بياناتك الفعلية، ويختفي عند الخلو */}
          {actionItems.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={20} className="text-primary-500" />
                <h3 className="font-bold text-gray-800">مطلوب منك</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-red-200 bg-red-50/40 flex items-start gap-3"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <item.icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      )}
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium mt-2 hover:text-primary-700"
                      >
                        {item.cta}
                        <ChevronLeft size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* طلباتي — أحدث 5 من السيرفر */}
            <div className="card p-6 col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-primary-500" />
                  <h3 className="font-bold text-gray-800">طلباتي</h3>
                </div>
                {/* شاشة التقديم — منها يُختار نوع الطلب ويُقدَّم */}
                <Link href="/requests" className="btn-primary text-sm px-4 py-2">
                  + طلب جديد
                </Link>
              </div>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">لم تقدّم أي طلب بعد</p>
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {typeNameOf(req.typeCode)}
                          </p>
                          <p className="text-xs text-gray-400" dir="ltr">
                            REQ-{req.id} • {(req.submittedAt ?? req.createdAt).slice(0, 10)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`badge text-xs ${
                          statusStyles[req.status as RequestStatus] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabels[req.status as RequestStatus] ?? req.status}
                      </span>
                    </div>
                  ))}
                  {requests.length > 5 && (
                    <Link
                      href="/requests"
                      className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      كل طلباتي ({requests.length})
                      <ChevronLeft size={14} />
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* أرصدتي — محسوبة من السيرفر بطبقاتها */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={20} className="text-primary-500" />
                    <h3 className="font-bold text-gray-800">أرصدة إجازاتي</h3>
                  </div>
                  <Link
                    href="/my/leaves"
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    التفاصيل
                  </Link>
                </div>
                {balances.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    لا توجد أرصدة إجازات لحسابك
                  </p>
                ) : (
                  <div className="space-y-4">
                    {balances.map((b) => {
                      const cfg = balanceTypeConfig[b.balanceType.toLowerCase()] ?? {
                        label: b.balanceType,
                        color: 'bg-gray-400',
                      }
                      const remaining = Number(b.remaining)
                      const taken = Number(b.totalTaken)
                      const pct =
                        remaining + taken > 0
                          ? Math.max(0, Math.min(100, (remaining / (remaining + taken)) * 100))
                          : 0
                      return (
                        <div key={b.balanceType}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">{cfg.label}</span>
                            <span className="font-bold text-gray-800">{remaining} يوم متبقٍ</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cfg.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">
                            استحقاق السنة {Number(b.annualEntitlement ?? b.entitled)} · مستهلك {taken}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
                {carried && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-700">
                      <Layers size={12} className="inline ml-1" />
                      لديك رصيد مُرحّل <strong>{Number(carried.opening.available)} يوم</strong>
                      {carried.opening.expiry ? (
                        <>
                          {' '}
                          ينتهي في <strong dir="ltr">{carried.opening.expiry}</strong> — استخدمه
                          قبل انتهاء صلاحيته
                        </>
                      ) : (
                        ' بدون تاريخ انتهاء'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* عهدي — الجارية فقط */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={20} className="text-primary-500" />
                    <h3 className="font-bold text-gray-800">عهدي</h3>
                  </div>
                  <Link
                    href="/my/custody"
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    عرض الكل
                  </Link>
                </div>
                {currentCustody.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    لا توجد عهد في عهدتك حالياً
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentCustody.slice(0, 4).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {c.assetName ?? `أصل #${c.assetId}`}
                          </p>
                          {c.assetCategory && (
                            <p className="text-xs text-gray-400">{c.assetCategory}</p>
                          )}
                        </div>
                        <span
                          className={`badge text-xs shrink-0 ${
                            custodyStatusStyles[c.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {custodyStatusLabels[c.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
