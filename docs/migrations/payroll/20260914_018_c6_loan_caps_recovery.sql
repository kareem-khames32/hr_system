-- 20260914_018_c6 (خطة المراجعة الخطوة 29 — مسار السلف C6)
-- (1) سياسات سقوف السلف المؤرخة بالنسخ (AD-01..06): جدول loan_cap_policies.
-- (2) لقطة السقف وقرار الاستثناء والمبلغ المطلوب/المعتمد وشهر أول قسط على السلفة (AD-07/09): أعمدة NULL على loans؛
--     السلف القائمة تبقى NULL = سلفة عادية بلا لقطة، ولا تُعبأ بأثر رجعي.
-- (3) السداد المبكر الكلي والجزئي بمبلغ ومرجع (AD-14): جدول loan_repayments.
-- (4) رصيد السلف غير المغطى بعد التصفية PENDING_RECOVERY (AD-13): جدولا loan_recovery_balances وloan_recovery_events.
-- (5) مفتاحا إعداد السلف (يُضافان فقط لو غابا) وصلاحيات السلف لدور مدير الموارد البشرية (بلا loans.write_off: صلاحية مستقلة).
-- إضافي فقط: لا حذف ولا تعديل لقيمة قائمة. لا تُبذر سياسة سقوف: السقف قرار المالك من شاشة السلف (PAYROLL_DECISIONS_2026-09-14.md — قرارات C6).
-- أسماء PK/DF/CK/UX/IDX/FK مطابقة للكيانات حرفيًا حتى يبقى فرق TypeORM = 0. قابل لإعادة التشغيل بحراسات الوجود.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.loan_cap_policies', N'U') IS NULL
CREATE TABLE dbo.[loan_cap_policies] (
  [id] INT NOT NULL IDENTITY(1,1),
  [policyKey] NVARCHAR(40) NOT NULL,
  [version] INT NOT NULL,
  [name] NVARCHAR(150) NOT NULL,
  [scopeType] NVARCHAR(20) NOT NULL,
  [scopeIds] NVARCHAR(MAX) NULL,
  [salaryBase] NVARCHAR(20) NULL,
  [percentOfSalary] DECIMAL(9,4) NULL,
  [flatCapAmount] DECIMAL(18,2) NULL,
  [maxRequestsPerMonth] INT NULL,
  [maxAmountPerMonth] DECIMAL(18,2) NULL,
  [maxOutstandingBalance] DECIMAL(18,2) NULL,
  [maxInstallmentMonths] INT NULL,
  [monthDefinition] NVARCHAR(20) NOT NULL,
  [effectiveFrom] DATE NOT NULL,
  [effectiveTo] DATE NULL,
  [priority] INT NOT NULL,
  [isActive] BIT NOT NULL,
  [supersedesId] INT NULL,
  [reason] NVARCHAR(500) NULL,
  [createdByUserId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_225ea36c113927ae2c989343803] DEFAULT SYSUTCDATETIME(),
  [deactivatedAt] DATETIME2 NULL,
  [deactivatedByUserId] INT NULL,
  [deactivationReason] NVARCHAR(500) NULL,
  CONSTRAINT [CK_loan_cap_policies_window] CHECK ([effectiveTo] IS NULL OR [effectiveTo] >= [effectiveFrom]),
  CONSTRAINT [CK_loan_cap_policies_values] CHECK (([percentOfSalary] IS NULL OR ([percentOfSalary] > 0 AND [percentOfSalary] <= 1000 AND [salaryBase] IS NOT NULL)) AND ([flatCapAmount] IS NULL OR [flatCapAmount] > 0) AND ([maxRequestsPerMonth] IS NULL OR [maxRequestsPerMonth] >= 1) AND ([maxAmountPerMonth] IS NULL OR [maxAmountPerMonth] > 0) AND ([maxOutstandingBalance] IS NULL OR [maxOutstandingBalance] >= 0) AND ([maxInstallmentMonths] IS NULL OR ([maxInstallmentMonths] >= 1 AND [maxInstallmentMonths] <= 1000))),
  CONSTRAINT [CK_loan_cap_policies_month] CHECK ([monthDefinition] IN ('PAYROLL_PERIOD','CALENDAR')),
  CONSTRAINT [CK_loan_cap_policies_base] CHECK ([salaryBase] IS NULL OR [salaryBase] IN ('BASIC','GROSS')),
  CONSTRAINT [CK_loan_cap_policies_scope] CHECK ([scopeType] IN ('COMPANY','BRANCH','DEPARTMENT','TEAM','EMPLOYEES')),
  CONSTRAINT [PK_loan_cap_policies] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_loan_cap_policies_key_version' AND [object_id] = OBJECT_ID(N'dbo.loan_cap_policies'))
  CREATE UNIQUE INDEX [UX_loan_cap_policies_key_version] ON dbo.[loan_cap_policies] ([policyKey], [version]);
GO

IF OBJECT_ID(N'dbo.loan_repayments', N'U') IS NULL
CREATE TABLE dbo.[loan_repayments] (
  [id] INT NOT NULL IDENTITY(1,1),
  [loanId] INT NOT NULL,
  [employeeId] INT NOT NULL,
  [amount] DECIMAL(18,2) NOT NULL,
  [method] NVARCHAR(20) NOT NULL,
  [mode] NVARCHAR(20) NOT NULL,
  [reference] NVARCHAR(100) NOT NULL,
  [reason] NVARCHAR(500) NULL,
  [requestId] INT NULL,
  [actorId] INT NULL,
  [balanceBefore] DECIMAL(18,2) NOT NULL,
  [balanceAfter] DECIMAL(18,2) NOT NULL,
  [eventId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_61bb164ccfb7fe36ee72e95426f] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [CK_loan_repayments_mode] CHECK ([mode] IN ('FULL','SHORTEN_TERM','REDUCE_INSTALLMENT')),
  CONSTRAINT [CK_loan_repayments_method] CHECK ([method] IN ('CASH','BANK_TRANSFER','OTHER')),
  CONSTRAINT [CK_loan_repayments_amounts] CHECK ([amount] > 0 AND [balanceBefore] >= [amount] AND [balanceAfter] = [balanceBefore] - [amount]),
  CONSTRAINT [PK_loan_repayments] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IDX_loan_repayments_employee' AND [object_id] = OBJECT_ID(N'dbo.loan_repayments'))
  CREATE INDEX [IDX_loan_repayments_employee] ON dbo.[loan_repayments] ([employeeId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_loan_repayments_reference' AND [object_id] = OBJECT_ID(N'dbo.loan_repayments'))
  CREATE UNIQUE INDEX [UX_loan_repayments_reference] ON dbo.[loan_repayments] ([loanId], [reference]);
GO

IF OBJECT_ID(N'dbo.loan_recovery_balances', N'U') IS NULL
CREATE TABLE dbo.[loan_recovery_balances] (
  [id] INT NOT NULL IDENTITY(1,1),
  [employeeId] INT NOT NULL,
  [caseId] INT NOT NULL,
  [loanBalance] DECIMAL(18,2) NOT NULL,
  [coveredAmount] DECIMAL(18,2) NOT NULL,
  [amount] DECIMAL(18,2) NOT NULL,
  [recoveredAmount] DECIMAL(18,2) NOT NULL,
  [writtenOffAmount] DECIMAL(18,2) NOT NULL,
  [status] NVARCHAR(20) NOT NULL,
  [sourceSnapshot] NVARCHAR(MAX) NOT NULL,
  [createdByUserId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_d3e1ea03015a1fd40c1a0cf9fbb] DEFAULT SYSUTCDATETIME(),
  [resolvedAt] DATETIME2 NULL,
  [resolvedByUserId] INT NULL,
  CONSTRAINT [CK_loan_recovery_balances_amounts] CHECK ([amount] > 0 AND [recoveredAmount] >= 0 AND [writtenOffAmount] >= 0 AND [recoveredAmount] + [writtenOffAmount] <= [amount] AND [coveredAmount] >= 0 AND [coveredAmount] + [amount] = [loanBalance]),
  CONSTRAINT [CK_loan_recovery_balances_status] CHECK ([status] IN ('PENDING_RECOVERY','RECOVERED','WRITTEN_OFF','CANCELLED')),
  CONSTRAINT [PK_loan_recovery_balances] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IDX_loan_recovery_balances_employee' AND [object_id] = OBJECT_ID(N'dbo.loan_recovery_balances'))
  CREATE INDEX [IDX_loan_recovery_balances_employee] ON dbo.[loan_recovery_balances] ([employeeId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_loan_recovery_balances_case' AND [object_id] = OBJECT_ID(N'dbo.loan_recovery_balances'))
  CREATE UNIQUE INDEX [UX_loan_recovery_balances_case] ON dbo.[loan_recovery_balances] ([caseId]);
GO

IF OBJECT_ID(N'dbo.loan_recovery_events', N'U') IS NULL
CREATE TABLE dbo.[loan_recovery_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [recoveryId] INT NOT NULL,
  [action] NVARCHAR(20) NOT NULL,
  [amount] DECIMAL(18,2) NULL,
  [balanceAfter] DECIMAL(18,2) NOT NULL,
  [reference] NVARCHAR(100) NULL,
  [reason] NVARCHAR(500) NULL,
  [actorId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_cf44004a294b8884182c7b02a78] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [CK_loan_recovery_events_action] CHECK ([action] IN ('CREATED','COLLECTED','WRITTEN_OFF','CANCELLED')),
  CONSTRAINT [PK_loan_recovery_events] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_loan_recovery_events_reference' AND [object_id] = OBJECT_ID(N'dbo.loan_recovery_events'))
  CREATE UNIQUE INDEX [UX_loan_recovery_events_reference] ON dbo.[loan_recovery_events] ([recoveryId], [reference]) WHERE [reference] IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IDX_loan_recovery_events_recovery' AND [object_id] = OBJECT_ID(N'dbo.loan_recovery_events'))
  CREATE INDEX [IDX_loan_recovery_events_recovery] ON dbo.[loan_recovery_events] ([recoveryId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_loan_recovery_event_balance')
  ALTER TABLE dbo.[loan_recovery_events] ADD CONSTRAINT [FK_loan_recovery_event_balance] FOREIGN KEY ([recoveryId]) REFERENCES dbo.[loan_recovery_balances] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

IF COL_LENGTH(N'dbo.loans', N'requestedAmount') IS NULL ALTER TABLE dbo.[loans] ADD [requestedAmount] DECIMAL(18,2) NULL;
IF COL_LENGTH(N'dbo.loans', N'isExceptional') IS NULL ALTER TABLE dbo.[loans] ADD [isExceptional] BIT NULL;
IF COL_LENGTH(N'dbo.loans', N'exceptionalCategory') IS NULL ALTER TABLE dbo.[loans] ADD [exceptionalCategory] NVARCHAR(30) NULL;
IF COL_LENGTH(N'dbo.loans', N'exceptionalReason') IS NULL ALTER TABLE dbo.[loans] ADD [exceptionalReason] NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.loans', N'firstInstallmentPeriod') IS NULL ALTER TABLE dbo.[loans] ADD [firstInstallmentPeriod] NVARCHAR(7) NULL;
IF COL_LENGTH(N'dbo.loans', N'installmentMonths') IS NULL ALTER TABLE dbo.[loans] ADD [installmentMonths] INT NULL;
IF COL_LENGTH(N'dbo.loans', N'capSnapshot') IS NULL ALTER TABLE dbo.[loans] ADD [capSnapshot] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.loans', N'createdByUserId') IS NULL ALTER TABLE dbo.[loans] ADD [createdByUserId] INT NULL;
GO

-- (5-أ) مفتاحا الإعداد: الحد الأدنى لسبب السلفة الاستثنائية واستثناء السقف، وأبعد شهر لأول قسط تختاره الموارد البشرية.
INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value]
FROM (VALUES
  (N'loan.exceptional_reason_min_length', N'10'),
  (N'loan.first_installment_max_months_ahead', N'12')
) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

-- (5-ب) صلاحيات السلف لمدير الموارد البشرية: إلحاق الناقص فقط بآخر المصفوفة، ولا يُلمس دور معطل أو يحمل '*'.
-- الصلاحيات داخل الـJWT؛ يُرفع tokenVersion لمستخدمي الدور فقط لو تغيّر فعلًا (نفس سلوك شاشة الأدوار وترحيل 016_c1).
DECLARE @changed INT = 0;
UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', N'loans.policies')
FROM dbo.roles r WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'loans.policies', N'*'));
SET @changed += @@ROWCOUNT;
UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', N'loans.exceptional')
FROM dbo.roles r WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'loans.exceptional', N'*'));
SET @changed += @@ROWCOUNT;
UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', N'loans.cap_override')
FROM dbo.roles r WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'loans.cap_override', N'*'));
SET @changed += @@ROWCOUNT;
UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', N'loans.repay')
FROM dbo.roles r WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (N'loans.repay', N'*'));
SET @changed += @@ROWCOUNT;
IF @changed > 0
  UPDATE dbo.users SET tokenVersion = ISNULL(tokenVersion, 0) + 1 WHERE [role] = N'hr_manager';
GO

-- تحقق بعد التطبيق.
IF OBJECT_ID(N'dbo.loan_cap_policies', N'U') IS NULL OR OBJECT_ID(N'dbo.loan_repayments', N'U') IS NULL
   OR OBJECT_ID(N'dbo.loan_recovery_balances', N'U') IS NULL OR OBJECT_ID(N'dbo.loan_recovery_events', N'U') IS NULL
   OR COL_LENGTH(N'dbo.loans', N'capSnapshot') IS NULL OR COL_LENGTH(N'dbo.loans', N'firstInstallmentPeriod') IS NULL
   OR (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] IN (N'loan.exceptional_reason_min_length', N'loan.first_installment_max_months_ahead')) <> 2
  THROW 52901, N'20260914_018_c6: جداول أو أعمدة أو مفاتيح السلف غير مكتملة بعد الترحيل', 1;
IF EXISTS (
  SELECT 1 FROM dbo.roles r
  CROSS JOIN (VALUES (N'loans.policies'), (N'loans.exceptional'), (N'loans.cap_override'), (N'loans.repay')) AS p([permission])
  WHERE r.code = N'hr_manager' AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
    AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (p.[permission], N'*')))
  THROW 52902, N'20260914_018_c6: دور hr_manager لا يحمل صلاحيات السلف بعد الترحيل', 1;
