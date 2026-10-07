'use client'

import { useEffect, useState } from 'react'
import { fetchDocTypeExpiry, updateDocTypeExpiry, type DocTypeExpiry, type DocTypeExpirySettings as Settings } from '@/lib/documents-expiry-api'

// B2.15: إعدادات انتهاء نوع المستند في شاشة «أنواع المستندات» — له تاريخ انتهاء، وأيام التنبيه، والمسؤول عن التجديد.
// الافتراضي = السلوك الحالي: التاريخ اختياري، والتنبيه على 30 يوم، ومن غير مهمة تجديد.
export function DocTypeExpirySettings({ canWrite, refreshKey }: { canWrite: boolean; refreshKey?: unknown }) {
  const [data, setData] = useState<Settings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [days, setDays] = useState<Record<number, string>>({})

  const load = () => fetchDocTypeExpiry().then((result) => {
    setData(result)
    setDays(Object.fromEntries(result.types.map((type) => [type.id, type.alertDays.join('، ')])))
    setError(null)
  }).catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل إعدادات انتهاء المستندات'))
  // أول مرة، ومع أي تغيير في قايمة الأنواع فوق (نوع جديد أو اسم اتغيّر)
  useEffect(() => { load() }, [refreshKey])

  const save = async (type: DocTypeExpiry, body: Parameters<typeof updateDocTypeExpiry>[1]) => {
    setBusy(type.id)
    setError(null)
    try {
      await updateDocTypeExpiry(type.id, body)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإعداد')
    } finally {
      setBusy(null)
    }
  }
  // الأرقام العربية والفاصلة العربية مقبولين في الخانة
  const normalDays = (text: string) => text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[،؛\s]+/g, ',').replace(/^,|,$/g, '')

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  const types = data.types.filter((type) => type.isActive)

  return (
    <div className="card space-y-3" data-doc-type-expiry>
      <div>
        <h2 className="text-lg font-bold text-gray-800">انتهاء المستندات والتنبيهات</h2>
        <p className="text-sm text-gray-500">
          النوع اللي «له تاريخ انتهاء» تاريخه إلزامي. وقبل الانتهاء بأيام التنبيه: الموظف بيتبلّغ، ولو للنوع مسؤول بتتفتح عليه مهمة «تجديد مستند».
        </p>
      </div>
      {!data.ready && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">الإعدادات دي محتاجة ترحيل 20261007_099 على قاعدة البيانات. لحد ما يتطبق: التنبيه على 30 يوم ومن غير مهمة.</p>}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-gray-500 border-b border-gray-100">
              <th className="py-2 px-2 font-medium">نوع المستند</th>
              <th className="py-2 px-2 font-medium">له تاريخ انتهاء</th>
              <th className="py-2 px-2 font-medium">أيام التنبيه قبل الانتهاء</th>
              <th className="py-2 px-2 font-medium">المسؤول عن التجديد</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => {
              const locked = !canWrite || !data.ready || busy === type.id
              return (
                <tr key={type.id} className="border-b border-gray-50">
                  <td className="py-2 px-2 text-gray-800">{type.nameAr}</td>
                  <td className="py-2 px-2">
                    <input type="checkbox" aria-label={`${type.nameAr}: له تاريخ انتهاء`} checked={type.hasExpiry} disabled={locked}
                      onChange={(e) => save(type, { hasExpiry: e.target.checked })} />
                  </td>
                  <td className="py-2 px-2">
                    <input aria-label={`${type.nameAr}: أيام التنبيه`} value={days[type.id] ?? ''} disabled={locked} placeholder="30"
                      className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                      onChange={(e) => setDays((current) => ({ ...current, [type.id]: e.target.value }))}
                      onBlur={() => {
                        const next = normalDays(days[type.id] ?? '')
                        if (next !== type.alertDays.join(',')) save(type, { alertDays: next === '' ? null : next })
                      }} />
                  </td>
                  <td className="py-2 px-2">
                    <select aria-label={`${type.nameAr}: المسؤول عن التجديد`} value={type.ownerRole ?? ''} disabled={locked}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-sm" onChange={(e) => save(type, { ownerRole: e.target.value || null })}>
                      <option value="">من غير مهمة</option>
                      {data.roles.map((item) => <option key={item.role} value={item.role}>{item.label}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
