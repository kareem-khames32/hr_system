'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Calendar,
  Edit2,
  Star,
  Sun,
  X,
  AlertTriangle,
} from 'lucide-react'
import { fetchCatalog, createCatalogItem, updateCatalogItem } from '@/lib/api'

interface Holiday {
  id: number
  name: string
  date: string
  endDate?: string | null
  country?: string | null
}

const daysOf = (h: Holiday): number => {
  if (!h.endDate) return 1
  const start = new Date(h.date).getTime()
  const end = new Date(h.endDate).getTime()
  if (isNaN(start) || isNaN(end) || end < start) return 1
  return Math.round((end - start) / 86400000) + 1
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Holiday | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formCountry, setFormCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    fetchCatalog<Holiday>('holidays')
      .then(setHolidays)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل العطلات الرسمية'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openAdd = () => {
    setEditing(null)
    setFormName('')
    setFormDate('')
    setFormEndDate('')
    setFormCountry('')
    setSaveError('')
    setShowModal(true)
  }

  const openEdit = (h: Holiday) => {
    setEditing(h)
    setFormName(h.name)
    setFormDate(h.date)
    setFormEndDate(h.endDate ?? '')
    setFormCountry(h.country ?? '')
    setSaveError('')
    setShowModal(true)
  }

  const save = async () => {
    setSaveError('')
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: formName,
      date: formDate,
      endDate: formEndDate || null,
      country: formCountry || null,
    }
    try {
      if (editing) {
        await updateCatalogItem('holidays', editing.id, payload)
      } else {
        await createCatalogItem('holidays', payload)
      }
      setShowModal(false)
      load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'تعذر حفظ العطلة')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalDays = holidays.reduce((sum, h) => sum + daysOf(h), 0)
  const upcoming = holidays.filter((h) => (h.endDate ?? h.date) >= today).length
  const multiDay = holidays.filter((h) => daysOf(h) > 1).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإجازات الرسمية</h1>
            <p className="text-gray-500 mt-1">إدارة العطلات والإجازات الرسمية</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة إجازة
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي العطلات</p>
              <p className="text-2xl font-bold text-gray-800">{holidays.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عطلات قادمة</p>
              <p className="text-2xl font-bold text-gray-800">{upcoming}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عطلات متعددة الأيام</p>
              <p className="text-2xl font-bold text-gray-800">{multiDay}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Sun size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأيام</p>
              <p className="text-2xl font-bold text-gray-800">{totalDays}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <>
        {/* Calendar View */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">التقويم السنوي</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              'يناير', 'فبراير', 'مارس', 'أبريل',
              'مايو', 'يونيو', 'يوليو', 'أغسطس',
              'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ].map((month, index) => {
              const monthHolidays = holidays.filter((h) => {
                const hMonth = new Date(h.date).getMonth()
                return hMonth === index
              })
              return (
                <div key={month} className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-800 mb-2">{month}</h3>
                  {monthHolidays.length > 0 ? (
                    <div className="space-y-2">
                      {monthHolidays.map((h) => (
                        <div
                          key={h.id}
                          className="p-2 rounded-lg text-xs bg-primary-100 text-primary-700"
                        >
                          <div className="flex items-center gap-1">
                            <Star size={12} />
                            <span className="font-medium">{h.name}</span>
                          </div>
                          <span className="text-xs opacity-75">
                            {new Date(h.date).getDate()}
                            {h.endDate ? ` - ${new Date(h.endDate).getDate()}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">لا توجد إجازات</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Holidays List */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">قائمة الإجازات</h2>
          <div className="space-y-3">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100 text-primary-700">
                    <Star size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{holiday.name}</h3>
                    <p className="text-sm text-gray-500">
                      {holiday.date}
                      {holiday.endDate && ` - ${holiday.endDate}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    {holiday.country && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {holiday.country}
                      </span>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{daysOf(holiday)} يوم</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(holiday)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-200"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {holidays.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد عطلات مسجلة</p>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">
                {editing ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {saveError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} />
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">اسم العطلة *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  placeholder="مثال: عيد الفطر"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">تاريخ البداية *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">تاريخ النهاية (اختياري)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">الدولة (اختياري)</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  className="input"
                  placeholder="مثال: EG"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={save}
                disabled={saving || !formName || !formDate}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة العطلة'}
              </button>
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
