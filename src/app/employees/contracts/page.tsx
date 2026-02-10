"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout";
import Link from "next/link";
import {
  FileSignature,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Building2,
  Briefcase,
  Bell,
  MoreVertical,
  ChevronLeft,
  X,
} from "lucide-react";

interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  jobTitle: string;
  contractType: "permanent" | "fixed" | "probation" | "parttime";
  startDate: string;
  endDate?: string;
  status: "active" | "expiring" | "expired" | "renewed";
  salary: number;
  renewalCount: number;
  lastRenewalDate?: string;
  notes?: string;
}

const contractTypes = {
  permanent: { name: "غير محدد المدة", color: "bg-blue-100 text-blue-700" },
  fixed: { name: "محدد المدة", color: "bg-purple-100 text-purple-700" },
  probation: { name: "تحت التجربة", color: "bg-yellow-100 text-yellow-700" },
  parttime: { name: "دوام جزئي", color: "bg-cyan-100 text-cyan-700" },
};

const statusConfig = {
  active: { name: "ساري", color: "bg-green-100 text-green-700", icon: CheckCircle },
  expiring: { name: "ينتهي قريباً", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  expired: { name: "منتهي", color: "bg-red-100 text-red-700", icon: Clock },
  renewed: { name: "تم التجديد", color: "bg-blue-100 text-blue-700", icon: RefreshCw },
};

const mockContracts: Contract[] = [
  {
    id: "1",
    employeeId: "EMP001",
    employeeName: "أحمد محمد علي",
    employeeAvatar: "أ",
    department: "تقنية المعلومات",
    jobTitle: "مدير تقنية المعلومات",
    contractType: "permanent",
    startDate: "2020-03-15",
    status: "active",
    salary: 20250,
    renewalCount: 0,
  },
  {
    id: "2",
    employeeId: "EMP002",
    employeeName: "سارة أحمد الخالدي",
    employeeAvatar: "س",
    department: "الموارد البشرية",
    jobTitle: "مدير الموارد البشرية",
    contractType: "fixed",
    startDate: "2022-01-01",
    endDate: "2024-12-31",
    status: "active",
    salary: 18000,
    renewalCount: 1,
    lastRenewalDate: "2023-01-01",
  },
  {
    id: "3",
    employeeId: "EMP003",
    employeeName: "عمر سالم الحربي",
    employeeAvatar: "ع",
    department: "المبيعات",
    jobTitle: "مدير المبيعات",
    contractType: "fixed",
    startDate: "2023-06-01",
    endDate: "2024-02-28",
    status: "expiring",
    salary: 16500,
    renewalCount: 0,
    notes: "يجب مناقشة التجديد قبل نهاية الشهر",
  },
  {
    id: "4",
    employeeId: "EMP004",
    employeeName: "ريم سعود الدوسري",
    employeeAvatar: "ر",
    department: "تقنية المعلومات",
    jobTitle: "مطور برمجيات أول",
    contractType: "fixed",
    startDate: "2022-05-15",
    endDate: "2024-03-15",
    status: "expiring",
    salary: 14000,
    renewalCount: 1,
    lastRenewalDate: "2023-05-15",
  },
  {
    id: "5",
    employeeId: "EMP005",
    employeeName: "محمد خالد السعيد",
    employeeAvatar: "م",
    department: "المبيعات",
    jobTitle: "مندوب مبيعات أول",
    contractType: "probation",
    startDate: "2024-01-15",
    endDate: "2024-04-15",
    status: "active",
    salary: 9000,
    renewalCount: 0,
    notes: "فترة تجربة 3 أشهر",
  },
  {
    id: "6",
    employeeId: "EMP006",
    employeeName: "نورة محمد العتيبي",
    employeeAvatar: "ن",
    department: "الموارد البشرية",
    jobTitle: "أخصائي موارد بشرية",
    contractType: "fixed",
    startDate: "2023-01-01",
    endDate: "2024-01-31",
    status: "expired",
    salary: 10500,
    renewalCount: 0,
  },
  {
    id: "7",
    employeeId: "EMP007",
    employeeName: "فهد عبدالله الشمري",
    employeeAvatar: "ف",
    department: "تقنية المعلومات",
    jobTitle: "مطور برمجيات",
    contractType: "fixed",
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    status: "renewed",
    salary: 12000,
    renewalCount: 2,
    lastRenewalDate: "2024-01-01",
  },
  {
    id: "8",
    employeeId: "EMP008",
    employeeName: "هند سالم القحطاني",
    employeeAvatar: "هـ",
    department: "المالية",
    jobTitle: "محاسب",
    contractType: "parttime",
    startDate: "2023-06-01",
    status: "active",
    salary: 6000,
    renewalCount: 0,
  },
];

export default function ContractsPage() {
  const [contracts] = useState<Contract[]>(mockContracts);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || contract.status === filterStatus;
    const matchesType = filterType === "all" || contract.contractType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    expiring: contracts.filter((c) => c.status === "expiring").length,
    expired: contracts.filter((c) => c.status === "expired").length,
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة العقود</h1>
            <p className="text-gray-600 mt-1">متابعة عقود الموظفين وتجديدها</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              عقد جديد
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي العقود</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileSignature className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">عقود سارية</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">تنتهي قريباً</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.expiring}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">عقود منتهية</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Soon Alert */}
        {stats.expiring > 0 && (
          <div className="card p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="text-orange-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-orange-800">تنبيه: عقود تنتهي قريباً</p>
                <p className="text-sm text-orange-600">
                  يوجد {stats.expiring} عقود تنتهي خلال الـ 30 يوم القادمة وتحتاج لمراجعة
                </p>
              </div>
              <button className="btn-secondary text-sm">
                عرض التفاصيل
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الرقم الوظيفي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">ساري</option>
                <option value="expiring">ينتهي قريباً</option>
                <option value="expired">منتهي</option>
                <option value="renewed">تم التجديد</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
              >
                <option value="all">جميع الأنواع</option>
                <option value="permanent">غير محدد المدة</option>
                <option value="fixed">محدد المدة</option>
                <option value="probation">تحت التجربة</option>
                <option value="parttime">دوام جزئي</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الموظف</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">نوع العقد</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">تاريخ البداية</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">تاريخ الانتهاء</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الحالة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">التجديدات</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map((contract) => {
                const StatusIcon = statusConfig[contract.status].icon;
                const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);

                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/employees/${contract.employeeId}`}
                        className="flex items-center gap-3 hover:text-primary-600"
                      >
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {contract.employeeAvatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contract.employeeName}</p>
                          <p className="text-sm text-gray-500">{contract.jobTitle}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${contractTypes[contract.contractType].color}`}>
                        {contractTypes[contract.contractType].name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(contract.startDate).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="py-3 px-4">
                      {contract.endDate ? (
                        <div>
                          <p className="text-gray-600">
                            {new Date(contract.endDate).toLocaleDateString("ar-SA")}
                          </p>
                          {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                            <p className="text-xs text-orange-600">
                              متبقي {daysUntilExpiry} يوم
                            </p>
                          )}
                          {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                            <p className="text-xs text-red-600">منتهي</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${statusConfig[contract.status].color} inline-flex items-center gap-1`}>
                        <StatusIcon size={14} />
                        {statusConfig[contract.status].name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {contract.renewalCount > 0 ? (
                        <div className="text-center">
                          <span className="font-medium text-gray-900">{contract.renewalCount}</span>
                          <p className="text-xs text-gray-500">
                            آخر تجديد: {contract.lastRenewalDate && new Date(contract.lastRenewalDate).toLocaleDateString("ar-SA")}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="عرض"
                        >
                          <Eye size={18} />
                        </button>
                        {(contract.status === "expiring" || contract.status === "expired") && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowRenewalModal(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="تجديد"
                          >
                            <RefreshCw size={18} />
                          </button>
                        )}
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredContracts.length === 0 && (
            <div className="text-center py-12">
              <FileSignature className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">لا توجد عقود</p>
            </div>
          )}
        </div>

        {/* Renewal Modal */}
        {showRenewalModal && selectedContract && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">تجديد العقد</h2>
                  <button
                    onClick={() => setShowRenewalModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Employee Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold text-lg">
                    {selectedContract.employeeAvatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedContract.employeeName}</p>
                    <p className="text-sm text-gray-500">{selectedContract.jobTitle} - {selectedContract.department}</p>
                  </div>
                </div>

                {/* Current Contract Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ البداية الحالي</label>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedContract.startDate).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ الانتهاء الحالي</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.endDate
                        ? new Date(selectedContract.endDate).toLocaleDateString("ar-SA")
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* New Contract Details */}
                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-medium text-gray-900">تفاصيل التجديد</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ البداية الجديد
                      </label>
                      <input type="date" className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الانتهاء الجديد
                      </label>
                      <input type="date" className="input w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      مدة التجديد
                    </label>
                    <select className="input w-full">
                      <option value="1">سنة واحدة</option>
                      <option value="2">سنتين</option>
                      <option value="3">3 سنوات</option>
                      <option value="custom">مدة مخصصة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الراتب الجديد
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="input flex-1"
                        defaultValue={selectedContract.salary}
                      />
                      <span className="text-gray-500">ر.س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ملاحظات
                    </label>
                    <textarea
                      className="input w-full"
                      rows={3}
                      placeholder="أي ملاحظات إضافية..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <RefreshCw size={18} />
                  تجديد العقد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
