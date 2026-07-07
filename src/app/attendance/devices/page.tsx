'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Fingerprint,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  Download,
  Trash2,
  MapPin,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Building2,
  X,
} from 'lucide-react'
import { branches as branchOptions, getBranchName } from '@/data/branches'

interface Device {
  id: string
  name: string
  model: string
  serialNumber: string
  branchId: string
  ipAddress: string
  location: string
  status: 'online' | 'offline' | 'error'
  lastSync: string
  employeesCount: number
  todayRecords: number
}

const initialDevices: Device[] = [
  {
    id: '1',
    name: 'جهاز البصمة - المدخل الرئيسي',
    model: 'ZKTeco K40',
    serialNumber: 'ZK-2024-001',
    branchId: '1',
    ipAddress: '192.168.1.101',
    location: 'المدخل الرئيسي',
    status: 'online',
    lastSync: '2024-01-21 14:30',
    employeesCount: 156,
    todayRecords: 298,
  },
  {
    id: '2',
    name: 'جهاز البصمة - الدور الثاني',
    model: 'ZKTeco K40',
    serialNumber: 'ZK-2024-002',
    branchId: '1',
    ipAddress: '192.168.1.102',
    location: 'الدور الثاني - تقنية المعلومات',
    status: 'online',
    lastSync: '2024-01-21 14:28',
    employeesCount: 45,
    todayRecords: 87,
  },
  {
    id: '3',
    name: 'جهاز البصمة - المستودع',
    model: 'ZKTeco U160',
    serialNumber: 'ZK-2024-003',
    branchId: '3',
    ipAddress: '192.168.1.103',
    location: 'مبنى المستودعات',
    status: 'offline',
    lastSync: '2024-01-21 09:15',
    employeesCount: 28,
    todayRecords: 42,
  },
  {
    id: '4',
    name: 'جهاز البصمة - الكافيتريا',
    model: 'ZKTeco iClock880',
    serialNumber: 'ZK-2024-004',
    branchId: '2',
    ipAddress: '192.168.1.104',
    location: 'الكافيتريا',
    status: 'error',
    lastSync: '2024-01-20 18:00',
    employeesCount: 156,
    todayRecords: 0,
  },
]

const statusLabels = {
  online: 'متصل',
  offline: 'غير متصل',
  error: 'خطأ',
}

const statusColors = {
  online: 'bg-success-50 text-success-700',
  offline: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
}

const statusIcons = {
  online: <Wifi size={16} className="text-success-600" />,
  offline: <WifiOff size={16} className="text-gray-500" />,
  error: <AlertTriangle size={16} className="text-red-600" />,
}

export default function DevicesPage() {
  const [devices, setDevices] = useState(initialDevices)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serialNumber: '',
    ipAddress: '',
    location: '',
    branchId: '',
  })

  const filteredDevices = devices.filter(
    (device) =>
      (device.name.includes(searchTerm) ||
        device.serialNumber.includes(searchTerm) ||
        device.location.includes(searchTerm)) &&
      (!filterBranch || device.branchId === filterBranch)
  )

  const handleRegister = () => {
    setDevices([
      ...devices,
      {
        id: String(Date.now()),
        ...formData,
        status: 'offline' as const,
        lastSync: '—',
        employeesCount: 0,
        todayRecords: 0,
      },
    ])
    setFormData({ name: '', model: '', serialNumber: '', ipAddress: '', location: '', branchId: '' })
    setShowModal(false)
  }

  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    error: devices.filter((d) => d.status === 'error').length,
    todayRecords: devices.reduce((sum, d) => sum + d.todayRecords, 0),
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
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw size={18} />
              مزامنة الكل
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              تسجيل جهاز جديد
            </button>
          </div>
        </div>

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
              <p className="text-sm text-gray-500">متصل</p>
              <p className="text-2xl font-bold text-gray-800">{stats.online}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <WifiOff size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">غير متصل</p>
              <p className="text-2xl font-bold text-gray-800">{stats.offline}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أخطاء</p>
              <p className="text-2xl font-bold text-gray-800">{stats.error}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Activity size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">سجلات اليوم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.todayRecords}</p>
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
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              className={`card border-2 ${
                device.status === 'online'
                  ? 'border-success-200'
                  : device.status === 'error'
                  ? 'border-red-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      device.status === 'online'
                        ? 'bg-success-50'
                        : device.status === 'error'
                        ? 'bg-red-50'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Fingerprint
                      size={28}
                      className={
                        device.status === 'online'
                          ? 'text-success-600'
                          : device.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{device.name}</h3>
                    <p className="text-sm text-gray-500">{device.model}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg mt-1">
                      <Building2 size={12} />
                      {getBranchName(device.branchId) || 'غير مرتبط بفرع'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcons[device.status]}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[device.status]}`}>
                    {statusLabels[device.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{device.location}</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">آخر مزامنة: {device.lastSync.split(' ')[1]}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-800">{device.employeesCount}</p>
                  <p className="text-xs text-gray-500">موظف مسجل</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-800">{device.todayRecords}</p>
                  <p className="text-xs text-gray-500">سجل اليوم</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-mono text-gray-600">{device.ipAddress}</p>
                  <p className="text-xs text-gray-500">IP</p>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-4">
                الرقم التسلسلي: {device.serialNumber}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2">
                  <RefreshCw size={16} />
                  مزامنة
                </button>
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2">
                  <Download size={16} />
                  سحب البيانات
                </button>
                <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
                  <Settings size={18} className="text-gray-600" />
                </button>
                <button className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
                  <Edit2 size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Device Card */}
        <div
          onClick={() => setShowModal(true)}
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

        {/* Register Device Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تسجيل جهاز بصمة</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    اربط الجهاز بالفرع — سجلاته تُحتسب على موظفي هذا الفرع
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الموديل</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="input w-full"
                      placeholder="مثال: ZKTeco K40"
                      dir="ltr"
                    />
                  </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان IP</label>
                    <input
                      type="text"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="192.168.1.105"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الفرع *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">— اختر الفرع —</option>
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الموقع داخل الفرع</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="input w-full"
                      placeholder="مثال: المدخل الرئيسي"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleRegister}
                  className="btn-primary"
                  disabled={!formData.name || !formData.serialNumber || !formData.branchId}
                >
                  تسجيل الجهاز
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
