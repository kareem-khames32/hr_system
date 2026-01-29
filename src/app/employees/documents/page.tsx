'use client'

import { useState } from 'react'
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
} from 'lucide-react'

interface Document {
  id: string
  name: string
  type: 'pdf' | 'image' | 'doc' | 'other'
  category: string
  employeeName: string
  employeeId: string
  uploadDate: string
  expiryDate?: string
  size: string
  status: 'valid' | 'expiring' | 'expired'
}

const documents: Document[] = [
  {
    id: '1',
    name: 'عقد العمل - أحمد محمد',
    type: 'pdf',
    category: 'عقود',
    employeeName: 'أحمد محمد علي',
    employeeId: 'EMP001',
    uploadDate: '2024-01-15',
    size: '2.5 MB',
    status: 'valid',
  },
  {
    id: '2',
    name: 'صورة الهوية الوطنية',
    type: 'image',
    category: 'وثائق شخصية',
    employeeName: 'سارة أحمد الخالدي',
    employeeId: 'EMP002',
    uploadDate: '2024-01-10',
    expiryDate: '2025-06-15',
    size: '1.2 MB',
    status: 'valid',
  },
  {
    id: '3',
    name: 'شهادة الخبرة السابقة',
    type: 'pdf',
    category: 'شهادات',
    employeeName: 'عمر سالم الحربي',
    employeeId: 'EMP003',
    uploadDate: '2024-01-08',
    size: '800 KB',
    status: 'valid',
  },
  {
    id: '4',
    name: 'رخصة القيادة',
    type: 'image',
    category: 'وثائق شخصية',
    employeeName: 'نورة محمد الدوسري',
    employeeId: 'EMP004',
    uploadDate: '2023-12-20',
    expiryDate: '2024-02-01',
    size: '1.5 MB',
    status: 'expiring',
  },
  {
    id: '5',
    name: 'الشهادة الجامعية',
    type: 'pdf',
    category: 'شهادات',
    employeeName: 'فهد عبدالله السعيد',
    employeeId: 'EMP005',
    uploadDate: '2024-01-05',
    size: '3.2 MB',
    status: 'valid',
  },
  {
    id: '6',
    name: 'جواز السفر',
    type: 'image',
    category: 'وثائق شخصية',
    employeeName: 'ريم محمد الشمري',
    employeeId: 'EMP006',
    uploadDate: '2023-11-15',
    expiryDate: '2024-01-20',
    size: '2.0 MB',
    status: 'expired',
  },
]

const categories = ['الكل', 'عقود', 'وثائق شخصية', 'شهادات', 'تأمينات', 'أخرى']

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

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('الكل')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.includes(searchTerm) || doc.employeeName.includes(searchTerm)
    const matchesCategory =
      selectedCategory === 'الكل' || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const stats = {
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring').length,
    expired: documents.filter((d) => d.status === 'expired').length,
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
          <button className="btn-primary flex items-center gap-2">
            <Upload size={18} />
            رفع مستند
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FolderOpen size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المستندات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مستندات سارية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.valid}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قاربت على الانتهاء</p>
              <p className="text-2xl font-bold text-gray-800">{stats.expiring}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
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
            <div className="flex items-center gap-2">
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
        </div>

        {/* Documents */}
        {viewMode === 'list' ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستند</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التصنيف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الرفع</th>
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
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[doc.type]}`}>
                            <TypeIcon size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{doc.name}</p>
                            <p className="text-sm text-gray-500">{doc.size}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-800">{doc.employeeName}</p>
                        <p className="text-sm text-gray-500">{doc.employeeId}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{doc.category}</td>
                      <td className="px-4 py-4 text-gray-600">
                        {new Date(doc.uploadDate).toLocaleDateString('ar-SA')}
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
                          <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                            <Eye size={16} className="text-gray-600" />
                          </button>
                          <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                            <Download size={16} className="text-gray-600" />
                          </button>
                          <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                            <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filteredDocs.map((doc) => {
              const TypeIcon = typeIcons[doc.type]
              return (
                <div key={doc.id} className="card hover:shadow-lg transition-shadow">
                  <div className={`w-full h-32 rounded-xl flex items-center justify-center mb-4 ${typeColors[doc.type]}`}>
                    <TypeIcon size={48} />
                  </div>
                  <h3 className="font-medium text-gray-800 mb-1 line-clamp-1">{doc.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{doc.employeeName}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                      {statusLabels[doc.status]}
                    </span>
                    <span className="text-xs text-gray-400">{doc.size}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
