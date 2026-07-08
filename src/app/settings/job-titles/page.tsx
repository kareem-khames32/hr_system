'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Briefcase,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Award,
} from 'lucide-react'
import { createCatalogItem, fetchCatalog, updateCatalogItem } from '@/lib/api'

interface JobTitle {
  id: number
  title: string
  titleEn: string | null
  isActive: boolean
}

const emptyForm = {
  title: '',
  titleEn: '',
  isActive: true,
}

export default function JobTitlesPage() {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const data = await fetchCatalog<JobTitle>('job-titles')
      setJobTitles(data)
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

  const filteredJobTitles = jobTitles.filter(
    (job) =>
      job.title.includes(searchQuery) ||
      (job.titleEn ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = jobTitles.filter((j) => j.isActive).length

  const handleOpenModal = (job?: JobTitle) => {
    setModalError(null)
    if (job) {
      setEditingJob(job)
      setFormData({
        title: job.title,
        titleEn: job.titleEn ?? '',
        isActive: job.isActive,
      })
    } else {
      setEditingJob(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload = {
      title: formData.title,
      titleEn: formData.titleEn || undefined,
      isActive: formData.isActive,
    }
    try {
      if (editingJob) {
        const updated = await updateCatalogItem<JobTitle>(
          'job-titles',
          editingJob.id,
          payload
        )
        setJobTitles(jobTitles.map((j) => (j.id === editingJob.id ? updated : j)))
      } else {
        const created = await createCatalogItem<JobTitle>('job-titles', payload)
        setJobTitles([...jobTitles, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (job: JobTitle) => {
    setActiveMenu(null)
    try {
      const updated = await updateCatalogItem<JobTitle>('job-titles', job.id, {
        isActive: !job.isActive,
      })
      setJobTitles(jobTitles.map((j) => (j.id === job.id ? updated : j)))
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
          <span className="text-gray-800">المسميات الوظيفية</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المسميات الوظيفية</h1>
            <p className="text-gray-500 mt-1">إدارة المسميات والوظائف في الشركة</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة مسمى وظيفي
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Briefcase size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">المسميات الوظيفية</p>
                <p className="text-2xl font-bold text-gray-800">{jobTitles.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مسميات مفعّلة</p>
                <p className="text-2xl font-bold text-success-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <XCircle size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مسميات معطّلة</p>
                <p className="text-2xl font-bold text-gray-800">
                  {jobTitles.length - activeCount}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Award size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">بمسمى إنجليزي</p>
                <p className="text-2xl font-bold text-gray-800">
                  {jobTitles.filter((j) => j.titleEn).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن مسمى وظيفي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    المسمى الوظيفي
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الرقم
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الحالة
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredJobTitles.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                          <Briefcase size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.titleEn ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        #{job.id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.isActive
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {job.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === job.id ? null : job.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {activeMenu === job.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(job)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                              >
                                <Edit size={16} />
                                تعديل
                              </button>
                              <button
                                onClick={() => toggleActive(job)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                              >
                                {job.isActive ? (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredJobTitles.length === 0 && (
              <div className="p-12 text-center">
                <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  لا توجد مسميات وظيفية
                </h3>
                <p className="text-gray-500">أضف أول مسمى وظيفي من الزر أعلاه</p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingJob ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المسمى (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: مطور برمجيات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المسمى (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.titleEn}
                      onChange={(e) =>
                        setFormData({ ...formData, titleEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Software Developer"
                      dir="ltr"
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
                  <span className="text-sm text-gray-700">مسمى نشط</span>
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
                  disabled={!formData.title || saving}
                >
                  {saving ? 'جارٍ الحفظ...' : editingJob ? 'حفظ التغييرات' : 'إضافة المسمى'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
