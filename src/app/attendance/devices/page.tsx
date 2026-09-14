'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Fingerprint,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  Edit2,
  Building2,
  X,
  DownloadCloud,
  Timer,
  AlertCircle,
  Globe,
} from 'lucide-react'
import {
  can,
  fetchCatalog,
  createCatalogItem,
  updateCatalogItem,
  fetchBranches,
  fetchConfig,
  updateConfig,
  syncDevice,
  syncAllDevices,
  fetchUnmatchedPunches,
  fetchEmployees,
  updateEmployee,
  type ApiBranch,
  type ApiSyncResult,
  type ApiUnmatchedCode,
  type ApiEmployee,
} from '@/lib/api'

interface Device {
  id: number
  name: string
  serialNumber: string
  branchId: number | null
  branchName: string | null
  isActive: boolean
  lastSeen: string | null
  // اتصال السحب المباشر ونتيجة آخر مزامنة
  ip: string | null
  port: number | null
  lastStatus: string | null
  lastSyncCount: number
  lastSyncAt: string | null
  hasAuthKey: boolean
}

const SYNC_INTERVAL_KEY = 'attendance.sync_interval_minutes'

// «آخر ظهور» — تنسيق محلي مقروء أو «لم يظهر بعد»
const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return 'لم يظهر بعد'
  const d = new Date(lastSeen)
  if (Number.isNaN(d.getTime())) return 'لم يظهر بعد'
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

const emptyForm = { name: '', serialNumber: '', branchId: '', ip: '', port: '', authKey: '', clearAuthKey: false }

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  // المزامنة اليدوية — جهاز واحد أو الكل + نتائجها
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncResults, setSyncResults] = useState<ApiSyncResult[] | null>(null)

  // فاصل المزامنة التلقائية (دقائق) — 0 = متوقفة
  const [intervalMinutes, setIntervalMinutes] = useState('')
  const [savingInterval, setSavingInterval] = useState(false)
  const [notice, setNotice] = useState('')

  // بصمات يتيمة (كود جهاز بلا موظف) — والربط بموظف من هنا بضبط رقم بصمته
  const [unmatched, setUnmatched] = useState<ApiUnmatchedCode[]>([])
  const [unmatchedError, setUnmatchedError] = useState('')
  const [linkEmployees, setLinkEmployees] = useState<ApiEmployee[]>([])
  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({})
  const [linkingCode, setLinkingCode] = useState<string | null>(null)

  // الأزرار بصلاحياتها في الباك: تسجيل/تعديل الجهاز وفاصل المزامنة = settings.manage،
  // السحب = attendance.sync، ربط كود بموظف = employees.edit
  const canManage = can('settings.manage')
  const canSync = can('attendance.sync')
  const canLink = can('employees.edit')

  const loadUnmatched = () => {
    fetchUnmatchedPunches()
      .then((rows) => {
        setUnmatched(rows)
        setUnmatchedError('')
      })
      .catch((e) =>
        setUnmatchedError(e instanceof Error ? e.message : 'تعذر تحميل الأكواد غير المربوطة')
      )
  }

  // ربط كود الجهاز بموظف = ضبط «رقم البصمة» في ملفه — السيرفر ينسب له البصمات
  // السابقة بهذا الكود (من تاريخ التحاقه) ويعيد حساب أيامها
  const linkCode = async (code: string) => {
    const emp = linkEmployees.find((e) => String(e.id) === linkChoice[code])
    if (!emp) return
    if (
      emp.fingerprintCode &&
      emp.fingerprintCode !== code &&
      !confirm(`رقم بصمة ${emp.fullName} الحالي ${emp.fingerprintCode} — استبداله بالكود ${code}؟`)
    ) {
      return
    }
    setLinkingCode(code)
    setError('')
    try {
      await updateEmployee(emp.id, { fingerprintCode: code })
      setNotice(
        `تم ربط الكود ${code} بالموظف ${emp.fullName} — نُسبت له بصماته السابقة ويُعاد حساب أيامه`
      )
      loadUnmatched()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر ربط الكود بالموظف')
    } finally {
      setLinkingCode(null)
    }
  }

  const loadDevices = () => {
    setLoading(true)
    setError('')
    fetchCatalog<Device>('devices')
      .then((rows) => setDevices(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الأجهزة'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDevices()
    loadUnmatched()
    // قائمة الربط لمن يملك التعديل فقط (الربط = PATCH /employees)
    if (can('employees.edit')) {
      fetchEmployees()
        .then((rows) => setLinkEmployees(rows.filter((e) => e.isActive)))
        .catch(() => {
          /* الربط من هنا يحتاج صلاحية عرض الموظفين — اللوحة تبقى للعرض */
        })
    }
    fetchBranches()
      .then((rows) => setBranches(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الفروع'))
    if (can('settings.manage')) fetchConfig()
      .then((rows) => {
        const row = rows.find((r) => r.key === SYNC_INTERVAL_KEY)
        if (row) setIntervalMinutes(row.value)
      })
      .catch((e) => setError(`تعذر تحميل فاصل المزامنة: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`))
  }, [])

  // ===== المزامنة اليدوية =====
  const syncOne = async (device: Device) => {
    setSyncingId(device.id)
    setError('')
    try {
      const result = await syncDevice(device.id)
      setSyncResults([result])
      loadDevices()
      loadUnmatched()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر سحب بصمات الجهاز')
    } finally {
      setSyncingId(null)
    }
  }

  const syncAll = async () => {
    setSyncingAll(true)
    setError('')
    try {
      const results = await syncAllDevices()
      setSyncResults(results)
      loadDevices()
      loadUnmatched()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر سحب بصمات الأجهزة')
    } finally {
      setSyncingAll(false)
    }
  }

  // حفظ فاصل المزامنة التلقائية
  const saveInterval = async () => {
    const n = Number(intervalMinutes)
    if (!Number.isInteger(n) || n < 0) {
      setError('فاصل المزامنة: عدد دقائق صحيح (0 = متوقفة)')
      return
    }
    setSavingInterval(true)
    setError('')
    try {
      await updateConfig(SYNC_INTERVAL_KEY, String(n))
      setNotice(
        n === 0
          ? 'تم إيقاف المزامنة التلقائية'
          : `المزامنة التلقائية كل ${n} دقيقة`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ فاصل المزامنة')
    } finally {
      setSavingInterval(false)
    }
  }

  const openAdd = () => {
    setEditingDevice(null)
    setFormData(emptyForm)
    setModalError('')
    setShowModal(true)
  }

  const openEdit = (device: Device) => {
    setEditingDevice(device)
    setFormData({
      name: device.name,
      serialNumber: device.serialNumber,
      branchId: device.branchId ? String(device.branchId) : '',
      ip: device.ip ?? '',
      port: device.port != null ? String(device.port) : '',
      authKey: '',
      clearAuthKey: false,
    })
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError('')
    try {
      if (!formData.clearAuthKey && formData.authKey && !/^\d{1,6}$/.test(formData.authKey)) {
        throw new Error('مفتاح الاتصال من 1 إلى 6 أرقام (0 بلا كلمة مرور)')
      }
      const body = {
        name: formData.name,
        serialNumber: formData.serialNumber,
        branchId: Number(formData.branchId),
        ip: formData.ip.trim() || null,
        port: formData.port.trim() ? Number(formData.port) : 4370,
        ...(formData.clearAuthKey ? { authKey: null } : formData.authKey ? { authKey: formData.authKey } : {}),
      }
      if (editingDevice) {
        await updateCatalogItem('devices', editingDevice.id, body)
      } else {
        await createCatalogItem('devices', body)
      }
      setShowModal(false)
      setFormData(emptyForm)
      loadDevices()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'تعذر حفظ الجهاز')
    } finally {
      setSaving(false)
    }
  }

  const filteredDevices = devices.filter(
    (device) =>
      (device.name.includes(searchTerm) ||
        (device.serialNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filterBranch || String(device.branchId ?? '') === filterBranch)
  )

  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.isActive).length,
    inactive: devices.filter((d) => !d.isActive).length,
    seen: devices.filter((d) => d.lastSeen && Date.now() - new Date(d.lastSeen).getTime() >= 0 && Date.now() - new Date(d.lastSeen).getTime() <= 86400000).length,
    neverSeen: devices.filter((d) => !d.lastSeen).length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة أجهزة البصمة</h1>
            <p className="text-gray-500 mt-1">مراقبة وإدارة أجهزة تسجيل الحضور</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadDevices} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={18} />
              تحديث
            </button>
            {canSync && (
              <button
                onClick={syncAll}
                disabled={syncingAll}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                {syncingAll ? (
                  <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <DownloadCloud size={18} />
                )}
                {syncingAll ? 'جارٍ السحب...' : 'سحب الكل الآن'}
              </button>
            )}
            {canManage && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                تسجيل جهاز جديد
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Success Notice */}
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice('')} className="p-1 hover:bg-success-100 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}

        {/* نتائج المزامنة اليدوية */}
        {syncResults && (
          <div className="card border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DownloadCloud size={18} className="text-primary-600" />
                <h3 className="font-bold text-gray-800">نتائج السحب</h3>
                <span className="text-sm text-gray-500">
                  {syncResults.filter((r) => r.ok).length} نجحت •{' '}
                  {syncResults.filter((r) => !r.ok).length} فشلت
                </span>
              </div>
              <button
                onClick={() => setSyncResults(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {syncResults.length === 0 && (
                <p className="text-sm text-gray-500">
                  لا أجهزة قابلة للسحب — أضف عنوان IP للأجهزة النشطة أولاً
                </p>
              )}
              {syncResults.map((r) => (
                <div
                  key={r.deviceId}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    r.ok ? 'bg-success-50 text-success-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {r.ok ? (
                    <CheckCircle2 size={16} className="shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0" />
                  )}
                  <span className="font-medium">{r.deviceName}:</span>
                  {r.ok ? (
                    <span>
                      سُحبت {r.pulled} بصمة — أُدخلت {r.inserted} (تطابقت {r.matched})
                      {r.rejected ? ` — رُفضت ${r.rejected} (وقت مستقبلي/كود غير صالح)` : ''}
                    </span>
                  ) : (
                    <span>{r.error ?? 'فشل غير معروف'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Fingerprint size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأجهزة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Wifi size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نشط</p>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <WifiOff size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوقف</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inactive}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Activity size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ظهر خلال 24 ساعة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.seen}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">لم يظهر بعد</p>
              <p className="text-2xl font-bold text-gray-800">{stats.neverSeen}</p>
            </div>
          </div>
        </div>

        {/* Search & Branch Filter */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن جهاز..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
            {/* فاصل المزامنة مفتاح إعدادات (قراءته وحفظه settings.manage) */}
            {canManage && (
              <div className="flex items-center gap-2 whitespace-nowrap border-r border-gray-100 pr-3">
                <Timer size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  فاصل المزامنة التلقائية (دقائق)
                </span>
                <input
                  type="number"
                  min={0}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(e.target.value)}
                  className="input w-24 text-sm"
                  dir="ltr"
                  title="0 = متوقفة"
                />
                <button
                  onClick={saveInterval}
                  disabled={savingInterval}
                  className="btn-secondary text-sm py-2 disabled:opacity-50"
                >
                  {savingInterval ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
                <span className="text-xs text-gray-400">0 = متوقفة</span>
              </div>
            )}
          </div>
        </div>

        {/* Devices Grid */}
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className={`card border-2 ${device.isActive ? 'border-success-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        device.isActive ? 'bg-success-50' : 'bg-gray-100'
                      }`}
                    >
                      <Fingerprint
                        size={28}
                        className={device.isActive ? 'text-success-600' : 'text-gray-500'}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{device.name}</h3>
                      <p className="text-sm text-gray-500 font-mono" dir="ltr">
                        {device.serialNumber}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg mt-1">
                        <Building2 size={12} />
                        {device.branchName || 'غير مرتبط بفرع'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.isActive ? (
                      <Wifi size={16} className="text-success-600" />
                    ) : (
                      <WifiOff size={16} className="text-gray-500" />
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        device.isActive ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {device.isActive ? 'نشط' : 'متوقف'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">آخر ظهور: {formatLastSeen(device.lastSeen)}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <Activity size={16} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 truncate" title={device.lastStatus ?? undefined}>
                      آخر مزامنة: {device.lastStatus ?? 'لم تجرِ بعد'}
                      {device.lastSyncCount > 0 && (
                        <span className="text-success-600"> — {device.lastSyncCount} بصمة</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <Globe size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      الاتصال:{' '}
                      {device.ip ? (
                        <span className="font-mono" dir="ltr">
                          {device.ip}:{device.port ?? 4370}
                        </span>
                      ) : (
                        'بلا IP — أضفه من «تعديل» لتفعيل السحب'
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  الرقم التسلسلي: <span className="font-mono" dir="ltr">{device.serialNumber}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  {canManage && (
                    <button
                      onClick={() => openEdit(device)}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2"
                    >
                      <Edit2 size={16} />
                      تعديل
                    </button>
                  )}
                  {canSync && (
                    <button
                      onClick={() => syncOne(device)}
                      disabled={syncingId === device.id || syncingAll || !device.ip}
                      title={!device.ip ? 'أضف عنوان IP أولاً' : 'سحب البصمات من الجهاز الآن'}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {syncingId === device.id ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <DownloadCloud size={16} />
                      )}
                      {syncingId === device.id ? 'جارٍ السحب...' : 'سحب الآن'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* أكواد بصمة غير مربوطة — بصمات لا تُحتسب في الحضور حتى يُربط كودها بموظف */}
        {(unmatched.length > 0 || unmatchedError) && (
          <div className="card border border-warning-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-warning-600" />
                <h3 className="font-bold text-gray-800">أكواد بصمة غير مربوطة بموظف</h3>
                <span className="text-sm text-gray-500">
                  {unmatched.length} كود • {unmatched.reduce((s, u) => s + u.count, 0)} بصمة
                </span>
              </div>
              <button onClick={loadUnmatched} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              بصمات وصلت بكود لا يطابق رقم البصمة ولا الكود الوظيفي لأي موظف. اربط الكود بموظف
              (يُضبط «رقم البصمة» في ملفه) فتُنسب له بصماته السابقة من تاريخ التحاقه ويُعاد حساب أيامه
            </p>
            {unmatchedError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 text-sm">{unmatchedError}</div>
            )}
            {unmatched.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">كود الجهاز</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">البصمات</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">أول بصمة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">آخر بصمة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الجهاز</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">ربط بموظف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unmatched.map((u) => (
                      <tr key={u.employeeCode}>
                        <td className="px-3 py-2 font-mono" dir="ltr">{u.employeeCode}</td>
                        <td className="px-3 py-2">{u.count}</td>
                        <td className="px-3 py-2 text-gray-600">{formatLastSeen(u.firstPunch)}</td>
                        <td className="px-3 py-2 text-gray-600">{formatLastSeen(u.lastPunch)}</td>
                        <td className="px-3 py-2 font-mono text-gray-600" dir="ltr">
                          {u.deviceSns.join('، ') || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {linkEmployees.length === 0 || !canLink ? (
                            <span className="text-xs text-gray-400">
                              اضبط «رقم البصمة» من ملف الموظف
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={linkChoice[u.employeeCode] ?? ''}
                                onChange={(e) =>
                                  setLinkChoice((prev) => ({ ...prev, [u.employeeCode]: e.target.value }))
                                }
                                className="input text-sm py-1.5 w-56"
                              >
                                <option value="">— اختر الموظف —</option>
                                {linkEmployees.map((emp) => (
                                  <option key={emp.id} value={String(emp.id)}>
                                    {emp.fullName} ({emp.employeeCode})
                                    {emp.fingerprintCode ? ` — بصمة ${emp.fingerprintCode}` : ''}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => linkCode(u.employeeCode)}
                                disabled={!linkChoice[u.employeeCode] || linkingCode === u.employeeCode}
                                className="btn-primary text-sm py-1.5 disabled:opacity-50"
                              >
                                {linkingCode === u.employeeCode ? 'جارٍ الربط...' : 'ربط'}
                              </button>
                            </div>
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

        {/* Add Device Card */}
        {canManage && (
          <div
            onClick={openAdd}
            className="card border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Plus size={32} className="text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-600 mb-1">إضافة جهاز جديد</h3>
              <p className="text-sm text-gray-400">انقر لإضافة جهاز بصمة جديد</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card bg-blue-50 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-4">إرشادات الاتصال بالأجهزة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 mt-1" />
                <p className="text-sm text-blue-700">تأكد من اتصال الجهاز بالشبكة المحلية</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 mt-1" />
                <p className="text-sm text-blue-700">استخدم عنوان IP ثابت للأجهزة</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 mt-1" />
                <p className="text-sm text-blue-700">قم بمزامنة الأجهزة بشكل دوري</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 mt-1" />
                <p className="text-sm text-blue-700">راجع سجلات الأخطاء عند حدوث مشاكل</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 mt-1" />
                <p className="text-sm text-blue-700">
                  بصمة الموظف تُطابَق برقم البصمة في ملفه أولاً ثم بكوده الوظيفي
                  (EMP...) — الجهاز هو مصدر سجلات الحضور والانصراف لفرعه
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Register / Edit Device Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingDevice ? 'تعديل جهاز البصمة' : 'تسجيل جهاز بصمة'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    اربط الجهاز بالفرع — سجلاته تُحتسب على موظفي هذا الفرع
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم الجهاز *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: بصمة المدخل الرئيسي"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">كود الجهاز / الرقم التسلسلي *</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                      className="input w-full font-mono"
                      placeholder="ZK-2026-005"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الفرع *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">— اختر الفرع —</option>
                      {branches.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      عنوان IP (للسحب المباشر)
                    </label>
                    <input
                      type="text"
                      value={formData.ip}
                      onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="192.168.1.201"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      اتركه فارغاً إن كان الجهاز يدفع السجلات بنفسه
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المنفذ (Port)
                    </label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="4370"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">افتراضي ZKTeco: 4370</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="device-auth-key" className="block text-sm font-medium text-gray-700 mb-2">
                    مفتاح الاتصال (Comm Key)
                  </label>
                  <input id="device-auth-key" type="password" inputMode="numeric" maxLength={6}
                    autoComplete="new-password" dir="ltr" className="input w-full font-mono"
                    value={formData.authKey} disabled={formData.clearAuthKey}
                    placeholder={editingDevice?.hasAuthKey ? '••••••' : '0'}
                    onChange={(e) => setFormData({ ...formData, authKey: e.target.value })} />
                  <p className="text-xs text-gray-500 mt-1">
                    طابق Comm Key المسجل في الجهاز: من 1 إلى 6 أرقام، و0 بلا كلمة مرور.
                    {editingDevice ? ' اترك الحقل فارغاً للاحتفاظ بالمفتاح الحالي؛ لا يمكن عرضه.' : ' اختياري إن لم يكن للجهاز مفتاح اتصال.'}
                  </p>
                  {editingDevice && <label className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                    <input type="checkbox" checked={formData.clearAuthKey}
                      onChange={(e) => setFormData({ ...formData, clearAuthKey: e.target.checked, authKey: '' })} />
                    مسح المفتاح المحفوظ (إذا كان Comm Key في الجهاز = 0)
                  </label>}
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving || !formData.name || !formData.serialNumber || !formData.branchId}
                >
                  {saving ? 'جارٍ الحفظ...' : editingDevice ? 'حفظ التعديلات' : 'تسجيل الجهاز'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
