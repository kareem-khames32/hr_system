'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Building2, ListChecks } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { ApiError } from '@/lib/api'
import { PayrollChainEditor } from '@/components/payroll/PayrollChainEditor'
import { fetchPayrollChainConfig, savePayrollCompanyChain, savePayrollSeriesChain, type PayrollChainConfig, type PayrollChainStepInput, type PayrollChainStepView } from '@/lib/payroll-approval-chain-api'

// سلسلة اعتماد المسير (قرار المالك 22 سبتمبر): المالك بيرتبها بنفسه.
// - مسؤول الرواتب يحسب المسير ولا يعتمده. بعد الحساب المسير بيطلع الخطوات بالترتيب، وكل خطوة شخص بعينه (أو دور كبديل).
// - سلسلة الشركة تمشي على كل المسيرات، وأي مسير دائم باسمه ممكن يبقى له سلسلة خاصة (وبتفضل معاه كل شهر بنفس الاسم).
// - من غير أي سلسلة: الاعتماد بخطوة واحدة زي ما هو. آخر خطوة = الاعتماد النهائي، وساعتها القسائم تظهر للموظفين.

// مرجع ثابت لسلسلة فاضية: المحرر بيبدأ مسودته من الخطوات المحفوظة لما مرجعها يتغير، فمرجع جديد مع كل رسم كان هيمسح تعديلات المالك
const NO_STEPS: PayrollChainStepView[] = []
const STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف' }
const message = (error: unknown, fallback: string) => error instanceof ApiError || error instanceof Error ? error.message : fallback

export default function PayrollApprovalChainPage() {
  const [config, setConfig] = useState<PayrollChainConfig | null>(null)
  const [series, setSeries] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'company' | 'series' | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchPayrollChainConfig()
      .then(result => { if (!cancelled) { setConfig(result); setSeries(result.overrides[0]?.seriesName ?? result.series[0]?.seriesName ?? '') } })
      .catch(cause => { if (!cancelled) setError(message(cause, 'تعذر تحميل سلسلة الاعتماد')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const save = async (kind: 'company' | 'series', steps: PayrollChainStepInput[]) => {
    if (!config || busy) return
    setBusy(kind); setError(''); setSaved('')
    try {
      const override = config.overrides.find(row => row.seriesName === series)
      const next = kind === 'company'
        ? await savePayrollCompanyChain(steps, config.company.revision)
        : await savePayrollSeriesChain(series, steps, override?.revision ?? 0)
      setConfig(next)
      setSaved(kind === 'company'
        ? steps.length ? `اتحفظت سلسلة الشركة (${steps.length} خطوات)` : 'اتلغت سلسلة الشركة — الاعتماد بخطوة واحدة'
        : steps.length ? `اتحفظت سلسلة «${series}» (${steps.length} خطوات)` : `«${series}» رجع لسلسلة الشركة`)
    } catch (cause) {
      setError(message(cause, 'تعذر حفظ السلسلة'))
    } finally {
      setBusy(null)
    }
  }

  const override = config?.overrides.find(row => row.seriesName === series) ?? null
  const seriesNames = config ? [...new Set([...config.series.map(row => row.seriesName), ...config.overrides.map(row => row.seriesName)])] : []
  const latest = config?.series.find(row => row.seriesName === series) ?? null

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سلسلة اعتماد المسير</h1>
            <p className="text-gray-500 mt-1">مسؤول الرواتب يحسب ← المراجعين بالترتيب ← آخر خطوة هي الاعتماد النهائي</p>
          </div>
          <Link href="/payroll" className="btn-secondary text-sm">رجوع لمسير الرواتب</Link>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2"><AlertTriangle size={18} />{error}</div>}
        {saved && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-4">{saved}</div>}
        {loading && <p className="text-sm text-gray-400">جارٍ التحميل…</p>}

        {config && (
          <>
            <div className="card space-y-4" data-company-chain>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><Building2 size={20} /></div>
                <div>
                  <h2 className="font-bold text-gray-800">سلسلة الشركة</h2>
                  <p className="text-sm text-gray-500 mt-1">بتمشي على أي مسير مالوش سلسلة خاصة. من احتسب المسير مابيعتمدش أي خطوة فيه، ومحدش بيعتمد خطوتين لنفس المسير.</p>
                  {config.company.updatedByName && <p className="text-xs text-gray-400 mt-1">آخر تعديل: {config.company.updatedByName}</p>}
                </div>
              </div>
              {!config.canEditCompany && <p className="rounded-xl bg-amber-50 text-amber-900 text-sm p-3">سلسلة الشركة بتتعدل من حساب على مستوى الشركة؛ حساب الفرع بيعدّل سلاسل مسيرات فرعه بس.</p>}
              <PayrollChainEditor steps={config.company.steps} roles={config.roles} disabled={!config.canEditCompany} busy={busy === 'company'}
                emptyHint="مفيش سلسلة: الاعتماد بخطوة واحدة من حامل صلاحية اعتماد المسير" clearLabel="الغِ سلسلة الشركة (اعتماد بخطوة واحدة)"
                onSave={steps => save('company', steps)} />
            </div>

            <div className="card space-y-4" data-series-chain>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><ListChecks size={20} /></div>
                <div>
                  <h2 className="font-bold text-gray-800">سلسلة خاصة بمسير دائم</h2>
                  <p className="text-sm text-gray-500 mt-1">اختار المسير باسمه (زي «مسير فرع المعادي») ورتّب سلسلته. السلسلة بتفضل مع المسير كل شهر طول ما اسمه هو هو — «إنشاء مسيرات الشهر الجديد» بينقلها معاه.</p>
                </div>
              </div>
              {seriesNames.length === 0 ? <p className="text-sm text-gray-500">لسه مفيش مسيرات بأسماء دائمة — اعمل أول مسير من «مسير جديد».</p> : (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm">
                      <span className="font-medium text-gray-700">المسير</span>
                      <select className="input mt-1 block w-72" value={series} disabled={busy !== null} onChange={event => { setSeries(event.target.value); setSaved('') }}>
                        {seriesNames.map(name => <option key={name} value={name}>{name}{config.overrides.some(row => row.seriesName === name) ? ' — له سلسلة خاصة' : ''}</option>)}
                      </select>
                    </label>
                    {latest && <span className="text-xs text-gray-500 mb-2">آخر مسير بالاسم ده: {latest.latestPeriod} ({STATUS[latest.latestStatus] ?? latest.latestStatus})</span>}
                  </div>
                  {series && <PayrollChainEditor key={series} steps={override?.steps ?? NO_STEPS} roles={config.roles} busy={busy === 'series'}
                    emptyHint={config.company.steps.length ? `ماشي بسلسلة الشركة (${config.company.steps.length} خطوات)` : 'مفيش سلسلة: الاعتماد بخطوة واحدة'}
                    clearLabel="شيل السلسلة الخاصة (يرجع لسلسلة الشركة)" onSave={steps => save('series', steps)} />}
                </>
              )}
            </div>

            <p className="text-xs text-gray-500">
              تغيير سلسلة ومسير محسوب في نص اعتمادها بيبدأ الاعتماد من الخطوة الأولى. رفض أي خطوة بسبب بيرجّع المسير لمسؤول الرواتب، وإعادة الحساب بتبدأ السلسلة من الأول.
            </p>
          </>
        )}
      </div>
    </MainLayout>
  )
}
