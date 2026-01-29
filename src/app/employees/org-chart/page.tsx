'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
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

const orgData: OrgNode = {
  id: '1',
  name: 'محمد سالم العتيبي',
  title: 'المدير العام',
  department: 'الإدارة العليا',
  avatar: 'م',
  email: 'ceo@company.com',
  phone: '+966 50 111 1111',
  expanded: true,
  children: [
    {
      id: '2',
      name: 'أحمد محمد علي',
      title: 'مدير تقنية المعلومات',
      department: 'تقنية المعلومات',
      avatar: 'أ',
      email: 'ahmed.m@company.com',
      phone: '+966 50 123 4567',
      expanded: true,
      children: [
        {
          id: '5',
          name: 'ريم سعود الدوسري',
          title: 'مطور برمجيات أول',
          department: 'تقنية المعلومات',
          avatar: 'ر',
          email: 'reem.s@company.com',
          phone: '+966 56 890 1234',
        },
        {
          id: '6',
          name: 'فهد عبدالله',
          title: 'مطور برمجيات',
          department: 'تقنية المعلومات',
          avatar: 'ف',
          email: 'fahad.a@company.com',
          phone: '+966 55 123 4567',
        },
        {
          id: '7',
          name: 'سلمان خالد',
          title: 'مدير النظام',
          department: 'تقنية المعلومات',
          avatar: 'س',
          email: 'salman.k@company.com',
          phone: '+966 54 234 5678',
        },
      ],
    },
    {
      id: '3',
      name: 'سارة أحمد الخالدي',
      title: 'مدير الموارد البشرية',
      department: 'الموارد البشرية',
      avatar: 'س',
      email: 'sara.a@company.com',
      phone: '+966 55 234 5678',
      expanded: true,
      children: [
        {
          id: '8',
          name: 'نورة محمد',
          title: 'أخصائي موارد بشرية',
          department: 'الموارد البشرية',
          avatar: 'ن',
          email: 'noura.m@company.com',
          phone: '+966 50 345 6789',
        },
        {
          id: '9',
          name: 'هند سالم',
          title: 'أخصائي توظيف',
          department: 'الموارد البشرية',
          avatar: 'هـ',
          email: 'hind.s@company.com',
          phone: '+966 55 456 7890',
        },
      ],
    },
    {
      id: '4',
      name: 'عمر سالم الحربي',
      title: 'مدير المبيعات',
      department: 'المبيعات',
      avatar: 'ع',
      email: 'omar.s@company.com',
      phone: '+966 50 567 8901',
      expanded: true,
      children: [
        {
          id: '10',
          name: 'محمد خالد السعيد',
          title: 'مندوب مبيعات أول',
          department: 'المبيعات',
          avatar: 'م',
          email: 'mohammed.k@company.com',
          phone: '+966 54 345 6789',
        },
        {
          id: '11',
          name: 'أحمد علي',
          title: 'مندوب مبيعات',
          department: 'المبيعات',
          avatar: 'أ',
          email: 'ahmed.a@company.com',
          phone: '+966 56 567 8901',
        },
        {
          id: '12',
          name: 'خالد محمد',
          title: 'مندوب مبيعات',
          department: 'المبيعات',
          avatar: 'خ',
          email: 'khaled.m@company.com',
          phone: '+966 50 678 9012',
        },
      ],
    },
  ],
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
  const [orgTree, setOrgTree] = useState(orgData)
  const [zoom, setZoom] = useState(100)
  const [selectedDepartment, setSelectedDepartment] = useState('all')

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
    setOrgTree(toggleInTree(orgTree))
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
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير PDF
            </button>
          </div>
        </div>

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
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input w-48"
              >
                <option value="all">كل الأقسام</option>
                <option value="it">تقنية المعلومات</option>
                <option value="hr">الموارد البشرية</option>
                <option value="sales">المبيعات</option>
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
              <p className="text-2xl font-bold text-gray-800">248</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الأقسام</p>
              <p className="text-2xl font-bold text-gray-800">12</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <User size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المدراء</p>
              <p className="text-2xl font-bold text-gray-800">18</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الفروع</p>
              <p className="text-2xl font-bold text-gray-800">3</p>
            </div>
          </div>
        </div>

        {/* Org Chart */}
        <div className="card overflow-hidden p-8">
          <div
            className="overflow-auto min-h-[600px] flex justify-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <OrgNodeCard node={orgTree} isRoot onToggle={toggleNode} />
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-600">دليل الألوان:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded" />
              <span className="text-sm text-gray-600">الإدارة العليا</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded" />
              <span className="text-sm text-gray-600">الموظفين</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary-500 rounded-full" />
              <span className="text-sm text-gray-600">عدد المرؤوسين</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
