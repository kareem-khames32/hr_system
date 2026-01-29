'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
  CreditCard,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EditEmployeePage() {
  const params = useParams()
  const employeeId = params.id

  const [formData, setFormData] = useState({
    // Personal Info
    firstName: 'أحمد',
    lastName: 'محمد علي',
    email: 'ahmed.m@company.com',
    phone: '+966 55 123 4567',
    nationalId: '1234567890',
    birthDate: '1990-05-15',
    gender: 'male',
    maritalStatus: 'married',
    nationality: 'سعودي',
    address: 'الرياض، حي النرجس',

    // Employment Info
    employeeId: 'EMP001',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات أول',
    manager: 'سالم العتيبي',
    joinDate: '2022-03-01',
    contractType: 'permanent',
    workLocation: 'المقر الرئيسي',

    // Financial Info
    bankName: 'البنك الأهلي',
    iban: 'SA1234567890123456789012',
    basicSalary: '15000',
    housingAllowance: '3000',
    transportAllowance: '1500',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Saving:', formData)
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
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save size={18} />
              حفظ التغييرات
            </button>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">الصورة الشخصية</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              أ
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
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="تقنية المعلومات">تقنية المعلومات</option>
                <option value="الموارد البشرية">الموارد البشرية</option>
                <option value="المبيعات">المبيعات</option>
                <option value="المالية">المالية</option>
                <option value="التسويق">التسويق</option>
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
                value={formData.manager}
                onChange={(e) => handleChange('manager', e.target.value)}
              >
                <option value="سالم العتيبي">سالم العتيبي</option>
                <option value="محمد سالم">محمد سالم</option>
                <option value="خالد محمد">خالد محمد</option>
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
                <option value="permanent">دائم</option>
                <option value="contract">عقد محدد المدة</option>
                <option value="probation">فترة تجربة</option>
              </select>
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
                <option value="البنك الأهلي">البنك الأهلي</option>
                <option value="بنك الراجحي">بنك الراجحي</option>
                <option value="بنك الرياض">بنك الرياض</option>
                <option value="البنك السعودي الفرنسي">البنك السعودي الفرنسي</option>
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
          </div>
        </div>
      </form>
    </MainLayout>
  )
}
