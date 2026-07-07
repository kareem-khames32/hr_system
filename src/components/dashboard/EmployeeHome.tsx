'use client'

import Link from 'next/link'
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  FileSignature,
  FileText,
  Fingerprint,
  Megaphone,
  Package,
  Target,
  UserCog,
  Wallet,
} from 'lucide-react'

// ===== شعارات/مهام مطلوبة من الموظف (Action Items) =====
const actionItems = [
  {
    id: '1',
    title: 'وقّع على سياسة الإجازات المحدّثة',
    description: 'سياسة جديدة تتطلب إقرارك بالاطلاع قبل 15 يوليو',
    icon: FileSignature,
    color: 'bg-red-100 text-red-600',
    cta: 'اقرأ ووقّع',
    href: '#',
    urgent: true,
  },
  {
    id: '2',
    title: 'تقييمك الذاتي مستحق',
    description: 'دورة تقييم الربع الثاني تنتهي خلال 5 أيام',
    icon: Target,
    color: 'bg-warning-50 text-warning-600',
    cta: 'ابدأ التقييم',
    href: '/performance',
    urgent: true,
  },
  {
    id: '3',
    title: 'استلم عهدتك الجديدة',
    description: 'لابتوب Dell — بانتظار توقيعك على استلام العهدة',
    icon: Package,
    color: 'bg-blue-100 text-blue-600',
    cta: 'تأكيد الاستلام',
    href: '#',
    urgent: false,
  },
  {
    id: '4',
    title: 'أكمل بياناتك الشخصية',
    description: 'ينقص: صورة الهوية + جهة اتصال الطوارئ',
    icon: UserCog,
    color: 'bg-gray-100 text-gray-600',
    cta: 'أكمل الآن',
    href: '/profile',
    urgent: false,
  },
]

// ===== إعلانات الشركة =====
const announcements = [
  {
    id: '1',
    title: 'إجازة عيد الأضحى',
    body: 'تبدأ إجازة العيد من يوم الأربعاء القادم ولمدة 4 أيام لجميع الفروع',
    date: 'منذ يومين',
    pinned: true,
  },
  {
    id: '2',
    title: 'تحديث نظام التأمين الطبي',
    body: 'تمت ترقية فئة التأمين لجميع الموظفين — راجع بطاقتك الجديدة',
    date: 'منذ 4 أيام',
    pinned: false,
  },
]

// ===== طلباتي الأخيرة =====
const myRequests = [
  {
    id: 'REQ-1042',
    type: 'طلب إجازة سنوية',
    submittedAt: '2026-07-05',
    status: 'pending',
    currentStep: 'بانتظار المدير المباشر',
  },
  {
    id: 'REQ-1029',
    type: 'طلب تغيير بيانات',
    submittedAt: '2026-07-01',
    status: 'approved',
    currentStep: 'مكتمل',
  },
  {
    id: 'REQ-1017',
    type: 'طلب عمل إضافي',
    submittedAt: '2026-06-28',
    status: 'rejected',
    currentStep: 'مرفوض من HR',
  },
]

const statusStyles: Record<string, string> = {
  pending: 'bg-warning-50 text-warning-700',
  approved: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

// ===== أرصدتي =====
const balances = [
  { label: 'سنوية', total: 21, used: 8, color: 'bg-primary-500' },
  { label: 'مرضية', total: 30, used: 2, color: 'bg-red-400' },
  { label: 'طارئة', total: 5, used: 1, color: 'bg-warning-400' },
]

export default function EmployeeHome() {
  return (
    <div className="space-y-6">
      {/* ترحيب + حالة اليوم */}
      <div className="card p-6 bg-gradient-to-l from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">صباح الخير، أحمد 👋</h2>
            <p className="text-primary-100 mt-1">
              ورديتك اليوم: 10:00 ص — 7:00 م (الأسبوع الصباحي)
            </p>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2">
              <Fingerprint size={20} />
              <div>
                <p className="text-xs text-primary-100">بصمة الحضور اليوم</p>
                <p className="font-bold" dir="ltr">09:52 ص ✓</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* شعارات / مهام مطلوبة مني */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary-500" />
            <h3 className="font-bold text-gray-800">مطلوب منك</h3>
            <span className="badge badge-danger text-xs">{actionItems.filter(a => a.urgent).length} عاجل</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {actionItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                item.urgent ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
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

      <div className="grid grid-cols-3 gap-6">
        {/* طلباتي */}
        <div className="card p-6 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-primary-500" />
              <h3 className="font-bold text-gray-800">طلباتي</h3>
            </div>
            <button className="btn-primary text-sm px-4 py-2">+ طلب جديد</button>
          </div>
          <div className="space-y-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{req.type}</p>
                    <p className="text-xs text-gray-400" dir="ltr">
                      {req.id} • {req.submittedAt}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <span className={`badge text-xs ${statusStyles[req.status]}`}>
                    {statusLabels[req.status]}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{req.currentStep}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* أرصدتي */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={20} className="text-primary-500" />
            <h3 className="font-bold text-gray-800">أرصدة إجازاتي</h3>
          </div>
          <div className="space-y-4">
            {balances.map((b) => {
              const remaining = b.total - b.used
              const pct = (remaining / b.total) * 100
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{b.label}</span>
                    <span className="font-bold text-gray-800">
                      {remaining} / {b.total} يوم
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">
              <Clock size={12} className="inline ml-1" />
              لديك رصيد مُرحّل <strong>6 أيام</strong> ينتهي في
              <strong> 31 ديسمبر 2026</strong> — استخدمه أولاً
            </p>
          </div>
        </div>
      </div>

      {/* إعلانات الشركة */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={20} className="text-primary-500" />
          <h3 className="font-bold text-gray-800">إعلانات الشركة</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-xl border ${
                a.pinned
                  ? 'border-primary-200 bg-primary-50/40'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-800 text-sm">
                  {a.pinned && '📌 '}
                  {a.title}
                </p>
                <span className="text-xs text-gray-400">{a.date}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
