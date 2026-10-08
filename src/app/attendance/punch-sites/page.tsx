'use client'

// B5.6: «بصمة الموبايل» — مواقع البصمة لكل فرع (التعديل بصلاحية إدارة الحضور في نطاق الفرع)، وآخر محاولات الموظفين المقبولة والمرفوضة بسببها.
// ميزة attendance.mobile_punch (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Site { id: number; name: string; branchId: number; latitude: number; longitude: number; radiusMeters: number; isActive: boolean }
interface Sites { ready: boolean; branches: Array<{ id: number; name: string }>; sites: Site[] }
interface AttemptRow { id: number; employeeName: string; employeeCode: string | null; siteName: string | null; accuracyMeters: number; distanceMeters: number | null; outcome: string; outcomeLabel: string; at: string }
const B = '/attendance/mobile-punch'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const emptySite = () => ({ id: null as number | null, name: '', branchId: '', latitude: '', longitude: '', radiusMeters: '150', isActive: true })

export default function PunchSitesPage() {
  // الأزرار من الخادم: رد المحاولات بيقول هل الحساب يدير المواقع
  const [manage, setManage] = useState(false)
  const [data, setData] = useState<Sites | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptySite())

  const load = useCallback(() => {
    apiFetch<{ ready: boolean; canManage: boolean; rows: AttemptRow[] }>(`${B}/attempts`).then((result) => {
      setAttempts(result.rows); setManage(result.canManage)
      if (result.canManage) apiFetch<Sites>(`${B}/sites`).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل مواقع البصمة'))
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل محاولات البصمة'))
  }, [])
  useEffect(load, [load])

  async function save() {
    const latitude = Number(form.latitude), longitude = Number(form.longitude), radiusMeters = Number(form.radiusMeters)
    if (form.name.trim().length < 2 || !form.branchId || form.latitude.trim() === '' || form.longitude.trim() === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isInteger(radiusMeters)) {
      return setError('اكتب الاسم واختار الفرع واكتب الإحداثيات ونصف القطر')
    }
    setBusy(true); setError(''); setInfo('')
    const body = { name: form.name.trim(), branchId: Number(form.branchId), latitude, longitude, radiusMeters, isActive: form.isActive }
    try {
      await apiFetch(form.id === null ? `${B}/sites` : `${B}/sites/${form.id}`, json(form.id === null ? 'POST' : 'PATCH', body))
      setForm(emptySite()); setInfo('اتحفظ الموقع'); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  const branchName = (id: number) => data?.branches.find((row) => row.id === id)?.name ?? `فرع #${id}`

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin size={24} className="text-primary-600" />
            بصمة الموبايل
          </h1>
          <p className="text-gray-500 mt-1">مواقع البصمة لكل فرع ونصف قطرها، ومحاولات الموظفين. البصمة المقبولة بتدخل سجل الحضور زي بصمة الجهاز.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول بصمة الموبايل لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 167 و168).</div>}

        {manage && data?.ready && (
          <div className="card space-y-3" data-punch-sites>
            <h2 className="text-lg font-semibold text-gray-800">مواقع البصمة</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-start">الموقع</th>
                    <th className="table-header text-start">الفرع</th>
                    <th className="table-header text-center">الإحداثيات</th>
                    <th className="table-header text-center">نصف القطر</th>
                    <th className="table-header text-center">الحالة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {data.sites.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-500">مفيش مواقع لسه.</td></tr>}
                  {data.sites.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.name}</td>
                      <td className="table-cell">{branchName(row.branchId)}</td>
                      <td className="table-cell text-center font-mono" dir="ltr">{row.latitude}, {row.longitude}</td>
                      <td className="table-cell text-center">{row.radiusMeters} متر</td>
                      <td className="table-cell text-center">{row.isActive ? 'مفعّل' : <span className="text-gray-400">مقفول</span>}</td>
                      <td className="table-cell text-end"><button type="button" className="text-primary-600 text-xs"
                        onClick={() => setForm({ id: row.id, name: row.name, branchId: String(row.branchId), latitude: String(row.latitude), longitude: String(row.longitude), radiusMeters: String(row.radiusMeters), isActive: row.isActive })}>تعديل</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-punch-site-form>
              <label className="flex-1 min-w-44 text-sm text-gray-600">{form.id === null ? 'موقع جديد' : 'تعديل الموقع'}
                <input className="input w-full mt-1" maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">الفرع
                <select className="input mt-1" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
                  <option value="">اختار</option>
                  {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">خط العرض
                <input className="input mt-1 w-32 text-center" dir="ltr" inputMode="decimal" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">خط الطول
                <input className="input mt-1 w-32 text-center" dir="ltr" inputMode="decimal" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">نصف القطر (متر)
                <input className="input mt-1 w-24 text-center" dir="ltr" inputMode="numeric" value={form.radiusMeters} onChange={(event) => setForm({ ...form, radiusMeters: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />مفعّل</label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={save}>حفظ</button>
              {form.id !== null && <button type="button" className="btn-secondary" onClick={() => setForm(emptySite())}>إلغاء</button>}
            </div>
          </div>
        )}

        <div className="card space-y-3" data-punch-attempts>
          <h2 className="text-lg font-semibold text-gray-800">آخر المحاولات</h2>
          {attempts.length === 0 ? <p className="text-gray-500">مفيش محاولات لسه.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-start">الموظف</th>
                    <th className="table-header text-center">الوقت</th>
                    <th className="table-header text-center">النتيجة</th>
                    <th className="table-header text-start">الموقع</th>
                    <th className="table-header text-center">المسافة</th>
                    <th className="table-header text-center">الدقة</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.employeeName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                      <td className="table-cell text-center" dir="ltr">{new Date(row.at).toLocaleString('ar-EG')}</td>
                      <td className={`table-cell text-center ${row.outcome === 'ACCEPTED' ? 'text-green-700' : 'text-red-700'}`}>{row.outcomeLabel}</td>
                      <td className="table-cell">{row.siteName ?? '—'}</td>
                      <td className="table-cell text-center">{row.distanceMeters === null ? '—' : `${row.distanceMeters} متر`}</td>
                      <td className="table-cell text-center">{row.accuracyMeters} متر</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
