'use client'

// B4.1: «الكيانات القانونية» — كيان لكل دولة بأرقام تسجيله وبنك رواتبه، وربط الفروع بكيان دولتها. لحساب نطاقه الشركة كلها بصلاحية
// الإعدادات (الخادم بيحكم). عملة الكيان عملة دولته دايمًا، فربط فرع بكيان دولته مابيغيّرش عملته.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Building2, Plus, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import PayrollEntityWarnings from '@/components/payroll/PayrollEntityWarnings'
import { can, getCurrentUser, isCompanyWideUser } from '@/lib/api'
import { currencyLabel, invalidateCurrency } from '@/lib/currency'
import { setHijriDisplay } from '@/lib/dates'
import {
  ENTITY_COUNTRY_LABELS, createLegalEntity, fetchDisplaySettings, fetchLegalEntities, linkBranchEntity, setEntityHijriDisplay, updateLegalEntity,
  type ApiLegalEntities, type ApiLegalEntity, type EntityCountry, type LegalEntityBody,
} from '@/lib/legal-entities-api'

const TEXT_FIELDS: Array<[keyof LegalEntityBody & keyof ApiLegalEntity, string]> = [
  ['commercialRegister', 'السجل التجاري'], ['taxNumber', 'الرقم الضريبي'], ['insuranceNumber', 'رقم منشأة التأمينات'], ['qiwaNumber', 'رقم قوى'], ['wpsNumber', 'رقم حماية الأجور'],
  ['payrollBankName', 'بنك الرواتب'], ['payrollIban', 'آيبان بنك الرواتب'], ['timeZone', 'المنطقة الزمنية (الفاضي = توقيت الخادم)'],
]

export default function LegalEntitiesPage() {
  const [data, setData] = useState<ApiLegalEntities | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<ApiLegalEntity | 'new' | null>(null)
  const [allowed, setAllowed] = useState(true)

  const load = useCallback(() => {
    const ok = can('settings.manage') && isCompanyWideUser(getCurrentUser())
    setAllowed(ok)
    if (!ok) return
    fetchLegalEntities().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الكيانات القانونية'))
  }, [])
  useEffect(load, [load])

  // B4.6 (ج): عرض التاريخ الهجري جنب الميلادي لحسابات فروع الكيان — وإعداد الحساب الحالي بيتجدد بعدها
  const toggleHijri = async (entity: ApiLegalEntity) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const enabled = entity.hijriDisplay !== true
      await setEntityHijriDisplay(entity.id, enabled)
      setData(await fetchLegalEntities())
      setHijriDisplay((await fetchDisplaySettings()).hijri === true)
      setInfo(enabled ? `التاريخ الهجري هيظهر جنب الميلادي لحسابات فروع «${entity.name}».` : `اتقفل عرض التاريخ الهجري لـ«${entity.name}».`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ إعداد التاريخ الهجري')
    } finally {
      setBusy(false)
    }
  }

  const link = async (branchId: number, entityId: number | null) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      setData(await linkBranchEntity(branchId, entityId))
      // عملة فرع من غير دولة بتتبع كيانه: علامة العملة المحفوظة في المتصفح بتتجدد
      invalidateCurrency()
      setInfo(entityId === null ? 'الفرع اتفك من كيانه.' : 'الفرع اتربط بالكيان.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر ربط الفرع')
    } finally {
      setBusy(false)
    }
  }
  const entitiesFor = (country: EntityCountry | null) => (data?.entities ?? []).filter((entity) => entity.isActive && (country === null || entity.country === country))

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link href="/settings" className="text-sm text-primary-600 hover:underline">
              ← الإعدادات
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
              <Building2 size={24} className="text-primary-600" />
              الكيانات القانونية
            </h1>
            <p className="text-gray-500 mt-1">كيان لكل دولة بأرقام تسجيله وبنك رواتبه — وكل فرع بيتربط بكيان دولته، والمسير الجديد لكيان واحد</p>
          </div>
          {allowed && data?.available && (
            <button onClick={() => setEditing('new')} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              كيان جديد
            </button>
          )}
        </div>
        {!allowed && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            الكيانات القانونية بيانات على مستوى الشركة: بيديرها حساب نطاقه الشركة كلها ومعاه صلاحية الإعدادات.
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {data.message}
          </div>
        )}
        {allowed && data?.available && can('payroll.view') && <PayrollEntityWarnings refreshKey={data} />}
        {data?.available && data.unlinkedBranches.length > 0 && (
          <div className="card space-y-3" data-unlinked-branches>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              فروع من غير كيان قانوني
            </h2>
            <p className="text-sm text-gray-500">الفرع من غير كيان عملته من دولته زي الأول، بس مابيتحسبش في فصل المسيرات بالكيان.</p>
            <ul className="divide-y divide-gray-100">
              {data.unlinkedBranches.map((branch) => (
                <li key={branch.id} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-gray-800">
                    {branch.name} <span className="text-xs text-gray-400">· {branch.country ? ENTITY_COUNTRY_LABELS[branch.country] : 'من غير دولة'}</span>
                  </span>
                  <select className="input text-sm" value="" disabled={busy} aria-label={`كيان ${branch.name}`} onChange={(event) => { if (event.target.value) void link(branch.id, Number(event.target.value)) }}>
                    <option value="">اربطه بكيان…</option>
                    {entitiesFor(branch.country).map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data?.available && data.entities.length === 0 && <div className="card text-gray-500 text-sm">مفيش كيانات لسه — اعمل كيان لكل دولة عندك فيها فروع.</div>}
        {data?.available && data.entities.map((entity) => (
          <div key={entity.id} className={`card space-y-4 ${entity.isActive ? '' : 'opacity-60'}`} data-legal-entity={entity.id}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {entity.name} {!entity.isActive && <span className="text-xs text-gray-400">· موقوف</span>}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {ENTITY_COUNTRY_LABELS[entity.country]} · العملة {currencyLabel(entity.currency)}
                  {entity.timeZone ? ` · التوقيت ${entity.timeZone}` : ''}
                  {entity.nameEn ? ` · ${entity.nameEn}` : ''}
                </p>
              </div>
              <button onClick={() => setEditing(entity)} className="btn-secondary text-sm">
                تعديل
              </button>
            </div>
            {entity.gaps.length > 0 && (
              <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-entity-gaps>
                ناقص: {entity.gaps.join('، ')}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700" data-entity-hijri>
              <input type="checkbox" checked={entity.hijriDisplay === true} disabled={busy} onChange={() => toggleHijri(entity)} />
              عرض التاريخ الهجري جنب الميلادي لحسابات فروع الكيان (عرض بس — التخزين والإدخال ميلادي)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {TEXT_FIELDS.filter(([key]) => key !== 'timeZone').map(([key, label]) => (
                <div key={key}>
                  <p className="text-gray-500">{label}</p>
                  <p className="font-medium text-gray-800 mt-1 break-words" dir="ltr">{(entity[key] as string | null) ?? '—'}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">الفروع ({entity.branches.length})</p>
              <div className="flex flex-wrap gap-2">
                {entity.branches.map((branch) => (
                  <span key={branch.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                    {branch.name}
                    <button onClick={() => link(branch.id, null)} disabled={busy} className="text-gray-400 hover:text-red-600" aria-label={`فك ربط ${branch.name}`}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {entity.branches.length === 0 && <span className="text-sm text-gray-400">مفيش فروع مربوطة</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && <EntityModal entity={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); setInfo('الكيان اتحفظ.'); load() }} />}
    </MainLayout>
  )
}

function EntityModal({ entity, onClose, onDone }: { entity: ApiLegalEntity | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(entity?.name ?? '')
  const [nameEn, setNameEn] = useState(entity?.nameEn ?? '')
  const [country, setCountry] = useState<EntityCountry>(entity?.country ?? 'SA')
  const [texts, setTexts] = useState<Record<string, string>>(Object.fromEntries(TEXT_FIELDS.map(([key]) => [key, (entity?.[key] as string | null) ?? ''])))
  const [cycleStartDay, setCycleStartDay] = useState(entity?.cycleStartDay ? String(entity.cycleStartDay) : '')
  const [isActive, setIsActive] = useState(entity?.isActive ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      // في التعديل: اللي اتغيّر بس بيتبعت
      const body: LegalEntityBody = {}
      if (!entity || name.trim() !== entity.name) body.name = name.trim()
      if (!entity ? nameEn.trim() !== '' : nameEn.trim() !== (entity.nameEn ?? '')) body.nameEn = nameEn.trim() || null
      if (!entity) body.country = country
      for (const [key] of TEXT_FIELDS) {
        const next = texts[key].trim()
        if (!entity ? next !== '' : next !== ((entity[key] as string | null) ?? '')) (body as Record<string, unknown>)[key] = next || null
      }
      const day = cycleStartDay === '' ? null : Number(cycleStartDay)
      if (!entity ? day !== null : day !== entity.cycleStartDay) body.cycleStartDay = day
      if (entity && isActive !== entity.isActive) body.isActive = isActive
      if (entity && Object.keys(body).length === 0) { onClose(); return }
      await (entity ? updateLegalEntity(entity.id, body) : createLegalEntity(body))
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الكيان')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label={entity ? 'تعديل كيان قانوني' : 'كيان قانوني جديد'}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">{entity ? 'تعديل كيان قانوني' : 'كيان قانوني جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm text-gray-600">
              اسم الكيان
              <input className="input mt-1 w-full" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              الاسم بالإنجليزي
              <input className="input mt-1 w-full" dir="ltr" maxLength={200} value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              الدولة {entity && <span className="text-xs text-gray-400">(مابتتغيّرش)</span>}
              <select className="input mt-1 w-full" value={country} disabled={!!entity} onChange={(event) => setCountry(event.target.value as EntityCountry)}>
                {(Object.keys(ENTITY_COUNTRY_LABELS) as EntityCountry[]).map((key) => (
                  <option key={key} value={key}>
                    {ENTITY_COUNTRY_LABELS[key]} — {currencyLabel(key === 'EG' ? 'EGP' : 'SAR')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-600">
              يوم بداية دورة الرواتب (الفاضي = الإعداد العام)
              <input className="input mt-1 w-full" inputMode="numeric" value={cycleStartDay} onChange={(event) => setCycleStartDay(event.target.value.replace(/\D/g, '').slice(0, 2))} />
            </label>
            {TEXT_FIELDS.map(([key, label]) => (
              <label key={key} className="block text-sm text-gray-600">
                {label}
                <input className="input mt-1 w-full" dir="ltr" maxLength={key === 'payrollBankName' ? 200 : 100} value={texts[key]} onChange={(event) => setTexts({ ...texts, [key]: event.target.value })} />
              </label>
            ))}
          </div>
          {entity && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              ساري (الكيان الموقوف مابيتربطش بيه فروع)
            </label>
          )}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || name.trim().length < 2} className="btn-primary text-sm disabled:opacity-50">
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
