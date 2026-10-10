'use client'

// B-ADD.5: «الإعدادات ← قنوات الإشعارات» — شاشة واحدة بتبويبات: البريد، الواتساب، الأحداث والقوالب، مين ناقصه بيانات، سجل الإرسال.
// إعداد القنوات والأحداث لمدير النظام بس (الخادم هو اللي بيحكم). كلمة سر البريد وتوكن الواتساب بيتكتبوا هنا بس: الشاشة بتعرض «متسجّل» أو
// «مش متسجّل» ومابتعرضش القيمة أبدًا. القنوات مقفولة لحد ما تتضبط وتتفتح من هنا.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, Mail, MessageCircle, Search, Send } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { TemplateEditor } from '@/components/NotificationsAdminPanel'
import { can, getCurrentUser, updateConfig } from '@/lib/api'
import { branchScopeOfUser } from '@/lib/branch-scope'
import { formatDateTime } from '@/lib/dates'
import { DELIVERY_STATUS_LABELS, type ApiNotificationTemplates, type NotificationChannel, type NotificationDeliveryStatus } from '@/lib/notifications-api'
import {
  DELIVERY_CHANNEL_LABELS, TEMPLATE_LANGUAGE_LABELS, fetchMissingContacts, fetchNotificationChannels, fetchNotificationTemplatesIn, resetNotificationTemplateIn,
  saveEventChannels, saveMailChannel, saveNotificationTemplateIn, saveWhatsappChannel, searchNotificationDeliveries, testMailChannel, testWhatsappChannel,
  type ApiDeliverySearch, type ApiMissingContacts, type ApiNotificationChannels, type ChannelEvent, type ChannelTestResult, type DeliveryChannel, type DeliverySearch,
  type TemplateLanguage, type WhatsappBinding,
} from '@/lib/notification-channels-api'

type Tab = 'email' | 'whatsapp' | 'events' | 'missing' | 'log'
const TAB_LABELS: Record<Tab, string> = { email: 'البريد', whatsapp: 'الواتساب', events: 'الأحداث والقوالب', missing: 'مين ناقصه بيانات', log: 'سجل الإرسال' }
const STATUS_TONE: Record<NotificationDeliveryStatus, string> = {
  SENT: 'bg-green-50 text-green-700', PENDING: 'bg-blue-50 text-blue-700', DIGEST: 'bg-blue-50 text-blue-700', SKIPPED: 'bg-gray-100 text-gray-700', FAILED: 'bg-red-50 text-red-700',
}
const TEXT_CHANNELS: NotificationChannel[] = ['EMAIL', 'IN_APP']
const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback

function SecretState({ set, readable }: { set: boolean; readable: boolean }) {
  if (!set) return <span className="badge bg-gray-100 text-gray-700" data-secret-state="missing">مش متسجّل</span>
  if (!readable) return <span className="badge bg-amber-50 text-amber-800" data-secret-state="unreadable">متسجّل بس لازم يتكتب تاني (سر الخادم اتغيّر)</span>
  return <span className="badge bg-green-50 text-green-700" data-secret-state="set">متسجّل ✓</span>
}

function TestResult({ result }: { result: ChannelTestResult | null }) {
  if (!result) return null
  return (
    <div role="status" className={`rounded-xl p-3 text-sm ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`} data-channel-test-result={result.ok ? 'ok' : 'failed'}>
      {result.ok ? 'اتبعتت' : 'فشلت'} إلى <span dir="ltr" className="font-mono">{result.to}</span>
      {result.detail && <span className="block text-xs mt-1" dir="auto">{result.detail}</span>}
    </div>
  )
}

function MailTab({ data, onChange }: { data: ApiNotificationChannels; onChange: (next: ApiNotificationChannels) => void }) {
  const { email } = data
  const [form, setForm] = useState({ ...email.settings, enabled: email.enabled })
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [result, setResult] = useState<ChannelTestResult | null>(null)
  useEffect(() => { setForm({ ...email.settings, enabled: email.enabled }) }, [email.settings, email.enabled])

  const pickPreset = (preset: string) => {
    const chosen = email.presets[preset]
    setForm(current => ({ ...current, preset, ...(chosen?.host ? { host: chosen.host, port: chosen.port, encryption: chosen.encryption } : {}) }))
  }
  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true); setError(''); setSaved(false)
    try { await action() } catch (cause) { setError(message(cause, fallback)) } finally { setBusy(false) }
  }
  // كلمة السر بتتبعت لما تتكتب بس؛ الخانة الفاضية = المحفوظة زي ما هي
  const save = (clearPassword = false) => run(async () => {
    onChange(await saveMailChannel({ ...form, port: Number(form.port), ...(clearPassword ? { password: '' } : password ? { password } : {}) }))
    setPassword(''); setSaved(true)
  }, 'تعذر حفظ إعداد البريد')
  const toggleNotifications = () => run(async () => {
    await updateConfig('notifications.email.enabled', email.notificationsEnabled ? 'false' : 'true')
    onChange(await fetchNotificationChannels())
  }, 'تعذر تغيير مفتاح بريد الإشعارات')
  const sendTest = () => run(async () => { setResult(null); setResult(await testMailChannel(testTo.trim())) }, 'تعذر إرسال رسالة التجربة')

  return (
    <div className="space-y-4" data-channels-email>
      <div className="card space-y-2">
        <h2 className="font-semibold text-gray-800">الحالة دلوقتي</h2>
        <p className="text-sm text-gray-600" data-mail-active>
          {email.active.configured
            ? <>الخادم الشغال: <span dir="ltr" className="font-mono">{email.active.server}</span> — المرسل: <span dir="ltr" className="font-mono">{email.active.from}</span> — المصدر: {email.active.source === 'screen' ? 'الإعداد المحفوظ هنا' : 'إعداد السيرفر (api/.env)'}</>
            : 'مفيش خادم بريد مضبوط: لا من هنا ولا على السيرفر.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`badge ${email.notificationsEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`} data-mail-notifications={email.notificationsEnabled ? 'on' : 'off'}>
            رسايل الإشعارات بالبريد: {email.notificationsEnabled ? 'مفتوحة' : 'مقفولة'}
          </span>
          <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={toggleNotifications}>{email.notificationsEnabled ? 'اقفل بريد الإشعارات' : 'افتح بريد الإشعارات'}</button>
        </div>
        {!email.linkConfigured && <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">عنوان الواجهة (FRONTEND_URL) مش مضبوط على السيرفر: لينك الرسالة محتاجه، فرسايل الإشعارات هتتسجل «اتخطّت» لحد ما يتضبط.</p>}
        <p className="text-xs text-gray-500">رمز التحقق بخطوتين بيتبعت من نفس الخادم الشغال.</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">خادم البريد</h2>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {saved && <div role="status" className="bg-green-50 text-green-800 rounded-xl p-3 text-sm">اتحفظ.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">نوع الخادم
            <select className="input w-full mt-1" value={form.preset} onChange={event => pickPreset(event.target.value)}>
              {Object.entries(email.presets).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">التشفير
            <select className="input w-full mt-1" value={form.encryption} onChange={event => setForm(current => ({ ...current, encryption: event.target.value, port: event.target.value === 'SSL' ? 465 : 587 }))}>
              {Object.entries(email.encryptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm">الخادم
            <input className="input w-full mt-1" dir="ltr" value={form.host} placeholder="smtp.example.com" onChange={event => setForm(current => ({ ...current, host: event.target.value }))} />
          </label>
          <label className="block text-sm">المنفذ
            <input className="input w-full mt-1" dir="ltr" type="number" min={1} max={65535} value={form.port} onChange={event => setForm(current => ({ ...current, port: Number(event.target.value) }))} />
          </label>
          <label className="block text-sm">المستخدم
            <input className="input w-full mt-1" dir="ltr" autoComplete="off" value={form.user} onChange={event => setForm(current => ({ ...current, user: event.target.value }))} />
          </label>
          <div className="block text-sm">
            <span className="flex flex-wrap items-center gap-2">كلمة السر <SecretState set={email.passwordSet} readable={email.passwordReadable} /></span>
            <input className="input w-full mt-1" dir="ltr" type="password" autoComplete="new-password" aria-label="كلمة سر البريد" value={password}
              placeholder={email.passwordSet ? 'اكتب كلمة جديدة لو عايز تبدّلها' : 'كلمة سر التطبيق (App Password)'} onChange={event => setPassword(event.target.value)} />
            {email.passwordSet && <button type="button" className="text-xs text-red-600 underline mt-1" disabled={busy} onClick={() => save(true)}>امسح كلمة السر المحفوظة</button>}
          </div>
          <label className="block text-sm">اسم المرسل
            <input className="input w-full mt-1" value={form.fromName} maxLength={100} onChange={event => setForm(current => ({ ...current, fromName: event.target.value }))} />
          </label>
          <label className="block text-sm">عنوان المرسل
            <input className="input w-full mt-1" dir="ltr" type="email" value={form.fromAddress} placeholder="hr@example.com" onChange={event => setForm(current => ({ ...current, fromAddress: event.target.value }))} />
          </label>
        </div>
        <p className="text-xs text-gray-500">Microsoft 365 وGoogle Workspace بيملوا الخادم والمنفذ والتشفير. الدخول بمستخدم وكلمة سر تطبيق (App Password) من لوحة حسابك عندهم. الاتصال مشفّر دايمًا وشهادة الخادم بتتفحص.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={event => setForm(current => ({ ...current, enabled: event.target.checked }))} />
          استخدم الإعداد ده (بدل إعداد السيرفر)
        </label>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => save()} data-mail-save>حفظ</button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Send size={18} className="text-primary-600" />رسالة تجربة</h2>
        <p className="text-sm text-gray-500">بتتبعت بالخادم الشغال دلوقتي (احفظ الإعداد وفعّله الأول لو عايز تجرّبه).</p>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-[14rem]" dir="ltr" type="email" aria-label="عنوان رسالة التجربة" placeholder="you@example.com" value={testTo} onChange={event => setTestTo(event.target.value)} />
          <button type="button" className="btn-secondary" disabled={busy || !testTo.trim()} onClick={sendTest} data-mail-test>ابعت رسالة تجربة</button>
        </div>
        <TestResult result={result} />
      </div>
    </div>
  )
}

function WhatsappTab({ data, onChange }: { data: ApiNotificationChannels; onChange: (next: ApiNotificationChannels) => void }) {
  const { whatsapp } = data
  const bound = data.events.filter(event => event.whatsappTemplates.ar || event.whatsappTemplates.en)
  const [form, setForm] = useState({ ...whatsapp.settings, enabled: whatsapp.enabled })
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState({ to: '', eventCode: '', language: 'ar' as TemplateLanguage })
  const [result, setResult] = useState<ChannelTestResult | null>(null)
  useEffect(() => { setForm({ ...whatsapp.settings, enabled: whatsapp.enabled }) }, [whatsapp.settings, whatsapp.enabled])

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true); setError(''); setSaved(false)
    try { await action() } catch (cause) { setError(message(cause, fallback)) } finally { setBusy(false) }
  }
  const save = (clearToken = false) => run(async () => {
    onChange(await saveWhatsappChannel({ ...form, ...(clearToken ? { token: '' } : token ? { token } : {}) }))
    setToken(''); setSaved(true)
  }, 'تعذر حفظ إعداد الواتساب')
  const testEvent = test.eventCode || bound[0]?.code || ''
  const sendTest = () => run(async () => { setResult(null); setResult(await testWhatsappChannel(test.to.trim(), testEvent, test.language)) }, 'تعذر إرسال رسالة التجربة')
  const field = (key: 'phoneNumber' | 'phoneNumberId' | 'businessAccountId' | 'apiVersion' | 'defaultCountryCode', label: string, placeholder: string) => (
    <label className="block text-sm">{label}
      <input className="input w-full mt-1" dir="ltr" value={form[key]} placeholder={placeholder} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />
    </label>
  )

  return (
    <div className="space-y-4" data-channels-whatsapp>
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">مزوّد الواتساب</h2>
          <span className={`badge ${whatsapp.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`} data-whatsapp-state={whatsapp.enabled ? 'open' : 'closed'}>{whatsapp.enabled ? 'القناة مفتوحة' : 'القناة مقفولة'}</span>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {saved && <div role="status" className="bg-green-50 text-green-800 rounded-xl p-3 text-sm">اتحفظ.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">المزوّد
            <select className="input w-full mt-1" value={form.provider} onChange={event => setForm(current => ({ ...current, provider: event.target.value }))}>
              {Object.entries(whatsapp.providers).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {field('phoneNumber', 'رقم واتساب الشركة', '+966500000000')}
          {field('phoneNumberId', 'معرّف رقم الهاتف (Phone number ID)', 'من لوحة Meta')}
          {field('businessAccountId', 'معرّف حساب واتساب للأعمال (WABA ID)', 'من لوحة Meta')}
          {field('apiVersion', 'إصدار واجهة Meta', 'v21.0')}
          {field('defaultCountryCode', 'كود الدولة للأرقام المكتوبة محلي', '966')}
          <div className="block text-sm sm:col-span-2">
            <span className="flex flex-wrap items-center gap-2">التوكن <SecretState set={whatsapp.tokenSet} readable={whatsapp.tokenReadable} /></span>
            <input className="input w-full mt-1" dir="ltr" type="password" autoComplete="new-password" aria-label="توكن الواتساب" value={token}
              placeholder={whatsapp.tokenSet ? 'اكتب توكن جديد لو عايز تبدّله' : 'توكن دايم من Meta (System User Access Token)'} onChange={event => setToken(event.target.value)} />
            {whatsapp.tokenSet && <button type="button" className="text-xs text-red-600 underline mt-1" disabled={busy} onClick={() => save(true)}>امسح التوكن المحفوظ</button>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.fallbackToPhone} onChange={event => setForm(current => ({ ...current, fallbackToPhone: event.target.checked }))} />
          الموظف اللي مالوش رقم واتساب في ملفه: ابعت على رقم جواله
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={event => setForm(current => ({ ...current, enabled: event.target.checked }))} />
          افتح قناة الواتساب
        </label>
        <p className="text-xs text-gray-500">Meta بتسمح للشركة تبدأ الرسالة بقالب معتمد بس: اربط قالب كل حدث من تبويب «الأحداث والقوالب» وافتح الواتساب للحدث. الحدث اللي من غير قالب مابيتبعتش على الواتساب.</p>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => save()} data-whatsapp-save>حفظ</button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Send size={18} className="text-primary-600" />رسالة تجربة</h2>
        {bound.length === 0 ? <p className="text-sm text-gray-500">اربط قالب واتساب بحدث واحد على الأقل من «الأحداث والقوالب»، وبعدين ابعت التجربة بقالبه.</p> : (
          <>
            <p className="text-sm text-gray-500">بتتبعت بقالب الحدث المختار وقيم توضيحية (مش بيانات حقيقية)، حتى والقناة لسه مقفولة.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className="input" dir="ltr" aria-label="رقم رسالة التجربة" placeholder="+966500000000" value={test.to} onChange={event => setTest(current => ({ ...current, to: event.target.value }))} />
              <select className="input" aria-label="حدث رسالة التجربة" value={testEvent} onChange={event => setTest(current => ({ ...current, eventCode: event.target.value }))}>
                {bound.map(event => <option key={event.code} value={event.code}>{event.label}</option>)}
              </select>
              <select className="input" aria-label="لغة قالب التجربة" value={test.language} onChange={event => setTest(current => ({ ...current, language: event.target.value as TemplateLanguage }))}>
                {whatsapp.languages.map(language => <option key={language} value={language}>{TEMPLATE_LANGUAGE_LABELS[language]}</option>)}
              </select>
            </div>
            <button type="button" className="btn-secondary" disabled={busy || !test.to.trim()} onClick={sendTest} data-whatsapp-test>ابعت رسالة تجربة</button>
          </>
        )}
        <TestResult result={result} />
      </div>
    </div>
  )
}

function BindingEditor({ event, language, onSave, busy }: { event: ChannelEvent; language: TemplateLanguage; busy: boolean; onSave: (binding: WhatsappBinding | null) => void }) {
  const current = event.whatsappTemplates[language]
  const [templateName, setTemplateName] = useState(current?.templateName ?? '')
  const [languageCode, setLanguageCode] = useState(current?.languageCode ?? (language === 'en' ? 'en_US' : 'ar'))
  const [variables, setVariables] = useState<string[]>(current?.variables ?? [])
  useEffect(() => {
    setTemplateName(current?.templateName ?? ''); setLanguageCode(current?.languageCode ?? (language === 'en' ? 'en_US' : 'ar')); setVariables(current?.variables ?? [])
  }, [current, language])
  const labelOf = (key: string) => event.variables.find(variable => variable.key === key)?.label ?? key

  return (
    <div className="rounded-xl border border-gray-100 p-3 space-y-2" data-whatsapp-binding={`${event.code}:${language}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-gray-700">قالب الواتساب ({TEMPLATE_LANGUAGE_LABELS[language]})</span>
        {current ? <span className="badge bg-green-50 text-green-700">مربوط</span> : <span className="badge bg-gray-100 text-gray-700">من غير قالب</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className="input" dir="ltr" aria-label="اسم القالب عند Meta" placeholder="اسم القالب عند Meta (approval_pending)" value={templateName} onChange={change => setTemplateName(change.target.value)} />
        <input className="input" dir="ltr" aria-label="كود لغة القالب" placeholder="ar أو en_US" value={languageCode} onChange={change => setLanguageCode(change.target.value)} />
      </div>
      <p className="text-xs text-gray-500">المتغيرات بترتيبها في نص القالب عند Meta: الأول بياخد مكان {'{{1}}'}، والتاني {'{{2}}'}…</p>
      <ol className="space-y-1 text-sm">
        {variables.map((key, index) => (
          <li key={`${key}:${index}`} className="flex items-center gap-2">
            <span className="badge bg-gray-100 text-gray-700" dir="ltr">{`{{${index + 1}}}`}</span>
            <span>{labelOf(key)}</span>
            <button type="button" className="text-xs text-red-600 underline" onClick={() => setVariables(list => list.filter((_item, at) => at !== index))}>شيل</button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-1">
        {event.variables.map(variable => (
          <button key={variable.key} type="button" className="badge bg-gray-100 text-gray-700 hover:bg-gray-200" title={`مثال: ${variable.sample}`} onClick={() => setVariables(list => [...list, variable.key])}>
            + {variable.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-xs" disabled={busy || !templateName.trim()} onClick={() => onSave({ templateName: templateName.trim(), languageCode: languageCode.trim(), variables })}>حفظ الربط</button>
        {current && <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => onSave(null)}>شيل الربط</button>}
      </div>
    </div>
  )
}

function EventsTab({ data, onChange }: { data: ApiNotificationChannels; onChange: (next: ApiNotificationChannels) => void }) {
  const [language, setLanguage] = useState<TemplateLanguage>('ar')
  const [templates, setTemplates] = useState<ApiNotificationTemplates | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setTemplates(null)
    fetchNotificationTemplatesIn(language).then(setTemplates).catch(cause => setError(message(cause, 'تعذر تحميل قوالب الإشعارات')))
  }, [language])

  const save = async (event: ChannelEvent, change: Partial<Pick<ChannelEvent, 'inApp' | 'email' | 'whatsapp' | 'mandatory'>>, binding?: WhatsappBinding | null) => {
    setBusy(event.code); setError('')
    try {
      onChange(await saveEventChannels(event.code, { inApp: event.inApp, email: event.email, whatsapp: event.whatsapp, mandatory: event.mandatory, ...change,
        ...(binding !== undefined ? { whatsappTemplates: { [language]: binding } } : {}) }))
    } catch (cause) { setError(message(cause, 'تعذر حفظ قنوات الحدث')) } finally { setBusy('') }
  }
  const toggle = (event: ChannelEvent, key: 'inApp' | 'email' | 'whatsapp' | 'mandatory', label: string) => (
    <input type="checkbox" aria-label={`${label} — ${event.label}`} checked={event[key]} disabled={busy === event.code} onChange={change => save(event, { [key]: change.target.checked })} />
  )

  return (
    <div className="card space-y-4" data-channels-events>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-800">الأحداث وقنواتها</h2>
        <label className="text-sm flex items-center gap-2">لغة القوالب
          <select className="input w-32" value={language} onChange={event => setLanguage(event.target.value as TemplateLanguage)}>
            {data.whatsapp.languages.map(code => <option key={code} value={code}>{TEMPLATE_LANGUAGE_LABELS[code]}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm text-gray-500">
        كل حدث بيطلع على القنوات المعلّمة له. البريد لازم يكون مفتوح من تبويب «البريد»، والواتساب من تبويب «الواتساب» وبقالب مربوط. «إلزامي» = الموظف مايقدرش يقفله لنفسه.
        الرسايل من غير مبالغ ومن غير محتوى طلب سري. {language === 'en' && 'النص الإنجليزي بيوصل للي لغة حسابه إنجليزي؛ ومن غيره بيوصله العربي.'}
      </p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-event-channel-matrix>
          <thead className="bg-gray-50">
            <tr>{['الحدث', 'داخل النظام', 'البريد', 'الواتساب', 'إلزامي', ''].map((title, index) => <th key={index} className="px-3 py-2 text-start font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.events.map(event => {
              const template = templates?.events.find(item => item.code === event.code)
              return (
                <tr key={event.code} data-event-row={event.code} className="align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-800">{event.label}</span>
                    <span className="block text-xs text-gray-500">{event.category}</span>
                    {open === event.code && (
                      <div className="mt-3 grid gap-3 lg:grid-cols-2 min-w-[18rem]">
                        <BindingEditor event={event} language={language} busy={busy === event.code} onSave={binding => save(event, {}, binding)} />
                        {template && templates && TEXT_CHANNELS.map(channel => (
                          <TemplateEditor key={`${channel}:${language}`} event={template} channel={channel} onSaved={setTemplates}
                            channelLabel={channel === 'IN_APP' && !event.storedInApp ? 'السطر المختصر (الملخص اليومي)' : templates.channels[channel]}
                            save={text => saveNotificationTemplateIn(event.code, channel, language, text)} reset={() => resetNotificationTemplateIn(event.code, channel, language)} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{event.storedInApp ? toggle(event, 'inApp', 'داخل النظام') : <span className="text-gray-500 text-xs">دايمًا (عدّاد محسوب)</span>}</td>
                  <td className="px-3 py-2">{toggle(event, 'email', 'البريد')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {toggle(event, 'whatsapp', 'الواتساب')}
                    {event.whatsapp && !event.whatsappTemplates.ar && !event.whatsappTemplates.en && <span className="block text-xs text-amber-700">من غير قالب: مش هيتبعت</span>}
                  </td>
                  <td className="px-3 py-2">{toggle(event, 'mandatory', 'إلزامي')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button type="button" className="text-primary-600 underline text-xs" aria-expanded={open === event.code} onClick={() => setOpen(current => current === event.code ? null : event.code)}>
                      {open === event.code ? 'اقفل القوالب' : 'القوالب'}
                    </button>
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

function MissingTab() {
  const [data, setData] = useState<ApiMissingContacts | null>(null)
  const [error, setError] = useState('')
  const [only, setOnly] = useState<'all' | 'noEmail' | 'noWhatsapp' | 'noAccount'>('all')
  useEffect(() => { fetchMissingContacts().then(setData).catch(cause => setError(message(cause, 'تعذر تحميل القايمة'))) }, [])
  const rows = (data?.rows ?? []).filter(row => only === 'all' || row[only])

  return (
    <div className="card space-y-4" data-channels-missing>
      <h2 className="font-semibold text-gray-800">مين ناقصه بيانات</h2>
      <p className="text-sm text-gray-500">الموظفين الحاليين في فروعك اللي مش هتوصلهم رسالة على قناة: من غير حساب دخول شغال، أو من غير بريد، أو من غير رقم واتساب. الرقم بيتكتب من ملف الموظف.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {!data && !error && <p className="text-sm text-gray-400">جارٍ التحميل…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-missing-counts>
            {([['all', 'موظفين حاليين', data.counts.employees], ['noAccount', 'من غير حساب دخول', data.counts.noAccount], ['noEmail', 'من غير بريد', data.counts.noEmail],
              ['noWhatsapp', 'من غير رقم واتساب', data.counts.noWhatsapp]] as const).map(([key, label, count]) => (
              <button key={key} type="button" onClick={() => setOnly(key)} className={`rounded-xl p-3 text-start bg-gray-50 ${only === key ? 'ring-2 ring-primary-500' : ''}`}>
                <span className="block text-xs text-gray-500">{label}</span>
                <span className="text-xl font-bold text-gray-800">{count}</span>
              </button>
            ))}
          </div>
          {data.fallbackToPhone && <p className="text-xs text-gray-500">الواتساب بيتبعت على رقم الجوال للي مالوش رقم واتساب، فاللي جواله صالح مش محسوب ناقص.</p>}
          {rows.length === 0 ? <p className="text-sm text-gray-500">مفيش حد ناقصه حاجة هنا.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['الموظف', 'الفرع', 'الناقص'].map(title => <th key={title} className="px-3 py-2 text-start font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2"><Link href={`/employees/${row.id}`} className="text-primary-600 hover:underline">{row.fullName}</Link><span className="block text-xs text-gray-500" dir="ltr">{row.employeeCode}</span></td>
                      <td className="px-3 py-2">{row.branchName ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="flex flex-wrap gap-1">
                          {row.noAccount && <span className="badge bg-red-50 text-red-700">حساب دخول</span>}
                          {row.noEmail && <span className="badge bg-amber-50 text-amber-800">بريد</span>}
                          {row.noWhatsapp && <span className="badge bg-amber-50 text-amber-800">رقم واتساب</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.rows.length >= data.limit && <p className="text-xs text-gray-500">معروض أول {data.limit} اسم؛ العدّ فوق لكل الموظفين.</p>}
        </>
      )}
    </div>
  )
}

function LogTab() {
  // قايمة الأحداث للفلتر من مسار القوالب (نفس صلاحية السجل)
  const [events, setEvents] = useState<Array<{ code: string; label: string }>>([])
  useEffect(() => { fetchNotificationTemplatesIn('ar').then(templates => setEvents(templates.events)).catch(() => setEvents([])) }, [])
  const [search, setSearch] = useState<DeliverySearch>({ page: 1 })
  const [applied, setApplied] = useState<DeliverySearch>({ page: 1 })
  const [data, setData] = useState<ApiDeliverySearch | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setError('')
    searchNotificationDeliveries(applied).then(setData).catch(cause => setError(message(cause, 'تعذر تحميل سجل الإرسال')))
  }, [applied])
  const set = (change: Partial<DeliverySearch>) => setSearch(current => ({ ...current, ...change }))
  const pages = data?.total && data.pageSize ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const page = data?.page ?? 1

  return (
    <div className="card space-y-4" data-channels-log>
      <h2 className="font-semibold text-gray-800">سجل الإرسال</h2>
      <p className="text-sm text-gray-500">كل رسالة: لمين، وعلى أنهي قناة، واتبعتت ولا لأ، والسبب. من غير نص الرسالة، والعنوان والرقم متخفيين، ومستلم الطلب السري مخفي.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      <form className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2" data-log-filters onSubmit={event => { event.preventDefault(); setApplied({ ...search, page: 1 }) }}>
        <select className="input" aria-label="القناة" value={search.channel ?? ''} onChange={event => set({ channel: event.target.value as DeliveryChannel | '' })}>
          <option value="">كل القنوات</option>
          {(Object.keys(DELIVERY_CHANNEL_LABELS) as DeliveryChannel[]).map(channel => <option key={channel} value={channel}>{DELIVERY_CHANNEL_LABELS[channel]}</option>)}
        </select>
        <select className="input" aria-label="الحالة" value={search.status ?? ''} onChange={event => set({ status: event.target.value as NotificationDeliveryStatus | '' })}>
          <option value="">كل الحالات</option>
          {(Object.keys(DELIVERY_STATUS_LABELS) as NotificationDeliveryStatus[]).map(status => <option key={status} value={status}>{DELIVERY_STATUS_LABELS[status]}</option>)}
        </select>
        <select className="input" aria-label="الحدث" value={search.event ?? ''} onChange={event => set({ event: event.target.value })}>
          <option value="">كل الأحداث</option>
          {events.map(event => <option key={event.code} value={event.code}>{event.label}</option>)}
        </select>
        <input className="input" aria-label="اسم المستلم" placeholder="اسم المستلم" value={search.recipient ?? ''} onChange={event => set({ recipient: event.target.value })} />
        <input className="input" type="date" aria-label="من تاريخ" value={search.from ?? ''} onChange={event => set({ from: event.target.value })} />
        <input className="input" type="date" aria-label="إلى تاريخ" value={search.to ?? ''} onChange={event => set({ to: event.target.value })} />
        <button type="submit" className="btn-primary flex items-center justify-center gap-1 sm:col-span-3 lg:col-span-6"><Search size={16} />بحث</button>
      </form>
      {data && !data.available && <div className="bg-amber-50 text-amber-900 rounded-xl p-3 text-sm">سجل الإرسال هيشتغل بعد تحديث قاعدة البيانات على السيرفر.</div>}
      {data?.available && (
        <>
          <p className="text-xs text-gray-500" data-log-total>{data.total ?? data.rows.length} رسالة</p>
          {data.rows.length === 0 ? <p className="text-sm text-gray-500">مفيش رسائل بالبحث ده.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-log-rows>
                <thead className="bg-gray-50">
                  <tr>{['الحدث', 'المستلم', 'القناة', 'الحالة', 'السبب', 'إمتى'].map(title => <th key={title} className="px-3 py-2 text-start font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{row.event}</td>
                      <td className="px-3 py-2">
                        {row.recipientUserId === null ? <span className="text-gray-500">مخفي (طلب سري)</span> : row.recipientName ?? `حساب #${row.recipientUserId}`}
                        {row.address && <span className="block text-xs text-gray-500 font-mono" dir="ltr">{row.address}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{DELIVERY_CHANNEL_LABELS[row.channel] ?? row.channel}</td>
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
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setApplied(current => ({ ...current, page: page - 1 }))}>السابق</button>
              <span>صفحة {page} من {pages}</span>
              <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => setApplied(current => ({ ...current, page: page + 1 }))}>التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function NotificationChannelsPage() {
  const [data, setData] = useState<ApiNotificationChannels | null>(null)
  const [error, setError] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [tab, setTab] = useState<Tab>('log')
  const [admin, setAdmin] = useState(false)

  const load = useCallback(() => {
    fetchNotificationChannels().then(setData).catch(cause => setError(message(cause, 'تعذر تحميل قنوات الإشعارات')))
  }, [])
  useEffect(() => {
    // نفس حكم الخادم: الإعداد لمدير النظام بس؛ وسجل الإرسال لصاحب «إدارة الإعدادات» على كل الفروع؛ والناقص لمين يشوف الموظفين
    const user = getCurrentUser()
    const isAdmin = user?.role === 'super_admin' || (user?.permissions ?? []).includes('*')
    const allowed: Tab[] = [...(isAdmin ? ['email', 'whatsapp', 'events'] as Tab[] : []), ...(can('employees.view') ? ['missing'] as Tab[] : []),
      ...(can('settings.manage') && branchScopeOfUser(user) === null ? ['log'] as Tab[] : [])]
    setAdmin(isAdmin); setTabs(allowed); setTab(allowed[0] ?? 'log')
    if (isAdmin) load()
  }, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">← الإعدادات</Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2"><BellRing size={24} className="text-primary-600" />قنوات الإشعارات</h1>
          <p className="text-gray-500 mt-1">البريد والواتساب: إعدادهم، وأنهي حدث يطلع على أنهي قناة، ومين ناقصه رقم أو بريد، وسجل كل رسالة. القنوات مقفولة لحد ما تتضبط وتتفتح من هنا.</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {!admin && tabs.length > 0 && <div className="card text-gray-600" data-channels-admin-only>إعداد البريد والواتساب وقنوات الأحداث لمدير النظام بس.</div>}
        {tabs.length === 0 && <div className="card text-gray-600">الشاشة دي لمدير النظام.</div>}
        {admin && data && !data.available && (
          <div className="card text-amber-800 bg-amber-50" data-channels-unavailable>قنوات الإشعارات هتشتغل بعد تطبيق ترحيل 187 على قاعدة البيانات. لحد كده البريد بإعداد السيرفر زي ما هو، والواتساب مقفول.</div>
        )}
        {tabs.length > 0 && (
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map(key => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} data-channels-tab={key}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1 ${tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {key === 'email' && <Mail size={16} />}{key === 'whatsapp' && <MessageCircle size={16} />}{TAB_LABELS[key]}
              </button>
            ))}
          </div>
        )}
        {tab === 'email' && admin && data?.available && <MailTab data={data} onChange={setData} />}
        {tab === 'whatsapp' && admin && data?.available && <WhatsappTab data={data} onChange={setData} />}
        {tab === 'events' && admin && data?.available && <EventsTab data={data} onChange={setData} />}
        {tab === 'missing' && tabs.includes('missing') && <MissingTab />}
        {tab === 'log' && tabs.includes('log') && <LogTab />}
      </div>
    </MainLayout>
  )
}
