'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  Building2,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Maximize2,
  Printer,
  Search,
  User,
  Users,
  UsersRound,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  fetchBranches,
  fetchDepartments,
  fetchEmployees,
  fetchTeams,
  ApiBranch,
  ApiDepartment,
  ApiEmployee,
  ApiTeam,
} from '@/lib/api'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import { OrgChartView } from '@/components/org-chart/OrgChartView'
import {
  UNIT_KIND_LABELS,
  allUnitKeys,
  buildOrgChart,
  searchOrgChart,
  type OrgUnit,
} from '@/components/org-chart/orgChartModel'

interface OrgData {
  branches: ApiBranch[]
  departments: ApiDepartment[]
  teams: ApiTeam[]
  employees: ApiEmployee[]
}

// الفتح الافتراضي: القمة والإدارات الرئيسية (تبان أقسامها وفرقها المباشرة)
const defaultExpanded = (root: OrgUnit) => new Set([root.key, ...root.children.map((c) => c.key)])

export default function OrgChartPage() {
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [zoom, setZoom] = useState(100)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [membersOpen, setMembersOpen] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [branches, departments, teams, employees] = await Promise.all([
          fetchBranches(),
          fetchDepartments(),
          fetchTeams(),
          fetchEmployees(),
        ])
        setData({ branches, departments, teams, employees })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الهيكل التنظيمي')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // الفروع المتاحة للحساب (حساب الفرع بيوصله فرعه بس من الخادم)
  const branches = useMemo(() => (data?.branches ?? []).filter((b) => b.isActive), [data])
  const chart = useMemo(
    () =>
      data
        ? buildOrgChart({
            ...data,
            branchId: branchFilter === 'all' ? null : Number(branchFilter),
          })
        : null,
    [data, branchFilter]
  )

  // تغيير الفرع أو التحميل: يرجع للفتح الافتراضي
  useEffect(() => {
    if (!chart) return
    setExpanded(defaultExpanded(chart.root))
    setMembersOpen(new Set())
  }, [chart])

  const search = useMemo(() => (chart ? searchOrgChart(chart, searchTerm) : null), [chart, searchTerm])

  // البحث يفتح الطريق للنتيجة ويعلّمها ويمرّر لها
  useEffect(() => {
    if (!search || !search.first) return
    setExpanded((prev) => new Set([...Array.from(prev), ...Array.from(search.expand)]))
    setMembersOpen((prev) => new Set([...Array.from(prev), ...Array.from(search.membersOpen)]))
    const key = search.first
    const timer = window.setTimeout(() => {
      scrollRef.current
        ?.querySelector(`[data-org-key="${key}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [search])

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const toggleMembers = useCallback((key: string) => {
    setMembersOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const expandAll = () => chart && setExpanded(new Set(allUnitKeys(chart.root)))
  const collapseAll = () => {
    if (!chart) return
    setExpanded(new Set([chart.root.key]))
    setMembersOpen(new Set())
  }

  // تصدير الهيكل (حسب فلتر الفرع) CSV — صف لكل وحدة بتسلسلها ومسؤولها وعدد موظفيها
  const handleExport = () => {
    if (!chart) return
    const rows: string[][] = []
    const walk = (unit: OrgUnit, parent: string) => {
      rows.push([
        UNIT_KIND_LABELS[unit.kind],
        unit.name,
        parent,
        unit.branchName,
        unit.head?.name ?? '',
        unit.head?.jobTitle ?? '',
        String(unit.headcount),
      ])
      unit.children.forEach((c) => walk(c, unit.name))
    }
    walk(chart.root, '')
    if (chart.secretary) {
      rows.splice(1, 0, ['السكرتير التنفيذي', chart.secretary.name, chart.root.name, chart.root.branchName, chart.secretary.name, chart.secretary.jobTitle, ''])
    }
    downloadCsv(
      `org-chart-${csvDateStamp()}.csv`,
      ['النوع', 'الوحدة', 'تتبع', 'الفرع', 'المسؤول', 'المسمى الوظيفي', 'عدد الموظفين'],
      rows
    )
  }

  const stats = chart?.stats ?? { employees: 0, departments: 0, teams: 0, managers: 0 }
  const searching = searchTerm.trim().length > 0

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الهيكل التنظيمي</h1>
            <p className="text-gray-500 mt-1">
              الإدارة التنفيذية وتحتها الإدارات والأقسام والفرق بمسؤوليها وعدد موظفيها
            </p>
          </div>
          <div className="oc-noprint flex items-center gap-3">
            <button
              onClick={() => window.print()}
              disabled={loading || !chart}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={18} />
              طباعة
            </button>
            <button
              onClick={handleExport}
              disabled={loading || !chart}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {chart && chart.root.kind === 'executive' && !chart.executiveConfigured && (
          <div className="oc-noprint bg-primary-50 text-primary-800 rounded-xl p-4 text-sm flex items-center justify-between gap-3 flex-wrap">
            <span>
              {chart.root.head
                ? 'الرئيس التنفيذي متحدد من المسمى الوظيفي. لتثبيته هو والسكرتير التنفيذي علِّم «الإدارة التنفيذية» من إعدادات الأقسام.'
                : 'مفيش إدارة تنفيذية متحددة. علِّم قسم «الإدارة التنفيذية» واختار السكرتير التنفيذي من إعدادات الأقسام.'}
            </span>
            <Link href="/settings/departments" className="font-semibold underline">
              إعدادات الأقسام
            </Link>
          </div>
        )}

        {/* Controls */}
        <div className="card oc-noprint">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-72">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم موظف أو قسم أو فريق..."
                  className="input pr-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {searching && search && (
                <span className={`text-sm ${search.count ? 'text-gray-600' : 'text-red-600'}`}>
                  {search.count ? `${search.count} نتيجة` : 'مفيش نتايج'}
                </span>
              )}

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="input w-48"
                disabled={branches.length <= 1}
                aria-label="الفرع"
              >
                {branches.length !== 1 && <option value="all">كل الفروع</option>}
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="btn-secondary flex items-center gap-1.5 text-sm" disabled={!chart}>
                <ChevronsUpDown size={16} />
                فتح الكل
              </button>
              <button onClick={collapseAll} className="btn-secondary flex items-center gap-1.5 text-sm" disabled={!chart}>
                <ChevronsDownUp size={16} />
                قفل الكل
              </button>
              <span className="w-px h-6 bg-gray-200 mx-1" />
              <button
                onClick={() => setZoom(Math.max(40, zoom - 10))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="تصغير"
              >
                <ZoomOut size={18} className="text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-600 w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="تكبير"
              >
                <ZoomIn size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="الحجم الطبيعي"
              >
                <Maximize2 size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="oc-noprint grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'الموظفون على رأس العمل', value: stats.employees, icon: Users, tone: 'bg-primary-100 text-primary-600' },
            { label: 'الإدارات والأقسام', value: stats.departments, icon: Building2, tone: 'bg-sky-100 text-sky-600' },
            { label: 'الفرق', value: stats.teams, icon: UsersRound, tone: 'bg-emerald-100 text-emerald-600' },
            { label: 'المدراء وقادة الفرق', value: stats.managers, icon: User, tone: 'bg-amber-100 text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.tone}`}>
                <s.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Org Chart */}
        <div ref={scrollRef} className="oc-scroll card p-6 overflow-auto max-h-[calc(100vh-220px)] bg-gray-50/60">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !chart ? (
            <div className="py-12 text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد بيانات للهيكل</p>
            </div>
          ) : (
            <div style={{ zoom: zoom / 100 }}>
              <OrgChartView
                chart={chart}
                state={{
                  expanded,
                  membersOpen,
                  highlightUnits: search?.units ?? new Set(),
                  highlightPeople: search?.people ?? new Set(),
                  showBranch: branchFilter === 'all' && branches.length > 1,
                  onToggle: toggle,
                  onToggleMembers: toggleMembers,
                }}
              />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="card oc-noprint">
          <div className="flex items-center gap-6 flex-wrap text-sm text-gray-600">
            <span className="font-medium">دليل الألوان:</span>
            {[
              ['bg-primary-700', 'الإدارة التنفيذية / الإدارات'],
              ['bg-amber-500', 'السكرتير التنفيذي'],
              ['bg-sky-500', 'الأقسام الفرعية'],
              ['bg-emerald-500', 'الفرق'],
              ['bg-gray-300', 'بدون قسم'],
            ].map(([tone, label]) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded ${tone}`} />
                {label}
              </span>
            ))}
            <span className="text-gray-400">اضغط عدد الموظفين في أي كارت لعرض أعضائه</span>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
