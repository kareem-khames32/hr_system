'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ListOrdered, Plus, RefreshCw } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { PayrollPolicyChargeRulesPanel, PayrollPolicyCreateForm, PayrollPolicyVersionPanel } from '@/components/PayrollPolicySetEditor'
import { can } from '@/lib/api'
import { fetchPayrollPolicies, fetchPayrollPolicy, payrollPoliciesError, type PayrollPolicySummary } from '@/lib/payroll-policies-api'

// «معادلات الرواتب»: مدخل واحد لكل مجموعة بالاسم — دورتها وساعات اليوم وحماية الصافي وطريقة الخصم.
function PayrollPoliciesContent() {
  const [policies, setPolicies] = useState<PayrollPolicySummary[]>([])
  const [selected, setSelected] = useState<PayrollPolicySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const sequence = useRef(0)
  const mounted = useRef(true)

  const loadSelection = useCallback(async (policyId: number, list?: PayrollPolicySummary[]) => {
    const request = ++sequence.current
    setLoading(true); setLoadError(''); setNotice('')
    try {
      const detail = await fetchPayrollPolicy(policyId)
      if (!mounted.current || request !== sequence.current) return
      setSelected(detail)
      setPolicies(current => (list ?? current).map(item => item.policy.id === detail.policy.id ? detail : item))
    } catch (cause) { if (mounted.current && request === sequence.current) setLoadError(payrollPoliciesError(cause)) }
    finally { if (mounted.current && request === sequence.current) setLoading(false) }
  }, [])

  const loadList = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true); setLoadError(''); setSelected(null); setNotice('')
    try {
      const list = await fetchPayrollPolicies()
      if (!mounted.current || request !== sequence.current) return
      setPolicies(list)
      if (list.length) await loadSelection(list[0].policy.id, list)
      else setLoading(false)
    } catch (cause) { if (mounted.current && request === sequence.current) { setLoadError(payrollPoliciesError(cause)); setLoading(false) } }
  }, [loadSelection])

  useEffect(() => {
    mounted.current = true
    void loadList()
    return () => { mounted.current = false; ++sequence.current }
  }, [loadList])

  async function changed(policyId: number, message: string) {
    await loadSelection(policyId)
    if (mounted.current) setNotice(message)
  }
  async function created(summary: PayrollPolicySummary) {
    setCreating(false)
    setPolicies(current => [summary, ...current.filter(item => item.policy.id !== summary.policy.id)])
    await changed(summary.policy.id, `أُنشئت «${summary.policy.name}». راجع القيم ثم اضغط «حفظ وتفعيل» لتُستخدم في المسيرات.`)
  }

  // تفتح الشاشة أحدث تعديل غير مفعّل إن وُجد، وإلا أحدث نسخة مفعّلة.
  const versions = [...(selected?.versions ?? [])].sort((a, b) => b.versionNo - a.versionNo)
  const version = versions.find(item => item.status === 'DRAFT') ?? versions.find(item => item.status === 'ACTIVE') ?? versions[0] ?? null
  const canManage = can('payroll.policy.manage')
  return <div className="space-y-6 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><span className="rounded-2xl p-3 bg-primary-50 text-primary-600"><ListOrdered size={26} /></span><div><h1 className="text-2xl font-bold text-gray-800">معادلات الرواتب</h1><p className="text-gray-500 mt-1">كل مجموعة معادلات تحدد دورة المسير وساعات اليوم وطريقة خصم التأخير والخروج المبكر ونقص الساعات والغياب لموظفيها.</p></div></div>
      <div className="flex flex-wrap gap-2">
        {canManage && !creating && <button type="button" className="btn-primary flex gap-2 items-center text-sm" disabled={loading} onClick={() => setCreating(true)}><Plus size={17} />معادلات جديدة</button>}
        <Link href="/payroll" className="btn-secondary flex gap-2 items-center text-sm"><ArrowRight size={17} />مسير الرواتب</Link>
      </div>
    </div>
    {creating && <PayrollPolicyCreateForm onCreated={summary => void created(summary)} onCancel={() => setCreating(false)} />}

    {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-green-800 text-sm">{notice}</div>}
    {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 space-y-3"><p>{loadError}</p><button type="button" className="btn-secondary text-sm flex gap-2 items-center" disabled={loading} onClick={() => void loadList()}><RefreshCw size={16} />إعادة التحميل</button></div>}

    {policies.length > 0 && <section className="card" aria-label="اختيار معادلات الرواتب">
      <label htmlFor="payroll-policy" className="block text-sm font-medium text-gray-700 mb-2">المعادلات</label>
      <select id="payroll-policy" value={selected?.policy.id ?? ''} disabled={loading} onChange={event => void loadSelection(Number(event.target.value))} className="w-full md:w-1/2 rounded-xl border border-gray-200 p-3 bg-white disabled:bg-gray-50">
        <option value="" disabled>اختر المعادلات</option>{policies.map(item => <option key={item.policy.id} value={item.policy.id}>{item.policy.name}{item.policy.branchId == null ? ' · عامة' : ''}{!item.policy.isActive ? ' · مؤرشفة' : ''}</option>)}
      </select>
    </section>}

    {loading && <div role="status" className="card py-16 text-center text-gray-500">جارٍ التحميل…</div>}
    {!loading && !loadError && policies.length === 0 && <div className="card py-12 text-center"><h2 className="font-bold text-gray-700">لا توجد معادلات رواتب متاحة لحسابك</h2><p className="text-sm text-gray-500 mt-2">{canManage ? 'ابدأ بـ«معادلات جديدة» واكتب اسمها ودورتها، ثم «حفظ وتفعيل».' : 'إنشاء المعادلات وتعديلها يتطلب صلاحية إدارة معادلات الرواتب.'}</p></div>}
    {!loading && selected && !version && <p className="card text-gray-500">هذه المعادلات بلا إعدادات محفوظة بعد.</p>}
    {!loading && selected && version && <PayrollPolicyVersionPanel key={`panel:${version.id}:${version.revision}`} summary={selected} version={version} onChanged={message => changed(selected.policy.id, message)} />}
    {!loading && selected && <PayrollPolicyChargeRulesPanel key={`rules:${selected.policy.id}:${selected.policy.revision ?? 0}`} summary={selected} version={version} onSaved={message => changed(selected.policy.id, message)} />}
  </div>
}

export default function PayrollPoliciesPage() { return <MainLayout><PayrollPoliciesContent /></MainLayout> }
