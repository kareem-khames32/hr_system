'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { useParams } from 'next/navigation'
import EmployeeForm, {
  EmployeeFormPayload,
  EmployeeFormState,
} from '@/components/EmployeeForm'
import {
  can,
  fetchEmployee,
  fetchEmployeeBalances,
  fetchEmployeeProfile,
  fetchQualifications,
  updateEmployee,
  type ApiQualifications,
} from '@/lib/api'
import { saveQualifications } from '@/lib/save-qualifications'
import { fetchEmployeeSalaryChangeContext, type EmployeeSalaryChangeContext } from '@/lib/employee-salary-change-api'
import { fetchPayrollCalendarContext, type PayrollCalendarContext } from '@/lib/payroll-calendar-api'

// تقسيم الاسم والعنوان ودورة الراتب من مصدر واحد مع حفظ النموذج (employee-form-fields)
import {
  arabicNameNeedsFullField,
  englishNameNeedsFullField,
  salaryCycleValue,
  splitArabicName,
  splitEmployeeAddress,
  splitEnglishName,
  type SavedEmployeeDocument,
} from '@/lib/employee-form-fields'

export default function EditEmployeePage() {
  const params = useParams()
  const employeeId = Number(params.id)

  const [initial, setInitial] = useState<Partial<EmployeeFormState> | null>(null)
  const [loadedEmployeeId, setLoadedEmployeeId] = useState<number | null>(null)
  // المؤهلات المحفوظة — تُعرض في الفورم للحذف، والجديد يُضاف بجانبها
  const [savedQuals, setSavedQuals] = useState<ApiQualifications | null>(null)
  // المستندات المحفوظة — تُعرض بجانب خانات الرفع (الرفع يضيف نسخة جديدة)
  const [savedDocuments, setSavedDocuments] = useState<SavedEmployeeDocument[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [salaryContext, setSalaryContext] = useState<EmployeeSalaryChangeContext | null>(null)
  const [salaryContextError, setSalaryContextError] = useState('')
  const [salaryChangeForbidden, setSalaryChangeForbidden] = useState(false)
  const [calendarContext, setCalendarContext] = useState<PayrollCalendarContext | null>(null)
  const [calendarContextError, setCalendarContextError] = useState('')

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setInitial(null)
    setSalaryContext(null)
    setSalaryContextError('')
    setCalendarContext(null)
    setCalendarContextError('')
    setError('')
    // سياق تعديل الأجر يتطلب «اعتماد المسير» في الباك (SEC-06) — بدونها لا طلب ولا فتح للحقول
    const salaryForbidden = !can('payroll.approve')
    setSalaryChangeForbidden(salaryForbidden)
    if (!employeeId) {
      setError('رقم الموظف غير صالح')
      setLoading(false)
      return
    }
    Promise.all([
      fetchEmployee(employeeId),
      fetchEmployeeBalances(employeeId).catch(() => []),
      fetchQualifications(employeeId).catch(() => null),
      salaryForbidden
        ? Promise.resolve(null)
        : fetchEmployeeSalaryChangeContext(employeeId, controller.signal).catch(cause => {
          if (!cancelled) setSalaryContextError(cause instanceof Error ? cause.message : 'تعذر إثبات الأجر الحالي بدقة.')
          return null
        }),
      fetchPayrollCalendarContext('EMPLOYEE', employeeId, controller.signal).catch(cause => {
        if (!cancelled) setCalendarContextError(cause instanceof Error ? cause.message : 'تعذر تحميل تاريخ فرع الموظف.')
        return null
      }),
      fetchEmployeeProfile(employeeId).then((profile) => profile.documents ?? []).catch(() => null),
    ])
      .then(([emp, bals, quals, salary, calendar, documents]) => {
        if (cancelled) return
        setLoadedEmployeeId(employeeId)
        setSalaryContext(salary)
        setCalendarContext(calendar)
        if (salary) setSalaryContextError('')
        setSavedQuals(quals)
        setSavedDocuments(documents)
        const annual = (bals as any[]).find((b) => b.balanceType === 'annual')
        // الاسم محفوظ نصاً واحداً؛ تقسيم مبهم (عدد كلمات غير معتاد أو «عبد …») يُعرض في خانة الاسم الكامل
        const arWhole = arabicNameNeedsFullField(emp.fullName)
        const enWhole = englishNameNeedsFullField(emp.fullNameEn)
        const ar = splitArabicName(arWhole ? '' : emp.fullName)
        const en = splitEnglishName(enWhole ? '' : emp.fullNameEn)
        const addr = splitEmployeeAddress(emp.address)
        setInitial({
          ...(arWhole ? { nameArFull: emp.fullName ?? '' } : {}),
          ...(enWhole ? { nameEnFull: emp.fullNameEn ?? '' } : {}),
          firstNameAr: ar.first,
          fatherNameAr: ar.father,
          grandNameAr: ar.grand,
          familyNameAr: ar.family,
          firstNameEn: en.first,
          middleNameEn: en.middle,
          lastNameEn: en.last,
          nationalId: emp.nationalId ?? '',
          phone: emp.phone ?? '',
          personalEmail: emp.personalEmail ?? '',
          birthDate: emp.birthDate ? String(emp.birthDate).slice(0, 10) : '',
          gender: emp.gender ?? '',
          maritalStatus: emp.maritalStatus ?? '',
          nationality: emp.nationality ?? '',
          addressCity: addr.city,
          addressDistrict: addr.district,
          emergencyName: emp.emergencyContactName ?? '',
          emergencyPhone: emp.emergencyContactPhone ?? '',
          employeeCode: emp.employeeCode ?? '',
          fingerprintCode: emp.fingerprintCode ?? '',
          joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : '',
          status: emp.status ?? 'probation',
          branchId: calendar ? calendar.current.branchId == null ? '' : String(calendar.current.branchId) : emp.branchId != null ? String(emp.branchId) : '',
          departmentId: emp.departmentId != null ? String(emp.departmentId) : '',
          teamId: emp.teamId != null ? String(emp.teamId) : '',
          managerId: emp.managerEmployeeId != null ? String(emp.managerEmployeeId) : '',
          jobTitle: emp.jobTitle ?? '',
          workEmail: emp.email ?? '',
          basicSalary: salary?.current.basicSalary ?? '',
          housingAllowance: salary?.current.housingAllowance ?? '',
          transportAllowance: salary?.current.transportAllowance ?? '',
          // كل بدل مستقل؛ البيانات التاريخية التي جمعت البدلات تحتاج مراجعة صريحة.
          otherAllowance: salary?.current.otherAllowance ?? '',
          phoneAllowance: salary?.current.phoneAllowance ?? '',
          workNatureAllowance: salary?.current.workNatureAllowance ?? '',
          payMethod: emp.payMethod ?? 'transfer',
          costCenterId: emp.costCenterId != null ? String(emp.costCenterId) : '',
          workScheduleId: emp.workScheduleId,
          flexOverrideMode: emp.flexOverrideMode ?? 'INHERIT',
          annualLeaveEntitled: emp.annualLeaveEntitled ?? true,
          // الرصيد الافتتاحي الحالي — للتعبئة المسبقة (يظهر كام مرحّل حطّه سابقاً)
          openingBalanceDays: annual ? Number(annual.opening?.days ?? 0) : undefined,
          openingBalanceExpiry: annual?.opening?.expiry ?? null,
          bankName: emp.bankName ?? '',
          iban: emp.iban ?? '',
          contractType: emp.contractType ?? '',
          contractStart: emp.contractStart ? String(emp.contractStart).slice(0, 10) : '',
          contractEnd: emp.contractEnd ? String(emp.contractEnd).slice(0, 10) : '',
          contractNumber: emp.contractNumber ?? '',
          contractDurationMonths:
            emp.contractDurationMonths != null ? String(emp.contractDurationMonths) : '',
          noticePeriodDays: emp.noticePeriodDays != null ? String(emp.noticePeriodDays) : '',
          // ===== حقول الملف الكامل — كلٌّ من عموده المستقل =====
          birthPlace: emp.birthPlace ?? '',
          passportNo: emp.passportNo ?? '',
          passportExpiry: emp.passportExpiry ? String(emp.passportExpiry).slice(0, 10) : '',
          phoneAlt: emp.phoneAlt ?? '',
          country: emp.country ?? '',
          postalCode: emp.postalCode ?? '',
          emergencyRelation: emp.emergencyRelation ?? '',
          emergencyPhoneAlt: emp.emergencyPhoneAlt ?? '',
          actualStartDate: emp.actualStartDate ? String(emp.actualStartDate).slice(0, 10) : '',
          workType: emp.workType ?? '',
          probationEndDate: emp.probationEndDate ? String(emp.probationEndDate).slice(0, 10) : '',
          recruitmentSource: emp.recruitmentSource ?? '',
          gradeId: emp.gradeId != null ? String(emp.gradeId) : '',
          workLocation: emp.workLocation ?? '',
          currency: salary?.current.currency ?? '',
          // NULL المحفوظ يظهر «شهري» ويُحفظ monthly — نفس ما يعرضه الملف بعد الحفظ
          salaryCycle: salaryCycleValue(emp.salaryCycle),
          bankBranch: emp.bankBranch ?? '',
          gosiNumber: emp.gosiNumber ?? '',
          isGosiRegistered:
            emp.isGosiRegistered == null ? '' : emp.isGosiRegistered ? 'true' : 'false',
          gosiBaseSalary: emp.gosiBaseSalary != null ? String(Number(emp.gosiBaseSalary)) : '',
          photoFileId: emp.photoFileId,
        })
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الموظف') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [employeeId])

  const handleSubmit = async (payload: EmployeeFormPayload) => {
    if (loadedEmployeeId !== employeeId || loading || submitting) return
    setError('')
    setSubmitting(true)
    try {
      // قوائم المؤهلات تُحفظ بمسارها الخاص (إضافات جديدة على الموظف القائم)
      const { qualifications, ...employeeData } = payload
      await updateEmployee(employeeId, employeeData)
      const warn = await saveQualifications(employeeId, qualifications)
      if (warn) {
        setError(warn)
        setSubmitting(false)
        return
      }
      window.location.href = '/employees'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التغييرات')
      setSubmitting(false)
    }
  }

  if (loading || (initial && loadedEmployeeId !== employeeId)) {
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
      key={employeeId}
      mode="edit"
      initial={initial}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      employeeId={employeeId}
      savedQualifications={savedQuals}
      salaryChangeContext={salaryContext}
      salaryContextError={salaryContextError}
      salaryChangeForbidden={salaryChangeForbidden}
      calendarContext={calendarContext}
      calendarContextError={calendarContextError}
      savedDocuments={savedDocuments}
    />
  )
}
