'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  UserCheck,
  UserX,
  FileText,
  Building2,
  X,
} from 'lucide-react'
import {
  fetchCandidates,
  updateCandidate,
  hireCandidate,
  fetchBranches,
  type ApiCandidate,
  type ApiBranch,
} from '@/lib/api'

const stageLabels: Record<string, string> = {
  applied: 'تقدّم',
  screening: 'فرز',
  interview: 'مقابلة',
  offer: 'عرض',
  hired: 'مُعيَّن',
  rejected: 'مرفوض',
}

const stageColors: Record<string, string> = {
  applied: 'bg-gray-100 text-gray-700',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  offer: 'bg-warning-50 text-warning-700',
  hired: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

const stageOrder = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']

export default function ApplicantsPage() {
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // نافذة التعيين
  const [hireTarget, setHireTarget] = useState<ApiCandidate | null>(null)
  const [hireForm, setHireForm] = useState({ employeeCode: '', branchId: '', basicSalary: '' })
  const [hireError, setHireError] = useState('')
  const [hireSaving, setHireSaving] = useState(false)
  const [hiredEmployeeId, setHiredEmployeeId] = useState<number | null>(null)

  const load = async () => {
    try {
      setError('')
      const data = await fetchCandidates()
      setCandidates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المتقدمين')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetchBranches()
      .then(setBranches)
      .catch(() => {})
  }, [])

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? '—'

  const moveStage = async (candidate: ApiCandidate, stage: string) => {
    if (!stage || stage === candidate.stage) return
    try {
      setError('')
      await updateCandidate(candidate.id, { stage })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر نقل المتقدم بين المراحل')
    }
  }

  const openHire = (candidate: ApiCandidate) => {
    setHireTarget(candidate)
    setHireForm({
      employeeCode: '',
      branchId: candidate.branchId ? String(candidate.branchId) : '',
      basicSalary: '',
    })
    setHireError('')
    setHiredEmployeeId(null)
  }

  const submitHire = async () => {
    if (!hireTarget) return
    if (!hireForm.employeeCode.trim() || !hireForm.branchId) {
      setHireError('الرقم الوظيفي والفرع مطلوبان')
      return
    }
    setHireSaving(true)
    setHireError('')
    try {
      const res = await hireCandidate(hireTarget.id, {
        employeeCode: hireForm.employeeCode.trim(),
        branchId: Number(hireForm.branchId),
        ...(hireForm.basicSalary ? { basicSalary: Number(hireForm.basicSalary) } : {}),
      })
      setHiredEmployeeId(res.employee.id)
      await load()
    } catch (err) {
      setHireError(err instanceof Error ? err.message : 'تعذر إتمام التعيين')
    } finally {
      setHireSaving(false)
    }
  }

  const filteredApplicants = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.fullName.includes(searchTerm) ||
      (candidate.email ?? '').includes(searchTerm) ||
      candidate.positionTitle.includes(searchTerm)
    const matchesStage = filterStage === 'all' || candidate.stage === filterStage
    const matchesPosition =
      filterPosition === 'all' || candidate.positionTitle === filterPosition
    return matchesSearch && matchesStage && matchesPosition
  })

  const uniquePositions = [...new Set(candidates.map((c) => c.positionTitle))]

  const selectedApplicant = candidates.find((c) => c.id === selectedId) ?? null

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المتقدمين للوظائف</h1>
            <p className="text-gray-500 mt-1">إدارة ومتابعة طلبات التوظيف</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-6 gap-4">
              {stageOrder.map((stage) => {
                const count = candidates.filter((c) => c.stage === stage).length
                return (
                  <button
                    key={stage}
                    onClick={() => setFilterStage(filterStage === stage ? 'all' : stage)}
                    className={`card text-center hover:shadow-lg transition-all ${
                      filterStage === stage ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <p className="text-2xl font-bold text-gray-800">{count}</p>
                    <p className="text-sm text-gray-500">{stageLabels[stage]}</p>
                  </button>
                )
              })}
            </div>

            {/* Filters */}
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="بحث عن متقدم..."
                    className="input pr-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="input w-40"
                >
                  <option value="all">كل المراحل</option>
                  {stageOrder.map((stage) => (
                    <option key={stage} value={stage}>
                      {stageLabels[stage]}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="input w-56"
                >
                  <option value="all">كل الوظائف</option>
                  {uniquePositions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Applicants Grid */}
            {filteredApplicants.length === 0 ? (
              <div className="card text-center py-12">
                <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد متقدمون</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredApplicants.map((applicant) => (
                  <div
                    key={applicant.id}
                    className={`card hover:shadow-lg transition-all cursor-pointer ${
                      selectedId === applicant.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                    onClick={() => setSelectedId(applicant.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {applicant.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-800">{applicant.fullName}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              stageColors[applicant.stage] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {stageLabels[applicant.stage] ?? applicant.stage}
                          </span>
                        </div>
                        <p className="text-sm text-primary-600 mb-2">{applicant.positionTitle}</p>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Mail size={14} />
                            <span className="truncate">{applicant.email ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            <span dir="ltr">{applicant.phone ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 size={14} />
                            <span className="truncate">{branchName(applicant.branchId)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>
                              {new Date(applicant.createdAt).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              value={applicant.stage}
                              onChange={(e) => moveStage(applicant, e.target.value)}
                              className="input w-32 text-sm"
                              disabled={applicant.stage === 'hired'}
                              title="نقل المرحلة"
                            >
                              {stageOrder.map((stage) => (
                                <option key={stage} value={stage} disabled={stage === 'hired'}>
                                  {stageLabels[stage]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            {(applicant.stage === 'interview' || applicant.stage === 'offer') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openHire(applicant)
                                }}
                                className="p-2 bg-success-50 rounded-lg hover:bg-success-100 transition-colors"
                                title="تعيين كموظف"
                              >
                                <UserCheck size={16} className="text-success-600" />
                              </button>
                            )}
                            {applicant.stage !== 'hired' && applicant.stage !== 'rejected' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveStage(applicant, 'rejected')
                                }}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-red-100 transition-colors"
                                title="رفض المتقدم"
                              >
                                <UserX size={16} className="text-gray-600 hover:text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Applicant Details Panel */}
            {selectedApplicant && (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">تفاصيل المتقدم</h2>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Profile Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                        {selectedApplicant.fullName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {selectedApplicant.fullName}
                        </h3>
                        <p className="text-primary-600">{selectedApplicant.positionTitle}</p>
                        <p className="text-sm text-gray-500">
                          {branchName(selectedApplicant.branchId)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={16} className="text-gray-400" />
                        <span>{selectedApplicant.email ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} className="text-gray-400" />
                        <span dir="ltr">{selectedApplicant.phone ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase size={16} className="text-gray-400" />
                        <span>{selectedApplicant.positionTitle}</span>
                      </div>
                    </div>
                  </div>

                  {/* Application Info */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">معلومات الطلب</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">تاريخ التقديم:</span>
                        <span className="font-medium text-gray-800">
                          {new Date(selectedApplicant.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">الفرع:</span>
                        <span className="font-medium text-gray-800">
                          {branchName(selectedApplicant.branchId)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">المرحلة:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            stageColors[selectedApplicant.stage] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {stageLabels[selectedApplicant.stage] ?? selectedApplicant.stage}
                        </span>
                      </div>
                      {selectedApplicant.hiredEmployeeId != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">رقم الموظف:</span>
                          <span className="font-medium text-gray-800">
                            {selectedApplicant.hiredEmployeeId}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedApplicant.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">{selectedApplicant.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">الإجراءات</h4>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        نقل إلى مرحلة
                      </label>
                      <select
                        value={selectedApplicant.stage}
                        onChange={(e) => moveStage(selectedApplicant, e.target.value)}
                        className="input w-full"
                        disabled={selectedApplicant.stage === 'hired'}
                      >
                        {stageOrder.map((stage) => (
                          <option key={stage} value={stage} disabled={stage === 'hired'}>
                            {stageLabels[stage]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      {(selectedApplicant.stage === 'interview' ||
                        selectedApplicant.stage === 'offer') && (
                        <button
                          onClick={() => openHire(selectedApplicant)}
                          className="w-full py-2 px-4 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <UserCheck size={18} />
                          تعيين كموظف
                        </button>
                      )}
                      {selectedApplicant.stage !== 'hired' &&
                        selectedApplicant.stage !== 'rejected' && (
                          <button
                            onClick={() => moveStage(selectedApplicant, 'rejected')}
                            className="w-full py-2 px-4 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <UserX size={18} />
                            رفض المتقدم
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Hire Modal */}
        {hireTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  تعيين المرشح: {hireTarget.fullName}
                </h2>
                <button
                  onClick={() => setHireTarget(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {hireError && <div className="bg-red-50 text-red-700 rounded-xl p-4">{hireError}</div>}
                {hiredEmployeeId != null ? (
                  <div className="bg-success-50 text-success-700 rounded-xl p-4">
                    تم التعيين بنجاح — رقم الموظف الجديد: {hiredEmployeeId}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الرقم الوظيفي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        placeholder="مثال: EMP100"
                        value={hireForm.employeeCode}
                        onChange={(e) =>
                          setHireForm((prev) => ({ ...prev, employeeCode: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفرع <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="input w-full"
                        value={hireForm.branchId}
                        onChange={(e) =>
                          setHireForm((prev) => ({ ...prev, branchId: e.target.value }))
                        }
                      >
                        <option value="">اختر الفرع</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الراتب الأساسي
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={hireForm.basicSalary}
                        onChange={(e) =>
                          setHireForm((prev) => ({ ...prev, basicSalary: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-xl">
                {hiredEmployeeId != null ? (
                  <button onClick={() => setHireTarget(null)} className="btn-primary">
                    إغلاق
                  </button>
                ) : (
                  <>
                    <button onClick={() => setHireTarget(null)} className="btn-secondary">
                      إلغاء
                    </button>
                    <button onClick={submitHire} disabled={hireSaving} className="btn-primary">
                      {hireSaving ? 'جارٍ التعيين...' : 'تعيين'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
