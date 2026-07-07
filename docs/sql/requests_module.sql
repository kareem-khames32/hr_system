-- ============================================================
-- HR Requests Module — SQL Server DDL
-- تنفيذ البريف §5: نموذج البيانات
-- القاعدة الذهبية: كل طلب معتمَد يُكتب في وجهة (Destination) —
-- سجل دائم قابل للفلترة. مفيش طلب بيموت بعد الموافقة.
-- ملاحظة: عدّل أسماء الـ schemas/الأنواع حسب البنية الموجودة.
-- ============================================================

-- ===== State Machine الموحّدة (CHECK constraint بدل ENUM) =====
-- DRAFT / SUBMITTED / UNDER_REVIEW / APPROVED / IN_EXECUTION /
-- COMPLETED / REJECTED / CANCELLED / RETURNED_FOR_INFO

-- ============ الأساسي ============

CREATE TABLE request_types (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    code                  NVARCHAR(50) NOT NULL UNIQUE,      -- LEAVE_ANNUAL, OVERTIME...
    name_ar               NVARCHAR(200) NOT NULL,
    category              NVARCHAR(50) NOT NULL,             -- leaves | time_attendance | financial | employment_status | personal_data | letters | custody_assets | training | employee_relations
    required_fields       NVARCHAR(MAX) NULL,                -- JSON: تعريف الحقول
    required_attachments  NVARCHAR(MAX) NULL,                -- JSON: المرفقات المطلوبة
    approval_chain_id     INT NULL,
    destination_handler   NVARCHAR(100) NOT NULL,            -- كود الـ handler الذي يكتب في الوجهة
    affects_balance       BIT NOT NULL DEFAULT 0,
    is_security_route     BIT NOT NULL DEFAULT 0,            -- تغيير الحساب البنكي
    is_confidential       BIT NOT NULL DEFAULT 0,            -- الشكاوى/البلاغات — تتخطى المدير
    auto_generates_pdf    BIT NOT NULL DEFAULT 0,            -- الخطابات
    phase                 NVARCHAR(5) NOT NULL DEFAULT 'P1', -- P1/P2/P3
    is_active             BIT NOT NULL DEFAULT 1
);

CREATE TABLE approval_chains (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    code        NVARCHAR(50) NOT NULL UNIQUE,
    name_ar     NVARCHAR(200) NOT NULL,
    branch_id   INT NULL,                                    -- NULL = كل الفروع؛ قيمة = دورة خاصة بفرع
    is_active   BIT NOT NULL DEFAULT 1
);

CREATE TABLE approval_steps (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    chain_id        INT NOT NULL REFERENCES approval_chains(id),
    step_order      INT NOT NULL,
    approver_role   NVARCHAR(60) NOT NULL,                   -- direct_manager_of_requester | receiving_team_manager | hr | finance | custody_officer | it | executive — يُحل ديناميكياً من الهيكل التنظيمي وقت التشغيل
    is_parallel     BIT NOT NULL DEFAULT 0,
    threshold_field NVARCHAR(60) NULL,                       -- مثال: amount | increase_pct
    threshold_op    NVARCHAR(10) NULL,                       -- >= | > | < | <=
    threshold_value DECIMAL(18,2) NULL,                      -- الخطوة تُفعَّل فقط عند تحقق الشرط
    sla_days        INT NULL,                                -- مهلة الرد
    escalate_to     NVARCHAR(60) NULL,                       -- دور التصعيد عند تجاوز الـ SLA
    can_delegate    BIT NOT NULL DEFAULT 1
);

CREATE TABLE requests (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    type_code     NVARCHAR(50) NOT NULL REFERENCES request_types(code),
    requester_id  INT NOT NULL,                              -- REFERENCES employees(id)
    branch_id     INT NULL,
    status        NVARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CONSTRAINT CK_requests_status CHECK (status IN (
            'DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','IN_EXECUTION',
            'COMPLETED','REJECTED','CANCELLED','RETURNED_FOR_INFO')),
    current_step  INT NULL,
    payload       NVARCHAR(MAX) NULL,                        -- JSON (أو أعمدة typed حسب البنية)
    destination_ref NVARCHAR(200) NULL,                      -- مرجع السجل الدائم بعد التنفيذ (LN-2026-014...)
    created_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    submitted_at  DATETIME2 NULL,
    completed_at  DATETIME2 NULL
);
CREATE INDEX IX_requests_type_status ON requests(type_code, status);
CREATE INDEX IX_requests_requester ON requests(requester_id);
CREATE INDEX IX_requests_branch ON requests(branch_id);

CREATE TABLE request_approvals (                             -- سجل تدقيق غير قابل للتعديل
    id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id   BIGINT NOT NULL REFERENCES requests(id),
    step         INT NOT NULL,
    approver_id  INT NOT NULL,
    action       NVARCHAR(30) NOT NULL
        CONSTRAINT CK_approvals_action CHECK (action IN (
            'APPROVED','REJECTED','RETURNED_FOR_INFO','DELEGATED','ESCALATED')),
    comment      NVARCHAR(1000) NULL,
    acted_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_request_approvals_request ON request_approvals(request_id);

CREATE TABLE attachments (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id  BIGINT NOT NULL REFERENCES requests(id),
    file_ref    NVARCHAR(500) NOT NULL,
    type        NVARCHAR(50) NULL                            -- medical_report | iban_letter | invoice ...
);

-- ============ الإجازات (LeaveType قابل للإعداد) ============

CREATE TABLE leave_types (
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    code                 NVARCHAR(50) NOT NULL UNIQUE,
    name_ar              NVARCHAR(200) NOT NULL,
    is_paid              BIT NOT NULL DEFAULT 1,
    balance_source       NVARCHAR(50) NULL,                  -- annual | sick | none — بيخصم من رصيد إيه
    required_attachment  NVARCHAR(100) NULL,
    max_days             INT NULL,
    once_per_service     BIT NOT NULL DEFAULT 0,             -- الحج
    approval_chain_id    INT NULL REFERENCES approval_chains(id),
    is_active            BIT NOT NULL DEFAULT 1
);

CREATE TABLE leaves (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id     BIGINT NULL REFERENCES requests(id),      -- الطلب الأصل
    employee_id    INT NOT NULL,
    leave_type     NVARCHAR(50) NOT NULL REFERENCES leave_types(code),
    from_date      DATE NOT NULL,
    to_date        DATE NOT NULL,
    days           DECIMAL(5,2) NOT NULL,
    status         NVARCHAR(30) NOT NULL
);
CREATE INDEX IX_leaves_employee ON leaves(employee_id, from_date);

CREATE TABLE leave_balances (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id    INT NOT NULL,
    balance_type   NVARCHAR(50) NOT NULL,
    entitled       DECIMAL(6,2) NOT NULL DEFAULT 0,
    taken          DECIMAL(6,2) NOT NULL DEFAULT 0,
    remaining      AS (entitled - taken) PERSISTED,
    period         NVARCHAR(20) NOT NULL,                    -- '2026'
    -- طبقة الرصيد الافتتاحي المُرحّل وصلاحيته
    opening_days   DECIMAL(6,2) NOT NULL DEFAULT 0,
    opening_expiry DATE NULL,                                -- NULL = بلا انتهاء
    CONSTRAINT UQ_leave_balances UNIQUE (employee_id, balance_type, period)
);

-- ============ الحضور / الأوفرتايم (§7.1) ============

CREATE TABLE overtime_entries (
    id               BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id       BIGINT NULL REFERENCES requests(id),
    employee_id      INT NOT NULL,
    [date]           DATE NOT NULL,
    source           NVARCHAR(30) NOT NULL
        CONSTRAINT CK_ot_source CHECK (source IN ('BIOMETRIC_DETECTED','PRE_REQUESTED')),
    hours_requested  DECIMAL(5,2) NULL,
    hours_actual     DECIMAL(5,2) NULL,                      -- من البصمة
    payable_hours    DECIMAL(5,2) NULL,                      -- = min(المعتمد، الفعلي) — يُحسب عند الاعتماد
    rate             DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    status           NVARCHAR(20) NOT NULL DEFAULT 'DETECTED'
        CONSTRAINT CK_ot_status CHECK (status IN ('DETECTED','SUBMITTED','APPROVED','PAID','REJECTED')),
    payroll_run_id   INT NULL                                -- يُربط عند الدفع
);
CREATE INDEX IX_overtime_employee_date ON overtime_entries(employee_id, [date]);

CREATE TABLE attendance_corrections (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id      BIGINT NULL REFERENCES requests(id),
    employee_id     INT NOT NULL,
    [date]          DATE NOT NULL,
    reason          NVARCHAR(500) NOT NULL,
    corrected_punch NVARCHAR(200) NOT NULL                   -- JSON: {in: '08:00', out: '17:00'}
);

-- ============ المالية ============

CREATE TABLE loans (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id    BIGINT NULL REFERENCES requests(id),
    employee_id   INT NOT NULL,
    amount        DECIMAL(18,2) NOT NULL,
    status        NVARCHAR(30) NOT NULL,
    disbursed_at  DATETIME2 NULL
);

CREATE TABLE loan_installments (
    id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    loan_id   BIGINT NOT NULL REFERENCES loans(id),
    due_date  DATE NOT NULL,
    amount    DECIMAL(18,2) NOT NULL,
    paid      BIT NOT NULL DEFAULT 0
);

-- ============ الحالة الوظيفية ============

CREATE TABLE transfers (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id     BIGINT NULL REFERENCES requests(id),
    employee_id    INT NOT NULL,
    from_team      INT NOT NULL,
    to_team        INT NOT NULL,
    effective_date DATE NOT NULL,                            -- §7.2: التنفيذ الآلي بتاريخ السريان
    status         NVARCHAR(30) NOT NULL,
    executed_at    DATETIME2 NULL                            -- متى نفّذه الـ scheduler فعلياً
);

CREATE TABLE promotions (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id     BIGINT NULL REFERENCES requests(id),
    employee_id    INT NOT NULL,
    from_title     NVARCHAR(200) NOT NULL,
    to_title       NVARCHAR(200) NOT NULL,
    effective_date DATE NOT NULL
);

CREATE TABLE employee_status_history (                       -- يغذّي سجل النقل/الترقية/تغيير الحالة
    id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    employee_id  INT NOT NULL,
    old_status   NVARCHAR(100) NULL,
    new_status   NVARCHAR(100) NOT NULL,
    changed_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    reason       NVARCHAR(500) NULL,
    request_id   BIGINT NULL REFERENCES requests(id)
);
CREATE INDEX IX_esh_employee ON employee_status_history(employee_id, changed_at);

-- ============ العهدة (§7.3) ============

CREATE TABLE assets (
    id                 BIGINT IDENTITY(1,1) PRIMARY KEY,
    name               NVARCHAR(200) NOT NULL,
    category           NVARCHAR(100) NOT NULL,
    serial_number      NVARCHAR(100) NULL,
    current_holder_id  INT NULL                              -- مين ماسكه دلوقتي
);

CREATE TABLE custody_assignments (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id      BIGINT NULL REFERENCES requests(id),
    asset_id        BIGINT NOT NULL REFERENCES assets(id),
    employee_id     INT NOT NULL,
    assigned_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    acknowledged_at DATETIME2 NULL,                          -- تأكيد الاستلام = السجل الملزِم قانونياً
    returned_at     DATETIME2 NULL,
    condition       NVARCHAR(100) NULL,                      -- الحالة عند الإرجاع
    status          NVARCHAR(30) NOT NULL DEFAULT 'PENDING_ACK'
        CONSTRAINT CK_custody_status CHECK (status IN (
            'PENDING_ACK','ACTIVE','RETURN_REQUESTED','RETURNED','LOST','DAMAGED'))
);
CREATE INDEX IX_custody_employee ON custody_assignments(employee_id);

-- ============ الخطابات ============

CREATE TABLE letter_requests (
    id                BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id        BIGINT NULL REFERENCES requests(id),
    employee_id       INT NOT NULL,
    letter_type       NVARCHAR(50) NOT NULL,                 -- SALARY | EMPLOYMENT | EXPERIENCE | NOC | EMBASSY | BANK_LOAN
    purpose           NVARCHAR(500) NULL,
    status            NVARCHAR(30) NOT NULL,
    generated_pdf_ref NVARCHAR(500) NULL                     -- مرجع الـ PDF المولّد
);

-- ============ Config (§9) ============

CREATE TABLE requests_config (
    [key]   NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(500) NOT NULL
);
INSERT INTO requests_config ([key], [value]) VALUES
    ('overtime.biometric_requires_confirmation', 'true'),    -- الموصى به
    ('loan.finance_approval_threshold', '5000'),
    ('salary_increase.executive_threshold_pct', '10'),
    ('transfer.execution_mode', 'effective_date');           -- الموصى به
