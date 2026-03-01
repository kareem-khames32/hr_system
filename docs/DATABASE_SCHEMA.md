# HR System - Database Schema & Relationships
# مخطط قاعدة البيانات والعلاقات

---

## 1. نظرة عامة على الجداول

```
إجمالي الجداول: 38 جدول

الأساسية (Core):
  ├── companies
  ├── branches
  ├── departments
  ├── teams
  ├── job_titles
  ├── grades
  └── employees

المصادقة (Auth):
  ├── users
  ├── roles
  ├── permissions
  ├── role_permissions
  └── user_sessions

الحضور (Attendance):
  ├── attendance_records
  ├── shifts
  ├── shift_assignments
  ├── overtime_records
  └── permission_requests

الإجازات (Leaves):
  ├── leave_types
  ├── leave_balances
  ├── leave_requests
  └── holidays

الرواتب (Payroll):
  ├── payroll_periods
  ├── payroll_records
  ├── allowance_types
  ├── employee_allowances
  ├── deduction_types
  ├── employee_deductions
  ├── bonuses
  ├── loans
  └── loan_installments

العقود والمستندات:
  ├── contracts
  ├── document_types
  ├── documents
  └── document_templates

التوظيف (Recruitment):
  ├── job_postings
  ├── applicants
  ├── interviews
  └── job_offers

الأداء (Performance):
  ├── review_cycles
  ├── review_templates
  ├── performance_reviews
  └── goals

التدريب (Training):
  ├── courses
  ├── course_enrollments
  └── certificates

عام:
  ├── notifications
  ├── calendar_events
  └── audit_logs
```

---

## 2. مخطط الجداول التفصيلي (Detailed Schema)

### 2.1 Company & Organization

#### `companies`
```sql
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar         VARCHAR(255) NOT NULL,          -- اسم الشركة بالعربي
    name_en         VARCHAR(255),                    -- اسم الشركة بالإنجليزي
    short_name      VARCHAR(50),                     -- الاسم المختصر
    logo_url        VARCHAR(500),                    -- رابط الشعار
    commercial_reg  VARCHAR(50),                     -- رقم السجل التجاري
    tax_number      VARCHAR(50),                     -- الرقم الضريبي
    gosi_number     VARCHAR(50),                     -- رقم التأمينات
    country         VARCHAR(5) DEFAULT 'SA',         -- كود البلد
    city            VARCHAR(100),                    -- المدينة
    address         TEXT,                            -- العنوان التفصيلي
    phone           VARCHAR(20),                     -- الهاتف
    email           VARCHAR(255),                    -- البريد الإلكتروني
    website         VARCHAR(255),                    -- الموقع الإلكتروني
    currency        VARCHAR(5) DEFAULT 'SAR',        -- العملة
    timezone        VARCHAR(50) DEFAULT 'Asia/Riyadh',
    locale          VARCHAR(10) DEFAULT 'ar-SA',
    date_format     VARCHAR(20) DEFAULT 'YYYY/MM/DD',
    calendar_system VARCHAR(20) DEFAULT 'gregorian', -- gregorian | hijri | both
    week_start      VARCHAR(10) DEFAULT 'sunday',
    weekend_days    JSONB DEFAULT '["friday","saturday"]',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `branches`
```sql
CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    code            VARCHAR(20) UNIQUE NOT NULL,     -- كود الفرع
    city            VARCHAR(100),
    address         TEXT,
    phone           VARCHAR(20),
    manager_id      UUID REFERENCES employees(id),   -- مدير الفرع
    is_headquarters BOOLEAN DEFAULT FALSE,           -- هل هو المقر الرئيسي
    is_active       BOOLEAN DEFAULT TRUE,
    employees_count INTEGER DEFAULT 0,               -- عدد الموظفين (computed)
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `departments`
```sql
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    parent_id       UUID REFERENCES departments(id), -- للهيكل الهرمي
    branch_id       UUID REFERENCES branches(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    code            VARCHAR(20) UNIQUE NOT NULL,
    manager_id      UUID REFERENCES employees(id),   -- مدير القسم
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    employees_count INTEGER DEFAULT 0,               -- computed
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_branch ON departments(branch_id);
```

#### `teams`
```sql
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id   UUID NOT NULL REFERENCES departments(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    code            VARCHAR(20) UNIQUE NOT NULL,
    leader_id       UUID REFERENCES employees(id),   -- قائد الفريق
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    members_count   INTEGER DEFAULT 0,               -- computed
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `grades`
```sql
CREATE TABLE grades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name            VARCHAR(100) NOT NULL,           -- مثل: Grade 1, Grade 2
    level           INTEGER NOT NULL,                -- 1-10
    min_salary      DECIMAL(12,2),                   -- الحد الأدنى للراتب
    max_salary      DECIMAL(12,2),                   -- الحد الأقصى
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `job_titles`
```sql
CREATE TABLE job_titles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    department_id   UUID REFERENCES departments(id),
    grade_id        UUID REFERENCES grades(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    code            VARCHAR(20) UNIQUE NOT NULL,
    level           VARCHAR(20) NOT NULL,            -- entry | professional | senior | manager | executive
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    employees_count INTEGER DEFAULT 0,               -- computed
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.2 Employees

#### `employees`
```sql
CREATE TABLE employees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES companies(id),
    employee_number     VARCHAR(20) UNIQUE NOT NULL,  -- EMP001, EMP002...

    -- البيانات الشخصية
    first_name_ar       VARCHAR(100) NOT NULL,
    last_name_ar        VARCHAR(100) NOT NULL,
    first_name_en       VARCHAR(100),
    last_name_en        VARCHAR(100),
    email               VARCHAR(255) UNIQUE NOT NULL,
    personal_email      VARCHAR(255),
    phone               VARCHAR(20),
    phone_alt           VARCHAR(20),
    nationality         VARCHAR(100),
    national_id         VARCHAR(50),
    passport_number     VARCHAR(50),
    passport_expiry     DATE,
    birth_date          DATE,
    birth_place         VARCHAR(100),
    gender              VARCHAR(10) NOT NULL,          -- male | female
    marital_status      VARCHAR(20),                   -- single | married | divorced | widowed
    children_count      INTEGER DEFAULT 0,
    address             TEXT,
    avatar_url          VARCHAR(500),

    -- البيانات الوظيفية
    department_id       UUID REFERENCES departments(id),
    team_id             UUID REFERENCES teams(id),
    branch_id           UUID REFERENCES branches(id),
    job_title_id        UUID REFERENCES job_titles(id),
    grade_id            UUID REFERENCES grades(id),
    manager_id          UUID REFERENCES employees(id), -- المدير المباشر
    join_date           DATE NOT NULL,
    employment_type     VARCHAR(20) DEFAULT 'full_time', -- full_time | part_time
    status              VARCHAR(20) DEFAULT 'active',    -- active | probation | suspended | resigned | terminated

    -- البيانات المالية
    basic_salary        DECIMAL(12,2) NOT NULL DEFAULT 0,
    bank_name           VARCHAR(100),
    iban                VARCHAR(50),

    -- بيانات النظام
    user_id             UUID REFERENCES users(id),    -- حساب المستخدم المرتبط
    archived_at         TIMESTAMP,                     -- تاريخ الأرشفة
    archive_reason      VARCHAR(50),                   -- resignation | termination | end_of_contract
    archive_notes       TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    -- Soft delete
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_name ON employees(first_name_ar, last_name_ar);
```

---

### 2.3 Authentication & Authorization

#### `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    employee_id     UUID REFERENCES employees(id),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN DEFAULT TRUE,
    is_2fa_enabled  BOOLEAN DEFAULT FALSE,
    two_fa_secret   VARCHAR(255),
    last_login_at   TIMESTAMP,
    last_login_ip   VARCHAR(50),
    password_changed_at TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `roles`
```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(50) UNIQUE NOT NULL,     -- super_admin | hr_manager | manager | employee
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,           -- أدوار نظامية لا تحذف
    users_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `permissions`
```sql
CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module          VARCHAR(50) NOT NULL,            -- employees | attendance | leaves | payroll...
    action          VARCHAR(50) NOT NULL,            -- read | create | update | delete | approve
    code            VARCHAR(100) UNIQUE NOT NULL,    -- employees:read, leaves:approve
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `role_permissions`
```sql
CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope           VARCHAR(20) DEFAULT 'all',       -- all | team | self
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);
```

#### `user_sessions`
```sql
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(500) NOT NULL,
    ip_address      VARCHAR(50),
    user_agent      TEXT,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token);
```

---

### 2.4 Attendance

#### `shifts`
```sql
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(20),
    start_time      TIME NOT NULL,                   -- 08:00
    end_time        TIME NOT NULL,                   -- 17:00
    break_duration  INTEGER DEFAULT 60,              -- فترة الراحة بالدقائق
    grace_period    INTEGER DEFAULT 15,              -- فترة السماح بالدقائق
    work_days       JSONB NOT NULL,                  -- {"sunday": true, "monday": true, ...}
    color           VARCHAR(10),
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `shift_assignments`
```sql
CREATE TABLE shift_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    shift_id        UUID NOT NULL REFERENCES shifts(id),
    start_date      DATE NOT NULL,
    end_date        DATE,                            -- NULL = دائم
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `attendance_records`
```sql
CREATE TABLE attendance_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    date                DATE NOT NULL,
    check_in            TIMESTAMP,
    check_out           TIMESTAMP,
    work_hours          DECIMAL(5,2),                -- ساعات العمل
    overtime_hours      DECIMAL(5,2) DEFAULT 0,      -- ساعات إضافية
    late_minutes        INTEGER DEFAULT 0,           -- دقائق التأخير
    early_leave_minutes INTEGER DEFAULT 0,           -- دقائق الخروج المبكر
    status              VARCHAR(20) NOT NULL,        -- present | absent | late | early_leave | on_leave | holiday
    verification_method VARCHAR(20),                 -- face | fingerprint | card | gps | manual
    check_in_location   VARCHAR(255),                -- موقع الحضور
    check_out_location  VARCHAR(255),                -- موقع الانصراف
    notes               TEXT,
    is_manual           BOOLEAN DEFAULT FALSE,       -- إدخال يدوي
    approved_by         UUID REFERENCES users(id),   -- من اعتمد (للإدخال اليدوي)
    shift_id            UUID REFERENCES shifts(id),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(employee_id, date)                        -- سجل واحد لكل موظف في اليوم
);

CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
```

#### `overtime_records`
```sql
CREATE TABLE overtime_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    date            DATE NOT NULL,
    hours           DECIMAL(5,2) NOT NULL,
    rate            DECIMAL(3,1) DEFAULT 1.5,        -- معدل الحساب 1.5x أو 2x
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `permission_requests`
```sql
CREATE TABLE permission_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    date            DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    duration_hours  DECIMAL(5,2),
    reason          TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.5 Leaves

#### `leave_types`
```sql
CREATE TABLE leave_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(20) UNIQUE NOT NULL,     -- annual | sick | emergency...
    annual_days     INTEGER NOT NULL,                -- الرصيد السنوي
    is_paid         BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    requires_attachment BOOLEAN DEFAULT FALSE,       -- هل يتطلب مرفق (مثل المرضية)
    color           VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `leave_balances`
```sql
CREATE TABLE leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    year            INTEGER NOT NULL,                -- السنة
    total_days      DECIMAL(5,1) NOT NULL,           -- الرصيد الكلي
    used_days       DECIMAL(5,1) DEFAULT 0,          -- المستخدم
    remaining_days  DECIMAL(5,1),                    -- المتبقي (computed)
    carried_over    DECIMAL(5,1) DEFAULT 0,          -- مرحّل من السنة السابقة
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);
```

#### `leave_requests`
```sql
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days            DECIMAL(5,1) NOT NULL,           -- عدد الأيام
    reason          TEXT,
    attachment_url  VARCHAR(500),                     -- مرفق (شهادة طبية مثلاً)
    status          VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected | cancelled
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    rejection_reason TEXT,
    submitted_at    TIMESTAMP DEFAULT NOW(),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
```

#### `holidays`
```sql
CREATE TABLE holidays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days            INTEGER NOT NULL,
    type            VARCHAR(20),                     -- national | religious | company
    is_recurring    BOOLEAN DEFAULT FALSE,           -- تتكرر سنوياً
    year            INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.6 Payroll

#### `payroll_periods`
```sql
CREATE TABLE payroll_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    month           INTEGER NOT NULL,                -- 1-12
    year            INTEGER NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft',     -- draft | calculated | approved | paid
    total_earnings  DECIMAL(14,2) DEFAULT 0,
    total_deductions DECIMAL(14,2) DEFAULT 0,
    total_net       DECIMAL(14,2) DEFAULT 0,
    employees_count INTEGER DEFAULT 0,
    calculated_at   TIMESTAMP,
    calculated_by   UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, month, year)
);
```

#### `payroll_records`
```sql
CREATE TABLE payroll_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id   UUID NOT NULL REFERENCES payroll_periods(id),
    employee_id         UUID NOT NULL REFERENCES employees(id),

    -- المستحقات (Earnings)
    basic_salary        DECIMAL(12,2) NOT NULL,
    housing_allowance   DECIMAL(12,2) DEFAULT 0,
    transport_allowance DECIMAL(12,2) DEFAULT 0,
    other_allowances    DECIMAL(12,2) DEFAULT 0,
    overtime_amount     DECIMAL(12,2) DEFAULT 0,
    bonus_amount        DECIMAL(12,2) DEFAULT 0,
    total_earnings      DECIMAL(12,2) NOT NULL,

    -- الخصومات (Deductions)
    gosi_deduction      DECIMAL(12,2) DEFAULT 0,      -- التأمينات
    absence_deduction   DECIMAL(12,2) DEFAULT 0,      -- خصم الغياب
    late_deduction      DECIMAL(12,2) DEFAULT 0,      -- خصم التأخير
    loan_deduction      DECIMAL(12,2) DEFAULT 0,      -- قسط السلفة
    other_deductions    DECIMAL(12,2) DEFAULT 0,
    total_deductions    DECIMAL(12,2) NOT NULL,

    -- الصافي
    net_salary          DECIMAL(12,2) NOT NULL,

    -- بيانات إضافية
    working_days        INTEGER,                       -- أيام العمل الفعلية
    absent_days         INTEGER DEFAULT 0,
    late_count          INTEGER DEFAULT 0,
    overtime_hours      DECIMAL(5,2) DEFAULT 0,

    -- بيانات البنك
    bank_name           VARCHAR(100),
    iban                VARCHAR(50),

    status              VARCHAR(20) DEFAULT 'calculated', -- calculated | approved | paid
    notes               TEXT,
    adjustments         JSONB,                         -- تعديلات يدوية

    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(payroll_period_id, employee_id)
);

CREATE INDEX idx_payroll_records_period ON payroll_records(payroll_period_id);
CREATE INDEX idx_payroll_records_employee ON payroll_records(employee_id);
```

#### `allowance_types`
```sql
CREATE TABLE allowance_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(20) UNIQUE NOT NULL,     -- housing | transport | food...
    calculation     VARCHAR(20) NOT NULL,            -- fixed | percentage
    default_value   DECIMAL(12,2),                   -- القيمة الافتراضية
    percentage_of   VARCHAR(20),                     -- basic_salary (إذا كان نسبة)
    is_taxable      BOOLEAN DEFAULT TRUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `employee_allowances`
```sql
CREATE TABLE employee_allowances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    allowance_type_id UUID NOT NULL REFERENCES allowance_types(id),
    amount          DECIMAL(12,2) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `deduction_types`
```sql
CREATE TABLE deduction_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(20) UNIQUE NOT NULL,
    calculation     VARCHAR(20) NOT NULL,            -- fixed | percentage | formula
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `bonuses`
```sql
CREATE TABLE bonuses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    payroll_period_id UUID REFERENCES payroll_periods(id),
    amount          DECIMAL(12,2) NOT NULL,
    reason          TEXT NOT NULL,
    type            VARCHAR(20),                     -- performance | project | annual | other
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `loans`
```sql
CREATE TABLE loans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    amount          DECIMAL(12,2) NOT NULL,          -- مبلغ السلفة
    remaining       DECIMAL(12,2) NOT NULL,          -- المتبقي
    monthly_installment DECIMAL(12,2) NOT NULL,      -- القسط الشهري
    installments_count INTEGER NOT NULL,             -- عدد الأقساط
    paid_installments INTEGER DEFAULT 0,             -- المدفوع
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'active',    -- active | completed | cancelled
    start_date      DATE NOT NULL,
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `loan_installments`
```sql
CREATE TABLE loan_installments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id         UUID NOT NULL REFERENCES loans(id),
    payroll_period_id UUID REFERENCES payroll_periods(id),
    amount          DECIMAL(12,2) NOT NULL,
    due_date        DATE NOT NULL,
    paid_date       DATE,
    status          VARCHAR(20) DEFAULT 'pending',   -- pending | paid | skipped
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.7 Contracts

#### `contracts`
```sql
CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    contract_number VARCHAR(50) UNIQUE,
    type            VARCHAR(20) NOT NULL,            -- permanent | fixed | probation | parttime
    start_date      DATE NOT NULL,
    end_date        DATE,                            -- NULL for permanent
    salary          DECIMAL(12,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',    -- active | expiring | expired | renewed | terminated
    renewal_count   INTEGER DEFAULT 0,
    last_renewal_date DATE,
    terms           TEXT,                            -- شروط العقد
    notes           TEXT,
    signed_at       DATE,
    terminated_at   DATE,
    termination_reason TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contracts_employee ON contracts(employee_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
```

---

### 2.8 Documents

#### `document_types`
```sql
CREATE TABLE document_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    code            VARCHAR(20) UNIQUE NOT NULL,
    category        VARCHAR(50) NOT NULL,            -- contracts | personal | certificates | insurance | other
    is_required     BOOLEAN DEFAULT FALSE,           -- مطلوب من كل موظف
    has_expiry      BOOLEAN DEFAULT FALSE,           -- له تاريخ انتهاء
    expiry_alert_days INTEGER DEFAULT 30,            -- تنبيه قبل كم يوم
    max_file_size   INTEGER DEFAULT 10,              -- حد أقصى بالميجا
    allowed_types   VARCHAR(100) DEFAULT 'pdf,jpg,png,doc,docx',
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `documents`
```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    name            VARCHAR(255) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,           -- رابط الملف في S3
    file_type       VARCHAR(20) NOT NULL,            -- pdf | jpg | png | doc
    file_size       INTEGER,                         -- الحجم بالبايت
    upload_date     DATE DEFAULT CURRENT_DATE,
    expiry_date     DATE,
    status          VARCHAR(20) DEFAULT 'valid',     -- valid | expiring | expired
    description     TEXT,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);
```

#### `document_templates`
```sql
CREATE TABLE document_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    type            VARCHAR(50) NOT NULL,            -- contract | salary_cert | experience_cert | bank_letter...
    content         TEXT NOT NULL,                   -- محتوى القالب مع متغيرات {{employee_name}}
    variables       JSONB,                           -- قائمة المتغيرات المتاحة
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.9 Recruitment

#### `job_postings`
```sql
CREATE TABLE job_postings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    department_id   UUID REFERENCES departments(id),
    job_title_id    UUID REFERENCES job_titles(id),
    title_ar        VARCHAR(255) NOT NULL,
    title_en        VARCHAR(255),
    description     TEXT,
    requirements    TEXT,
    location        VARCHAR(100),
    type            VARCHAR(20) NOT NULL,            -- full_time | part_time | contract | remote
    experience_min  INTEGER,                         -- الحد الأدنى للخبرة (سنوات)
    experience_max  INTEGER,
    salary_min      DECIMAL(12,2),
    salary_max      DECIMAL(12,2),
    vacancies       INTEGER DEFAULT 1,               -- عدد الشواغر
    status          VARCHAR(20) DEFAULT 'draft',     -- draft | active | paused | closed
    posted_date     DATE,
    closing_date    DATE,
    applicants_count INTEGER DEFAULT 0,              -- computed
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `applicants`
```sql
CREATE TABLE applicants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id  UUID NOT NULL REFERENCES job_postings(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    resume_url      VARCHAR(500),                    -- رابط السيرة الذاتية
    cover_letter    TEXT,
    experience_years INTEGER,
    current_company VARCHAR(255),
    current_title   VARCHAR(255),
    expected_salary DECIMAL(12,2),
    source          VARCHAR(50),                     -- linkedin | website | referral | agency
    status          VARCHAR(20) DEFAULT 'new',       -- new | screening | interview | technical | offer | hired | rejected
    rating          INTEGER,                         -- 1-5 تقييم HR
    notes           TEXT,
    applied_at      TIMESTAMP DEFAULT NOW(),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_applicants_job ON applicants(job_posting_id);
CREATE INDEX idx_applicants_status ON applicants(status);
```

#### `interviews`
```sql
CREATE TABLE interviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id    UUID NOT NULL REFERENCES applicants(id),
    interviewer_id  UUID NOT NULL REFERENCES employees(id),
    scheduled_at    TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    type            VARCHAR(20) NOT NULL,            -- phone | in_person | video
    round           INTEGER DEFAULT 1,               -- جولة المقابلة
    location        VARCHAR(255),
    meeting_link    VARCHAR(500),                     -- لمقابلات الفيديو
    status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled | completed | cancelled | no_show
    rating          INTEGER,                         -- 1-5
    feedback        TEXT,
    result          VARCHAR(20),                     -- pass | fail | pending
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `job_offers`
```sql
CREATE TABLE job_offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id    UUID NOT NULL REFERENCES applicants(id),
    job_posting_id  UUID NOT NULL REFERENCES job_postings(id),
    salary          DECIMAL(12,2) NOT NULL,
    start_date      DATE NOT NULL,
    contract_type   VARCHAR(20) NOT NULL,
    benefits        TEXT,
    terms           TEXT,
    status          VARCHAR(20) DEFAULT 'draft',     -- draft | sent | accepted | rejected | negotiating | withdrawn
    sent_at         TIMESTAMP,
    responded_at    TIMESTAMP,
    expiry_date     DATE,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.10 Performance

#### `review_cycles`
```sql
CREATE TABLE review_cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    type            VARCHAR(20) NOT NULL,            -- annual | semi_annual | quarterly
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    review_start    DATE NOT NULL,                   -- فترة التقييم
    review_end      DATE NOT NULL,
    template_id     UUID REFERENCES review_templates(id),
    status          VARCHAR(20) DEFAULT 'draft',     -- draft | active | completed | closed
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `review_templates`
```sql
CREATE TABLE review_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name_ar         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    description     TEXT,
    competencies    JSONB NOT NULL,                  -- [{name, weight, description}]
    rating_scale    INTEGER DEFAULT 5,               -- مقياس التقييم (1-5)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `performance_reviews`
```sql
CREATE TABLE performance_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID NOT NULL REFERENCES review_cycles(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    reviewer_id     UUID NOT NULL REFERENCES employees(id),

    -- التقييم الذاتي
    self_assessment JSONB,                           -- {competencies: [{name, score, comment}]}
    self_comments   TEXT,

    -- تقييم المدير
    manager_assessment JSONB,                        -- {competencies: [{name, score, comment}]}
    manager_comments TEXT,
    strengths       TEXT,                            -- نقاط القوة
    improvements    TEXT,                            -- نقاط التحسين

    -- النتيجة
    overall_score   DECIMAL(3,1),                    -- الدرجة الإجمالية
    goals_completed INTEGER DEFAULT 0,
    goals_total     INTEGER DEFAULT 0,

    status          VARCHAR(20) DEFAULT 'pending',   -- pending | self_review | manager_review | completed | approved
    completed_at    TIMESTAMP,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_reviews_cycle ON performance_reviews(cycle_id);
```

#### `goals`
```sql
CREATE TABLE goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    cycle_id        UUID REFERENCES review_cycles(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    target          VARCHAR(255),                    -- الهدف المحدد
    weight          INTEGER DEFAULT 0,               -- الوزن (نسبة مئوية)
    progress        INTEGER DEFAULT 0,               -- نسبة الإنجاز 0-100
    status          VARCHAR(20) DEFAULT 'active',    -- active | completed | cancelled
    due_date        DATE,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goals_employee ON goals(employee_id);
```

---

### 2.11 Training

#### `courses`
```sql
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    title_ar        VARCHAR(255) NOT NULL,
    title_en        VARCHAR(255),
    description     TEXT,
    category        VARCHAR(100),                    -- قيادة | تقنية | موارد بشرية...
    instructor      VARCHAR(255),
    duration_hours  INTEGER,
    lessons_count   INTEGER DEFAULT 0,
    level           VARCHAR(20),                     -- beginner | intermediate | advanced
    type            VARCHAR(20),                     -- video | document | interactive | classroom
    thumbnail_url   VARCHAR(500),
    is_mandatory    BOOLEAN DEFAULT FALSE,           -- إلزامية
    target_departments JSONB,                        -- الأقسام المستهدفة (للإلزامية)
    max_enrollments INTEGER,                         -- حد أقصى للتسجيل
    status          VARCHAR(20) DEFAULT 'draft',     -- draft | active | archived
    rating          DECIMAL(3,1) DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

#### `course_enrollments`
```sql
CREATE TABLE course_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    progress        INTEGER DEFAULT 0,               -- 0-100
    status          VARCHAR(20) DEFAULT 'enrolled',  -- enrolled | in_progress | completed | dropped
    enrolled_at     TIMESTAMP DEFAULT NOW(),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    rating          INTEGER,                         -- تقييم الموظف للدورة 1-5
    feedback        TEXT,

    UNIQUE(course_id, employee_id)
);

CREATE INDEX idx_enrollments_employee ON course_enrollments(employee_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
```

#### `certificates`
```sql
CREATE TABLE certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID NOT NULL REFERENCES course_enrollments(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    course_id       UUID NOT NULL REFERENCES courses(id),
    certificate_number VARCHAR(50) UNIQUE,
    issue_date      DATE NOT NULL,
    expiry_date     DATE,
    pdf_url         VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 2.12 General

#### `notifications`
```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL,            -- leave_request | payroll | document_expiry | attendance...
    category        VARCHAR(50),                     -- info | warning | success | danger
    link            VARCHAR(500),                    -- رابط للانتقال
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMP,
    sent_via        VARCHAR(20) DEFAULT 'system',    -- system | email | sms
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

#### `calendar_events`
```sql
CREATE TABLE calendar_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(50) NOT NULL,            -- leave | holiday | birthday | training | interview | contract | meeting
    start_date      DATE NOT NULL,
    end_date        DATE,
    start_time      TIME,
    end_time        TIME,
    all_day         BOOLEAN DEFAULT TRUE,
    color           VARCHAR(10),
    employee_id     UUID REFERENCES employees(id),   -- مرتبط بموظف (اختياري)
    reference_id    UUID,                            -- ID المرجع (leave_id, interview_id, etc.)
    reference_type  VARCHAR(50),                     -- نوع المرجع
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_dates ON calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_type ON calendar_events(type);
```

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    user_name       VARCHAR(255),
    action          VARCHAR(50) NOT NULL,            -- create | update | delete | approve | reject | login | logout
    module          VARCHAR(50) NOT NULL,            -- employees | leaves | payroll...
    entity_type     VARCHAR(50),                     -- اسم الجدول
    entity_id       UUID,                            -- ID السجل
    old_values      JSONB,                           -- القيم القديمة
    new_values      JSONB,                           -- القيم الجديدة
    ip_address      VARCHAR(50),
    user_agent      TEXT,
    description     TEXT,                            -- وصف مقروء
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_module ON audit_logs(module);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

---

## 3. مخطط العلاقات (Entity Relationship Diagram)

```
                           ┌─────────────┐
                           │  companies   │
                           └──────┬──────┘
                   ┌──────────┬───┼───┬──────────┐
                   │          │   │   │          │
              ┌────┴───┐ ┌───┴──┐│┌──┴───┐ ┌───┴────┐
              │branches│ │grades││├depts  │ │ roles  │
              └────┬───┘ └───┬──┘│└──┬───┘ └───┬────┘
                   │         │   │   │         │
                   │    ┌────┴───┴───┴────┐    │
                   │    │   job_titles    │    │
                   │    └────────┬────────┘    │
                   │             │             │
                   │   ┌────────┼────────┐    │
                   └───┤   employees     ├────┘ (via users)
                       │                 │
          ┌────────┬───┴──┬──────┬───────┼──────┬──────────┐
          │        │      │      │       │      │          │
     ┌────┴───┐┌───┴──┐┌──┴──┐┌──┴───┐┌──┴──┐┌──┴───┐┌────┴────┐
     │attend. ││leaves││payrl││contr.││docs ││perfor.││training │
     │records ││reqsts││recrds││acts  ││ments││reviews││enrolls  │
     └────────┘└──────┘└─────┘└──────┘└─────┘└───────┘└─────────┘

العلاقات الرئيسية:
─────────────────

company    1 ──── * branches
company    1 ──── * departments
company    1 ──── * grades
company    1 ──── * roles

department 1 ──── * departments    (self-referencing hierarchy)
department 1 ──── * teams
department 1 ──── * employees

branch     1 ──── * employees
grade      1 ──── * employees
job_title  1 ──── * employees
team       1 ──── * employees
employee   1 ──── * employees      (manager → subordinates)

employee   1 ──── 1 user
user       * ──── 1 role
role       * ──── * permissions    (via role_permissions)

employee   1 ──── * attendance_records
employee   1 ──── * leave_requests
employee   1 ──── * leave_balances
employee   1 ──── * payroll_records
employee   1 ──── * contracts
employee   1 ──── * documents
employee   1 ──── * performance_reviews
employee   1 ──── * goals
employee   1 ──── * course_enrollments
employee   1 ──── * bonuses
employee   1 ──── * loans

shift      1 ──── * shift_assignments
shift      1 ──── * attendance_records

leave_type 1 ──── * leave_requests
leave_type 1 ──── * leave_balances

payroll_period 1 ──── * payroll_records

job_posting 1 ──── * applicants
applicant   1 ──── * interviews
applicant   1 ──── 1 job_offer

review_cycle 1 ──── * performance_reviews
review_template 1 ── * review_cycles

course     1 ──── * course_enrollments
enrollment 1 ──── 1 certificate

user       1 ──── * notifications
user       1 ──── * user_sessions
user       1 ──── * audit_logs
```

---

## 4. فهارس الأداء الضرورية (Critical Indexes)

```sql
-- بحث الموظفين
CREATE INDEX idx_emp_search ON employees USING gin(
    to_tsvector('arabic', first_name_ar || ' ' || last_name_ar)
);

-- تقارير الحضور
CREATE INDEX idx_attendance_report ON attendance_records(employee_id, date, status);

-- الإجازات الحالية
CREATE INDEX idx_active_leaves ON leave_requests(status, start_date, end_date)
    WHERE status = 'approved';

-- العقود المنتهية
CREATE INDEX idx_expiring_contracts ON contracts(end_date, status)
    WHERE status = 'active';

-- المستندات المنتهية
CREATE INDEX idx_expiring_docs ON documents(expiry_date, status)
    WHERE status != 'expired';

-- الإشعارات غير المقروءة
CREATE INDEX idx_unread_notifications ON notifications(user_id, created_at)
    WHERE is_read = FALSE;
```

---

## 5. بيانات أولية (Seed Data)

```sql
-- الأدوار الأساسية
INSERT INTO roles (name_ar, name_en, code, is_system) VALUES
('مدير النظام', 'Super Admin', 'super_admin', true),
('مدير الموارد البشرية', 'HR Manager', 'hr_manager', true),
('مدير', 'Manager', 'manager', true),
('موظف', 'Employee', 'employee', true);

-- أنواع الإجازات
INSERT INTO leave_types (name_ar, name_en, code, annual_days, is_paid, color) VALUES
('إجازة سنوية', 'Annual Leave', 'annual', 30, true, '#3B82F6'),
('إجازة مرضية', 'Sick Leave', 'sick', 30, true, '#EF4444'),
('إجازة طارئة', 'Emergency Leave', 'emergency', 6, true, '#F59E0B'),
('إجازة زواج', 'Marriage Leave', 'marriage', 5, true, '#EC4899'),
('إجازة وفاة', 'Bereavement Leave', 'bereavement', 5, true, '#6B7280'),
('إجازة أمومة', 'Maternity Leave', 'maternity', 70, true, '#8B5CF6'),
('إجازة أبوة', 'Paternity Leave', 'paternity', 3, true, '#06B6D4'),
('إجازة بدون راتب', 'Unpaid Leave', 'unpaid', 0, false, '#9CA3AF');

-- أنواع البدلات
INSERT INTO allowance_types (name_ar, name_en, code, calculation, default_value, percentage_of) VALUES
('بدل سكن', 'Housing Allowance', 'housing', 'percentage', 25, 'basic_salary'),
('بدل نقل', 'Transport Allowance', 'transport', 'fixed', 1500, NULL),
('بدل طعام', 'Food Allowance', 'food', 'fixed', 500, NULL),
('بدل هاتف', 'Phone Allowance', 'phone', 'fixed', 300, NULL);

-- أنواع المستندات
INSERT INTO document_types (name_ar, name_en, code, category, is_required, has_expiry) VALUES
('عقد العمل', 'Employment Contract', 'contract', 'contracts', true, false),
('الهوية الوطنية', 'National ID', 'national_id', 'personal', true, true),
('جواز السفر', 'Passport', 'passport', 'personal', false, true),
('رخصة القيادة', 'Driving License', 'driving_license', 'personal', false, true),
('الشهادة الجامعية', 'University Certificate', 'degree', 'certificates', true, false),
('شهادة الخبرة', 'Experience Certificate', 'experience', 'certificates', false, false),
('شهادة التأمينات', 'GOSI Certificate', 'gosi_cert', 'insurance', false, true);

-- الصلاحيات
INSERT INTO permissions (module, action, code) VALUES
-- Employees
('employees', 'read', 'employees:read'),
('employees', 'create', 'employees:create'),
('employees', 'update', 'employees:update'),
('employees', 'delete', 'employees:delete'),
('employees', 'archive', 'employees:archive'),
-- Attendance
('attendance', 'read', 'attendance:read'),
('attendance', 'manage', 'attendance:manage'),
('attendance', 'approve_overtime', 'attendance:approve_overtime'),
-- Leaves
('leaves', 'read', 'leaves:read'),
('leaves', 'request', 'leaves:request'),
('leaves', 'approve', 'leaves:approve'),
('leaves', 'manage_types', 'leaves:manage_types'),
-- Payroll
('payroll', 'read', 'payroll:read'),
('payroll', 'process', 'payroll:process'),
('payroll', 'approve', 'payroll:approve'),
('payroll', 'view_own', 'payroll:view_own'),
-- Recruitment
('recruitment', 'read', 'recruitment:read'),
('recruitment', 'manage', 'recruitment:manage'),
-- Performance
('performance', 'read', 'performance:read'),
('performance', 'review', 'performance:review'),
('performance', 'manage_cycles', 'performance:manage_cycles'),
-- Training
('training', 'read', 'training:read'),
('training', 'manage', 'training:manage'),
('training', 'enroll', 'training:enroll'),
-- Documents
('documents', 'read', 'documents:read'),
('documents', 'upload', 'documents:upload'),
('documents', 'delete', 'documents:delete'),
('documents', 'manage_templates', 'documents:manage_templates'),
-- Settings
('settings', 'read', 'settings:read'),
('settings', 'manage', 'settings:manage'),
-- Reports
('reports', 'read', 'reports:read'),
('reports', 'export', 'reports:export'),
-- Notifications
('notifications', 'manage', 'notifications:manage');
```

---

## 6. ملاحظات مهمة للمطور

### 6.1 Soft Delete
- جدول `employees` يستخدم `deleted_at` لعدم حذف البيانات نهائياً
- كل الاستعلامات يجب أن تضيف `WHERE deleted_at IS NULL`

### 6.2 Computed Fields
- `employees_count` في departments, branches, teams يتم تحديثها بـ trigger أو service
- `remaining_days` في leave_balances = total_days - used_days

### 6.3 Audit Trail
- كل عملية CRUD مهمة تسجل في `audit_logs`
- حفظ القيم القديمة والجديدة في JSONB

### 6.4 Multi-tenancy
- جميع الجداول الرئيسية تحتوي `company_id` لدعم تعدد الشركات مستقبلاً
- Row-Level Security (RLS) في PostgreSQL مقترح

### 6.5 Time Zones
- كل التواريخ والأوقات تخزن بـ UTC
- التحويل يتم على مستوى الـ Application layer

### 6.6 File Storage
- الملفات لا تخزن في قاعدة البيانات
- يخزن فقط `file_url` الذي يشير لـ S3/MinIO
- Pattern: `/{company_id}/{employee_id}/{document_type}/{filename}`
