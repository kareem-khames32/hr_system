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
import { createIntegrationKey, fetchIntegrationKeys, revokeIntegrationKey, type ApiIntegrationKey, type ApiIntegrationKeys } from '@/lib/integrations-api'

const emptyForm = { name: '', scopes: [] as string[], allBranches: true, branchIds: [] as number[] }

export default function IntegrationsPage() {
  const [data, setData] = useState<ApiIntegrationKeys | null>(null)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  // المفتاح الجديد: بيتعرض مرة واحدة لحد ما المستخدم يقفله
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null)
  const [confirming, setConfirming] = useState<ApiIntegrationKey | null>(null)
  // المفاتيح بتقرا أكتر من فرع: الشاشة لحساب بكل الفروع (نفس حكم الخادم)
  const [wide, setWide] = useState(true)

  const load = useCallback(() => {
    fetchIntegrationKeys().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل مفاتيح التكامل'))
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
      </div>
    </MainLayout>
  )
}
