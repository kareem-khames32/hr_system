'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CheckSquare, FileWarning, Search, Send, Square, Upload } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { can, fetchBranches, getCurrentUser, type ApiBranch } from '@/lib/api'
import { branchScopeOfUser, canSeeBranch, type BranchScope } from '@/lib/branch-scope'
import { formatDate } from '@/lib/dates'
import {
  fetchHiringMissing,
  hiringDocNames,
  reminderResultText,
  sendHiringReminders,
  uploadMissingHref,
  type HiringMissingReport,
} from '@/lib/hiring-documents-api'

// «نواقص مسوغات التعيين» (طلب المالك 30 سبتمبر): الموظفين الشغالين في نطاقك اللي ناقصهم مستند من المعلَّمة «مطلوب للتعيين»
// في «أنواع المستندات» — بالناقص وآخر تذكير. تختار وتبعت تذكير (بيوصل الموظف إشعار بالناقص)، أو ترفع الناقص على طول
export default function HiringDocumentsPage() {
  const [report, setReport] = useState<HiringMissingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [branchScope, setBranchScope] = useState<BranchScope>([])
  const [selected, setSelected] = useState<number[]>([])
  const [sending, setSending] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // «أنواع المستندات» (فين بيتعلّم «مطلوب للتعيين») لصاحب صلاحية الإعدادات
  const [canEditTypes, setCanEditTypes] = useState(false)

  useEffect(() => {
    setBranchScope(branchScopeOfUser(getCurrentUser()))
    setCanEditTypes(can('settings.manage'))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  // البحث بيتبعت للخادم بعد ما الكتابة تهدى شوية؛ الفرع على طول
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      fetchHiringMissing({ search, branchId })
        .then((result) => {
          if (cancelled) return
          setReport(result)
          setSelected((prev) => prev.filter((id) => result.employees.some((row) => row.employeeId === id)))
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل النواقص — أعد المحاولة')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, search.trim() ? 300 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search, branchId, reloadKey])

  const rows = report?.employees ?? []
  const required = report?.required ?? []
  // منتقي الفرع لحساب الشركة أو اللي على أكتر من فرع — حساب الفرع الواحد بيشوف فرعه بس
  const picksBranch = branchScope === null || branchScope.length > 1
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.employeeId))

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((row) => row.employeeId))

  const remind = async () => {
    if (!selected.length || sending) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      const result = await sendHiringReminders(selected)
      setNotice(reminderResultText(result))
      setSelected([])
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال التذكير — أعد المحاولة')
    } finally {
      setSending(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            إدارة الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">نواقص مسوغات التعيين</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">نواقص مسوغات التعيين</h1>
            <p className="text-gray-500 mt-1">
              الموظفين اللي لسه ناقصهم مستند أو أكتر من المستندات المطلوبة للتعيين — اختار وابعت لهم تذكير، أو ارفع
              الناقص على طول من «مستندات الموظفين»
            </p>
          </div>
          {canEditTypes && (
            <Link href="/settings/documents" className="btn-secondary text-sm shrink-0">
              المستندات المطلوبة
            </Link>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0" />
            {notice}
          </div>
        )}

        {report && required.length === 0 ? (
          <div className="card p-10 text-center">
            <FileWarning size={44} className="mx-auto text-gray-300 mb-3" />
            {canEditTypes ? (
              <p className="text-gray-600">
                مفيش مستندات متعلّمة «مطلوب للتعيين» — علّم المستندات اللي لازم كل موظف يسلّمها من{' '}
                <Link href="/settings/documents" className="text-primary-600 hover:underline">
                  أنواع المستندات
                </Link>{' '}
                الأول
              </p>
            ) : (
              <p className="text-gray-600">
                مفيش مستندات متعلّمة «مطلوب للتعيين» — اطلب من مسؤول الإعدادات يعلّم المطلوب في «أنواع المستندات»
              </p>
            )}
          </div>
        ) : (
          <>
            {required.length > 0 && (
              <p className="text-sm text-gray-500">المطلوب من كل موظف: {hiringDocNames(required)}</p>
            )}

            <div className="card p-4 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input pr-10"
                  placeholder="بحث باسم الموظف أو كوده..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {picksBranch && (
                <select
                  className="input w-auto min-w-[180px]"
                  aria-label="الفرع"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">كل الفروع</option>
                  {branches
                    .filter((branch) => canSeeBranch(branchScope, branch.id))
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
              )}
              <button
                onClick={remind}
                disabled={!selected.length || sending}
                title={selected.length ? undefined : 'اختار الموظفين الأول من الجدول'}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {sending ? 'جارٍ الإرسال...' : 'ابعت تذكير'}
                {selected.length > 0 && !sending && ` (${selected.length})`}
              </button>
            </div>

            {loading && !report ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                {rows.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 size={44} className="mx-auto text-success-500 mb-3" />
                    <p className="text-gray-600">
                      {search.trim()
                        ? 'مفيش موظف ناقصه مستندات بالاسم أو الكود ده'
                        : 'كل الموظفين مسلّمين مسوغات التعيين كاملة'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="table-header">
                          <th className="px-4 py-3 text-right w-10">
                            <button onClick={toggleAll} aria-label="اختيار الكل" className="text-gray-400 hover:text-gray-600">
                              {allSelected ? <CheckSquare size={20} className="text-primary-600" /> : <Square size={20} />}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">الموظف</th>
                          <th className="px-4 py-3 text-right">الفرع</th>
                          <th className="px-4 py-3 text-right">القسم</th>
                          <th className="px-4 py-3 text-right">الناقص</th>
                          <th className="px-4 py-3 text-right">آخر تذكير</th>
                          <th className="px-4 py-3 text-center">رفع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.employeeId} className="table-row">
                            <td className="table-cell">
                              <button
                                onClick={() => toggle(row.employeeId)}
                                aria-label={`اختيار ${row.fullName}`}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {selected.includes(row.employeeId) ? (
                                  <CheckSquare size={20} className="text-primary-600" />
                                ) : (
                                  <Square size={20} />
                                )}
                              </button>
                            </td>
                            <td className="table-cell">
                              <Link href={`/employees/${row.employeeId}`} className="hover:text-primary-600">
                                <p className="font-medium text-gray-800">{row.fullName}</p>
                                <p className="text-xs text-gray-500">{row.employeeCode}</p>
                              </Link>
                            </td>
                            <td className="table-cell">{row.branchName ?? '—'}</td>
                            <td className="table-cell">{row.departmentName ?? '—'}</td>
                            <td className="table-cell">
                              <div className="flex flex-wrap gap-1.5">
                                {row.missing.map((doc) => (
                                  <Link
                                    key={doc.code}
                                    href={uploadMissingHref(row.employeeId, doc.code)}
                                    title={`ارفع «${doc.nameAr}» لـ ${row.fullName}`}
                                    className="badge badge-danger hover:opacity-80"
                                  >
                                    {doc.nameAr}
                                  </Link>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                مسلّم {row.presentCount} من {row.requiredCount}
                              </p>
                            </td>
                            <td className="table-cell whitespace-nowrap">
                              {row.lastReminderAt ? formatDate(row.lastReminderAt) : 'ماتبعتش'}
                            </td>
                            <td className="table-cell text-center">
                              <Link
                                href={uploadMissingHref(row.employeeId, row.missing[0]?.code)}
                                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                              >
                                <Upload size={14} />
                                ارفع الناقص
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {rows.length > 0 && (
              <p className="text-xs text-gray-400">
                {rows.length} موظف ناقصهم مستندات. التذكير بيوصل الموظف إشعار بالناقص، وبيختفي لوحده أول ما المستندات تترفع.
              </p>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
