# HR System - Entity Relationship Diagram (ERD)
# مخطط علاقات الكيانات

---

## 1. ERD Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                  │
│                                           HR SYSTEM - MASTER ERD                                                │
│                                                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│   ┌─────────────┐                                                                                               │
│   │  COMPANIES  │                                                                                               │
│   │─────────────│                                                                                               │
│   │ PK: id      │                                                                                               │
│   │ name_ar     │                                                                                               │
│   │ name_en     │                                                                                               │
│   │ ...         │                                                                                               │
│   └──────┬──────┘                                                                                               │
│          │                                                                                                       │
│          │ 1                                                                                                     │
│          │                                                                                                       │
│    ┌─────┴─────┬──────────────┬──────────────┬──────────────┬──────────────┐                                   │
│    │           │              │              │              │              │                                    │
│    ▼ *         ▼ *            ▼ *            ▼ *            ▼ *            ▼ *                                  │
│ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐ ┌─────────────┐                                │
│ │BRANCHES │ │ GRADES  │ │DEPARTMENTS│ │ ROLES  │ │LEAVE_TYPES │ │DOCUMENT_TYPES│                               │
│ │─────────│ │─────────│ │──────────│ │─────────│ │────────────│ │─────────────│                                │
│ │PK: id   │ │PK: id   │ │PK: id    │ │PK: id   │ │PK: id      │ │PK: id       │                                │
│ │FK:comp  │ │FK:comp  │ │FK:comp   │ │FK:comp  │ │FK:comp     │ │FK:comp      │                                │
│ │name_ar  │ │name     │ │FK:parent │ │name_ar  │ │name_ar     │ │name_ar      │                                │
│ │city     │ │level    │ │FK:branch │ │code     │ │annual_days │ │category     │                                │
│ │...      │ │...      │ │name_ar   │ │...      │ │...         │ │...          │                                │
│ └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘ └──────┬──────┘                                │
│      │           │           │            │            │               │                                        │
│      │           │     ┌─────┘            │            │               │                                        │
│      │           │     │                  │            │               │                                        │
│      │           │     ▼ *                │            │               │                                        │
│      │           │ ┌─────────┐            │            │               │                                        │
│      │           │ │  TEAMS  │            │            │               │                                        │
│      │           │ │─────────│            │            │               │                                        │
│      │           │ │PK: id   │            │            │               │                                        │
│      │           │ │FK:dept  │            │            │               │                                        │
│      │           │ │name_ar  │            │            │               │                                        │
│      │           │ └────┬────┘            │            │               │                                        │
│      │           │      │                 │            │               │                                        │
│      │           │      │                 │            │               │                                        │
│      │    ┌──────┴──────┼─────────────────┤            │               │                                        │
│      │    │             │                 │            │               │                                        │
│      │    │   ┌─────────┼─────────────────┤            │               │                                        │
│      │    │   │         │                 │            │               │                                        │
│      │    │   │    ┌────┴─────────────────┤            │               │                                        │
│      │    │   │    │                      │            │               │                                        │
│      ▼    ▼   ▼    ▼                      ▼            ▼               ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐                                  │
│   │                              EMPLOYEES                                    │                                  │
│   │──────────────────────────────────────────────────────────────────────────│                                  │
│   │ PK: id                                                                    │                                  │
│   │ FK: company_id, branch_id, department_id, team_id, grade_id,             │                                  │
│   │     job_title_id, manager_id (self), user_id                             │                                  │
│   │                                                                           │                                  │
│   │ employee_number, first_name_ar, last_name_ar, email, phone, ...          │                                  │
│   │ national_id, passport_number, birth_date, gender, ...                    │                                  │
│   │ join_date, status, basic_salary, bank_name, iban, ...                    │                                  │
│   └───────────────────────────────────┬──────────────────────────────────────┘                                  │
│                                       │                                                                          │
│          ┌────────────┬───────────────┼───────────────┬───────────────┬───────────────┐                         │
│          │            │               │               │               │               │                          │
│          ▼ *          ▼ *             ▼ *             ▼ *             ▼ *             ▼ *                        │
│   ┌────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────┐                    │
│   │ ATTENDANCE │ │  LEAVES  │ │  PAYROLL   │ │ CONTRACTS  │ │  DOCUMENTS   │ │PERFORMANCE  │                    │
│   │  RECORDS   │ │ REQUESTS │ │  RECORDS   │ │            │ │              │ │  REVIEWS    │                    │
│   │────────────│ │──────────│ │────────────│ │────────────│ │──────────────│ │─────────────│                    │
│   │PK: id      │ │PK: id    │ │PK: id      │ │PK: id      │ │PK: id        │ │PK: id       │                    │
│   │FK:employee │ │FK:employee│ │FK:employee │ │FK:employee │ │FK:employee   │ │FK:employee  │                    │
│   │FK:shift    │ │FK:type   │ │FK:period   │ │type        │ │FK:doc_type   │ │FK:cycle     │                    │
│   │date        │ │start_date│ │basic_salary│ │start_date  │ │file_url      │ │FK:reviewer  │                    │
│   │check_in    │ │end_date  │ │allowances  │ │end_date    │ │expiry_date   │ │score        │                    │
│   │check_out   │ │days      │ │deductions  │ │salary      │ │status        │ │status       │                    │
│   │status      │ │status    │ │net_salary  │ │status      │ │...           │ │...          │                    │
│   │...         │ │...       │ │...         │ │...         │ │              │ │             │                    │
│   └────────────┘ └──────────┘ └────────────┘ └────────────┘ └──────────────┘ └─────────────┘                    │
│                                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities (الكيانات الأساسية)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ORGANIZATION STRUCTURE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                              COMPANIES                                   │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id              UUID         PK                                         │   │
│   │ name_ar         VARCHAR(255) NOT NULL                                   │   │
│   │ name_en         VARCHAR(255)                                            │   │
│   │ commercial_reg  VARCHAR(50)                                             │   │
│   │ tax_number      VARCHAR(50)                                             │   │
│   │ gosi_number     VARCHAR(50)                                             │   │
│   │ country         VARCHAR(5)   DEFAULT 'SA'                               │   │
│   │ city            VARCHAR(100)                                            │   │
│   │ currency        VARCHAR(5)   DEFAULT 'SAR'                              │   │
│   │ timezone        VARCHAR(50)  DEFAULT 'Asia/Riyadh'                      │   │
│   │ created_at      TIMESTAMP    DEFAULT NOW()                              │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                         │
│                                        │ 1:N                                     │
│            ┌───────────────────────────┼───────────────────────────┐            │
│            │                           │                           │             │
│            ▼                           ▼                           ▼             │
│   ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐   │
│   │    BRANCHES     │         │   DEPARTMENTS   │         │     GRADES      │   │
│   │─────────────────│         │─────────────────│         │─────────────────│   │
│   │ id          PK  │         │ id          PK  │         │ id          PK  │   │
│   │ company_id  FK  │─────────│ company_id  FK  │─────────│ company_id  FK  │   │
│   │ name_ar         │         │ parent_id   FK  │◀──┐     │ name            │   │
│   │ name_en         │         │ branch_id   FK  │   │     │ level           │   │
│   │ code        UQ  │         │ name_ar         │   │     │ min_salary      │   │
│   │ city            │         │ name_en         │   │     │ max_salary      │   │
│   │ manager_id  FK  │         │ code        UQ  │   │     │ is_active       │   │
│   │ is_headquarters │         │ manager_id  FK  │   │     └─────────────────┘   │
│   │ is_active       │         │ is_active       │   │                           │
│   └────────┬────────┘         └────────┬────────┘   │                           │
│            │                           │            │ Self-Reference            │
│            │                           │            │ (Hierarchy)               │
│            │                           └────────────┘                           │
│            │                           │                                         │
│            │                           ▼                                         │
│            │                  ┌─────────────────┐                               │
│            │                  │      TEAMS      │                               │
│            │                  │─────────────────│                               │
│            │                  │ id          PK  │                               │
│            │                  │ department_id FK│                               │
│            │                  │ name_ar         │                               │
│            │                  │ name_en         │                               │
│            │                  │ code        UQ  │                               │
│            │                  │ leader_id   FK  │                               │
│            │                  └─────────────────┘                               │
│            │                                                                     │
│            └─────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐         ┌─────────────────────────────────────────────┐   │
│   │   JOB_TITLES    │         │                  EMPLOYEES                   │   │
│   │─────────────────│         │─────────────────────────────────────────────│   │
│   │ id          PK  │         │ id                  UUID    PK              │   │
│   │ company_id  FK  │◀────────│ company_id          UUID    FK              │   │
│   │ department_id FK│         │ employee_number     VARCHAR UQ              │   │
│   │ grade_id    FK  │◀────────│                                             │   │
│   │ name_ar         │         │ # Personal Info                              │   │
│   │ name_en         │         │ first_name_ar       VARCHAR NOT NULL        │   │
│   │ code        UQ  │         │ last_name_ar        VARCHAR NOT NULL        │   │
│   │ level           │         │ email               VARCHAR UQ              │   │
│   │   (entry,       │         │ phone               VARCHAR                 │   │
│   │    professional,│         │ national_id         VARCHAR                 │   │
│   │    senior,      │         │ birth_date          DATE                    │   │
│   │    manager,     │         │ gender              VARCHAR                 │   │
│   │    executive)   │         │                                             │   │
│   │ is_active       │         │ # Employment Info                            │   │
│   └─────────────────┘         │ department_id       UUID    FK              │   │
│            │                  │ team_id             UUID    FK              │   │
│            │                  │ branch_id           UUID    FK              │   │
│            │                  │ job_title_id        UUID    FK              │   │
│            │                  │ grade_id            UUID    FK              │   │
│            │                  │ manager_id          UUID    FK (Self)       │   │
│            │                  │ join_date           DATE    NOT NULL        │   │
│            │                  │ status              VARCHAR                 │   │
│            │                  │   (active, probation, suspended, resigned)  │   │
│            │                  │                                             │   │
│            │                  │ # Financial Info                             │   │
│            │                  │ basic_salary        DECIMAL NOT NULL        │   │
│            │                  │ bank_name           VARCHAR                 │   │
│            │                  │ iban                VARCHAR                 │   │
│            │                  │                                             │   │
│            │                  │ # System                                     │   │
│            └─────────────────▶│ user_id             UUID    FK              │   │
│                               │ deleted_at          TIMESTAMP (Soft Delete) │   │
│                               └─────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication & Authorization (المصادقة والتفويض)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION & AUTHORIZATION                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────┐                 │
│   │         USERS           │       │         ROLES           │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ company_id      FK      │       │ company_id      FK      │                 │
│   │ employee_id     FK      │──┐    │ name_ar                 │                 │
│   │ email           UQ      │  │    │ name_en                 │                 │
│   │ password_hash           │  │    │ code            UQ      │                 │
│   │ role_id         FK      │──┼───▶│   (super_admin,         │                 │
│   │ is_active               │  │    │    hr_manager,          │                 │
│   │ is_2fa_enabled          │  │    │    manager,             │                 │
│   │ last_login_at           │  │    │    employee)            │                 │
│   │ failed_attempts         │  │    │ is_system               │                 │
│   │ locked_until            │  │    │ users_count             │                 │
│   └───────────┬─────────────┘  │    └───────────┬─────────────┘                 │
│               │                │                │                                │
│               │ 1:N            │                │ N:M                            │
│               ▼                │                ▼                                │
│   ┌─────────────────────────┐  │    ┌─────────────────────────┐                 │
│   │     USER_SESSIONS       │  │    │   ROLE_PERMISSIONS      │                 │
│   │─────────────────────────│  │    │─────────────────────────│                 │
│   │ id              PK      │  │    │ id              PK      │                 │
│   │ user_id         FK      │  │    │ role_id         FK      │─────────┐       │
│   │ refresh_token           │  │    │ permission_id   FK      │─────┐   │       │
│   │ ip_address              │  │    │ scope                   │     │   │       │
│   │ user_agent              │  │    │   (all, team, self)     │     │   │       │
│   │ expires_at              │  │    └─────────────────────────┘     │   │       │
│   └─────────────────────────┘  │                                    │   │       │
│                                │                                    │   │       │
│               ┌────────────────┘                                    │   │       │
│               │                                                     │   │       │
│               ▼                                                     │   │       │
│   ┌─────────────────────────┐       ┌─────────────────────────┐    │   │       │
│   │       EMPLOYEES         │       │      PERMISSIONS        │◀───┘   │       │
│   │─────────────────────────│       │─────────────────────────│        │       │
│   │ id              PK      │       │ id              PK      │        │       │
│   │ user_id         FK      │◀──────│ module                  │        │       │
│   │ ...                     │       │   (employees, leaves,   │◀───────┘       │
│   └─────────────────────────┘       │    payroll, ...)        │                │
│                                     │ action                  │                │
│                                     │   (read, create,        │                │
│                                     │    update, delete,      │                │
│                                     │    approve)             │                │
│                                     │ code            UQ      │                │
│                                     │   (employees:read,      │                │
│                                     │    leaves:approve, ...) │                │
│                                     └─────────────────────────┘                │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   Example Relationships:                                                         │
│                                                                                  │
│   User ──────── 1:1 ────────▶ Employee (optional)                               │
│   User ──────── N:1 ────────▶ Role                                              │
│   Role ──────── N:M ────────▶ Permissions (via role_permissions)                │
│   User ──────── 1:N ────────▶ Sessions                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Attendance Module (الحضور والانصراف)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ATTENDANCE MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐                                                   │
│   │        SHIFTS           │                                                   │
│   │─────────────────────────│                                                   │
│   │ id              PK      │                                                   │
│   │ company_id      FK      │                                                   │
│   │ name_ar                 │                                                   │
│   │ name_en                 │                                                   │
│   │ start_time      TIME    │  ◀──── 08:00                                      │
│   │ end_time        TIME    │  ◀──── 17:00                                      │
│   │ break_duration  INT     │  ◀──── 60 mins                                    │
│   │ grace_period    INT     │  ◀──── 15 mins                                    │
│   │ work_days       JSONB   │  ◀──── {"sunday": true, ...}                      │
│   │ is_default              │                                                   │
│   │ is_active               │                                                   │
│   └───────────┬─────────────┘                                                   │
│               │                                                                  │
│               │ 1:N                                                              │
│               │                                                                  │
│   ┌───────────┴─────────────┐       ┌─────────────────────────┐                 │
│   │   SHIFT_ASSIGNMENTS     │       │       EMPLOYEES         │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ employee_id     FK      │──────▶│ ...                     │                 │
│   │ shift_id        FK      │       └───────────┬─────────────┘                 │
│   │ start_date      DATE    │                   │                                │
│   │ end_date        DATE    │                   │ 1:N                            │
│   └─────────────────────────┘                   │                                │
│                                                 │                                │
│                 ┌───────────────────────────────┴──────────────────────────┐    │
│                 │                               │                          │     │
│                 ▼                               ▼                          ▼     │
│   ┌─────────────────────────┐   ┌─────────────────────────┐   ┌───────────────┐ │
│   │   ATTENDANCE_RECORDS    │   │    OVERTIME_RECORDS     │   │PERMISSION_REQS│ │
│   │─────────────────────────│   │─────────────────────────│   │───────────────│ │
│   │ id              PK      │   │ id              PK      │   │ id        PK  │ │
│   │ employee_id     FK      │   │ employee_id     FK      │   │ employee_id FK│ │
│   │ shift_id        FK      │   │ date            DATE    │   │ date      DATE│ │
│   │ date            DATE    │   │ hours           DECIMAL │   │ start_time    │ │
│   │ check_in        TIMESTAMP   │ rate            DECIMAL │   │ end_time      │ │
│   │ check_out       TIMESTAMP   │   (1.5x, 2x)            │   │ duration_hours│ │
│   │ work_hours      DECIMAL │   │ reason          TEXT    │   │ reason    TEXT│ │
│   │ overtime_hours  DECIMAL │   │ status                  │   │ status        │ │
│   │ late_minutes    INT     │   │   (pending,             │   │   (pending,   │ │
│   │ early_leave_min INT     │   │    approved,            │   │    approved,  │ │
│   │ status                  │   │    rejected)            │   │    rejected)  │ │
│   │   (present,             │   │ approved_by     FK      │   │ approved_by FK│ │
│   │    absent,              │   │ approved_at     TIMESTAMP   └───────────────┘ │
│   │    late,                │   └─────────────────────────┘                     │
│   │    early_leave,         │                                                   │
│   │    on_leave,            │                                                   │
│   │    holiday)             │                                                   │
│   │ verification_method     │                                                   │
│   │   (face, fingerprint,   │                                                   │
│   │    card, gps, manual)   │                                                   │
│   │ check_in_location       │                                                   │
│   │ is_manual       BOOL    │                                                   │
│   │ approved_by     FK      │                                                   │
│   └─────────────────────────┘                                                   │
│                                                                                  │
│   UNIQUE(employee_id, date) ◀─── سجل واحد لكل موظف في اليوم                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Leaves Module (الإجازات)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                LEAVES MODULE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────┐                 │
│   │      LEAVE_TYPES        │       │        HOLIDAYS         │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ company_id      FK      │       │ company_id      FK      │                 │
│   │ name_ar                 │       │ name_ar                 │                 │
│   │ name_en                 │       │ name_en                 │                 │
│   │ code            UQ      │       │ start_date      DATE    │                 │
│   │   (annual, sick,        │       │ end_date        DATE    │                 │
│   │    emergency, ...)      │       │ days            INT     │                 │
│   │ annual_days     INT     │       │ type                    │                 │
│   │ is_paid         BOOL    │       │   (national,            │                 │
│   │ requires_approval       │       │    religious,           │                 │
│   │ requires_attachment     │       │    company)             │                 │
│   │ color           VARCHAR │       │ is_recurring    BOOL    │                 │
│   │ is_active               │       │ year            INT     │                 │
│   │ sort_order              │       └─────────────────────────┘                 │
│   └───────────┬─────────────┘                                                   │
│               │                                                                  │
│               │ 1:N                                                              │
│       ┌───────┴───────┐                                                         │
│       │               │                                                          │
│       ▼               ▼                                                          │
│   ┌─────────────────────────┐       ┌─────────────────────────┐                 │
│   │    LEAVE_BALANCES       │       │    LEAVE_REQUESTS       │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ employee_id     FK      │──┐    │ employee_id     FK      │──┐              │
│   │ leave_type_id   FK      │  │    │ leave_type_id   FK      │  │              │
│   │ year            INT     │  │    │ start_date      DATE    │  │              │
│   │ total_days      DECIMAL │  │    │ end_date        DATE    │  │              │
│   │ used_days       DECIMAL │  │    │ days            DECIMAL │  │              │
│   │ remaining_days  DECIMAL │  │    │ reason          TEXT    │  │              │
│   │   (computed)            │  │    │ attachment_url          │  │              │
│   │ carried_over    DECIMAL │  │    │ status                  │  │              │
│   └─────────────────────────┘  │    │   (pending,             │  │              │
│                                │    │    approved,            │  │              │
│   UNIQUE(employee_id,          │    │    rejected,            │  │              │
│          leave_type_id, year)  │    │    cancelled)           │  │              │
│                                │    │ approved_by     FK      │  │              │
│                                │    │ approved_at     TIMESTAMP  │              │
│                                │    │ rejection_reason TEXT   │  │              │
│                                │    │ submitted_at    TIMESTAMP  │              │
│                                │    └───────────┬─────────────┘  │              │
│                                │                │                │               │
│                                │                │                │               │
│                                └────────────────┼────────────────┘               │
│                                                 │                                │
│                                                 ▼                                │
│                                     ┌─────────────────────────┐                 │
│                                     │       EMPLOYEES         │                 │
│                                     │─────────────────────────│                 │
│                                     │ id              PK      │                 │
│                                     │ ...                     │                 │
│                                     └─────────────────────────┘                 │
│                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│   Workflow:                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                      │
│   │   REQUEST    │───▶│   APPROVE    │───▶│  DEDUCT FROM │                      │
│   │   LEAVE      │    │   (Manager)  │    │   BALANCE    │                      │
│   └──────────────┘    └──────────────┘    └──────────────┘                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Payroll Module (الرواتب)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               PAYROLL MODULE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐                                                   │
│   │    PAYROLL_PERIODS      │                                                   │
│   │─────────────────────────│                                                   │
│   │ id              PK      │                                                   │
│   │ company_id      FK      │                                                   │
│   │ month           INT     │  ◀──── 1-12                                       │
│   │ year            INT     │  ◀──── 2024                                       │
│   │ start_date      DATE    │                                                   │
│   │ end_date        DATE    │                                                   │
│   │ status                  │                                                   │
│   │   (draft,               │                                                   │
│   │    calculated,          │                                                   │
│   │    approved,            │                                                   │
│   │    paid)                │                                                   │
│   │ total_earnings  DECIMAL │                                                   │
│   │ total_deductions DECIMAL│                                                   │
│   │ total_net       DECIMAL │                                                   │
│   │ employees_count INT     │                                                   │
│   │ calculated_by   FK      │                                                   │
│   │ approved_by     FK      │                                                   │
│   │ paid_at         TIMESTAMP                                                   │
│   └───────────┬─────────────┘                                                   │
│               │                                                                  │
│               │ 1:N                                                              │
│               ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          PAYROLL_RECORDS                                 │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  PK                                                   │   │
│   │ payroll_period_id   FK                                                   │   │
│   │ employee_id         FK ──────────────────────────────────────▶ EMPLOYEES│   │
│   │                                                                          │   │
│   │ ┌─────────────────────────────┐  ┌─────────────────────────────┐        │   │
│   │ │      EARNINGS (+)           │  │      DEDUCTIONS (-)         │        │   │
│   │ │─────────────────────────────│  │─────────────────────────────│        │   │
│   │ │ basic_salary        DECIMAL │  │ gosi_deduction      DECIMAL │        │   │
│   │ │ housing_allowance   DECIMAL │  │ absence_deduction   DECIMAL │        │   │
│   │ │ transport_allowance DECIMAL │  │ late_deduction      DECIMAL │        │   │
│   │ │ other_allowances    DECIMAL │  │ loan_deduction      DECIMAL │        │   │
│   │ │ overtime_amount     DECIMAL │  │ other_deductions    DECIMAL │        │   │
│   │ │ bonus_amount        DECIMAL │  │─────────────────────────────│        │   │
│   │ │─────────────────────────────│  │ total_deductions    DECIMAL │        │   │
│   │ │ total_earnings      DECIMAL │  └─────────────────────────────┘        │   │
│   │ └─────────────────────────────┘                                          │   │
│   │                                                                          │   │
│   │ net_salary = total_earnings - total_deductions                           │   │
│   │                                                                          │   │
│   │ bank_name           VARCHAR                                              │   │
│   │ iban                VARCHAR                                              │   │
│   │ status              (calculated, approved, paid)                         │   │
│   │ adjustments         JSONB  ◀──── Manual adjustments log                  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   UNIQUE(payroll_period_id, employee_id)                                        │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                             SUPPORTING TABLES                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐   ┌───────────────────┐   ┌─────────────────┐            │
│   │ ALLOWANCE_TYPES │   │EMPLOYEE_ALLOWANCES│   │ DEDUCTION_TYPES │            │
│   │─────────────────│   │───────────────────│   │─────────────────│            │
│   │ id          PK  │   │ id            PK  │   │ id          PK  │            │
│   │ company_id  FK  │   │ employee_id   FK  │──▶│ company_id  FK  │            │
│   │ name_ar         │   │ allowance_type FK │   │ name_ar         │            │
│   │ code        UQ  │◀──│ amount        DEC │   │ code        UQ  │            │
│   │   (housing,     │   │ start_date    DATE│   │ calculation     │            │
│   │    transport,   │   │ end_date      DATE│   │   (fixed,       │            │
│   │    food, ...)   │   │ is_active     BOOL│   │    percentage,  │            │
│   │ calculation     │   └───────────────────┘   │    formula)     │            │
│   │   (fixed,       │                           │ is_active       │            │
│   │    percentage)  │                           └─────────────────┘            │
│   │ default_value   │                                                           │
│   │ percentage_of   │                                                           │
│   │ is_taxable      │                                                           │
│   └─────────────────┘                                                           │
│                                                                                  │
│   ┌─────────────────┐   ┌───────────────────┐   ┌─────────────────┐            │
│   │     BONUSES     │   │       LOANS       │   │LOAN_INSTALLMENTS│            │
│   │─────────────────│   │───────────────────│   │─────────────────│            │
│   │ id          PK  │   │ id            PK  │   │ id          PK  │            │
│   │ employee_id FK  │   │ employee_id   FK  │   │ loan_id     FK  │──▶ LOANS   │
│   │ period_id   FK  │   │ amount        DEC │   │ period_id   FK  │            │
│   │ amount      DEC │   │ remaining     DEC │   │ amount      DEC │            │
│   │ reason      TEXT│   │ monthly_install   │   │ due_date    DATE│            │
│   │ type            │   │ installments_count│   │ paid_date   DATE│            │
│   │   (performance, │   │ paid_installments │   │ status          │            │
│   │    project,     │   │ reason        TEXT│   │   (pending,     │            │
│   │    annual, ...) │   │ status            │   │    paid,        │            │
│   │ approved_by FK  │   │   (active,        │   │    skipped)     │            │
│   └─────────────────┘   │    completed,     │   └─────────────────┘            │
│                         │    cancelled)     │                                   │
│                         │ start_date    DATE│                                   │
│                         │ approved_by   FK  │                                   │
│                         └───────────────────┘                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Contracts & Documents (العقود والمستندات)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CONTRACTS & DOCUMENTS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                            CONTRACTS                                     │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ employee_id         UUID    FK ──────────────────────────────▶ EMPLOYEES│   │
│   │ contract_number     VARCHAR UQ                                           │   │
│   │ type                VARCHAR                                              │   │
│   │   ├── permanent     ◀──── غير محدد المدة                                │   │
│   │   ├── fixed         ◀──── محدد المدة                                    │   │
│   │   ├── probation     ◀──── فترة تجربة                                    │   │
│   │   └── parttime      ◀──── دوام جزئي                                     │   │
│   │ start_date          DATE                                                 │   │
│   │ end_date            DATE    ◀──── NULL for permanent                     │   │
│   │ salary              DECIMAL                                              │   │
│   │ status              VARCHAR                                              │   │
│   │   ├── active        ◀──── ساري                                          │   │
│   │   ├── expiring      ◀──── ينتهي خلال 30 يوم                             │   │
│   │   ├── expired       ◀──── منتهي                                         │   │
│   │   ├── renewed       ◀──── مجدد                                          │   │
│   │   └── terminated    ◀──── منهي                                          │   │
│   │ renewal_count       INT     ◀──── عدد مرات التجديد                       │   │
│   │ last_renewal_date   DATE                                                 │   │
│   │ terms               TEXT    ◀──── شروط العقد                             │   │
│   │ terminated_at       DATE                                                 │   │
│   │ termination_reason  TEXT                                                 │   │
│   │ created_by          FK                                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Employee 1 ──────────────────── N Contracts (تاريخ العقود)                    │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────┐                 │
│   │    DOCUMENT_TYPES       │       │   DOCUMENT_TEMPLATES    │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ company_id      FK      │       │ company_id      FK      │                 │
│   │ name_ar                 │       │ name_ar                 │                 │
│   │ name_en                 │       │ name_en                 │                 │
│   │ code            UQ      │       │ type                    │                 │
│   │ category                │       │   (contract,            │                 │
│   │   (contracts,           │       │    salary_cert,         │                 │
│   │    personal,            │       │    experience_cert,     │                 │
│   │    certificates,        │       │    bank_letter, ...)    │                 │
│   │    insurance,           │       │ content         TEXT    │                 │
│   │    other)               │       │   ◀── مع متغيرات        │                 │
│   │ is_required     BOOL    │       │   {{employee_name}}     │                 │
│   │ has_expiry      BOOL    │       │   {{salary}}            │                 │
│   │ expiry_alert_days INT   │       │   {{join_date}}         │                 │
│   │ max_file_size   INT     │       │ variables       JSONB   │                 │
│   │ allowed_types   VARCHAR │       │ is_active       BOOL    │                 │
│   │ is_active       BOOL    │       │ created_by      FK      │                 │
│   └───────────┬─────────────┘       └─────────────────────────┘                 │
│               │                                                                  │
│               │ 1:N                                                              │
│               ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                            DOCUMENTS                                     │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ employee_id         UUID    FK ──────────────────────────────▶ EMPLOYEES│   │
│   │ document_type_id    UUID    FK                                           │   │
│   │ name                VARCHAR                                              │   │
│   │ file_url            VARCHAR ◀──── رابط S3                                │   │
│   │ file_type           VARCHAR ◀──── pdf, jpg, png, doc                     │   │
│   │ file_size           INT     ◀──── bytes                                  │   │
│   │ upload_date         DATE                                                 │   │
│   │ expiry_date         DATE    ◀──── NULL if no expiry                      │   │
│   │ status              VARCHAR                                              │   │
│   │   ├── valid         ◀──── ساري                                          │   │
│   │   ├── expiring      ◀──── ينتهي قريباً                                   │   │
│   │   └── expired       ◀──── منتهي                                         │   │
│   │ description         TEXT                                                 │   │
│   │ uploaded_by         FK                                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Recruitment Module (التوظيف)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             RECRUITMENT MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          JOB_POSTINGS                                    │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ company_id          UUID    FK                                           │   │
│   │ department_id       UUID    FK ────────────────────────▶ DEPARTMENTS    │   │
│   │ job_title_id        UUID    FK ────────────────────────▶ JOB_TITLES     │   │
│   │ title_ar            VARCHAR                                              │   │
│   │ title_en            VARCHAR                                              │   │
│   │ description         TEXT                                                 │   │
│   │ requirements        TEXT                                                 │   │
│   │ location            VARCHAR                                              │   │
│   │ type                VARCHAR (full_time, part_time, contract, remote)     │   │
│   │ experience_min      INT                                                  │   │
│   │ experience_max      INT                                                  │   │
│   │ salary_min          DECIMAL                                              │   │
│   │ salary_max          DECIMAL                                              │   │
│   │ vacancies           INT      ◀──── عدد الشواغر                           │   │
│   │ status              VARCHAR (draft, active, paused, closed)              │   │
│   │ posted_date         DATE                                                 │   │
│   │ closing_date        DATE                                                 │   │
│   │ applicants_count    INT      ◀──── computed                              │   │
│   │ created_by          FK                                                   │   │
│   └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                   │                                              │
│                                   │ 1:N                                          │
│                                   ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                           APPLICANTS                                     │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ job_posting_id      UUID    FK                                           │   │
│   │ first_name          VARCHAR                                              │   │
│   │ last_name           VARCHAR                                              │   │
│   │ email               VARCHAR                                              │   │
│   │ phone               VARCHAR                                              │   │
│   │ resume_url          VARCHAR ◀──── رابط السيرة الذاتية                    │   │
│   │ cover_letter        TEXT                                                 │   │
│   │ experience_years    INT                                                  │   │
│   │ current_company     VARCHAR                                              │   │
│   │ current_title       VARCHAR                                              │   │
│   │ expected_salary     DECIMAL                                              │   │
│   │ source              VARCHAR (linkedin, website, referral, agency)        │   │
│   │ status              VARCHAR                                              │   │
│   │   ┌── new           ◀──── جديد                                          │   │
│   │   ├── screening     ◀──── فرز                                           │   │
│   │   ├── interview     ◀──── مقابلة                                         │   │
│   │   ├── technical     ◀──── تقني                                          │   │
│   │   ├── offer         ◀──── عرض                                           │   │
│   │   ├── hired         ◀──── معين                                          │   │
│   │   └── rejected      ◀──── مرفوض                                         │   │
│   │ rating              INT (1-5)                                            │   │
│   │ notes               TEXT                                                 │   │
│   │ applied_at          TIMESTAMP                                            │   │
│   └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                   │                                              │
│               ┌───────────────────┴───────────────────┐                         │
│               │ 1:N                                   │ 1:1                      │
│               ▼                                       ▼                          │
│   ┌─────────────────────────┐             ┌─────────────────────────┐           │
│   │       INTERVIEWS        │             │       JOB_OFFERS        │           │
│   │─────────────────────────│             │─────────────────────────│           │
│   │ id              PK      │             │ id              PK      │           │
│   │ applicant_id    FK      │             │ applicant_id    FK      │           │
│   │ interviewer_id  FK      │──▶EMPLOYEES │ job_posting_id  FK      │           │
│   │ scheduled_at    TIMESTAMP             │ salary          DECIMAL │           │
│   │ duration_minutes INT    │             │ start_date      DATE    │           │
│   │ type                    │             │ contract_type   VARCHAR │           │
│   │   (phone, in_person,    │             │ benefits        TEXT    │           │
│   │    video)               │             │ terms           TEXT    │           │
│   │ round           INT     │             │ status                  │           │
│   │ location        VARCHAR │             │   (draft, sent,         │           │
│   │ meeting_link    VARCHAR │             │    accepted, rejected,  │           │
│   │ status                  │             │    negotiating,         │           │
│   │   (scheduled,           │             │    withdrawn)           │           │
│   │    completed,           │             │ sent_at         TIMESTAMP           │
│   │    cancelled,           │             │ responded_at    TIMESTAMP           │
│   │    no_show)             │             │ expiry_date     DATE    │           │
│   │ rating          INT     │             │ created_by      FK      │           │
│   │ feedback        TEXT    │             └─────────────────────────┘           │
│   │ result                  │                                                   │
│   │   (pass, fail, pending) │                       │                           │
│   └─────────────────────────┘                       │                           │
│                                                     │ Convert to Employee       │
│                                                     ▼                           │
│                                         ┌─────────────────────────┐             │
│                                         │       EMPLOYEES         │             │
│                                         │─────────────────────────│             │
│                                         │ ...                     │             │
│                                         └─────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Performance Module (الأداء)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             PERFORMANCE MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────┐       ┌─────────────────────────┐                 │
│   │    REVIEW_TEMPLATES     │       │     REVIEW_CYCLES       │                 │
│   │─────────────────────────│       │─────────────────────────│                 │
│   │ id              PK      │       │ id              PK      │                 │
│   │ company_id      FK      │       │ company_id      FK      │                 │
│   │ name_ar                 │       │ name_ar                 │                 │
│   │ name_en                 │       │ name_en                 │                 │
│   │ description             │       │ type                    │                 │
│   │ competencies    JSONB   │◀──┐   │   (annual,              │                 │
│   │   [                     │   │   │    semi_annual,         │                 │
│   │     {name: "جودة",      │   │   │    quarterly)           │                 │
│   │      weight: 20,        │   │   │ start_date      DATE    │                 │
│   │      description: ""    │   │   │ end_date        DATE    │                 │
│   │     },                  │   │   │ review_start    DATE    │                 │
│   │     ...                 │   │   │ review_end      DATE    │                 │
│   │   ]                     │   │   │ template_id     FK      │─────────┘       │
│   │ rating_scale    INT     │   │   │ status                  │                 │
│   │   (1-5)                 │   │   │   (draft, active,       │                 │
│   │ is_active               │   │   │    completed, closed)   │                 │
│   └─────────────────────────┘   │   │ created_by      FK      │                 │
│                                 │   └───────────┬─────────────┘                 │
│                                 │               │                                │
│                                 │               │ 1:N                            │
│                                 │               ▼                                │
│   ┌─────────────────────────────┼───────────────────────────────────────────┐   │
│   │                             │   PERFORMANCE_REVIEWS                      │   │
│   │─────────────────────────────┼───────────────────────────────────────────│   │
│   │ id                  UUID    │ PK                                         │   │
│   │ cycle_id            UUID    │ FK                                         │   │
│   │ employee_id         UUID   FK ────────────────────────────▶ EMPLOYEES   │   │
│   │ reviewer_id         UUID   FK ────────────────────────────▶ EMPLOYEES   │   │
│   │                             │                                            │   │
│   │ ┌─────────────────────────┐ │ ┌─────────────────────────┐               │   │
│   │ │    SELF ASSESSMENT      │ │ │   MANAGER ASSESSMENT    │               │   │
│   │ │─────────────────────────│ │ │─────────────────────────│               │   │
│   │ │ self_assessment   JSONB │ │ │ manager_assessment JSONB│               │   │
│   │ │   {competencies: [...]} │ │ │   {competencies: [...]} │               │   │
│   │ │ self_comments     TEXT  │ │ │ manager_comments   TEXT │               │   │
│   │ └─────────────────────────┘ │ │ strengths          TEXT │               │   │
│   │                             │ │ improvements       TEXT │               │   │
│   │                             │ └─────────────────────────┘               │   │
│   │                             │                                            │   │
│   │ overall_score       DECIMAL(3,1) ◀──── 1.0 - 5.0                        │   │
│   │ goals_completed     INT                                                  │   │
│   │ goals_total         INT                                                  │   │
│   │ status              VARCHAR                                              │   │
│   │   (pending, self_review, manager_review, completed, approved)            │   │
│   │ completed_at        TIMESTAMP                                            │   │
│   │ approved_by         FK                                                   │   │
│   │ approved_at         TIMESTAMP                                            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                              GOALS                                       │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ employee_id         UUID    FK ──────────────────────────────▶ EMPLOYEES│   │
│   │ cycle_id            UUID    FK (optional)                                │   │
│   │ title               VARCHAR                                              │   │
│   │ description         TEXT                                                 │   │
│   │ target              VARCHAR ◀──── الهدف المحدد                           │   │
│   │ weight              INT     ◀──── الوزن %                                │   │
│   │ progress            INT     ◀──── 0-100%                                 │   │
│   │ status              VARCHAR (active, completed, cancelled)               │   │
│   │ due_date            DATE                                                 │   │
│   │ completed_at        TIMESTAMP                                            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Training Module (التدريب)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TRAINING MODULE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                             COURSES                                      │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ company_id          UUID    FK                                           │   │
│   │ title_ar            VARCHAR                                              │   │
│   │ title_en            VARCHAR                                              │   │
│   │ description         TEXT                                                 │   │
│   │ category            VARCHAR ◀──── قيادة، تقنية، موارد بشرية...            │   │
│   │ instructor          VARCHAR                                              │   │
│   │ duration_hours      INT                                                  │   │
│   │ lessons_count       INT                                                  │   │
│   │ level               VARCHAR (beginner, intermediate, advanced)           │   │
│   │ type                VARCHAR (video, document, interactive, classroom)    │   │
│   │ thumbnail_url       VARCHAR                                              │   │
│   │ is_mandatory        BOOL    ◀──── إلزامية؟                               │   │
│   │ target_departments  JSONB   ◀──── الأقسام المستهدفة                       │   │
│   │ max_enrollments     INT     ◀──── الحد الأقصى                            │   │
│   │ status              VARCHAR (draft, active, archived)                    │   │
│   │ rating              DECIMAL ◀──── متوسط التقييم                          │   │
│   │ created_by          FK                                                   │   │
│   └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                   │                                              │
│                                   │ 1:N                                          │
│                                   ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                        COURSE_ENROLLMENTS                                │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ course_id           UUID    FK                                           │   │
│   │ employee_id         UUID    FK ──────────────────────────────▶ EMPLOYEES│   │
│   │ progress            INT     ◀──── 0-100%                                 │   │
│   │ status              VARCHAR                                              │   │
│   │   ├── enrolled      ◀──── مسجل                                          │   │
│   │   ├── in_progress   ◀──── قيد التنفيذ                                   │   │
│   │   ├── completed     ◀──── مكتمل                                         │   │
│   │   └── dropped       ◀──── منسحب                                         │   │
│   │ enrolled_at         TIMESTAMP                                            │   │
│   │ started_at          TIMESTAMP                                            │   │
│   │ completed_at        TIMESTAMP                                            │   │
│   │ rating              INT     ◀──── تقييم الموظف للدورة 1-5                │   │
│   │ feedback            TEXT                                                 │   │
│   │                                                                          │   │
│   │ UNIQUE(course_id, employee_id)                                           │   │
│   └───────────────────────────────┬─────────────────────────────────────────┘   │
│                                   │                                              │
│                                   │ 1:1 (on completion)                          │
│                                   ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          CERTIFICATES                                    │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ enrollment_id       UUID    FK                                           │   │
│   │ employee_id         UUID    FK                                           │   │
│   │ course_id           UUID    FK                                           │   │
│   │ certificate_number  VARCHAR UQ                                           │   │
│   │ issue_date          DATE                                                 │   │
│   │ expiry_date         DATE    ◀──── NULL if no expiry                      │   │
│   │ pdf_url             VARCHAR ◀──── رابط شهادة PDF                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. General Tables (جداول عامة)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              GENERAL TABLES                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                          NOTIFICATIONS                                   │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ user_id             UUID    FK ──────────────────────────────▶ USERS    │   │
│   │ title               VARCHAR                                              │   │
│   │ message             TEXT                                                 │   │
│   │ type                VARCHAR                                              │   │
│   │   (leave_request, payroll, document_expiry, attendance, ...)             │   │
│   │ category            VARCHAR (info, warning, success, danger)             │   │
│   │ link                VARCHAR ◀──── رابط للانتقال                          │   │
│   │ is_read             BOOL    DEFAULT FALSE                                │   │
│   │ read_at             TIMESTAMP                                            │   │
│   │ sent_via            VARCHAR (system, email, sms)                         │   │
│   │ created_at          TIMESTAMP                                            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         CALENDAR_EVENTS                                  │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ company_id          UUID    FK                                           │   │
│   │ title               VARCHAR                                              │   │
│   │ description         TEXT                                                 │   │
│   │ type                VARCHAR                                              │   │
│   │   (leave, holiday, birthday, training, interview, contract, meeting)     │   │
│   │ start_date          DATE                                                 │   │
│   │ end_date            DATE                                                 │   │
│   │ start_time          TIME                                                 │   │
│   │ end_time            TIME                                                 │   │
│   │ all_day             BOOL    DEFAULT TRUE                                 │   │
│   │ color               VARCHAR                                              │   │
│   │ employee_id         UUID    FK (optional)                                │   │
│   │ reference_id        UUID    ◀──── ID of related entity                   │   │
│   │ reference_type      VARCHAR ◀──── Type of related entity                 │   │
│   │ created_by          FK                                                   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                           AUDIT_LOGS                                     │   │
│   │─────────────────────────────────────────────────────────────────────────│   │
│   │ id                  UUID    PK                                           │   │
│   │ user_id             UUID    FK (nullable - for system actions)           │   │
│   │ user_name           VARCHAR ◀──── لحفظ الاسم حتى لو حذف المستخدم         │   │
│   │ action              VARCHAR                                              │   │
│   │   (create, update, delete, approve, reject, login, logout)               │   │
│   │ module              VARCHAR (employees, leaves, payroll, ...)            │   │
│   │ entity_type         VARCHAR ◀──── اسم الجدول                              │   │
│   │ entity_id           UUID    ◀──── ID السجل                                │   │
│   │ old_values          JSONB   ◀──── القيم القديمة                           │   │
│   │ new_values          JSONB   ◀──── القيم الجديدة                           │   │
│   │ ip_address          VARCHAR                                              │   │
│   │ user_agent          TEXT                                                 │   │
│   │ description         TEXT    ◀──── وصف مقروء                               │   │
│   │ created_at          TIMESTAMP                                            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Quick Reference - All Tables Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│                    COMPLETE TABLES LIST (38 Tables)                  │
├────────────────────────┬──────────────────────┬──────────────────────┤
│    ORGANIZATION (7)    │    ATTENDANCE (5)    │     LEAVES (4)       │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ ○ companies            │ ○ shifts             │ ○ leave_types        │
│ ○ branches             │ ○ shift_assignments  │ ○ leave_balances     │
│ ○ departments          │ ○ attendance_records │ ○ leave_requests     │
│ ○ teams                │ ○ overtime_records   │ ○ holidays           │
│ ○ grades               │ ○ permission_requests│                      │
│ ○ job_titles           │                      │                      │
│ ○ employees            │                      │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│      AUTH (5)          │     PAYROLL (9)      │   CONTRACTS (4)      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ ○ users                │ ○ payroll_periods    │ ○ contracts          │
│ ○ roles                │ ○ payroll_records    │ ○ document_types     │
│ ○ permissions          │ ○ allowance_types    │ ○ documents          │
│ ○ role_permissions     │ ○ employee_allowances│ ○ document_templates │
│ ○ user_sessions        │ ○ deduction_types    │                      │
│                        │ ○ employee_deductions│                      │
│                        │ ○ bonuses            │                      │
│                        │ ○ loans              │                      │
│                        │ ○ loan_installments  │                      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│   RECRUITMENT (4)      │   PERFORMANCE (4)    │    TRAINING (3)      │
├────────────────────────┼──────────────────────┼──────────────────────┤
│ ○ job_postings         │ ○ review_cycles      │ ○ courses            │
│ ○ applicants           │ ○ review_templates   │ ○ course_enrollments │
│ ○ interviews           │ ○ performance_reviews│ ○ certificates       │
│ ○ job_offers           │ ○ goals              │                      │
├────────────────────────┴──────────────────────┴──────────────────────┤
│                           GENERAL (3)                                │
├──────────────────────────────────────────────────────────────────────┤
│ ○ notifications                                                      │
│ ○ calendar_events                                                    │
│ ○ audit_logs                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. Cardinality Legend (مفتاح العلاقات)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RELATIONSHIP SYMBOLS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ──────────    Simple line connection                              │
│                                                                      │
│   ─────▶        One-to-Many (1:N)                                   │
│                 Example: Company ────▶ Branches                     │
│                 (One company has many branches)                      │
│                                                                      │
│   ◀────▶        Many-to-Many (N:M)                                  │
│                 Example: Roles ◀────▶ Permissions                   │
│                 (via role_permissions junction table)               │
│                                                                      │
│   ─────○        Optional relationship (0 or more)                   │
│                 Example: Employee ─────○ Manager                    │
│                 (Employee may or may not have a manager)            │
│                                                                      │
│   ◀──┐          Self-referencing relationship                       │
│      │          Example: Department ◀──┐                            │
│      └──────    (Department has parent department)                  │
│                                                                      │
│   ─────●        Required relationship (1 or more)                   │
│                 Example: Employee ─────● Department                 │
│                 (Employee must have a department)                   │
│                                                                      │
│   PK            Primary Key                                          │
│   FK            Foreign Key                                          │
│   UQ            Unique Constraint                                    │
│   NN            Not Null                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 14. Indexes Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CRITICAL INDEXES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ EMPLOYEES                                                            │
│ ├── idx_employees_department (department_id)                        │
│ ├── idx_employees_branch (branch_id)                                │
│ ├── idx_employees_manager (manager_id)                              │
│ ├── idx_employees_status (status)                                   │
│ ├── idx_employees_number (employee_number)                          │
│ └── idx_emp_search (GIN on full name - Arabic text search)         │
│                                                                      │
│ ATTENDANCE                                                           │
│ ├── idx_attendance_employee (employee_id)                           │
│ ├── idx_attendance_date (date)                                      │
│ ├── idx_attendance_status (status)                                  │
│ └── idx_attendance_report (employee_id, date, status)              │
│                                                                      │
│ LEAVES                                                               │
│ ├── idx_leave_requests_employee (employee_id)                       │
│ ├── idx_leave_requests_status (status)                              │
│ ├── idx_leave_requests_dates (start_date, end_date)                │
│ ├── idx_leave_balances_employee (employee_id)                       │
│ └── idx_active_leaves (status, dates) WHERE status='approved'      │
│                                                                      │
│ PAYROLL                                                              │
│ ├── idx_payroll_records_period (payroll_period_id)                  │
│ └── idx_payroll_records_employee (employee_id)                      │
│                                                                      │
│ CONTRACTS                                                            │
│ ├── idx_contracts_employee (employee_id)                            │
│ ├── idx_contracts_status (status)                                   │
│ └── idx_expiring_contracts (end_date) WHERE status='active'        │
│                                                                      │
│ DOCUMENTS                                                            │
│ ├── idx_documents_employee (employee_id)                            │
│ ├── idx_documents_status (status)                                   │
│ └── idx_expiring_docs (expiry_date) WHERE status!='expired'        │
│                                                                      │
│ NOTIFICATIONS                                                        │
│ ├── idx_notifications_user (user_id)                                │
│ ├── idx_notifications_read (is_read)                                │
│ └── idx_unread_notifications (user_id, created_at) WHERE !is_read  │
│                                                                      │
│ AUDIT                                                                │
│ ├── idx_audit_user (user_id)                                        │
│ ├── idx_audit_module (module)                                       │
│ ├── idx_audit_entity (entity_type, entity_id)                       │
│ └── idx_audit_created (created_at DESC)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
