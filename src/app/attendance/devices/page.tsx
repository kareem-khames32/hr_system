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
} from 'lucide-react'
import { fetchCatalog, createCatalogItem, updateCatalogItem, fetchBranches, type ApiBranch } from '@/lib/api'

interface Device {
  id: number
  name: string
  serialNumber: string
  branchId: number | null
  branchName: string | null
  isActive: boolean
  lastSeen: string | null
}

// «آخر ظهور» — تنسيق محلي مقروء أو «لم يظهر بعد»
const formatLastSeen = (lastSeen: string | null): string => {
  if (!lastSeen) return 'لم يظهر بعد'
  const d = new Date(lastSeen)
  if (Number.isNaN(d.getTime())) return 'لم يظهر بعد'
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

const emptyForm = { name: '', serialNumber: '', branchId: '' }

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
    fetchBranches()
      .then((rows) => setBranches(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الفروع'))
  }, [])

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
    })
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError('')
    try {
      const body = {
        name: formData.name,
        serialNumber: formData.serialNumber,
        branchId: Number(formData.branchId),
      }
      if (editingDevice) {
        await updateCatalogItem('devices', editingDevice.id, body)
      } else {
        await createCatalogItem('devices', body)
      }
      setShowModal(false)
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
    seen: devices.filter((d) => d.lastSeen).length,
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
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              تسجيل جهاز جديد
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

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
              <p className="text-sm text-gray-500">ظهر مؤخراً</p>
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
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  الرقم التسلسلي: <span className="font-mono" dir="ltr">{device.serialNumber}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(device)}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <Edit2 size={16} />
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Device Card */}
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
                  بصمة الموظف تُطابَق بكوده الوظيفي (EMP...) — الجهاز هو مصدر
                  سجلات الحضور والانصراف لفرعه
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
