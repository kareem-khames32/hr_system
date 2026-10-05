'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mail, RotateCcw, Save } from 'lucide-react'
import {
  DELIVERY_STATUS_LABELS, fetchNotificationDeliveries, fetchNotificationTemplates, resetNotificationTemplate, saveNotificationTemplate,
  type ApiNotificationDeliveries, type ApiNotificationEvent, type ApiNotificationTemplates, type NotificationChannel, type NotificationDeliveryStatus,
} from '@/lib/notifications-api'
import { formatDateTime } from '@/lib/dates'

// B2.4: الإشعارات تحت «المهام المجدولة» (حساب الشركة بصلاحية «إدارة الإعدادات») — سجل الإرسال بحالة كل رسالة وسببها،
// وتعديل نص كل قالب بمتغيراته والرجوع للافتراضي. فتح البريد وساعات الهدوء وساعة الملخص من «سياسات النظام».
const STATUS_ORDER: NotificationDeliveryStatus[] = ['SENT', 'PENDING', 'DIGEST', 'SKIPPED', 'FAILED']
const STATUS_TONE: Record<NotificationDeliveryStatus, string> = {
  SENT: 'bg-green-50 text-green-700',
  PENDING: 'bg-blue-50 text-blue-700',
  DIGEST: 'bg-blue-50 text-blue-700',
  SKIPPED: 'bg-gray-100 text-gray-700',
  FAILED: 'bg-red-50 text-red-700',
}
const CHANNELS: NotificationChannel[] = ['EMAIL', 'IN_APP']

function TemplateEditor({ event, channel, channelLabel, onSaved }: { event: ApiNotificationEvent; channel: NotificationChannel; channelLabel: string;
  onSaved: (data: ApiNotificationTemplates) => void }) {
  const template = event.templates[channel]
  const [title, setTitle] = useState(template.title)
  const [body, setBody] = useState(template.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { setTitle(template.title); setBody(template.body); setError('') }, [template.title, template.body])
  const dirty = title !== template.title || body !== template.body

  // إدراج المتغير مكان المؤشر في النص
  const insert = (key: string) => {
    const token = `{{${key}}}`
    const field = bodyRef.current
    const at = field ? field.selectionStart : body.length
    setBody(`${body.slice(0, at)}${token}${body.slice(field ? field.selectionEnd : at)}`)
  }
  const run = async (action: () => Promise<ApiNotificationTemplates>, fallback: string) => {
    setBusy(true); setError('')
    try { onSaved(await action()) } catch (cause) { setError(cause instanceof Error ? cause.message : fallback) } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3 space-y-2" data-notification-template={`${event.code}:${channel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-gray-700">{channelLabel}</span>
        {template.customized && <span className="badge bg-amber-50 text-amber-800">نص معدَّل</span>}
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-2 text-xs">{error}</div>}
      <input className="input w-full" aria-label={`عنوان ${event.label} — ${channelLabel}`} value={title} maxLength={300} onChange={change => setTitle(change.target.value)} />
      <textarea ref={bodyRef} className="input w-full h-32" aria-label={`نص ${event.label} — ${channelLabel}`} value={body} maxLength={2000} onChange={change => setBody(change.target.value)} />
      <div className="flex flex-wrap gap-1" data-notification-variables>
        {event.variables.map(variable => (
          <button key={variable.key} type="button" className="badge bg-gray-100 text-gray-700 hover:bg-gray-200" title={`مثال: ${variable.sample}`} onClick={() => insert(variable.key)}>
            {variable.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex items-center gap-1 text-xs" disabled={busy || !dirty}
          onClick={() => run(() => saveNotificationTemplate(event.code, channel, { title, body }), 'تعذر حفظ القالب')}>
          <Save size={14} />حفظ
        </button>
        {template.customized && (
          <button type="button" className="btn-secondary flex items-center gap-1 text-xs" disabled={busy}
            onClick={() => run(() => resetNotificationTemplate(event.code, channel), 'تعذر الرجوع للنص الافتراضي')}>
            <RotateCcw size={14} />النص الافتراضي
          </button>
        )}
      </div>
    </div>
  )
}

export default function NotificationsAdminPanel() {
  const [deliveries, setDeliveries] = useState<ApiNotificationDeliveries | null>(null)
  const [templates, setTemplates] = useState<ApiNotificationTemplates | null>(null)
  const [status, setStatus] = useState<NotificationDeliveryStatus | ''>('')
  const [openEvent, setOpenEvent] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadDeliveries = useCallback(() => {
    setError('')
    fetchNotificationDeliveries(status)
      .then(setDeliveries)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل الإرسال'))
  }, [status])
  useEffect(loadDeliveries, [loadDeliveries])
  useEffect(() => {
    fetchNotificationTemplates()
      .then(setTemplates)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل قوالب الإشعارات'))
  }, [])

  return (
    <div className="card space-y-4" data-notifications-admin>
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Mail size={20} className="text-primary-600" />الإشعارات</h2>
      <p className="text-sm text-gray-500">كل رسالة النظام بعتها أو اتخطّاها، بحالتها وسببها. البريد من غير مبالغ ومن غير محتوى الطلب، وعنوان المستلم متخفي.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {deliveries && !deliveries.available && (
        <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-notifications-unavailable>
          محرك الإشعارات هيشتغل بعد تطبيق ترحيل 087 على السيرفر. لحد كده مفيش بريد بيتبعت، وقايمة الإشعارات داخل النظام شغالة زي ما هي.
        </div>
      )}
      {deliveries?.available && (
        <>
          {!deliveries.emailEnabled && (
            <div className="bg-gray-50 text-gray-700 rounded-xl p-3 text-sm" data-notifications-email-off>
              بريد الإشعارات مقفول. بيتفتح من «سياسات النظام» ← «الإشعارات».
            </div>
          )}
          {deliveries.emailEnabled && !deliveries.mailConfigured && (
            <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-notifications-mail-missing>
              بريد الإشعارات مفتوح بس خادم البريد مش مضبوط على السيرفر، فالرسائل بتتسجل «اتخطّت».
            </div>
          )}
          {deliveries.emailEnabled && deliveries.mailConfigured && !deliveries.linkConfigured && (
            <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm" data-notifications-link-missing>
              بريد الإشعارات مفتوح بس عنوان الواجهة (FRONTEND_URL) مش مضبوط على السيرفر، فلينك الرسالة مش هيشتغل والرسائل بتتسجل «اتخطّت».
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-notification-counts>
            {STATUS_ORDER.map(key => (
              <button key={key} type="button" onClick={() => setStatus(current => current === key ? '' : key)}
                className={`rounded-xl p-3 text-right ${status === key ? 'ring-2 ring-primary-500' : ''} ${key === 'FAILED' && (deliveries.counts.FAILED ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <span className="block text-xs text-gray-500">بريد: {DELIVERY_STATUS_LABELS[key]} (30 يوم)</span>
                <span className="text-xl font-bold text-gray-800">{deliveries.counts[key] ?? 0}</span>
              </button>
            ))}
          </div>
          {deliveries.rows.length === 0 ? <p className="text-sm text-gray-500">مفيش رسائل{status ? ' بالحالة دي' : ' لسه'}.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-notification-deliveries>
                <thead className="bg-gray-50">
                  <tr>{['الحدث', 'المستلم', 'القناة', 'الحالة', 'السبب', 'إمتى'].map(title => <th key={title} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deliveries.rows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{row.event}</td>
                      <td className="px-3 py-2">
                        {row.recipientUserId === null ? <span className="text-gray-500">مخفي (طلب سري)</span> : row.recipientName ?? `حساب #${row.recipientUserId}`}
                        {row.address && <span className="block text-xs text-gray-500 font-mono" dir="ltr">{row.address}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{templates?.channels[row.channel] ?? row.channel}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`badge ${STATUS_TONE[row.status] ?? 'bg-gray-100 text-gray-700'}`}>{DELIVERY_STATUS_LABELS[row.status] ?? row.status}</span>
                        {row.attempts > 1 && <span className="block text-xs text-gray-500">{row.attempts} محاولات</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-md">{row.detail ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600" dir="ltr">{formatDateTime(row.sentAt ?? row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {templates?.available && (
        <div className="space-y-2" data-notification-templates>
          <h3 className="font-semibold text-gray-800">نصوص الإشعارات</h3>
          <p className="text-sm text-gray-500">اضغط على المتغير عشان يتحط في النص. المتغير بيتبدّل بقيمته وقت الإرسال.</p>
          {templates.events.map(event => (
            <div key={event.code} className="rounded-xl bg-gray-50 p-3">
              <button type="button" className="w-full flex items-center justify-between gap-3 text-right" aria-expanded={openEvent === event.code}
                onClick={() => setOpenEvent(current => current === event.code ? null : event.code)}>
                <span className="font-medium text-gray-800">{event.label}<span className="text-xs text-gray-500 mr-2">{event.category}</span></span>
                {CHANNELS.some(channel => event.templates[channel].customized) && <span className="badge bg-amber-50 text-amber-800">معدَّل</span>}
              </button>
              {openEvent === event.code && (
                <div className="mt-3 grid gap-3 lg:grid-cols-2 bg-white rounded-xl p-3">
                  {CHANNELS.map(channel => (
                    <TemplateEditor key={channel} event={event} channel={channel} onSaved={setTemplates}
                      channelLabel={channel === 'IN_APP' && !event.storedInApp ? 'السطر المختصر (الملخص اليومي)' : templates.channels[channel]} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
