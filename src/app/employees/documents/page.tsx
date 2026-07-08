'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  FolderOpen,
  Calendar,
  User,
  Clock,
  MoreVertical,
  Plus,
  Grid,
  List,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  CheckSquare,
  Square,
  RefreshCw,
  Send,
  Printer,
  Link2,
  FolderPlus,
  Users,
  ChevronDown,
  Bell,
  Settings,
  Edit2,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchDocuments,
  fetchEmployees,
  createDocument,
  updateDocument,
  ApiEmployee,
} from '@/lib/api'

interface DocumentRow {
  id: number
  name: string
  number: string
  type: 'pdf' | 'image' | 'doc' | 'other'
  category: string
  employeeName: string
  employeeId: number
  employeeCode: string
  issueDate: string
  expiryDate: string
  notes: string
  status: 'valid' | 'expiring' | 'expired'
}

const typeIcons = {
  pdf: FileText,
  image: Image,
  doc: FileText,
  other: File,
}

const typeColors = {
  pdf: 'bg-red-100 text-red-600',
  image: 'bg-blue-100 text-blue-600',
  doc: 'bg-blue-100 text-blue-600',
  other: 'bg-gray-100 text-gray-600',
}

const statusLabels = {
  valid: 'ساري',
  expiring: 'قارب على الانتهاء',
  expired: 'منتهي',
}

const statusColors = {
  valid: 'bg-success-50 text-success-700',
  expiring: 'bg-warning-50 text-warning-700',
  expired: 'bg-red-100 text-red-700',
}

const EXPIRING_DAYS = 60

const emptyForm = {
  docType: '',
  employeeId: '',
  number: '',
  issueDate: '',
  expiryDate: '',
  notes: '',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('الكل')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedDocs, setSelectedDocs] = useState<number[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // نموذج الإضافة/التعديل — يُرسل إلى /documents
  const [uploadForm, setUploadForm] = useState({ ...emptyForm })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [docs, emps] = await Promise.all([fetchDocuments(), fetchEmployees()])
      setEmployees(emps)
      const today = new Date().toISOString().slice(0, 10)
      const expiryLimit = new Date(Date.now() + EXPIRING_DAYS * 86400000)
        .toISOString()
        .slice(0, 10)
      setDocuments(
        docs.map((d) => {
          const expiry = d.expiryDate ? String(d.expiryDate).slice(0, 10) : ''
          const expired = d.expired ?? (!!expiry && expiry < today)
          return {
            id: d.id,
            name: d.docType,
            number: d.number ?? '',
            type: 'doc' as const,
            category: d.docType,
            employeeName: d.employeeName ?? `#${d.employeeId}`,
            employeeId: d.employeeId,
            employeeCode: d.employeeCode ?? '',
            issueDate: d.issueDate ? String(d.issueDate).slice(0, 10) : '',
            expiryDate: expiry,
            notes: d.notes ?? '',
            status: expired
              ? ('expired' as const)
              : expiry && expiry <= expiryLimit
              ? ('expiring' as const)
              : ('valid' as const),
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المستندات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = ['الكل', ...Array.from(new Set(documents.map((d) => d.category)))]

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.includes(searchTerm) ||
      doc.number.includes(searchTerm) ||
      doc.employeeName.includes(searchTerm)
    const matchesCategory =
      selectedCategory === 'الكل' || doc.category === selectedCategory
    const matchesEmployee =
      !selectedEmployee || String(doc.employeeId) === selectedEmployee
    const matchesStatus = !selectedStatus || doc.status === selectedStatus
    return matchesSearch && matchesCategory && matchesEmployee && matchesStatus
  })

  const stats = {
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring').length,
    expired: documents.filter((d) => d.status === 'expired').length,
  }

  const toggleSelectDoc = (id: number) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedDocs.length === filteredDocs.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(filteredDocs.map((d) => d.id))
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setUploadForm({ ...emptyForm })
    setShowUploadModal(true)
  }

  const openEdit = (doc: DocumentRow) => {
    setEditingId(doc.id)
    setUploadForm({
      docType: doc.name,
      employeeId: String(doc.employeeId),
      number: doc.number,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      notes: doc.notes,
    })
    setShowPreviewModal(false)
    setShowUploadModal(true)
  }

  const handleSave = async () => {
    if (!uploadForm.docType || !uploadForm.employeeId) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        employeeId: Number(uploadForm.employeeId),
        docType: uploadForm.docType,
        number: uploadForm.number || undefined,
        issueDate: uploadForm.issueDate || undefined,
        expiryDate: uploadForm.expiryDate || undefined,
        notes: uploadForm.notes || undefined,
      }
      if (editingId != null) {
        await updateDocument(editingId, payload)
      } else {
        await createDocument(payload)
      }
      setShowUploadModal(false)
      setEditingId(null)
      setUploadForm({ ...emptyForm })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المستند')
    } finally {
      setSaving(false)
    }
  }

  const openPreview = (doc: DocumentRow) => {
    setPreviewDoc(doc)
    setShowPreviewModal(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مستندات الموظفين</h1>
            <p className="text-gray-500 mt-1">إدارة وأرشفة مستندات الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings/documents"
              className="btn-secondary flex items-center gap-2"
            >
              <Settings size={18} />
              أنواع المستندات
            </Link>
            <button
              onClick={openCreate}
              className="btn-primary flex items-center gap-2"
            >
              <Upload size={18} />
              إضافة مستند
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div
            className={`card flex items-center gap-4 cursor-pointer transition-all ${
              selectedStatus === '' ? 'ring-2 ring-primary-500' : ''
            }`}
            onClick={() => setSelectedStatus('')}
          >
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FolderOpen size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المستندات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div
            className={`card flex items-center gap-4 cursor-pointer transition-all ${
              selectedStatus === 'valid' ? 'ring-2 ring-success-500' : ''
            }`}
            onClick={() => setSelectedStatus(selectedStatus === 'valid' ? '' : 'valid')}
          >
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مستندات سارية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.valid}</p>
            </div>
          </div>
          <div
            className={`card flex items-center gap-4 cursor-pointer transition-all ${
              selectedStatus === 'expiring' ? 'ring-2 ring-warning-500' : ''
            }`}
            onClick={() => setSelectedStatus(selectedStatus === 'expiring' ? '' : 'expiring')}
          >
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تنتهي خلال {EXPIRING_DAYS} يوم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.expiring}</p>
            </div>
          </div>
          <div
            className={`card flex items-center gap-4 cursor-pointer transition-all ${
              selectedStatus === 'expired' ? 'ring-2 ring-red-500' : ''
            }`}
            onClick={() => setSelectedStatus(selectedStatus === 'expired' ? '' : 'expired')}
          >
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">منتهية الصلاحية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.expired}</p>
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
                placeholder="بحث عن مستند أو موظف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input min-w-[180px]"
            >
              <option value="">كل الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.fullName}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 text-primary-600' : ''}`}
            >
              <Filter size={18} />
              فلاتر
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Grid size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : ''
                }`}
              >
                <List size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">التصنيف</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedDocs.length > 0 && (
          <div className="card bg-primary-50 border border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-primary-700 font-medium">
                  تم تحديد {selectedDocs.length} مستند
                </span>
                <button
                  onClick={() => setSelectedDocs([])}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  إلغاء التحديد
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  تحميل
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Send size={16} />
                  إرسال بالبريد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'list' ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">
                    <button onClick={selectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedDocs.length === filteredDocs.length && filteredDocs.length > 0 ? (
                        <CheckSquare size={20} className="text-primary-600" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستند</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التصنيف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الإصدار</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الانتهاء</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => {
                  const TypeIcon = typeIcons[doc.type]
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleSelectDoc(doc.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedDocs.includes(doc.id) ? (
                            <CheckSquare size={20} className="text-primary-600" />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[doc.type]}`}>
                            <TypeIcon size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{doc.name}</p>
                            <p className="text-sm text-gray-500" dir="ltr">{doc.number || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/employees/${doc.employeeId}`} className="hover:text-primary-600">
                          <p className="text-gray-800">{doc.employeeName}</p>
                          <p className="text-sm text-gray-500">{doc.employeeCode}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{doc.category}</td>
                      <td className="px-4 py-4 text-gray-600">
                        {doc.issueDate
                          ? new Date(doc.issueDate).toLocaleDateString('ar-SA')
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {doc.expiryDate
                          ? new Date(doc.expiryDate).toLocaleDateString('ar-SA')
                          : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                          {statusLabels[doc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openPreview(doc)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            title="معاينة"
                          >
                            <Eye size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => openEdit(doc)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            title="تعديل"
                          >
                            <Edit2 size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredDocs.length === 0 && (
              <div className="py-12 text-center">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد مستندات مطابقة للبحث</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filteredDocs.map((doc) => {
              const TypeIcon = typeIcons[doc.type]
              return (
                <div key={doc.id} className="card hover:shadow-lg transition-shadow relative">
                  <button
                    onClick={() => toggleSelectDoc(doc.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {selectedDocs.includes(doc.id) ? (
                      <CheckSquare size={20} className="text-primary-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <div
                    className={`w-full h-32 rounded-xl flex items-center justify-center mb-4 cursor-pointer ${typeColors[doc.type]}`}
                    onClick={() => openPreview(doc)}
                  >
                    <TypeIcon size={48} />
                  </div>
                  <h3 className="font-medium text-gray-800 mb-1 line-clamp-1">{doc.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{doc.employeeName}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                      {statusLabels[doc.status]}
                    </span>
                    <span className="text-xs text-gray-400" dir="ltr">{doc.number || '—'}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => openPreview(doc)}
                      className="flex-1 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 text-sm"
                    >
                      <Eye size={14} />
                      معاينة
                    </button>
                    <button
                      onClick={() => openEdit(doc)}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredDocs.length === 0 && (
              <div className="col-span-4 py-12 text-center">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد مستندات مطابقة للبحث</p>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingId != null ? 'تعديل مستند' : 'إضافة مستند جديد'}
                  </h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع المستند *</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="مثال: جواز سفر، عقد عمل، شهادة"
                    value={uploadForm.docType}
                    onChange={(e) => setUploadForm({ ...uploadForm, docType: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الموظف *</label>
                    <select
                      className="input w-full"
                      value={uploadForm.employeeId}
                      onChange={(e) => setUploadForm({ ...uploadForm, employeeId: e.target.value })}
                    >
                      <option value="">اختر الموظف</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم المستند</label>
                    <input
                      type="text"
                      className="input w-full"
                      dir="ltr"
                      placeholder="P1234567"
                      value={uploadForm.number}
                      onChange={(e) => setUploadForm({ ...uploadForm, number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الإصدار</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={uploadForm.issueDate}
                      onChange={(e) => setUploadForm({ ...uploadForm, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={uploadForm.expiryDate}
                      onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    placeholder="ملاحظات إضافية عن المستند..."
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving || !uploadForm.docType || !uploadForm.employeeId}
                >
                  {editingId != null ? 'حفظ التعديلات' : 'إضافة المستند'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && previewDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors[previewDoc.type]}`}>
                      {(() => {
                        const TypeIcon = typeIcons[previewDoc.type]
                        return <TypeIcon size={24} />
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{previewDoc.name}</h2>
                      <p className="text-sm text-gray-500">
                        {previewDoc.employeeName}
                        {previewDoc.number ? ` • ${previewDoc.number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {/* Preview Content */}
                <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center">
                  <div className="text-center">
                    <FileText size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">لا يوجد ملف مرفق — سجل بيانات فقط</p>
                  </div>
                </div>

                {/* Document Details */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">تفاصيل المستند</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">النوع:</span>
                        <span className="text-gray-800">{previewDoc.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">تاريخ الإصدار:</span>
                        <span className="text-gray-800">
                          {previewDoc.issueDate
                            ? new Date(previewDoc.issueDate).toLocaleDateString('ar-SA')
                            : '—'}
                        </span>
                      </div>
                      {previewDoc.expiryDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">تاريخ الانتهاء:</span>
                          <span className="text-gray-800">
                            {new Date(previewDoc.expiryDate).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">الحالة:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[previewDoc.status]}`}>
                          {statusLabels[previewDoc.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">معلومات الموظف</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">الاسم:</span>
                        <span className="text-gray-800">{previewDoc.employeeName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">الرقم الوظيفي:</span>
                        <span className="text-gray-800">{previewDoc.employeeCode || '—'}</span>
                      </div>
                    </div>
                    {previewDoc.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">ملاحظات:</p>
                        <p className="text-sm text-gray-800">{previewDoc.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end">
                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(previewDoc)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    تحديث المستند
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="btn-primary"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
