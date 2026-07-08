'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Briefcase,
  Users,
  Eye,
  Building2,
  Calendar,
  UserPlus,
  FileText,
  CheckCircle2,
  Mail,
  Phone,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchCandidates,
  createCandidate,
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

const emptyAddForm = {
  fullName: '',
  email: '',
  phone: '',
  positionTitle: '',
  branchId: '',
  notes: '',
}

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterBranch, setFilterBranch] = useState('all')

  // نموذج إضافة مرشح
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm)
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

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
      setError(err instanceof Error ? err.message : 'تعذر تحميل المرشحين')
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

  const stageCount = (stage: string) => candidates.filter((c) => c.stage === stage).length

  const moveStage = async (candidate: ApiCandidate, stage: string) => {
    if (!stage || stage === candidate.stage) return
    try {
      setError('')
      await updateCandidate(candidate.id, { stage })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر نقل المرشح بين المراحل')
    }
  }

  const openAdd = () => {
    setAddForm(emptyAddForm)
    setAddError('')
    setShowAdd(true)
  }

  const submitAdd = async () => {
    if (!addForm.fullName.trim() || !addForm.positionTitle.trim()) {
      setAddError('الاسم الكامل والمسمى الوظيفي مطلوبان')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      await createCandidate({
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        positionTitle: addForm.positionTitle.trim(),
        branchId: addForm.branchId ? Number(addForm.branchId) : undefined,
        notes: addForm.notes.trim() || undefined,
      })
      setShowAdd(false)
      setLoading(true)
      await load()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'تعذر إضافة المرشح')
    } finally {
      setAddSaving(false)
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

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.fullName.includes(searchTerm) ||
      candidate.positionTitle.includes(searchTerm) ||
      (candidate.email ?? '').includes(searchTerm)
    const matchesStage = filterStage === 'all' || candidate.stage === filterStage
    const matchesBranch =
      filterBranch === 'all' || String(candidate.branchId ?? '') === filterBranch
    return matchesSearch && matchesStage && matchesBranch
  })

  const stats = {
    total: candidates.length,
    inPipeline: candidates.filter((c) =>
      ['applied', 'screening', 'interview', 'offer'].includes(c.stage)
    ).length,
    offers: stageCount('offer'),
    hired: stageCount('hired'),
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة التوظيف</h1>
            <p className="text-gray-500 mt-1">إدارة المرشحين ومراحل التوظيف</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/recruitment/applicants" className="btn-secondary flex items-center gap-2">
              <Users size={18} />
              المتقدمين
            </Link>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة مرشح
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Briefcase size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المرشحين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">في مسار التوظيف</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inPipeline}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <UserPlus size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عروض قائمة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.offers}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تم تعيينهم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.hired}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن مرشح..."
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
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الفروع</option>
              {branches.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Candidates List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCandidates.length === 0 ? (
              <div className="card text-center py-12">
                <Users size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد مرشحون</p>
              </div>
            ) : (
              filteredCandidates.map((candidate) => (
                <div key={candidate.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{candidate.fullName}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            stageColors[candidate.stage] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {stageLabels[candidate.stage] ?? candidate.stage}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Briefcase size={16} />
                          <span>{candidate.positionTitle}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 size={16} />
                          <span>{branchName(candidate.branchId)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={16} />
                          <span>{candidate.email ?? '—'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone size={16} />
                          <span dir="ltr">{candidate.phone ?? '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Calendar size={14} />
                          <span>
                            تقدّم بتاريخ: {new Date(candidate.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        {candidate.notes && (
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <FileText size={14} />
                            <span>{candidate.notes}</span>
                          </div>
                        )}
                        {candidate.hiredEmployeeId != null && (
                          <div className="flex items-center gap-1 text-success-600 text-sm">
                            <CheckCircle2 size={14} />
                            <span>رقم الموظف: {candidate.hiredEmployeeId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={candidate.stage}
                        onChange={(e) => moveStage(candidate, e.target.value)}
                        className="input w-36 text-sm"
                        disabled={candidate.stage === 'hired'}
                        title="نقل المرحلة"
                      >
                        {stageOrder.map((stage) => (
                          <option key={stage} value={stage} disabled={stage === 'hired'}>
                            {stageLabels[stage]}
                          </option>
                        ))}
                      </select>
                      {(candidate.stage === 'interview' || candidate.stage === 'offer') && (
                        <button
                          onClick={() => openHire(candidate)}
                          className="p-2 bg-success-50 rounded-lg hover:bg-success-100 transition-colors"
                          title="تعيين كموظف"
                        >
                          <UserPlus size={18} className="text-success-600" />
                        </button>
                      )}
                      <Link
                        href="/recruitment/applicants"
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        title="عرض المتقدمين"
                      >
                        <Eye size={18} className="text-gray-600" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Hiring Pipeline Summary */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ملخص مراحل التوظيف</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText size={20} className="text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stageCount('applied')}</p>
              <p className="text-sm text-gray-500">تقدّم</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Eye size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-800">{stageCount('screening')}</p>
              <p className="text-sm text-blue-600">فرز</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users size={20} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-800">{stageCount('interview')}</p>
              <p className="text-sm text-purple-600">مقابلة</p>
            </div>
            <div className="text-center p-4 bg-success-50 rounded-xl">
              <div className="w-12 h-12 bg-success-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={20} className="text-success-600" />
              </div>
              <p className="text-2xl font-bold text-success-800">{stageCount('offer')}</p>
              <p className="text-sm text-success-600">عرض</p>
            </div>
            <div className="text-center p-4 bg-primary-50 rounded-xl">
              <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <UserPlus size={20} className="text-primary-600" />
              </div>
              <p className="text-2xl font-bold text-primary-800">{stageCount('hired')}</p>
              <p className="text-sm text-primary-600">مُعيَّن</p>
            </div>
          </div>
        </div>

        {/* Add Candidate Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">إضافة مرشح جديد</h2>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {addError && <div className="bg-red-50 text-red-700 rounded-xl p-4">{addError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المسمى الوظيفي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={addForm.positionTitle}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, positionTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={addForm.email}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={addForm.phone}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الفرع</label>
                  <select
                    className="input w-full"
                    value={addForm.branchId}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, branchId: e.target.value }))}
                  >
                    <option value="">بدون فرع</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                  <textarea
                    className="input w-full h-24"
                    value={addForm.notes}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-xl">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button onClick={submitAdd} disabled={addSaving} className="btn-primary">
                  {addSaving ? 'جارٍ الحفظ...' : 'حفظ المرشح'}
                </button>
              </div>
            </div>
          </div>
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
