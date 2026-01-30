'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Calculator,
  Plus,
  Trash2,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  Code,
  Variable,
  Brackets,
  Hash,
  Percent,
  DollarSign,
  Clock,
  Calendar,
  Users,
  FileText,
  Copy,
  Play,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  ToggleLeft,
  ToggleRight,
  X,
  Info,
} from 'lucide-react'

// المتغيرات المتاحة
const availableVariables = [
  // الراتب
  { id: 'basic_salary', name: 'الراتب الأساسي', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'housing_allowance', name: 'بدل السكن', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'transport_allowance', name: 'بدل المواصلات', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'food_allowance', name: 'بدل الطعام', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'phone_allowance', name: 'بدل الهاتف', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'total_allowances', name: 'إجمالي البدلات', category: 'salary', type: 'number', icon: DollarSign },
  { id: 'gross_salary', name: 'إجمالي الراتب', category: 'salary', type: 'number', icon: DollarSign },

  // الحضور والانصراف
  { id: 'work_days', name: 'أيام العمل', category: 'attendance', type: 'number', icon: Calendar },
  { id: 'present_days', name: 'أيام الحضور', category: 'attendance', type: 'number', icon: CheckCircle },
  { id: 'absent_days', name: 'أيام الغياب', category: 'attendance', type: 'number', icon: X },
  { id: 'late_days', name: 'أيام التأخير', category: 'attendance', type: 'number', icon: Clock },
  { id: 'late_minutes', name: 'دقائق التأخير', category: 'attendance', type: 'number', icon: Clock },
  { id: 'early_leave_days', name: 'أيام الخروج المبكر', category: 'attendance', type: 'number', icon: Clock },
  { id: 'overtime_hours', name: 'ساعات العمل الإضافي', category: 'attendance', type: 'number', icon: Clock },
  { id: 'work_hours', name: 'ساعات العمل الفعلية', category: 'attendance', type: 'number', icon: Clock },
  { id: 'required_hours', name: 'ساعات العمل المطلوبة', category: 'attendance', type: 'number', icon: Clock },

  // الإجازات
  { id: 'sick_leave_days', name: 'أيام الإجازة المرضية', category: 'leaves', type: 'number', icon: Calendar },
  { id: 'annual_leave_days', name: 'أيام الإجازة السنوية', category: 'leaves', type: 'number', icon: Calendar },
  { id: 'unpaid_leave_days', name: 'أيام الإجازة بدون راتب', category: 'leaves', type: 'number', icon: Calendar },

  // التأمينات
  { id: 'gosi_employee', name: 'نسبة GOSI للموظف', category: 'deductions', type: 'percent', icon: Percent },
  { id: 'gosi_company', name: 'نسبة GOSI للشركة', category: 'deductions', type: 'percent', icon: Percent },

  // أخرى
  { id: 'loan_deduction', name: 'خصم السلفة', category: 'deductions', type: 'number', icon: DollarSign },
  { id: 'other_deductions', name: 'خصومات أخرى', category: 'deductions', type: 'number', icon: DollarSign },
  { id: 'bonus', name: 'المكافآت', category: 'additions', type: 'number', icon: DollarSign },
  { id: 'commission', name: 'العمولات', category: 'additions', type: 'number', icon: DollarSign },
]

// العمليات المتاحة
const operators = [
  { id: 'add', symbol: '+', name: 'جمع' },
  { id: 'subtract', symbol: '-', name: 'طرح' },
  { id: 'multiply', symbol: '×', name: 'ضرب' },
  { id: 'divide', symbol: '÷', name: 'قسمة' },
  { id: 'percent', symbol: '%', name: 'نسبة مئوية' },
  { id: 'open_paren', symbol: '(', name: 'قوس فتح' },
  { id: 'close_paren', symbol: ')', name: 'قوس إغلاق' },
]

// الشروط المتاحة
const conditions = [
  { id: 'gt', symbol: '>', name: 'أكبر من' },
  { id: 'gte', symbol: '>=', name: 'أكبر من أو يساوي' },
  { id: 'lt', symbol: '<', name: 'أصغر من' },
  { id: 'lte', symbol: '<=', name: 'أصغر من أو يساوي' },
  { id: 'eq', symbol: '==', name: 'يساوي' },
  { id: 'neq', symbol: '!=', name: 'لا يساوي' },
]

// نوع المعادلة
interface Formula {
  id: string
  name: string
  description: string
  category: 'addition' | 'deduction' | 'calculation'
  expression: string
  conditions: FormulaCondition[]
  isActive: boolean
  priority: number
  appliesTo: 'all' | 'department' | 'position' | 'employee'
  targetIds?: string[]
}

interface FormulaCondition {
  id: string
  variable: string
  operator: string
  value: number | string
  result: string
}

// المعادلات الافتراضية
const initialFormulas: Formula[] = [
  {
    id: '1',
    name: 'حساب العمل الإضافي',
    description: 'حساب قيمة ساعات العمل الإضافي',
    category: 'addition',
    expression: '(basic_salary / 30 / 8) × overtime_hours × overtime_rate',
    conditions: [
      {
        id: 'c1',
        variable: 'overtime_hours',
        operator: '<=',
        value: 10,
        result: 'overtime_rate = 1.5',
      },
      {
        id: 'c2',
        variable: 'overtime_hours',
        operator: '>',
        value: 10,
        result: 'overtime_rate = 2.0',
      },
    ],
    isActive: true,
    priority: 1,
    appliesTo: 'all',
  },
  {
    id: '2',
    name: 'خصم التأخير',
    description: 'حساب خصم دقائق التأخير',
    category: 'deduction',
    expression: '(basic_salary / 30 / 8 / 60) × late_minutes',
    conditions: [
      {
        id: 'c1',
        variable: 'late_minutes',
        operator: '<=',
        value: 15,
        result: 'لا يتم الخصم',
      },
      {
        id: 'c2',
        variable: 'late_minutes',
        operator: '>',
        value: 15,
        result: 'يتم الخصم من الدقيقة الأولى',
      },
    ],
    isActive: true,
    priority: 2,
    appliesTo: 'all',
  },
  {
    id: '3',
    name: 'خصم الغياب',
    description: 'حساب خصم أيام الغياب بدون عذر',
    category: 'deduction',
    expression: '(gross_salary / 30) × absent_days × absence_rate',
    conditions: [
      {
        id: 'c1',
        variable: 'absent_days',
        operator: '<=',
        value: 2,
        result: 'absence_rate = 1.0',
      },
      {
        id: 'c2',
        variable: 'absent_days',
        operator: '>',
        value: 2,
        result: 'absence_rate = 1.5',
      },
    ],
    isActive: true,
    priority: 3,
    appliesTo: 'all',
  },
  {
    id: '4',
    name: 'التأمينات الاجتماعية (GOSI)',
    description: 'حساب نسبة التأمينات على الموظف',
    category: 'deduction',
    expression: '(basic_salary + housing_allowance) × 0.0975',
    conditions: [],
    isActive: true,
    priority: 4,
    appliesTo: 'all',
  },
  {
    id: '5',
    name: 'بدل السكن',
    description: 'حساب بدل السكن (25% من الأساسي)',
    category: 'calculation',
    expression: 'basic_salary × 0.25',
    conditions: [],
    isActive: true,
    priority: 5,
    appliesTo: 'all',
  },
  {
    id: '6',
    name: 'مكافأة نهاية الخدمة',
    description: 'حساب مكافأة نهاية الخدمة',
    category: 'calculation',
    expression: '(basic_salary / 2) × years_of_service',
    conditions: [
      {
        id: 'c1',
        variable: 'years_of_service',
        operator: '<',
        value: 5,
        result: 'نصف راتب عن كل سنة',
      },
      {
        id: 'c2',
        variable: 'years_of_service',
        operator: '>=',
        value: 5,
        result: 'راتب كامل عن كل سنة',
      },
    ],
    isActive: true,
    priority: 6,
    appliesTo: 'all',
  },
]

export default function PayrollFormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>(initialFormulas)
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddFormula, setShowAddFormula] = useState(false)
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)
  const [expandedFormulas, setExpandedFormulas] = useState<string[]>(['1', '2'])
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'addition' | 'deduction' | 'calculation'>('all')
  const [showTestModal, setShowTestModal] = useState(false)
  const [testFormula, setTestFormula] = useState<Formula | null>(null)

  // تبديل حالة المعادلة
  const toggleFormulaActive = (formulaId: string) => {
    setFormulas(prev =>
      prev.map(f => (f.id === formulaId ? { ...f, isActive: !f.isActive } : f))
    )
    setHasChanges(true)
  }

  // حذف معادلة
  const deleteFormula = (formulaId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المعادلة؟')) {
      setFormulas(prev => prev.filter(f => f.id !== formulaId))
      setHasChanges(true)
    }
  }

  // نسخ معادلة
  const duplicateFormula = (formula: Formula) => {
    const newFormula: Formula = {
      ...formula,
      id: Date.now().toString(),
      name: formula.name + ' (نسخة)',
      isActive: false,
    }
    setFormulas(prev => [...prev, newFormula])
    setHasChanges(true)
  }

  // توسيع/طي المعادلة
  const toggleFormulaExpanded = (formulaId: string) => {
    setExpandedFormulas(prev =>
      prev.includes(formulaId)
        ? prev.filter(id => id !== formulaId)
        : [...prev, formulaId]
    )
  }

  // تصفية المعادلات
  const filteredFormulas = formulas.filter(
    f => selectedCategory === 'all' || f.category === selectedCategory
  )

  // حفظ التغييرات
  const saveChanges = () => {
    setHasChanges(false)
    alert('تم حفظ المعادلات بنجاح!')
  }

  // إحصائيات
  const stats = {
    total: formulas.length,
    active: formulas.filter(f => f.isActive).length,
    additions: formulas.filter(f => f.category === 'addition').length,
    deductions: formulas.filter(f => f.category === 'deduction').length,
  }

  // الحصول على لون الفئة
  const getCategoryColor = (category: Formula['category']) => {
    switch (category) {
      case 'addition':
        return { bg: 'bg-green-100', text: 'text-green-700', name: 'إضافة' }
      case 'deduction':
        return { bg: 'bg-red-100', text: 'text-red-700', name: 'خصم' }
      case 'calculation':
        return { bg: 'bg-blue-100', text: 'text-blue-700', name: 'حساب' }
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">معادلات الرواتب</h1>
            <p className="text-gray-500 mt-1">إدارة معادلات حساب الرواتب والخصومات</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertCircle size={18} />
                يوجد تغييرات غير محفوظة
              </span>
            )}
            <button
              onClick={() => setShowAddFormula(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus size={18} />
              معادلة جديدة
            </button>
            <button
              onClick={saveChanges}
              disabled={!hasChanges}
              className={`btn-primary flex items-center gap-2 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              حفظ المعادلات
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calculator size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المعادلات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معادلات نشطة</p>
              <p className="text-2xl font-bold text-success-600">{stats.active}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Plus size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معادلات الإضافة</p>
              <p className="text-2xl font-bold text-green-600">{stats.additions}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معادلات الخصم</p>
              <p className="text-2xl font-bold text-red-600">{stats.deductions}</p>
            </div>
          </div>
        </div>

        {/* Variables Reference */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Variable size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">المتغيرات المتاحة</h2>
                <p className="text-sm text-gray-500">استخدم هذه المتغيرات في المعادلات</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {['salary', 'attendance', 'leaves', 'deductions'].map(category => (
              <div key={category} className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-700 mb-3">
                  {category === 'salary' && 'الراتب والبدلات'}
                  {category === 'attendance' && 'الحضور والانصراف'}
                  {category === 'leaves' && 'الإجازات'}
                  {category === 'deductions' && 'الخصومات'}
                </h4>
                <div className="space-y-2">
                  {availableVariables
                    .filter(v => v.category === category)
                    .slice(0, 5)
                    .map(variable => {
                      const Icon = variable.icon
                      return (
                        <div
                          key={variable.id}
                          className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg"
                        >
                          <Icon size={14} className="text-gray-400" />
                          <code className="text-primary-600 font-mono text-xs">{variable.id}</code>
                          <span className="text-gray-500 text-xs">- {variable.name}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="card">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">تصفية:</span>
            {[
              { id: 'all', name: 'الكل' },
              { id: 'addition', name: 'الإضافات' },
              { id: 'deduction', name: 'الخصومات' },
              { id: 'calculation', name: 'الحسابات' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Formulas List */}
        <div className="space-y-4">
          {filteredFormulas.map((formula, index) => {
            const categoryStyle = getCategoryColor(formula.category)
            const isExpanded = expandedFormulas.includes(formula.id)

            return (
              <div
                key={formula.id}
                className={`card overflow-hidden ${!formula.isActive ? 'opacity-60' : ''}`}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleFormulaExpanded(formula.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Calculator size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{formula.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
                          {categoryStyle.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          formula.isActive
                            ? 'bg-success-100 text-success-600'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {formula.isActive ? 'نشطة' : 'معطلة'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formula.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">الأولوية: {formula.priority}</span>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {/* المعادلة */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">المعادلة:</h4>
                      <div className="p-4 bg-gray-900 rounded-xl">
                        <code className="text-green-400 font-mono text-sm">
                          {formula.expression}
                        </code>
                      </div>
                    </div>

                    {/* الشروط */}
                    {formula.conditions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">الشروط:</h4>
                        <div className="space-y-2">
                          {formula.conditions.map((condition, idx) => (
                            <div
                              key={condition.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                            >
                              <span className="text-xs text-gray-400">#{idx + 1}</span>
                              <span className="text-sm font-medium text-primary-600">IF</span>
                              <code className="px-2 py-1 bg-white rounded text-sm font-mono">
                                {condition.variable}
                              </code>
                              <span className="text-sm font-mono text-warning-600">
                                {condition.operator}
                              </span>
                              <span className="text-sm font-bold">{condition.value}</span>
                              <span className="text-sm font-medium text-success-600">THEN</span>
                              <span className="text-sm text-gray-700">{condition.result}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFormulaActive(formula.id)
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            formula.isActive
                              ? 'bg-success-50 text-success-600 hover:bg-success-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {formula.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          {formula.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setTestFormula(formula)
                            setShowTestModal(true)
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <Play size={18} />
                          اختبار
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingFormula(formula)
                            setShowAddFormula(true)
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Edit3 size={18} />
                          تعديل
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateFormula(formula)
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Copy size={18} />
                          نسخ
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteFormula(formula.id)
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={18} />
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filteredFormulas.length === 0 && (
            <div className="card text-center py-12">
              <Calculator size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">لا توجد معادلات في هذه الفئة</p>
            </div>
          )}
        </div>

        {/* Add/Edit Formula Modal */}
        {showAddFormula && (
          <FormulaEditorModal
            formula={editingFormula}
            variables={availableVariables}
            onClose={() => {
              setShowAddFormula(false)
              setEditingFormula(null)
            }}
            onSave={(formula) => {
              if (editingFormula) {
                setFormulas(prev => prev.map(f => (f.id === formula.id ? formula : f)))
              } else {
                setFormulas(prev => [...prev, { ...formula, id: Date.now().toString() }])
              }
              setHasChanges(true)
              setShowAddFormula(false)
              setEditingFormula(null)
            }}
          />
        )}

        {/* Test Formula Modal */}
        {showTestModal && testFormula && (
          <TestFormulaModal
            formula={testFormula}
            variables={availableVariables}
            onClose={() => {
              setShowTestModal(false)
              setTestFormula(null)
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}

// Modal محرر المعادلات
function FormulaEditorModal({
  formula,
  variables,
  onClose,
  onSave,
}: {
  formula: Formula | null
  variables: typeof availableVariables
  onClose: () => void
  onSave: (formula: Formula) => void
}) {
  const [name, setName] = useState(formula?.name || '')
  const [description, setDescription] = useState(formula?.description || '')
  const [category, setCategory] = useState<Formula['category']>(formula?.category || 'addition')
  const [expression, setExpression] = useState(formula?.expression || '')
  const [conditions, setConditions] = useState<FormulaCondition[]>(formula?.conditions || [])
  const [priority, setPriority] = useState(formula?.priority || 1)

  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        variable: 'overtime_hours',
        operator: '>',
        value: 0,
        result: '',
      },
    ])
  }

  const removeCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, field: string, value: any) => {
    setConditions(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const insertVariable = (varId: string) => {
    setExpression(prev => prev + varId)
  }

  const insertOperator = (op: string) => {
    setExpression(prev => prev + ' ' + op + ' ')
  }

  const handleSave = () => {
    if (!name || !expression) {
      alert('الرجاء ملء الحقول المطلوبة')
      return
    }

    onSave({
      id: formula?.id || '',
      name,
      description,
      category,
      expression,
      conditions,
      isActive: formula?.isActive ?? true,
      priority,
      appliesTo: 'all',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {formula ? 'تعديل المعادلة' : 'إضافة معادلة جديدة'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">أنشئ معادلة مخصصة لحساب الرواتب</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المعادلة *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: حساب العمل الإضافي"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الفئة *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Formula['category'])}
                className="input w-full"
              >
                <option value="addition">إضافة</option>
                <option value="deduction">خصم</option>
                <option value="calculation">حساب</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف مختصر للمعادلة"
              className="input w-full"
            />
          </div>

          {/* Formula Builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المعادلة *</label>

            {/* Variables Quick Insert */}
            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">المتغيرات (انقر للإضافة):</p>
              <div className="flex flex-wrap gap-1">
                {variables.slice(0, 12).map(v => (
                  <button
                    key={v.id}
                    onClick={() => insertVariable(v.id)}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-primary-600 hover:bg-primary-50"
                  >
                    {v.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Operators */}
            <div className="mb-3 flex gap-2">
              {operators.map(op => (
                <button
                  key={op.id}
                  onClick={() => insertOperator(op.symbol)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center font-mono text-lg"
                  title={op.name}
                >
                  {op.symbol}
                </button>
              ))}
            </div>

            {/* Expression Input */}
            <textarea
              value={expression}
              onChange={e => setExpression(e.target.value)}
              placeholder="اكتب المعادلة هنا... مثال: (basic_salary / 30) × work_days"
              className="input w-full h-24 font-mono text-sm"
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">الشروط (اختياري)</label>
              <button
                onClick={addCondition}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus size={16} />
                إضافة شرط
              </button>
            </div>

            {conditions.length > 0 ? (
              <div className="space-y-3">
                {conditions.map((condition, idx) => (
                  <div key={condition.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-400 w-6">#{idx + 1}</span>
                    <span className="text-sm font-medium text-primary-600">IF</span>
                    <select
                      value={condition.variable}
                      onChange={e => updateCondition(condition.id, 'variable', e.target.value)}
                      className="input flex-1"
                    >
                      {variables.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={e => updateCondition(condition.id, 'operator', e.target.value)}
                      className="input w-24"
                    >
                      {conditions.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.id}
                        </option>
                      ))}
                      <option value=">">{'>'}</option>
                      <option value=">=">{'≥'}</option>
                      <option value="<">{'<'}</option>
                      <option value="<=">{'≤'}</option>
                      <option value="==">{'='}</option>
                    </select>
                    <input
                      type="number"
                      value={condition.value}
                      onChange={e => updateCondition(condition.id, 'value', e.target.value)}
                      className="input w-20"
                    />
                    <span className="text-sm font-medium text-success-600">THEN</span>
                    <input
                      type="text"
                      value={condition.result}
                      onChange={e => updateCondition(condition.id, 'result', e.target.value)}
                      placeholder="النتيجة"
                      className="input flex-1"
                    />
                    <button
                      onClick={() => removeCondition(condition.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
                لا توجد شروط. أضف شرطاً لتخصيص المعادلة.
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الأولوية (الأقل يُنفذ أولاً)
            </label>
            <input
              type="number"
              value={priority}
              onChange={e => setPriority(parseInt(e.target.value))}
              min={1}
              max={100}
              className="input w-24"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={handleSave} className="flex-1 btn-primary">
            {formula ? 'حفظ التعديلات' : 'إضافة المعادلة'}
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal اختبار المعادلة
function TestFormulaModal({
  formula,
  variables,
  onClose,
}: {
  formula: Formula
  variables: typeof availableVariables
  onClose: () => void
}) {
  const [testValues, setTestValues] = useState<{ [key: string]: number }>({
    basic_salary: 10000,
    overtime_hours: 15,
    late_minutes: 30,
    absent_days: 1,
    work_days: 22,
  })
  const [result, setResult] = useState<number | null>(null)

  const calculateResult = () => {
    // هنا يتم حساب النتيجة الفعلية
    // للتبسيط، نعرض نتيجة وهمية
    let calculated = 0
    if (formula.expression.includes('overtime_hours')) {
      const rate = testValues.overtime_hours > 10 ? 2.0 : 1.5
      calculated = (testValues.basic_salary / 30 / 8) * testValues.overtime_hours * rate
    } else if (formula.expression.includes('late_minutes')) {
      calculated = (testValues.basic_salary / 30 / 8 / 60) * testValues.late_minutes
    } else if (formula.expression.includes('absent_days')) {
      calculated = (testValues.basic_salary / 30) * testValues.absent_days
    }
    setResult(Math.round(calculated * 100) / 100)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">اختبار المعادلة</h3>
          <p className="text-gray-500 text-sm mt-1">{formula.name}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-gray-900 rounded-xl mb-4">
            <code className="text-green-400 font-mono text-sm">{formula.expression}</code>
          </div>

          <div className="space-y-3">
            {Object.entries(testValues).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-40">
                  {variables.find(v => v.id === key)?.name || key}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={e =>
                    setTestValues(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                  }
                  className="input flex-1"
                />
              </div>
            ))}
          </div>

          {result !== null && (
            <div className="p-4 bg-success-50 rounded-xl">
              <p className="text-sm text-success-600">النتيجة:</p>
              <p className="text-2xl font-bold text-success-700">{result.toLocaleString()} ريال</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={calculateResult} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Play size={18} />
            حساب
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
