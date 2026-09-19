'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { can, CHANGE_PASSWORD_PATH, getCurrentUser, getToken } from '@/lib/api'
import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
}

// حارس مسارات خفيف (تجربة استخدام فقط — الفرض الحقيقي في الباك إند)
// الأكثر تحديداً أولاً — null تعني الصفحة مفتوحة رغم وقوعها تحت فرع محمي.
// المسار بادئة نصية أو RegExp (للمسارات الديناميكية)، ومصفوفة الصلاحيات = كلها لازمة
const PATH_PERMS: Array<[prefix: string | RegExp, perm: string | string[] | null]> = [
  ['/payroll/payslip/', null], // قسيمة الموظف نفسه — الباك يسمح للمالك
  ['/leaves/request', null], // تقديم إجازة متاح لكل موظف
  ['/employees/custody', 'custody.assign'],
  // التهيئة: الباك يعرض لـemployees.view نطاقه كاملاً ولكل جهة (HR/IT/العهدة/المالية/المدير) موظفي مهامها
  ['/employees/onboarding', null],
  // نموذج الإضافة يكفيه employees.create (منتقي المدير من الدليل المختصر)
  ['/employees/add', 'employees.create'],
  // التعديل يحمّل ملف الموظف (employees.view) ويحفظ بـemployees.edit
  [/^\/employees\/\d+\/edit(\/|$)/, ['employees.edit', 'employees.view']],
  // معالج إنهاء الخدمة: يقرأ الملف (employees.view) ويفتح الإنهاء (offboarding.manage)
  [/^\/employees\/\d+\/terminate(\/|$)/, ['offboarding.manage', 'employees.view']],
  ['/offboarding/', null], // ملف بعينه — الباك يسمح للموظف ومديره وجهات الإخلاء
  ['/offboarding', 'offboarding.manage'],
  ['/employees/documents', 'documents.manage'],
  ['/employees/transfers', 'transfers.view'],
  ['/settings/users', 'users.manage'],
  ['/settings/roles', 'roles.manage'],
  ['/settings/request-types', 'request_types.manage'],
  ['/settings/approvals', 'approval_chains.manage'],
  ['/settings/branches', 'org.manage'],
  ['/settings/departments', 'org.manage'],
  ['/settings/teams', 'org.manage'],
  ['/settings/cost-centers', 'settings.manage'],
  ['/settings/permission-types', 'settings.manage'],
  ['/settings/asset-types', 'custody.assign'], // سجل الأصول — نفس صلاحية /assets
  ['/employees', 'employees.view'],
  ['/payroll', 'payroll.view'],
  ['/settings', 'settings.manage'],
  ['/requests-console', 'requests.view_all'],
  ['/attendance/exemptions', 'attendance_exemption.view'], // استثناء الحضور — صلاحيته مستقلة عن سجل الحضور
  ['/attendance/shifts', 'settings.manage'], // كتالوج الورديات — كتابته settings.manage
  ['/attendance/devices', 'attendance.sync'],
  ['/attendance', 'attendance.view_all'],
  ['/leaves/holidays', 'settings.manage'],
  ['/leaves/types', 'settings.manage'], // GET /settings/leave-types نفسه settings.manage
  ['/leaves', 'leaves.view_all'],
  ['/reports', 'reports.view'],
  ['/recruitment', 'candidates.manage'],
]

// الصلاحية/الصلاحيات المطلوبة للمسار الحالي — null إن كان مفتوحاً
const requiredPermFor = (path: string): string | string[] | null => {
  const hit = PATH_PERMS.find(([prefix]) =>
    typeof prefix === 'string' ? path.startsWith(prefix) : prefix.test(path)
  )
  return hit ? hit[1] : null
}

// شاشات بلا إطار النظام (القائمة الجانبية والهيدر)
const BARE_PATHS = ['/login']
const isBarePath = (path: string) => BARE_PATHS.some((bare) => path === bare || path.startsWith(`${bare}/`))

// داخل الإطار الدائم؟ — كل صفحة تلف نفسها بـ<MainLayout> فيصير مجرد تمرير للمحتوى
const ShellContext = createContext(false)

/**
 * الإطار الدائم للنظام (القائمة الجانبية + الهيدر + حارس الدخول) — يُركَّب مرة واحدة في الـroot layout.
 * كان كل صفحة تركّب إطارها بنفسها، فيُعاد بناء القائمة الجانبية مع كل انتقال:
 * تنغلق المجموعة المفتوحة، يرجع تمرير القائمة لأعلى، ويومض المحتوى بمؤشر التحميل.
 */
export function AppShell({ children }: MainLayoutProps) {
  const pathname = usePathname() ?? ''
  const [authed, setAuthed] = useState<boolean | null>(null)
  const bare = isBarePath(pathname)

  // حارس الدخول: كل شاشات النظام تمر من هنا — بلا توكن → صفحة اللوجين
  useEffect(() => {
    if (bare) return
    if (!getToken()) {
      window.location.href = '/login'
      return
    }
    // كلمة مؤقتة من المدير لسه ماتغيّرتش → «غيّر كلمة المرور» الأول (الخادم قافل الباقي أصلًا)
    if (getCurrentUser()?.mustChangePassword) {
      window.location.href = CHANGE_PASSWORD_PATH
      return
    }
    setAuthed(true)
  }, [bare, pathname])

  if (bare) return <>{children}</>

  // لا نعرض محتوى محمي قبل التحقق (يمنع وميض البيانات)
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // بعد التوثيق (على العميل): تحقق خفيف من صلاحية الشاشة
  const requiredPerm = requiredPermFor(pathname)
  const allowed =
    !requiredPerm ||
    (Array.isArray(requiredPerm) ? requiredPerm : [requiredPerm]).every((p) => can(p))

  return (
    <ShellContext.Provider value>
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
    </ShellContext.Provider>
  )
}

// الصفحات تلف محتواها بـ<MainLayout>: داخل الإطار الدائم هو تمرير فقط، وخارجه (اختبارات/عرض منفصل) يركّب الإطار كاملًا
export default function MainLayout({ children }: MainLayoutProps) {
  const inShell = useContext(ShellContext)
  if (inShell) return <>{children}</>
  return <AppShell>{children}</AppShell>
}
