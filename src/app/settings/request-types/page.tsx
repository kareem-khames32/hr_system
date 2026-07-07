'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  GitBranch,
  Users,
  Building2,
  Layers,
  UsersRound,
  User,
  GripVertical,
  X,
  Eye,
  ClipboardList,
} from 'lucide-react'
import { employees } from '@/data/employees'
import { branches as branchOptions, getBranchName } from '@/data/branches'
import {
  departments,
  teams,
  approvalWorkflows,
} from '@/data/organization'

// ===== النماذج (Types) =====
interface CustomField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file'
  required: boolean
  options?: string // خيارات القائمة مفصولة بفواصل
}

type AudienceType = 'all' | 'branch' | 'department' | 'team' | 'employees'

interface RequestTypeDef {
  id: string
  name: string
  nameEn: string
  description: string
  category: 'hr' | 'finance' | 'attendance' | 'other'
  submitter: 'employee' | 'manager' | 'hr'
  workflowId: string
  audienceType: AudienceType
  audienceIds: string[] // معرفات الفروع/الأقسام/الفرق/الموظفين حسب النوع
  requiresAttachment: boolean
  isActive: boolean
  fields: CustomField[]
  submissionsCount: number
}

const fieldTypeLabels: Record<CustomField['type'], string> = {
  text: 'نص قصير',
  textarea: 'نص طويل',
  number: 'رقم',
  date: 'تاريخ',
  select: 'قائمة اختيار',
  file: 'مرفق',
}

const categoryLabels = {
  hr: 'موارد بشرية',
  finance: 'مالية',
  attendance: 'حضور',
  other: 'أخرى',
}

const submitterLabels = {
  employee: 'الموظف',
  manager: 'المدير',
  hr: 'الموارد البشرية',
}

const audienceTypeLabels: Record<AudienceType, string> = {
  all: 'كل الموظفين',
  branch: 'فروع محددة',
  department: 'أقسام محددة',
  team: 'فرق محددة',
  employees: 'موظفون محددون',
}

const audienceIcons: Record<AudienceType, typeof Users> = {
  all: Users,
  branch: Building2,
  department: Layers,
  team: UsersRound,
  employees: User,
}

// ===== أنواع الطلبات المبدئية =====
const initialRequestTypes: RequestTypeDef[] = [
  {
    id: 'rt1',
    name: 'طلب إجازة',
    nameEn: 'Leave Request',
    description: 'طلب إجازة من الرصيد المتاح',
    category: 'hr',
    submitter: 'employee',
    workflowId: '2',
    audienceType: 'all',
    audienceIds: [],
    requiresAttachment: false,
    isActive: true,
    fields: [
      { id: 'f1', label: 'نوع الإجازة', type: 'select', required: true, options: 'سنوية, مرضية, طارئة, بدون راتب' },
      { id: 'f2', label: 'من تاريخ', type: 'date', required: true },
      { id: 'f3', label: 'إلى تاريخ', type: 'date', required: true },
      { id: 'f4', label: 'السبب', type: 'textarea', required: false },
    ],
    submissionsCount: 156,
  },
  {
    id: 'rt2',
    name: 'طلب استقالة',
    nameEn: 'Resignation Request',
    description: 'تقديم استقالة — تمر بالمدير المباشر ثم HR ثم الإدارة',
    category: 'hr',
    submitter: 'employee',
    workflowId: '8',
    audienceType: 'all',
    audienceIds: [],
    requiresAttachment: false,
    isActive: true,
    fields: [
      { id: 'f1', label: 'آخر يوم عمل مطلوب', type: 'date', required: true },
      { id: 'f2', label: 'سبب الاستقالة', type: 'textarea', required: true },
      { id: 'f3', label: 'خطاب الاستقالة', type: 'file', required: false },
    ],
    submissionsCount: 4,
  },
  {
    id: 'rt3',
    name: 'طلب تغيير بيانات',
    nameEn: 'Data Change Request',
    description: 'تعديل البيانات الشخصية — يُطبَّق بعد اعتماد HR',
    category: 'hr',
    submitter: 'employee',
    workflowId: '1',
    audienceType: 'all',
    audienceIds: [],
    requiresAttachment: true,
    isActive: true,
    fields: [
      { id: 'f1', label: 'الحقل المطلوب تغييره', type: 'select', required: true, options: 'رقم الجوال, العنوان, الحالة الاجتماعية, الحساب البنكي' },
      { id: 'f2', label: 'القيمة الجديدة', type: 'text', required: true },
      { id: 'f3', label: 'مستند إثبات', type: 'file', required: true },
    ],
    submissionsCount: 23,
  },
  {
    id: 'rt4',
    name: 'طلب عمل إضافي',
    nameEn: 'Overtime Request',
    description: 'خاص بموظفي فرع جدة — دورة اعتماد فرع جدة',
    category: 'attendance',
    submitter: 'employee',
    workflowId: '7',
    audienceType: 'branch',
    audienceIds: ['2'],
    requiresAttachment: false,
    isActive: true,
    fields: [
      { id: 'f1', label: 'التاريخ', type: 'date', required: true },
      { id: 'f2', label: 'عدد الساعات', type: 'number', required: true },
      { id: 'f3', label: 'سبب العمل الإضافي', type: 'textarea', required: true },
    ],
    submissionsCount: 41,
  },
  {
    id: 'rt5',
    name: 'طلب سلفة',
    nameEn: 'Loan Request',
    description: 'سلفة تُخصم من الراتب على أقساط',
    category: 'finance',
    submitter: 'employee',
    workflowId: '6',
    audienceType: 'department',
    audienceIds: ['2', '5'],
    requiresAttachment: false,
    isActive: true,
    fields: [
      { id: 'f1', label: 'المبلغ', type: 'number', required: true },
      { id: 'f2', label: 'عدد الأقساط', type: 'number', required: true },
      { id: 'f3', label: 'السبب', type: 'textarea', required: true },
    ],
    submissionsCount: 18,
  },
  {
    id: 'rt6',
    name: 'طلب بصمة عن بُعد',
    nameEn: 'Remote Check-in Request',
    description: 'تسجيل حضور عن بُعد للعاملين خارج المقر',
    category: 'attendance',
    submitter: 'employee',
    workflowId: '1',
    audienceType: 'team',
    audienceIds: ['t1', 't5'],
    requiresAttachment: false,
    isActive: false,
    fields: [
      { id: 'f1', label: 'التاريخ', type: 'date', required: true },
      { id: 'f2', label: 'الموقع/المدينة', type: 'text', required: true },
      { id: 'f3', label: 'سبب العمل عن بُعد', type: 'textarea', required: true },
    ],
    submissionsCount: 0,
  },
]

const emptyForm = {
  name: '',
  nameEn: '',
  description: '',
  category: 'hr' as RequestTypeDef['category'],
  submitter: 'employee' as RequestTypeDef['submitter'],
  workflowId: '',
  audienceType: 'all' as AudienceType,
  audienceIds: [] as string[],
  requiresAttachment: false,
  isActive: true,
  fields: [] as CustomField[],
}

export default function RequestTypesPage() {
  const [requestTypes, setRequestTypes] = useState(initialRequestTypes)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RequestTypeDef | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const filtered = requestTypes.filter(
    (rt) =>
      rt.name.includes(searchQuery) ||
      rt.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = requestTypes.filter((rt) => rt.isActive).length
  const targetedCount = requestTypes.filter((rt) => rt.audienceType !== 'all').length
  const totalSubmissions = requestTypes.reduce((s, rt) => s + rt.submissionsCount, 0)

  // ===== خيارات الجمهور حسب النوع المختار =====
  const audienceOptions = (): { id: string; label: string }[] => {
    switch (formData.audienceType) {
      case 'branch':
        return branchOptions.map((b) => ({ id: b.id, label: b.name }))
      case 'department':
        return departments.map((d) => ({ id: d.id, label: d.name }))
      case 'team':
        return teams.map((t) => ({ id: t.id, label: t.name }))
      case 'employees':
        return employees.map((e) => ({ id: e.id, label: e.name }))
      default:
        return []
    }
  }

  const toggleAudienceId = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      audienceIds: prev.audienceIds.includes(id)
        ? prev.audienceIds.filter((a) => a !== id)
        : [...prev.audienceIds, id],
    }))
  }

  const audienceSummary = (rt: RequestTypeDef): string => {
    if (rt.audienceType === 'all') return 'كل الموظفين'
    const lookup: Record<string, { id: string; name: string }[]> = {
      branch: branchOptions,
      department: departments,
      team: teams,
      employees: employees,
    }
    const names = rt.audienceIds
      .map((id) => lookup[rt.audienceType]?.find((o) => o.id === id)?.name)
      .filter(Boolean)
    return names.join('، ') || audienceTypeLabels[rt.audienceType]
  }

  // ===== إدارة الحقول المخصصة =====
  const addField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: 'f' + Date.now(),
          label: '',
          type: 'text',
          required: false,
        },
      ],
    }))
  }

  const updateField = (id: string, patch: Partial<CustomField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }

  const removeField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }))
  }

  // ===== فتح/حفظ =====
  const handleOpenModal = (rt?: RequestTypeDef) => {
    if (rt) {
      setEditing(rt)
      setFormData({
        name: rt.name,
        nameEn: rt.nameEn,
        description: rt.description,
        category: rt.category,
        submitter: rt.submitter,
        workflowId: rt.workflowId,
        audienceType: rt.audienceType,
        audienceIds: [...rt.audienceIds],
        requiresAttachment: rt.requiresAttachment,
        isActive: rt.isActive,
        fields: rt.fields.map((f) => ({ ...f })),
      })
    } else {
      setEditing(null)
      setFormData({ ...emptyForm, fields: [] })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editing) {
      setRequestTypes(
        requestTypes.map((rt) =>
          rt.id === editing.id ? { ...rt, ...formData } : rt
        )
      )
    } else {
      setRequestTypes([
        ...requestTypes,
        {
          id: 'rt' + Date.now(),
          ...formData,
          submissionsCount: 0,
        },
      ])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف نوع الطلب هذا؟')) {
      setRequestTypes(requestTypes.filter((rt) => rt.id !== id))
    }
    setActiveMenu(null)
  }

  const toggleStatus = (id: string) => {
    setRequestTypes(
      requestTypes.map((rt) =>
        rt.id === id ? { ...rt, isActive: !rt.isActive } : rt
      )
    )
    setActiveMenu(null)
  }

  const workflowName = (id: string) =>
    approvalWorkflows.find((w) => w.id === id)?.name || 'غير مربوط'

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">بانِي الطلبات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">بانِي الطلبات</h1>
            <p className="text-gray-500 mt-1">
              أنشئ أي نوع طلب، اربطه بدورة اعتماد، وحدد لمن يظهر
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إنشاء نوع طلب جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <ClipboardList size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أنواع الطلبات</p>
                <p className="text-2xl font-bold text-gray-800">{requestTypes.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مفعّلة</p>
                <p className="text-2xl font-bold text-success-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">طلبات مستهدَفة</p>
                <p className="text-2xl font-bold text-indigo-600">{targetedCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي التقديمات</p>
                <p className="text-2xl font-bold text-gray-800">{totalSubmissions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="البحث عن نوع طلب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 w-full md:w-96"
            />
          </div>
        </div>

        {/* Request Types Grid */}
        <div className="grid grid-cols-2 gap-6">
          {filtered.map((rt) => {
            const AudienceIcon = audienceIcons[rt.audienceType]
            return (
              <div
                key={rt.id}
                className={`card p-6 relative ${!rt.isActive ? 'opacity-60' : ''}`}
              >
                {/* Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="badge text-xs bg-gray-100 text-gray-600">
                    {categoryLabels[rt.category]}
                  </span>
                  <span
                    className={`badge text-xs ${
                      rt.isActive ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {rt.isActive ? 'مفعّل' : 'معطّل'}
                  </span>
                </div>

                {/* Menu */}
                <div className="absolute top-4 left-36">
                  <button
                    onClick={() =>
                      setActiveMenu(activeMenu === rt.id ? null : rt.id)
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  {activeMenu === rt.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <button
                          onClick={() => {
                            handleOpenModal(rt)
                            setActiveMenu(null)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={16} />
                          تعديل
                        </button>
                        <button
                          onClick={() => toggleStatus(rt.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          {rt.isActive ? (
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
                        <button
                          onClick={() => handleDelete(rt.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={16} />
                          حذف
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <FileText size={28} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{rt.name}</h3>
                    <p className="text-gray-500 text-sm">{rt.nameEn}</p>
                    <p className="text-gray-600 text-sm mt-2">{rt.description}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <GitBranch size={16} className="text-gray-400" />
                    <span className="text-gray-600">
                      دورة الاعتماد: {workflowName(rt.workflowId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <AudienceIcon size={16} className="text-indigo-500" />
                    <span className="text-gray-600">
                      يظهر لـ: <span className="font-medium">{audienceSummary(rt)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-600">
                      يقدّمه: {submitterLabels[rt.submitter]}
                    </span>
                  </div>
                </div>

                {/* Fields preview */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {rt.fields.map((f) => (
                    <span
                      key={f.id}
                      className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg border border-gray-100"
                    >
                      {f.label}
                      {f.required && <span className="text-danger-500"> *</span>}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>{rt.fields.length} حقول</span>
                  <span>{rt.submissionsCount} تقديم</span>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أنواع طلبات</h3>
            <p className="text-gray-500">أنشئ أول نوع طلب من الزر أعلاه</p>
          </div>
        )}

        {/* ===== Modal ===== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل نوع الطلب' : 'إنشاء نوع طلب جديد'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  حدّد بيانات الطلب وحقوله، اربطه بدورة اعتماد، واختر لمن يظهر
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* الأساسيات */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الطلب (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: طلب شهادة تعريف بالراتب"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الطلب (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Salary Certificate Request"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      التصنيف
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as RequestTypeDef['category'],
                        })
                      }
                      className="input w-full"
                    >
                      {Object.entries(categoryLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      من يقدّم الطلب؟
                    </label>
                    <select
                      value={formData.submitter}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          submitter: e.target.value as RequestTypeDef['submitter'],
                        })
                      }
                      className="input w-full"
                    >
                      {Object.entries(submitterLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      دورة الاعتماد *
                    </label>
                    <select
                      value={formData.workflowId}
                      onChange={(e) =>
                        setFormData({ ...formData, workflowId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">— اختر الدورة —</option>
                      {approvalWorkflows.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.branchId !== 'all'
                            ? ` (${getBranchName(w.branchId)})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      تُدار الدورات من «الاعتمادات والموافقات»
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input w-full"
                    placeholder="وصف مختصر يظهر للموظف"
                  />
                </div>

                {/* ===== الجمهور (لمن يظهر الطلب) ===== */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <label className="block text-sm font-bold text-gray-800 mb-3">
                    لمن يظهر هذا الطلب؟
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(Object.keys(audienceTypeLabels) as AudienceType[]).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              audienceType: type,
                              audienceIds: [],
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            formData.audienceType === type
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {audienceTypeLabels[type]}
                        </button>
                      )
                    )}
                  </div>

                  {formData.audienceType !== 'all' && (
                    <div className="flex flex-wrap gap-2">
                      {audienceOptions().map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleAudienceId(opt.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            formData.audienceIds.includes(opt.id)
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                              : 'bg-white text-gray-500 border border-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      {formData.audienceIds.length === 0 && (
                        <p className="text-xs text-warning-600 w-full mt-1">
                          اختر عنصراً واحداً على الأقل
                        </p>
                      )}
                    </div>
                  )}
                  {formData.audienceType === 'all' && (
                    <p className="text-xs text-gray-500">
                      سيظهر هذا الطلب لجميع موظفي الشركة في كل الفروع
                    </p>
                  )}
                </div>

                {/* ===== الحقول المخصصة ===== */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-800">
                      حقول نموذج الطلب
                    </label>
                    <button
                      type="button"
                      onClick={addField}
                      className="btn-secondary text-sm flex items-center gap-1 px-3 py-1.5"
                    >
                      <Plus size={16} />
                      إضافة حقل
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <GripVertical size={18} className="text-gray-300 mt-2.5" />
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                            className="input w-full"
                            placeholder="اسم الحقل (مثال: السبب)"
                          />
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(field.id, {
                                type: e.target.value as CustomField['type'],
                              })
                            }
                            className="input w-full"
                          >
                            {Object.entries(fieldTypeLabels).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                          {field.type === 'select' && (
                            <input
                              type="text"
                              value={field.options || ''}
                              onChange={(e) =>
                                updateField(field.id, { options: e.target.value })
                              }
                              className="input w-full col-span-2"
                              placeholder="الخيارات مفصولة بفواصل: خيار 1, خيار 2, خيار 3"
                            />
                          )}
                        </div>
                        <label className="flex items-center gap-1.5 mt-2.5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(field.id, { required: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-xs text-gray-600">إلزامي</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="p-2 hover:bg-danger-50 rounded-lg mt-1"
                        >
                          <X size={16} className="text-danger-500" />
                        </button>
                      </div>
                    ))}
                    {formData.fields.length === 0 && (
                      <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-400">
                        لا توجد حقول بعد — أضف حقول النموذج التي سيملؤها مقدّم الطلب
                      </div>
                    )}
                  </div>
                </div>

                {/* خيارات */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">مفعّل</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresAttachment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresAttachment: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">يتطلب مرفقاً</span>
                  </label>
                </div>
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
                  disabled={
                    !formData.name ||
                    !formData.workflowId ||
                    (formData.audienceType !== 'all' &&
                      formData.audienceIds.length === 0)
                  }
                >
                  {editing ? 'حفظ التغييرات' : 'إنشاء نوع الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
