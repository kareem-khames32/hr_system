'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import {
  EMAIL_MODE_LABELS, fetchNotificationPreferences, setNotificationPreference,
  type ApiNotificationPreferences, type NotificationChannel, type NotificationMode,
} from '@/lib/notifications-api'

// B2.4: اختيارات المستخدم لإشعاراته في صفحة الإشعارات — لكل فئة: البريد (فورًا، ملخص يومي، مقفول)، وداخل النظام للفئات المخزّنة.
// الفئات اللي بتظهر كعدّاد محسوب (طلبات بانتظار اعتمادي، قرارات طلباتي) ظاهرة داخل النظام دايمًا ومالهاش اختيار.
const EMAIL_MODES: NotificationMode[] = ['ON', 'DIGEST', 'OFF']

export default function NotificationPreferences() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ApiNotificationPreferences | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setError('')
    fetchNotificationPreferences()
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل اختيارات الإشعارات'))
  }, [])
  useEffect(() => { if (open && !data) load() }, [open, data, load])

  const change = async (category: string, channel: NotificationChannel, mode: NotificationMode) => {
    setBusy(`${category}:${channel}`); setError('')
    try { setData(await setNotificationPreference(category, channel, mode)) } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الاختيار')
    } finally { setBusy('') }
  }

  return (
    <div className="card" data-notification-preferences>
      <button type="button" className="w-full flex items-center justify-between gap-3 text-right" aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <span className="flex items-center gap-2 font-semibold text-gray-800"><SlidersHorizontal size={18} className="text-primary-600" />اختيارات الإشعارات</span>
        <ChevronDown size={18} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
          {!data && !error && <p className="text-sm text-gray-400">جارٍ التحميل…</p>}
          {data && !data.available && (
            <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-notification-preferences-unavailable>
              اختيارات الإشعارات هتشتغل بعد تحديث قاعدة البيانات على السيرفر. الإشعارات داخل النظام شغالة زي ما هي.
            </div>
          )}
          {data?.available && (
            <>
              {!data.emailEnabled && (
                <p className="text-sm text-gray-500" data-notification-email-off>بريد الإشعارات مقفول على مستوى الشركة دلوقتي. اختيارك بيتحفظ وهيتطبق لما يتفتح.</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['الفئة', 'داخل النظام', 'البريد'].map(title => <th key={title} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.categories.map(category => (
                      <tr key={category.key} data-notification-category={category.key}>
                        <td className="px-3 py-2 font-medium text-gray-800">{category.label}</td>
                        <td className="px-3 py-2">
                          {category.inApp === null ? <span className="text-gray-500">ظاهرة دايمًا</span> : (
                            <label className="inline-flex items-center gap-2">
                              <input type="checkbox" checked={category.inApp !== 'OFF'} disabled={busy === `${category.key}:IN_APP`}
                                onChange={event => change(category.key, 'IN_APP', event.target.checked ? 'ON' : 'OFF')} />
                              <span>{category.inApp !== 'OFF' ? 'ظاهرة' : 'مقفولة'}</span>
                            </label>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select className="input w-40" aria-label={`بريد ${category.label}`} value={category.email} disabled={busy === `${category.key}:EMAIL`}
                            onChange={event => change(category.key, 'EMAIL', event.target.value as NotificationMode)}>
                            {EMAIL_MODES.map(mode => <option key={mode} value={mode}>{EMAIL_MODE_LABELS[mode]}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
