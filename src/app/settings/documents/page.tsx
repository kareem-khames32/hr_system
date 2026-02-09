"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Settings,
  Bell,
  Shield,
  Calendar,
} from "lucide-react";

interface DocumentType {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  isRequired: boolean;
  hasExpiry: boolean;
  expiryAlertDays: number[];
  isActive: boolean;
  description: string;
  allowedFormats: string[];
  maxFileSize: number; // in MB
  requiresApproval: boolean;
  appliesTo: string[]; // employee types this applies to
}

const categories = [
  { id: "personal", name: "مستندات شخصية" },
  { id: "employment", name: "مستندات التوظيف" },
  { id: "education", name: "مستندات تعليمية" },
  { id: "professional", name: "شهادات مهنية" },
  { id: "legal", name: "مستندات قانونية" },
  { id: "medical", name: "مستندات طبية" },
  { id: "other", name: "أخرى" },
];

const employeeTypes = [
  { id: "all", name: "جميع الموظفين" },
  { id: "saudi", name: "موظفين سعوديين" },
  { id: "expat", name: "موظفين وافدين" },
  { id: "contractor", name: "متعاقدين" },
  { id: "parttime", name: "دوام جزئي" },
];

const alertDaysOptions = [7, 14, 30, 60, 90, 120, 180];

const initialDocumentTypes: DocumentType[] = [
  {
    id: "1",
    name: "بطاقة الهوية الوطنية",
    nameEn: "National ID",
    category: "personal",
    isRequired: true,
    hasExpiry: true,
    expiryAlertDays: [30, 60, 90],
    isActive: true,
    description: "نسخة من بطاقة الهوية الوطنية سارية المفعول",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["saudi"],
  },
  {
    id: "2",
    name: "جواز السفر",
    nameEn: "Passport",
    category: "personal",
    isRequired: true,
    hasExpiry: true,
    expiryAlertDays: [60, 90, 180],
    isActive: true,
    description: "نسخة من جواز السفر ساري المفعول",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["expat"],
  },
  {
    id: "3",
    name: "الإقامة",
    nameEn: "Residence Permit (Iqama)",
    category: "legal",
    isRequired: true,
    hasExpiry: true,
    expiryAlertDays: [30, 60, 90],
    isActive: true,
    description: "نسخة من الإقامة سارية المفعول",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["expat"],
  },
  {
    id: "4",
    name: "عقد العمل",
    nameEn: "Employment Contract",
    category: "employment",
    isRequired: true,
    hasExpiry: false,
    expiryAlertDays: [],
    isActive: true,
    description: "نسخة موقعة من عقد العمل",
    allowedFormats: ["pdf"],
    maxFileSize: 10,
    requiresApproval: true,
    appliesTo: ["all"],
  },
  {
    id: "5",
    name: "شهادة المؤهل العلمي",
    nameEn: "Educational Certificate",
    category: "education",
    isRequired: true,
    hasExpiry: false,
    expiryAlertDays: [],
    isActive: true,
    description: "شهادة المؤهل الدراسي الأخير",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 10,
    requiresApproval: false,
    appliesTo: ["all"],
  },
  {
    id: "6",
    name: "شهادات الخبرة",
    nameEn: "Experience Certificates",
    category: "professional",
    isRequired: false,
    hasExpiry: false,
    expiryAlertDays: [],
    isActive: true,
    description: "شهادات الخبرة من جهات العمل السابقة",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 10,
    requiresApproval: false,
    appliesTo: ["all"],
  },
  {
    id: "7",
    name: "رخصة القيادة",
    nameEn: "Driving License",
    category: "personal",
    isRequired: false,
    hasExpiry: true,
    expiryAlertDays: [30, 60],
    isActive: true,
    description: "نسخة من رخصة القيادة",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["all"],
  },
  {
    id: "8",
    name: "شهادة صحية",
    nameEn: "Health Certificate",
    category: "medical",
    isRequired: false,
    hasExpiry: true,
    expiryAlertDays: [30, 60, 90],
    isActive: true,
    description: "شهادة اللياقة الصحية",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["all"],
  },
  {
    id: "9",
    name: "تأمين طبي",
    nameEn: "Medical Insurance",
    category: "medical",
    isRequired: true,
    hasExpiry: true,
    expiryAlertDays: [14, 30],
    isActive: true,
    description: "بطاقة التأمين الطبي",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["all"],
  },
  {
    id: "10",
    name: "صورة شخصية",
    nameEn: "Personal Photo",
    category: "personal",
    isRequired: true,
    hasExpiry: false,
    expiryAlertDays: [],
    isActive: true,
    description: "صورة شخصية حديثة بخلفية بيضاء",
    allowedFormats: ["jpg", "png"],
    maxFileSize: 2,
    requiresApproval: false,
    appliesTo: ["all"],
  },
];

export default function DocumentTypesPage() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>(initialDocumentTypes);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    defaultAlertDays: [30, 60, 90],
    autoArchiveExpired: true,
    requireApprovalForChanges: false,
    notifyHROnExpiry: true,
    notifyEmployeeOnExpiry: true,
    notifyManagerOnExpiry: false,
  });

  const [formData, setFormData] = useState<Partial<DocumentType>>({
    name: "",
    nameEn: "",
    category: "personal",
    isRequired: false,
    hasExpiry: false,
    expiryAlertDays: [],
    isActive: true,
    description: "",
    allowedFormats: ["pdf", "jpg", "png"],
    maxFileSize: 5,
    requiresApproval: false,
    appliesTo: ["all"],
  });

  const filteredTypes = documentTypes.filter((type) => {
    const matchesSearch =
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || type.category === filterCategory;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && type.isActive) ||
      (filterStatus === "inactive" && !type.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSubmit = () => {
    if (editingType) {
      setDocumentTypes(
        documentTypes.map((t) =>
          t.id === editingType.id ? { ...t, ...formData } : t
        )
      );
    } else {
      const newType: DocumentType = {
        id: Date.now().toString(),
        name: formData.name || "",
        nameEn: formData.nameEn || "",
        category: formData.category || "other",
        isRequired: formData.isRequired || false,
        hasExpiry: formData.hasExpiry || false,
        expiryAlertDays: formData.expiryAlertDays || [],
        isActive: formData.isActive !== false,
        description: formData.description || "",
        allowedFormats: formData.allowedFormats || ["pdf"],
        maxFileSize: formData.maxFileSize || 5,
        requiresApproval: formData.requiresApproval || false,
        appliesTo: formData.appliesTo || ["all"],
      };
      setDocumentTypes([...documentTypes, newType]);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({
      name: "",
      nameEn: "",
      category: "personal",
      isRequired: false,
      hasExpiry: false,
      expiryAlertDays: [],
      isActive: true,
      description: "",
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      requiresApproval: false,
      appliesTo: ["all"],
    });
  };

  const handleEdit = (type: DocumentType) => {
    setEditingType(type);
    setFormData(type);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف نوع المستند هذا؟")) {
      setDocumentTypes(documentTypes.filter((t) => t.id !== id));
    }
  };

  const toggleActive = (id: string) => {
    setDocumentTypes(
      documentTypes.map((t) =>
        t.id === id ? { ...t, isActive: !t.isActive } : t
      )
    );
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getEmployeeTypeName = (typeId: string) => {
    return employeeTypes.find((t) => t.id === typeId)?.name || typeId;
  };

  const toggleAlertDay = (day: number) => {
    const current = formData.expiryAlertDays || [];
    if (current.includes(day)) {
      setFormData({ ...formData, expiryAlertDays: current.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, expiryAlertDays: [...current, day].sort((a, b) => a - b) });
    }
  };

  const toggleFormat = (format: string) => {
    const current = formData.allowedFormats || [];
    if (current.includes(format)) {
      setFormData({ ...formData, allowedFormats: current.filter((f) => f !== format) });
    } else {
      setFormData({ ...formData, allowedFormats: [...current, format] });
    }
  };

  const toggleAppliesTo = (type: string) => {
    const current = formData.appliesTo || [];
    if (type === "all") {
      setFormData({ ...formData, appliesTo: ["all"] });
    } else {
      const filtered = current.filter((t) => t !== "all");
      if (filtered.includes(type)) {
        setFormData({ ...formData, appliesTo: filtered.filter((t) => t !== type) });
      } else {
        setFormData({ ...formData, appliesTo: [...filtered, type] });
      }
    }
  };

  const stats = {
    total: documentTypes.length,
    active: documentTypes.filter((t) => t.isActive).length,
    required: documentTypes.filter((t) => t.isRequired).length,
    withExpiry: documentTypes.filter((t) => t.hasExpiry).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أنواع المستندات</h1>
          <p className="text-gray-600 mt-1">إدارة وتكوين أنواع المستندات المطلوبة للموظفين</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings size={18} />
            الإعدادات العامة
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة نوع مستند
          </button>
        </div>
      </div>

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
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-600">أنواع مفعّلة</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.required}</p>
              <p className="text-sm text-gray-600">مستندات إلزامية</p>
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="all">جميع الفئات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="input"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">مفعّل</option>
              <option value="inactive">معطّل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Types List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right py-3 px-4 font-medium text-gray-700">نوع المستند</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الفئة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">إلزامي</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">له انتهاء</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">ينطبق على</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الحالة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTypes.map((type) => (
                <tr key={type.id} className={`hover:bg-gray-50 ${!type.isActive ? "opacity-60" : ""}`}>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-500">{type.nameEn}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge badge-secondary">{getCategoryName(type.category)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {type.isRequired ? (
                      <span className="badge badge-danger">إلزامي</span>
                    ) : (
                      <span className="badge badge-secondary">اختياري</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {type.hasExpiry ? (
                      <div className="flex flex-col items-center">
                        <span className="badge badge-warning">نعم</span>
                        {type.expiryAlertDays.length > 0 && (
                          <span className="text-xs text-gray-500 mt-1">
                            تنبيه: {type.expiryAlertDays.join(", ")} يوم
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {type.appliesTo.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {getEmployeeTypeName(t)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => toggleActive(type.id)}
                      className={`p-1 rounded transition-colors ${
                        type.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {type.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="تعديل"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTypes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">لا توجد أنواع مستندات</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingType ? "تعديل نوع المستند" : "إضافة نوع مستند جديد"}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المستند (عربي) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: بطاقة الهوية"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم المستند (إنجليزي)
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="input w-full"
                    placeholder="Example: National ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                  placeholder="وصف المستند المطلوب..."
                />
              </div>

              {/* Requirements */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Shield size={18} />
                  المتطلبات
                </h3>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>مستند إلزامي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>يتطلب موافقة</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>مفعّل</span>
                  </label>
                </div>
              </div>

              {/* Expiry Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar size={18} />
                  إعدادات الانتهاء
                </h3>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasExpiry}
                    onChange={(e) => setFormData({ ...formData, hasExpiry: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>هذا المستند له تاريخ انتهاء</span>
                </label>

                {formData.hasExpiry && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      <Bell size={14} className="inline ml-1" />
                      أيام التنبيه قبل الانتهاء
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {alertDaysOptions.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleAlertDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            formData.expiryAlertDays?.includes(day)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {day} يوم
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* File Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText size={18} />
                  إعدادات الملف
                </h3>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">الصيغ المسموح بها</label>
                  <div className="flex flex-wrap gap-2">
                    {["pdf", "jpg", "png", "doc", "docx", "xls", "xlsx"].map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => toggleFormat(format)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.allowedFormats?.includes(format)
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        .{format}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    الحد الأقصى لحجم الملف (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.maxFileSize}
                    onChange={(e) => setFormData({ ...formData, maxFileSize: Number(e.target.value) })}
                    className="input w-32"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              {/* Applies To */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">ينطبق على</h3>
                <div className="flex flex-wrap gap-2">
                  {employeeTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleAppliesTo(type.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.appliesTo?.includes(type.id) ||
                        (type.id !== "all" && formData.appliesTo?.includes("all"))
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button onClick={resetForm} className="btn-secondary">
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={!formData.name}
              >
                {editingType ? "حفظ التعديلات" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings size={24} />
                الإعدادات العامة للمستندات
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Default Alert Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  أيام التنبيه الافتراضية
                </label>
                <div className="flex flex-wrap gap-2">
                  {alertDaysOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = globalSettings.defaultAlertDays;
                        if (current.includes(day)) {
                          setGlobalSettings({
                            ...globalSettings,
                            defaultAlertDays: current.filter((d) => d !== day),
                          });
                        } else {
                          setGlobalSettings({
                            ...globalSettings,
                            defaultAlertDays: [...current, day].sort((a, b) => a - b),
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        globalSettings.defaultAlertDays.includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {day} يوم
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">إعدادات الإشعارات</h3>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.notifyHROnExpiry}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, notifyHROnExpiry: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">إشعار الموارد البشرية</p>
                    <p className="text-sm text-gray-500">إرسال إشعار للموارد البشرية عند اقتراب انتهاء المستندات</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.notifyEmployeeOnExpiry}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, notifyEmployeeOnExpiry: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">إشعار الموظف</p>
                    <p className="text-sm text-gray-500">إرسال إشعار للموظف عند اقتراب انتهاء مستنداته</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.notifyManagerOnExpiry}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, notifyManagerOnExpiry: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">إشعار المدير المباشر</p>
                    <p className="text-sm text-gray-500">إرسال إشعار للمدير المباشر عند اقتراب انتهاء مستندات موظفيه</p>
                  </div>
                </label>
              </div>

              {/* Other Settings */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">إعدادات أخرى</h3>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.autoArchiveExpired}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, autoArchiveExpired: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">أرشفة تلقائية</p>
                    <p className="text-sm text-gray-500">أرشفة المستندات المنتهية تلقائياً</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.requireApprovalForChanges}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, requireApprovalForChanges: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">موافقة على التغييرات</p>
                    <p className="text-sm text-gray-500">طلب موافقة عند تحديث المستندات</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowSettingsModal(false)} className="btn-secondary">
                إغلاق
              </button>
              <button onClick={() => setShowSettingsModal(false)} className="btn-primary">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
