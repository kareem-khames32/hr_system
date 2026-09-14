'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Users,
  Plus,
  Edit,
  X,
} from 'lucide-react'
import { MainLayout } from '@/components/layout'
import {
  ApiDocument,
  can,
  createCatalogItem,
  fetchDocuments,
  updateCatalogItem,
} from '@/lib/api'
import { loadDocTypes, type ApiDocType } from '@/lib/doc-types'

// كود النوع — مرآة DOC_TYPE_CODE_RE في api/src/assets/doc-types.ts (والخادم يتحقق أيضاً)
const CODE_RE = /^[a-z][a-z0-9_]{1,49}$/

// استخدام نوع في المستندات المسجلة
interface TypeUsage {
  count: number
  employees: number
  withExpiry: number
  expired: number
}
const NO_USAGE: TypeUsage = { count: 0, employees: 0, withExpiry: 0, expired: 0 }

// كتالوج أنواع مستندات الموظفين (/catalogs/doc-types) — القراءة للجميع والتعديل
// settings.manage. الكود ثابت بعد الإنشاء، والتعطيل بدل الحذف
export default function DocumentTypesPage() {
  // الإحصاء من المستندات المسجلة: من لا يملك documents.manage يُعاد له مستنداته فقط
  const canSeeDocs = can('documents.manage')
  const [types, setTypes] = useState<ApiDocType[]>([])
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>(
    'all'
  )

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setTypes(await loadDocTypes())
        setError(null)
      } catch (err: any) {
        setError(err.message)
      }
      // المستندات للإحصاء فقط — فشلها لا يُسقط الكتالوج
      if (canSeeDocs) {
        try {
          setDocuments(await fetchDocuments())
        } catch (err: any) {
          setDocsError(err.message)
        }
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // استخدام كل كود في المستندات المسجلة
  const usage = useMemo(() => {
    const acc = new Map<
      string,
      { count: number; emps: Set<number>; withExpiry: number; expired: number }
    >()
    for (const d of documents) {
      const u = acc.get(d.docType) ?? {
        count: 0,
        emps: new Set<number>(),
        withExpiry: 0,
        expired: 0,
      }
      u.count++
      u.emps.add(d.employeeId)
      if (d.expiryDate) u.withExpiry++
      if (d.expired) u.expired++
      acc.set(d.docType, u)
    }
    const out = new Map<string, TypeUsage>()
    acc.forEach((u, code) =>
      out.set(code, {
        count: u.count,
        employees: u.emps.size,
        withExpiry: u.withExpiry,
        expired: u.expired,
      })
    )
    return out
  }, [documents])

  // أنواع في مستندات قديمة سُجلت نصاً حراً قبل الكتالوج — تُعرض كما هي للتوحيد
  const catalogCodes = new Set(types.map((t) => t.code))
  const legacyTypes = Array.from(usage.entries()).filter(([code]) => !catalogCodes.has(code))

  const q = searchTerm.trim().toLowerCase()
  const filteredTypes = types.filter((t) => {
    const matchesSearch = !q || t.nameAr.toLowerCase().includes(q) || t.code.includes(q)
    const u = usage.get(t.code) ?? NO_USAGE
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && t.isActive) ||
      (filterStatus === 'inactive' && !t.isActive) ||
      (filterStatus === 'expired' && u.expired > 0)
    return matchesSearch && matchesStatus
  })

  const stats = {
    active: types.filter((t) => t.isActive).length,
    total: types.length,
    documents: documents.length,
    expired: documents.filter((d) => d.expired).length,
    withExpiry: documents.filter((d) => d.expiryDate).length,
  }

  // تنفيذ تعديل على الكتالوج ثم إعادة تحميله (رسائل الخادم تُعرض كما هي)
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      setTypes(await loadDocTypes())
      return true
    } catch (err: any) {
      setActionError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = async () => {
    const nameAr = newName.trim()
    const code = newCode.trim()
    if (nameAr.length < 2) {
      setActionError('اسم النوع حرفان على الأقل')
      return
    }
    if (!CODE_RE.test(code)) {
      setActionError('الكود حروف إنجليزية صغيرة وأرقام و_ ويبدأ بحرف — مثل work_permit')
      return
    }
    if (await run(() => createCatalogItem('doc-types', { code, nameAr, isActive: true }))) {
      setNewName('')
      setNewCode('')
      setShowAdd(false)
    }
  }

  const handleRename = async (t: ApiDocType) => {
    const nameAr = editingName.trim()
    if (!nameAr || nameAr === t.nameAr) {
      setEditingId(null)
      return
    }
    if (await run(() => updateCatalogItem('doc-types', t.id, { nameAr }))) {
      setEditingId(null)
    }
  }

  const handleToggle = (t: ApiDocType) =>
    run(() => updateCatalogItem('doc-types', t.id, { isActive: !t.isActive }))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">أنواع المستندات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع المستندات</h1>
            <p className="text-gray-500 mt-1">
              القائمة المعتمدة لأنواع مستندات الموظفين — يُختار منها النوع عند رفع أي مستند،
              والخادم يرفض ما عداها
            </p>
          </div>
          <button
            onClick={() => {
              setShowAdd(true)
              setActionError(null)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة نوع مستند
          </button>
        </div>

        {/* Error Banners */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {actionError && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{actionError}</div>
        )}

        {/* إضافة نوع */}
        {showAdd && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">نوع مستند جديد</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">اسم النوع بالعربي *</label>
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={200}
                  placeholder="مثال: تصريح عمل"
                />
              </div>
              <div>
                <label className="label">الكود *</label>
                <input
                  type="text"
                  className="input font-mono"
                  dir="ltr"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toLowerCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  maxLength={50}
                  placeholder="work_permit"
                />
                <p className="text-xs text-gray-400 mt-1">
                  حروف إنجليزية صغيرة وأرقام و_ — ثابت بعد الإنشاء لأن المستندات تُحفظ به
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">
                إلغاء
              </button>
              <button
                onClick={handleAdd}
                disabled={busy || !newName.trim() || !newCode.trim()}
                className="btn-primary"
              >
                {busy ? 'جارٍ الحفظ...' : 'إضافة النوع'}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.active}
                  <span className="text-sm font-normal text-gray-400"> من {stats.total}</span>
                </p>
                <p className="text-sm text-gray-600">أنواع مفعّلة</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {canSeeDocs ? stats.documents : '—'}
                </p>
                <p className="text-sm text-gray-600">مستندات مسجلة</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {canSeeDocs ? stats.expired : '—'}
                </p>
                <p className="text-sm text-gray-600">مستندات منتهية</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {canSeeDocs ? stats.withExpiry : '—'}
                </p>
                <p className="text-sm text-gray-600">لها تاريخ انتهاء</p>
              </div>
            </div>
          </div>
        </div>

        {!canSeeDocs && (
          <div className="bg-blue-50 text-blue-700 rounded-xl p-4 text-sm">
            إحصاءات الاستخدام (عدد المستندات والموظفين والمنتهي) تظهر لمن يملك صلاحية «إدارة
            مستندات الموظفين»
          </div>
        )}
        {docsError && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
            تعذر تحميل المستندات للإحصاء: {docsError}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="input"
              >
                <option value="all">جميع الأنواع</option>
                <option value="active">المفعّلة</option>
                <option value="inactive">المعطّلة</option>
                {canSeeDocs && <option value="expired">فيها مستندات منتهية</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">نوع المستند</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">الحالة</th>
                    {canSeeDocs && (
                      <>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          عدد المستندات
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          الموظفون
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          لها انتهاء
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">
                          منتهية
                        </th>
                      </>
                    )}
                    <th className="text-center py-3 px-4 font-medium text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTypes.map((t) => {
                    const u = usage.get(t.code) ?? NO_USAGE
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-gray-50 ${t.isActive ? '' : 'opacity-60'}`}
                      >
                        <td className="py-3 px-4">
                          {editingId === t.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename(t)}
                                className="input flex-1 text-sm py-1.5"
                                maxLength={200}
                                autoFocus
                              />
                              <button
                                onClick={() => handleRename(t)}
                                disabled={busy || !editingName.trim()}
                                className="text-xs px-3 py-1.5 bg-primary-500 text-white rounded-lg disabled:opacity-50"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-gray-900">{t.nameAr}</p>
                              <p className="text-xs text-gray-400 font-mono" dir="ltr">
                                {t.code}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`badge text-xs ${
                              t.isActive
                                ? 'bg-success-50 text-success-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {t.isActive ? 'مفعّل' : 'معطّل'}
                          </span>
                        </td>
                        {canSeeDocs && (
                          <>
                            <td className="py-3 px-4 text-center">
                              <span className="badge badge-secondary">{u.count} مستند</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-600">
                                <Users size={14} />
                                <span>{u.employees}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {u.withExpiry > 0 ? (
                                <span className="badge badge-warning">{u.withExpiry}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {u.expired > 0 ? (
                                <span className="badge badge-danger">{u.expired}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingId(t.id)
                                setEditingName(t.nameAr)
                                setActionError(null)
                              }}
                              disabled={busy}
                              className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              تعديل الاسم
                            </button>
                            <button
                              onClick={() => handleToggle(t)}
                              disabled={busy}
                              className={`text-xs px-3 py-1.5 rounded-lg ${
                                t.isActive
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-success-50 text-success-600 hover:bg-green-100'
                              }`}
                            >
                              {t.isActive ? 'تعطيل' : 'تفعيل'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredTypes.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">
                  {types.length === 0 ? 'لا توجد أنواع مستندات في الكتالوج بعد' : 'لا توجد أنواع مطابقة'}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-400 px-4 py-3 border-t">
              النوع المعطَّل لا يظهر عند رفع مستند جديد، والمستندات المسجلة به تبقى كما هي. الحذف
              غير متاح — عطّل النوع بدلاً منه
            </p>
          </div>
        )}

        {/* أنواع خارج الكتالوج */}
        {!loading && canSeeDocs && legacyTypes.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-warning-500" />
              <h2 className="font-bold text-gray-800">أنواع خارج الكتالوج</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              مستندات قديمة سُجل نوعها نصاً حراً قبل اعتماد الكتالوج — تبقى محفوظة كما هي،
              ولتوحيدها عدّل نوع كل مستند من{' '}
              <Link href="/employees/documents" className="text-primary-600 hover:underline">
                مستندات الموظفين
              </Link>
            </p>
            <div className="flex flex-wrap gap-2">
              {legacyTypes.map(([code, u]) => (
                <span key={code} className="badge badge-warning">
                  {code} — {u.count} مستند
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
