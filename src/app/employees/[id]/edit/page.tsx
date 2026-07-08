'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Save,
  User,
  Briefcase,
  CreditCard,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  fetchEmployee,
  updateEmployee,
  fetchDepartments,
  fetchEmployees,
  ApiDepartment,
  ApiEmployee,
} from '@/lib/api'

const bankOptions = ['البنك الأهلي', 'بنك الراجحي', 'بنك الرياض', 'البنك السعودي الفرنسي']

// الحقول الشخصية والمالية الجديدة المدعومة في الباك إند (ليست بعد ضمن ApiEmployee)
type EmployeeExtras = {
  birthDate?: string
  gender?: string
  maritalStatus?: string
  nationality?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  housingAllowance?: number
  transportAllowance?: number
  otherAllowance?: number
  contractType?: string | null
  contractStart?: string | null
  contractEnd?: string | null
}

export default function EditEmployeePage() {
  const params = useParams()
  const employeeId = Number(params.id)

  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    birthDate: '',
    gender: 'male',
    maritalStatus: 'single',
    nationality: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Employment Info
    employeeId: '',
    departmentId: '',
    position: '',
    managerId: '',
    joinDate: '',
    contractType: '',
    contractStart: '',
    contractEnd: '',
    workLocation: 'المقر الرئيسي',

    // Financial Info
    bankName: '',
    iban: '',
    basicSalary: '',
    housingAllowance: '',
    transportAllowance: '',
    otherAllowance: '',
  })

  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [managers, setManagers] = useState<ApiEmployee[]>([])
  // نهاية العقد كما وردت من السيرفر — لمعرفة إن كان المستخدم مسحها (=> عقد غير محدد المدة)
  const [initialContractEnd, setInitialContractEnd] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!employeeId) {
      setError('رقم الموظف غير صالح')
      setLoading(false)
      return
    }
    Promise.all([fetchEmployee(employeeId), fetchDepartments(), fetchEmployees()])
      .then(([empData, depts, emps]) => {
        const emp = empData as ApiEmployee & EmployeeExtras
        setDepartments(depts)
        setManagers(emps.filter((e) => e.id !== emp.id))
        const parts = (emp.fullName ?? '').trim().split(/\s+/)
        setFormData((prev) => ({
          ...prev,
          firstName: parts[0] ?? '',
          lastName: parts.slice(1).join(' '),
          email: emp.email ?? '',
          phone: emp.phone ?? '',
          nationalId: emp.nationalId ?? '',
          birthDate: emp.birthDate ? String(emp.birthDate).slice(0, 10) : '',
          gender: emp.gender ?? 'male',
          maritalStatus: emp.maritalStatus ?? 'single',
          nationality: emp.nationality ?? '',
          address: emp.address ?? '',
          emergencyContactName: emp.emergencyContactName ?? '',
          emergencyContactPhone: emp.emergencyContactPhone ?? '',
          employeeId: emp.employeeCode,
          departmentId: emp.departmentId != null ? String(emp.departmentId) : '',
          position: emp.jobTitle ?? '',
          managerId: emp.managerEmployeeId != null ? String(emp.managerEmployeeId) : '',
          joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : '',
          contractType: emp.contractType ?? '',
          contractStart: emp.contractStart ? String(emp.contractStart).slice(0, 10) : '',
          contractEnd: emp.contractEnd ? String(emp.contractEnd).slice(0, 10) : '',
          bankName: emp.bankName ?? '',
          iban: emp.iban ?? '',
          basicSalary: emp.basicSalary != null ? String(Number(emp.basicSalary)) : '',
          housingAllowance: emp.housingAllowance != null ? String(Number(emp.housingAllowance)) : '',
          transportAllowance: emp.transportAllowance != null ? String(Number(emp.transportAllowance)) : '',
          otherAllowance: emp.otherAllowance != null ? String(Number(emp.otherAllowance)) : '',
        }))
        setInitialContractEnd(emp.contractEnd ? String(emp.contractEnd).slice(0, 10) : '')
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الموظف')
      )
      .finally(() => setLoading(false))
  }, [employeeId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const changes: Partial<ApiEmployee> & EmployeeExtras = {}
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      if (fullName) changes.fullName = fullName
      if (formData.email.trim()) changes.email = formData.email.trim()
      if (formData.phone.trim()) changes.phone = formData.phone.trim()
      if (formData.nationalId.trim()) changes.nationalId = formData.nationalId.trim()
      if (formData.birthDate) changes.birthDate = formData.birthDate
      if (formData.gender) changes.gender = formData.gender
      if (formData.maritalStatus) changes.maritalStatus = formData.maritalStatus
      if (formData.nationality.trim()) changes.nationality = formData.nationality.trim()
      if (formData.address.trim()) changes.address = formData.address.trim()
      if (formData.emergencyContactName.trim())
        changes.emergencyContactName = formData.emergencyContactName.trim()
      if (formData.emergencyContactPhone.trim())
        changes.emergencyContactPhone = formData.emergencyContactPhone.trim()
      if (formData.position.trim()) changes.jobTitle = formData.position.trim()
      if (formData.departmentId) changes.departmentId = Number(formData.departmentId)
      if (formData.managerId) changes.managerEmployeeId = Number(formData.managerId)
      if (formData.joinDate) changes.joinDate = formData.joinDate
      // بيانات العقد — ومسح نهاية العقد يعني تحويله لغير محدد المدة
      if (formData.contractType) changes.contractType = formData.contractType
      if (formData.contractStart) changes.contractStart = formData.contractStart
      if (formData.contractEnd) changes.contractEnd = formData.contractEnd
      else if (initialContractEnd) changes.contractEnd = null
      if (formData.bankName) changes.bankName = formData.bankName
      const iban = formData.iban.replace(/\s+/g, '').toUpperCase()
      if (iban) changes.iban = iban
      if (formData.basicSalary !== '') changes.basicSalary = Number(formData.basicSalary)
      if (formData.housingAllowance !== '') changes.housingAllowance = Number(formData.housingAllowance)
      if (formData.transportAllowance !== '') changes.transportAllowance = Number(formData.transportAllowance)
      if (formData.otherAllowance !== '') changes.otherAllowance = Number(formData.otherAllowance)

      await updateEmployee(employeeId, changes)
      window.location.href = '/employees'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التغييرات')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/employees/${employeeId}`} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
              <ArrowRight size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تعديل بيانات الموظف</h1>
              <p className="text-gray-500 mt-1">تحديث معلومات {formData.firstName} {formData.lastName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/employees/${employeeId}`} className="btn-secondary">
              إلغاء
            </Link>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save size={18} />
              حفظ التغييرات
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Profile Photo */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">الصورة الشخصية</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {formData.firstName.trim().charAt(0) || 'م'}
            </div>
            <div>
              <button type="button" className="btn-secondary flex items-center gap-2 mb-2">
                <Upload size={18} />
                تغيير الصورة
              </button>
              <p className="text-sm text-gray-500">JPG أو PNG. الحد الأقصى 2MB</p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-primary-600" />
            المعلومات الشخصية
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الأول</label>
              <input
                type="text"
                className="input w-full"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم العائلة</label>
              <input
                type="text"
                className="input w-full"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهوية</label>
              <input
                type="text"
                className="input w-full"
                value={formData.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                className="input w-full"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
              <input
                type="tel"
                className="input w-full"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الميلاد</label>
              <input
                type="date"
                className="input w-full"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الجنس</label>
              <select
                className="input w-full"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة الاجتماعية</label>
              <select
                className="input w-full"
                value={formData.maritalStatus}
                onChange={(e) => handleChange('maritalStatus', e.target.value)}
              >
                <option value="single">أعزب</option>
                <option value="married">متزوج</option>
                <option value="divorced">مطلق</option>
                <option value="widowed">أرمل</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الجنسية</label>
              <input
                type="text"
                className="input w-full"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
              <input
                type="text"
                className="input w-full"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">جهة اتصال للطوارئ (الاسم)</label>
              <input
                type="text"
                className="input w-full"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">جهة اتصال للطوارئ (الجوال)</label>
              <input
                type="tel"
                className="input w-full"
                dir="ltr"
                value={formData.emergencyContactPhone}
                onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-primary-600" />
            معلومات التوظيف
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الرقم الوظيفي</label>
              <input
                type="text"
                className="input w-full bg-gray-50"
                value={formData.employeeId}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
              <select
                className="input w-full"
                value={formData.departmentId}
                onChange={(e) => handleChange('departmentId', e.target.value)}
              >
                <option value="">بدون قسم</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المسمى الوظيفي</label>
              <input
                type="text"
                className="input w-full"
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المدير المباشر</label>
              <select
                className="input w-full"
                value={formData.managerId}
                onChange={(e) => handleChange('managerId', e.target.value)}
              >
                <option value="">بدون مدير مباشر</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.fullName}{mgr.jobTitle ? ` - ${mgr.jobTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الالتحاق</label>
              <input
                type="date"
                className="input w-full"
                value={formData.joinDate}
                onChange={(e) => handleChange('joinDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع العقد</label>
              <select
                className="input w-full"
                value={formData.contractType}
                onChange={(e) => handleChange('contractType', e.target.value)}
              >
                <option value="">اختر</option>
                <option value="permanent">دائم</option>
                <option value="fixed_term">محدد المدة</option>
                <option value="part_time">دوام جزئي</option>
                <option value="seasonal">موسمي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ بداية العقد</label>
              <input
                type="date"
                className="input w-full"
                value={formData.contractStart}
                onChange={(e) => handleChange('contractStart', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ نهاية العقد</label>
              <input
                type="date"
                className="input w-full"
                value={formData.contractEnd}
                onChange={(e) => handleChange('contractEnd', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لعقد غير محدد المدة</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">موقع العمل</label>
              <select
                className="input w-full"
                value={formData.workLocation}
                onChange={(e) => handleChange('workLocation', e.target.value)}
              >
                <option value="المقر الرئيسي">المقر الرئيسي</option>
                <option value="فرع جدة">فرع جدة</option>
                <option value="فرع الدمام">فرع الدمام</option>
                <option value="عن بُعد">عن بُعد</option>
              </select>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-primary-600" />
            المعلومات المالية
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم البنك</label>
              <select
                className="input w-full"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
              >
                <option value="">اختر</option>
                {formData.bankName && !bankOptions.includes(formData.bankName) && (
                  <option value={formData.bankName}>{formData.bankName}</option>
                )}
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الآيبان</label>
              <input
                type="text"
                className="input w-full"
                value={formData.iban}
                onChange={(e) => handleChange('iban', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الراتب الأساسي</label>
              <div className="relative">
                <input
                  type="number"
                  className="input w-full pl-12"
                  value={formData.basicSalary}
                  onChange={(e) => handleChange('basicSalary', e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ر.س</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">بدل السكن</label>
              <div className="relative">
                <input
                  type="number"
                  className="input w-full pl-12"
                  value={formData.housingAllowance}
                  onChange={(e) => handleChange('housingAllowance', e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ر.س</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">بدل المواصلات</label>
              <div className="relative">
                <input
                  type="number"
                  className="input w-full pl-12"
                  value={formData.transportAllowance}
                  onChange={(e) => handleChange('transportAllowance', e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ر.س</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">بدلات أخرى</label>
              <div className="relative">
                <input
                  type="number"
                  className="input w-full pl-12"
                  value={formData.otherAllowance}
                  onChange={(e) => handleChange('otherAllowance', e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ر.س</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </MainLayout>
  )
}
