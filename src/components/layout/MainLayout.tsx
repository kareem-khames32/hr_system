'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EyeOff, ShieldAlert } from 'lucide-react'
import { can, CHANGE_PASSWORD_PATH, getCurrentUser, hasSession, POLICY_GATE_PATH, restoreSession, TOTP_SETUP_PATH } from '@/lib/api'
import { PREBOARDING_HOME, preboardingPathAllowed, preboardingUntil } from '@/lib/preboarding'
import { fetchPendingPolicies, markPoliciesChecked, policiesCheckedThisSession } from '@/lib/policies-api'
import { routeAvailable, useModules } from '@/lib/modules'
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
  ['/employees/hiring-documents', 'documents.manage'],
  ['/employees/transfers', 'transfers.view'],
  ['/settings/users', 'users.manage'],
  // B1.3: سجل الدخول بنفس صلاحية المستخدمين
  ['/settings/login-log', 'users.manage'],
  // B2.1: سجل التدقيق
  ['/settings/audit', 'audit.view'],
  // B1.4: المهام المجدولة (الخادم بيشترط كمان حساب على كل الفروع)
  ['/settings/scheduled-jobs', 'settings.manage'],
  ['/settings/modules', 'settings.modules'],
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
  // سلسلة اعتماد المسير: التسمية في السلسلة هي المنحة (معتمد بلا أي صلاحية رواتب)، وصرف الرواتب لحامل payroll.disburse أو قارئ/صارف المسير — الباك يحكم
  ['/payroll/my-approvals', null],
  ['/payroll/disbursement', null],
  ['/payroll/approval-chain', 'payroll.chain_manage'],
  ['/payroll', 'payroll.view'],
  ['/settings', 'settings.manage'],
  ['/requests-console', 'requests.view_all'],
  // B2.5: قايمة كل المهام («مهامي» تحت /my مفتوحة لكل حساب)
  ['/tasks', 'tasks.view_all'],
  // B2.11: الوظائف المعتمدة
  ['/positions', 'positions.view'],
  ['/attendance/exemptions', 'attendance_exemption.view'], // استثناء الحضور — صلاحيته مستقلة عن سجل الحضور
  ['/attendance/shifts', 'settings.manage'], // كتالوج الورديات — كتابته settings.manage
  ['/attendance/devices', 'attendance.sync'],
  ['/attendance', 'attendance.view_all'],
  ['/leaves/holidays', 'settings.manage'],
  ['/leaves/types', 'settings.manage'], // GET /settings/leave-types نفسه settings.manage
  ['/leaves', 'leaves.view_all'],
  ['/reports', 'reports.view'],
  ['/recruitment', 'candidates.manage'],
  // B2.7: مكتبة السياسات لمديرها؛ وتقرير الإقرارات لصاحب أي واحدة من الصلاحيتين (الخادم بيحكم)
  ['/policies/reports', null],
  ['/policies', 'policies.manage'],
]

// الصلاحية/الصلاحيات المطلوبة للمسار الحالي — null إن كان مفتوحاً
const requiredPermFor = (path: string): string | string[] | null => {
  const hit = PATH_PERMS.find(([prefix]) =>
    typeof prefix === 'string' ? path.startsWith(prefix) : prefix.test(path)
  )
  return hit ? hit[1] : null
}

// شاشات بلا إطار النظام (القائمة الجانبية والهيدر)
// B3.3-ب: صفحة الوظائف العامة (/careers) للمتقدمين من برّه — من غير إطار ولا حارس دخول (الخادم بيقفلها بميزتها)
const BARE_PATHS = ['/login', '/careers']
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
  // الموبايل (أقل من lg): القائمة الجانبية درج بيتفتح من زرار القائمة في الهيدر — من lg وفوق ثابتة زي ما هي
  const [navOpen, setNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const openNav = useCallback(() => setNavOpen(true), [])
  const closeNav = useCallback(() => setNavOpen(false), [])
  const bare = isBarePath(pathname)
  // الموديولات المفعّلة للمستخدم (الإعدادات ← الموديولات) — بتتقري مرة للجلسة؛ null لحد ما تتقري
  const modules = useModules()

  // حارس الدخول: كل شاشات النظام تمر من هنا — بلا جلسة → صفحة اللوجين
  useEffect(() => {
    if (bare) return
    let cancelled = false
    const enter = () => {
      // كلمة مؤقتة من المدير لسه ماتغيّرتش → «غيّر كلمة المرور» الأول (الخادم قافل الباقي أصلًا)
      if (getCurrentUser()?.mustChangePassword) {
        window.location.href = CHANGE_PASSWORD_PATH
        return
      }
      // B2.17-ج: تطبيق المصادقة إلزامي لدوره ولسه مافعّلش → شاشة التفعيل الأول
      if (getCurrentUser()?.totpSetupRequired) {
        window.location.href = TOTP_SETUP_PATH
        return
      }
      // B3.1-ب: حساب في بوابة التهيئة (مباشرته لسه جاية) فتح شاشة برّه شاشات التهيئة → «مستنداتي» (الخادم قافل الباقي أصلًا)
      if (preboardingUntil() && !preboardingPathAllowed(pathname)) {
        window.location.href = PREBOARDING_HOME
        return
      }
      setAuthed(true)
    }
    if (hasSession()) {
      enter()
      return
    }
    // B2.17: تبويب جديد أو تخزين اتمسح — الجلسة ممكن تكون لسه قايمة في cookie المتصفح: بيانات الحساب بترجع من الخادم
    void restoreSession().then((user) => {
      if (cancelled) return
      if (!user) {
        window.location.href = '/login'
        return
      }
      enter()
    })
    return () => {
      cancelled = true
    }
  }, [bare, pathname])

  // B2.7: سياسة إلزامية مااقرّش بيها → شاشة الإقرار، مرة مع كل دخول (جوه المهلة فيها «بعدين»؛ بعد المهلة الخادم قافل الباقي أصلًا).
  // تعذّر النداء مايوقفش النظام
  useEffect(() => {
    if (!authed || bare || policiesCheckedThisSession()) return
    let cancelled = false
    fetchPendingPolicies()
      .then((pending) => {
        if (cancelled) return
        if (pending.policies.length) window.location.href = POLICY_GATE_PATH
        else markPoliciesChecked()
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [authed, bare])

  // الدرج بيتقفل مع أي انتقال لصفحة تانية
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  // والدرج مفتوح: Esc بيقفله، والصفحة اللي وراه ماتتحركش، والشاشة لو كبرت لـlg بيتقفل (القائمة هناك ثابتة)
  useEffect(() => {
    if (!navOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onDesktop = () => {
      if (desktop.matches) setNavOpen(false)
    }
    // قفل تمرير الصفحة: التمرير هنا بتاع الـhtml (globals.css حاطط overflow-x عليه فهو اللي بيتنقل للـviewport)،
    // فالقفل عليه هو — قفل الـbody مش هيوقف التمرير وكمان بيفك تثبيت الهيدر
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onDesktop)
    return () => {
      html.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onDesktop)
      // التركيز كان جوّه الدرج (رابط أو زرار القفل) → يرجع لزرار القائمة من غير ما الصفحة تتحرك
      if (document.getElementById('app-sidebar')?.contains(document.activeElement)) menuButtonRef.current?.focus({ preventScroll: true })
    }
  }, [navOpen])

  if (bare) return <>{children}</>

  // لا نعرض محتوى محمي قبل التحقق (يمنع وميض البيانات)، ولا القائمة قبل ما الموديولات المفعّلة تتقري (يمنع وميض بنود مقفولة)
  if (!authed || !modules) {
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
  // شاشة موديول مقفول (أو ميزة مقفولة) اتفتحت بالرابط مباشرة: «الصفحة دي مش متاحة» — الخادم برضه بيرجّع 404 لمساراتها
  const available = routeAvailable(pathname, modules)
  // B3.1-ب: سطر ترحيب لحساب في بوابة التهيئة
  const startsOn = preboardingUntil()

  return (
    <ShellContext.Provider value>
      <div className="min-h-screen bg-gray-50">
        <Sidebar open={navOpen} onClose={closeNav} />
        {/* خلفية معتمة ورا الدرج (أقل من lg) — الضغط عليها بيقفله؛ فوق الهيدر (z-40) وتحت الدرج (z-50) */}
        {navOpen && <div aria-hidden="true" onClick={closeNav} className="fixed inset-0 z-[45] bg-gray-900/40 lg:hidden" />}
        <div className="lg:mr-72">
          <Header onMenuClick={openNav} menuOpen={navOpen} menuButtonRef={menuButtonRef} />
          <main className="p-4 lg:p-8">
            {startsOn && (
              <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
                أهلًا بيك — مباشرتك يوم {startsOn}. المتاح لك دلوقتي: مستنداتك، وسياسات الشركة وإقرارك بيها، ومهامك. باقي
                النظام بيتفتح من يوم المباشرة.
              </div>
            )}
            {!available ? (
              <div className="card p-12 text-center max-w-lg mx-auto mt-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <EyeOff size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">الصفحة دي مش متاحة</h2>
                <p className="text-gray-500 mb-6">
                  الشاشة دي تبع جزء من النظام مش مفعّل عندكم — لو محتاجها كلّم مدير النظام يفعّلها من الإعدادات
                </p>
                <Link href="/" className="btn-primary inline-flex items-center gap-2">
                  العودة إلى لوحتي
                </Link>
              </div>
            ) : allowed ? (
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
