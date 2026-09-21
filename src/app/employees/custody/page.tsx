'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Package,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  X,
  Wallet,
  ArrowRightLeft,
} from 'lucide-react'
import {
  fetchCustody,
  fetchAssets,
  fetchEmployees,
  fetchEmployeeDirectory,
  fetchBranches,
  createAsset,
  updateAsset,
  assignCustody,
  returnCustody,
  writeOffCustody,
  transferCustody,
  managerConfirmCustody,
  setAssetsBranch,
  getCurrentUser,
  isCompanyWideUser,
  can,
  ApiAsset,
  ApiEmployee,
  ApiBranch,
} from '@/lib/api'
import { custodyStatusLabels as statusLabels, custodyStatusStyles as statusStyles } from '@/lib/status-labels'
import { useCurrency } from '@/lib/currency'
import { CUSTODY_TEXT_MAX, custodyTextIssue } from '@/lib/input-limits'

// حالات العهدة — التسميات الموحّدة في كل النظام


// الحالات المفتوحة — يجوز شطبها فقداً أو تلفاً
const OPEN_STATUSES = [
  'PENDING_ACK',
  'PENDING_MANAGER_CONFIRM',
  'ACTIVE',
  'RETURN_REQUESTED',
]

interface CustodyRow {
  id: number
  employeeId: number
  employeeName: string
  employeeCode: string
  branchId: number | null
  branchName: string
  assetId: number
  assetName: string
  assetCategory: string
  serialNumber: string
  assignedAt: string
  acknowledgedAt: string
  returnedAt: string
  condition: string
  status: string
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '')

export default function CustodyPage() {
  const currency = useCurrency()
  const [records, setRecords] = useState<CustodyRow[]>([])
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ employeeId: '', assetId: '' })
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: '',
    serialNumber: '',
    // قيمة الأصل (اختيارية) — تغذي خصم الفقد/التلف في التصفية
    value: '',
    // فرع الأصل — حساب نطاقه كل الفروع يختاره؛ حساب الفرع أصله بيتختم بفرعه في الخادم
    branchId: '',
  })
  // حساب على مستوى الشركة (مدير النظام أو «نطاقه: كل الفروع») — الخادم هو اللي بيفرض؛ هنا لإظهار الأدوات بس
  const [companyWide, setCompanyWide] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, assetRows, emps, brs] = await Promise.all([
        fetchCustody(),
        fetchAssets(),
        // «مسؤول الأصول» بلا «عرض الموظفين» (مايفتحش ملفات الموظفين): منتقي الموظف من الدليل المختصر —
        // النشطين في نطاقه بالاسم والكود بس. من غيره الشاشة كلها كانت بتقع بـ403 على قائمة الموظفين.
        can('employees.view')
          ? fetchEmployees()
          : fetchEmployeeDirectory().then((list) =>
              list.map((entry) => ({ ...entry, isActive: true, status: 'active' }) as ApiEmployee)
            ),
        fetchBranches(),
      ])
      const empById = new Map(emps.map((e) => [e.id, e]))
      const branchById = new Map(brs.map((b) => [b.id, b.name]))
      setAssets(assetRows)
      setEmployees(emps)
      setBranches(brs)
      setRecords(
        rows.map((r) => {
          const emp = empById.get(r.employeeId)
          return {
            id: r.id,
            employeeId: r.employeeId,
            employeeName: r.employeeName ?? emp?.fullName ?? `#${r.employeeId}`,
            employeeCode: r.employeeCode ?? emp?.employeeCode ?? '',
            branchId: emp?.branchId ?? null,
            branchName: emp ? branchById.get(emp.branchId) ?? '—' : '—',
            assetId: r.assetId,
            assetName: r.assetName ?? `#${r.assetId}`,
            assetCategory: r.assetCategory ?? '',
            serialNumber: r.serialNumber ?? '—',
            assignedAt: fmtDate(r.assignedAt),
            acknowledgedAt: fmtDate(r.acknowledgedAt),
            returnedAt: fmtDate(r.returnedAt),
            condition: r.condition ?? '',
            status: r.status,
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل العهد')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCompanyWide(isCompanyWideUser(getCurrentUser()))
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = records.filter(
    (r) =>
      (r.employeeName.includes(searchQuery) ||
        r.assetName.includes(searchQuery) ||
        r.serialNumber.includes(searchQuery)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterBranch || String(r.branchId) === filterBranch)
  )

  const stats = {
    active: records.filter((r) => r.status === 'ACTIVE').length,
    pending: records.filter((r) =>
      ['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'RETURN_REQUESTED'].includes(r.status)
    ).length,
    lostDamaged: records.filter(
      (r) => r.status === 'LOST' || r.status === 'DAMAGED'
    ).length,
    returned: records.filter((r) => r.status === 'RETURNED').length,
  }

  // الأصول المتاحة للتسليم فقط: AVAILABLE (لا المتقاعدة/المُكهّنة ولا المُسنَدة)
  // وبلا إسناد مفتوح — PENDING_ACK يُبقي الأصل AVAILABLE لحين تأكيد الموظف
  const reservedAssetIds = new Set(
    records.filter((r) => OPEN_STATUSES.includes(r.status)).map((r) => r.assetId)
  )
  // العهدة جوه الفرع الواحد: الأصل القديم اللي بلا فرع (readOnly لحساب الفرع) مايتسلّمش منه، ومع اختيار الموظف
  // بيتعرض أصل فرعه بس (أو أصل بلا فرع — حساب كل الفروع بيسلّمه فيتختم بفرع الموظف)
  const chosenEmployee = employees.find((emp) => String(emp.id) === formData.employeeId)
  const freeAssets = assets.filter(
    (a) =>
      a.status === 'AVAILABLE' && !a.currentHolderId && !reservedAssetIds.has(a.id) && !a.readOnly &&
      (!chosenEmployee || a.branchId == null || a.branchId === chosenEmployee.branchId)
  )
  const branchNameOf = (id?: number | null) => (id == null ? 'بلا فرع' : branches.find((b) => b.id === id)?.name ?? `#${id}`)

  // الأصول القديمة اللي لسه بلا فرع — حساب نطاقه كل الفروع يحدد فرعها (واحد أو دفعة)؛ حساب الفرع يشوفها قراءة بس
  const unbranchedAssets = assets.filter((a) => a.branchId == null)
  const [selectedUnbranched, setSelectedUnbranched] = useState<number[]>([])
  const [targetBranch, setTargetBranch] = useState('')
  const [settingBranch, setSettingBranch] = useState(false)
  const [branchNotice, setBranchNotice] = useState<string | null>(null)
  const toggleUnbranched = (id: number) =>
    setSelectedUnbranched((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const handleSetBranch = async () => {
    if (!selectedUnbranched.length || !targetBranch) return
    setSettingBranch(true)
    setError('')
    try {
      const res = await setAssetsBranch(selectedUnbranched, Number(targetBranch))
      const nameOf = (id: number) => assets.find((a) => a.id === id)?.name ?? `#${id}`
      setBranchNotice(
        `اتحدد فرع ${res.updated.length} أصل على «${branchNameOf(res.branchId)}»` +
          (res.skipped.length ? ` — اتخطّى ${res.skipped.length}: ${res.skipped.map((row) => `${nameOf(row.id)} (${row.reason})`).join('، ')}` : '')
      )
      setSelectedUnbranched([])
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديد فرع الأصول')
    } finally {
      setSettingBranch(false)
    }
  }

  // قيمة الأصل اختيارية — لو أُدخلت لازم رقم غير سالب
  const invalidValue = (v: string) => v.trim() !== '' && !(Number(v) >= 0)
  const newAssetValueInvalid = invalidValue(newAsset.value)

  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.category || newAssetValueInvalid) return
    setSaving(true)
    setError('')
    try {
      const created = await createAsset({
        name: newAsset.name,
        category: newAsset.category,
        serialNumber: newAsset.serialNumber || undefined,
        value: newAsset.value.trim() !== '' ? Number(newAsset.value) : undefined,
        // حساب الفرع: الخادم بيختم الأصل بفرعه؛ حساب كل الفروع يختار (أو يسيبه بلا فرع)
        branchId: companyWide && newAsset.branchId ? Number(newAsset.branchId) : undefined,
      })
      setAssets([...assets, created])
      setFormData({ ...formData, assetId: String(created.id) })
      setNewAsset({ name: '', category: '', serialNumber: '', value: '', branchId: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الأصل')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!formData.employeeId || !formData.assetId) return
    setSaving(true)
    setError('')
    try {
      await assignCustody(Number(formData.assetId), Number(formData.employeeId))
      setFormData({ employeeId: '', assetId: '' })
      setShowModal(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسليم العهدة')
    } finally {
      setSaving(false)
    }
  }

  // اعتماد المدير للعهدة بعد إقرار الموظف — يفعّلها نهائياً
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const handleManagerConfirm = async (id: number) => {
    setConfirmingId(id)
    setError('')
    try {
      await managerConfirmCustody(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر اعتماد العهدة')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleReturn = async (id: number) => {
    const condition = window.prompt(`حالة العهدة عند الإرجاع؟ (حتى ${CUSTODY_TEXT_MAX} حرف)`, 'سليمة')
    if (condition === null) return
    // الحالة تُحفظ في عمود بحد 100 حرف — الأطول يُرفض هنا برسالة عربية قبل الإرسال
    const conditionIssue = custodyTextIssue('حالة العهدة عند الإرجاع', condition)
    if (conditionIssue) {
      setError(conditionIssue)
      return
    }
    setError('')
    try {
      await returnCustody(id, condition.trim() || undefined)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرجاع العهدة')
    }
  }

  // شطب العهدة (فقد/تلف) — يقفل السجل ويرجّع قيمة الأصل كتلميح خصم للتصفية
  const [writeOffTarget, setWriteOffTarget] = useState<CustodyRow | null>(null)
  // value: قيمة تُسجَّل للأصل قبل الشطب لو كان بلا قيمة — حتى يُحتسب خصمه في التصفية
  const [writeOffForm, setWriteOffForm] = useState({ lost: true, condition: '', value: '' })
  const [writingOff, setWritingOff] = useState(false)
  const [writeOffNotice, setWriteOffNotice] = useState<string | null>(null)

  // أصل العهدة المشطوبة — بلا قيمة (فارغة/صفر) يعني خصم صفر في التصفية
  const writeOffAsset = writeOffTarget
    ? assets.find((a) => a.id === writeOffTarget.assetId)
    : undefined
  const writeOffHasValue = Number(writeOffAsset?.value ?? 0) > 0
  const writeOffValueInvalid = invalidValue(writeOffForm.value)

  const openWriteOff = (r: CustodyRow) => {
    setWriteOffForm({ lost: true, condition: '', value: '' })
    setWriteOffTarget(r)
  }

  const handleWriteOff = async () => {
    if (!writeOffTarget || writeOffValueInvalid) return
    setWritingOff(true)
    setError('')
    try {
      const value = Number(writeOffForm.value)
      if (!writeOffHasValue && writeOffForm.value.trim() !== '' && value > 0) {
        await updateAsset(writeOffTarget.assetId, { value })
      }
      const res = await writeOffCustody(writeOffTarget.id, {
        lost: writeOffForm.lost,
        condition: writeOffForm.condition.trim() || undefined,
      })
      if (Number(res.assetValue ?? 0) > 0) {
        setWriteOffNotice(
          `قيمة الأصل ${Number(res.assetValue).toLocaleString('en-US')} ${currency} — تُحتسب تلقائياً في خصومات تصفية إنهاء الخدمة وفق سياسة الخادم`
        )
      } else {
        setWriteOffNotice(
          'الأصل بلا قيمة مسجلة — لن يُحتسب له خصم تلقائي. راجع قيمة الأصل من إعدادات الأصول قبل معاينة التصفية'
        )
      }
      setWriteOffTarget(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر شطب العهدة')
    } finally {
      setWritingOff(false)
    }
  }

  // نقل العهدة لموظف آخر — تُقفل الحالية وتُفتح جديدة للمستلم بانتظار قبوله ثم اعتماد مديره
  const [transferTarget, setTransferTarget] = useState<CustodyRow | null>(null)
  const [transferForm, setTransferForm] = useState({ toEmployeeId: '', note: '' })
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferNotice, setTransferNotice] = useState<string | null>(null)

  const openTransfer = (r: CustodyRow) => {
    setTransferForm({ toEmployeeId: '', note: '' })
    setTransferError('')
    setTransferTarget(r)
  }

  const handleTransfer = async () => {
    if (!transferTarget || !transferForm.toEmployeeId) return
    setTransferring(true)
    setTransferError('')
    try {
      await transferCustody(
        transferTarget.id,
        Number(transferForm.toEmployeeId),
        transferForm.note.trim() || undefined
      )
      setTransferTarget(null)
      setTransferNotice('تم بدء النقل — بانتظار قبول الموظف المستلم')
      await loadData()
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'تعذر نقل العهدة')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            إدارة الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">سجل العهد</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل العهد</h1>
            <p className="text-gray-500 mt-1">
              تسليم وإخلاء عهد الموظفين — التفعيل بعد إقرار الموظف بالاستلام
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            تسليم عهدة
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* تلميح خصم التصفية بعد الشطب */}
        {writeOffNotice && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <p className="text-sm font-medium">{writeOffNotice}</p>
            </div>
            <button
              onClick={() => setWriteOffNotice(null)}
              className="p-1.5 hover:bg-amber-100 rounded-lg"
            >
              <X size={16} className="text-amber-500" />
            </button>
          </div>
        )}

        {/* تنبيه بدء النقل الناجح */}
        {transferNotice && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ArrowRightLeft size={20} className="text-indigo-500 shrink-0" />
              <p className="text-sm font-medium">{transferNotice}</p>
            </div>
            <button
              onClick={() => setTransferNotice(null)}
              className="p-1.5 hover:bg-indigo-100 rounded-lg"
            >
              <X size={16} className="text-indigo-500" />
            </button>
          </div>
        )}

        {/* أصول بلا فرع — تحديد الفرع (واحد أو دفعة) لحساب نطاقه كل الفروع؛ حساب الفرع يشوفها قراءة بس */}
        {branchNotice && (
          <div className="bg-success-50 border border-success-200 text-success-800 rounded-xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{branchNotice}</p>
            <button onClick={() => setBranchNotice(null)} className="p-1.5 hover:bg-success-100 rounded-lg">
              <X size={16} className="text-success-600" />
            </button>
          </div>
        )}
        {!loading && unbranchedAssets.length > 0 && !companyWide && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
            فيه {unbranchedAssets.length} أصل قديم لسه بلا فرع — بيظهروا لك للقراءة بس ومايتسلّموش من حساب الفرع. حساب نطاقه كل
            الفروع هو اللي يحدد فرعهم.
          </div>
        )}
        {!loading && unbranchedAssets.length > 0 && companyWide && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-bold text-gray-800">أصول بلا فرع ({unbranchedAssets.length})</h2>
                <p className="text-xs text-gray-500 mt-1">
                  أصول قديمة لسه مالهاش فرع: حساب الفرع يشوفها قراءة بس. اختار أصل أو أكتر وحدد فرعهم. الأصل اللي في عهدة
                  موظف بياخد فرع صاحب العهدة بس.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className="input w-48">
                  <option value="">— اختر الفرع —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleSetBranch}
                  disabled={settingBranch || !targetBranch || selectedUnbranched.length === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  {settingBranch ? 'جارٍ الحفظ...' : `حدد الفرع (${selectedUnbranched.length})`}
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-right sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-10">
                      <input
                        type="checkbox"
                        aria-label="اختيار كل الأصول اللي بلا فرع"
                        checked={selectedUnbranched.length === unbranchedAssets.length}
                        onChange={(e) => setSelectedUnbranched(e.target.checked ? unbranchedAssets.map((a) => a.id) : [])}
                      />
                    </th>
                    <th className="py-2 px-3 font-medium text-gray-500">الأصل</th>
                    <th className="py-2 px-3 font-medium text-gray-500">الفئة</th>
                    <th className="py-2 px-3 font-medium text-gray-500">الرقم التسلسلي</th>
                    <th className="py-2 px-3 font-medium text-gray-500">الحامل الحالي</th>
                  </tr>
                </thead>
                <tbody>
                  {unbranchedAssets.map((a) => (
                    <tr key={a.id} className="border-t border-gray-50">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          aria-label={`اختيار ${a.name}`}
                          checked={selectedUnbranched.includes(a.id)}
                          onChange={() => toggleUnbranched(a.id)}
                        />
                      </td>
                      <td className="py-2 px-3 text-gray-800">{a.name}</td>
                      <td className="py-2 px-3 text-gray-600">{a.category}</td>
                      <td className="py-2 px-3 font-mono text-gray-600" dir="ltr">{a.serialNumber ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{a.holderName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد نشطة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار إجراء</p>
              <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مفقودة/تالفة</p>
              <p className="text-2xl font-bold text-red-600">{stats.lostDamaged}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد مُرجعة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.returned}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث بالموظف أو العهدة أو الرقم التسلسلي..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Records Table */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-right">
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الموظف</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الفرع</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">العهدة</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الرقم التسلسلي</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">تاريخ التسليم</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800 text-sm">{r.employeeName}</p>
                    <p className="text-xs text-gray-400" dir="ltr">{r.employeeCode}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {r.branchName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {r.assetName}
                    {r.assetCategory && (
                      <p className="text-xs text-gray-400">{r.assetCategory}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600" dir="ltr">
                    {r.serialNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600" dir="ltr">
                    {r.assignedAt}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-xs ${statusStyles[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[r.status] ?? r.status}
                    </span>
                    {r.acknowledgedAt && (
                      <p className="text-[10px] text-indigo-500 mt-0.5">
                        أقرّ بالاستلام: {r.acknowledgedAt}
                      </p>
                    )}
                    {r.returnedAt && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                        أُرجعت: {r.returnedAt}
                        {r.condition && ` — الحالة: ${r.condition}`}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING_MANAGER_CONFIRM' && can('custody.assign') && (
                        <button
                          onClick={() => handleManagerConfirm(r.id)}
                          disabled={confirmingId === r.id}
                          className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          {confirmingId === r.id ? 'جارٍ الاعتماد...' : 'اعتماد المدير'}
                        </button>
                      )}
                      {r.status === 'RETURN_REQUESTED' ? (
                        <button
                          onClick={() => handleReturn(r.id)}
                          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 size={12} />
                          سلّمها الموظف — أكّد الاستلام
                        </button>
                      ) : (
                        ['PENDING_ACK', 'ACTIVE'].includes(r.status) && (
                          <button
                            onClick={() => handleReturn(r.id)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            إرجاع
                          </button>
                        )
                      )}
                      {r.status === 'ACTIVE' && can('custody.assign') && (
                        <button
                          onClick={() => openTransfer(r)}
                          className="text-xs px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
                        >
                          <ArrowRightLeft size={12} />
                          نقل لموظف آخر
                        </button>
                      )}
                      {OPEN_STATUSES.includes(r.status) && can('custody.assign') && (
                        <button
                          onClick={() => openWriteOff(r)}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 flex items-center gap-1"
                        >
                          <AlertTriangle size={12} />
                          شطب (فقد/تلف)
                        </button>
                      )}
                      {r.status === 'RETURNED' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          مكتملة
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد سجلات عهد مطابقة</p>
            </div>
          )}
        </div>
        )}

        {/* Assign Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تسليم عهدة لموظف</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    تُفعَّل العهدة بعد إقرار الموظف بالاستلام
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموظف *
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">— اختر الموظف —</option>
                    {employees
                      .filter((emp) => emp.status !== 'archived')
                      .map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.fullName} — {emp.jobTitle ?? emp.employeeCode}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الأصل *
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) =>
                      setFormData({ ...formData, assetId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">— اختر أصلاً متاحاً —</option>
                    {freeAssets.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.category})
                        {a.serialNumber ? ` — ${a.serialNumber}` : ''}
                        {companyWide ? ` — ${a.branchName ?? branchNameOf(a.branchId)}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    تظهر الأصول المتاحة فقط — لا المسلَّمة ولا المتقاعدة ولا المحجوزة بإسناد مفتوح. العهدة جوه الفرع
                    الواحد: بعد اختيار الموظف بتظهر أصول فرعه بس.
                  </p>
                </div>

                {/* إنشاء أصل جديد */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    أو أضف أصلاً جديداً للسجل
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم الأصل
                      </label>
                      <input
                        type="text"
                        value={newAsset.name}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, name: e.target.value })
                        }
                        className="input w-full"
                        placeholder="لابتوب Dell Latitude"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفئة
                      </label>
                      <input
                        type="text"
                        value={newAsset.category}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, category: e.target.value })
                        }
                        className="input w-full"
                        placeholder="لابتوب"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الرقم التسلسلي
                    </label>
                    <input
                      type="text"
                      value={newAsset.serialNumber}
                      onChange={(e) =>
                        setNewAsset({
                          ...newAsset,
                          serialNumber: e.target.value.toUpperCase(),
                        })
                      }
                      className="input w-full font-mono"
                      dir="ltr"
                      placeholder="LP-2026-012"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      قيمة الأصل ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newAsset.value}
                      onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })}
                      className="input w-full"
                      dir="ltr"
                      placeholder="4500"
                    />
                    <p
                      className={`text-xs mt-1 ${
                        newAssetValueInvalid ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {newAssetValueInvalid
                        ? 'القيمة رقم غير سالب'
                        : 'اختيارية — تُخصم من تصفية إنهاء الخدمة عند الفقد/التلف، وبدونها لا يُحتسب خصم'}
                    </p>
                  </div>
                  {/* فرع الأصل: حساب الفرع أصله بيتسجل على فرعه تلقائي؛ حساب كل الفروع يختار */}
                  {companyWide ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">فرع الأصل</label>
                      <select
                        value={newAsset.branchId}
                        onChange={(e) => setNewAsset({ ...newAsset, branchId: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">— بلا فرع (يتحدد بعدين) —</option>
                        {branches.map((b) => (
                          <option key={b.id} value={String(b.id)}>{b.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        الأصل بيتسلّم لموظفي فرعه بس. الأصل اللي بلا فرع بيتختم بفرع أول موظف تسلّمه له.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">الأصل الجديد بيتسجل على فرعك.</p>
                  )}
                  <button
                    onClick={handleCreateAsset}
                    className="btn-secondary"
                    disabled={
                      saving || !newAsset.name || !newAsset.category || newAssetValueInvalid
                    }
                  >
                    إضافة الأصل
                  </button>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleAssign}
                  className="btn-primary"
                  disabled={saving || !formData.employeeId || !formData.assetId}
                >
                  تسليم العهدة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Write-off Modal — شطب فقد/تلف */}
        {writeOffTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">شطب العهدة (فقد/تلف)</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {writeOffTarget.assetName} — {writeOffTarget.employeeName}
                  </p>
                </div>
                <button
                  onClick={() => setWriteOffTarget(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الشطب *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWriteOffForm({ ...writeOffForm, lost: true })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        writeOffForm.lost
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      مفقودة
                    </button>
                    <button
                      type="button"
                      onClick={() => setWriteOffForm({ ...writeOffForm, lost: false })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                        !writeOffForm.lost
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      تالفة
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف الحالة (اختياري)
                  </label>
                  <textarea
                    value={writeOffForm.condition}
                    onChange={(e) =>
                      setWriteOffForm({ ...writeOffForm, condition: e.target.value })
                    }
                    className="input w-full min-h-[80px]"
                    placeholder="مثال: كسر في الشاشة بعد سقوط الجهاز"
                    maxLength={CUSTODY_TEXT_MAX}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {writeOffForm.condition.length}/{CUSTODY_TEXT_MAX} حرف
                  </p>
                </div>
                {/* تحذير الأصل بلا قيمة — خصمه في التصفية صفر ما لم تُسجَّل قيمته */}
                {writeOffHasValue ? (
                  <p className="text-sm text-gray-600">
                    قيمة الأصل المسجلة:{' '}
                    <span className="font-medium">
                      {Number(writeOffAsset?.value).toLocaleString('en-US')} {currency}
                    </span>
                  </p>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      الأصل بلا قيمة مسجلة — لن يُحتسب له خصم في تصفية إنهاء الخدمة. أدخل
                      قيمته ليُخصم، أو اتركها فارغة للشطب بلا خصم
                    </p>
                    <label className="block text-xs font-medium text-amber-700">
                      قيمة الأصل ({currency}) — اختياري
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={writeOffForm.value}
                      onChange={(e) =>
                        setWriteOffForm({ ...writeOffForm, value: e.target.value })
                      }
                      className="input w-full"
                      dir="ltr"
                      placeholder="4500"
                    />
                    {writeOffValueInvalid && (
                      <p className="text-xs text-red-600">القيمة رقم غير سالب</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  الشطب يقفل سجل العهدة نهائياً — إن كانت للأصل قيمة مسجلة تُحتسب تلقائياً
                  في خصومات تصفية إنهاء الخدمة وفق سياسة الخادم
                </p>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setWriteOffTarget(null)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleWriteOff}
                  disabled={writingOff || writeOffValueInvalid}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {writingOff
                    ? 'جارٍ الشطب...'
                    : writeOffForm.lost
                      ? 'شطب — مفقودة'
                      : 'شطب — تالفة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal — نقل العهدة لموظف آخر */}
        {transferTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">نقل العهدة لموظف آخر</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {transferTarget.assetName} — {transferTarget.employeeName}
                  </p>
                </div>
                <button
                  onClick={() => setTransferTarget(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {transferError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                    {transferError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموظف المستلم *
                  </label>
                  <select
                    value={transferForm.toEmployeeId}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, toEmployeeId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">— اختر الموظف المستلم —</option>
                    {employees
                      .filter(
                        (emp) => emp.isActive && emp.id !== transferTarget.employeeId
                      )
                      .map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.fullName} — {emp.employeeCode}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={transferForm.note}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, note: e.target.value })
                    }
                    className="input w-full"
                    placeholder="سبب النقل أو أي تفاصيل"
                    maxLength={CUSTODY_TEXT_MAX}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {transferForm.note.length}/{CUSTODY_TEXT_MAX} حرف
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  العهدة الحالية ستُقفل، وتُفتح عهدة جديدة للمستلم بانتظار قبوله ثم اعتماد
                  مديره المباشر
                </p>
                {/* نقل بين فرعين — متاح لحساب نطاقه كل الفروع بس؛ الأصل بيتنقل لفرع المستلم لحظة اعتماد مديره */}
                {(() => {
                  const target = employees.find((emp) => String(emp.id) === transferForm.toEmployeeId)
                  return target && transferTarget.branchId != null && target.branchId !== transferTarget.branchId ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      المستلم في فرع «{branchNameOf(target.branchId)}» — نقل بين فرعين: الأصل هيتنقل لفرعه بعد قبوله واعتماد مديره.
                    </p>
                  ) : null
                })()}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setTransferTarget(null)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !transferForm.toEmployeeId}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {transferring ? 'جارٍ النقل...' : 'نقل العهدة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
