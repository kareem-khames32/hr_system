'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Award,
  Edit,
  MoreVertical,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { createCatalogItem, fetchCatalog, updateCatalogItem } from '@/lib/api'
import { useCurrency } from '@/lib/currency'

interface Grade {
  id: number
  name: string
  minSalary: number
  maxSalary: number
  isActive: boolean
}

const emptyForm = {
  name: '',
  minSalary: '',
  maxSalary: '',
  isActive: true,
}

export default function GradesPage() {
  const currency = useCurrency()
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const data = await fetchCatalog<Grade>('grades')
      setGrades(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredGrades = grades.filter((grade) => grade.name.includes(searchQuery))

  const activeCount = grades.filter((g) => g.isActive).length
  const avgSalary =
    grades.length > 0
      ? Math.round(
          grades.reduce((sum, g) => sum + (Number(g.minSalary) + Number(g.maxSalary)) / 2, 0) /
            grades.length
        )
      : 0
  const maxSalary =
    grades.length > 0 ? Math.max(...grades.map((g) => Number(g.maxSalary))) : 0

  // SET-18: شريط نطاق الدرجة على مقياس مشترك (0 ← أعلى حد أقصى بين الدرجات): يبدأ عند
  // الحد الأدنى (يمين، اتجاه الصفحة) ويمتد حتى الأقصى — كان عرضه 100% دائماً
  const rangeBarStyle = (g: Grade) => {
    if (!(maxSalary > 0)) return { right: '0%', width: '0%' }
    const lo = Math.min(Math.max(Number(g.minSalary) || 0, 0), maxSalary)
    const hi = Math.min(Math.max(Number(g.maxSalary) || 0, lo), maxSalary)
    const width = Math.max(((hi - lo) / maxSalary) * 100, 2) // النطاق الضيق يظهر
    const start = Math.min((lo / maxSalary) * 100, 100 - width)
    return { right: `${start}%`, width: `${width}%` }
  }

  const handleOpenModal = (grade?: Grade) => {
    setModalError(null)
    if (grade) {
      setEditingGrade(grade)
      setFormData({
        name: grade.name,
        minSalary: String(grade.minSalary),
        maxSalary: String(grade.maxSalary),
        isActive: grade.isActive,
      })
    } else {
      setEditingGrade(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    // نطاق صحيح: الحد الأدنى لا يتجاوز الأقصى (الخادم يرفضه أيضاً)
    if (
      formData.minSalary !== '' &&
      formData.maxSalary !== '' &&
      Number(formData.minSalary) > Number(formData.maxSalary)
    ) {
      setModalError('الحد الأدنى للراتب لا يتجاوز الحد الأقصى')
      return
    }
    setSaving(true)
    setModalError(null)
    const payload = {
      name: formData.name,
      minSalary: Number(formData.minSalary) || 0,
      maxSalary: Number(formData.maxSalary) || 0,
      isActive: formData.isActive,
    }
    try {
      if (editingGrade) {
        const updated = await updateCatalogItem<Grade>('grades', editingGrade.id, payload)
        setGrades(grades.map((g) => (g.id === editingGrade.id ? updated : g)))
      } else {
        const created = await createCatalogItem<Grade>('grades', payload)
        setGrades([...grades, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (grade: Grade) => {
    setActiveMenu(null)
    try {
      const updated = await updateCatalogItem<Grade>('grades', grade.id, {
        isActive: !grade.isActive,
      })
      setGrades(grades.map((g) => (g.id === grade.id ? updated : g)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الدرجات الوظيفية</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الدرجات الوظيفية</h1>
            <p className="text-gray-500 mt-1">سلم الدرجات والرواتب</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة درجة وظيفية
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Award size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الدرجات الوظيفية</p>
                <p className="text-2xl font-bold text-gray-800">{grades.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">درجات مفعّلة</p>
                <p className="text-2xl font-bold text-success-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <DollarSign size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط الراتب</p>
                <p className="text-2xl font-bold text-gray-800">
                  {avgSalary.toLocaleString()} <span className="text-sm text-gray-500">{currency}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أعلى راتب</p>
                <p className="text-2xl font-bold text-gray-800">
                  {maxSalary.toLocaleString()} <span className="text-sm text-gray-500">{currency}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative max-w-md">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="البحث عن درجة وظيفية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 w-full"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Grades Grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-6">
            {filteredGrades.map((grade, index) => (
              <div
                key={grade.id}
                className={`card p-6 relative ${!grade.isActive ? 'opacity-60' : ''}`}
              >
                {/* Actions */}
                <div className="absolute top-4 left-4">
                  <button
                    onClick={() =>
                      setActiveMenu(activeMenu === grade.id ? null : grade.id)
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>

                  {activeMenu === grade.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <button
                          onClick={() => {
                            handleOpenModal(grade)
                            setActiveMenu(null)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={16} />
                          تعديل
                        </button>
                        <button
                          onClick={() => toggleActive(grade)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          {grade.isActive ? (
                            <>
                              <XCircle size={16} />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              تفعيل
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{grade.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {grade.isActive ? 'درجة مفعّلة' : 'درجة معطّلة'}
                    </p>
                  </div>
                </div>

                {/* Salary Range */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">نطاق الراتب</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-800">
                        {Number(grade.minSalary).toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm mr-1">{currency}</span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div
                        className="relative h-2 bg-gray-200 rounded-full"
                        title={`النطاق نسبةً لأعلى حد أقصى بين الدرجات (${maxSalary.toLocaleString()} ${currency})`}
                      >
                        <div
                          className="absolute inset-y-0 bg-gradient-to-l from-primary-500 to-primary-300 rounded-full"
                          style={rangeBarStyle(grade)}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-primary-600">
                        {Number(grade.maxSalary).toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm mr-1">{currency}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">درجة رقم {grade.id}</span>
                  </div>
                  <span
                    className={`badge text-xs ${
                      grade.isActive ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {grade.isActive ? 'مفعّلة' : 'معطّلة'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredGrades.length === 0 && (
          <div className="card p-12 text-center">
            <Award size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد درجات وظيفية</h3>
            <p className="text-gray-500">أضف أول درجة وظيفية من الزر أعلاه</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingGrade ? 'تعديل الدرجة الوظيفية' : 'إضافة درجة وظيفية'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الدرجة *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input w-full"
                    placeholder="مثال: الدرجة الأولى"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأدنى للراتب ({currency}) *
                    </label>
                    <input
                      type="number"
                      value={formData.minSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, minSalary: e.target.value })
                      }
                      className="input w-full"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأقصى للراتب ({currency}) *
                    </label>
                    <input
                      type="number"
                      value={formData.maxSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, maxSalary: e.target.value })
                      }
                      className="input w-full"
                      min={0}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">درجة نشطة</span>
                </label>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={!formData.name || saving}
                >
                  {saving ? 'جارٍ الحفظ...' : editingGrade ? 'حفظ التغييرات' : 'إضافة الدرجة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
