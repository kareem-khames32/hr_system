'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { useParams } from 'next/navigation'
import EmployeeForm, {
  EmployeeFormPayload,
  EmployeeFormState,
} from '@/components/EmployeeForm'
import { fetchEmployee, updateEmployee } from '@/lib/api'

// تقسيم الاسم العربي إلى أجزائه بحيث تُعيد إعادة التجميع الاسم الأصلي حرفياً
// إعادة التجميع في المكوّن: [الأول، الأب، الجد، العائلة].filter(Boolean).join(' ')
function splitArabicName(full: string) {
  const w = (full ?? '').trim().split(/\s+/).filter(Boolean)
  const n = w.length
  return {
    first: n >= 1 ? w[0] : '',
    father: n >= 3 ? w[1] : '',
    grand: n >= 4 ? w.slice(2, n - 1).join(' ') : '',
    family: n >= 2 ? w[n - 1] : '',
  }
}

// تقسيم الاسم الإنجليزي (الأول/الأوسط/الأخير) بشكل عكوس تماماً
function splitEnglishName(full: string) {
  const w = (full ?? '').trim().split(/\s+/).filter(Boolean)
  const n = w.length
  return {
    first: n >= 1 ? w[0] : '',
    middle: n >= 3 ? w.slice(1, n - 1).join(' ') : '',
    last: n >= 2 ? w[n - 1] : '',
  }
}

// تقسيم العنوان «الحي، المدينة» — إعادة التجميع: [الحي، المدينة].join('، ')
function splitAddress(addr: string) {
  const a = (addr ?? '').trim()
  if (!a) return { district: '', city: '' }
  const i = a.indexOf('،')
  if (i === -1) return { district: a, city: '' }
  return { district: a.slice(0, i).trim(), city: a.slice(i + 1).trim() }
}

export default function EditEmployeePage() {
  const params = useParams()
  const employeeId = Number(params.id)

  const [initial, setInitial] = useState<Partial<EmployeeFormState> | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!employeeId) {
      setError('رقم الموظف غير صالح')
      setLoading(false)
      return
    }
    fetchEmployee(employeeId)
      .then((emp) => {
        const ar = splitArabicName(emp.fullName ?? '')
        const en = splitEnglishName(emp.fullNameEn ?? '')
        const addr = splitAddress(emp.address ?? '')
        setInitial({
          firstNameAr: ar.first,
          fatherNameAr: ar.father,
          grandNameAr: ar.grand,
          familyNameAr: ar.family,
          firstNameEn: en.first,
          middleNameEn: en.middle,
          lastNameEn: en.last,
          nationalId: emp.nationalId ?? '',
          phone: emp.phone ?? '',
          personalEmail: '',
          birthDate: emp.birthDate ? String(emp.birthDate).slice(0, 10) : '',
          gender: emp.gender ?? '',
          maritalStatus: emp.maritalStatus ?? '',
          nationality: emp.nationality ?? '',
          addressCity: addr.city,
          addressDistrict: addr.district,
          emergencyName: emp.emergencyContactName ?? '',
          emergencyPhone: emp.emergencyContactPhone ?? '',
          employeeCode: emp.employeeCode ?? '',
          fingerprintCode: '',
          joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : '',
          status: emp.status ?? 'probation',
          branchId: emp.branchId != null ? String(emp.branchId) : '',
          departmentId: emp.departmentId != null ? String(emp.departmentId) : '',
          teamId: emp.teamId != null ? String(emp.teamId) : '',
          managerId: emp.managerEmployeeId != null ? String(emp.managerEmployeeId) : '',
          jobTitle: emp.jobTitle ?? '',
          workEmail: emp.email ?? '',
          basicSalary: emp.basicSalary != null ? String(Number(emp.basicSalary)) : '',
          housingAllowance:
            emp.housingAllowance != null ? String(Number(emp.housingAllowance)) : '',
          transportAllowance:
            emp.transportAllowance != null ? String(Number(emp.transportAllowance)) : '',
          // بدل الهاتف يبقى فارغاً، وبدل طبيعة العمل يحمل كامل «بدلات أخرى» — يُجمعان عند الحفظ فيعودان كما كانا
          phoneAllowance: '',
          workNatureAllowance:
            emp.otherAllowance != null ? String(Number(emp.otherAllowance)) : '',
          payMethod: emp.payMethod ?? 'transfer',
          costCenterId: emp.costCenterId != null ? String(emp.costCenterId) : '',
          bankName: emp.bankName ?? '',
          iban: emp.iban ?? '',
          contractType: emp.contractType ?? '',
          contractStart: emp.contractStart ? String(emp.contractStart).slice(0, 10) : '',
          contractEnd: emp.contractEnd ? String(emp.contractEnd).slice(0, 10) : '',
          photoFileId: emp.photoFileId,
        })
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الموظف')
      )
      .finally(() => setLoading(false))
  }, [employeeId])

  const handleSubmit = async (payload: EmployeeFormPayload) => {
    setError('')
    setSubmitting(true)
    try {
      await updateEmployee(employeeId, payload)
      window.location.href = '/employees'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التغييرات')
      setSubmitting(false)
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

  if (!initial) {
    return (
      <MainLayout>
        <div className="bg-red-50 text-red-700 rounded-xl p-4">
          {error || 'تعذر تحميل بيانات الموظف'}
        </div>
      </MainLayout>
    )
  }

  return (
    <EmployeeForm
      mode="edit"
      initial={initial}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  )
}
