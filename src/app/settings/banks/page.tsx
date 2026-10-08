'use client'

// B4.6 (ب): «البنوك» — جدول البنوك بأكوادها. كود بنك الموظف بيتقري من آيبانه ويتطابق مع الجدول ده، وكشف البنك بينبّه على آيبان كوده
// مش في الجدول. الإضافة والتعديل لحساب بكل الفروع؛ مفيش مسح (تعطيل بس).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, Landmark } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { createBank, fetchBanks, updateBank, type ApiBank, type ApiBanks } from '@/lib/banks-api'

const COUNTRY_LABELS: Record<string, string> = { SA: 'السعودية', EG: 'مصر' }
const CODE_LENGTH: Record<string, number> = { SA: 2, EG: 4 }
const emptyForm = { country: 'SA', ibanCode: '', nameAr: '', nameEn: '', swiftCode: '' }

export default function BanksPage() {
  const [data, setData] = useState<ApiBanks | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(() => {
    fetchBanks().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل جدول البنوك'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<ApiBanks>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      setData(await work())
      setInfo(done)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    const ok = await run(() => createBank({ country: form.country, ibanCode: form.ibanCode.trim(), nameAr: form.nameAr.trim(),
      ...(form.nameEn.trim() ? { nameEn: form.nameEn.trim() } : {}), ...(form.swiftCode.trim() ? { swiftCode: form.swiftCode.trim() } : {}) }), `اتضاف «${form.nameAr.trim()}»`)
    if (ok) setForm({ ...emptyForm, country: form.country })
  }
  const toggle = (bank: ApiBank) => run(() => updateBank(bank.id, { isActive: !bank.isActive }), bank.isActive ? `اتعطّل «${bank.nameAr}»` : `اتفعّل «${bank.nameAr}»`)

  const canEdit = data?.canEdit === true
  const codeLength = CODE_LENGTH[form.country]
  const canAdd = new RegExp(`^\\d{${codeLength}}$`).test(form.ibanCode.trim()) && form.nameAr.trim().length >= 2

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">
            ← الإعدادات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <Landmark size={24} className="text-primary-600" />
            البنوك
          </h1>
          <p className="text-gray-500 mt-1">جدول البنوك بأكوادها. بنك الموظف بيتعرف من آيبانه، وكشف البنك بينبّه لو كود البنك في الآيبان مش في الجدول ده.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}

        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">جدول البنوك مش موجود — طبّق ترحيل 138. كشف البنك شغال من غير تنبيه كود البنك.</div>
        )}

        {data?.available && (
          <>
            <div className="bg-blue-50 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-2">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>
                كود البنك هو الأرقام اللي بعد حرفي الدولة وخانتي التحقق في الآيبان: رقمين في السعودية (SA<span dir="ltr">00</span> <strong dir="ltr">80</strong>…) و4 أرقام في مصر.
                خُد الأكواد من البنك نفسه أو من آيبانات موظفيك. الجدول الفاضي = مفيش تنبيه.
              </span>
            </div>

            {canEdit && (
              <div className="card space-y-3" data-bank-add>
                <h2 className="text-lg font-semibold text-gray-800">إضافة بنك</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="label" htmlFor="bank-country">الدولة</label>
                    <select id="bank-country" className="input w-full" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value, ibanCode: '' })}>
                      <option value="SA">السعودية</option>
                      <option value="EG">مصر</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="bank-code">كود الآيبان ({codeLength} أرقام)</label>
                    <input id="bank-code" className="input w-full font-mono" dir="ltr" inputMode="numeric" maxLength={codeLength} value={form.ibanCode}
                      onChange={(event) => setForm({ ...form, ibanCode: event.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="bank-name">اسم البنك</label>
                    <input id="bank-name" className="input w-full" maxLength={200} value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="bank-name-en">الاسم بالإنجليزي (اختياري)</label>
                    <input id="bank-name-en" className="input w-full" dir="ltr" maxLength={200} value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="bank-swift">السويفت (اختياري)</label>
                    <input id="bank-swift" className="input w-full font-mono" dir="ltr" maxLength={20} value={form.swiftCode} onChange={(event) => setForm({ ...form, swiftCode: event.target.value })} />
                  </div>
                </div>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !canAdd} onClick={add}>إضافة</button>
              </div>
            )}

            <div className="card overflow-x-auto" data-banks>
              {data.banks.length === 0 ? (
                <p className="text-gray-500 text-sm">لسه مفيش بنوك في الجدول.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الدولة</th>
                      <th className="table-header text-center">كود الآيبان</th>
                      <th className="table-header text-right">البنك</th>
                      <th className="table-header text-right">بالإنجليزي</th>
                      <th className="table-header text-center">السويفت</th>
                      <th className="table-header text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.banks.map((bank) => (
                      <tr key={bank.id} className={`border-t border-gray-100 ${bank.isActive ? '' : 'text-gray-400'}`}>
                        <td className="table-cell">{COUNTRY_LABELS[bank.country] ?? bank.country}</td>
                        <td className="table-cell text-center font-mono" dir="ltr">{bank.ibanCode}</td>
                        <td className="table-cell">{bank.nameAr}</td>
                        <td className="table-cell" dir="ltr">{bank.nameEn ?? '—'}</td>
                        <td className="table-cell text-center font-mono" dir="ltr">{bank.swiftCode ?? '—'}</td>
                        <td className="table-cell text-center">
                          {canEdit ? (
                            <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => toggle(bank)}>
                              {bank.isActive ? 'مفعّل — عطّله' : 'معطّل — فعّله'}
                            </button>
                          ) : (bank.isActive ? 'مفعّل' : 'معطّل')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!canEdit && <p className="text-sm text-gray-500">الإضافة والتعديل لحساب بكل الفروع.</p>}
          </>
        )}
      </div>
    </MainLayout>
  )
}
