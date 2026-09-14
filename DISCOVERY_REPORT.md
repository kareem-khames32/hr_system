# DISCOVERY_REPORT — تدقيق ما قبل المسير (Phase 0)

> **الحالة:** جرد فقط (بلا أحكام أو إصلاحات). كل بند مدعوم بدليل (`file:line` أو استعلام DB فعلي).
> **النطاق:** الإعدادات، الموظفون، الحضور والأذونات، الإجازات، محرك الطلبات والموافقات، الأوفرتايم، العهدة، النقل، الاستقالة والإخلاء، وقاعدة البيانات. **خارج النطاق:** حساب المسير (الرواتب/GOSI/القسائم) — نتحقق من نقاط التسليم فقط لاحقاً.
> **الطريقة:** ٧ وكلاء متوازيين جردوا الكود بالأدلة + استعلام مباشر لقاعدة البيانات الحقيقية (SQL Server / Docker).

---

## Finding #0 — البيئة (Environment)

المكدّس **شغّال فعلاً** أثناء التدقيق: API على `localhost:4000` (health 200)، الفرونت على `localhost:3000`، وSQL Server في Docker (حاوية `hr-sqlserver`). لا يوجد Finding #0 حاجز — البيئة تعمل.

> ⚠️ **ملاحظة منهجية:** الاستعلامات جرت على قاعدة **التطوير الحيّة** `hr_system` (مش قاعدة تدقيق منفصلة _audit)، لأنها القاعدة الوحيدة المتاحة. لم تُعدَّل أي بيانات في هذا الجرد (قراءة فقط). لأي اختبارات ديناميكية في Phase A يُفضَّل نسخة منفصلة.

---

## معطيات قاعدة البيانات الحقيقية (Ground Truth — استعلام مباشر)

استُعلمت القاعدة `hr_system` مباشرةً عبر `mssql`. النتائج:

| القياس | القيمة | ملاحظة |
|---|---|---|
| عدد الجداول | **50** | تُقابلها كيانات TypeORM (synchronize:true) |
| **المفاتيح الخارجية (FK)** | **3 فقط** في القاعدة كلها | فجوة كبيرة — تُحلَّل في A7 |
| أعمدة VARCHAR/CHAR (خطر العربي) | **0** | ✅ كل النصوص `NVARCHAR` — تخزين العربي سليم |
| فهارس الجداول الساخنة | موجودة | attendance_days / requests / leaves / attendance_punches / request_approvals كلها مفهرسة |

**الـ FK الثلاثة الموجودة فقط:**
`approval_steps → approval_chains` · `teams → departments` · `departments → branches`

> كل العلاقات الأخرى (طلب↔موظف، بصمة↔موظف، عهدة↔أصل↔موظف، رصيد↔موظف، موافقة↔طلب...) **أعمدة رقمية مجردة بلا FK على مستوى القاعدة** — خطر يتيم/تكامل يُحلَّل في A7 بشدّة.

**أعداد صفوف مختارة (لقياس الحجم الحقيقي):**
`employees=117` · `requests=187` · `request_approvals=187` · `leave_balances=234` · `leaves=47` · `attendance_days=178` · `attendance_punches=7284` · `custody_assignments=21` · `overtime_entries=21` · `clearance_items=50` · `offboarding_cases=10` · `approval_chains=68` · `request_types=65` · `permission_types=16` · `shifts=19` · `work_schedules=3` · `cost_centers=2` · `branches=1` · `departments=1` · `teams=2`

**فهارس الجداول الساخنة (مؤكَّدة):** `attendance_days` (PK + unique(employeeId,date) + فهرسان)، `requests` (PK + 3 فهارس)، `leaves` (PK + فهرس)، `attendance_punches` (PK + فهرسان)، `request_approvals` (PK + فهرس).

---



# ══════════════════════════════════
# 1 · جرد الكيانات والجداول (Entities & Tables)
# ══════════════════════════════════

All 24 files read (50 entities). Here is the section.

---

## قسم: جرد الكيانات / الجداول (Entity / Table Inventory)

> **ملاحظة عامة عن الترميز:** مشغّل `mssql` في TypeORM يُصدِّر كل عمود `string` كـ **`NVARCHAR`** افتراضياً، فكل الأعمدة النصية تحفظ العربية بأمان بلا إعداد إضافي. الأعمدة التي غالباً تحمل نصاً عربياً مُعلَّمة بـ **AR** في عمود الملاحظات.
> **ملاحظة عن الـ FK:** المشروع كله تقريباً يستخدم `plain number id` بلا `@ManyToOne` — أي **لا توجد Foreign Key على مستوى قاعدة البيانات**. الاستثناءات الوحيدة (علاقات حقيقية بـ `@ManyToOne + @JoinColumn`) هي: `ApprovalStep→ApprovalChain`، `Team→Department`، `Department→Branch`. أعلام «بلا FK» مُجمَّعة في نهاية كل وحدة.

---

### 1) employees — `api/src/employees/employee.entity.ts`

**`Employee`** → `@Entity('employees')` (`employee.entity.ts:17`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:19` |
| employeeCode | nvarchar(20) | no | **Unique index** | `@Index({unique})` `:23` |
| fullName | nvarchar(200) | no | | AR `:28` |
| fullNameEn | nvarchar(200) | yes | | `:31` |
| photoFileId | int | yes | | → StoredFile (no FK) `:35` |
| email | nvarchar(200) | yes | | `:38` |
| phone | nvarchar(50) | yes | | `:41` |
| nationalId | nvarchar(50) | yes | | `:44` |
| birthDate | date | yes | | `:48` |
| gender | nvarchar(10) | yes | | `:51` |
| maritalStatus | nvarchar(20) | yes | | `:54` |
| nationality | nvarchar(100) | yes | | AR `:57` |
| address | nvarchar(500) | yes | | AR `:60` |
| emergencyContactName | nvarchar(200) | yes | | AR `:63` |
| emergencyContactPhone | nvarchar(50) | yes | | `:66` |
| jobTitle | nvarchar(100) | yes | | AR `:69` |
| branchId | int | no | **Index** | → Branch (no FK) `:71` |
| departmentId | int | yes | | → Department (no FK) `:76` |
| teamId | int | yes | | → Team (no FK) `:79` |
| managerEmployeeId | int | yes | | self→Employee (no FK) `:83` |
| costCenterId | int | yes | | → CostCenter (no FK) `:87` |
| workScheduleId | int | yes | | → WorkSchedule (no FK) `:92` |
| annualLeaveEntitled | bit | no (def true) | | `:95` |
| joinDate | date | yes | | `:99` |
| contractType | nvarchar(30) | yes | | `:103` |
| contractStart | date | yes | | `:106` |
| contractEnd | date | yes | | `:109` |
| status | nvarchar(20) | no (def 'active') | | enum EmployeeStatus `:112` |
| archivedAt | datetime | yes | | `:116` |
| archiveReason | nvarchar(300) | yes | | AR `:119` |
| basicSalary | decimal(18,2) | yes | | `:122` |
| housingAllowance | decimal(18,2) | no (def 0) | | `:126` |
| transportAllowance | decimal(18,2) | no (def 0) | | `:129` |
| otherAllowance | decimal(18,2) | no (def 0) | | `:132` |
| payMethod | nvarchar(20) | no (def 'transfer') | | `:136` |
| bankName | nvarchar(100) | yes | | `:139` |
| iban | nvarchar(50) | yes | | `:142` |
| isActive | bit | no (def true) | | `:145` |
| createdAt | datetime | no | | `@CreateDateColumn` `:148` |

**علم بلا FK:** `Employee` — كل روابطه (`branchId`, `departmentId`, `teamId`, `managerEmployeeId`, `costCenterId`, `workScheduleId`, `photoFileId`) أعمدة رقمية مجردة بلا `@ManyToOne`.

---

### 2) attendance — `api/src/attendance/attendance.entities.ts`

**`AttendancePunch`** → `@Entity('attendance_punches')` + `@Index(['employeeId','punchTime'])` (`:11-13`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:15` |
| employeeCode | nvarchar(20) | no | **Index** | `:18` |
| employeeId | int | yes | composite index | → Employee (no FK) `:23` |
| punchTime | datetime | no | composite index | `:26` |
| deviceSn | nvarchar(50) | yes | | `:29` |
| receivedAt | datetime | no | | `@CreateDateColumn` `:32` |

**`ScheduleEntry`** → `@Entity('weekly_schedule_entries')` + `@Unique(['weekStart','employeeId'])` (`:37-39`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:41` |
| weekStart | date | no | **Index** + unique(weekStart,employeeId) | `:44` |
| employeeId | int | no | **Index** + unique | → Employee (no FK) `:48` |
| shiftName | nvarchar(100) | no | | AR `:51` |
| startTime | nvarchar(5) | no | | HH:mm `:54` |
| endTime | nvarchar(5) | no | | HH:mm `:57` |

**`PermissionType`** → `@Entity('permission_types')` (`:63`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:65` |
| nameAr | nvarchar(100) | no | **Unique index** | AR `:69` |
| isDeductible | bit | no (def false) | | `:72` |
| maxDurationMinutes | int | yes | | `:76` |
| monthlyFreeCount | int | yes | | `:82` |
| monthlyFreeMinutes | int | yes | | `:85` |
| deductionPct | decimal(5,2) | no (def 100) | | `:88` |
| coverage | nvarchar(10) | no (def 'both') | | morning\|evening\|both `:94` |
| isActive | bit | no (def true) | | `:97` |

**`ScheduleDayOverride`** → `@Entity('schedule_day_overrides')` + `@Unique(['employeeId','date'])` (`:101-103`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:105` |
| employeeId | int | no | **Index** + unique(employeeId,date) | → Employee (no FK) `:108` |
| date | date | no | **Index** + unique | `:112` |
| shiftName | nvarchar(100) | no | | AR `:115` |
| startTime | nvarchar(5) | no | | `:118` |
| endTime | nvarchar(5) | no | | `:121` |

**`AttendanceDay`** → `@Entity('attendance_days')` + `@Unique(['employeeId','date'])` (`:135-136`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:137` |
| employeeId | int | no | **Index** + unique(employeeId,date) | → Employee (no FK) `:142` |
| branchId | int | yes | **Index** | → Branch (no FK) `:146` |
| date | date | no | unique | `:150` |
| checkIn | nvarchar(5) | yes | | `:153` |
| checkOut | nvarchar(5) | yes | | `:156` |
| shiftName | nvarchar(100) | no | | AR `:159` |
| shiftStart | nvarchar(5) | no | | `:162` |
| shiftEnd | nvarchar(5) | no | | `:165` |
| status | nvarchar(20) | no | | enum AttendanceStatus `:168` |
| lateMinutes | int | no (def 0) | | `:171` |
| earlyLeaveMinutes | int | no (def 0) | | `:174` |
| excusedMinutes | int | no (def 0) | | `:178` |
| deductibleMinutes | int | no (def 0) | | `:182` |
| workMinutes | int | no (def 0) | | `:185` |
| leaveConflict | bit | no (def false) | | `:190` |
| computedAt | datetime | yes | | `:193` |

**`ScheduleExceptionRule`** → `@Entity('schedule_exception_rules')` (`:204`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:206` |
| name | nvarchar(200) | no | | AR `:209` |
| weekday | nvarchar(10) | no | | enum RuleWeekday `:212` |
| occurrence | nvarchar(10) | no (def 'ALL') | | enum RuleOccurrence `:215` |
| effect | nvarchar(10) | no | | WORK\|OFF `:218` |
| branchId | int | yes | | → Branch (no FK) `:222` |
| isActive | bit | no (def true) | | `:225` |

**`OvertimePeriod`** → `@Entity('overtime_periods')` (`:233`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:235` |
| name | nvarchar(200) | no | | AR `:237` |
| fromDate | date | no | | `:240` |
| toDate | date | no | | `:243` |
| effect | nvarchar(10) | no | | OPEN\|CLOSED `:246` |
| branchId | int | yes | | → Branch (no FK) `:250` |
| isActive | bit | no (def true) | | `:253` |

**علم بلا FK (attendance):** الكيانات السبعة كلها بلا `@ManyToOne` — `employeeId`/`branchId` أعمدة رقمية مجردة في `AttendancePunch, ScheduleEntry, ScheduleDayOverride, AttendanceDay, ScheduleExceptionRule, OvertimePeriod`.

---

### 3) assets (كتالوجات/إعدادات) — `api/src/assets/assets.entities.ts`

> هذا الملف رغم اسمه «assets» يحوي كتالوجات إعداد متنوعة؛ كيان `Asset` الفعلي موجود في وحدة requests (`custody.entities.ts`).

**`AssetType`** → `@Entity('asset_types')` (`:11`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:13` |
| name | nvarchar(100) | no | **Unique index** | AR `:17` |
| isActive | bit | no (def true) | | `:20` |

**`EmployeeDocument`** → `@Entity('employee_documents')` (`:25`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:27` |
| employeeId | int | no | **Index** | → Employee (no FK) `:31` |
| docType | nvarchar(100) | no | | AR `:34` |
| number | nvarchar(100) | yes | | `:37` |
| issueDate | date | yes | | `:40` |
| expiryDate | date | yes | | `:43` |
| fileRef | nvarchar(500) | yes | | `:46` |
| notes | nvarchar(500) | yes | | AR `:49` |

**`PublicHoliday`** → `@Entity('public_holidays')` (`:54`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:56` |
| name | nvarchar(200) | no | | AR `:59` |
| date | date | no | **Index** | `:63` |
| endDate | date | yes | | `:66` |
| country | nvarchar(5) | no (def 'EG') | | `:69` |

**`Shift`** → `@Entity('shifts')` (`:74`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:76` |
| name | nvarchar(100) | no | **Unique index** | AR `:80` |
| startTime | nvarchar(5) | no | | `:83` |
| endTime | nvarchar(5) | no | | `:86` |
| shiftMode | nvarchar(10) | no (def 'fixed') | | fixed\|flexible `:91` |
| requiredHours | decimal(4,2) | yes | | `:95` |
| graceMinutes | int | yes | | `:99` |
| overtimeThresholdHours | decimal(4,2) | yes | | `:103` |
| checkinFrom | nvarchar(5) | yes | | `:108` |
| checkinTo | nvarchar(5) | yes | | `:111` |
| checkoutFrom | nvarchar(5) | yes | | `:114` |
| checkoutTo | nvarchar(5) | yes | | `:117` |
| isActive | bit | no (def true) | | `:120` |

**`WorkSchedule`** → `@Entity('work_schedules')` (`:126`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:128` |
| name | nvarchar(100) | no | **Unique index** | AR `:132` |
| description | nvarchar(200) | yes | | AR `:135` |
| weekendDays | nvarchar(40) | no (def 'FRI,SAT') | | `:139` |
| startTime | nvarchar(5) | no (def '08:00') | | `:142` |
| endTime | nvarchar(5) | no (def '17:00') | | `:145` |
| isDefault | bit | no (def false) | | `:148` |
| isActive | bit | no (def true) | | `:151` |

**`BiometricDevice`** → `@Entity('biometric_devices')` (`:156`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:158` |
| name | nvarchar(100) | no | | AR `:160` |
| serialNumber | nvarchar(50) | no | **Unique index** | `:164` |
| branchId | int | no | | → Branch (no FK) `:167` |
| ip | nvarchar(50) | yes | | `:172` |
| port | int | no (def 4370) | | `:174` |
| authKey | nvarchar(100) | yes | | `:178` |
| lastSyncAt | datetime | yes | | `:181` |
| lastStatus | nvarchar(300) | yes | | `:185` |
| lastSyncCount | int | no (def 0) | | `:188` |
| isActive | bit | no (def true) | | `:191` |

**`JobTitle`** → `@Entity('job_titles')` (`:196`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:198` |
| title | nvarchar(200) | no | **Unique index** | AR `:202` |
| titleEn | nvarchar(200) | yes | | `:205` |
| isActive | bit | no (def true) | | `:208` |

**`Grade`** → `@Entity('grades')` (`:213`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:215` |
| name | nvarchar(100) | no | **Unique index** | AR `:218` |
| minSalary | decimal(18,2) | yes | | `:221` |
| maxSalary | decimal(18,2) | yes | | `:224` |
| isActive | bit | no (def true) | | `:227` |

**`CostCenter`** → `@Entity('cost_centers')` (`:233`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:235` |
| code | nvarchar(50) | no | **Unique index** | `:238` |
| name | nvarchar(200) | no | | AR `:241` |
| isActive | bit | no (def true) | | `:244` |

**`Candidate`** → `@Entity('candidates')` (`:258`)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:260` |
| fullName | nvarchar(200) | no | | AR `:263` |
| email | nvarchar(200) | yes | | `:266` |
| phone | nvarchar(50) | yes | | `:269` |
| positionTitle | nvarchar(200) | no | | AR `:272` |
| branchId | int | yes | | → Branch (no FK) `:275` |
| stage | nvarchar(20) | no (def 'applied') | **Index** | enum CandidateStage `:279` |
| notes | nvarchar(1000) | yes | | AR `:282` |
| hiredEmployeeId | int | yes | | → Employee (no FK) `:286` |
| createdAt | datetime | no | | `@CreateDateColumn` `:289` |

**علم بلا FK (assets):** كل الكيانات العشرة بلا `@ManyToOne`؛ الروابط (`employeeId`, `branchId`, `hiredEmployeeId`) أعمدة رقمية مجردة.

---

### 4) requests — `api/src/requests/entities/*.ts` (20 كيان)

**`Request`** → `@Entity('requests')` — `request.entity.ts:21`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:23` |
| typeCode | nvarchar(50) | no | **Index** | → RequestType.code (no FK) `:27` |
| requesterId | int | no | **Index** | → Employee (no FK) `:31` |
| createdByUserId | int | yes | | → User (no FK) `:35` |
| branchId | int | yes | **Index** | → Branch (no FK) `:39` |
| status | nvarchar(30) | no (def 'DRAFT') | | enum RequestStatus (9) `:42` |
| currentStep | int | yes | | `:47` |
| payload | nvarchar(MAX) | yes | | JSON `:50` |
| destinationRef | nvarchar(200) | yes | | `:55` |
| resolvedSteps | nvarchar(MAX) | yes | | JSON `:59` |
| createdAt | datetime | no | | `@CreateDateColumn` `:62` |
| submittedAt | datetime | yes | | `:65` |
| completedAt | datetime | yes | | `:68` |

**`LeaveType`** → `@Entity('leave_types')` — `leave.entities.ts:12`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:14` |
| code | nvarchar(50) | no | **Unique index** | `:18` |
| nameAr | nvarchar(200) | no | | AR `:21` |
| isPaid | bit | no (def true) | | `:24` |
| balanceSource | nvarchar(50) | yes | | annual\|sick\|none `:28` |
| requiredAttachment | nvarchar(100) | yes | | `:31` |
| maxDays | int | yes | | `:34` |
| oncePerService | bit | no (def false) | | `:38` |
| approvalChainId | int | yes | | → ApprovalChain (no FK) `:41` |
| isActive | bit | no (def true) | | `:44` |

**`Leave`** → `@Entity('leaves')` — `leave.entities.ts:48`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:50` |
| requestId | int | yes | | → Request (no FK) `:53` |
| employeeId | int | no | **Index** | → Employee (no FK) `:57` |
| leaveType | nvarchar(50) | no | | `:60` |
| fromDate | date | no | | `:63` |
| toDate | date | no | | `:66` |
| days | decimal(5,2) | no | | `:69` |
| period | nvarchar(10) | no (def 'FULL') | | FULL\|MORNING\|EVENING `:74` |
| isUnpaid | bit | no (def false) | | `:78` |
| status | nvarchar(30) | no | | APPROVED\|CANCELLED `:81` |
| revokedByUserId | int | yes | | → User (no FK) `:85` |
| revokedAt | datetime | yes | | `:88` |

**`LeaveBalance`** → `@Entity('leave_balances')` + `@Unique(['employeeId','balanceType','period'])` — `leave.entities.ts:91-92`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:94` |
| employeeId | int | no | **Index** + unique(employeeId,balanceType,period) | → Employee (no FK) `:98` |
| balanceType | nvarchar(50) | no | unique | annual\|sick `:101` |
| entitled | decimal(6,2) | no (def 0) | | `:104` |
| taken | decimal(6,2) | no (def 0) | | `:107` |
| period | nvarchar(20) | no | unique | '2026' `:110` |
| openingDays | decimal(6,2) | no (def 0) | | `:114` |
| openingTaken | decimal(6,2) | no (def 0) | | `:117` |
| openingExpiry | date | yes | | `:121` |

**`Asset`** → `@Entity('assets')` — `custody.entities.ts:15`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:17` |
| name | nvarchar(200) | no | | AR `:20` |
| category | nvarchar(100) | no | | `:23` |
| serialNumber | nvarchar(100) | yes | | `:26` |
| value | decimal(18,2) | yes | | `:30` |
| status | nvarchar(20) | no (def 'AVAILABLE') | | enum AssetStatus `:33` |
| currentHolderId | int | yes | | → Employee (no FK) `:37` |

**`CustodyAssignment`** → `@Entity('custody_assignments')` — `custody.entities.ts:53`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:55` |
| requestId | int | yes | | → Request (no FK) `:58` |
| assetId | int | no | **Index** | → Asset (no FK) `:61` |
| employeeId | int | no | **Index** | → Employee (no FK) `:65` |
| assignedBy | int | yes | | → Employee (no FK) `:69` |
| assignedAt | datetime | no | | `@CreateDateColumn` `:72` |
| acknowledgedAt | datetime | yes | | `:76` |
| managerConfirmAt | datetime | yes | | `:80` |
| returnedAt | datetime | yes | | `:83` |
| condition | nvarchar(100) | yes | | `:87` |
| status | nvarchar(30) | no (def 'PENDING_ACK') | | enum CustodyStatus (8) `:90` |

**`ApprovalChain`** → `@Entity('approval_chains')` + `@Index(['code','branchId'],{unique})` — `approval-chain.entity.ts:6-7`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:10` |
| code | nvarchar(50) | no | **Unique(code,branchId)** | `:13` |
| nameAr | nvarchar(200) | no | | AR `:16` |
| branchId | int | yes | unique(code,branchId) | → Branch (no FK) `:20` |
| isActive | bit | no (def true) | | `:23` |
| requestTypeCode | nvarchar(50) | yes | | `:27` |
| autoApprove | bit | no (def false) | | `:32` |
| steps | (relation) | — | **@OneToMany → ApprovalStep** | inverse side `:35` |

**`ApprovalStep`** → `@Entity('approval_steps')` — `approval-step.entity.ts:26`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:27` |
| chainId | int | no | **Index** | **@ManyToOne → ApprovalChain (real FK, @JoinColumn)** `:31-36` |
| stepOrder | int | no | | `:39` |
| approverRole | nvarchar(60) | no | | enum ApproverRole (11) `:42` |
| specificEmployeeId | int | yes | | → Employee (no FK) `:46` |
| isParallel | bit | no (def false) | | `:49` |
| thresholdField | nvarchar(60) | yes | | `:54` |
| thresholdOp | nvarchar(10) | yes | | >=\|>\|<\|<= `:57` |
| thresholdValue | decimal(18,2) | yes | | `:60` |
| slaDays | int | yes | | `:64` |
| escalateTo | nvarchar(60) | yes | | `:67` |
| canDelegate | bit | no (def true) | | `:70` |

**`RequestType`** → `@Entity('request_types')` — `request-type.entity.ts:16`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:18` |
| code | nvarchar(50) | no | **Unique index** | `:22` |
| nameAr | nvarchar(200) | no | | AR `:25` |
| category | nvarchar(50) | no | | enum RequestCategory (9) `:28` |
| requiredFields | nvarchar(MAX) | yes | | JSON `:32` |
| customFields | nvarchar(MAX) | yes | | JSON `:37` |
| visibleTo | nvarchar(MAX) | yes | | JSON `:42` |
| requiredAttachments | nvarchar(MAX) | yes | | JSON `:46` |
| approvalChainId | int | yes | | → ApprovalChain (no FK) `:49` |
| destinationHandler | nvarchar(100) | no | | `:53` |
| affectsBalance | bit | no (def false) | | `:56` |
| isSecurityRoute | bit | no (def false) | | `:60` |
| isConfidential | bit | no (def false) | | `:64` |
| autoGeneratesPdf | bit | no (def false) | | `:68` |
| phase | nvarchar(5) | no (def 'P1') | | P1\|P2\|P3 `:71` |
| isActive | bit | no (def true) | | `:74` |

**`LetterRequest`** → `@Entity('letter_requests')` — `letter.entities.ts:6`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:8` |
| requestId | int | yes | | → Request (no FK) `:11` |
| employeeId | int | no | **Index** | → Employee (no FK) `:15` |
| letterType | nvarchar(50) | no | | SALARY\|EMPLOYMENT... `:18` |
| purpose | nvarchar(500) | yes | | AR `:21` |
| status | nvarchar(30) | no | | GENERATED\|DELIVERED `:24` |
| generatedPdfRef | nvarchar(500) | yes | | `:28` |

**`Transfer`** → `@Entity('transfers')` — `employment.entities.ts:12`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:14` |
| requestId | int | yes | | → Request (no FK) `:17` |
| employeeId | int | no | **Index** | → Employee (no FK) `:21` |
| fromTeam | int | no | | → Team (no FK) `:24` |
| toTeam | int | no | | → Team (no FK) `:27` |
| effectiveDate | date | no | | `:31` |
| status | nvarchar(30) | no | | SCHEDULED\|EXECUTED `:34` |
| executedAt | datetime | yes | | `:37` |

**`Promotion`** → `@Entity('promotions')` — `employment.entities.ts:41`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:43` |
| requestId | int | yes | | → Request (no FK) `:46` |
| employeeId | int | no | **Index** | → Employee (no FK) `:50` |
| fromTitle | nvarchar(200) | no | | AR `:53` |
| toTitle | nvarchar(200) | no | | AR `:56` |
| effectiveDate | date | no | | `:59` |

**`EmployeeStatusHistory`** → `@Entity('employee_status_history')` — `employment.entities.ts:64`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:66` |
| employeeId | int | no | **Index** | → Employee (no FK) `:70` |
| oldStatus | nvarchar(100) | yes | | `:73` |
| newStatus | nvarchar(100) | no | | `:76` |
| changedAt | datetime | no | | `@CreateDateColumn` `:79` |
| reason | nvarchar(500) | yes | | AR `:82` |
| requestId | int | yes | | → Request (no FK) `:85` |

**`Loan`** → `@Entity('loans')` — `financial.entities.ts:6`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:8` |
| requestId | int | yes | | → Request (no FK) `:11` |
| employeeId | int | no | **Index** | → Employee (no FK) `:15` |
| amount | decimal(18,2) | no | | `:18` |
| status | nvarchar(30) | no | | APPROVED\|DISBURSED\|SETTLED `:21` |
| disbursedAt | datetime | yes | | `:24` |

**`LoanInstallment`** → `@Entity('loan_installments')` — `financial.entities.ts:28`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:30` |
| loanId | int | no | **Index** | → Loan (no FK) `:34` |
| dueDate | date | no | | `:37` |
| amount | decimal(18,2) | no | | `:40` |
| paid | bit | no (def false) | | `:43` |

**`OvertimeEntry`** → `@Entity('overtime_entries')` — `attendance.entities.ts:14`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:16` |
| requestId | int | yes | | → Request (no FK) `:19` |
| employeeId | int | no | **Index** | → Employee (no FK) `:23` |
| date | date | no | | `:26` |
| source | nvarchar(30) | no | | enum OvertimeSource `:29` |
| hoursRequested | decimal(5,2) | yes | | `:32` |
| hoursActual | decimal(5,2) | yes | | `:36` |
| payableHours | decimal(5,2) | yes | | `:40` |
| rate | decimal(4,2) | no (def 1.5) | | `:43` |
| status | nvarchar(20) | no (def 'DETECTED') | | enum OvertimeStatus `:46` |
| payrollRunId | int | yes | | → PayrollRun (no FK) `:51` |

**`AttendanceCorrection`** → `@Entity('attendance_corrections')` — `attendance.entities.ts:54`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:56` |
| requestId | int | yes | | → Request (no FK) `:59` |
| employeeId | int | no | **Index** | → Employee (no FK) `:63` |
| date | date | no | | `:66` |
| reason | nvarchar(500) | no | | AR `:69` |
| correctedPunch | nvarchar(200) | no | | JSON `:73` |

**`RequestAttachment`** → `@Entity('request_attachments')` — `request-attachment.entity.ts:4`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:6` |
| requestId | int | no | **Index** | → Request (no FK) `:10` |
| fileRef | nvarchar(500) | no | | `:13` |
| type | nvarchar(50) | yes | | `:16` |

**`RequestApproval`** → `@Entity('request_approvals')` — `request-approval.entity.ts:18` (سجل تدقيق append-only)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:20` |
| requestId | int | no | **Index** | → Request (no FK) `:24` |
| step | int | no | | `:27` |
| approverId | int | no | | → User (no FK) `:30` |
| action | nvarchar(30) | no | | enum ApprovalAction (5) `:33` |
| comment | nvarchar(1000) | yes | | AR `:36` |
| actedAt | datetime | no | | `@CreateDateColumn` `:39` |

**`RequestsConfig`** → `@Entity('requests_config')` — `requests-config.entity.ts:6` (key/value)

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| key | nvarchar(100) | no | **PK** (`@PrimaryColumn`, غير identity) | `:8` |
| value | nvarchar(500) | no | | `:11` |

**علم بلا FK (requests):** كل الكيانات الـ20 تعتمد أعمدة رقمية مجردة **ما عدا** `ApprovalStep.chainId` (له `@ManyToOne + @JoinColumn` → FK حقيقي). ملاحظة خاصة: `requesterId` في `Request` يشير إلى `employees.id` بينما `createdByUserId`/`approverId`/`revokedByUserId` تشير إلى `users.id` — بلا FK يربط أياً منها.

---

### 5) org — `api/src/org/entities/*.ts` (3 كيانات — تحوي معظم الـ FK الحقيقية)

**`Branch`** → `@Entity('branches')` — `branch.entity.ts:10`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:12` |
| name | nvarchar(200) | no | | AR `:15` |
| nameEn | nvarchar(200) | yes | | `:18` |
| code | nvarchar(50) | no | **Unique** (`unique:true`) | `:21` |
| city | nvarchar(100) | yes | | AR `:24` |
| address | nvarchar(500) | yes | | AR `:27` |
| phone | nvarchar(50) | yes | | `:30` |
| email | nvarchar(200) | yes | | `:33` |
| managerEmployeeId | int | yes | | → Employee (no FK) `:37` |
| costCenter | nvarchar(50) | yes | | `:41` |
| weekendDays | nvarchar(30) | yes | | `:45` |
| isActive | bit | no (def true) | | `:48` |
| isHeadquarters | bit | no (def false) | | `:51` |
| departments | (relation) | — | **@OneToMany → Department** | inverse `:54` |

**`Department`** → `@Entity('departments')` — `department.entity.ts:13`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:15` |
| name | nvarchar(200) | no | | AR `:18` |
| nameEn | nvarchar(200) | yes | | `:21` |
| code | nvarchar(50) | yes | | `:24` |
| parentId | int | yes | | self→Department (no FK) `:28` |
| managerEmployeeId | int | yes | | → Employee (no FK) `:32` |
| branchId | int | no | (FK column) | **@ManyToOne → Branch (real FK, @JoinColumn)** `:35-39` |
| isActive | bit | no (def true) | | `:42` |
| teams | (relation) | — | **@OneToMany → Team** | inverse `:45` |

**`Team`** → `@Entity('teams')` — `team.entity.ts:11`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:13` |
| name | nvarchar(200) | no | | AR `:16` |
| code | nvarchar(50) | yes | | `:19` |
| leaderEmployeeId | int | yes | | → Employee (no FK) `:22` |
| departmentId | int | no | (FK column) | **@ManyToOne → Department (real FK, @JoinColumn)** `:26-30` |
| isActive | bit | no (def true) | | `:32` |

**علم بلا FK (org):** روابط `managerEmployeeId`/`leaderEmployeeId`/`parentId` إلى `employees`/self بلا `@ManyToOne`. الروابط الوحيدة الحقيقية: `Department.branchId → Branch` و`Team.departmentId → Department`.

---

### 6) offboarding — `api/src/offboarding/offboarding.entities.ts` (3 كيانات)

**`OffboardingCase`** → `@Entity('offboarding_cases')` — `:19`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:21` |
| employeeId | int | no | **Index** | → Employee (no FK) `:25` |
| resignationRequestId | int | yes | | → Request (no FK) `:28` |
| lastWorkingDay | date | no | | `:31` |
| status | nvarchar(30) | no (def 'IN_CLEARANCE') | | enum OffboardingStatus (5) `:34` |
| settlementNet | decimal(18,2) | yes | | `:38` |
| settlementApprovedBy | int | yes | | → User (no FK) `:41` |
| settlementApprovedAt | datetime | yes | | `:44` |
| settlementDocRef | nvarchar(100) | yes | | `:48` |
| clearanceCertRef | nvarchar(100) | yes | | `:51` |
| createdAt | datetime | no | | `@CreateDateColumn` `:54` |

**`ClearanceItem`** → `@Entity('clearance_items')` — `:62`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:64` |
| caseId | int | no | **Index** | → OffboardingCase (no FK) `:68` |
| party | nvarchar(20) | no | | enum ClearanceParty (5) `:71` |
| label | nvarchar(200) | no | | AR `:73` |
| status | nvarchar(20) | no (def 'PENDING') | | PENDING\|DONE\|BLOCKED `:77` |
| note | nvarchar(500) | yes | | AR `:80` |
| amount | decimal(18,2) | yes | | `:84` |
| doneBy | int | yes | | → User (no FK) `:87` |
| doneAt | datetime | yes | | `:90` |

**`SettlementLine`** → `@Entity('settlement_lines')` — `:95`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:97` |
| caseId | int | no | **Index** | → OffboardingCase (no FK) `:101` |
| label | nvarchar(200) | no | | AR `:104` |
| type | nvarchar(10) | no | | CREDIT\|DEBIT `:107` |
| amount | decimal(18,2) | no | | `:109` |
| isAuto | bit | no (def false) | | `:114` |

**علم بلا FK (offboarding):** الكيانات الثلاثة كلها بلا `@ManyToOne` (`caseId`, `employeeId`, `resignationRequestId`, `settlementApprovedBy`, `doneBy` أعمدة مجردة).

---

### 7) payroll — `api/src/payroll/payroll.entities.ts` (2 كيان) — **خارج نطاق التدقيق (out-of-scope)**

> مُدرجة للجرد فقط؛ لا يُحكَم عليها في هذه المرحلة.

**`PayrollRun`** → `@Entity('payroll_runs')` + `@Unique(['branchId','period'])` — `:17`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:19` |
| branchId | int | no | **Index** + unique(branchId,period) | → Branch (no FK) `:23` |
| period | nvarchar(7) | no | unique | '2026-07' `:26` |
| startDate | date | no | | `:29` |
| endDate | date | no | | `:32` |
| status | nvarchar(20) | no (def 'CALCULATED') | | enum PayrollRunStatus `:35` |
| totalNet | decimal(18,2) | no (def 0) | | `:38` |
| approvedBy | int | yes | | → User (no FK) `:41` |
| approvedAt | datetime | yes | | `:44` |
| paidAt | datetime | yes | | `:47` |
| createdAt | datetime | no | | `@CreateDateColumn` `:50` |

**`PayrollItem`** → `@Entity('payroll_items')` + `@Unique(['runId','employeeId'])` — `:56`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:58` |
| runId | int | no | **Index** + unique(runId,employeeId) | → PayrollRun (no FK) `:62` |
| employeeId | int | no | **Index** + unique | → Employee (no FK) `:66` |
| basicSalary | decimal(18,2) | no | | `:69` |
| allowances | decimal(18,2) | no (def 0) | | `:73` |
| overtimeHours | decimal(8,2) | no (def 0) | | `:76` |
| overtimeAmount | decimal(18,2) | no (def 0) | | `:79` |
| lateMinutes | int | no (def 0) | | `:82` |
| latenessDeduction | decimal(18,2) | no (def 0) | | `:85` |
| unpaidLeaveDays | decimal(6,2) | no (def 0) | | `:88` |
| unpaidLeaveDeduction | decimal(18,2) | no (def 0) | | `:91` |
| loanInstallments | decimal(18,2) | no (def 0) | | `:94` |
| netPay | decimal(18,2) | no | | `:97` |
| payMethod | nvarchar(20) | no | | `:100` |
| breakdown | nvarchar(MAX) | yes | | JSON `:104` |

**علم بلا FK (payroll):** كلاهما بلا `@ManyToOne` (`branchId`, `runId`, `employeeId`, `approvedBy` مجردة).

---

### 8) auth — `api/src/auth/*.ts` (3 كيانات)

**`Role`** → `@Entity('roles')` — `role.entity.ts:6`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:8` |
| code | nvarchar(50) | no | **Unique index** | `:12` |
| nameAr | nvarchar(100) | no | | AR `:15` |
| permissions | nvarchar(MAX) | no | | JSON array `:19` |
| isSystem | bit | no (def false) | | `:22` |
| isActive | bit | no (def true) | | `:25` |

**`UserPermissionOverride`** → `@Entity('user_permission_overrides')` + `@Index(['userId','permission'],{unique})` — `role.entity.ts:29-31`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:32` |
| userId | int | no | **Index** + unique(userId,permission) | → User (no FK) `:37` |
| permission | nvarchar(100) | no | unique | `:40` |
| effect | nvarchar(10) | no | | GRANT\|REVOKE `:43` |

**`User`** → `@Entity('users')` — `user.entity.ts:7`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:9` |
| email | nvarchar(200) | no | **Unique index** | `:13` |
| passwordHash | nvarchar(200) | no | | `:16` |
| displayName | nvarchar(200) | no | | AR `:19` |
| role | nvarchar(30) | no (def 'employee') | | enum UserRole `:22` |
| branchId | int | yes | | → Branch (no FK) `:26` |
| employeeId | int | yes | | → Employee (no FK) `:30` |
| permissions | nvarchar(500) | yes | | JSON array `:35` |
| isActive | bit | no (def true) | | `:38` |
| lastLoginAt | datetime | yes | | `:41` |

**علم بلا FK (auth):** الكيانات الثلاثة بلا `@ManyToOne` (`userId`, `branchId`, `employeeId` مجردة).

---

### 9) files — `api/src/files/stored-file.entity.ts` (1 كيان)

**`StoredFile`** → `@Entity('stored_files')` — `:11`

| Column | Type | Nullable | Key/Index | ملاحظة |
|---|---|---|---|---|
| id | int (identity) | no | **PK** | `:13` |
| originalName | nvarchar(300) | no | | AR `:16` |
| storedName | nvarchar(300) | no | | `:20` |
| mime | nvarchar(100) | no | | `:23` |
| size | int | no | | `:26` |
| entityType | nvarchar(30) | yes | **Index** | document\|request\|custody\|employee `:31` |
| entityId | int | yes | **Index** | مرجع متعدد (polymorphic, no FK) `:35` |
| uploadedBy | int | yes | | → User (no FK) `:38` |
| employeeId | int | yes | | → Employee (no FK) `:42` |
| uploadedAt | datetime | no | | `@CreateDateColumn` `:45` |

**علم بلا FK (files):** `StoredFile` مرجع polymorphic (`entityType`+`entityId`) بلا أي `@ManyToOne`.

---

## الإجمالي (Count)

**50 كياناً (`@Entity`)** موزّعة على **24 ملفاً** كالتالي:

| Module | عدد الكيانات |
|---|---|
| employees | 1 |
| attendance | 7 |
| assets (كتالوجات/إعدادات) | 10 |
| requests | 20 |
| org | 3 |
| offboarding | 3 |
| payroll *(خارج النطاق)* | 2 |
| auth | 3 |
| files | 1 |
| **المجموع** | **50** |

**خلاصة الـ FK الحقيقية:** من أصل 50 كياناً، **3 علاقات فقط** على مستوى قاعدة البيانات (`@ManyToOne + @JoinColumn`): `ApprovalStep.chainId→ApprovalChain`، `Department.branchId→Branch`، `Team.departmentId→Department`. كل بقية الروابط (`employeeId`, `branchId`, `requestId`, `caseId`, `runId`, `userId`, `assetId`, `loanId`, `managerEmployeeId`, `parentId`, `entityId` polymorphic ...) أعمدة `int` مجردة **بلا قيد FK**. وبفضل مشغّل `mssql` كل الأعمدة النصية العربية (`fullName`, `nameAr`, `name`, `label`, `notes`, `address`, `reason`, `purpose`, `displayName`...) مخزّنة `NVARCHAR` افتراضياً.


# ══════════════════════════════════
# 2 · جرد الـ Endpoints (Controllers & Guards)
# ══════════════════════════════════

Based on reading all 20 controllers plus `guards.ts` and `main.ts` (global prefix `api`, no `APP_GUARD`/global guard), here is the inventory.

## Endpoint Inventory

**ملاحظات على العمود Guard/Perm:**
- كل الكنترولرات لها حارس على مستوى الكلاس `@UseGuards(JwtAuthGuard, RolesGuard)` إلا `AttendanceController` (بلا حارس كلاس — كل مسار يحرس نفسه) و`AuthController` و`HealthController`.
- `RolesGuard` يمرّر أي مستخدم مُصادَق عند غياب `@Perm`/`@Roles` (guards.ts:58). لذلك:
  - **JWT** = يتطلب توكن فقط، أي مستخدم مسجّل يمر (لا صلاحية مُعلَنة — التفويض غالباً داخل الخدمة/المعالج).
  - **JWT +Perm(x)** = يتطلب امتلاك أي واحدة من الصلاحيات المذكورة.
  - **JWT-only** = `@UseGuards(JwtAuthGuard)` وحده (بلا RolesGuard).
  - **NONE** = لا حارس إطلاقاً (عام).
- الصلاحية على مستوى المعالِج (handler) تتقدّم على صلاحية الكلاس (`getAllAndOverride`) — مهم في `SettingsController`.
- لا يوجد `APP_GUARD` عام (main.ts). البادئة العامة `api` (main.ts:12).

### AuthController — `@Controller('auth')` (بلا حارس كلاس)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| POST | /api/auth/login | **NONE (عام)** | auth.controller.ts:25 |
| GET | /api/auth/me | JWT (JwtAuthGuard) | auth.controller.ts:30-31 |

### HealthController — `@Controller('health')` (بلا حارس كلاس)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/health | **NONE (عام)** | health.controller.ts:9 |

### OrgController — `@Controller()` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/branches | JWT | org.controller.ts:35 |
| POST | /api/branches | JWT +Perm(org.manage) | org.controller.ts:40-41 |
| PATCH | /api/branches/:id | JWT +Perm(org.manage) | org.controller.ts:46-47 |
| GET | /api/departments | JWT | org.controller.ts:56 |
| POST | /api/departments | JWT +Perm(org.manage) | org.controller.ts:61-62 |
| PATCH | /api/departments/:id | JWT +Perm(org.manage) | org.controller.ts:67-68 |
| GET | /api/teams | JWT | org.controller.ts:77 |
| POST | /api/teams | JWT +Perm(org.manage) | org.controller.ts:82-83 |
| PATCH | /api/teams/:id | JWT +Perm(org.manage) | org.controller.ts:88-89 |

### DashboardController — `@Controller('dashboard')` — كلاس: JWT+Roles +Perm(dashboard.view_all)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/dashboard/stats | JWT +Perm(dashboard.view_all) | dashboard.controller.ts:14 |

### ReportsController — `@Controller('reports')` — كلاس: JWT+Roles +Perm(reports.view)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/reports/headcount | JWT +Perm(reports.view) | reports.controller.ts:23 |
| GET | /api/reports/attendance | JWT +Perm(reports.view) | reports.controller.ts:45 |
| GET | /api/reports/leaves | JWT +Perm(reports.view) | reports.controller.ts:70 |
| GET | /api/reports/payroll | JWT +Perm(reports.view) | reports.controller.ts:98 |
| GET | /api/reports/overtime | JWT +Perm(reports.view) | reports.controller.ts:125 |
| GET | /api/reports/requests | JWT +Perm(reports.view) | reports.controller.ts:151 |

### PayrollController — `@Controller('payroll')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/payroll/runs | JWT +Perm(payroll.view) | payroll.controller.ts:32-33 |
| GET | /api/payroll/runs/:id | JWT +Perm(payroll.view) | payroll.controller.ts:38-39 |
| POST | /api/payroll/runs/calculate | JWT +Perm(payroll.calculate) | payroll.controller.ts:45-46 |
| POST | /api/payroll/runs/:id/approve | JWT +Perm(payroll.approve) | payroll.controller.ts:51-52 |
| POST | /api/payroll/runs/:id/pay | JWT +Perm(payroll.pay) | payroll.controller.ts:60-61 |
| GET | /api/payroll/runs/:id/pay-methods | JWT +Perm(payroll.view) | payroll.controller.ts:67-68 |
| GET | /api/payroll/items/:id | JWT (تحقّق ملكية/payroll.view داخل المعالِج) | payroll.controller.ts:74 |
| GET | /api/payroll/my-payslips | JWT | payroll.controller.ts:90 |

### CandidatesController — `@Controller('candidates')` — كلاس: JWT+Roles +Perm(candidates.manage)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/candidates | JWT +Perm(candidates.manage) | candidates.controller.ts:116 |
| POST | /api/candidates | JWT +Perm(candidates.manage) | candidates.controller.ts:121 |
| PATCH | /api/candidates/:id | JWT +Perm(candidates.manage) | candidates.controller.ts:126 |
| POST | /api/candidates/:id/hire | JWT +Perm(candidates.manage) | candidates.controller.ts:141 |

### DocsController — `@Controller('documents')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/documents | JWT (فلترة بالنطاق/documents.manage داخل المعالِج) | docs.controller.ts:68 |
| POST | /api/documents | JWT +Perm(documents.manage) | docs.controller.ts:104-105 |
| PATCH | /api/documents/:id | JWT +Perm(documents.manage) | docs.controller.ts:115-116 |

### RolesController — `@Controller()` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/permissions-registry | JWT +Perm(roles.manage, users.manage) | roles.controller.ts:86-87 |
| GET | /api/roles | JWT +Perm(roles.manage, users.manage) | roles.controller.ts:97-98 |
| POST | /api/roles | JWT +Perm(roles.manage) | roles.controller.ts:107-108 |
| PATCH | /api/roles/:id | JWT +Perm(roles.manage) | roles.controller.ts:127-128 |
| GET | /api/users/:id/permissions | JWT +Perm(users.manage, roles.manage) | roles.controller.ts:157-158 |
| PUT | /api/users/:id/permissions | JWT +Perm(users.manage, roles.manage) | roles.controller.ts:172-173 |

### AssetsController — `@Controller()` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/assets | JWT +Perm(custody.assign) | assets.controller.ts:74-75 |
| POST | /api/assets | JWT +Perm(custody.assign) | assets.controller.ts:89-90 |
| PATCH | /api/assets/:id | JWT +Perm(custody.assign) | assets.controller.ts:95-96 |
| POST | /api/assets/:id/retire | JWT +Perm(custody.assign) | assets.controller.ts:108-109 |
| POST | /api/assets/:id/reactivate | JWT +Perm(custody.assign) | assets.controller.ts:121-122 |
| GET | /api/assets/available | JWT | assets.controller.ts:134 |
| GET | /api/custody/mine | JWT | assets.controller.ts:149 |
| GET | /api/custody/pending-my-confirm | JWT | assets.controller.ts:170 |
| GET | /api/custody | JWT +Perm(custody.assign) | assets.controller.ts:198-199 |
| POST | /api/custody/assign | JWT +Perm(custody.assign) | assets.controller.ts:226-227 |
| POST | /api/custody/:id/return | JWT +Perm(custody.assign) | assets.controller.ts:255-256 |
| POST | /api/custody/:id/write-off | JWT +Perm(custody.assign) | assets.controller.ts:280-281 |

### OffboardingController — `@Controller('offboarding')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/offboarding | JWT +Perm(offboarding.manage) | offboarding.controller.ts:63-64 |
| GET | /api/offboarding/mine | JWT | offboarding.controller.ts:70 |
| GET | /api/offboarding/:id | JWT | offboarding.controller.ts:76 |
| POST | /api/offboarding/:id/withdraw | JWT (تفويض داخل الخدمة) | offboarding.controller.ts:82 |
| POST | /api/offboarding/items/:itemId/complete | JWT (تفويض بالجهة داخل الخدمة) | offboarding.controller.ts:91 |
| POST | /api/offboarding/:id/lines | JWT +Perm(settlement.edit) | offboarding.controller.ts:101-102 |
| PATCH | /api/offboarding/lines/:lineId | JWT +Perm(settlement.edit) | offboarding.controller.ts:110-111 |
| DELETE | /api/offboarding/lines/:lineId | JWT +Perm(settlement.edit) | offboarding.controller.ts:120-121 |
| POST | /api/offboarding/:id/recalc-lines | JWT +Perm(settlement.edit) | offboarding.controller.ts:127-128 |
| POST | /api/offboarding/:id/approve-settlement | JWT +Perm(settlement.approve) | offboarding.controller.ts:134-135 |

### EmployeesController — `@Controller('employees')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/employees | JWT +Perm(employees.view) | employees.controller.ts:29-30 |
| GET | /api/employees/:id | JWT (ملكية/employees.view داخل المعالِج) | employees.controller.ts:36 |
| POST | /api/employees | JWT +Perm(employees.create) | employees.controller.ts:47-48 |
| PATCH | /api/employees/:id | JWT +Perm(employees.edit) | employees.controller.ts:56-57 |
| POST | /api/employees/:id/archive | JWT +Perm(employees.archive) | employees.controller.ts:67-68 |
| POST | /api/employees/:id/reactivate | JWT +Perm(employees.archive) | employees.controller.ts:78-79 |

### UsersController — `@Controller('users')` — كلاس: JWT+Roles +Perm(users.manage)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/users | JWT +Perm(users.manage) | users.controller.ts:132 |
| POST | /api/users | JWT +Perm(users.manage) | users.controller.ts:143 |
| PATCH | /api/users/:id | JWT +Perm(users.manage) | users.controller.ts:188 |

### FilesController — `@Controller('files')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| POST | /api/files/upload | JWT (بلا صلاحية مُعلَنة) | files.controller.ts:62 |
| GET | /api/files/:id | JWT (ملكية/صلاحية داخل المعالِج) | files.controller.ts:123 |

### LeavesController — `@Controller('leaves')` — كلاس: JWT+Roles +Perm(leaves.view_all)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/leaves | JWT +Perm(leaves.view_all) | leaves.controller.ts:35 |
| POST | /api/leaves/:id/revoke | JWT +Perm(leaves.revoke) | leaves.controller.ts:62-63 |

### PortalController — `@Controller()` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/calendar | JWT | portal.controller.ts:34 |
| GET | /api/notifications | JWT | portal.controller.ts:72 |

### RequestsController — `@Controller('requests')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/requests/types | JWT | requests.controller.ts:75 |
| GET | /api/requests/leave-balances/mine | JWT | requests.controller.ts:81 |
| GET | /api/requests/leave-balances/:employeeId | JWT +Perm(leaves.view_all, employees.view) | requests.controller.ts:86-87 |
| POST | /api/requests/leave-balances/rollover/:fromPeriod | JWT +Perm(leave_balances.manage) | requests.controller.ts:93-94 |
| GET | /api/requests/mine | JWT | requests.controller.ts:99 |
| GET | /api/requests/my-leaves | JWT | requests.controller.ts:105 |
| GET | /api/requests/all | JWT +Perm(requests.view_all) | requests.controller.ts:111-112 |
| GET | /api/requests/inbox | JWT | requests.controller.ts:122 |
| GET | /api/requests/:id | JWT (تفويض داخل الخدمة) | requests.controller.ts:127 |
| POST | /api/requests | JWT (تفويض داخل الخدمة) | requests.controller.ts:135 |
| POST | /api/requests/:id/submit | JWT (تفويض داخل الخدمة) | requests.controller.ts:140 |
| POST | /api/requests/:id/act | JWT (تفويض داخل الخدمة) | requests.controller.ts:148 |
| POST | /api/requests/:id/resubmit | JWT (تفويض داخل الخدمة) | requests.controller.ts:157 |
| POST | /api/requests/:id/cancel | JWT (تفويض داخل الخدمة) | requests.controller.ts:166 |
| POST | /api/requests/custody/:assignmentId/acknowledge | JWT (تفويض داخل الخدمة) | requests.controller.ts:175 |
| POST | /api/requests/custody/:assignmentId/handover | JWT (تفويض داخل الخدمة) | requests.controller.ts:184 |
| POST | /api/requests/custody/:assignmentId/transfer | JWT (تفويض داخل الخدمة) | requests.controller.ts:193 |
| POST | /api/requests/custody/:assignmentId/manager-confirm | JWT (تفويض داخل الخدمة) | requests.controller.ts:208 |
| POST | /api/requests/engine/run-escalations | JWT +Perm(settings.manage) | requests.controller.ts:217-218 |
| POST | /api/requests/engine/run-scheduled-transfers | JWT +Perm(settings.manage) | requests.controller.ts:223-224 |
| POST | /api/requests/engine/reconcile-overtime | JWT +Perm(attendance.manage, overtime.confirm) | requests.controller.ts:230-231 |

### AttendanceController — `@Controller('attendance')` (لا حارس على مستوى الكلاس — كل مسار يحرس نفسه)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| POST | /api/attendance/punches | **NONE — بلا JWT، مفتاح جهاز x-device-key فقط** | attendance.controller.ts:73-74 |
| POST | /api/attendance/punches/manual | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:79-81 |
| POST | /api/attendance/schedule | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:86-88 |
| GET | /api/attendance/schedule | JWT-only | attendance.controller.ts:93-94 |
| POST | /api/attendance/schedule/day | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:100-102 |
| POST | /api/attendance/schedule/day/bulk | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:118-120 |
| GET | /api/attendance/schedule/day-overrides | JWT-only | attendance.controller.ts:135-136 |
| GET | /api/attendance/schedule-rules | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:142-144 |
| POST | /api/attendance/schedule-rules | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:149-151 |
| PATCH | /api/attendance/schedule-rules/:id | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:165-167 |
| DELETE | /api/attendance/schedule-rules/:id | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:175-177 |
| GET | /api/attendance/overtime-periods | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:183-185 |
| POST | /api/attendance/overtime-periods | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:190-192 |
| PATCH | /api/attendance/overtime-periods/:id | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:206-208 |
| DELETE | /api/attendance/overtime-periods/:id | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:216-218 |
| GET | /api/attendance/working-days | JWT-only | attendance.controller.ts:225-226 |
| GET | /api/attendance/daily | JWT+Roles +Perm(attendance.view_all) | attendance.controller.ts:241-243 |
| GET | /api/attendance/monthly | JWT-only | attendance.controller.ts:248-249 |
| GET | /api/attendance/overtime/pending | JWT+Roles +Perm(overtime.confirm) | attendance.controller.ts:259-261 |
| POST | /api/attendance/overtime/:id/confirm | JWT+Roles +Perm(overtime.confirm) | attendance.controller.ts:266-268 |
| POST | /api/attendance/recompute | JWT+Roles +Perm(attendance.manage) | attendance.controller.ts:278-280 |
| POST | /api/attendance/devices/:id/sync | JWT+Roles +Perm(attendance.sync) | attendance.controller.ts:286-288 |
| POST | /api/attendance/devices/sync-all | JWT+Roles +Perm(attendance.sync) | attendance.controller.ts:293-295 |

### SettingsController — `@Controller('settings')` — كلاس: JWT+Roles +Perm(settings.manage)
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/settings/config | JWT +Perm(settings.manage) | settings.controller.ts:369-370 |
| PATCH | /api/settings/config | JWT +Perm(settings.manage) | settings.controller.ts:389-390 |
| GET | /api/settings/leave-types | JWT +Perm(settings.manage) | settings.controller.ts:409-410 |
| POST | /api/settings/leave-types | JWT +Perm(settings.manage) | settings.controller.ts:414-415 |
| PATCH | /api/settings/leave-types/:id | JWT +Perm(settings.manage) | settings.controller.ts:421-422 |
| GET | /api/settings/approval-chains | JWT +Perm(approval_chains.manage) | settings.controller.ts:433-434 |
| PATCH | /api/settings/approval-steps/:id | JWT +Perm(approval_chains.manage) | settings.controller.ts:454-455 |
| POST | /api/settings/approval-chains | JWT +Perm(approval_chains.manage) | settings.controller.ts:467-468 |
| PATCH | /api/settings/approval-chains/:id | JWT +Perm(approval_chains.manage) | settings.controller.ts:527-528 |
| PATCH | /api/settings/approval-chains/:id/steps | JWT +Perm(approval_chains.manage) | settings.controller.ts:555-556 |
| GET | /api/settings/request-types | JWT +Perm(request_types.manage) | settings.controller.ts:598-599 |
| GET | /api/settings/destination-handlers | JWT +Perm(request_types.manage) | settings.controller.ts:605-606 |
| POST | /api/settings/request-types | JWT +Perm(request_types.manage) | settings.controller.ts:638-639 |
| PATCH | /api/settings/request-types/:id | JWT +Perm(request_types.manage) | settings.controller.ts:703-704 |
| GET | /api/settings/roles | JWT +Perm(settings.manage) | settings.controller.ts:745-746 |

### EmployeeExtrasController — `@Controller()` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/transfers | JWT +Perm(transfers.view) | employee-extras.controller.ts:46-47 |
| GET | /api/loans | JWT +Perm(payroll.view) | employee-extras.controller.ts:69-70 |
| GET | /api/employees/:id/profile | JWT (ملكية/employees.view داخل المعالِج) | employee-extras.controller.ts:102 |
| GET | /api/employees/:id/history | JWT (ملكية/employees.view داخل المعالِج) | employee-extras.controller.ts:155 |

### CatalogsController — `@Controller('catalogs')` — كلاس: JWT+Roles
| Method | Path | Guard/Perm | Controller:line |
|---|---|---|---|
| GET | /api/catalogs/:kind | JWT | catalogs.controller.ts:85 |
| POST | /api/catalogs/:kind | JWT +Perm(settings.manage) | catalogs.controller.ts:120-121 |
| PATCH | /api/catalogs/:kind/:id | JWT +Perm(settings.manage) | catalogs.controller.ts:136-137 |

---

## 🚩 مسارات مُغيِّرة للحالة بلا حارس مصادقة (OPEN)

مسار واحد فقط **مُغيِّر للحالة (POST) بلا أي `JwtAuthGuard`**:

| Method | Path | الحالة | Controller:line |
|---|---|---|---|
| POST | /api/attendance/punches | **OPEN** — لا JWT ولا `@Perm`؛ الاعتماد على ترويسة `x-device-key` تُمرَّر للخدمة (`this.service.ingest(dto.punches, deviceKey)`)؛ المفتاح اختياري في التوقيع (`deviceKey?`) والتحقق منه يقع داخل الخدمة لا في حارس | attendance.controller.ts:73-74 |
| POST | /api/auth/login | عام بطبيعته (تسجيل الدخول) — POST بلا حارس لكنه القصد | auth.controller.ts:25 |

## ملاحظات إضافية (بلا حكم — للجرد فقط)

- **مسارات مُغيِّرة للحالة بحارس JWT فقط دون `@Perm` مُعلَنة** (أي مستخدم مُصادَق يمرّ الحارس؛ التفويض الفعلي مؤجَّل داخل الخدمة/المعالِج): `POST /api/offboarding/:id/withdraw` (offboarding.controller.ts:82)، `POST /api/offboarding/items/:itemId/complete` (offboarding.controller.ts:91)، `POST /api/files/upload` (files.controller.ts:62)، وكل مسارات `RequestsController` المُغيِّرة للحالة من السطر 135 حتى 214 (create/submit/act/resubmit/cancel + مسارات custody الأربعة).
- **`GET /api/health`** و**`GET /api/auth/me`** غير مُغيِّرة للحالة — الأولى عامة تماماً (بلا حارس)، والثانية بـ JWT.
- في `SettingsController` صلاحية الكلاس `settings.manage` مُتجاوَزة على مستوى المعالِج بـ `approval_chains.manage` و`request_types.manage` (getAllAndOverride) — لذا هذه المسارات لا تتطلب `settings.manage`.
- لا يوجد أي استخدام لديكوريتر `@Roles(...)` على أي مسار فعلي (مُصدَّر في guards.ts:25 ومستورد في requests.controller.ts:20 لكنه غير مُطبَّق) — الفرض كله عبر `@Perm`.


# ══════════════════════════════════
# 3 · جرد الشاشات (Next.js Pages → Backend)
# ══════════════════════════════════

All 89 pages classified. Here is the section.

## SECTION: Screen Inventory (جرد الشاشات)

إجمالي صفحات `page.tsx` تحت `src/app` = **89 مساراً**. منها **69** موصولة بالباك إند فعلياً، و**20** شاشة **MOCK** (تعرض بيانات محلية/ثابتة بلا أي نداء خلفي). المصدر الوحيد للنداءات هو `src/lib/api.ts`، وتعيين كل مُساعِد إلى نقطة النهاية مأخوذ من نفس الملف (`src/lib/api.ts:113-661`). ملاحظة منهجية: بعض الصفحات تستورد بعلامتَي اقتباس مزدوجتين (`from "@/lib/api"`) وليست مفردة — تم التقاطها جميعاً.

### كل المسارات (Full route inventory)

| Route | Module | Backend endpoints called | Mock? |
|---|---|---|---|
| `/` | Dashboard | عبر مكوّنات `@/components/dashboard`: `GET /dashboard/stats` (StatsCards)، `GET /requests/inbox`, `GET /requests/types`, `GET /employees`, `POST /requests/:id/act` (PendingApprovals). الصفحة نفسها `getCurrentUser` (محلي) | — (جزئي) |
| `/login` | Auth | `POST /auth/login` | — |
| `/employees` | Employees | `GET /employees`, `GET /branches`, `GET /departments`, `POST /employees/:id/archive`, `GET /files/:id` | — |
| `/employees/add` | Employees | `POST /employees` | — |
| `/employees/[id]` | Employees | `GET /employees/:id/profile`, `GET /branches`, `GET /departments`, `GET /teams`, `GET /employees`, `GET /files/:id` | — |
| `/employees/[id]/edit` | Employees | `GET /employees/:id`, `GET /requests/leave-balances/:employeeId`, `PATCH /employees/:id` | — |
| `/employees/[id]/settlement` | Offboarding | `GET /offboarding/:id`, `GET /offboarding`, `POST /offboarding/:caseId/lines`, `PATCH /offboarding/lines/:lineId`, `DELETE /offboarding/lines/:lineId`, `POST /offboarding/:caseId/recalc-lines`, `POST /offboarding/:caseId/approve-settlement` | — |
| `/employees/[id]/terminate` | Offboarding | لا شيء — بيانات ثابتة (`employeeData`, حسابات مكافأة نهاية الخدمة محلياً) | **MOCK** |
| `/employees/archived` | Employees | `GET /employees`, `GET /branches`, `GET /departments`, `POST /employees/:id/reactivate` | — |
| `/employees/contracts` | Employees | `GET /employees`, `GET /departments`, `PATCH /employees/:id` | — |
| `/employees/custody` | Custody | `GET /custody`, `GET /assets`, `GET /employees`, `GET /branches`, `POST /assets`, `POST /custody/assign`, `POST /custody/:id/return`, `POST /custody/:id/write-off`, `POST /requests/custody/:assignmentId/transfer`, `POST /requests/custody/:assignmentId/manager-confirm` | — |
| `/employees/documents` | Employees | `GET /documents`, `GET /employees`, `POST /documents`, `PATCH /documents/:id`, `POST /files/upload`, `GET /files/:id` | — |
| `/employees/onboarding` | Employees | `GET /employees`, `GET /branches` | — |
| `/employees/org-chart` | Employees | `GET /branches`, `GET /departments`, `GET /teams`, `GET /employees` | — |
| `/employees/transfers` | Employees | `GET /transfers` | — |
| `/attendance` | Attendance | `GET /attendance/daily`, `GET /employees`, `GET /departments`, `GET /branches` | — |
| `/attendance/devices` | Attendance | `GET /catalogs/devices`, `POST /catalogs/devices`, `PATCH /catalogs/devices/:id`, `GET /branches`, `GET /settings/config`, `PATCH /settings/config`, `POST /attendance/devices/:id/sync`, `POST /attendance/devices/sync-all` | — |
| `/attendance/manual-entry` | Attendance | `POST /attendance/punches/manual`, `GET /employees` (+`getCurrentUser` محلي) | — |
| `/attendance/monthly-sheet` | Attendance | `GET /attendance/monthly`, `GET /employees` | — |
| `/attendance/overtime` | Attendance | `GET /attendance/overtime/pending`, `POST /attendance/overtime/:id/confirm`, `GET /employees`, `GET /departments` | — |
| `/attendance/permissions` | Attendance | `GET /requests/all`, `GET /employees`, `POST /requests/:id/act` (+`getCurrentUser` محلي) | — |
| `/attendance/reports` | Attendance | `GET /reports/attendance`, `GET /reports/overtime` | — |
| `/attendance/shifts` | Attendance | `GET /catalogs/shifts`, `POST /catalogs/shifts`, `PATCH /catalogs/shifts/:id` | — |
| `/attendance/weekly-schedule` | Attendance | `GET /attendance/schedule`, `POST /attendance/schedule`, `GET /employees`, `GET /departments`, `GET /branches`, `GET /teams`, `GET /attendance/schedule/day-overrides`, `POST /attendance/schedule/day`, `POST /attendance/schedule/day/bulk`, `GET /attendance/working-days`, `GET /attendance/schedule-rules` | — |
| `/leaves` | Leaves | `GET /leaves`, `POST /leaves/:leaveId/revoke` (+`can` محلي) | — |
| `/leaves/balance` | Leaves | `GET /employees`, `GET /requests/leave-balances/:employeeId`, `GET /branches`, `GET /departments` | — |
| `/leaves/calendar` | Leaves | `GET /calendar` | — |
| `/leaves/holidays` | Leaves | `GET /catalogs/holidays`, `POST /catalogs/holidays`, `PATCH /catalogs/holidays/:id` | — |
| `/leaves/request` | Leaves | `GET /settings/leave-types`, `GET /requests/leave-balances/mine`, `POST /requests`, `POST /files/upload` | — |
| `/leaves/types` | Leaves | `GET /settings/leave-types`, `POST /settings/leave-types`, `PATCH /settings/leave-types/:id` | — |
| `/payroll` | Payroll | `GET /payroll/runs`, `GET /payroll/runs/:id`, `POST /payroll/runs/calculate`, `POST /payroll/runs/:id/approve`, `POST /payroll/runs/:id/pay`, `GET /payroll/runs/:id/pay-methods`, `GET /branches`, `GET /employees` | — |
| `/payroll/allowances` | Payroll | لا شيء — شاشة «تُفعَّل في مرحلة لاحقة» (empty state + نص ثابت) | **MOCK** |
| `/payroll/bonuses` | Payroll | `GET /requests/all`, `GET /employees`, `POST /requests` | — |
| `/payroll/deductions` | Payroll | `GET /payroll/runs`, `GET /payroll/runs/:id`, `GET /employees`, `GET /requests/all` | — |
| `/payroll/formulas` | Payroll | لا شيء — شاشة «تُفعَّل في مرحلة لاحقة» (نص مرجعي ثابت) | **MOCK** |
| `/payroll/gosi` | Payroll | لا شيء — شاشة «تُفعَّل في مرحلة لاحقة» (نِسب اشتراك ثابتة كمرجع) | **MOCK** |
| `/payroll/loans` | Payroll | `GET /loans`, `POST /requests` | — |
| `/payroll/payslip/[id]` | Payroll | `GET /payroll/items/:itemId`, `GET /branches` | — |
| `/payroll/payslips` | Payroll | `GET /payroll/runs`, `GET /payroll/runs/:id`, `GET /employees` | — |
| `/payroll/reports` | Payroll | `GET /reports/payroll` | — |
| `/recruitment` | Recruitment | `GET /candidates`, `POST /candidates`, `PATCH /candidates/:id`, `POST /candidates/:id/hire`, `GET /branches` | — |
| `/recruitment/add` | Recruitment | لا شيء — نموذج وظيفة بـ`useState` فقط (بيانات ثابتة) | **MOCK** |
| `/recruitment/[id]` | Recruitment | لا شيء — `jobDetails` ثابت | **MOCK** |
| `/recruitment/applicants` | Recruitment | `GET /candidates`, `PATCH /candidates/:id`, `POST /candidates/:id/hire`, `GET /branches` | — |
| `/recruitment/interviews` | Recruitment | لا شيء — مصفوفة `interviews` ثابتة | **MOCK** |
| `/recruitment/offers` | Recruitment | لا شيء — مصفوفة `jobOffers` ثابتة | **MOCK** |
| `/training` | Training | لا شيء — مصفوفة `courses` ثابتة | **MOCK** |
| `/training/add` | Training | لا شيء — نموذج بـ`useState` + قوائم ثابتة | **MOCK** |
| `/training/certificates` | Training | لا شيء — مصفوفة `certificates` ثابتة | **MOCK** |
| `/training/my-courses` | Training | لا شيء — مصفوفة `myCourses` ثابتة | **MOCK** |
| `/training/[id]` | Training | لا شيء — كائن `course` ثابت | **MOCK** |
| `/performance` | Performance | لا شيء — مصفوفة `reviews` ثابتة | **MOCK** |
| `/performance/goals` | Performance | لا شيء — بيانات أهداف ثابتة | **MOCK** |
| `/performance/cycles` | Performance | لا شيء — مصفوفة `reviewCycles` ثابتة | **MOCK** |
| `/performance/new` | Performance | لا شيء — قوائم `employees`/`reviewCycles`/`categories` ثابتة | **MOCK** |
| `/performance/templates` | Performance | لا شيء — مصفوفة `templates` ثابتة | **MOCK** |
| `/performance/[id]` | Performance | لا شيء — كائن `reviewData` ثابت | **MOCK** |
| `/reports` | Reports | `GET /reports/attendance`, `GET /reports/headcount`, `GET /reports/leaves`, `GET /reports/overtime`, `GET /reports/payroll`, `GET /reports/requests` | — |
| `/reports/custom` | Reports | لا شيء — مصفوفة `savedReports` ثابتة | **MOCK** |
| `/settings` | Settings | `GET /settings/config`, `PATCH /settings/config` | — |
| `/settings/approvals` | Settings | `POST /settings/approval-chains`, `GET /settings/approval-chains`, `GET /branches`, `GET /employees`, `GET /requests/types`, `PATCH /settings/approval-chains/:id/steps`, `PATCH /settings/approval-chains/:id` | — |
| `/settings/asset-types` | Settings | `GET /assets`, `POST /assets`, `PATCH /assets/:id`, `POST /assets/:id/retire`, `POST /assets/:id/reactivate` | — |
| `/settings/branches` | Settings | `POST /branches`, `GET /branches`, `GET /employees`, `PATCH /branches/:id` | — |
| `/settings/cost-centers` | Settings | `GET /catalogs/cost-centers`, `POST /catalogs/cost-centers`, `PATCH /catalogs/cost-centers/:id` | — |
| `/settings/departments` | Settings | `POST /departments`, `GET /branches`, `GET /departments`, `GET /employees`, `GET /teams`, `PATCH /departments/:id` | — |
| `/settings/documents` | Settings | `GET /documents` | — |
| `/settings/document-templates` | Settings | `GET /documents` (قوالب العرض ذاتها ثابتة) | — (جزئي) |
| `/settings/grades` | Settings | `GET /catalogs/grades`, `POST /catalogs/grades`, `PATCH /catalogs/grades/:id` | — |
| `/settings/job-titles` | Settings | `GET /catalogs/job-titles`, `POST /catalogs/job-titles`, `PATCH /catalogs/job-titles/:id` | — |
| `/settings/permission-types` | Settings | `GET /catalogs/permission-types`, `POST /catalogs/permission-types`, `PATCH /catalogs/permission-types/:id` | — |
| `/settings/policies` | Settings | `GET /settings/config`, `PATCH /settings/config` | — |
| `/settings/request-types` | Settings | `POST /settings/request-types`, `GET /settings/request-types`, `GET /settings/approval-chains`, `GET /departments`, `GET /settings/destination-handlers`, `GET /employees`, `PATCH /settings/request-types/:id` | — |
| `/settings/roles` | Settings | `POST /roles`, `GET /permissions-registry`, `GET /roles`, `GET /users`, `PATCH /roles/:id` | — |
| `/settings/teams` | Settings | `POST /teams`, `GET /departments`, `GET /employees`, `GET /teams`, `PATCH /teams/:id` | — |
| `/settings/users` | Settings | `POST /users`, `GET /branches`, `GET /employees`, `GET /permissions-registry`, `GET /roles`, `GET /users/:userId/permissions`, `GET /users`, `PUT /users/:userId/permissions`, `PATCH /users/:id` | — |
| `/settings/work-days` | Settings | `GET /settings/config`, `PATCH /settings/config`, `GET /attendance/schedule-rules`, `POST /attendance/schedule-rules`, `PATCH /attendance/schedule-rules/:id`, `DELETE /attendance/schedule-rules/:id`, `GET /branches`, `GET /attendance/overtime-periods`, `POST /attendance/overtime-periods`, `PATCH /attendance/overtime-periods/:id`, `DELETE /attendance/overtime-periods/:id` | — |
| `/my/attendance` | Self-Service | `GET /attendance/monthly` (+`getCurrentUser` محلي) | — |
| `/my/custody` | Self-Service | `POST /requests/custody/:assignmentId/acknowledge`, `GET /custody/mine`, `POST /requests/custody/:assignmentId/handover` | — |
| `/my/documents` | Self-Service | `GET /documents` | — |
| `/my/leaves` | Self-Service | `GET /requests/leave-balances/mine`, `GET /requests/mine`, `GET /requests/types` | — |
| `/my/payslips` | Self-Service | `GET /payroll/my-payslips` | — |
| `/profile` | Self-Service | `GET /employees/:id/profile`, `GET /requests/leave-balances/mine`, `GET /requests/mine`, `GET /requests/types`, `GET /branches`, `GET /departments`, `GET /files/:id` (+`getCurrentUser` محلي) | — |
| `/requests` | Requests | `GET /requests/types`, `GET /requests/mine`, `POST /requests`, `POST /requests/:id/cancel`, `POST /requests/:id/resubmit`, `POST /files/upload`, `GET /assets/available`, `GET /catalogs/:kind`, `GET /employees`, `GET /teams`, `GET /custody/mine`, `GET /attendance/working-days`, `GET /requests/my-leaves`, `GET /settings/leave-types`, `GET /offboarding/mine`, `POST /offboarding/:caseId/withdraw` | — |
| `/requests-console` | Requests | `GET /requests/all`, `GET /requests/types`, `GET /branches`, `GET /employees`, `GET /departments`, `GET /requests/:id` | — |
| `/approvals-inbox` | Approvals | `GET /requests/inbox`, `GET /requests/types`, `GET /employees`, `GET /branches`, `POST /requests/:id/act`, `GET /custody/pending-my-confirm`, `POST /requests/custody/:assignmentId/manager-confirm` | — |
| `/offboarding` | Offboarding | `GET /offboarding` | — |
| `/offboarding/[id]` | Offboarding | `GET /offboarding/:id`, `POST /offboarding/items/:itemId/complete`, `POST /offboarding/:caseId/lines`, `PATCH /offboarding/lines/:lineId`, `DELETE /offboarding/lines/:lineId`, `POST /offboarding/:caseId/recalc-lines`, `POST /offboarding/:caseId/approve-settlement`, `POST /offboarding/:caseId/withdraw` | — |
| `/notifications` | Notifications | `GET /notifications` | — |
| `/calendar` | Calendar | `GET /calendar` | — |

### الشاشات الـ MOCK فقط (20 شاشة — تعرض بيانات ولا تنادي الباك إند إطلاقاً)

| Route | Module | ملاحظة |
|---|---|---|
| `/performance` | Performance | الوحدة كاملة ثابتة — `src/app/performance/page.tsx:47` |
| `/performance/goals` | Performance | `src/app/performance/goals/page.tsx` |
| `/performance/cycles` | Performance | `src/app/performance/cycles/page.tsx:37` |
| `/performance/new` | Performance | `src/app/performance/new/page.tsx:19` |
| `/performance/templates` | Performance | `src/app/performance/templates/page.tsx:33` |
| `/performance/[id]` | Performance | `src/app/performance/[id]/page.tsx:25` |
| `/recruitment/add` | Recruitment | نموذج بلا حفظ خلفي — `src/app/recruitment/add/page.tsx` |
| `/recruitment/[id]` | Recruitment | `src/app/recruitment/[id]/page.tsx:27` |
| `/recruitment/interviews` | Recruitment | `src/app/recruitment/interviews/page.tsx:38` |
| `/recruitment/offers` | Recruitment | `src/app/recruitment/offers/page.tsx:40` |
| `/training` | Training | الوحدة كاملة ثابتة — `src/app/training/page.tsx:45` |
| `/training/add` | Training | `src/app/training/add/page.tsx:38` |
| `/training/certificates` | Training | `src/app/training/certificates/page.tsx:36` |
| `/training/my-courses` | Training | `src/app/training/my-courses/page.tsx:34` |
| `/training/[id]` | Training | `src/app/training/[id]/page.tsx:23` |
| `/reports/custom` | Reports | `src/app/reports/custom/page.tsx:34` |
| `/employees/[id]/terminate` | Offboarding | نموذج إنهاء خدمة كامل بحسابات محلية، `handleSubmit` يعرض `alert` فقط — `src/app/employees/[id]/terminate/page.tsx:145`؛ يوجد بديل حقيقي موصول هو `/employees/[id]/settlement` و`/offboarding/[id]` |
| `/payroll/gosi` | Payroll | Placeholder «مرحلة لاحقة» — `src/app/payroll/gosi/page.tsx:23` |
| `/payroll/formulas` | Payroll | Placeholder «مرحلة لاحقة» — `src/app/payroll/formulas/page.tsx:23` |
| `/payroll/allowances` | Payroll | Placeholder «مرحلة لاحقة» — `src/app/payroll/allowances/page.tsx:23` |

### ملاحظات دقة (Accuracy caveats)

- **اللوحة `/` جزئية**: الصفحة نفسها لا تنادي الباك؛ الوصل يتم داخل مكوّنَين فقط — `StatsCards` (`GET /dashboard/stats`، `src/components/dashboard/StatsCards.tsx:12`) و`PendingApprovals` (`src/components/dashboard/PendingApprovals.tsx:6-14`). بقية الودجت (`AttendanceChart`, `RecentActivities`, `QuickActions`, `UpcomingEvents`, `DepartmentStats`, `EmployeeHome`) **بيانات ثابتة** — لا تستورد من `@/lib/api`.
- **`/settings/document-templates` جزئية**: تنادي `GET /documents` لعرض عدّادات، لكن قائمة القوالب نفسها (`templateCategories`, القوالب) **ثابتة** في الكود — `src/app/settings/document-templates/page.tsx:41`.
- **مُساعِدات محلية بلا شبكة**: `getCurrentUser`, `getToken`, `can`, `saveSession`, `ApiError` تقرأ `localStorage` فقط ولا تُحتسب نداءً خلفياً؛ لذا استيراد صفحةٍ لها وحدها لا يجعلها موصولة (لم يحدث ذلك لأي شاشة مصنّفة «موصولة» عدا اعتمادها الإضافي على نداءات فعلية).
- **إجمالي**: 89 مساراً = 69 موصولة (منها 2 جزئية: `/`، `/settings/document-templates`) + 20 MOCK.


# ══════════════════════════════════
# 4 · كتالوج أنواع الطلبات وحالاتها (Request Types & Status Enums)
# ══════════════════════════════════

Below is the requested audit section. No preamble.

---

# القسم: كتالوج أنواع الطلبات + تعدادات الحالة (Request-type catalog + status enums)

> **مصدر البيانات:** جدول `request_types` يُبذَر من `api/src/seed/requests-seed.data.ts:134-218` (مصفوفة `typesSeed`) عبر `api/src/seed/seed-requests.ts:30-76`. الكتالوج الأمامي مرآة في `src/data/requestsCatalog.ts:95-176`. المصادر الثلاثة متطابقة في الأكواد لكن بينها فروق موثّقة أدناه.

## ملاحظات تمهيدية حرجة (قبل الجداول)

- **العدد الفعلي 63 نوعاً وليس 55**: التعليق `api/src/seed/requests-seed.data.ts:116` يقول «(55)»، والعدّ الفعلي لعناصر `typesSeed` هو **63**. رقم ثابت قديم.
- **حقل `chain` في `typesSeed` غير مُستخدَم فعلياً عند البذر**: البذّار `seed-requests.ts:31-48` يتجاهل قيم `CHAIN_*` المكتوبة في كل نوع، ويُنشئ لكل نوع سلسلة **خاصّة فارغة** اسمها `CH_<code>` (بلا خطوات، `autoApprove=false`)، ثم `seed-requests.ts:84-91` **يحذف كل السلاسل المشتركة `CHAIN_*`** المعرّفة في `chainsSeed`. النتيجة: كل نوع مبذور يشير `approvalChainId` إلى سلسلة `CH_<code>` فارغة، وعند التقديم يرمي `submit()` رسالة «لم تُحدَّد خطوات الاعتماد» حتى يضبطها المالك يدوياً (`requests.service.ts:454-460`). لذلك عمود «approval chain code» أدناه = **النية الموثّقة** من `typesSeed.chain`، بينما **الوجهة الفعلية = `CH_<code>` فارغة**. كذلك عتبات `CHAIN_MANAGER_FINANCE_T` (سلفة ≥ 5000) و`CHAIN_MANAGER_HR_EXEC_PCT` (زيادة ≥ 10%) المعرّفة في `chainsSeed` تُحذف ولا تُوصَّل.
- **`affectsBalance` وسائر الأعلام** تُبذَر من `typesSeed` عبر `seed-requests.ts:63-67`.

## (1) جدول كل أنواع الطلبات (63 نوعاً)

عمود «chain (المعلن)» = قيمة `typesSeed.chain` (نيّة توثيقية فقط — الفعلي `CH_<code>` فارغ). عمود «Active» = حالة `isActive` بعد البذر.

| # | code | nameAr | category | destinationHandler | chain (المعلن) | affectsBalance | phase | Active / Deprecated |
|---|------|--------|----------|--------------------|----------------|:--------------:|:-----:|---------------------|
| 1 | `LEAVE` | طلب إجازة | `leaves` | `leave_calendar_balance` | `CHAIN_MANAGER_HR` | ✔ | P1 | **Active** |
| 2 | `LEAVE_ANNUAL` | إجازة سنوية | `leaves` | `leave_calendar_balance` | `CHAIN_MANAGER_HR` | ✔ | P1 | Deprecated (`isActive=false`) |
| 3 | `LEAVE_SICK` | إجازة مرضية | `leaves` | `leave_calendar_balance` | `CHAIN_MANAGER_HR` | ✔ | P1 | Deprecated |
| 4 | `LEAVE_CASUAL` | إجازة عارضة/طارئة | `leaves` | `leave_calendar` | `CHAIN_MANAGER` | ✔ | P1 | Deprecated |
| 5 | `LEAVE_UNPAID` | إجازة بدون راتب | `leaves` | `leave_calendar_payroll` | `CHAIN_MANAGER_HR` | — | P1 | Deprecated |
| 6 | `LEAVE_MATERNITY` | إجازة وضع | `leaves` | `leave_calendar_payroll` | `CHAIN_HR` | — | P2 | Deprecated |
| 7 | `LEAVE_PATERNITY` | إجازة أبوة | `leaves` | `leave_calendar_payroll` | `CHAIN_MANAGER_HR` | — | P2 | Deprecated |
| 8 | `LEAVE_HAJJ` | إجازة حج | `leaves` | `leave_calendar_once` | `CHAIN_MANAGER_HR` | — | P2 | Deprecated |
| 9 | `LEAVE_MARRIAGE` | إجازة زواج | `leaves` | `leave_calendar_payroll` | `CHAIN_MANAGER_HR` | — | P2 | Deprecated |
| 10 | `LEAVE_BEREAVEMENT` | إجازة وفاة/عدة | `leaves` | `leave_calendar_payroll` | `CHAIN_HR` | — | P2 | Deprecated |
| 11 | `LEAVE_EXAM` | إجازة امتحانات | `leaves` | `leave_calendar_payroll` | `CHAIN_MANAGER_HR` | — | P3 | Deprecated |
| 12 | `LEAVE_COMPENSATORY` | إجازة تعويضية/بدل | `leaves` | `leave_calendar_payroll` | `CHAIN_MANAGER` | — | P2 | Deprecated |
| 13 | `LEAVE_MODIFY_CANCEL` | إلغاء/تعديل إجازة | `leaves` | `leave_balance_restore` | `CHAIN_MANAGER` | ✔ | P1 | **Active** |
| 14 | `PERMISSION` | استئذان | `time_attendance` | `attendance_log` | `CHAIN_MANAGER` | — | P1 | **Active** |
| 15 | `OVERTIME` | عمل إضافي | `time_attendance` | `overtime_entries` | `CHAIN_MANAGER` | — | P1 | **Active** |
| 16 | `OVERTIME_AUTO` | عمل إضافي مكتشف (بصمة) | `time_attendance` | `overtime_auto` | `CHAIN_MANAGER` | — | P2 | **Active** |
| 17 | `PUNCH_CORRECTION` | تصحيح/طلب بصمة | `time_attendance` | `attendance_corrections` | `CHAIN_MANAGER` | — | P1 | **Active** |
| 18 | `SHIFT_SWAP` | تبديل وردية | `time_attendance` | `shift_schedule` | `CHAIN_MANAGER` | — | P3 | **Active** |
| 19 | `REMOTE_WORK` | عمل عن بُعد | `time_attendance` | `attendance_log` | `CHAIN_MANAGER` | — | P2 | **Active** |
| 20 | `BUSINESS_TRIP` | مأمورية/انتداب | `time_attendance` | `attendance_trips` | `CHAIN_MANAGER_HR` | — | P2 | **Active** |
| 21 | `LOAN` | سلفة | `financial` | `loans_installments` | `CHAIN_MANAGER_FINANCE_T` | — | P1 | **Active** |
| 22 | `SALARY_INCREASE` | زيادة راتب | `financial` | `salary_update_history` | `CHAIN_MANAGER_HR_EXEC_PCT` | — | P2 | **Active** |
| 23 | `EXPENSE_CLAIM` | صرف مصروفات | `financial` | `expense_register` | `CHAIN_MANAGER_FINANCE` | — | P2 | **Active** |
| 24 | `BONUS` | مكافأة/حافز | `financial` | `payroll_bonus` | `CHAIN_MANAGER_HR` | — | P2 | **Active** |
| 25 | `PER_DIEM` | بدل سفر/انتداب | `financial` | `payroll_allowance` | `CHAIN_MANAGER_FINANCE` | — | P3 | **Active** |
| 26 | `EARLY_LOAN_SETTLEMENT` | سداد سلفة مبكر | `financial` | `loans_installments` | `CHAIN_FINANCE` | — | P3 | **Active** |
| 27 | `DEDUCTION_OBJECTION` | اعتراض على خصم | `financial` | `payroll_adjustment` | `CHAIN_HR_FINANCE` | — | P2 | **Active** |
| 28 | `PROMOTION` | ترقية | `employment_status` | `employee_update_promotions` | `CHAIN_MANAGER_HR_EXEC` | — | P2 | **Active** |
| 29 | `TEAM_TRANSFER` | نقل بين الفرق | `employment_status` | `transfers_effective_date` | `CHAIN_TRANSFER` | — | P2 | **Active** |
| 30 | `TITLE_CHANGE` | تغيير مسمى | `employment_status` | `employee_update` | `CHAIN_MANAGER_HR` | — | P3 | **Active** |
| 31 | `CONTRACT_RENEWAL` | تجديد عقد | `employment_status` | `contracts_register` | `CHAIN_HR_EXEC` | — | P2 | **Active** |
| 32 | `CONTRACT_TYPE_CHANGE` | تغيير نوع العقد | `employment_status` | `contracts_register` | `CHAIN_MANAGER_HR` | — | P3 | **Active** |
| 33 | `SECONDMENT` | إعارة/انتداب لجهة أخرى | `employment_status` | `assignments_register` | `CHAIN_HR_EXEC` | — | P3 | **Active** |
| 34 | `RETIREMENT` | تقاعد | `employment_status` | `employee_status` | `CHAIN_HR` | — | P3 | **Active** |
| 35 | `RESIGNATION` | استقالة | `employment_status` | `employee_status` | `CHAIN_MANAGER_HR_EXEC` | — | P1 | **Active** |
| 36 | `PERSONAL_DATA_UPDATE` | تحديث بيانات شخصية | `personal_data` | `employee_record` | `CHAIN_HR` | — | P1 | **Active** |
| 37 | `BANK_ACCOUNT_CHANGE` | تغيير الحساب البنكي | `personal_data` | `payroll_bank_secure` | `CHAIN_SECURITY_BANK` | — | P1 | **Active** (securityRoute) |
| 38 | `DEPENDENTS_UPDATE` | تحديث المعالين | `personal_data` | `employee_dependents` | `CHAIN_HR` | — | P2 | **Active** |
| 39 | `EMERGENCY_CONTACT` | جهة اتصال الطوارئ | `personal_data` | `employee_record_auto` | `CHAIN_AUTO` | — | P1 | **Active** |
| 40 | `DOCUMENT_RENEWAL` | رفع/تجديد وثائق | `personal_data` | `document_vault` | `CHAIN_HR` | — | P1 | **Active** |
| 41 | `LETTER_SALARY` | تعريف راتب | `letters` | `letter_pdf_generator` | `CHAIN_HR` | — | P1 | **Active** (PDF) |
| 42 | `LETTER_EMPLOYMENT` | خطاب توظيف | `letters` | `letter_pdf_generator` | `CHAIN_HR` | — | P1 | **Active** (PDF) |
| 43 | `LETTER_EXPERIENCE` | شهادة خبرة | `letters` | `letter_pdf_generator` | `CHAIN_HR` | — | P1 | **Active** (PDF) |
| 44 | `LETTER_NOC` | خطاب عدم ممانعة (NOC) | `letters` | `letter_pdf_generator` | `CHAIN_MANAGER_HR` | — | P2 | **Active** (PDF) |
| 45 | `LETTER_EMBASSY` | خطاب سفارة/تأشيرة | `letters` | `letter_pdf_generator` | `CHAIN_HR` | — | P2 | **Active** (PDF) |
| 46 | `LETTER_BANK_LOAN` | خطاب قرض بنكي | `letters` | `letter_pdf_generator` | `CHAIN_HR` | — | P2 | **Active** (PDF) |
| 47 | `CUSTODY_REQUEST` | طلب عهدة | `custody_assets` | `custody_assignments_ack` | `CHAIN_MANAGER_CUSTODY` | — | P1 | **Active** |
| 48 | `CUSTODY_RETURN` | إرجاع عهدة | `custody_assets` | `custody_assignments` | `CHAIN_CUSTODY` | — | P1 | **Active** |
| 49 | `CUSTODY_TRANSFER` | نقل عهدة | `custody_assets` | `custody_transfer` | `CHAIN_CUSTODY` | — | P2 | **Active** |
| 50 | `CUSTODY_LOSS_REPORT` | بلاغ فقد/تلف | `custody_assets` | `custody_finance` | `CHAIN_MANAGER_CUSTODY` | — | P2 | **Active** |
| 51 | `IT_EQUIPMENT` | طلب أجهزة/برامج IT | `custody_assets` | `it_assets` | `CHAIN_MANAGER_IT` | — | P2 | **Active** |
| 52 | `ACCESS_REQUEST` | طلب صلاحية/وصول | `custody_assets` | `access_register` | `CHAIN_MANAGER_IT` | — | P2 | **Active** |
| 53 | `FACILITY_CARD` | كارت دخول/موقف | `custody_assets` | `facilities_register` | `CHAIN_HR` | — | P3 | **Active** |
| 54 | `TRAINING_REQUEST` | طلب تدريب/دورة | `training` | `training_register` | `CHAIN_MANAGER_HR` | — | P3 | **Active** |
| 55 | `CERT_REIMBURSEMENT` | استرداد تكلفة شهادة | `training` | `training_expense` | `CHAIN_MANAGER_FINANCE` | — | P3 | **Active** |
| 56 | `CONFERENCE` | حضور مؤتمر | `training` | `training_register` | `CHAIN_MANAGER_HR` | — | P3 | **Active** |
| 57 | `EDUCATION_ASSISTANCE` | مساعدة دراسية | `training` | `training_register` | `CHAIN_MANAGER_HR` | — | P3 | **Active** |
| 58 | `GRIEVANCE` | تظلم/شكوى | `employee_relations` | `er_case` | `CHAIN_HR` | — | P2 | **Active** (confidential) |
| 59 | `WHISTLEBLOWING` | بلاغ عن مخالفة | `employee_relations` | `er_case_anonymous` | `CHAIN_HR` | — | P2 | **Active** (confidential) |
| 60 | `PENALTY_OBJECTION` | اعتراض على جزاء | `employee_relations` | `er_case` | `CHAIN_HR_EXEC` | — | P2 | **Active** (confidential) |
| 61 | `APPRAISAL_OBJECTION` | اعتراض على تقييم أداء | `employee_relations` | `appraisal_register` | `CHAIN_MANAGER_HR` | — | P2 | **Active** |
| 62 | `SUGGESTION` | اقتراح/ملاحظة | `employee_relations` | `suggestions_register` | `CHAIN_HR` | — | P3 | **Active** |
| 63 | `HR_MEETING` | طلب اجتماع مع HR | `employee_relations` | `meetings_register` | `CHAIN_HR` | — | P3 | **Active** |

**الأنواع المعطّلة (11):** `LEAVE_ANNUAL`, `LEAVE_SICK`, `LEAVE_CASUAL`, `LEAVE_UNPAID`, `LEAVE_MATERNITY`, `LEAVE_PATERNITY`, `LEAVE_HAJJ`, `LEAVE_MARRIAGE`, `LEAVE_BEREAVEMENT`, `LEAVE_EXAM`, `LEAVE_COMPENSATORY` — تُعطَّل بـ `isActive=false` في `seed-requests.ts:97-110` (موحّدة تحت `LEAVE`)، وموسومة `deprecated:true` في الفرونت `src/data/requestsCatalog.ts:99-109`. الأنواع الفعّالة الصافية = **52**.

**فرق تسمية بين المصدرين (nameAr):** `PUNCH_CORRECTION` = «تصحيح/طلب بصمة» في `requests-seed.data.ts:156` مقابل «تصحيح بصمة» في `src/data/requestsCatalog.ts:115`.

**فرق تغطية (أنواع في الباك غير موجودة في كتالوج الفرونت):** `OVERTIME_AUTO` مبذور في الباك (`requests-seed.data.ts:155`) وليس له سطر في `src/data/requestsCatalog.ts` (الفرونت يعرض اسمه عبر `types` من السيرفر فقط).

## (2) مجموعة قيم حالة الطلب (Request STATUS) — من المصادر الثلاثة

قيم موحّدة (9) في المصادر الثلاثة **بلا أي تعارض**:

| قيمة الحالة | (أ) DB entity | (ب) Backend state machine | (ج) Frontend `statusLabels` | تسمية الفرونت |
|-------------|:---:|:---:|:---:|---------------|
| `DRAFT` | ✔ | ✔ | ✔ | مسودة |
| `SUBMITTED` | ✔ | ✔ | ✔ | مُقدَّم |
| `UNDER_REVIEW` | ✔ | ✔ | ✔ | قيد المراجعة |
| `APPROVED` | ✔ | ✔ | ✔ | موافَق عليه |
| `IN_EXECUTION` | ✔ | ✔ | ✔ | قيد التنفيذ |
| `COMPLETED` | ✔ | ✔ | ✔ | مكتمل |
| `REJECTED` | ✔ | ✔ | ✔ | مرفوض |
| `CANCELLED` | ✔ | ✔ | ✔ | ملغى |
| `RETURNED_FOR_INFO` | ✔ | ✔ | ✔ | مُرجَع لاستكمال معلومات |

- **(أ) DB entity:** `type RequestStatus` في `api/src/requests/entities/request.entity.ts:10-19`؛ العمود `status` طوله 30 وافتراضه `'DRAFT'` (`request.entity.ts:42-43`).
- **(ب) State machine:** `TRANSITIONS` في `api/src/requests/state-machine.ts:11-21` يعرّف الانتقالات المسموحة: `DRAFT→{SUBMITTED,CANCELLED}`، `SUBMITTED→{UNDER_REVIEW,CANCELLED}`، `UNDER_REVIEW→{APPROVED,REJECTED,RETURNED_FOR_INFO,CANCELLED}`، `RETURNED_FOR_INFO→{SUBMITTED,CANCELLED}`، `APPROVED→{IN_EXECUTION,COMPLETED}`، `IN_EXECUTION→{COMPLETED}`؛ الحالات النهائية `COMPLETED/REJECTED/CANCELLED` بلا مخارج. الخدمة تُثبّت هذه القيم في `requests.service.ts` (مثال `status:'DRAFT'` سطر 208، `'UNDER_REVIEW'` 467، `'REJECTED'` 600، `'RETURNED_FOR_INFO'` 608، `'APPROVED'` 632، وفي التنفيذ `'COMPLETED'`/`'IN_EXECUTION'` بـ `destinations`… `requests.service.ts:655-657`).
- **(ج) Frontend:** `type RequestStatus` + `statusLabels` + `statusStyles` في `src/data/requestsCatalog.ts:11-44`.

**تعارض في مجموعة القيم: لا يوجد** — القيم التسع متطابقة حرفياً عبر المصادر الثلاثة.

**تنبيهات لتفادي الخلط (تعدادات مجاورة ليست حالة الطلب):**
- **فعل الاعتماد (imperative):** `ActDto.action = 'APPROVE' | 'REJECT' | 'RETURN'` (`requests.service.ts:31`)، وتُخزَّن في `resolvedSteps[].action` بنفس هذه القيم.
- **تعداد سجل التدقيق:** `ApprovalAction = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_INFO' | 'DELEGATED' | 'ESCALATED'` (`entities/request-approval.entity.ts:9-14`) — يتضمّن `DELEGATED`/`ESCALATED` غير الموجودتين في حالة الطلب؛ `ESCALATED` تُكتب في محرك التصعيد (`requests.service.ts:1042`).
- **حالة سجل الوجهة «الإجازة»:** `Leave.status = 'APPROVED' | 'CANCELLED'` فقط (`entities/leave.entities.ts:80-81`) — تعداد مستقل عن حالة الطلب.
- **تجميع UI فقط:** فلتر «قيد التنفيذ» في الفرونت يضم `['APPROVED','IN_EXECUTION']` معاً (`src/app/requests/page.tsx:777-778, 786`) — تجميع عرض لا قيمة حالة جديدة.

## (3) مفاتيح الـ destination handlers ← الأكواد المرتبطة بها

المفتاح مُخزَّن في `request_types.destinationHandler` (من `typesSeed.handler`). الإرسال الفعلي في `api/src/requests/destinations.service.ts:581-611` (سجل `handlers`) + الحالة الخاصة `'none'` (`destinations.service.ts:56-58`). المفاتيح غير الموجودة في السجل تسقط على سجل عام `REQ` مع تحذير (`destinations.service.ts:59-66`).

| destinationHandler key | الأكواد المرتبطة | مُنفَّذ في `DestinationsService`؟ |
|------------------------|------------------|:---:|
| `leave_calendar_balance` | `LEAVE`, `LEAVE_ANNUAL`, `LEAVE_SICK` | ✔ `leaveHandler(true)` |
| `leave_calendar` | `LEAVE_CASUAL` | ✔ `leaveHandler(true)` |
| `leave_calendar_payroll` | `LEAVE_UNPAID`, `LEAVE_MATERNITY`, `LEAVE_PATERNITY`, `LEAVE_MARRIAGE`, `LEAVE_BEREAVEMENT`, `LEAVE_EXAM`, `LEAVE_COMPENSATORY` | ✔ `leaveHandler(false)` |
| `leave_calendar_once` | `LEAVE_HAJJ` | ✔ `leaveHandler(false)` |
| `leave_balance_restore` | `LEAVE_MODIFY_CANCEL` | ✔ `leaveRestoreHandler` |
| `attendance_log` | `PERMISSION`, `REMOTE_WORK` | ✘ (سجل REQ عام) |
| `overtime_entries` | `OVERTIME` | ✔ `overtimeHandler` |
| `overtime_auto` | `OVERTIME_AUTO` | ✔ `overtimeAutoHandler` |
| `attendance_corrections` | `PUNCH_CORRECTION` | ✔ `punchCorrectionHandler` |
| `shift_schedule` | `SHIFT_SWAP` | ✘ |
| `attendance_trips` | `BUSINESS_TRIP` | ✘ |
| `loans_installments` | `LOAN`, `EARLY_LOAN_SETTLEMENT` | ✔ `loanHandler` |
| `salary_update_history` | `SALARY_INCREASE` | ✔ `salaryUpdateHandler` |
| `expense_register` | `EXPENSE_CLAIM` | ✘ |
| `payroll_bonus` | `BONUS` | ✘ |
| `payroll_allowance` | `PER_DIEM` | ✘ |
| `payroll_adjustment` | `DEDUCTION_OBJECTION` | ✘ |
| `employee_update_promotions` | `PROMOTION` | ✔ `promotionHandler` |
| `transfers_effective_date` | `TEAM_TRANSFER` | ✔ `transferHandler` |
| `employee_update` | `TITLE_CHANGE` | ✘ |
| `contracts_register` | `CONTRACT_RENEWAL`, `CONTRACT_TYPE_CHANGE` | ✘ |
| `assignments_register` | `SECONDMENT` | ✘ |
| `employee_status` | `RETIREMENT`, `RESIGNATION` | ✔ `employeeStatusHandler` |
| `employee_record` | `PERSONAL_DATA_UPDATE` | ✔ `employeeRecordHandler` |
| `payroll_bank_secure` | `BANK_ACCOUNT_CHANGE` | ✔ `bankChangeHandler` |
| `employee_dependents` | `DEPENDENTS_UPDATE` | ✘ |
| `employee_record_auto` | `EMERGENCY_CONTACT` | ✔ `employeeRecordHandler` |
| `document_vault` | `DOCUMENT_RENEWAL` | ✘ |
| `letter_pdf_generator` | `LETTER_SALARY`, `LETTER_EMPLOYMENT`, `LETTER_EXPERIENCE`, `LETTER_NOC`, `LETTER_EMBASSY`, `LETTER_BANK_LOAN` | ✔ `letterHandler` |
| `custody_assignments_ack` | `CUSTODY_REQUEST` | ✔ `custodyAssignHandler` |
| `custody_assignments` | `CUSTODY_RETURN` | ✔ `custodyReturnHandler` |
| `custody_transfer` | `CUSTODY_TRANSFER` | ✔ `custodyTransferHandler` |
| `custody_finance` | `CUSTODY_LOSS_REPORT` | ✘ |
| `it_assets` | `IT_EQUIPMENT` | ✘ |
| `access_register` | `ACCESS_REQUEST` | ✘ |
| `facilities_register` | `FACILITY_CARD` | ✘ |
| `training_register` | `TRAINING_REQUEST`, `CONFERENCE`, `EDUCATION_ASSISTANCE` | ✘ |
| `training_expense` | `CERT_REIMBURSEMENT` | ✘ |
| `er_case` | `GRIEVANCE`, `PENALTY_OBJECTION` | ✘ |
| `er_case_anonymous` | `WHISTLEBLOWING` | ✘ |
| `appraisal_register` | `APPRAISAL_OBJECTION` | ✘ |
| `suggestions_register` | `SUGGESTION` | ✘ |
| `meetings_register` | `HR_MEETING` | ✘ |

**خلاصة تغطية الـ handlers:** إجمالي **43 مفتاحاً** مميزاً مرجعياً في `typesSeed`. المُنفَّذ فعلياً في `destinations.service.ts:581-611` هو **20 مفتاحاً** (+ الحالة الخاصة `'none'` غير المستخدمة في أي نوع مبذور). **23 مفتاحاً** بلا تنفيذ (`attendance_log`, `shift_schedule`, `attendance_trips`, `expense_register`, `payroll_bonus`, `payroll_allowance`, `payroll_adjustment`, `employee_update`, `contracts_register`, `assignments_register`, `employee_dependents`, `document_vault`, `custody_finance`, `it_assets`, `access_register`, `facilities_register`, `training_register`, `training_expense`, `er_case`, `er_case_anonymous`, `appraisal_register`, `suggestions_register`, `meetings_register`) — أي طلب من أنواعها يُعتمد ثم يسقط على سجل `REQ-YYYY-NNNNNN` عام بلا وجهة متخصّصة (`destinations.service.ts:62-65`).


# ══════════════════════════════════
# 5 · إعداد دورة الموافقات (Approval Workflow Config)
# ══════════════════════════════════

## دورة الموافقات (Approval-Workflow) — الجرد

### (أ) الجداول التي تخزّن السلاسل والخطوات

سلسلتان مرتبطتان `OneToMany`:

| الكيان | الجدول | الملف |
|---|---|---|
| `ApprovalChain` | `approval_chains` | `api/src/requests/entities/approval-chain.entity.ts:7` |
| `ApprovalStep` | `approval_steps` | `api/src/requests/entities/approval-step.entity.ts:25` |

**`approval_chains`** (`approval-chain.entity.ts:8-36`):

| العمود | النوع | ملاحظة | السطر |
|---|---|---|---|
| `id` | PK | | :9 |
| `code` | varchar(50) | `CH_LEAVE_ANNUAL`… فريد داخل نطاق `(code, branchId)` | :12, index :6 |
| `nameAr` | varchar(200) | | :15 |
| `branchId` | int nullable | `NULL` = كل الفروع؛ قيمة = نسخة خاصة بفرع | :19-20 |
| `isActive` | bool (default true) | | :22-23 |
| `requestTypeCode` | varchar(50) nullable | للعرض في الباني فقط | :26-27 |
| `autoApprove` | bool (default false) | العامل الحاسم لسلوك السلسلة الفاضية | :31-32 |

**`approval_steps`** (`approval-step.entity.ts:26-71`): `id`, `chainId` (FK+index :30-36)، `stepOrder` (:38)، `approverRole` varchar(60) (:41-42)، `specificEmployeeId` nullable (:45-46)، `isParallel` (:48-49)، وحقول الخطوة الشرطية `thresholdField`/`thresholdOp`/`thresholdValue` (:53-60)، وحقول الـ SLA `slaDays`/`escalateTo` (:63-67)، و`canDelegate` (:69-70). ربط النوع بالسلسلة عبر `RequestType.approvalChainId` (`request-type.entity.ts:48-49`).

الأدوار المتاحة (enum `ApproverRole`, `approval-step.entity.ts:12-23`): `direct_manager_of_requester`, `department_manager_of_requester`, `branch_manager_of_requester`, `receiving_team_manager`, `hr`, `finance`, `custody_officer`, `payroll_officer`, `it`, `executive`, `specific_employee`.

### (ب) كيف تُحلّ الأدوار إلى مستخدمين وقت التشغيل

الحل على مرحلتين في `ApproverResolver` (`approver-resolver.service.ts`):

1. **وقت التقديم — الأدوار الهيكلية** تُحل إلى `approverEmployeeId` مُثبَّت وتُخزَّن JSON في `Request.resolvedSteps` (`approver-resolver.service.ts:78-103`، يُستدعى من `resolveChain` عند `requests.service.ts:507-512`):
   - `direct_manager_of_requester` → `directManagerOf`: تسلسل `managerEmployeeId` ← قائد الفريق `team.leaderEmployeeId` ← مدير القسم `dept.managerEmployeeId` ← مدير الفرع `branch.managerEmployeeId` (:34-57).
   - `department_manager_of_requester` (:60-67), `branch_manager_of_requester` (:70-75).
   - `receiving_team_manager` → قائد الفريق المستقبِل من `payload.toTeamId` (:93-98).
   - `specific_employee` → `specificEmployeeId` من الخطوة (:91-92).
   - الأدوار الوظيفية (`hr`/`finance`/`it`/`custody`/`executive`/`payroll`) ترجع `null` هنا (`default:` :100-101) — لا تُثبَّت لموظف بعينه.
2. **وقت الفعل — الأدوار الوظيفية** تُتحقق ديناميكياً بدور المستخدم أو صلاحية ممنوحة في `satisfies()` (:107-155): الهيكلية تطابق `user.employeeId === step.approverEmployeeId` (:112-121)؛ الوظيفية تطابق `user.role` أو صلاحية مثل `approve.hr`/`approve.finance`/`approve.payroll` (:122-153). و`super_admin` يتصرف في أي خطوة (:109).

### (ج) «٣ خيارات دورة اعتماد لكل شركة» — الحالة: MISSING / NOT-FOUND

لا وجود لأي مفهوم «خيارات/presets دورة اعتماد مُسمّاة قابلة للاختيار على مستوى الشركة».

- **لا توجد ٣ خيارات مُسمّاة**: السلاسل تُبذر واحدة لكل نوع طلب (`CH_${type.code}`, `seed-requests.ts:32-41`)، لا مجموعة من ثلاثة قوالب مُسمّاة يُختار بينها.
- **ليست لكل شركة**: النطاق الوحيد على السلسلة هو `branchId` (فرع)، وليس `companyId`. بحث `companyId`/`Company` في `api/src/requests` = **لا نتائج**، ولا يوجد كيان `Company` في `api/src` إطلاقاً.
- **محرّك التوجيه لا يقرأ أي اختيار على مستوى الشركة**: `resolveChain` يبدأ من `type.approvalChainId` ثم يبحث عن نسخة فرعية بنفس `code` عبر `req.branchId` (`requests.service.ts:479-496`). لا قراءة لأي حقل «الدورة المختارة للشركة» في أي مكان.
- كلمة `preset` في الكود تخص `ROLE_PRESETS` (حزم صلاحيات الأدوار في `auth/permissions.ts:66`) — لا علاقة لها بدورات الاعتماد. لا وجود لكلمة `workflow` في منطق الطلبات.

الطبقة الوحيدة القريبة من «التخصيص» هي تجاوز السلسلة العامة بنسخة **لكل فرع** (`branchId`)، لا اختيار من ٣ قوالب على مستوى شركة.

### (د) سلوك السلسلة ذات الخطوات الفاضية (توقف مقابل موافقة تلقائية)

يُحسم في `submit` بعد `resolveChain` عند `resolved.length === 0` (`requests.service.ts:445-465`)، والحاسم هو علم `autoApprove` على **السلسلة المستخدمة فعلاً**:

| الحالة | السلوك | الدليل |
|---|---|---|
| لا سلسلة مربوطة (`type.approvalChainId` فارغ أو السلسلة محذوفة → `chain === null`) | **توقف** — `BadRequestException` «لا توجد سلسلة اعتماد مربوطة» | :448-453 (و `resolveChain` :479, :483) |
| سلسلة موجودة، فاضية، `autoApprove = false` | **توقف** — `BadRequestException` «لم تُحدَّد خطوات الاعتماد… بعد» | :455-460 |
| سلسلة موجودة، فاضية، `autoApprove = true` | **موافقة فورية** — `status = 'APPROVED'` ثم `executeDestination` | :461-464 |

الافتراضي آمن: السلاسل المبذورة تأتي بـ `autoApprove: false` (`seed-requests.ts:41`)، فالفاضية تتوقف افتراضياً ولا تُنفَّذ بلا اعتماد. المسار الآلي `reconcileAutoOvertime` يطبّق نفس المنطق (`requests.service.ts:959, 998-1004`: يتخطى لو `stepCount===0 && !autoApprove`، ويعتمد تلقائياً فقط لو `usedChain.autoApprove`).

### (هـ) التقديم نيابةً عن الغير (on-behalf-of)

مدعوم صراحةً. الحقل في DTO هو `onBehalfEmployeeId` (`requests.service.ts:116`)، ويُفصَل المستفيد عن المُنشئ عبر حقلين على الطلب:

- `Request.requesterId` = صاحب الطلب الفعلي / المستفيد (`request.entity.ts:31-32`).
- `Request.createdByUserId` = المُنشئ الحقيقي `user.sub` (`request.entity.ts:35-36`, يُضبط في :205).

المنطق في `create` (`requests.service.ts:125-147`): إن كان `onBehalfEmployeeId` مختلفاً عن المستخدم، يشترط صلاحية `requests.create_on_behalf` (أو `super_admin`/`*`) وإلا `ForbiddenException` (:130-136)؛ يتحقق من وجود الموظف المستهدف؛ ثم `requesterId = target.id` (:141) ويُعاد بناء `user.employeeId = requesterId` (:147) بحيث يجري باقي المنطق باسم المستفيد.

**التوجيه يعتمد المستفيد لا المُنشئ**: `resolveChain` يمرر `req.requesterId` إلى `resolveApproverEmployee` (`requests.service.ts:509`)، فيُحسب المدير المباشر وفروع الشجرة على أساس المستفيد؛ كما أن `branchId` يؤخذ من موظف المستفيد (`emp?.branchId`, :206) فتُختار نسخة السلسلة الفرعية الخاصة به. `createdByUserId` يُستخدم لاحقاً فقط في تمييز المُنشئ عن المالك (مثلاً `isCreator = req.createdByUserId === user.sub` :1091) لا في التوجيه.


# ══════════════════════════════════
# 6 · أسطح الإعدادات (Config Surfaces — Real vs Hardcoded)
# ══════════════════════════════════

# قسم: أسطح الإعدادات (Config) — الحقيقي المدعوم بقاعدة البيانات مقابل المُتَشفَّر (Hardcoded)

مصدر البذرة: `api/src/seed/requests-seed.data.ts:236-264` (`configSeed`). واجهة الإدارة: `GET /settings/config` (`settings.controller.ts:369-372`) تعرض كل الصفوف، و`PATCH /settings/config` (`settings.controller.ts:389-406`) يُعدّل **المفاتيح الموجودة فقط** (مفتاح جديد يُرفض بـ `NotFoundException` — سطر 393)، مع شبكة تحقق رقمية للمفاتيح الحرجة (`NUMERIC_MIN`، سطر 376-387). دالة القراءة عند الاستهلاك متكررة بأسماء مختلفة: `configValue()` في الحضور، `cfg()` في الرواتب/إنهاء الخدمة، و`config.findOne()` مباشرة في الأرصدة/الموظفين — كلها تقرأ نفس جدول `requests_config`.

## 1) جرد كل مفاتيح الإعدادات المبذورة (20 مفتاحاً)

| key | القيمة المبذورة | مكان الاستهلاك في الباك (file:line) | الحالة |
|---|---|---|---|
| `overtime.biometric_requires_confirmation` | `true` | `attendance.service.ts:1133-1137` (يقرأها → `requiresConfirmation`)، والأثر في `1145-1146` | **WIRED** — تتحكم في حالة الأوفرتايم المكتشف: `DETECTED` (بانتظار تأكيد المدير) مقابل `APPROVED` فوري |
| `overtime.detection_threshold_hours` | `0.5` | `attendance.service.ts:1117-1120` (fallback إن لم يكن للوردية عتبة خاصة `overtimeThresholdHours`) | **WIRED** — تحت العتبة لا يُنشأ قيد أوفرتايم (`1123: if (actualHours < threshold) return`) |
| `loan.finance_approval_threshold` | `5000` | **لا يُستهلَك** — التقييم وقت التشغيل يقرأ `step.thresholdValue` من صف الخطوة (`requests.service.ts:538-541`)، والقيمة الحقيقية «5000» مبذورة داخل خطوة السلسلة (`requests-seed.data.ts:53-55`) | **COSMETIC/UNUSED** — مفتاح يتيم؛ الزرّ الفعلي هو `thresholdValue` على `approval_step` (يُعدّل عبر `PATCH /settings/approval-steps/:id`، `settings.controller.ts:126-128, 512-514`). تعديل قيمة المفتاح لا يغيّر أي سلوك |
| `salary_increase.executive_threshold_pct` | `10` | **لا يُستهلَك** — نفس الآلية؛ القيمة «10» مبذورة في خطوة السلسلة (`requests-seed.data.ts:65-70`)، والتقييم عبر `step.thresholdValue` (`requests.service.ts:541`) | **COSMETIC/UNUSED** — الزرّ الحقيقي في صف الخطوة، لا في هذا المفتاح |
| `transfer.execution_mode` | `effective_date` | **لا يُستهلَك** — `transferHandler` يطبّق منطق «تاريخ السريان» مُتَشفَّراً دائماً (`destinations.service.ts:268-275`: `if (effectiveDate <= today) execute; else schedule`)، والمُجدوَل يُنفَّذ بـ `requests.service.ts:1065-1067` | **COSMETIC/UNUSED** — لا يوجد وضع بديل (مثل تنفيذ فوري) يقرأ هذا المفتاح |
| `attendance.grace_minutes` | `10` | `attendance.service.ts:816-819` (fallback إن لم تحدد الوردية `graceMinutes`)، والأثر في `1013` و`1026` | **WIRED** — عتبة التأخير والانصراف المبكر معاً |
| `attendance.weekend_days` | `FRI,SAT` | `attendance.service.ts:171` داخل `isNonWorkingDay` (يغلبها الفرع سطر 173 وجدول الموظف سطر 175) | **WIRED** — تحدد يوم العطلة → حالة `holiday` (`182, 909-922`) |
| `attendance.sync_interval_minutes` | `0` | `device-sync.service.ts:166-176` (Cron كل 5 دقائق) | **WIRED** — `0` يوقف السحب المجدول؛ >0 يحدد فاصل السحب بالدقائق |
| `attendance.device_key` | `zk-device-key-change-me` | `attendance.service.ts:419-421` داخل `ingest()` | **WIRED** — مفتاح مصادقة استقبال بصمات ZKTeco (عند غياب JWT) |
| `leave.annual_entitled` | `21` | `employees.service.ts:186-190` (`configAnnualEntitled`) + `leave-balances.service.ts:225-227` (الترحيل) | **WIRED** — الاستحقاق السنوي العام على الرصيد |
| `leave.accrual_mode` | `monthly` | `leave-balances.service.ts:124` (يفرّع في `accruedEntitlement:56`) + `offboarding.service.ts:262, 265` | **WIRED** — `monthly` = تراكم شهري، أي قيمة أخرى = الاستحقاق كامل مقدماً |
| `leave.probation_months` | `0` | `leave-balances.service.ts:125` (يزيح بداية الاستحقاق `accruedEntitlement:60-64`) + `offboarding.service.ts:263, 268` | **WIRED** — يؤجّل بدء تراكم الرصيد بعدد الشهور |
| `leave.carryover_max_days` | `10` | `leave-balances.service.ts:214-217` (`rollover`) | **WIRED** — سقف أيام المُرحَّل للسنة الجديدة |
| `leave.carryover_expiry_months` | `3` | `leave-balances.service.ts:218-224` (يحسب `expiryDate` للطبقة الافتتاحية) | **WIRED** — تاريخ انتهاء صلاحية الرصيد المُرحَّل |
| `system.currency` | `SAR` | **لا استهلاك في الباك** — يُقرأ في الفرونت فقط: `src/lib/currency.ts:32` (`config.find(c => c.key === 'system.currency')`) | **WIRED (فرونت فقط)** — لا يوجد أي قارئ خلفي؛ الباك لا يعرف العملة |
| `eos.months_per_year` | `0.5` | `offboarding.service.ts:229` (والأثر سطر 233: `gross * monthsPerYear * years`) | **WIRED** — معامل مكافأة نهاية الخدمة (شهور/سنة) |
| `payroll.cycle_start_day` | `23` | `payroll.service.ts:59` (`periodRange`) | **WIRED** — بداية دورة المسير (23 → 22) |
| `payroll.monthly_days` | `30` | `payroll.service.ts:86` (مقسوم عليه في `dayRate` سطر 104) + `offboarding.service.ts:223` | **WIRED** — مقام قيمة اليوم |
| `payroll.daily_hours` | `8` | `payroll.service.ts:87` (مقسوم عليه في `hourRate` سطر 105) + `offboarding.service.ts:301` | **WIRED** — مقام قيمة الساعة |
| `payroll.late_deduction_enabled` | `true` | `payroll.service.ts:88-89` (والأثر سطر 136: `latenessDeduction`) | **WIRED** — مفتاح تشغيل/إيقاف خصم التأخير |

**خلاصة الجرد:** 16 مفتاحاً مُوصَّلاً فعلياً، و1 مُوصَّل بالفرونت فقط (`system.currency`)، و**3 مفاتيح يتيمة لا أثر لها إطلاقاً** (`loan.finance_approval_threshold`, `salary_increase.executive_threshold_pct`, `transfer.execution_mode`) — لأنها تبدو كأنها الزرّ بينما القيمة الحقيقية إمّا في صف `approval_step` أو مُتَشفَّرة في المُعالِج.

## 2) الإعدادات التي يتوقعها التدقيق أن تكون قابلة للضبط — مفتاح حقيقي أم مُتَشفَّر؟

| الإعداد المتوقَّع | مفتاح config حقيقي؟ | الدليل / الموضع المُتَشفَّر |
|---|---|---|
| عتبة التأخير (late threshold) | نعم — `attendance.grace_minutes` | مُوصَّل (`attendance.service.ts:816-819, 1013`). لا توجد عتبة تأخير منفصلة عن السماحية |
| عتبة الانصراف المبكر (early threshold) | جزئياً — **يُعيد استخدام نفس** `attendance.grace_minutes` | لا مفتاح مستقل؛ نفس قيمة السماحية تُطبَّق على المبكر (`attendance.service.ts:1026`) |
| **قطع نصف اليوم (half-day cutoff)** ⚠️ | **لا يوجد مفتاح** | لا توجد عتبة «تأخير > س ⇒ نصف يوم». نصف اليوم يُحدَّد من `leave.period` (FULL/MORNING/EVENING) وقت الطلب، والتقسيم عند **منتصف الوردية مُتَشفَّراً**: `shiftMid = Math.round((shiftStart+shiftEnd)/2)` (`attendance.service.ts:882`)، ونوافذ النصف في `887-888`. الخصم دقيقة-بدقيقة لا بنظام نصف يوم |
| **خصم الغياب (absence deduction)** ⚠️ | **لا مفتاح ولا منطق** | المسير يخصم فقط: تأخير + أيام إجازة غير مدفوعة + أقساط سلف (`payroll.service.ts:136-159, 175-180`). يوم بحالة `absent` (بلا بصمة وليس إجازة) **لا يُنتِج أي خصم آلي**. الإجازة غير المدفوعة تُخصَم بيوم كامل مُتَشفَّراً (`159`) ونصفها ×0.5 مُتَشفَّراً (`156`) |
| **خصم عجز/فقد العهدة (custody-shortfall)** ⚠️ | **لا مفتاح ولا مُعالِج** | `custody_finance` (مُعالِج `CUSTODY_LOSS_REPORT`) **غير مُسجَّل في خريطة المُعالِجات** (`destinations.service.ts:585-611`؛ التعليق سطر 610 يقول الباقي يسقط على سجل `REQ` عام). لا حساب ولا خصم لقيمة الفاقد |
| **معاملات الأوفرتايم weekday/weekend/holiday** ⚠️ | **لا مفاتيح** | معامل واحد افتراضي `1.5` مُتَشفَّر في 4 مواضع: default الكيان (`attendance.entities.ts:42`)، إنشاء الطلب (`destinations.service.ts:158`: `payload.rate ? … : 1.5`)، حساب المسير (`payroll.service.ts:122`: `r.rate ?? 1.5`)، وتسوية إنهاء الخدمة تُشفِّر `1.5` وتتجاهل `rate` (`offboarding.service.ts:306`). **لا تمييز للويك إند/العطلة الرسمية** — الأوفرتايم المكتشف يوم عطلة يأخذ نفس المعامل |
| فترات الإشعار (notice periods) | **لا مفتاح** | الاستقالة تضبط الحالة `notice_period` وتخزّن `lastWorkingDate` من الحمولة فقط (`destinations.service.ts:384, 404, 419`)؛ لا طول إشعار مفروض ولا تحقق منه |
| مراكز التكلفة (cost centers) | ليست مفتاح config — **كيان مستقل** | جدول `cost_centers` (`assets.entities.ts:232`) بواجهة CRUD خاصة (`catalogs.controller.ts:48, 77`) ومربوط بالموظف (`employee.entity.ts:87 costCenterId`). قابلة للضبط كبيانات، خارج محرك `requests_config` |

**أعلى المخاطر (مؤكَّدة):** قطع نصف اليوم، معاملات الأوفرتايم، وخصم الغياب/العهدة لكل نوع — **كلها مُتَشفَّرة أو غائبة تماماً من طبقة الإعدادات**؛ معامل الأوفرتايم `1.5` مكرَّر في 4 مواضع بلا مصدر حقيقة واحد ولا تمييز عطلة، وخصم عجز العهدة غير مُنفَّذ أصلاً (المُعالِج غير مربوط).


# ══════════════════════════════════
# 7 · خريطة الديمو/الموك (Demo / Mock Data Map)
# ══════════════════════════════════

Based on an exhaustive read of the codebase, here is the deliverable section.

---

## Appendix D — خريطة بيانات العرض/التجريبية (Seed/Demo/Mock Data Map)

مسح شامل لـ `src/` و`api/src/`. التصنيف: **(أ) شاشات وهمية بالكامل** تعرض بيانات ملفّقة كأنها حقيقية بلا أي استدعاء باك إند وبلا لافتة «قيد التفعيل»؛ **(ب) مكوّنات لوحة التحكم الوهمية**؛ **(ج) شاشات هجينة** (باك إند حقيقي + قسم مزروع)؛ **(د) ملفات mock ميتة**؛ **(هـ) بذور تجريبية في الباك إند**. أُلحق في النهاية تمييزٌ للـ **placeholders الصادقة** (ليست خطراً).

### (أ) وحدات أمامية وهمية بالكامل (لا تتصل بالباك إند إطلاقاً)

هذه الملفات لا تستورد `@/lib/api` نهائياً، وتُحسب إحصاءاتها وجداولها من مصفوفات ثابتة، وأزرار الإجراء فيها (تقييم/نشر/إرسال/تشغيل) بلا onClick يستدعي السيرفر.

| Location (file:line) | What it is | Why it's demo/mock | Impact if mistaken for real |
|---|---|---|---|
| `src/app/performance/page.tsx:47` | `reviews: PerformanceReview[]` — 5 موظفين بدرجات أداء | مصفوفة ثابتة؛ بطاقات الإحصاء و«توزيع التقييمات» (`:396`) و«أفضل الموظفين» تُحسب منها؛ أزرار «تقييم جديد/تعديل» بلا حدث | لوحة أداء كاملة بأسماء ودرجات مخترعة تُقرأ كسجل تقييم فعلي |
| `src/app/performance/goals/page.tsx:47` | `goals: Goal[]` — أهداف OKR ونتائج رئيسية | ثابتة؛ لا fetch؛ «هدف جديد/تعديل/حذف» بلا حدث | تقدّم أهداف (75%، 450000 ر.س مبيعات...) وهمي |
| `src/app/performance/cycles/page.tsx:37` | `reviewCycles: ReviewCycle[]` — دورات تقييم بأعداد موظفين | ثابتة؛ زر «إنشاء الدورة» يغلق المودال فقط (`:421`) | دورات تقييم وأعداد مشاركين (156 موظف...) مخترعة |
| `src/app/performance/templates/page.tsx:33` | `templates: ReviewTemplate[]` — نماذج بأوزان و`usageCount` | ثابتة؛ إنشاء/نسخ/تعديل بلا باك إند | «686 استخدام» ونماذج وأوزان مخترعة |
| `src/app/performance/new/page.tsx:19,26,32` | `employees` + `reviewCycles` + `defaultCategories` | قوائم منسدلة ثابتة؛ «حفظ/إرسال التقييم» (`:357`) بلا حدث | إدخال تقييم لموظف من قائمة وهمية، ثم يُفقَد بلا حفظ |
| `src/app/performance/[id]/page.tsx:25` | `reviewData` — تقييم مفصّل لموظف واحد | كائن ثابت؛ يتجاهل `params.id` تماماً | أي رابط `/performance/{id}` يعرض نفس التقييم المخترع (أحمد، 4.2/5) |
| `src/app/training/page.tsx:45` | `courses: Course[]` + مسارات التعلّم (`:474`) | ثابتة؛ «إضافة/ابدأ الدورة» بلا حدث | «248 مشترك»، تقييمات، ومسارات تدريب وهمية |
| `src/app/training/my-courses/page.tsx:34` | `myCourses: EnrolledCourse[]` | ثابتة؛ لا fetch لهوية المستخدم | تقدّم تدريب شخصي وهمي (75%، شهادات) |
| `src/app/training/certificates/page.tsx:36` | `certificates: Certificate[]` | ثابتة؛ بأرقام شهادات ودرجات | سجل شهادات (CERT-2024-001، 92%...) مخترع وقابل للتحميل ظاهرياً |
| `src/app/training/add/page.tsx:23,32` | `categories` + `instructors` | قوائم ثابتة؛ «نشر الدورة» (`:119`) بلا حدث | مدرّبون وتصنيفات وهمية؛ النموذج لا يحفظ |
| `src/app/training/[id]/page.tsx:23` | `course` مع أقسام ودروس واختبارات | كائن ثابت؛ يتجاهل `params.id` | صفحة دورة كاملة (فيديوهات/دروس) وهمية |
| `src/app/recruitment/interviews/page.tsx:38` | `interviews: Interview[]` | ثابتة؛ «جدولة مقابلة» بلا حدث؛ فلترة «اليوم» مثبّتة على `2024-01-28` (`:161`) | جدول مقابلات مرشحين مخترع |
| `src/app/recruitment/offers/page.tsx:40` | `jobOffers: JobOffer[]` — رواتب معروضة | ثابتة؛ «إرسال/تعديل العرض» بلا حدث | عروض عمل برواتب (18000/25000 ر.س) وأسماء وهمية |
| `src/app/recruitment/add/page.tsx` | معالج إعلان وظيفي 4 خطوات | حالة محلية فقط؛ «نشر الإعلان» (`:725`) بلا onClick | إعلان وظيفي يُدخَل ويُفقَد بلا حفظ |
| `src/app/recruitment/[id]/page.tsx:27,70` | `jobDetails` + `applicants` | كائنان ثابتان؛ يتجاهلان `params.id` | تفاصيل وظيفة + قائمة متقدمين (45 متقدم، 320 مشاهدة) مخترعة |
| `src/app/reports/custom/page.tsx:34` | `savedReports` + `reportModules` + `employeeFields` | ثابتة؛ «تشغيل/حفظ/تصدير Excel/PDF» (`:271`) كلها بلا حدث | «التقارير المحفوظة» وهمية؛ منشئ تقارير لا يُنتج شيئاً |
| `src/app/employees/[id]/terminate/page.tsx:29,65,145` | `employeeData` (راتب/رصيد/سلف ثابت) + `custodyItems` + `handleSubmit` | يحسب **مكافأة نهاية الخدمة وبدل الإجازات والصافي** من `basicSalary:12000, leaveBalance:18, loanBalance:5000` الثابتة بصرف النظر عن `params.id`؛ التأكيد = `alert()` فقط | **خطير للأجور**: حاسبة تصفية نهاية خدمة تعمل على أرقام مالية وهمية لكل موظف، وزر «تأكيد إنهاء الخدمة» لا ينفّذ شيئاً بالباك إند |

### (ب) مكوّنات لوحة التحكم الوهمية (مركّبة في `src/app/page.tsx`)

| Location (file:line) | What it is | Why it's demo/mock | Impact if mistaken for real |
|---|---|---|---|
| `src/components/dashboard/EmployeeHome.tsx:22,66,84,121,134` | لوحة الموظف كاملة: `actionItems`, `announcements`, `myRequests`, `balances` + ترحيب وبصمة | كل شيء ثابت؛ «صباح الخير أحمد»، بصمة «09:52»، أرصدة «21/8»، طلبات «REQ-1042» | الموظف يرى مهامّه/أرصدته/طلباته/إعلانات الشركة مخترعة بالكامل |
| `src/components/dashboard/AttendanceChart.tsx:13` | `weekData` — حضور أسبوعي | ثابت؛ تعليق `TODO` صريح (`:3`) بعدم توفّر endpoint | رسم حضور الأسبوع (220 حاضر...) وهمي |
| `src/components/dashboard/DepartmentStats.tsx:13` | `departments` — حضور حسب القسم | ثابت؛ `TODO` صريح (`:3`) | جدول «إحصائيات الأقسام» (نسب حضور) وهمي |
| `src/components/dashboard/RecentActivities.tsx:22` | `activities` — آخر النشاطات | ثابت؛ لا fetch؛ «عرض الكل» بلا حدث | تعيينات/طلبات/تنبيهات وثائق مخترعة تظهر كنشاط حيّ |
| `src/components/dashboard/UpcomingEvents.tsx:13` | `events` — أحداث قادمة | ثابت؛ لا fetch | أعياد ميلاد/انتهاء عقود/إقامات (بأسماء وتواريخ) وهمية |

> ملاحظة: باقي مكوّنات اللوحة حقيقية (`StatsCards` عبر `fetchDashboardStats`، `PendingApprovals` عبر `fetchInbox`). `QuickActions` روابط تنقّل فقط.

### (ج) شاشات هجينة (باك إند حقيقي + قسم مزروع بداخلها)

| Location (file:line) | What it is | Why it's demo/mock | Impact if mistaken for real |
|---|---|---|---|
| `src/app/settings/work-days/page.tsx:239` ثم `:307` | `initialSchedules` تُستخدم كـ `useState(initialSchedules)` لبطاقات جداول العمل | القائمة الأساسية للجداول (بـ `employeeCount:45` وقواعد) حالة محلية ثابتة لا يستبدلها fetch (بينما الـ OT والقواعد والفروع تُجلب حقيقةً) | إنشاء/تعديل جداول العمل هنا لا يُحفظ؛ الأعداد والجداول المعروضة مخترعة |
| `src/app/settings/work-days/page.tsx:2085,2096` | `sampleEmployees` (8 موظفين) + `departments` | تُعرض في `AssignScheduleModal` («سيتم تعيينه لـ 8 موظف» `:2295`) | تعيين جدول «لموظفي الشركة» على قائمة موظفين وهمية |
| `src/app/settings/document-templates/page.tsx:164` ثم `:282` | `builtInTemplates` تُعرض عبر `filteredTemplates.map` كنماذج قابلة للتعديل/المعاينة | قالب ثابت؛ التعديل/المعاينة حالة محلية فقط (تُجلب فقط إحصاءات المستندات الحقيقية `docTypesInUse`) | «مكتبة القوالب» تبدو حقيقية لكن إنشاء/تعديل القالب لا يُحفظ |
| `src/app/settings/page.tsx:656` | ودجت «المستخدمون النشطون» (أحمد محمد/سارة أحمد/محمد خالد + «منذ 5 دقائق») | مصفوفة inline ثابتة داخل JSX | يوهم بنشاط مستخدمين حيّ بأسماء وأوقات مخترعة |
| `src/app/employees/[id]/page.tsx:349` | `documentTemplates` — قائمة قوالب الخطابات في تبويب المستندات | مصفوفة ثابتة (عقد عمل، خطاب راتب...) وليست من الباك إند (رغم أن بيانات الموظف نفسها حقيقية) | قوالب مستندات معروضة كإجراءات متاحة قد لا تكون مُفعّلة فعلياً |

### (د) ملفات mock ميتة (معرّفة كـ Mock وغير مستوردة في أي مكان)

| Location (file:line) | What it is | Why it's demo/mock | Impact if mistaken for real |
|---|---|---|---|
| `src/data/employees.ts:13` | `employees: EmployeeOption[]` (EMP001–EMP010) | التعليق يصرّح «Mock موحّد»؛ `grep` أثبت عدم استيراده في أي شاشة | خطر منخفض (ميت)، لكنه سطح جاهز لتسرّب أسماء/أقسام وهمية لو أُعيد ربطه |
| `src/data/branches.ts:11` | `branches: BranchOption[]` (4 فروع) | «Mock موحّد»؛ غير مستورد | كذلك — فروع ومراكز تكلفة وهمية |
| `src/data/organization.ts:23,33,42` | `departments` + `teams` + `approvalWorkflows` | «Mock موحّد»؛ غير مستورد | كذلك — أقسام/فرق/مسارات اعتماد وهمية |

### (هـ) بذور تجريبية في الباك إند

| Location (file:line) | What it is | Why it's demo/mock | Impact if mistaken for real |
|---|---|---|---|
| `api/src/seed/seed.ts:268-283` | إنشاء `EMP002` باسم **«موظف تجريبي»** و`basicSalary: 8000` | سكريبت بذر (`npm run seed`) يُدخِل موظفاً تجريبياً في قاعدة البيانات الفعلية | لو شُغّل على بيئة الإنتاج يُحقن موظف تجريبي براتب يدخل في المسير |
| `api/src/seed/seed.ts:462-468` | اشتقاق موظفين من حسابات المستخدمين بـ `basicSalary: 7000` وتاريخ تعيين افتراضي | قيم راتب/تعيين مزروعة ثابتة | رواتب افتراضية (7000) قد تُحسب في المسير كأنها بيانات مُدخَلة حقيقية |

### placeholders صادقة (ليست خطراً — للتوثيق فقط)

هذه الشاشات لا تُلفّق بيانات، بل تعلن صراحةً أنها فارغة: `src/app/payroll/gosi/page.tsx`، `src/app/payroll/formulas/page.tsx`، `src/app/payroll/allowances/page.tsx` — جميعها تعرض «هذه الوحدة تُفعَّل في مرحلة لاحقة — لا توجد بيانات حقيقية بعد»، ونِسب GOSI فيها مُعنونة «(مرجع)». كذلك قسم «قيم الاستحقاق العامة» في `src/components/EmployeeForm.tsx:1199` أصبح **يقرأ من `policyCfg` الحقيقي** (لم يعد ثابتاً)، فالبقعة التجميلية القديمة في حقول الإجازة عولجت. تبقّى في `EmployeeForm` حقولٌ غير مربوطة بالحالة (مكان الميلاد، الجواز، الدرجة الوظيفية، نوع التوظيف، العملة/دورة الراتب) تُجمَع قيمها ثم تُهمَل عند الإرسال — وهي مشكلة «حقل غير موصول» لا «بيانات وهمية».
