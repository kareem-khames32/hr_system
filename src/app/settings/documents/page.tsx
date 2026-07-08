"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Users,
} from "lucide-react";
import { ApiDocument, fetchDocuments } from "@/lib/api";

interface DocTypeRow {
  docType: string;
  count: number;
  employees: number;
  withExpiry: number;
  expired: number;
}

export default function DocumentTypesPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "with_expiry" | "expired">("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        const docs = await fetchDocuments();
        setDocuments(docs);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // أنواع المستندات المستخدَمة فعلياً (مشتقة من المستندات المسجلة)
  const docTypes: DocTypeRow[] = [...new Set(documents.map((d) => d.docType))].map(
    (docType) => {
      const docs = documents.filter((d) => d.docType === docType);
      return {
        docType,
        count: docs.length,
        employees: new Set(docs.map((d) => d.employeeId)).size,
        withExpiry: docs.filter((d) => d.expiryDate).length,
        expired: docs.filter((d) => d.expired).length,
      };
    }
  );

  const filteredTypes = docTypes.filter((type) => {
    const matchesSearch = type.docType.includes(searchTerm);
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "with_expiry" && type.withExpiry > 0) ||
      (filterStatus === "expired" && type.expired > 0);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: docTypes.length,
    documents: documents.length,
    expired: documents.filter((d) => d.expired).length,
    withExpiry: documents.filter((d) => d.expiryDate).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أنواع المستندات</h1>
          <p className="text-gray-600 mt-1">
            أنواع المستندات المستخدَمة فعلياً في ملفات الموظفين
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
            disabled
            title="التعديل الكامل في مرحلة لاحقة — الأنواع تُشتق من المستندات المسجلة"
          >
            <FileText size={18} />
            إضافة نوع مستند
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">إجمالي الأنواع</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.documents}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.withExpiry}</p>
              <p className="text-sm text-gray-600">لها تاريخ انتهاء</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="بحث في أنواع المستندات..."
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
              <option value="with_expiry">لها تاريخ انتهاء</option>
              <option value="expired">فيها مستندات منتهية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Document Types List */}
      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">نوع المستند</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">عدد المستندات</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">الموظفون</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">له انتهاء</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">منتهية</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTypes.map((type) => (
                  <tr key={type.docType} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{type.docType}</p>
                        <p className="text-sm text-gray-500">
                          مشتق من المستندات المسجلة
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="badge badge-secondary">{type.count} مستند</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Users size={14} />
                        <span>{type.employees}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {type.withExpiry > 0 ? (
                        <span className="badge badge-warning">{type.withExpiry}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {type.expired > 0 ? (
                        <span className="badge badge-danger">{type.expired}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTypes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">لا توجد أنواع مستندات مسجلة بعد</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
