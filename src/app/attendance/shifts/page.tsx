'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Edit,
  Clock,
  Moon,
  Users,
  Calendar,
  Copy,
  X,
} from 'lucide-react'
import { fetchCatalog, createCatalogItem, updateCatalogItem } from '@/lib/api'

interface Shift {
  id: number
  name: string
  startTime: string
  endTime: string
  isActive: boolean
}

// ألوان الكروت — تُسنَد بالتناوب حسب ترتيب الوردية
const shiftColors = [
  'bg-primary-500',
  'bg-warning-500',
  'bg-purple-500',
  'bg-success-500',
  'bg-cyan-500',
  'bg-emerald-500',
]

// وردية ليلية = تنتهي بعد منتصف الليل (النهاية قبل البداية)
const isNightShift = (s: Shift) => s.endTime < s.startTime

// ساعات العمل محسوبة من وقتي البداية والنهاية
const workHours = (s: Shift): number => {
  const [sh, sm] = s.startTime.split(':').map(Number)
  const [eh, em] = s.endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

const emptyForm = { name: '', startTime: '', endTime: '' }

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const loadShifts = () => {
    setLoading(true)
    setError('')
    fetchCatalog<Shift>('shifts')
      .then((rows) => setShifts(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الورديات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadShifts()
  }, [])

  const openAdd = () => {
    setEditingShift(null)
    setFormData(emptyForm)
    setModalError('')
    setShowModal(true)
  }

  const openEdit = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime })
    setModalError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError('')
    try {
      if (editingShift) {
        await updateCatalogItem('shifts', editingShift.id, { ...formData })
      } else {
        await createCatalogItem('shifts', { ...formData })
      }
      setShowModal(false)
      loadShifts()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'تعذر حفظ الوردية')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (shift: Shift) => {
    setTogglingId(shift.id)
    setError('')
    try {
      await updateCatalogItem('shifts', shift.id, { isActive: !shift.isActive })
      loadShifts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث حالة الوردية')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredShifts = shifts.filter((shift) => shift.name.includes(searchQuery))

  const activeShifts = shifts.filter((s) => s.isActive)
  const inactiveShifts = shifts.filter((s) => !s.isActive)
  const nightShifts = shifts.filter((s) => isNightShift(s))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الورديات</h1>
            <p className="text-gray-500 mt-1">تعريف وإدارة ورديات العمل</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة وردية
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الورديات</p>
              <p className="text-2xl font-bold text-gray-800">{shifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات نشطة</p>
              <p className="text-2xl font-bold text-success-600">{activeShifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات غير نشطة</p>
              <p className="text-2xl font-bold text-warning-600">{inactiveShifts.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Moon size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ورديات ليلية</p>
              <p className="text-2xl font-bold text-purple-600">{nightShifts.length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative w-96">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن وردية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
          </div>
        </div>

        {/* Shifts Grid */}
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShifts.map((shift, index) => {
              const color = shiftColors[index % shiftColors.length]
              return (
                <div
                  key={shift.id}
                  className={`card relative overflow-hidden ${!shift.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Color Bar */}
                  <div className={`absolute top-0 right-0 left-0 h-1.5 ${color}`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-2xl flex items-center justify-center`}>
                        <span className={`${color.replace('bg-', 'text-')}`}>
                          {isNightShift(shift) ? <Moon size={18} /> : <Clock size={18} />}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{shift.name}</h3>
                        <p className="text-sm text-gray-400">
                          {isNightShift(shift) ? 'وردية ليلية' : 'وردية نهارية'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${color} bg-opacity-10 ${color.replace('bg-', 'text-')}`}>
                        #{shift.id}
                      </span>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">بداية الدوام</p>
                        <p className="text-xl font-bold text-success-600 font-mono">{shift.startTime}</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-20 h-0.5 bg-gray-200 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                            <span className="text-xs text-gray-400">{workHours(shift)} ساعات</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">نهاية الدوام</p>
                        <p className="text-xl font-bold text-danger-600 font-mono">{shift.endTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600" dir="ltr">
                        {shift.startTime} – {shift.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(shift)}
                        disabled={togglingId === shift.id}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                          shift.isActive
                            ? 'bg-success-50 text-success-600 hover:bg-success-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {togglingId === shift.id ? '...' : shift.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(shift)}
                      className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-1"
                    >
                      <Edit size={16} />
                      تعديل
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add New Shift Card */}
            <button
              onClick={openAdd}
              className="card border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[300px]"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Plus size={32} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-600">إضافة وردية جديدة</p>
                <p className="text-sm text-gray-400 mt-1">أنشئ وردية عمل جديدة</p>
              </div>
            </button>
          </div>
        )}

        {/* Shift Assignment Section */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">تعيين الورديات للموظفين</h3>
          <div className="grid grid-cols-3 gap-4">
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Calendar size={24} className="text-primary-500 mb-2" />
              <p className="font-medium text-gray-800">الجدول الأسبوعي</p>
              <p className="text-sm text-gray-500 mt-1">عرض وتعديل جدول الورديات الأسبوعي</p>
            </button>
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Users size={24} className="text-success-500 mb-2" />
              <p className="font-medium text-gray-800">تعيين جماعي</p>
              <p className="text-sm text-gray-500 mt-1">تعيين وردية لمجموعة موظفين</p>
            </button>
            <button className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-right">
              <Copy size={24} className="text-warning-500 mb-2" />
              <p className="font-medium text-gray-800">نسخ من أسبوع سابق</p>
              <p className="text-sm text-gray-500 mt-1">نسخ جدول الورديات من أسبوع سابق</p>
            </button>
          </div>
        </div>

        {/* Add / Edit Shift Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingShift ? 'تعديل الوردية' : 'إضافة وردية جديدة'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    أوقات البداية والنهاية بصيغة HH:mm — مثال: 08:00
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم الوردية *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: الوردية الصباحية"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">بداية الدوام *</label>
                    <input
                      type="text"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="08:00"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نهاية الدوام *</label>
                    <input
                      type="text"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input w-full font-mono"
                      placeholder="17:00"
                      dir="ltr"
                    />
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
                  disabled={saving || !formData.name || !formData.startTime || !formData.endTime}
                >
                  {saving ? 'جارٍ الحفظ...' : editingShift ? 'حفظ التعديلات' : 'إضافة الوردية'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
