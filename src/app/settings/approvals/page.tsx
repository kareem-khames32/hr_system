'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Settings,
  Users,
  GitBranch,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Wallet,
  FileText,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  Zap,
  Shield,
  Building2,
  ArrowDownUp,
  Copy,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react'

// أنواع الطلبات التي تحتاج اعتماد
const requestTypes = [
  { id: 'leave', name: 'طلبات الإجازات', icon: Calendar, color: 'blue' },
  { id: 'expense', name: 'طلبات المصاريف', icon: Wallet, color: 'green' },
  { id: 'loan', name: 'طلبات السلف', icon: Wallet, color: 'purple' },
  { id: 'overtime', name: 'طلبات العمل الإضافي', icon: Clock, color: 'orange' },
  { id: 'salary_change', name: 'تعديلات الرواتب', icon: Wallet, color: 'red' },
  { id: 'promotion', name: 'الترقيات', icon: ArrowDownUp, color: 'indigo' },
  { id: 'resignation', name: 'الاستقالات', icon: FileText, color: 'gray' },
  { id: 'document', name: 'طلبات المستندات', icon: FileText, color: 'teal' },
  { id: 'permission', name: 'الأذونات', icon: Clock, color: 'cyan' },
  { id: 'business_trip', name: 'رحلات العمل', icon: Building2, color: 'pink' },
]

// مستويات المعتمدين
const approverLevels = [
  { id: 'direct_manager', name: 'المدير المباشر', description: 'مدير الموظف المباشر' },
  { id: 'department_head', name: 'رئيس القسم', description: 'رئيس قسم الموظف' },
  { id: 'hr_manager', name: 'مدير الموارد البشرية', description: 'مدير إدارة HR' },
  { id: 'finance_manager', name: 'المدير المالي', description: 'للطلبات المالية' },
  { id: 'ceo', name: 'المدير العام', description: 'للطلبات الكبيرة' },
  { id: 'specific_person', name: 'شخص محدد', description: 'تحديد موظف بعينه' },
  { id: 'role', name: 'صلاحية محددة', description: 'أي شخص له صلاحية معينة' },
]

// شجرة الاعتمادات الافتراضية
const initialWorkflows = [
  {
    id: '1',
    name: 'اعتماد الإجازات - قصيرة',
    requestType: 'leave',
    description: 'إجازات أقل من 5 أيام',
    isActive: true,
    conditions: [
      { field: 'days', operator: 'less_than', value: 5 },
    ],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 3,
        autoApprove: false,
      },
    ],
  },
  {
    id: '2',
    name: 'اعتماد الإجازات - طويلة',
    requestType: 'leave',
    description: 'إجازات 5 أيام أو أكثر',
    isActive: true,
    conditions: [
      { field: 'days', operator: 'greater_equal', value: 5 },
    ],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 3,
        autoApprove: false,
      },
      {
        id: 's2',
        level: 2,
        approverType: 'hr_manager',
        approverName: 'مدير الموارد البشرية',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
    ],
  },
  {
    id: '3',
    name: 'اعتماد المصاريف - صغيرة',
    requestType: 'expense',
    description: 'مصاريف أقل من 5,000 ريال',
    isActive: true,
    conditions: [
      { field: 'amount', operator: 'less_than', value: 5000 },
    ],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
    ],
  },
  {
    id: '4',
    name: 'اعتماد المصاريف - متوسطة',
    requestType: 'expense',
    description: 'مصاريف من 5,000 إلى 20,000 ريال',
    isActive: true,
    conditions: [
      { field: 'amount', operator: 'greater_equal', value: 5000 },
      { field: 'amount', operator: 'less_than', value: 20000 },
    ],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
      {
        id: 's2',
        level: 2,
        approverType: 'finance_manager',
        approverName: 'المدير المالي',
        canDelegate: false,
        timeoutDays: 3,
        autoApprove: false,
      },
    ],
  },
  {
    id: '5',
    name: 'اعتماد المصاريف - كبيرة',
    requestType: 'expense',
    description: 'مصاريف 20,000 ريال أو أكثر',
    isActive: true,
    conditions: [
      { field: 'amount', operator: 'greater_equal', value: 20000 },
    ],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
      {
        id: 's2',
        level: 2,
        approverType: 'finance_manager',
        approverName: 'المدير المالي',
        canDelegate: false,
        timeoutDays: 3,
        autoApprove: false,
      },
      {
        id: 's3',
        level: 3,
        approverType: 'ceo',
        approverName: 'المدير العام',
        canDelegate: false,
        timeoutDays: 5,
        autoApprove: false,
      },
    ],
  },
  {
    id: '6',
    name: 'اعتماد السلف',
    requestType: 'loan',
    description: 'جميع طلبات السلف',
    isActive: true,
    conditions: [],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
      {
        id: 's2',
        level: 2,
        approverType: 'hr_manager',
        approverName: 'مدير الموارد البشرية',
        canDelegate: true,
        timeoutDays: 2,
        autoApprove: false,
      },
      {
        id: 's3',
        level: 3,
        approverType: 'finance_manager',
        approverName: 'المدير المالي',
        canDelegate: false,
        timeoutDays: 3,
        autoApprove: false,
      },
    ],
  },
  {
    id: '7',
    name: 'اعتماد العمل الإضافي',
    requestType: 'overtime',
    description: 'جميع طلبات الأوفرتايم',
    isActive: true,
    conditions: [],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'direct_manager',
        approverName: 'المدير المباشر',
        canDelegate: true,
        timeoutDays: 1,
        autoApprove: false,
      },
    ],
  },
  {
    id: '8',
    name: 'اعتماد الترقيات',
    requestType: 'promotion',
    description: 'جميع طلبات الترقية',
    isActive: true,
    conditions: [],
    steps: [
      {
        id: 's1',
        level: 1,
        approverType: 'department_head',
        approverName: 'رئيس القسم',
        canDelegate: false,
        timeoutDays: 5,
        autoApprove: false,
      },
      {
        id: 's2',
        level: 2,
        approverType: 'hr_manager',
        approverName: 'مدير الموارد البشرية',
        canDelegate: false,
        timeoutDays: 5,
        autoApprove: false,
      },
      {
        id: 's3',
        level: 3,
        approverType: 'ceo',
        approverName: 'المدير العام',
        canDelegate: false,
        timeoutDays: 7,
        autoApprove: false,
      },
    ],
  },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  gray: 'bg-gray-100 text-gray-600',
  teal: 'bg-teal-100 text-teal-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  pink: 'bg-pink-100 text-pink-600',
}

export default function ApprovalsPage() {
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<typeof initialWorkflows[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    requestType: '',
    description: '',
    isActive: true,
    steps: [] as typeof initialWorkflows[0]['steps'],
  })

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch =
      wf.name.includes(searchQuery) ||
      wf.description.includes(searchQuery)
    const matchesType = !filterType || wf.requestType === filterType
    return matchesSearch && matchesType
  })

  // Group workflows by request type
  const groupedWorkflows = filteredWorkflows.reduce((acc, wf) => {
    if (!acc[wf.requestType]) {
      acc[wf.requestType] = []
    }
    acc[wf.requestType].push(wf)
    return acc
  }, {} as Record<string, typeof initialWorkflows>)

  const handleOpenModal = (workflow?: typeof initialWorkflows[0]) => {
    if (workflow) {
      setEditingWorkflow(workflow)
      setFormData({
        name: workflow.name,
        requestType: workflow.requestType,
        description: workflow.description,
        isActive: workflow.isActive,
        steps: [...workflow.steps],
      })
    } else {
      setEditingWorkflow(null)
      setFormData({
        name: '',
        requestType: '',
        description: '',
        isActive: true,
        steps: [
          {
            id: 's1',
            level: 1,
            approverType: 'direct_manager',
            approverName: 'المدير المباشر',
            canDelegate: true,
            timeoutDays: 3,
            autoApprove: false,
          },
        ],
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editingWorkflow) {
      setWorkflows(
        workflows.map((wf) =>
          wf.id === editingWorkflow.id
            ? { ...wf, ...formData, conditions: editingWorkflow.conditions }
            : wf
        )
      )
    } else {
      const newWorkflow = {
        id: String(Date.now()),
        ...formData,
        conditions: [],
      }
      setWorkflows([...workflows, newWorkflow])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الشجرة؟')) {
      setWorkflows(workflows.filter((wf) => wf.id !== id))
    }
    setActiveMenu(null)
  }

  const toggleActive = (id: string) => {
    setWorkflows(
      workflows.map((wf) =>
        wf.id === id ? { ...wf, isActive: !wf.isActive } : wf
      )
    )
    setActiveMenu(null)
  }

  const duplicateWorkflow = (workflow: typeof initialWorkflows[0]) => {
    const newWorkflow = {
      ...workflow,
      id: String(Date.now()),
      name: workflow.name + ' (نسخة)',
    }
    setWorkflows([...workflows, newWorkflow])
    setActiveMenu(null)
  }

  const addStep = () => {
    const newStep = {
      id: `s${formData.steps.length + 1}`,
      level: formData.steps.length + 1,
      approverType: 'direct_manager',
      approverName: 'المدير المباشر',
      canDelegate: true,
      timeoutDays: 3,
      autoApprove: false,
    }
    setFormData({
      ...formData,
      steps: [...formData.steps, newStep],
    })
  }

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index)
    // Re-number levels
    newSteps.forEach((step, i) => {
      step.level = i + 1
    })
    setFormData({
      ...formData,
      steps: newSteps,
    })
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps]
    ;(newSteps[index] as any)[field] = value

    // Update approver name based on type
    if (field === 'approverType') {
      const approver = approverLevels.find((a) => a.id === value)
      newSteps[index].approverName = approver?.name || ''
    }

    setFormData({
      ...formData,
      steps: newSteps,
    })
  }

  const totalWorkflows = workflows.length
  const activeWorkflows = workflows.filter((wf) => wf.isActive).length
  const typesWithWorkflows = new Set(workflows.map((wf) => wf.requestType)).size

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الاعتمادات والموافقات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الاعتمادات والموافقات</h1>
            <p className="text-gray-500 mt-1">إدارة شجرة الاعتمادات ومسارات الموافقة</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة مسار اعتماد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <GitBranch size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مسارات الاعتماد</p>
                <p className="text-2xl font-bold text-gray-800">{totalWorkflows}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">المسارات النشطة</p>
                <p className="text-2xl font-bold text-success-600">{activeWorkflows}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أنواع الطلبات</p>
                <p className="text-2xl font-bold text-gray-800">{typesWithWorkflows}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <UserCheck size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط المستويات</p>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.round(
                    workflows.reduce((sum, wf) => sum + wf.steps.length, 0) /
                      workflows.length
                  ) || 0}
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
                placeholder="البحث عن مسار اعتماد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-48"
            >
              <option value="">كل الأنواع</option>
              {requestTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Request Types Overview */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-800 mb-4">أنواع الطلبات</h3>
          <div className="grid grid-cols-5 gap-4">
            {requestTypes.map((type) => {
              const typeWorkflows = workflows.filter((wf) => wf.requestType === type.id)
              const activeCount = typeWorkflows.filter((wf) => wf.isActive).length

              return (
                <button
                  key={type.id}
                  onClick={() => setFilterType(filterType === type.id ? '' : type.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-right ${
                    filterType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[type.color]}`}>
                    <type.icon size={20} />
                  </div>
                  <p className="font-medium text-gray-800 text-sm">{type.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {typeWorkflows.length} مسار • {activeCount} نشط
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Workflows List */}
        <div className="space-y-6">
          {Object.entries(groupedWorkflows).map(([typeId, typeWorkflows]) => {
            const type = requestTypes.find((t) => t.id === typeId)
            if (!type) return null

            return (
              <div key={typeId} className="space-y-4">
                {/* Type Header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[type.color]}`}>
                    <type.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{type.name}</h3>
                    <p className="text-sm text-gray-500">{typeWorkflows.length} مسار اعتماد</p>
                  </div>
                </div>

                {/* Workflows */}
                <div className="grid grid-cols-1 gap-4 mr-13">
                  {typeWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className={`card p-5 ${!workflow.isActive ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            workflow.isActive ? 'bg-success-100' : 'bg-gray-100'
                          }`}>
                            <GitBranch size={24} className={workflow.isActive ? 'text-success-600' : 'text-gray-400'} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-800">{workflow.name}</h4>
                              <span className={`badge text-xs ${workflow.isActive ? 'badge-success' : 'badge-danger'}`}>
                                {workflow.isActive ? 'نشط' : 'معطل'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>

                            {/* Conditions */}
                            {workflow.conditions.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <AlertCircle size={14} className="text-warning-500" />
                                <span className="text-xs text-warning-600">
                                  {workflow.conditions.length} شرط
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenu(activeMenu === workflow.id ? null : workflow.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={18} className="text-gray-500" />
                          </button>

                          {activeMenu === workflow.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveMenu(null)}
                              />
                              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                                <button
                                  onClick={() => {
                                    handleOpenModal(workflow)
                                    setActiveMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                                >
                                  <Edit size={16} />
                                  تعديل
                                </button>
                                <button
                                  onClick={() => duplicateWorkflow(workflow)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                                >
                                  <Copy size={16} />
                                  نسخ
                                </button>
                                <button
                                  onClick={() => toggleActive(workflow.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                                >
                                  {workflow.isActive ? (
                                    <>
                                      <ToggleLeft size={16} />
                                      تعطيل
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight size={16} />
                                      تفعيل
                                    </>
                                  )}
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => handleDelete(workflow.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50 text-sm"
                                >
                                  <Trash2 size={16} />
                                  حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Approval Steps */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">مستويات الاعتماد:</span>
                          <div className="flex items-center gap-2">
                            {workflow.steps.map((step, index) => (
                              <div key={step.id} className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                  <span className="w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {step.level}
                                  </span>
                                  <span className="text-sm text-gray-700">{step.approverName}</span>
                                  {step.canDelegate && (
                                    <Zap size={12} className="text-warning-500" />
                                  )}
                                </div>
                                {index < workflow.steps.length - 1 && (
                                  <ChevronLeft size={16} className="text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Expand for more details */}
                      <button
                        onClick={() =>
                          setExpandedWorkflow(
                            expandedWorkflow === workflow.id ? null : workflow.id
                          )
                        }
                        className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            expandedWorkflow === workflow.id ? 'rotate-180' : ''
                          }`}
                        />
                        {expandedWorkflow === workflow.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </button>

                      {/* Expanded Details */}
                      {expandedWorkflow === workflow.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          {workflow.steps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold">
                                  {step.level}
                                </span>
                                <div>
                                  <p className="font-medium text-gray-800">{step.approverName}</p>
                                  <p className="text-xs text-gray-500">
                                    {approverLevels.find((a) => a.id === step.approverType)?.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>{step.timeoutDays} أيام</span>
                                </div>
                                {step.canDelegate && (
                                  <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs">
                                    يمكن التفويض
                                  </span>
                                )}
                                {step.autoApprove && (
                                  <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs">
                                    موافقة تلقائية
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredWorkflows.length === 0 && (
          <div className="card p-12 text-center">
            <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد مسارات اعتماد</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterType
                ? 'لم يتم العثور على مسارات مطابقة للبحث'
                : 'ابدأ بإضافة مسار اعتماد جديد'}
            </p>
            {!searchQuery && !filterType && (
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={18} />
                إضافة مسار اعتماد
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingWorkflow ? 'تعديل مسار الاعتماد' : 'إضافة مسار اعتماد جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المسار *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: اعتماد الإجازات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع الطلب *
                    </label>
                    <select
                      value={formData.requestType}
                      onChange={(e) =>
                        setFormData({ ...formData, requestType: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر نوع الطلب</option>
                      {requestTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
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
                    placeholder="وصف مختصر للمسار وشروطه"
                  />
                </div>

                {/* Approval Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      مستويات الاعتماد *
                    </label>
                    <button
                      onClick={addStep}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      إضافة مستوى
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="p-4 bg-gray-50 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              المستوى {index + 1}
                            </span>
                          </div>
                          {formData.steps.length > 1 && (
                            <button
                              onClick={() => removeStep(index)}
                              className="text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              المعتمد
                            </label>
                            <select
                              value={step.approverType}
                              onChange={(e) =>
                                updateStep(index, 'approverType', e.target.value)
                              }
                              className="input w-full text-sm"
                            >
                              {approverLevels.map((level) => (
                                <option key={level.id} value={level.id}>
                                  {level.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              مهلة الرد (أيام)
                            </label>
                            <input
                              type="number"
                              value={step.timeoutDays}
                              onChange={(e) =>
                                updateStep(index, 'timeoutDays', parseInt(e.target.value) || 1)
                              }
                              className="input w-full text-sm"
                              min={1}
                              max={30}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.canDelegate}
                              onChange={(e) =>
                                updateStep(index, 'canDelegate', e.target.checked)
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600"
                            />
                            <span className="text-sm text-gray-600">يمكن التفويض</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.autoApprove}
                              onChange={(e) =>
                                updateStep(index, 'autoApprove', e.target.checked)
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600"
                            />
                            <span className="text-sm text-gray-600">موافقة تلقائية عند انتهاء المهلة</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">مسار نشط</span>
                </label>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button onClick={handleSave} className="btn-primary">
                  {editingWorkflow ? 'حفظ التغييرات' : 'إضافة المسار'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
