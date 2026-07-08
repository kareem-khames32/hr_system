'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { can, getToken } from '@/lib/api'
import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
}

// حارس مسارات خفيف (تجربة استخدام فقط — الفرض الحقيقي في الباك إند)
// الأكثر تحديداً أولاً — null تعني الصفحة مفتوحة رغم وقوعها تحت فرع محمي
const PATH_PERMS: Array<[prefix: string, perm: string | null]> = [
  ['/payroll/payslip/', null], // قسيمة الموظف نفسه — الباك يسمح للمالك
  ['/leaves/request', null], // تقديم إجازة متاح لكل موظف
  ['/employees/custody', 'custody.assign'],
  ['/employees/documents', 'documents.manage'],
  ['/employees/transfers', 'transfers.view'],
  ['/settings/users', 'users.manage'],
  ['/settings/roles', 'roles.manage'],
  ['/settings/request-types', 'request_types.manage'],
  ['/settings/approvals', 'approval_chains.manage'],
  ['/settings/branches', 'org.manage'],
  ['/settings/departments', 'org.manage'],
  ['/settings/teams', 'org.manage'],
  ['/employees', 'employees.view'],
  ['/payroll', 'payroll.view'],
  ['/settings', 'settings.manage'],
  ['/requests-console', 'requests.view_all'],
  ['/attendance', 'attendance.view_all'],
  ['/leaves', 'leaves.view_all'],
  ['/reports', 'reports.view'],
  ['/recruitment', 'candidates.manage'],
]

// الصلاحية المطلوبة للمسار الحالي — null إن كان مفتوحاً
const requiredPermFor = (path: string): string | null => {
  const hit = PATH_PERMS.find(([prefix]) => path.startsWith(prefix))
  return hit ? hit[1] : null
}

// حارس الدخول: كل شاشات النظام تمر من هنا — بلا توكن → صفحة اللوجين
export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login'
      return
    }
    setAuthed(true)
  }, [])

  // لا نعرض محتوى محمي قبل التحقق (يمنع وميض البيانات)
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // بعد التوثيق (على العميل): تحقق خفيف من صلاحية الشاشة
  const requiredPerm = requiredPermFor(pathname ?? '')
  const allowed = !requiredPerm || can(requiredPerm)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="mr-72">
        <Header />
        <main className="p-8">
          {allowed ? (
            children
          ) : (
            <div className="card p-12 text-center max-w-lg mx-auto mt-12">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                غير مصرح لك بهذه الصفحة
              </h2>
              <p className="text-gray-500 mb-6">
                هذه الشاشة تتطلب صلاحية غير ممنوحة لحسابك — إذا كنت تعتقد أن ذلك
                خطأ فتواصل مع مسؤول النظام
              </p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2">
                العودة إلى لوحتي
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
