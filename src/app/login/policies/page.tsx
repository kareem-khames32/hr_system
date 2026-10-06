'use client'

// B2.7-أ: شاشة إقرار السياسات — تحت /login فبتفتح من غير إطار النظام.
// بعد الدخول، الموظف اللي عليه سياسة إلزامية مااقرّش بيها بيتوجّه هنا: السياسة قدامه وزرار «قرأت وأوافق»، واحدة ورا التانية.
// جوه مهلة السماح فيه «بعدين». بعد المهلة مفيش «بعدين»، والخادم نفسه قافل أي نداء تاني لحد الإقرار.
import { useCallback, useEffect, useRef, useState } from 'react'
import { LogOut, ScrollText } from 'lucide-react'
import { ApiError, can, clearSession, getCurrentUser, getToken, isCompanyWideUser } from '@/lib/api'
import { useBranding } from '@/lib/branding'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { BrandBackdrop } from '@/components/branding/BrandBackdrop'
import { PoweredBy } from '@/components/branding/PoweredBy'
import PolicyReader from '@/components/policies/PolicyReader'
import { formatDate } from '@/lib/dates'
import { fetchPendingPolicies, markPoliciesChecked, policyCountText, withdrawPolicy, type ApiMyPolicy } from '@/lib/policies-api'

export default function PolicyGatePage() {
  const brand = useBranding()
  const [pending, setPending] = useState<{ blocked: boolean; policies: ApiMyPolicy[] } | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [manager, setManager] = useState(false)
  // سحب السياسة بخطوتين (مدير السياسات بس): رقم السياسة اللي مستنية التأكيد
  const [withdrawing, setWithdrawing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)

  const enter = () => { markPoliciesChecked(); window.location.href = '/' }
  // الجلسة خلصت: الشاشة دي تحت /login فمفيش تحويل تلقائي
  const expired = (cause: unknown) => {
    if (!(cause instanceof ApiError) || cause.status !== 401) return false
    clearSession(); window.location.href = '/login?expired=1'
    return true
  }
  const load = useCallback(async () => {
    setError(''); setWithdrawing(null)
    try {
      const data = await fetchPendingPolicies()
      // مفيش حاجة مستنياه: يكمّل للنظام
      if (!data.policies.length) { enter(); return }
      setPending(data)
    } catch (cause) {
      if (!expired(cause)) setError(cause instanceof Error ? cause.message : 'تعذر تحميل السياسات')
    }
  }, [])

  useEffect(() => {
    if (!getToken()) { window.location.href = '/login'; return }
    setName(getCurrentUser()?.displayName ?? '')
    // السحب لمدير السياسات اللي نطاقه كل الفروع (نفس حكم الخادم)
    setManager(can('policies.manage') && isCompanyWideUser(getCurrentUser()))
    void load()
  }, [load])

  const logout = () => { clearSession(); window.location.href = '/login' }
  const withdraw = async (policyId: number) => {
    // مرة واحدة: العلامة في ref، فضغطتين ورا بعض قبل ما الشاشة تترسم تاني مايبعتوش طلبين
    if (running.current) return
    running.current = true; setBusy(true)
    try { await withdrawPolicy(policyId); await load() } catch (cause) {
      if (!expired(cause)) { setError(cause instanceof Error ? cause.message : 'تعذر سحب السياسة'); setWithdrawing(null) }
    } finally { running.current = false; setBusy(false) }
  }
  // المتأخرة الأول، وبعدها اللي جوه مهلتها
  const queue = pending ? [...pending.policies].sort((a, b) => Number(b.state === 'OVERDUE') - Number(a.state === 'OVERDUE')) : []
  const current = queue[0] ?? null

  return (
    <div className="relative isolate min-h-screen overflow-hidden flex items-start justify-center p-4" dir="rtl">
      <BrandBackdrop patternId="ll-policy-gate-pattern" ornamentClassName="hidden sm:block" />
      <div className="ll-rise w-full max-w-3xl py-6">
        <div className="flex items-center justify-center gap-3 mb-6 min-h-12">
          {brand.ready && (
            <>
              <BrandLogo brand={brand} size="md" tone="dark" className="shrink-0" />
              <p title={brand.companyName} className="min-w-0 font-bold text-lg text-white leading-snug line-clamp-2 break-words"><bdi>{brand.companyName}</bdi></p>
            </>
          )}
        </div>
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-6 sm:p-8 space-y-5" data-policy-gate>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-teal-50 ring-1 ring-inset ring-teal-600/15 rounded-2xl flex items-center justify-center shrink-0"><ScrollText className="w-6 h-6 text-teal-700" /></div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-800">سياسات الشركة</h1>
              <p className="text-sm text-gray-500 mt-1">
                {name ? `أهلًا ${name} — ` : ''}
                {!pending ? 'لحظة…' : pending.blocked
                  ? 'عليك سياسة لازم تقراها وتوافق عليها عشان تكمّل في النظام.'
                  : 'فيه سياسة محتاجة تقراها وتوافق عليها.'}
              </p>
            </div>
          </div>
          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error} <button type="button" onClick={() => void load()} className="underline">حاول تاني</button></div>}
          {current && pending && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500" data-policy-gate-progress>
                <span>باقي {policyCountText(queue.length)}</span>
                {current.lockDate && (
                  <span className={current.state === 'OVERDUE' ? 'text-red-600 font-medium' : ''}>
                    {current.state === 'OVERDUE' ? 'مهلة الإقرار خلصت' : `النظام هيقفل معاك من يوم ${formatDate(current.lockDate)} لو مااقرّيتش`}
                  </span>
                )}
              </div>
              <PolicyReader key={current.version.id} versionId={current.version.id} canAcknowledge onAcknowledged={() => void load()} onStale={() => void load()} />
              {/* مدير السياسات: سياسة اتنشرت غلط أو ملفها مابيتعرضش بتتسحب من هنا من غير إقرار (الخادم بيسمح بالسحب وهو مقفول) */}
              {manager && (
                <p className="text-xs text-gray-500" data-policy-gate-withdraw>
                  {withdrawing === current.policyId
                    ? <>السحب بيشيلها من عند كل الموظفين ومابيترجعش. <button type="button" disabled={busy} onClick={() => void withdraw(current.policyId)} className="text-red-600 underline disabled:opacity-50">{busy ? 'جارٍ السحب…' : 'أكّد السحب'}</button> · <button type="button" onClick={() => setWithdrawing(null)} className="underline">رجوع</button></>
                    : <>السياسة دي فيها مشكلة؟ <button type="button" onClick={() => setWithdrawing(current.policyId)} className="underline">اسحبها</button></>}
                </p>
              )}
            </>
          )}
          <div className="flex items-center justify-between pt-2 text-sm">
            <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-gray-500 hover:text-gray-700"><LogOut size={16} />خروج</button>
            {/* «بعدين» جوه مهلة السماح بس: لو فيه واحدة عدّت مهلتها الخادم قافل الباقي أصلًا */}
            {pending && !pending.blocked && (
              <button type="button" onClick={enter} className="rounded-lg px-1 py-0.5 text-teal-700 hover:text-teal-800" data-policy-gate-later>بعدين</button>
            )}
          </div>
        </div>
        <PoweredBy tone="dark" className="mt-6" />
      </div>
    </div>
  )
}
