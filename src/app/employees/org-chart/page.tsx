'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Building2,
  Mail,
  Phone,
} from 'lucide-react'
import {
  fetchBranches,
  fetchDepartments,
  fetchTeams,
  fetchEmployees,
  ApiDepartment,
} from '@/lib/api'
import { csvDateStamp, downloadCsv } from '@/lib/csv'

// الهيكل لمن على رأس العمل فقط — المنتهية خدمته والمؤرشف خارجه (أعضاءً ومدراء)
const ORG_STATUSES = ['active', 'probation', 'notice_period', 'suspended']

// نوع العقدة من بادئة معرّفها — لعمود «النوع» في التصدير
const NODE_KIND_LABELS: Record<string, string> = {
  b: 'فرع',
  d: 'قسم',
  t: 'فريق',
  e: 'موظف',
}

interface OrgNode {
  id: string
  name: string
  title: string
  department: string
  avatar: string
  email: string
  phone: string
  children?: OrgNode[]
  expanded?: boolean
}

function OrgNodeCard({
  node,
  isRoot = false,
  onToggle,
}: {
  node: OrgNode
  isRoot?: boolean
  onToggle: (id: string) => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all cursor-pointer ${
          isRoot
            ? 'border-primary-500 shadow-primary-500/20'
            : 'border-gray-100 hover:border-primary-300 hover:shadow-xl'
        }`}
        style={{ width: '240px' }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${
                isRoot
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}
            >
              {node.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 truncate">{node.name}</h3>
              <p className="text-sm text-gray-500 truncate">{node.title}</p>
              <p className="text-xs text-primary-500 mt-1">{node.department}</p>
            </div>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <span className="truncate">{node.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span dir="ltr">{node.phone}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => onToggle(node.id)}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-primary-300 transition-colors z-10"
          >
            {node.expanded ? (
              <ChevronUp size={16} className="text-gray-600" />
            ) : (
              <ChevronDown size={16} className="text-gray-600" />
            )}
          </button>
        )}

        {/* Children count badge */}
        {hasChildren && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {node.children?.length}
          </div>
        )}
      </div>

      {/* Connector Line */}
      {hasChildren && node.expanded && (
        <>
          <div className="w-0.5 h-8 bg-gray-300 mt-4" />

          {/* Horizontal Line */}
          <div className="relative">
            <div
              className="h-0.5 bg-gray-300"
              style={{
                width: `${(node.children!.length - 1) * 280}px`,
              }}
            />
          </div>

          {/* Children */}
          <div className="flex gap-10 mt-8">
            {node.children?.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-8 bg-gray-300 -mt-8" />
                <OrgNodeCard node={child} onToggle={onToggle} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [orgTrees, setOrgTrees] = useState<OrgNode[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [stats, setStats] = useState({
    employees: 0,
    departments: 0,
    managers: 0,
    branches: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(100)
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [branches, depts, teams, employees] = await Promise.all([
          fetchBranches(),
          fetchDepartments(),
          fetchTeams(),
          fetchEmployees(),
        ])
        const active = employees.filter((e) => ORG_STATUSES.includes(e.status))
        // المدراء والقادة من نفس المجموعة — من ترك الشركة لا يظهر مديراً ولا قائداً
        const empById = new Map(active.map((e) => [e.id, e]))
        const avatarOf = (name: string) => (name ?? '').trim().charAt(0) || 'م'

        const empNode = (e: (typeof active)[number], context: string, isLeader: boolean): OrgNode => ({
          id: `e${e.id}`,
          name: e.fullName,
          title: (e.jobTitle ?? 'موظف') + (isLeader ? ' • قائد الفريق' : ''),
          department: context,
          avatar: avatarOf(e.fullName),
          email: e.email ?? '—',
          phone: e.phone ?? '—',
        })

        // الهيكل: فرع ← أقسام ← فرق ← موظفون
        const trees: OrgNode[] = branches
          .filter((b) => b.isActive)
          .map((b) => {
            const branchManager = b.managerEmployeeId
              ? empById.get(b.managerEmployeeId)
              : undefined
            const branchDepts = depts.filter((d) => d.branchId === b.id)
            const deptNodes: OrgNode[] = branchDepts.map((d) => {
              const deptManager = d.managerEmployeeId
                ? empById.get(d.managerEmployeeId)
                : undefined
              const deptTeams = teams.filter((t) => t.departmentId === d.id)
              const teamNodes: OrgNode[] = deptTeams.map((t) => {
                const leader = t.leaderEmployeeId
                  ? empById.get(t.leaderEmployeeId)
                  : undefined
                const members = active
                  .filter((e) => e.teamId === t.id)
                  .sort((a, bb) =>
                    a.id === t.leaderEmployeeId ? -1 : bb.id === t.leaderEmployeeId ? 1 : 0
                  )
                return {
                  id: `t${t.id}`,
                  name: t.name,
                  title: leader ? `القائد: ${leader.fullName}` : 'فريق',
                  department: d.name,
                  avatar: avatarOf(t.name),
                  email: '—',
                  phone: '—',
                  expanded: true,
                  children: members.map((e) =>
                    empNode(e, t.name, e.id === t.leaderEmployeeId)
                  ),
                }
              })
              const noTeamMembers = active.filter(
                (e) => e.departmentId === d.id && !e.teamId
              )
              return {
                id: `d${d.id}`,
                name: d.name,
                title: deptManager ? `المدير: ${deptManager.fullName}` : 'قسم',
                department: b.name,
                avatar: avatarOf(d.name),
                email: '—',
                phone: '—',
                expanded: true,
                children: [
                  ...teamNodes,
                  ...noTeamMembers.map((e) => empNode(e, d.name, false)),
                ],
              }
            })
            const unassigned = active.filter(
              (e) => e.branchId === b.id && !e.departmentId
            )
            return {
              id: `b${b.id}`,
              name: b.name,
              title: branchManager
                ? `المدير: ${branchManager.fullName}`
                : b.isHeadquarters
                ? 'الفرع الرئيسي'
                : 'فرع',
              department: b.city ?? 'فرع',
              avatar: avatarOf(b.name),
              email: b.email ?? '—',
              phone: b.phone ?? '—',
              expanded: true,
              children: [
                ...deptNodes,
                ...unassigned.map((e) => empNode(e, b.name, false)),
              ],
            }
          })

        const managerIds = new Set<number>()
        for (const e of active) {
          if (e.managerEmployeeId) managerIds.add(e.managerEmployeeId)
        }
        for (const t of teams) {
          if (t.leaderEmployeeId) managerIds.add(t.leaderEmployeeId)
        }
        for (const d of depts) {
          if (d.managerEmployeeId) managerIds.add(d.managerEmployeeId)
        }
        for (const b of branches) {
          if (b.managerEmployeeId) managerIds.add(b.managerEmployeeId)
        }

        setDepartments(depts)
        setOrgTrees(trees)
        setStats({
          employees: active.length,
          departments: depts.length,
          // المدراء على رأس العمل فقط
          managers: Array.from(managerIds).filter((id) => empById.has(id)).length,
          branches: branches.length,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الهيكل التنظيمي')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleNode = (id: string) => {
    const toggleInTree = (node: OrgNode): OrgNode => {
      if (node.id === id) {
        return { ...node, expanded: !node.expanded }
      }
      if (node.children) {
        return { ...node, children: node.children.map(toggleInTree) }
      }
      return node
    }
    setOrgTrees(orgTrees.map(toggleInTree))
  }

  // فلترة العرض: قسم محدد → عرض شجرة القسم فقط
  const findDeptNode = (nodes: OrgNode[], deptId: string): OrgNode | null => {
    for (const n of nodes) {
      if (n.id === deptId) return n
      if (n.children) {
        const found = findDeptNode(n.children, deptId)
        if (found) return found
      }
    }
    return null
  }

  const matchesSearch = (node: OrgNode): boolean => {
    if (!searchTerm) return true
    if (node.name.includes(searchTerm)) return true
    return (node.children ?? []).some(matchesSearch)
  }

  const displayedTrees = (
    selectedDepartment === 'all'
      ? orgTrees
      : ([findDeptNode(orgTrees, `d${selectedDepartment}`)].filter(
          Boolean
        ) as OrgNode[])
  ).filter(matchesSearch)

  // تصدير الهيكل المعروض (بعد فلتر القسم والبحث) إلى CSV — صف لكل عنصر بتسلسله
  const handleExport = () => {
    const clean = (v: string) => (v === '—' ? '' : v)
    const rows: string[][] = []
    const walk = (
      node: OrgNode,
      ctx: { branch: string; dept: string; team: string }
    ) => {
      const kind = node.id.charAt(0)
      const next = { ...ctx }
      if (kind === 'b') next.branch = node.name
      // عقدة القسم تحمل اسم فرعها والفريق اسم قسمه (لو بدأ العرض من قسم)
      if (kind === 'd') {
        next.dept = node.name
        next.branch = next.branch || node.department
      }
      if (kind === 't') {
        next.team = node.name
        next.dept = next.dept || node.department
      }
      rows.push([
        NODE_KIND_LABELS[kind] ?? '',
        node.name,
        node.title,
        next.branch,
        next.dept,
        next.team,
        clean(node.email),
        clean(node.phone),
      ])
      node.children?.forEach((c) => walk(c, next))
    }
    displayedTrees.forEach((t) => walk(t, { branch: '', dept: '', team: '' }))
    if (rows.length === 0) return
    downloadCsv(
      `org-chart-${csvDateStamp()}.csv`,
      ['النوع', 'الاسم', 'الوصف', 'الفرع', 'القسم', 'الفريق', 'البريد الإلكتروني', 'الجوال'],
      rows
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الهيكل التنظيمي</h1>
            <p className="text-gray-500 mt-1">عرض تفاعلي للهيكل التنظيمي للشركة</p>
          </div>
          <div className="flex items-center gap-3">
            {/* تصدير الهيكل المعروض CSV (بدل زر PDF بلا أثر) */}
            <button
              onClick={handleExport}
              disabled={loading || displayedTrees.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Controls */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative w-64">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن موظف..."
                  className="input pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input w-48"
              >
                <option value="all">كل الأقسام</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ZoomOut size={18} className="text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-600 w-16 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ZoomIn size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Maximize2 size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.employees}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الأقسام</p>
              <p className="text-2xl font-bold text-gray-800">{stats.departments}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <User size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المدراء</p>
              <p className="text-2xl font-bold text-gray-800">{stats.managers}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الفروع</p>
              <p className="text-2xl font-bold text-gray-800">{stats.branches}</p>
            </div>
          </div>
        </div>

        {/* Org Chart */}
        <div className="card overflow-hidden p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div
            className="overflow-auto min-h-[600px] flex justify-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {displayedTrees.length === 0 ? (
              <div className="py-12 text-center self-start">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد بيانات مطابقة في الهيكل</p>
              </div>
            ) : (
              <div className="flex gap-16 items-start">
                {displayedTrees.map((tree) => (
                  <OrgNodeCard key={tree.id} node={tree} isRoot onToggle={toggleNode} />
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Legend */}
        <div className="card">
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-600">دليل الألوان:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded" />
              <span className="text-sm text-gray-600">الفرع</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded" />
              <span className="text-sm text-gray-600">الأقسام والفرق والموظفون</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary-500 rounded-full" />
              <span className="text-sm text-gray-600">عدد العناصر التابعة</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
