'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Layers,
  Landmark,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  ChevronDown,
  Building2,
  UsersRound,
} from 'lucide-react'
import {
  ApiBranch,
  ApiDepartment,
  ApiEmployee,
  ApiTeam,
  createDepartment,
  fetchBranches,
  fetchDepartments,
  fetchEmployees,
  fetchTeams,
  updateDepartment,
} from '@/lib/api'
import { useCompanyWideWrite } from '@/components/CompanyWideReadOnly'
import { EmployeePicker } from '@/components/EmployeePicker'
import {
  EXECUTIVE_PARENT_LABEL,
  UNIT_TYPE_LABELS,
  childAdministrationsOf,
  departmentTreeRoots,
  foreignChildrenOf,
  hasHiddenParent,
  isAdministration,
  isCrossBranchChild,
  orgPlacement,
  parentAfterBranchChange,
  parentOptionsFor,
  unitTypeOf,
  type UnitType,
} from '@/lib/department-tree'

const emptyForm = {
  name: '',
  nameEn: '',
  code: '',
  // «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر): نوع الوحدة — الإدارة فوق الأقسام
  unitType: 'DEPARTMENT' as UnitType,
  parentId: '',
  managerId: '',
  branchId: '',
  isActive: true,
  // الهيكل التنظيمي: «الإدارة التنفيذية» (مديرها = الرئيس التنفيذي) والسكرتير التنفيذي — لكل الشركة
  isExecutive: false,
  secretaryId: '',
}

// تلميحات «التابع لـ» بنفس قواعد الخادم (org.service): الإدارة رئيسية أو تحت الإدارة التنفيذية، والقسم تحت إدارة أو قسم من فرعه
const PARENT_HINTS = {
  executive: '«الإدارة التنفيذية» فوق كل الإدارات والأقسام وتقبل وحدات من أي فرع — هي نفسها من غير أب',
  ADMINISTRATION: 'الإدارة بتبقى رئيسية أو تحت «الإدارة التنفيذية» بس (من أي فرع) — مابتتحطش تحت قسم ولا تحت إدارة تانية',
  DEPARTMENT: 'القسم تحت إدارة من فرعه، أو «الإدارة التنفيذية» من أي فرع، أو قسم من فرعه فيبقى قسم فرعي — عدا الأقسام التابعة لهذا القسم',
}

// ترتيب الوحدات في الشجرة: الإدارة التنفيذية ثم الإدارات ثم الأقسام، وبالاسم جوه كل نوع
const unitOrder = (a: ApiDepartment, b: ApiDepartment) =>
  Number(!!b.isExecutive) - Number(!!a.isExecutive) ||
  Number(isAdministration(b)) - Number(isAdministration(a)) ||
  a.name.localeCompare(b.name, 'ar')

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingDept, setEditingDept] = useState<ApiDepartment | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree')
  const [expandedDepts, setExpandedDepts] = useState<number[]>([])

  const [formData, setFormData] = useState({ ...emptyForm })
  // تنبيه لما الأب يتشال لوحده (تغيير الفرع أو النوع أو تعليم الإدارة التنفيذية خلّاه غلط) — مايتشالش في صمت
  const [parentNote, setParentNote] = useState<string | null>(null)
  const { canWrite: companyWide } = useCompanyWideWrite()

  const loadData = async () => {
    try {
      const [deps, brs, emps, tms] = await Promise.all([
        fetchDepartments(),
        fetchBranches(),
        fetchEmployees(),
        fetchTeams(),
      ])
      setDepartments(deps)
      setBranches(brs)
      setEmployees(emps)
      setTeams(tms)
      setExpandedDepts(departmentTreeRoots(deps).map((d) => d.id))
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

  const managerNameOf = (managerEmployeeId?: number) =>
    employees.find((e) => e.id === managerEmployeeId)?.fullName ?? '—'

  const branchNameOf = (branchId: number) =>
    branches.find((b) => b.id === branchId)?.name ?? '—'

  const employeesCountOf = (deptId: number) =>
    employees.filter((e) => e.departmentId === deptId).length

  const teamMembersCountOf = (teamId: number) =>
    employees.filter((e) => e.teamId === teamId).length

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.includes(searchQuery) ||
      (dept.nameEn ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.code ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChildren = (parentId: number | null) => {
    return departments.filter((d) => (d.parentId ?? null) === parentId).sort(unitOrder)
  }

  const getTeamsForDepartment = (deptId: number) => {
    return teams.filter((t) => t.departmentId === deptId)
  }

  // الأقسام التابعة لقسم (أبناء وأحفاد) — لا تصلح أباً له: الهيكل يصير دائرياً (SET-14)
  const descendantIdsOf = (deptId: number) => {
    const out = new Set<number>()
    const walk = (pid: number) => {
      for (const d of departments) {
        if (d.parentId === pid && !out.has(d.id)) {
          out.add(d.id)
          walk(d.id)
        }
      }
    }
    walk(deptId)
    return out
  }

  const handleOpenModal = (dept?: ApiDepartment, unitType: UnitType = 'DEPARTMENT') => {
    setModalError(null)
    setParentNote(null)
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        nameEn: dept.nameEn ?? '',
        code: dept.code ?? '',
        unitType: unitTypeOf(dept),
        parentId: dept.parentId ? String(dept.parentId) : '',
        managerId: dept.managerEmployeeId ? String(dept.managerEmployeeId) : '',
        branchId: String(dept.branchId),
        isActive: dept.isActive,
        isExecutive: !!dept.isExecutive,
        secretaryId: dept.executiveSecretaryEmployeeId ? String(dept.executiveSecretaryEmployeeId) : '',
      })
    } else {
      setEditingDept(null)
      setFormData({ ...emptyForm, unitType })
    }
    setShowModal(true)
  }

  // تغيير النوع (إدارة/قسم): أب مابقاش يصلح للنوع الجديد يتشال بتنبيه — الإدارة التنفيذية إدارة دايمًا
  const changeUnitType = (next: UnitType) => {
    if (formData.isExecutive || next === formData.unitType) return
    const moved = parentAfterBranchChange(departments, formData.parentId, formData.branchId, false, next)
    setParentNote(moved.dropped ? droppedParentNote(moved.dropped, 'الإدارة بتبقى رئيسية أو تحت «الإدارة التنفيذية» بس') : null)
    setFormData({ ...formData, unitType: next, parentId: moved.parentId })
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Partial<ApiDepartment> = {
      name: formData.name,
      nameEn: formData.nameEn || undefined,
      code: formData.code || undefined,
      branchId: formData.branchId ? Number(formData.branchId) : undefined,
      // «بدون» عند التعديل = وحدة رئيسية (null يمسح الأب — كان يُهمل فيبقى الأب القديم)
      parentId: formData.parentId ? Number(formData.parentId) : editingDept ? null : undefined,
      unitType: formData.unitType,
      managerEmployeeId: formData.managerId ? Number(formData.managerId) : undefined,
      // الإدارة التنفيذية تتبعت من حساب على مستوى الشركة بس (الخادم بيرفض تغييرها من حساب فرع)
      ...(companyWide && (editingDept || formData.isExecutive)
        ? {
            isExecutive: formData.isExecutive,
            executiveSecretaryEmployeeId: formData.isExecutive && formData.secretaryId ? Number(formData.secretaryId) : null,
          }
        : {}),
    }
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, { ...payload, isActive: formData.isActive,
          nameEn: formData.nameEn || null, code: formData.code || null,
          managerEmployeeId: formData.managerId ? Number(formData.managerId) : null,
        })
      } else {
        const created = await createDepartment(payload)
        // الإنشاء لا يقبل isActive — نعطّله بعد الإنشاء لو طُلب ذلك
        if (!formData.isActive) await updateDepartment(created.id, { isActive: false })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const renderTreeItem = (dept: ApiDepartment, level: number = 0) => {
    const children = getChildren(dept.id)
    const deptTeams = getTeamsForDepartment(dept.id)
    const hasChildren = children.length > 0 || deptTeams.length > 0
    const isExpanded = expandedDepts.includes(dept.id)
    const administration = isAdministration(dept)

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors ${
            level > 0 ? 'mr-8' : ''
          }`}
          style={{ marginRight: level * 32 }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(dept.id)}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${
                  isExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <div className="w-7" />
          )}

          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${administration ? 'bg-indigo-100' : 'bg-primary-100'}`}>
            {administration ? <Landmark size={20} className="text-indigo-600" /> : <Layers size={20} className="text-primary-600" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800">{dept.name}</span>
              <span className="text-xs text-gray-400 font-mono">({dept.code || '—'})</span>
              {/* «الإدارة ← القسم ← الفريق»: شارة «إدارة» فوق الأقسام */}
              {administration && !dept.isExecutive && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{UNIT_TYPE_LABELS.ADMINISTRATION}</span>
              )}
              {dept.isExecutive && (
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">الإدارة التنفيذية</span>
              )}
              {/* قسم فرع تحت «الإدارة التنفيذية» (فوق كل الفروع): فرعه ظاهر جنبه */}
              {isCrossBranchChild(dept, departments) && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Building2 size={12} />
                  {branchNameOf(dept.branchId)}
                </span>
              )}
              {/* حساب الفرع مايشوفش الإدارة التنفيذية: القسم يبان جذر وعليه إنه تابع لها */}
              {level === 0 && hasHiddenParent(dept, departments) && (
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">تحت الإدارة التنفيذية</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{managerNameOf(dept.managerEmployeeId)}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={14} />
              <span>{employeesCountOf(dept.id)}</span>
            </div>
            <button
              onClick={() => handleOpenModal(dept)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Edit size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="border-r-2 border-gray-100 mr-4">
            {/* الإدارات ثم الأقسام (والأقسام الفرعية) تحت الوحدة */}
            {children.map((child) => renderTreeItem(child, level + 1))}

            {/* Then render teams */}
            {deptTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                style={{ marginRight: (level + 1) * 32 }}
              >
                <div className="w-7" />

                <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                  <UsersRound size={20} className="text-success-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{team.name}</span>
                    <span className="text-xs text-gray-400 font-mono">({team.code || '—'})</span>
                    <span className="text-xs bg-success-50 text-success-600 px-2 py-0.5 rounded-full">فريق</span>
                  </div>
                  <p className="text-sm text-gray-500">{managerNameOf(team.leaderEmployeeId)}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users size={14} />
                    <span>{teamMembersCountOf(team.id)}</span>
                  </div>
                  <Link
                    href="/settings/teams"
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-gray-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const totalEmployees = employees.length
  // الجذور: بلا أب، أو أبوه مش ظاهر (أقسام الفرع اللي تحت الإدارة التنفيذية لحساب الفرع) — ماتختفيش من الشجرة
  const rootDepartments = departmentTreeRoots(departments)
  // الشجرة مجمّعة: الإدارات (ومعاها اللي تحت الإدارة التنفيذية المستخبية) وتحتها أقسامها، وبعدها الأقسام اللي مالهاش إدارة
  const administrationRoots = rootDepartments.filter((d) => isAdministration(d) || hasHiddenParent(d, departments)).sort(unitOrder)
  const standaloneRoots = rootDepartments.filter((d) => !isAdministration(d) && !hasHiddenParent(d, departments)).sort(unitOrder)
  const administrationsCount = departments.filter((d) => isAdministration(d)).length
  const withoutAdministrationCount = departments.filter((d) => !isAdministration(d) && !orgPlacement(d.id, departments).administrationName).length
  const blockedParents = editingDept ? descendantIdsOf(editingDept.id) : new Set<number>()
  // «التابع لـ» بقواعد الخادم: الإدارة رئيسية أو تحت الإدارة التنفيذية، والقسم تحت الإدارة التنفيذية لأي فرع أو إدارة/قسم من فرعه —
  // عدا الوحدة نفسها والوحدات التابعة لها، والإدارة التنفيذية نفسها من غير أب
  const parentOptions = parentOptionsFor(departments, {
    branchId: formData.branchId ? Number(formData.branchId) : null,
    editingId: editingDept?.id ?? null,
    blocked: blockedParents,
    makingExecutive: formData.isExecutive,
    unitType: formData.unitType,
  })
  const administrationParents = parentOptions.filter((o) => o.administration)
  const departmentParents = parentOptions.filter((o) => !o.administration)
  // أب مش ظاهر للحساب = الإدارة التنفيذية في فرع برّه نطاقه: يفضل ظاهر بقيمته عشان الحفظ مايشيلوش من غير قصد
  const hiddenParent = !!formData.parentId && !departments.some((d) => d.id === Number(formData.parentId))
  // أب قديم ظاهر مايصلحش بالقواعد دي (بيانات قبل «الإدارة»): يفضل مختار بقيمته — الخادم مابيفحصش أب ماتغيّرش
  const currentParent = !hiddenParent && formData.parentId && !parentOptions.some((o) => String(o.id) === formData.parentId)
    ? departments.find((d) => d.id === Number(formData.parentId)) ?? null
    : null
  const droppedParentNote = (name: string, why: string) => `اتشال الأب «${name}» — ${why}`
  const unitWord = UNIT_TYPE_LABELS[formData.unitType]
  const parentHint = formData.isExecutive ? PARENT_HINTS.executive : PARENT_HINTS[formData.unitType]
  // شيل تعليم الإدارة التنفيذية وتحتها أقسام من فروع تانية (غير فرعها بعد الحفظ) أو إدارات — الخادم بيرفضه
  const unflagBlockers =
    editingDept?.isExecutive && !formData.isExecutive
      ? foreignChildrenOf({ ...editingDept, branchId: formData.branchId ? Number(formData.branchId) : editingDept.branchId }, departments)
      : []
  const unflagAdministrations =
    editingDept?.isExecutive && !formData.isExecutive ? childAdministrationsOf(editingDept, departments) : []
  // تحويل إدارة قائمة لقسم: أقسامها بتبقى أقسام فرعية تحته
  const becomingSubDepartments =
    editingDept && isAdministration(editingDept) && formData.unitType === 'DEPARTMENT'
      ? departments.filter((d) => d.parentId === editingDept.id && !isAdministration(d))
      : []

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الإدارات والأقسام</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإدارات والأقسام</h1>
            <p className="text-gray-500 mt-1">الهيكل التنظيمي للشركة: الإدارة ← القسم ← الفريق</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenModal(undefined, 'ADMINISTRATION')}
              className="btn-secondary flex items-center gap-2"
            >
              <Landmark size={20} />
              إضافة إدارة
            </button>
            <button
              onClick={() => handleOpenModal(undefined, 'DEPARTMENT')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة قسم
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Landmark size={24} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الإدارات</p>
                <p className="text-2xl font-bold text-gray-800">{administrationsCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Layers size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الأقسام</p>
                <p className="text-2xl font-bold text-gray-800">{departments.length - administrationsCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <Layers size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أقسام من غير إدارة</p>
                <p className="text-2xl font-bold text-warning-600">{withoutAdministrationCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                <p className="text-2xl font-bold text-gray-800">{totalEmployees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن إدارة أو قسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                قائمة
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white text-primary-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                شجرة
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Tree View — الإدارة ← القسم ← القسم الفرعي ← الفريق */}
        {!loading && viewMode === 'tree' && (
          <div className="card p-4">
            {administrationRoots.map((dept) => renderTreeItem(dept))}
            {standaloneRoots.length > 0 && (
              <>
                {administrationRoots.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 px-3 pt-4 pb-1 border-t border-gray-100 mt-2">أقسام من غير إدارة</p>
                )}
                {standaloneRoots.map((dept) => renderTreeItem(dept))}
              </>
            )}
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الاسم
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    النوع
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الكود
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    التابع لـ
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    المدير
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الفرع
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الموظفين
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">لا توجد إدارات أو أقسام مطابقة للبحث</td>
                  </tr>
                )}
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdministration(dept) ? 'bg-indigo-100' : 'bg-primary-100'}`}>
                          {isAdministration(dept) ? <Landmark size={20} className="text-indigo-600" /> : <Layers size={20} className="text-primary-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{dept.name}</p>
                          <p className="text-sm text-gray-500">{dept.nameEn ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isAdministration(dept) ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                        {dept.isExecutive ? 'الإدارة التنفيذية' : UNIT_TYPE_LABELS[unitTypeOf(dept)]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {dept.code || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {dept.parentId
                        ? departments.find((d) => d.id === dept.parentId)?.name ?? EXECUTIVE_PARENT_LABEL
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {managerNameOf(dept.managerEmployeeId)}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm">{branchNameOf(dept.branchId)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-600">{employeesCountOf(dept.id)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === dept.id ? null : dept.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {activeMenu === dept.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(dept)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                              >
                                <Edit size={16} />
                                تعديل
                              </button>
                              <button
                                disabled
                                title="الحذف غير متاح — عطّل الوحدة من نافذة التعديل"
                                className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 opacity-50 cursor-not-allowed"
                              >
                                <Trash2 size={16} />
                                حذف
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
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingDept
                    ? `تعديل ${formData.unitType === 'ADMINISTRATION' ? 'الإدارة' : 'القسم'}`
                    : formData.unitType === 'ADMINISTRATION' ? 'إضافة إدارة جديدة' : 'إضافة قسم جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                {/* نوع الوحدة: إدارة (فوق الأقسام) أو قسم */}
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">النوع *</span>
                  <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1" role="group" aria-label="نوع الوحدة">
                    {(['ADMINISTRATION', 'DEPARTMENT'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={formData.unitType === type}
                        disabled={formData.isExecutive && type === 'DEPARTMENT'}
                        onClick={() => changeUnitType(type)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          formData.unitType === type ? 'bg-white text-primary-600 shadow' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {UNIT_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.isExecutive
                      ? '«الإدارة التنفيذية» نوعها «إدارة» دايمًا'
                      : '«إدارة» فوق الأقسام: أقسام فرعها بتتحط تحتها. تحويل إدارة لقسم بيخلّي أقسامها أقسام فرعية'}
                  </p>
                  {becomingSubDepartments.length > 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1">
                      أقسامها ({becomingSubDepartments.length}) زي «{becomingSubDepartments[0].name}» هتبقى أقسام فرعية تحت القسم ده
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم {unitWord === 'إدارة' ? 'الإدارة' : 'القسم'} (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder={formData.unitType === 'ADMINISTRATION' ? 'مثال: الإدارة المالية' : 'مثال: الموارد البشرية'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Human Resources"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكود *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: HR"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label htmlFor="department-parent" className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.isExecutive ? 'التابع لـ' : formData.unitType === 'ADMINISTRATION' ? 'الإدارة الأعلى' : 'الإدارة التابع لها / القسم الأب'}
                    </label>
                    <select
                      id="department-parent"
                      value={formData.parentId}
                      onChange={(e) => {
                        setParentNote(null)
                        setFormData({ ...formData, parentId: e.target.value })
                      }}
                      className="input w-full"
                    >
                      <option value="">
                        {formData.isExecutive
                          ? 'بدون — فوق كل الإدارات والأقسام'
                          : formData.unitType === 'ADMINISTRATION' ? 'بدون (إدارة رئيسية)' : 'بدون (قسم رئيسي من غير إدارة)'}
                      </option>
                      {hiddenParent && <option value={formData.parentId}>{EXECUTIVE_PARENT_LABEL}</option>}
                      {currentParent && <option value={formData.parentId}>{currentParent.name} (الحالي)</option>}
                      {administrationParents.length > 0 && (
                        <optgroup label="الإدارات">
                          {administrationParents.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {departmentParents.length > 0 && (
                        <optgroup label="الأقسام — يبقى قسم فرعي تحته">
                          {departmentParents.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">{parentHint}</p>
                    {parentNote && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1">{parentNote}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="department-manager" className="block text-sm font-medium text-gray-700 mb-2">
                      مدير {unitWord === 'إدارة' ? 'الإدارة' : 'القسم'} *
                    </label>
                    <EmployeePicker
                      id="department-manager"
                      employees={employees}
                      value={formData.managerId}
                      onChange={(id) => setFormData({ ...formData, managerId: id })}
                      placeholder="اكتب اسم الموظف المسؤول أو كوده…"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.unitType === 'ADMINISTRATION'
                        ? 'يُستخدم في دورات الاعتماد (خطوة «مدير الإدارة»)'
                        : 'يُستخدم في دورات الاعتماد (رئيس القسم)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفرع *
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => {
                        // الإدارة التنفيذية تفضل أب لأي فرع؛ أب من فرع تاني يتشال بتنبيه — مايفضلش أب غلط مستخبي
                        const next = parentAfterBranchChange(departments, formData.parentId, e.target.value, formData.isExecutive, formData.unitType)
                        setParentNote(next.dropped ? droppedParentNote(next.dropped, 'من فرع تاني؛ اختار أب من فرع القسم أو «الإدارة التنفيذية»') : null)
                        setFormData({
                          ...formData,
                          branchId: e.target.value,
                          parentId: next.parentId,
                        })
                      }}
                      className="input w-full"
                    >
                      <option value="">اختر الفرع</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    {formData.unitType === 'ADMINISTRATION' && (
                      <p className="text-xs text-gray-400 mt-1">الإدارة في فرع واحد، وأقسامها من نفس الفرع</p>
                    )}
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
                  <span className="text-sm text-gray-700">{formData.unitType === 'ADMINISTRATION' ? 'إدارة نشطة' : 'قسم نشط'}</span>
                </label>

                {/* الهيكل التنظيمي: الإدارة التنفيذية والسكرتير التنفيذي (لكل الشركة) */}
                {companyWide ? (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isExecutive}
                        onChange={(e) => {
                          const checked = e.target.checked
                          // الإدارة التنفيذية «إدارة» فوق كل الوحدات من غير أب: الأب القائم يتشال بتنبيه
                          const next = checked
                            ? parentAfterBranchChange(departments, formData.parentId, formData.branchId, true)
                            : { parentId: formData.parentId, dropped: null }
                          if (next.dropped) setParentNote(droppedParentNote(next.dropped, 'الإدارة التنفيذية فوق كل الإدارات والأقسام من غير أب'))
                          setFormData({ ...formData, isExecutive: checked, secretaryId: checked ? formData.secretaryId : '', parentId: next.parentId,
                            unitType: checked ? 'ADMINISTRATION' : formData.unitType })
                        }}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-700">الإدارة التنفيذية</span>
                        <span className="block text-xs text-gray-400">
                          بتظهر فوق الهيكل التنظيمي وفوق كل الفروع (تقبل إدارات وأقسام من أي فرع)، ومديرها هو الرئيس التنفيذي. إدارة واحدة بس في الشركة.
                        </span>
                      </span>
                    </label>
                    {formData.isExecutive &&
                      departments
                        .filter((d) => d.isExecutive && d.id !== editingDept?.id)
                        .map((d) => {
                          const foreign = foreignChildrenOf(d, departments).filter((c) => c.id !== editingDept?.id)
                          const administrations = childAdministrationsOf(d, departments).filter((c) => c.id !== editingDept?.id)
                          return (
                            <p key={d.id} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                              «{d.name}» متعلّم إدارة تنفيذية دلوقتي — هيتشال منه التعليم والسكرتير بعد الحفظ
                              {administrations.length > 0 &&
                                ` — بس تحته إدارات (زي «${administrations[0].name}»)، فالحفظ هيترفض لحد ما تخليها إدارات رئيسية`}
                              {administrations.length === 0 && foreign.length > 0 &&
                                ` — بس تحته أقسام من فروع تانية (زي «${foreign[0].name}»)، فالحفظ هيترفض لحد ما تنقلها`}
                            </p>
                          )
                        })}
                    {/* شيل التعليم من الإدارة التنفيذية وتحتها إدارات أو أقسام من فروع تانية: الخادم بيرفض — التنبيه قبل الحفظ */}
                    {unflagAdministrations.length > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        تحت الإدارة دي إدارات (زي «{unflagAdministrations[0].name}») — خلّيها إدارات رئيسية الأول قبل شيل «الإدارة التنفيذية»
                      </p>
                    )}
                    {unflagBlockers.length > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        تحت القسم ده أقسام من فروع تانية (زي «{unflagBlockers[0].name}») — انقلها الأول قبل شيل «الإدارة التنفيذية»
                      </p>
                    )}
                    {formData.isExecutive && (
                      <div>
                        <label htmlFor="department-secretary" className="block text-sm font-medium text-gray-700 mb-2">السكرتير التنفيذي</label>
                        {/* فاضي = بدون سكرتير؛ مدير القسم نفسه مش من الاختيارات */}
                        <EmployeePicker
                          id="department-secretary"
                          employees={employees}
                          filter={(emp) => String(emp.id) !== formData.managerId}
                          value={formData.secretaryId}
                          onChange={(id) => setFormData({ ...formData, secretaryId: id })}
                          placeholder="بدون سكرتير — اكتب الاسم أو الكود للاختيار"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          بيظهر جنب الرئيس التنفيذي بس في الهيكل، ومش مدير لحد
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  editingDept?.isExecutive && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      الإدارة دي «الإدارة التنفيذية» — تغييرها والسكرتير التنفيذي من حساب على مستوى الشركة
                    </p>
                  )
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingDept
                      ? 'حفظ التغييرات'
                      : formData.unitType === 'ADMINISTRATION' ? 'إضافة الإدارة' : 'إضافة القسم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
