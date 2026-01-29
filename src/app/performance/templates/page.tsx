'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  FileText,
  Star,
  Copy,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Settings,
  Target,
  Users,
  X,
} from 'lucide-react'

interface ReviewTemplate {
  id: string
  name: string
  description: string
  type: 'standard' | 'annual' | 'probation' | 'custom'
  categories: { name: string; weight: number }[]
  usageCount: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const templates: ReviewTemplate[] = [
  {
    id: '1',
    name: 'النموذج القياسي',
    description: 'النموذج الافتراضي للتقييمات الربع سنوية',
    type: 'standard',
    categories: [
      { name: 'الإنتاجية', weight: 25 },
      { name: 'جودة العمل', weight: 25 },
      { name: 'العمل الجماعي', weight: 20 },
      { name: 'المبادرة', weight: 15 },
      { name: 'الالتزام', weight: 15 },
    ],
    usageCount: 450,
    isDefault: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'التقييم السنوي الشامل',
    description: 'نموذج شامل للتقييم السنوي يتضمن معايير إضافية',
    type: 'annual',
    categories: [
      { name: 'الإنتاجية', weight: 20 },
      { name: 'جودة العمل', weight: 20 },
      { name: 'العمل الجماعي', weight: 15 },
      { name: 'المبادرة', weight: 10 },
      { name: 'الالتزام', weight: 10 },
      { name: 'القيادة', weight: 10 },
      { name: 'التطور المهني', weight: 15 },
    ],
    usageCount: 156,
    isDefault: false,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'نموذج فترة التجربة',
    description: 'نموذج مخصص لتقييم الموظفين الجدد خلال فترة التجربة',
    type: 'probation',
    categories: [
      { name: 'التعلم والتكيف', weight: 30 },
      { name: 'جودة العمل', weight: 25 },
      { name: 'الالتزام', weight: 20 },
      { name: 'التواصل', weight: 15 },
      { name: 'روح الفريق', weight: 10 },
    ],
    usageCount: 48,
    isDefault: false,
    createdAt: '2023-06-01',
    updatedAt: '2023-12-20',
  },
  {
    id: '4',
    name: 'نموذج المبيعات',
    description: 'نموذج مخصص لتقييم فريق المبيعات',
    type: 'custom',
    categories: [
      { name: 'تحقيق الأهداف', weight: 35 },
      { name: 'خدمة العملاء', weight: 25 },
      { name: 'المعرفة بالمنتجات', weight: 20 },
      { name: 'العمل الجماعي', weight: 10 },
      { name: 'المبادرة', weight: 10 },
    ],
    usageCount: 32,
    isDefault: false,
    createdAt: '2023-09-01',
    updatedAt: '2024-01-05',
  },
]

const typeLabels = {
  standard: 'قياسي',
  annual: 'سنوي',
  probation: 'فترة التجربة',
  custom: 'مخصص',
}

const typeColors = {
  standard: 'bg-primary-100 text-primary-700',
  annual: 'bg-purple-100 text-purple-700',
  probation: 'bg-warning-50 text-warning-700',
  custom: 'bg-blue-100 text-blue-700',
}

export default function PerformanceTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ReviewTemplate | null>(null)

  const filteredTemplates = templates.filter(
    (t) => t.name.includes(searchTerm) || t.description.includes(searchTerm)
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">نماذج التقييم</h1>
            <p className="text-gray-500 mt-1">إدارة وتخصيص نماذج تقييم الأداء</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إنشاء نموذج جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي النماذج</p>
              <p className="text-2xl font-bold text-gray-800">{templates.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">النموذج الافتراضي</p>
              <p className="text-lg font-bold text-gray-800">النموذج القياسي</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Target size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الاستخدام</p>
              <p className="text-2xl font-bold text-gray-800">
                {templates.reduce((sum, t) => sum + t.usageCount, 0)}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نماذج مخصصة</p>
              <p className="text-2xl font-bold text-gray-800">
                {templates.filter((t) => t.type === 'custom').length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن نموذج..."
              className="input pr-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card hover:shadow-lg transition-shadow cursor-pointer ${
                template.isDefault ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <FileText size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{template.name}</h3>
                      {template.isDefault && (
                        <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                          افتراضي
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[template.type]}`}>
                      {typeLabels[template.type]}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-4">{template.description}</p>

              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700">معايير التقييم:</p>
                <div className="flex flex-wrap gap-2">
                  {template.categories.map((cat) => (
                    <span
                      key={cat.name}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs"
                    >
                      {cat.name} ({cat.weight}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {template.usageCount} استخدام
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Copy size={16} className="text-gray-600" />
                  </button>
                  <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  {!template.isDefault && (
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                      <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Template Details Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <FileText size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedTemplate.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[selectedTemplate.type]}`}>
                      {typeLabels[selectedTemplate.type]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">الوصف</h3>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-4">معايير التقييم</h3>
                  <div className="space-y-3">
                    {selectedTemplate.categories.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="font-medium text-gray-800">{cat.name}</span>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${cat.weight}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600 w-12 text-left">
                            {cat.weight}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedTemplate.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">آخر تحديث</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedTemplate.updatedAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <Copy size={18} />
                  نسخ النموذج
                </button>
                <button className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Edit2 size={18} />
                  تعديل النموذج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
