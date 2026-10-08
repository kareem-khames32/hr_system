'use client'

// B6.3 (أ): «التكاملات» — مفاتيح الـAPI العام (/api/public/v1) لأنظمة خارجية: كل مفتاح بنطاقات قراءة وفروع. نص المفتاح بيظهر مرة واحدة وقت الإنشاء.
// لحساب بكل الفروع بصلاحية التكاملات (الخادم اللي بيحكم).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchBranches, getCurrentUser, type ApiBranch } from '@/lib/api'
import { branchScopeOfUser } from '@/lib/branch-scope'
import { formatDate } from '@/lib/dates'
import { createIntegrationKey, createWebhookEndpoint, fetchIntegrationKeys, fetchWebhookEndpoints, revokeIntegrationKey, setWebhookEndpointActive, type ApiIntegrationKey, type ApiIntegrationKeys,
  type ApiWebhookEndpoint, type ApiWebhookEndpoints } from '@/lib/integrations-api'

const emptyForm = { name: '', scopes: [] as string[], allBranches: true, branchIds: [] as number[] }
const emptyHook = { name: '', url: '', events: [] as string[], allBranches: true, branchIds: [] as number[] }

export default function IntegrationsPage() {
  const [data, setData] = useState<ApiIntegrationKeys | null>(null)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  // المفتاح الجديد: بيتعرض مرة واحدة لحد ما المستخدم يقفله
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null)
  const [confirming, setConfirming] = useState<ApiIntegrationKey | null>(null)
  // B6.3 (ج): نقاط استقبال الأحداث — سر التوقيع بيتعرض مرة واحدة
  const [hooks, setHooks] = useState<ApiWebhookEndpoints | null>(null)
  const [hookForm, setHookForm] = useState(emptyHook)
  const [freshHook, setFreshHook] = useState<{ name: string; secret: string } | null>(null)
  // المفاتيح بتقرا أكتر من فرع: الشاشة لحساب بكل الفروع (نفس حكم الخادم)
  const [wide, setWide] = useState(true)

  const load = useCallback(() => {
    fetchIntegrationKeys().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل مفاتيح التكامل'))
    fetchWebhookEndpoints().then(setHooks).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل نقاط الاستقبال'))
  }, [])
  useEffect(() => {
    const companyWide = branchScopeOfUser(getCurrentUser()) === null
    setWide(companyWide)
    if (!companyWide) return
    load()
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [load])

  const toggleScope = (key: string) => setForm((current) => ({ ...current, scopes: current.scopes.includes(key) ? current.scopes.filter((item) => item !== key) : [...current.scopes, key] }))
  const toggleBranch = (id: number) => setForm((current) => ({ ...current, branchIds: current.branchIds.includes(id) ? current.branchIds.filter((item) => item !== id) : [...current.branchIds, id] }))
  const canCreate = form.name.trim().length >= 2 && form.scopes.length > 0 && (form.allBranches || form.branchIds.length > 0)

  async function create() {
    setBusy(true); setError('')
    try {
      const made = await createIntegrationKey({ name: form.name.trim(), scopes: form.scopes, branchIds: form.allBranches ? null : form.branchIds })
      setFresh({ name: made.name, key: made.key })
      setForm(emptyForm)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء المفتاح')
    } finally {
      setBusy(false)
    }
  }
  async function revoke(key: ApiIntegrationKey) {
    setBusy(true); setError('')
    try {
      await revokeIntegrationKey(key.id)
      setConfirming(null)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إلغاء المفتاح')
    } finally {
      setBusy(false)
    }
  }
  const toggleHookEvent = (key: string) => setHookForm((current) => ({ ...current, events: current.events.includes(key) ? current.events.filter((item) => item !== key) : [...current.events, key] }))
  const toggleHookBranch = (id: number) => setHookForm((current) => ({ ...current, branchIds: current.branchIds.includes(id) ? current.branchIds.filter((item) => item !== id) : [...current.branchIds, id] }))
  const canCreateHook = hookForm.name.trim().length >= 2 && /^https:\/\/.{4,}/.test(hookForm.url.trim()) && hookForm.events.length > 0 && (hookForm.allBranches || hookForm.branchIds.length > 0)
  async function createHook() {
    setBusy(true); setError('')
    try {
      const made = await createWebhookEndpoint({ name: hookForm.name.trim(), url: hookForm.url.trim(), events: hookForm.events, branchIds: hookForm.allBranches ? null : hookForm.branchIds })
      setFreshHook({ name: made.name, secret: made.secret })
      setHookForm(emptyHook)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء نقطة الاستقبال')
    } finally {
      setBusy(false)
    }
  }
  async function toggleHook(endpoint: ApiWebhookEndpoint) {
    setBusy(true); setError('')
    try {
      await setWebhookEndpointActive(endpoint.id, !endpoint.isActive)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تغيير حالة نقطة الاستقبال')
    } finally {
      setBusy(false)
    }
  }
  const eventLabel = (key: string) => hooks?.events.find((event) => event.key === key)?.label ?? key
  const scopeLabel = (key: string) => data?.scopes.find((scope) => scope.key === key)?.label ?? key
  const branchNames = (ids: number[] | null) => ids === null ? 'كل الفروع' : ids.map((id) => branches.find((branch) => branch.id === id)?.name ?? `#${id}`).join('، ') || '—'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">← الإعدادات</Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <KeyRound size={24} className="text-primary-600" />
            التكاملات
          </h1>
          <p className="text-gray-500 mt-1">مفاتيح لأنظمة خارجية تقرا من النظام (للقراءة بس). كل مفتاح بنطاقات قراءة وفروع، ونصه بيظهر مرة واحدة وقت إنشائه.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {!wide && <div className="card text-gray-600">المفتاح ممكن يقرا أكتر من فرع، فإدارة المفاتيح لحساب «كل الفروع» بس.</div>}
        {wide && data && !data.available && <div className="card text-amber-800 bg-amber-50">جدول المفاتيح ناقص على قاعدة البيانات (ترحيل 183) — كلّم مدير النظام.</div>}

        {fresh && (
          <div className="card border border-success-200 bg-success-50 space-y-2" data-new-key>
            <p className="font-semibold text-success-800">المفتاح «{fresh.name}» اتعمل — انسخه دلوقتي، مش هيظهر تاني.</p>
            <code dir="ltr" className="block bg-white rounded-lg p-3 text-sm break-all select-all">{fresh.key}</code>
            <p className="text-sm text-gray-600">بيتبعت في ترويسة <span dir="ltr">X-API-Key</span> لمسارات <span dir="ltr">/api/public/v1</span>.</p>
            <button type="button" className="btn-secondary" onClick={() => setFresh(null)}>نسخته — اقفل</button>
          </div>
        )}

        {wide && data?.available && (
          <div className="card space-y-4" data-key-form>
            <h2 className="text-lg font-semibold text-gray-800">مفتاح جديد</h2>
            <label className="block text-sm text-gray-600">اسم المفتاح (النظام اللي هيستخدمه)
              <input className="input mt-1" value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <div>
              <p className="text-sm text-gray-600 mb-2">يقرا إيه</p>
              <div className="flex flex-wrap gap-3">
                {data.scopes.map((scope) => (
                  <label key={scope.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.scopes.includes(scope.key)} onChange={() => toggleScope(scope.key)} />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">فروعه</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.allBranches} onChange={(event) => setForm({ ...form, allBranches: event.target.checked, branchIds: [] })} />
                كل الفروع
              </label>
              {!form.allBranches && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {branches.map((branch) => (
                    <label key={branch.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
                      {branch.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !canCreate} onClick={create}>إنشاء المفتاح</button>
          </div>
        )}

        {wide && data?.available && (
          <div className="card overflow-hidden p-0" data-key-list>
            {data.keys.length === 0 ? (
              <p className="p-8 text-center text-gray-500">مفيش مفاتيح لسه.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-start">المفتاح</th>
                      <th className="table-header text-start">يقرا إيه</th>
                      <th className="table-header text-start">الفروع</th>
                      <th className="table-header text-start">آخر استخدام</th>
                      <th className="table-header text-start">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keys.map((key) => (
                      <tr key={key.id} className="border-t border-gray-100 align-top">
                        <td className="table-cell">
                          <p className="font-medium text-gray-800">{key.name}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{key.keyPrefix}_…</p>
                        </td>
                        <td className="table-cell">{key.scopes.map(scopeLabel).join('، ')}</td>
                        <td className="table-cell">{branchNames(key.branchIds)}</td>
                        <td className="table-cell">{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'لسه ماتستخدمش'}</td>
                        <td className="table-cell">
                          {key.isActive ? (
                            confirming?.id === key.id ? (
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-red-700">النظام اللي بيستخدمه هيقف. متأكد؟</span>
                                <button type="button" className="btn-secondary text-red-700 disabled:opacity-50" disabled={busy} onClick={() => revoke(key)}>الغِ المفتاح</button>
                                <button type="button" className="btn-secondary" onClick={() => setConfirming(null)}>رجوع</button>
                              </span>
                            ) : (
                              <button type="button" className="btn-secondary text-red-700" onClick={() => setConfirming(key)}>إلغاء</button>
                            )
                          ) : (
                            <span className="badge bg-gray-100 text-gray-600">ملغي</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* B6.3 (ج): نقاط استقبال الأحداث (webhooks) */}
        {wide && hooks && (
          <div className="space-y-4" data-webhooks>
            <div>
              <h2 className="text-xl font-bold text-gray-800">نقاط استقبال الأحداث</h2>
              <p className="text-gray-500 mt-1">النظام بيبعت رسالة موقّعة لعنوان النظام الخارجي لما يحصل حدث (تعيين، تعديل، إنهاء خدمة، اعتماد مسير). الرسالة فيها رقم الموظف أو المسير بس — التفاصيل بتتقري بالمفتاح.</p>
            </div>
            {!hooks.available && <div className="card text-amber-800 bg-amber-50">جدول نقاط الاستقبال ناقص على قاعدة البيانات (ترحيل 184) — كلّم مدير النظام.</div>}
            {freshHook && (
              <div className="card border border-success-200 bg-success-50 space-y-2" data-new-webhook>
                <p className="font-semibold text-success-800">نقطة الاستقبال «{freshHook.name}» اتعملت — انسخ سر التوقيع دلوقتي، مش هيظهر تاني.</p>
                <code dir="ltr" className="block bg-white rounded-lg p-3 text-sm break-all select-all">{freshHook.secret}</code>
                <p className="text-sm text-gray-600">النظام المستقبِل بيتأكد بيه من ترويسة <span dir="ltr">X-HR-Signature</span> (HMAC-SHA256 على الوقت والجسم).</p>
                <button type="button" className="btn-secondary" onClick={() => setFreshHook(null)}>نسخته — اقفل</button>
              </div>
            )}
            {hooks.available && (
              <div className="card space-y-4" data-webhook-form>
                <h3 className="text-lg font-semibold text-gray-800">نقطة استقبال جديدة</h3>
                <label className="block text-sm text-gray-600">الاسم
                  <input className="input mt-1" value={hookForm.name} maxLength={120} onChange={(event) => setHookForm({ ...hookForm, name: event.target.value })} />
                </label>
                <label className="block text-sm text-gray-600">العنوان (لازم يبدأ بـ<span dir="ltr">https://</span>)
                  <input dir="ltr" className="input mt-1" value={hookForm.url} maxLength={500} placeholder="https://" onChange={(event) => setHookForm({ ...hookForm, url: event.target.value })} />
                </label>
                <div>
                  <p className="text-sm text-gray-600 mb-2">الأحداث</p>
                  <div className="flex flex-wrap gap-3">
                    {hooks.events.map((event) => (
                      <label key={event.key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={hookForm.events.includes(event.key)} onChange={() => toggleHookEvent(event.key)} />
                        {event.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">فروعها</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={hookForm.allBranches} onChange={(event) => setHookForm({ ...hookForm, allBranches: event.target.checked, branchIds: [] })} />
                    كل الفروع
                  </label>
                  {!hookForm.allBranches && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {branches.map((branch) => (
                        <label key={branch.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={hookForm.branchIds.includes(branch.id)} onChange={() => toggleHookBranch(branch.id)} />
                          {branch.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !canCreateHook} onClick={createHook}>إنشاء نقطة الاستقبال</button>
              </div>
            )}
            {hooks.available && (
              <div className="card overflow-hidden p-0" data-webhook-list>
                {hooks.endpoints.length === 0 ? (
                  <p className="p-8 text-center text-gray-500">مفيش نقاط استقبال لسه.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="table-header text-start">النقطة</th>
                          <th className="table-header text-start">الأحداث</th>
                          <th className="table-header text-start">الفروع</th>
                          <th className="table-header text-start">آخر محاولة</th>
                          <th className="table-header text-start">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hooks.endpoints.map((endpoint) => (
                          <tr key={endpoint.id} className="border-t border-gray-100 align-top">
                            <td className="table-cell">
                              <p className="font-medium text-gray-800">{endpoint.name}</p>
                              <p className="text-xs text-gray-400 break-all" dir="ltr">{endpoint.url}</p>
                            </td>
                            <td className="table-cell">{endpoint.events.map(eventLabel).join('، ')}</td>
                            <td className="table-cell">{branchNames(endpoint.branchIds)}</td>
                            <td className="table-cell">
                              {endpoint.lastAttemptAt ? <><span dir="ltr">{endpoint.lastStatus}</span> — {formatDate(endpoint.lastAttemptAt)}</> : 'لسه مااتبعتلهاش'}
                              {endpoint.failures > 0 && <p className="text-xs text-red-700">{endpoint.failures} محاولة فاشلة ورا بعض</p>}
                            </td>
                            <td className="table-cell">
                              <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => toggleHook(endpoint)}>{endpoint.isActive ? 'إيقاف' : 'تشغيل'}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
