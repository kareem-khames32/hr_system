# HR System - System Design Document
# وثيقة التصميم الفني لنظام إدارة الموارد البشرية

---

## 1. نظرة عامة (System Overview)

### 1.1 وصف النظام
نظام متكامل لإدارة الموارد البشرية يدعم اللغة العربية (RTL) ويغطي كل عمليات الـ HR من التوظيف حتى إنهاء الخدمة.

### 1.2 التقنيات المقترحة (Tech Stack)

#### Frontend (موجود حالياً)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React useState (يمكن ترقيته لـ Zustand أو Redux Toolkit)

#### Backend (مطلوب بناؤه)
- **Runtime**: Node.js + Express.js أو NestJS (مقترح NestJS للتنظيم الأفضل)
- **Language**: TypeScript
- **ORM**: Prisma أو TypeORM
- **Authentication**: JWT + Refresh Tokens
- **Authorization**: Role-Based Access Control (RBAC)
- **File Storage**: AWS S3 أو MinIO (للمستندات والصور)
- **Email**: Nodemailer + SendGrid
- **SMS**: Twilio أو حل محلي
- **PDF Generation**: Puppeteer أو PDFKit (لقسائم الراتب والتقارير)

#### Database
- **Primary**: PostgreSQL (للبيانات العلائقية)
- **Cache**: Redis (للـ Sessions والـ Caching)
- **Search**: Elasticsearch (اختياري - للبحث المتقدم)

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting**: AWS / DigitalOcean / أي VPS
- **Monitoring**: PM2 + Winston Logger

---

## 2. بنية النظام (Architecture)

### 2.1 النمط المعماري
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Dashboard │ │Employees │ │Attendance│ │ Payroll  │  ...      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └──────────┬──┴────────────┴──────────┬─┘                │
│            ┌─────┴─────┐             ┌──────┴──────┐           │
│            │ API Client│             │Auth Provider│           │
│            │  (Axios)  │             │   (JWT)     │           │
│            └─────┬─────┘             └──────┬──────┘           │
└──────────────────┼──────────────────────────┼──────────────────┘
                   │ HTTPS/REST               │
┌──────────────────┼──────────────────────────┼──────────────────┐
│                  │     API GATEWAY          │                  │
│            ┌─────┴─────────────────────┬────┘                  │
│            │    Rate Limiter           │                       │
│            │    CORS                   │                       │
│            │    Request Logger         │                       │
│            │    Auth Middleware         │                       │
│            └─────┬─────────────────────┘                       │
│                  │                                              │
│  ┌───────────────┼───────────────────────────────────────────┐ │
│  │               │    APPLICATION LAYER                       │ │
│  │  ┌────────┐ ┌─┴──────┐ ┌────────┐ ┌────────┐ ┌────────┐ │ │
│  │  │Employee│ │Attend. │ │ Leave  │ │Payroll │ │Recruit.│ │ │
│  │  │Module  │ │Module  │ │Module  │ │Module  │ │Module  │ │ │
│  │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ │ │
│  │      │          │          │          │          │        │ │
│  │  ┌───┴────┐ ┌───┴────┐ ┌──┴─────┐ ┌──┴─────┐ ┌─┴──────┐│ │
│  │  │Perform.│ │Training│ │Settings│ │Reports │ │Notific.││ │
│  │  │Module  │ │Module  │ │Module  │ │Module  │ │Module  ││ │
│  │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘│ │
│  └──────┼──────────┼──────────┼──────────┼──────────┼──────┘ │
│         └─────┬────┴─────┬────┴─────┬────┴──────┬───┘        │
│               │          │          │           │             │
│  ┌────────────┼──────────┼──────────┼───────────┼──────────┐ │
│  │            │   DATA ACCESS LAYER (ORM)       │          │ │
│  │  ┌────────┴──┐ ┌─────┴──┐ ┌─────┴───┐ ┌─────┴───┐     │ │
│  │  │PostgreSQL │ │ Redis  │ │   S3    │ │  SMTP   │     │ │
│  │  │(Database) │ │(Cache) │ │(Files)  │ │(Email)  │     │ │
│  │  └───────────┘ └────────┘ └─────────┘ └─────────┘     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 هيكل المجلدات المقترح للـ Backend
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── strategies/
│   │   │   └── guards/
│   │   │
│   │   ├── employees/
│   │   │   ├── employees.controller.ts
│   │   │   ├── employees.service.ts
│   │   │   ├── employees.dto.ts
│   │   │   └── employees.validator.ts
│   │   │
│   │   ├── attendance/
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.service.ts
│   │   │   └── attendance.dto.ts
│   │   │
│   │   ├── leaves/
│   │   │   ├── leaves.controller.ts
│   │   │   ├── leaves.service.ts
│   │   │   └── leaves.dto.ts
│   │   │
│   │   ├── payroll/
│   │   │   ├── payroll.controller.ts
│   │   │   ├── payroll.service.ts
│   │   │   ├── payroll.calculator.ts
│   │   │   └── payroll.dto.ts
│   │   │
│   │   ├── recruitment/
│   │   │   ├── recruitment.controller.ts
│   │   │   ├── recruitment.service.ts
│   │   │   └── recruitment.dto.ts
│   │   │
│   │   ├── performance/
│   │   │   ├── performance.controller.ts
│   │   │   ├── performance.service.ts
│   │   │   └── performance.dto.ts
│   │   │
│   │   ├── training/
│   │   │   ├── training.controller.ts
│   │   │   ├── training.service.ts
│   │   │   └── training.dto.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   └── documents.dto.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── notifications.gateway.ts  (WebSocket)
│   │   │
│   │   ├── reports/
│   │   │   ├── reports.controller.ts
│   │   │   └── reports.service.ts
│   │   │
│   │   └── settings/
│   │       ├── departments.controller.ts
│   │       ├── branches.controller.ts
│   │       ├── job-titles.controller.ts
│   │       ├── grades.controller.ts
│   │       ├── teams.controller.ts
│   │       ├── work-days.controller.ts
│   │       ├── policies.controller.ts
│   │       └── settings.service.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── auth.config.ts
│   │   ├── storage.config.ts
│   │   └── app.config.ts
│   │
│   ├── database/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── migrations/
│   │   └── seeds/
│   │       ├── departments.seed.ts
│   │       ├── roles.seed.ts
│   │       └── admin.seed.ts
│   │
│   └── app.ts
│
├── tests/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. وحدات النظام (System Modules)

### 3.1 وحدة المصادقة والتفويض (Auth Module)
| الوظيفة | التفاصيل |
|---------|----------|
| تسجيل دخول | Email + Password → JWT Access + Refresh Token |
| تسجيل خروج | Invalidate refresh token |
| تجديد Token | Refresh token rotation |
| نسيان كلمة المرور | OTP via Email/SMS |
| التحقق الثنائي (2FA) | TOTP (Google Authenticator) |
| RBAC | أدوار: مدير نظام، مدير HR، مدير، موظف |

### 3.2 وحدة الموظفين (Employee Module)
| العملية | الوصف |
|---------|-------|
| إنشاء موظف | إضافة موظف جديد بكل البيانات (شخصية، وظيفية، مالية) |
| تعديل موظف | تحديث بيانات الموظف |
| عرض موظف | عرض تفصيلي بكل التبويبات |
| قائمة الموظفين | عرض مع بحث وفلاتر وترقيم صفحات |
| أرشفة موظف | إنهاء خدمة / استقالة مع حساب التسوية |
| استيراد | رفع ملف Excel لاستيراد موظفين |

### 3.3 وحدة الحضور والانصراف (Attendance Module)
| العملية | الوصف |
|---------|-------|
| تسجيل حضور | تسجيل حضور تلقائي (بصمة/وجه/GPS) أو يدوي |
| تسجيل انصراف | تسجيل وقت الانصراف |
| احتساب التأخير | حساب دقائق التأخير بناء على فترة السماح |
| احتساب عمل إضافي | حساب ساعات العمل الإضافي |
| إدارة الورديات | تكوين ورديات العمل المختلفة |
| الجدول الأسبوعي | توزيع الموظفين على الورديات |
| أجهزة البصمة | تكامل مع أجهزة ZKTeco |

### 3.4 وحدة الإجازات (Leave Module)
| العملية | الوصف |
|---------|-------|
| طلب إجازة | تقديم طلب مع النوع والتواريخ والسبب |
| موافقة/رفض | workflow للموافقة من المدير |
| رصيد الإجازات | حساب الرصيد المتبقي لكل موظف |
| تقويم الإجازات | عرض بصري للإجازات |
| الإجازات الرسمية | تكوين العطل الرسمية |
| أنواع الإجازات | تكوين أنواع الإجازات مع الأرصدة |

### 3.5 وحدة الرواتب (Payroll Module)
| العملية | الوصف |
|---------|-------|
| حساب الراتب | حساب تلقائي: أساسي + بدلات - خصومات |
| البدلات | إدارة بدلات السكن والنقل وغيرها |
| الخصومات | خصومات التأخير والغياب والسلف |
| المكافآت | صرف مكافآت مع أسباب |
| التأمينات (GOSI) | حساب نسب التأمينات الاجتماعية |
| السلف والقروض | إدارة السلف مع جدول الأقساط |
| قسائم الراتب | توليد وطباعة قسائم الراتب (PDF) |
| تصدير بنكي | تصدير ملف WPS للبنوك |
| معادلات الرواتب | تكوين معادلات حساب مخصصة |

### 3.6 وحدة التوظيف (Recruitment Module)
| العملية | الوصف |
|---------|-------|
| إعلان وظيفي | نشر وظيفة شاغرة |
| استقبال طلبات | استقبال وتصنيف المتقدمين |
| جدولة مقابلات | جدولة وإدارة المقابلات |
| عروض عمل | إنشاء وإرسال عروض العمل |
| تحويل لموظف | تحويل المتقدم المقبول لموظف |

### 3.7 وحدة الأداء (Performance Module)
| العملية | الوصف |
|---------|-------|
| دورات التقييم | تكوين فترات التقييم |
| تحديد أهداف | تحديد أهداف للموظفين |
| تقييم الأداء | تقييم شامل مع كفاءات ومهارات |
| نماذج التقييم | قوالب تقييم قابلة للتخصيص |

### 3.8 وحدة التدريب (Training Module)
| العملية | الوصف |
|---------|-------|
| إنشاء دورة | إضافة دورة تدريبية |
| تسجيل موظفين | تسجيل الموظفين في الدورات |
| تتبع التقدم | متابعة إتمام الدورات |
| الشهادات | إصدار شهادات الإتمام |

### 3.9 وحدة المستندات (Documents Module)
| العملية | الوصف |
|---------|-------|
| رفع مستند | رفع مستند مع بيانات وصفية |
| معاينة | عرض المستندات |
| تتبع الصلاحية | تنبيهات انتهاء المستندات |
| قوالب المستندات | توليد مستندات من قوالب (عقود، خطابات) |

### 3.10 وحدة الإشعارات (Notifications Module)
| القناة | التفاصيل |
|--------|----------|
| داخل النظام | إشعارات فورية عبر WebSocket |
| بريد إلكتروني | إشعارات عبر SMTP |
| SMS | رسائل نصية (اختياري) |

---

## 4. واجهات API (API Endpoints)

### 4.1 Auth
```
POST   /api/auth/login                    # تسجيل دخول
POST   /api/auth/logout                   # تسجيل خروج
POST   /api/auth/refresh                  # تجديد token
POST   /api/auth/forgot-password          # نسيان كلمة المرور
POST   /api/auth/reset-password           # إعادة تعيين كلمة المرور
POST   /api/auth/verify-2fa              # التحقق الثنائي
GET    /api/auth/me                       # بيانات المستخدم الحالي
```

### 4.2 Employees
```
GET    /api/employees                      # قائمة مع فلاتر وباجيناشن
GET    /api/employees/:id                  # تفاصيل موظف
POST   /api/employees                      # إضافة موظف
PUT    /api/employees/:id                  # تعديل موظف
DELETE /api/employees/:id                  # حذف (soft delete)
POST   /api/employees/:id/archive         # أرشفة مع سبب
POST   /api/employees/:id/restore         # استعادة من الأرشيف
POST   /api/employees/:id/settlement      # حساب التسوية
POST   /api/employees/import              # استيراد من Excel
GET    /api/employees/export              # تصدير لـ Excel
GET    /api/employees/org-chart           # بيانات الهيكل التنظيمي
```

### 4.3 Attendance
```
GET    /api/attendance                     # سجل الحضور (بفلتر يوم)
POST   /api/attendance/check-in           # تسجيل حضور
POST   /api/attendance/check-out          # تسجيل انصراف
POST   /api/attendance/manual-entry       # إدخال يدوي
GET    /api/attendance/weekly-schedule     # الجدول الأسبوعي
PUT    /api/attendance/weekly-schedule     # تحديث الجدول
GET    /api/attendance/shifts             # الورديات
POST   /api/attendance/shifts             # إضافة وردية
PUT    /api/attendance/shifts/:id         # تعديل وردية
DELETE /api/attendance/shifts/:id         # حذف وردية
GET    /api/attendance/overtime            # العمل الإضافي
POST   /api/attendance/overtime/approve   # موافقة على عمل إضافي
GET    /api/attendance/permissions        # الأذونات
POST   /api/attendance/permissions        # طلب إذن
GET    /api/attendance/devices            # أجهزة البصمة
POST   /api/attendance/devices            # إضافة جهاز
GET    /api/attendance/reports            # تقارير الحضور
```

### 4.4 Leaves
```
GET    /api/leaves                         # قائمة طلبات الإجازات
GET    /api/leaves/:id                     # تفاصيل طلب
POST   /api/leaves                         # تقديم طلب إجازة
PATCH  /api/leaves/:id/approve            # موافقة
PATCH  /api/leaves/:id/reject             # رفض
PATCH  /api/leaves/:id/cancel             # إلغاء
GET    /api/leaves/balance/:employeeId    # رصيد الإجازات
GET    /api/leaves/calendar               # تقويم الإجازات
GET    /api/leaves/types                  # أنواع الإجازات
POST   /api/leaves/types                  # إضافة نوع
PUT    /api/leaves/types/:id              # تعديل نوع
GET    /api/leaves/holidays               # الإجازات الرسمية
POST   /api/leaves/holidays               # إضافة إجازة رسمية
```

### 4.5 Payroll
```
GET    /api/payroll                        # مسير الرواتب (بفلتر فترة)
POST   /api/payroll/process               # حساب رواتب الشهر
GET    /api/payroll/:id                    # تفاصيل راتب موظف
PUT    /api/payroll/:id/adjust            # تعديل (مكافأة/خصم)
PATCH  /api/payroll/:id/approve           # اعتماد
PATCH  /api/payroll/approve-all           # اعتماد الكل
POST   /api/payroll/export/bank           # تصدير ملف بنكي
POST   /api/payroll/export/gosi           # تصدير ملف GOSI
GET    /api/payroll/payslip/:employeeId   # قسيمة الراتب
GET    /api/payroll/payslip/:id/pdf       # تحميل قسيمة PDF
GET    /api/payroll/allowances            # البدلات
POST   /api/payroll/allowances            # إضافة بدل
GET    /api/payroll/deductions            # الخصومات
POST   /api/payroll/deductions            # إضافة خصم
GET    /api/payroll/bonuses               # المكافآت
POST   /api/payroll/bonuses               # صرف مكافأة
GET    /api/payroll/loans                 # السلف والقروض
POST   /api/payroll/loans                 # إضافة سلفة
GET    /api/payroll/formulas              # معادلات الرواتب
POST   /api/payroll/formulas              # إضافة معادلة
GET    /api/payroll/gosi                  # بيانات التأمينات
GET    /api/payroll/reports               # التقارير المالية
```

### 4.6 Contracts
```
GET    /api/contracts                      # قائمة العقود
GET    /api/contracts/:id                  # تفاصيل عقد
POST   /api/contracts                      # إنشاء عقد
PUT    /api/contracts/:id                  # تعديل عقد
POST   /api/contracts/:id/renew           # تجديد عقد
POST   /api/contracts/:id/terminate       # إنهاء عقد
GET    /api/contracts/expiring            # العقود القريبة من الانتهاء
```

### 4.7 Documents
```
GET    /api/documents                      # قائمة المستندات
GET    /api/documents/:id                  # تفاصيل مستند
POST   /api/documents/upload              # رفع مستند (multipart)
DELETE /api/documents/:id                  # حذف مستند
GET    /api/documents/:id/download        # تحميل مستند
GET    /api/documents/expiring            # المستندات المنتهية
POST   /api/documents/generate            # توليد من قالب
GET    /api/documents/templates           # قوالب المستندات
POST   /api/documents/templates           # إضافة قالب
```

### 4.8 Recruitment
```
GET    /api/recruitment/jobs               # الوظائف الشاغرة
GET    /api/recruitment/jobs/:id           # تفاصيل وظيفة
POST   /api/recruitment/jobs               # إنشاء وظيفة
PUT    /api/recruitment/jobs/:id           # تعديل وظيفة
GET    /api/recruitment/applicants         # المتقدمين
GET    /api/recruitment/applicants/:id     # تفاصيل متقدم
POST   /api/recruitment/applicants         # إضافة متقدم
PATCH  /api/recruitment/applicants/:id     # تحديث حالة
GET    /api/recruitment/interviews         # المقابلات
POST   /api/recruitment/interviews         # جدولة مقابلة
GET    /api/recruitment/offers             # عروض العمل
POST   /api/recruitment/offers             # إنشاء عرض
PATCH  /api/recruitment/offers/:id         # تحديث حالة عرض
POST   /api/recruitment/offers/:id/convert # تحويل لموظف
```

### 4.9 Performance
```
GET    /api/performance/reviews            # التقييمات
GET    /api/performance/reviews/:id        # تفاصيل تقييم
POST   /api/performance/reviews            # إنشاء تقييم
PUT    /api/performance/reviews/:id        # تعديل تقييم
PATCH  /api/performance/reviews/:id/approve # اعتماد تقييم
GET    /api/performance/goals              # الأهداف
POST   /api/performance/goals              # إضافة هدف
PUT    /api/performance/goals/:id          # تعديل هدف
GET    /api/performance/cycles             # دورات التقييم
POST   /api/performance/cycles             # إنشاء دورة
GET    /api/performance/templates          # نماذج التقييم
POST   /api/performance/templates          # إنشاء نموذج
```

### 4.10 Training
```
GET    /api/training/courses               # الدورات التدريبية
GET    /api/training/courses/:id           # تفاصيل دورة
POST   /api/training/courses               # إنشاء دورة
PUT    /api/training/courses/:id           # تعديل دورة
POST   /api/training/courses/:id/enroll   # تسجيل موظف
GET    /api/training/my-courses            # دوراتي
PATCH  /api/training/enrollment/:id        # تحديث تقدم
GET    /api/training/certificates          # الشهادات
POST   /api/training/certificates          # إصدار شهادة
```

### 4.11 Settings
```
# Branches
GET/POST/PUT/DELETE  /api/settings/branches

# Departments
GET/POST/PUT/DELETE  /api/settings/departments

# Teams
GET/POST/PUT/DELETE  /api/settings/teams

# Job Titles
GET/POST/PUT/DELETE  /api/settings/job-titles

# Grades
GET/POST/PUT/DELETE  /api/settings/grades

# Work Days
GET/PUT              /api/settings/work-days

# Policies
GET/POST/PUT/DELETE  /api/settings/policies

# Approvals
GET/POST/PUT         /api/settings/approvals

# Users
GET/POST/PUT/DELETE  /api/settings/users

# Roles
GET/POST/PUT/DELETE  /api/settings/roles

# Company Info
GET/PUT              /api/settings/company
```

### 4.12 Notifications
```
GET    /api/notifications                  # قائمة الإشعارات
PATCH  /api/notifications/:id/read        # تعيين كمقروء
PATCH  /api/notifications/read-all        # تعيين الكل كمقروء
DELETE /api/notifications/:id             # حذف إشعار
GET    /api/notifications/settings        # إعدادات الإشعارات
PUT    /api/notifications/settings        # تحديث الإعدادات
```

### 4.13 Calendar
```
GET    /api/calendar/events               # كل الأحداث (بفلتر شهر)
POST   /api/calendar/events               # إضافة حدث
PUT    /api/calendar/events/:id           # تعديل حدث
DELETE /api/calendar/events/:id           # حذف حدث
```

### 4.14 Reports & Dashboard
```
GET    /api/dashboard/stats               # إحصائيات لوحة التحكم
GET    /api/dashboard/charts              # بيانات الرسوم البيانية
GET    /api/dashboard/recent-activities   # آخر النشاطات
GET    /api/dashboard/pending-approvals   # الموافقات المعلقة
GET    /api/reports/attendance             # تقارير الحضور
GET    /api/reports/payroll               # تقارير الرواتب
GET    /api/reports/leaves                # تقارير الإجازات
GET    /api/reports/employees             # تقارير الموظفين
GET    /api/reports/recruitment           # تقارير التوظيف
GET    /api/reports/custom                # تقرير مخصص
```

---

## 5. الأمان (Security)

### 5.1 المصادقة
- JWT Access Token (صلاحية 15 دقيقة)
- Refresh Token (صلاحية 7 أيام)
- HttpOnly Secure Cookies
- Token rotation عند كل refresh

### 5.2 التفويض (RBAC)
```
الأدوار:
├── super_admin     → كل الصلاحيات
├── hr_manager      → إدارة الموظفين، الرواتب، الإجازات، التوظيف
├── manager         → موافقة إجازات فريقه، تقييم موظفيه
└── employee        → بياناته فقط، طلب إجازة، دوراته

الصلاحيات (Permissions):
├── employees:read, employees:create, employees:update, employees:delete
├── attendance:read, attendance:manage
├── leaves:read, leaves:request, leaves:approve
├── payroll:read, payroll:process, payroll:approve
├── recruitment:read, recruitment:manage
├── performance:read, performance:review
├── training:read, training:manage
├── documents:read, documents:upload, documents:delete
├── settings:read, settings:manage
├── reports:read
└── notifications:manage
```

### 5.3 حماية إضافية
- Rate limiting (100 req/min per IP)
- CORS configuration
- Helmet.js headers
- Input sanitization (XSS prevention)
- SQL injection prevention (via ORM)
- File upload validation (type, size, virus scan)
- Audit logging (كل عملية مهمة تسجل)

---

## 6. الأداء والتوسع (Performance & Scalability)

### 6.1 Caching Strategy
- Redis cache لـ session data
- Cache employee list (invalidate on update)
- Cache dashboard stats (TTL: 5 minutes)
- Cache organization chart (invalidate on structure change)

### 6.2 Database Optimization
- Indexes على الحقول المستخدمة في البحث والفلترة
- Pagination لكل القوائم
- Lazy loading للعلاقات
- Database connection pooling

### 6.3 File Storage
- S3-compatible storage للمستندات
- Thumbnail generation للصور
- PDF generation queue (background jobs)

---

## 7. البيئات (Environments)

```
development:
  - Local PostgreSQL
  - Local Redis
  - Local MinIO (S3 compatible)
  - Mailtrap (email testing)

staging:
  - Cloud PostgreSQL
  - Cloud Redis
  - AWS S3
  - SendGrid (email)

production:
  - Cloud PostgreSQL (with replicas)
  - Cloud Redis (cluster)
  - AWS S3 (with CDN)
  - SendGrid (email)
  - Twilio (SMS)
```

---

## 8. متغيرات البيئة (.env)

```env
# App
NODE_ENV=development
PORT=3001
API_PREFIX=/api
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hr_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Storage (S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=hr-documents

# Email
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM=noreply@advtech.com.sa

# Company
DEFAULT_COMPANY_NAME=شركة التقنية المتقدمة
DEFAULT_CURRENCY=SAR
DEFAULT_TIMEZONE=Asia/Riyadh
DEFAULT_LOCALE=ar-SA
```
