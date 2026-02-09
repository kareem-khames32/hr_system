"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Download,
  Upload,
  FileSignature,
  Variable,
  CheckCircle,
  Clock,
  Filter,
  MoreVertical,
  Code,
  Briefcase,
  UserMinus,
  Award,
  FileCheck,
  Mail,
  AlertTriangle,
} from "lucide-react";

interface TemplateVariable {
  key: string;
  label: string;
  category: string;
  example: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  content: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

const templateCategories = [
  { id: "contracts", name: "العقود", icon: FileSignature },
  { id: "letters", name: "الخطابات", icon: Mail },
  { id: "certificates", name: "الشهادات", icon: Award },
  { id: "forms", name: "النماذج", icon: FileCheck },
  { id: "notices", name: "الإشعارات", icon: AlertTriangle },
];

const availableVariables: TemplateVariable[] = [
  // Employee Info
  { key: "{{employee_name}}", label: "اسم الموظف", category: "employee", example: "أحمد محمد علي" },
  { key: "{{employee_name_en}}", label: "اسم الموظف (إنجليزي)", category: "employee", example: "Ahmed Mohamed Ali" },
  { key: "{{employee_id}}", label: "الرقم الوظيفي", category: "employee", example: "EMP-001" },
  { key: "{{national_id}}", label: "رقم الهوية", category: "employee", example: "1234567890" },
  { key: "{{passport_number}}", label: "رقم الجواز", category: "employee", example: "A12345678" },
  { key: "{{nationality}}", label: "الجنسية", category: "employee", example: "سعودي" },
  { key: "{{birth_date}}", label: "تاريخ الميلاد", category: "employee", example: "1990/01/15" },
  { key: "{{phone}}", label: "رقم الجوال", category: "employee", example: "0501234567" },
  { key: "{{email}}", label: "البريد الإلكتروني", category: "employee", example: "ahmed@company.com" },
  { key: "{{address}}", label: "العنوان", category: "employee", example: "الرياض، حي العليا" },

  // Job Info
  { key: "{{job_title}}", label: "المسمى الوظيفي", category: "job", example: "مهندس برمجيات" },
  { key: "{{department}}", label: "القسم", category: "job", example: "تقنية المعلومات" },
  { key: "{{branch}}", label: "الفرع", category: "job", example: "الفرع الرئيسي - الرياض" },
  { key: "{{manager_name}}", label: "اسم المدير المباشر", category: "job", example: "خالد أحمد" },
  { key: "{{hire_date}}", label: "تاريخ التعيين", category: "job", example: "2024/01/01" },
  { key: "{{contract_start}}", label: "تاريخ بداية العقد", category: "job", example: "2024/01/01" },
  { key: "{{contract_end}}", label: "تاريخ نهاية العقد", category: "job", example: "2026/01/01" },
  { key: "{{contract_duration}}", label: "مدة العقد", category: "job", example: "سنتين" },
  { key: "{{probation_period}}", label: "فترة التجربة", category: "job", example: "90 يوم" },
  { key: "{{work_hours}}", label: "ساعات العمل", category: "job", example: "8 ساعات يومياً" },

  // Salary Info
  { key: "{{basic_salary}}", label: "الراتب الأساسي", category: "salary", example: "10,000 ريال" },
  { key: "{{housing_allowance}}", label: "بدل السكن", category: "salary", example: "2,500 ريال" },
  { key: "{{transport_allowance}}", label: "بدل النقل", category: "salary", example: "1,000 ريال" },
  { key: "{{total_salary}}", label: "إجمالي الراتب", category: "salary", example: "13,500 ريال" },
  { key: "{{salary_words}}", label: "الراتب كتابةً", category: "salary", example: "ثلاثة عشر ألف وخمسمائة ريال" },

  // Leave Info
  { key: "{{annual_leave_days}}", label: "أيام الإجازة السنوية", category: "leave", example: "30 يوم" },
  { key: "{{leave_balance}}", label: "رصيد الإجازات", category: "leave", example: "15 يوم" },

  // Company Info
  { key: "{{company_name}}", label: "اسم الشركة", category: "company", example: "شركة التقنية المتقدمة" },
  { key: "{{company_name_en}}", label: "اسم الشركة (إنجليزي)", category: "company", example: "Advanced Tech Company" },
  { key: "{{company_address}}", label: "عنوان الشركة", category: "company", example: "الرياض، حي العليا، شارع الملك فهد" },
  { key: "{{company_phone}}", label: "هاتف الشركة", category: "company", example: "+966 11 123 4567" },
  { key: "{{commercial_register}}", label: "السجل التجاري", category: "company", example: "1010123456" },

  // Dates
  { key: "{{today_date}}", label: "تاريخ اليوم", category: "date", example: "2024/02/09" },
  { key: "{{today_date_hijri}}", label: "تاريخ اليوم (هجري)", category: "date", example: "1445/07/29" },

  // Termination
  { key: "{{termination_date}}", label: "تاريخ انتهاء الخدمة", category: "termination", example: "2024/03/01" },
  { key: "{{termination_reason}}", label: "سبب انتهاء الخدمة", category: "termination", example: "استقالة" },
  { key: "{{service_years}}", label: "سنوات الخدمة", category: "termination", example: "5 سنوات" },
  { key: "{{end_of_service}}", label: "مكافأة نهاية الخدمة", category: "termination", example: "50,000 ريال" },
  { key: "{{notice_period}}", label: "فترة الإشعار", category: "termination", example: "30 يوم" },
];

const variableCategories = [
  { id: "employee", name: "بيانات الموظف" },
  { id: "job", name: "بيانات الوظيفة" },
  { id: "salary", name: "بيانات الراتب" },
  { id: "leave", name: "بيانات الإجازات" },
  { id: "company", name: "بيانات الشركة" },
  { id: "date", name: "التواريخ" },
  { id: "termination", name: "إنهاء الخدمة" },
];

const sampleContractTemplate = `بسم الله الرحمن الرحيم

عقد عمل

تم بعون الله وتوفيقه في يوم {{today_date}} الموافق {{today_date_hijri}} إبرام هذا العقد بين كل من:

الطرف الأول (صاحب العمل):
{{company_name}}
السجل التجاري: {{commercial_register}}
العنوان: {{company_address}}

الطرف الثاني (الموظف):
الاسم: {{employee_name}}
رقم الهوية: {{national_id}}
الجنسية: {{nationality}}
العنوان: {{address}}

تمهيد:
حيث أن الطرف الأول شركة تعمل في مجال التقنية، وحيث أن الطرف الثاني يرغب في العمل لدى الطرف الأول، فقد اتفق الطرفان على الشروط التالية:

المادة الأولى: مدة العقد
مدة هذا العقد {{contract_duration}} تبدأ من {{contract_start}} وتنتهي في {{contract_end}}.

المادة الثانية: فترة التجربة
يخضع الموظف لفترة تجربة مدتها {{probation_period}}.

المادة الثالثة: طبيعة العمل
يعمل الطرف الثاني لدى الطرف الأول بمسمى {{job_title}} في قسم {{department}}.

المادة الرابعة: الأجر
يتقاضى الطرف الثاني راتباً شهرياً إجمالياً قدره {{total_salary}} ({{salary_words}}) موزعاً كالتالي:
- الراتب الأساسي: {{basic_salary}}
- بدل السكن: {{housing_allowance}}
- بدل النقل: {{transport_allowance}}

المادة الخامسة: ساعات العمل
ساعات العمل {{work_hours}} حسب نظام العمل السعودي.

المادة السادسة: الإجازات
يستحق الموظف إجازة سنوية مدتها {{annual_leave_days}}.

المادة السابعة: أحكام عامة
يخضع هذا العقد لأحكام نظام العمل السعودي.

الطرف الأول                                         الطرف الثاني
{{company_name}}                                    {{employee_name}}

التوقيع: _______________                           التوقيع: _______________`;

const initialTemplates: DocumentTemplate[] = [
  {
    id: "1",
    name: "عقد العمل الأساسي",
    nameEn: "Basic Employment Contract",
    category: "contracts",
    description: "عقد العمل القياسي للموظفين الجدد",
    content: sampleContractTemplate,
    variables: ["employee_name", "national_id", "job_title", "basic_salary", "total_salary", "contract_start", "contract_end"],
    isActive: true,
    isDefault: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
    usageCount: 45,
  },
  {
    id: "2",
    name: "خطاب تعريف بالراتب",
    nameEn: "Salary Certificate",
    category: "letters",
    description: "خطاب رسمي يوضح راتب الموظف",
    content: `التاريخ: {{today_date}}

إلى من يهمه الأمر،

تشهد {{company_name}} بأن السيد/ة {{employee_name}} يعمل لديها بمسمى {{job_title}} في قسم {{department}} منذ تاريخ {{hire_date}}، ويتقاضى راتباً شهرياً إجمالياً قدره {{total_salary}}.

أُعطي هذا الخطاب بناءً على طلبه دون أي مسؤولية على الشركة.

والله الموفق،

{{company_name}}
إدارة الموارد البشرية`,
    variables: ["employee_name", "job_title", "department", "hire_date", "total_salary"],
    isActive: true,
    isDefault: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-10",
    usageCount: 120,
  },
  {
    id: "3",
    name: "شهادة خبرة",
    nameEn: "Experience Certificate",
    category: "certificates",
    description: "شهادة خبرة للموظف المنتهية خدمته",
    content: `التاريخ: {{today_date}}

شهادة خبرة

تشهد {{company_name}} بأن السيد/ة {{employee_name}} حامل الهوية رقم {{national_id}} قد عمل لديها بمسمى {{job_title}} في قسم {{department}} خلال الفترة من {{hire_date}} إلى {{termination_date}}.

وقد أنهى خدماته لدينا بسبب {{termination_reason}}، وخلال فترة عمله معنا أظهر كفاءة عالية والتزاماً في العمل.

نتمنى له التوفيق في مسيرته المهنية.

{{company_name}}
إدارة الموارد البشرية`,
    variables: ["employee_name", "national_id", "job_title", "hire_date", "termination_date", "termination_reason"],
    isActive: true,
    isDefault: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    usageCount: 30,
  },
  {
    id: "4",
    name: "خطاب إنهاء خدمات",
    nameEn: "Termination Letter",
    category: "notices",
    description: "خطاب رسمي لإنهاء خدمات الموظف",
    content: `التاريخ: {{today_date}}

السيد/ة {{employee_name}} المحترم/ة

السلام عليكم ورحمة الله وبركاته،

نود إعلامكم بأنه قد تقرر إنهاء خدماتكم لدى {{company_name}} اعتباراً من تاريخ {{termination_date}} وذلك بسبب {{termination_reason}}.

علماً بأن فترة الإشعار هي {{notice_period}} وفقاً لنظام العمل.

سيتم صرف مستحقاتكم المالية شاملة مكافأة نهاية الخدمة والبالغة {{end_of_service}} خلال الفترة النظامية.

نشكركم على خدماتكم خلال فترة عملكم معنا ونتمنى لكم التوفيق.

مع خالص التحية،

{{company_name}}
إدارة الموارد البشرية`,
    variables: ["employee_name", "termination_date", "termination_reason", "notice_period", "end_of_service"],
    isActive: true,
    isDefault: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    usageCount: 8,
  },
];

export default function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [activeVariableCategory, setActiveVariableCategory] = useState("employee");

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    category: "contracts",
    description: "",
    content: "",
    isActive: true,
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = () => {
    const usedVariables = availableVariables
      .filter((v) => formData.content.includes(v.key))
      .map((v) => v.key.replace(/[{}]/g, ""));

    if (editingTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                ...formData,
                variables: usedVariables,
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : t
        )
      );
    } else {
      const newTemplate: DocumentTemplate = {
        id: Date.now().toString(),
        ...formData,
        variables: usedVariables,
        isDefault: false,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
        usageCount: 0,
      };
      setTemplates([...templates, newTemplate]);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setShowVariablesPanel(false);
    setFormData({
      name: "",
      nameEn: "",
      category: "contracts",
      description: "",
      content: "",
      isActive: true,
    });
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      nameEn: template.nameEn,
      category: template.category,
      description: template.description,
      content: template.content,
      isActive: template.isActive,
    });
    setShowModal(true);
  };

  const handlePreview = (template: DocumentTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
      setTemplates(templates.filter((t) => t.id !== id));
    }
  };

  const handleDuplicate = (template: DocumentTemplate) => {
    const newTemplate: DocumentTemplate = {
      ...template,
      id: Date.now().toString(),
      name: template.name + " (نسخة)",
      nameEn: template.nameEn + " (Copy)",
      isDefault: false,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      usageCount: 0,
    };
    setTemplates([...templates, newTemplate]);
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      content: formData.content + variable,
    });
  };

  const getPreviewContent = (content: string) => {
    let previewContent = content;
    availableVariables.forEach((v) => {
      previewContent = previewContent.replace(new RegExp(v.key.replace(/[{}]/g, "\\$&"), "g"), v.example);
    });
    return previewContent;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = templateCategories.find((c) => c.id === categoryId);
    return category?.icon || FileText;
  };

  const getCategoryName = (categoryId: string) => {
    return templateCategories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const stats = {
    total: templates.length,
    active: templates.filter((t) => t.isActive).length,
    contracts: templates.filter((t) => t.category === "contracts").length,
    totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">قوالب المستندات</h1>
          <p className="text-gray-600 mt-1">إنشاء وإدارة قوالب العقود والخطابات والشهادات</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة قالب جديد
        </button>
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
              <p className="text-sm text-gray-600">إجمالي القوالب</p>
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
              <p className="text-sm text-gray-600">قوالب مفعّلة</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileSignature className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.contracts}</p>
              <p className="text-sm text-gray-600">قوالب عقود</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Download className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsage}</p>
              <p className="text-sm text-gray-600">مرات الاستخدام</p>
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
              placeholder="بحث في القوالب..."
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
              {templateCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category);
          return (
            <div
              key={template.id}
              className={`card p-5 hover:shadow-lg transition-shadow ${!template.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <CategoryIcon className="text-primary-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {template.isDefault && (
                    <span className="badge badge-primary text-xs">افتراضي</span>
                  )}
                  <div className="relative group">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[150px] hidden group-hover:block z-10">
                      <button
                        onClick={() => handlePreview(template)}
                        className="w-full px-4 py-2 text-right text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Eye size={16} />
                        معاينة
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="w-full px-4 py-2 text-right text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 size={16} />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="w-full px-4 py-2 text-right text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy size={16} />
                        نسخ
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="w-full px-4 py-2 text-right text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="badge badge-secondary">{getCategoryName(template.category)}</span>
                <span className="text-xs text-gray-500">
                  {template.variables.length} متغير
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download size={14} />
                    {template.usageCount} استخدام
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {template.updatedAt}
                  </span>
                </div>
                <button
                  onClick={() => handlePreview(template)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  <Eye size={14} className="inline ml-1" />
                  معاينة
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500">لا توجد قوالب</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex">
            {/* Main Form */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">
                  {editingTemplate ? "تعديل القالب" : "إضافة قالب جديد"}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم القالب (عربي) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                      placeholder="مثال: عقد العمل"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم القالب (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      className="input w-full"
                      placeholder="Example: Employment Contract"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input w-full"
                    >
                      {templateCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input w-full"
                    placeholder="وصف مختصر للقالب..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      محتوى القالب <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Variable size={16} />
                      {showVariablesPanel ? "إخفاء المتغيرات" : "إظهار المتغيرات"}
                    </button>
                  </div>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input w-full font-mono text-sm"
                    rows={15}
                    placeholder="اكتب محتوى القالب هنا... استخدم المتغيرات مثل {{employee_name}} لإدراج بيانات الموظف"
                    dir="rtl"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    استخدم المتغيرات بين أقواس مزدوجة مثل {"{{employee_name}}"} وسيتم استبدالها ببيانات الموظف عند إنشاء المستند
                  </p>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={resetForm} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary"
                  disabled={!formData.name || !formData.content}
                >
                  {editingTemplate ? "حفظ التعديلات" : "إضافة القالب"}
                </button>
              </div>
            </div>

            {/* Variables Panel */}
            {showVariablesPanel && (
              <div className="w-80 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b bg-white">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Code size={18} />
                    المتغيرات المتاحة
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">اضغط على المتغير لإضافته</p>
                </div>

                <div className="p-2 border-b bg-white">
                  <div className="flex flex-wrap gap-1">
                    {variableCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveVariableCategory(cat.id)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          activeVariableCategory === cat.id
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {availableVariables
                      .filter((v) => v.category === activeVariableCategory)
                      .map((variable) => (
                        <button
                          key={variable.key}
                          onClick={() => insertVariable(variable.key)}
                          className="w-full p-2 text-right rounded-lg hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200"
                        >
                          <p className="text-sm font-medium text-gray-900">{variable.label}</p>
                          <p className="text-xs text-primary-600 font-mono">{variable.key}</p>
                          <p className="text-xs text-gray-400 mt-0.5">مثال: {variable.example}</p>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{previewTemplate.name}</h2>
                <p className="text-sm text-gray-500">معاينة القالب مع بيانات افتراضية</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed" dir="rtl">
                  {getPreviewContent(previewTemplate.content)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                المتغيرات المستخدمة: {previewTemplate.variables.length}
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  تحميل PDF
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleEdit(previewTemplate);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  تعديل القالب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
