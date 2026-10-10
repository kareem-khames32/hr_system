'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Boxes, Lock, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchBranches, fetchRolesFull, type ApiBranch, type ApiRole } from '@/lib/api'
import { OrgAudienceField } from '@/components/OrgAudienceField'
import type { StoredAudience } from '@/lib/org-audience'
import { formatDate } from '@/lib/dates'
import { MODULE_GROUPS, type ModuleGroup, type ModulePreset } from '@/lib/modules'
import {
  applyModulesPreset, fetchModuleEvents, fetchModuleImpact, fetchModulesCatalog, fetchPresetDiff, setModuleFeature, setModuleState,
  type ModuleAudience, type ModuleCatalogRow, type ModuleEvent, type ModuleImpact, type ModulesCatalog, type PresetDiff,
} from '@/lib/modules-admin-api'
import { CompanyWideReadOnlyNote, useCompanyWideWrite } from '@/components/CompanyWideReadOnly'

const GROUP_ORDER: ModuleGroup[] = ['core', 'time', 'money', 'people', 'talent']
// «حسب المنصب»: المنصب من الهيكل نفسه، مش من الدور
const POSITIONS: Array<[string, string]> = [
  ['DEPARTMENT_MANAGERS', 'مديرو الأقسام'],
  ['TEAM_LEADERS', 'قادة الفرق'],
  ['BRANCH_MANAGERS', 'مديرو الفروع'],
]
type WhoMode = 'all' | 'roles' | 'positions'

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'حصل خطأ، جرّب تاني')

// مفتاح تشغيل: زرار بدور switch عشان قارئ الشاشة والكيبورد
function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? '-translate-x-5' : '-translate-x-0.5'}`} />
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/40 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export default function ModulesSettingsPage() {
  const [catalog, setCatalog] = useState<ModulesCatalog | null>(null)
  const [events, setEvents] = useState<ModuleEvent[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // قفل موديول: بيتأكد الأول بأثر القفل
  const [closing, setClosing] = useState<{ module: ModuleCatalogRow; impact: ModuleImpact } | null>(null)
  const [preset, setPreset] = useState<PresetDiff | null>(null)
  const [audienceOf, setAudienceOf] = useState<ModuleCatalogRow | null>(null)
  const [who, setWho] = useState<WhoMode>('all')
  const [whoIds, setWhoIds] = useState<string[]>([])
  // B-ADD.1: الجمهور كله (مين + فين + المستثنين) من الحقل الموحد
  const [audienceValue, setAudienceValue] = useState<StoredAudience | null>(null)
  const [audienceComplete, setAudienceComplete] = useState(true)
  const [modalError, setModalError] = useState<string | null>(null)
  // الموديولات لكل الشركة: حساب مقفول على فرع يشوفها بس
  const { canWrite, readOnly } = useCompanyWideWrite()

  const loadEvents = useCallback(() => { fetchModuleEvents().then(setEvents).catch(() => setEvents([])) }, [])
  useEffect(() => {
    fetchModulesCatalog().then(setCatalog).catch((err) => setError(errorText(err)))
    loadEvents()
    // الأدوار والفروع لمحرر الجمهور بس — تعذّرهم مايوقفش الشاشة
    fetchRolesFull().then((rows) => setRoles(rows.filter((role) => role.isActive && role.code !== 'super_admin'))).catch(() => setRoles([]))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [loadEvents])

  const nameOf = useMemo(() => {
    const names = new Map((catalog?.modules ?? []).map((module) => [module.key, module.nameAr]))
    return (key: string) => names.get(key) ?? key
  }, [catalog])

  const run = async (key: string, work: () => Promise<ModulesCatalog>) => {
    setBusy(key)
    setError(null)
    try {
      setCatalog(await work())
      loadEvents()
      return true
    } catch (err) {
      setError(errorText(err))
      return false
    } finally {
      setBusy(null)
    }
  }

  const toggleModule = async (module: ModuleCatalogRow) => {
    if (!module.enabled) { await run(module.key, () => setModuleState(module.key, { enabled: true })); return }
    setBusy(module.key)
    setError(null)
    try {
      setModalError(null)
      setClosing({ module, impact: await fetchModuleImpact(module.key) })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(null)
    }
  }
  const confirmClose = async () => {
    if (!closing) return
    const module = closing.module
    setClosing(null)
    await run(module.key, () => setModuleState(module.key, { enabled: false }))
  }

  const openPreset = async (key: ModulePreset) => {
    setError(null)
    setModalError(null)
    try { setPreset(await fetchPresetDiff(key)) } catch (err) { setError(errorText(err)) }
  }
  const confirmPreset = async () => {
    if (!preset) return
    const key = preset.preset
    setPreset(null)
    await run(`preset:${key}`, async () => (await applyModulesPreset(key)).catalog)
  }

  const openAudience = (module: ModuleCatalogRow) => {
    const audience = module.audience
    const mode: WhoMode = audience?.mode === 'roles' || audience?.mode === 'positions' ? audience.mode : 'all'
    setWho(mode)
    setWhoIds(mode === 'all' ? [] : (audience?.ids ?? []).map(String))
    setAudienceValue((audience ?? null) as StoredAudience | null)
    setAudienceComplete(true)
    setModalError(null)
    setAudienceOf(module)
  }
  const saveAudience = async () => {
    if (!audienceOf) return
    if (who !== 'all' && whoIds.length === 0) { setModalError('اختار مين الموديول مفعّل لهم، أو خلّيه «الكل»'); return }
    if (!audienceComplete) { setModalError('كمّل اختيار «على مين؟» الأول'); return }
    const audience = audienceValue as ModuleAudience | null
    const key = audienceOf.key
    setAudienceOf(null)
    await run(key, () => setModuleState(key, { audience }))
  }

  const audienceText = (audience: ModuleAudience | null) => {
    if (!audience) return 'كل الشركة'
    const ids = (audience.ids ?? []).map(String)
    const label = (list: Array<[string, string]>) => (id: string) => list.find(([key]) => key === id)?.[1] ?? id
    const roleLabel = (id: string) => roles.find((role) => role.code === id)?.nameAr ?? label(POSITIONS)(id)
    const whoText = audience.mode === 'roles' || audience.mode === 'positions' ? ids.map(roleLabel).join('، ')
      : audience.mode === 'employees' ? `${ids.length} موظف بعينه` : audience.mode === 'departments' ? `${ids.length} قسم` : 'الكل'
    const whereIds = (audience.where?.ids ?? []).map(Number)
    const whereText = !whereIds.length ? '' : audience.where?.mode === 'branches'
      ? ` في ${whereIds.map((id) => branches.find((branch) => branch.id === id)?.name ?? `فرع #${id}`).join('، ')}`
      : audience.where?.mode === 'departments' ? ` في ${whereIds.length} قسم` : ` في ${whereIds.length} فريق`
    return `${whoText}${whereText}`
  }
  const eventText = (event: ModuleEvent) => event.kind === 'preset' ? `طبّق باقة «${event.nameAr}»`
    // حدث موديول من غير حالة = تغيير جمهور بس
    : event.kind === 'module' && event.enabled === null ? `غيّر جمهور «${event.nameAr}» إلى: ${audienceText(event.audience)}`
    : `${event.enabled ? 'فعّل' : 'قفل'} ${event.kind === 'feature' ? 'ميزة' : ''} «${event.nameAr}»${event.audience ? ` (مفعّل لـ ${audienceText(event.audience)})` : ''}`

  const pick = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">الإعدادات</Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الموديولات</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800">الموديولات</h1>
          <p className="text-gray-500 mt-1">
            افتح الأجزاء اللي شركتك بتستخدمها واقفل الباقي. القفل بيخفي الجزء من القايمة ويوقفه، ومابيمسحش أي بيانات — ولما تفتحه تاني بيرجع زي ما كان.
          </p>
        </div>

        {readOnly && <CompanyWideReadOnlyNote />}
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {!catalog ? (
          !error && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )
        ) : (
          <>
            {/* الباقات: نقطة بداية بس — أي موديول يتفتح أو يتقفل لوحده بعدها */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-800">باقات جاهزة</h2>
              <p className="text-sm text-gray-500 mt-1">الباقة بتفتح وتقفل مجموعة موديولات مرة واحدة، وبتوريك الفرق قبل ما تتطبق. تقدر تغيّر أي موديول لوحده بعدها.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {catalog.presets.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={!canWrite || busy !== null}
                    onClick={() => openPreset(item.key)}
                    className="text-start rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-bold text-gray-800">الباقة {item.nameAr}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {GROUP_ORDER.map((group) => {
              const modules = catalog.modules.filter((module) => module.group === group)
              if (!modules.length) return null
              return (
                <div key={group} className="space-y-3">
                  <h2 className="font-bold text-gray-800">{MODULE_GROUPS[group]}</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {modules.map((module) => {
                      const blockedBy = module.enabled && !module.effective ? module.dependsOn.filter((key) => !catalog.modules.find((row) => row.key === key)?.effective) : []
                      return (
                        <div key={module.key} className="card p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 flex items-center gap-2">
                                <Boxes size={18} className="text-primary-500 shrink-0" />
                                {module.nameAr}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                            </div>
                            {module.core ? (
                              <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1 shrink-0"><Lock size={12} /> أساسي</span>
                            ) : (
                              <Toggle
                                checked={module.enabled}
                                disabled={!canWrite || busy !== null}
                                label={`${module.enabled ? 'قفل' : 'تفعيل'} ${module.nameAr}`}
                                onChange={() => toggleModule(module)}
                              />
                            )}
                          </div>

                          {module.dependsOn.filter((key) => !catalog.modules.find((row) => row.key === key)?.core).length > 0 && (
                            <p className="text-xs text-gray-500">
                              بيعتمد على: {module.dependsOn.filter((key) => !catalog.modules.find((row) => row.key === key)?.core).map(nameOf).join('، ')}
                            </p>
                          )}
                          {blockedBy.length > 0 && (
                            <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
                              واقف دلوقتي لأن «{blockedBy.map(nameOf).join('» و«')}» مقفول — فعّله الأول.
                            </p>
                          )}

                          {!module.core && module.enabled && (
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-600">مفعّل لـ: <span className="text-gray-800 font-medium">{audienceText(module.audience)}</span></span>
                              {canWrite && (
                                <button type="button" disabled={busy !== null} onClick={() => openAudience(module)} className="text-primary-600 hover:underline disabled:opacity-50">
                                  تغيير
                                </button>
                              )}
                            </div>
                          )}

                          {module.features.length > 0 && (
                            <div className="border-t border-gray-100 pt-3 space-y-3">
                              <p className="text-xs font-medium text-gray-500">مزايا فرعية</p>
                              {module.features.map((feature) => (
                                <div key={feature.key} className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{feature.nameAr}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                                  </div>
                                  <Toggle
                                    checked={feature.enabled}
                                    disabled={!canWrite || busy !== null}
                                    label={`${feature.enabled ? 'قفل' : 'تفعيل'} ${feature.nameAr}`}
                                    onChange={() => run(feature.key, () => setModuleFeature(feature.key, !feature.enabled))}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {events.length > 0 && (
              <div className="card p-5">
                <h2 className="font-bold text-gray-800 mb-3">آخر التغييرات</h2>
                <ul className="divide-y divide-gray-100 text-sm">
                  {events.map((event) => (
                    <li key={event.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-gray-800">{event.byName ?? 'مستخدم'} {eventText(event)}</span>
                      <span className="text-gray-400 text-xs">{formatDate(event.at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {closing && (
        <Modal title={`قفل «${closing.module.nameAr}»`} onClose={() => setClosing(null)}>
          <p className="text-gray-700">
            القفل هيخفي «{closing.module.nameAr}» من القايمة ويوقف شاشاته وأنواع طلباته ومهامه الآلية. البيانات كلها بتفضل محفوظة، وتفعيله تاني بيرجّع كل حاجة.
          </p>
          {closing.impact.openRequests > 0 && (
            <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
              فيه {closing.impact.openRequests} طلب مفتوح من أنواع الموديول ده. هيفضلوا يكمّلوا اعتمادهم عادي، بس مفيش طلب جديد هيتقدّم.
            </p>
          )}
          {closing.impact.items.length > 0 && (
            <ul className="text-sm text-gray-700 space-y-1">
              {closing.impact.items.map((item) => <li key={item.label}>• {item.label}: <span className="font-medium">{item.count}</span></li>)}
            </ul>
          )}
          {(closing.impact.notes ?? []).map((note) => (
            <p key={note} className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">{note}</p>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setClosing(null)} className="btn-secondary">رجوع</button>
            <button type="button" onClick={confirmClose} className="btn-danger">اقفل الموديول</button>
          </div>
        </Modal>
      )}

      {preset && (
        <Modal title={`تطبيق الباقة ${preset.nameAr}`} onClose={() => setPreset(null)}>
          {preset.enable.length === 0 && preset.disable.length === 0 ? (
            <p className="text-gray-700">الموديولات عندك مطابقة للباقة دي بالظبط — مفيش حاجة هتتغير.</p>
          ) : (
            <>
              {preset.enable.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-success-600 mb-1">هيتفتح</p>
                  <p className="text-gray-700">{preset.enable.map((module) => module.nameAr).join('، ')}</p>
                </div>
              )}
              {preset.disable.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">هيتقفل</p>
                  <p className="text-gray-700">{preset.disable.map((module) => module.nameAr).join('، ')}</p>
                  <p className="text-xs text-gray-500 mt-1">القفل مابيمسحش بيانات، والطلبات المفتوحة بتكمّل.</p>
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPreset(null)} className="btn-secondary">رجوع</button>
            {(preset.enable.length > 0 || preset.disable.length > 0) && <button type="button" onClick={confirmPreset} className="btn-primary">طبّق الباقة</button>}
          </div>
        </Modal>
      )}

      {audienceOf && (
        <Modal title={`مين «${audienceOf.nameAr}» مفعّل لهم`} onClose={() => setAudienceOf(null)}>
          <p className="text-sm text-gray-500">اللي برّه الاختيار مش هيشوف الموديول ولا يستخدمه. مدير النظام بيشوفه دايمًا. الاختيار مابيغيّرش أي حساب ولا مهمة آلية.</p>
          <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">خلّي بالك: اللي برّه الاختيار مش هيقدر يعتمد ولا يأكد حاجة في الموديول ده كمان، حتى لو متسمّي معتمد أو مدير مباشر. لو فيه معتمدين أو مديرين لازم يشتغلوا عليه، دخّلهم في الاختيار.</p>
          {modalError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{modalError}</div>}
          <div>
            <p className="label">مين</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {([['all', 'الكل'], ['roles', 'أدوار محددة'], ['positions', 'حسب المنصب']] as Array<[WhoMode, string]>).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-2">
                  <input type="radio" name="audienceWho" checked={who === mode} onChange={() => { setWho(mode); setWhoIds([]) }} />
                  {label}
                </label>
              ))}
            </div>
            {who !== 'all' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                {(who === 'roles' ? roles.map((role) => [role.code, role.nameAr] as [string, string]) : POSITIONS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={whoIds.includes(key)} onChange={() => setWhoIds(pick(whoIds, key))} />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div data-module-audience>
            <OrgAudienceField value={audienceValue} who={{ mode: who, ids: whoIds }}
              onChange={(audience, complete) => { setAudienceValue(audience); setAudienceComplete(complete) }} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAudienceOf(null)} className="btn-secondary">رجوع</button>
            <button type="button" onClick={saveAudience} className="btn-primary">حفظ</button>
          </div>
        </Modal>
      )}
    </MainLayout>
  )
}
