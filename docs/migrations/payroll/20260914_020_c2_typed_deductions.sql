-- 20260914_020 (مسار C2، خطة المراجعة الخطوة 25): الخصومات المصنفة DD-01..DD-12.
-- إضافي فقط: أربعة جداول جديدة (الكتالوج، الطلبات، أحداثها، الدفعات الجماعية) وستة أعمدة nullable في دفتر المديونيات
-- (مصدر الخصم المصنف، الشهر المستهدف، حجز المسير المعتمد، المبلغ المحصل، أصل القيد المرحّل) وفهرسان.
-- البيانات: بذرة أنواع الخصم الأربعة (جودة، التزام، إداري، إنتاجية) قابلة للتعديل، ومفاتيح الإعداد، وإضافة صلاحيات
-- deductions.* لدوري hr_manager وbranch_manager القائمين (إلحاق بالقائمة دون حذف). لا تغيير لأي قيد قائم في الدفتر.
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.deduction_types', N'U') IS NULL
CREATE TABLE dbo.[deduction_types] (
  [id] INT NOT NULL IDENTITY(1,1),
  [code] NVARCHAR(40) NOT NULL,
  [nameAr] NVARCHAR(120) NOT NULL,
  [nameEn] NVARCHAR(120) NULL,
  [category] NVARCHAR(20) NOT NULL,
  [calcMethod] NVARCHAR(20) NOT NULL,
  [defaultValue] DECIMAL(18,4) NULL,
  [valueStep] DECIMAL(9,4) NULL,
  [minAmount] DECIMAL(18,2) NULL,
  [maxAmount] DECIMAL(18,2) NULL,
  [maxPctOfGross] DECIMAL(9,4) NULL,
  [isExemptable] BIT NOT NULL,
  [installmentAllowed] BIT NOT NULL,
  [maxInstallments] INT NOT NULL,
  [requiresAttachment] BIT NOT NULL,
  [creatorScopes] NVARCHAR(200) NOT NULL,
  [approvalSteps] NVARCHAR(200) NOT NULL,
  [escalationDays] DECIMAL(9,4) NULL,
  [escalationStep] NVARCHAR(30) NULL,
  [maxIncidentAgeDays] INT NOT NULL,
  [carryForwardPriority] INT NOT NULL,
  [version] INT NOT NULL,
  [isActive] BIT NOT NULL,
  [updatedByUserId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_d4e1b68321823f531c21788adc2] DEFAULT SYSUTCDATETIME(),
  [updatedAt] DATETIME2 NULL,
  CONSTRAINT [PK_deduction_types] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_deduction_types_code' AND object_id = OBJECT_ID(N'dbo.deduction_types'))
CREATE UNIQUE INDEX [UX_deduction_types_code] ON dbo.[deduction_types] ([code]);
GO

IF OBJECT_ID(N'dbo.deduction_requests', N'U') IS NULL
CREATE TABLE dbo.[deduction_requests] (
  [id] INT NOT NULL IDENTITY(1,1),
  [batchId] INT NULL,
  [employeeId] INT NOT NULL,
  [deductionTypeId] INT NOT NULL,
  [typeVersion] INT NOT NULL,
  [typeSnapshot] NVARCHAR(MAX) NOT NULL,
  [calcMethod] NVARCHAR(20) NOT NULL,
  [inputValue] DECIMAL(18,4) NOT NULL,
  [estimatedAmount] DECIMAL(18,2) NOT NULL,
  [finalAmount] DECIMAL(18,2) NULL,
  [amountTrace] NVARCHAR(MAX) NOT NULL,
  [incidentDate] DATE NOT NULL,
  [reason] NVARCHAR(1000) NOT NULL,
  [attachmentRef] NVARCHAR(300) NULL,
  [targetPeriod] NVARCHAR(7) NOT NULL,
  [installments] INT NOT NULL,
  [status] NVARCHAR(20) NOT NULL,
  [creatorUserId] INT NOT NULL,
  [creatorEmployeeId] INT NULL,
  [scopeBasis] NVARCHAR(30) NOT NULL,
  [scopeSnapshot] NVARCHAR(MAX) NOT NULL,
  [steps] NVARCHAR(MAX) NOT NULL,
  [escalated] BIT NOT NULL,
  [outOfScope] BIT NOT NULL,
  [overrides] NVARCHAR(MAX) NULL,
  [obligationIds] NVARCHAR(MAX) NULL,
  [decisionReason] NVARCHAR(1000) NULL,
  [decidedByUserId] INT NULL,
  [decidedAt] DATETIME2 NULL,
  [revision] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_5b5dac1d435a2001fa56e99483f] DEFAULT SYSUTCDATETIME(),
  [updatedAt] DATETIME2 NULL,
  CONSTRAINT [PK_deduction_requests] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deduction_requests_batch' AND object_id = OBJECT_ID(N'dbo.deduction_requests'))
CREATE INDEX [IX_deduction_requests_batch] ON dbo.[deduction_requests] ([batchId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deduction_requests_status' AND object_id = OBJECT_ID(N'dbo.deduction_requests'))
CREATE INDEX [IX_deduction_requests_status] ON dbo.[deduction_requests] ([status]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deduction_requests_employee' AND object_id = OBJECT_ID(N'dbo.deduction_requests'))
CREATE INDEX [IX_deduction_requests_employee] ON dbo.[deduction_requests] ([employeeId]);
GO

IF OBJECT_ID(N'dbo.deduction_request_events', N'U') IS NULL
CREATE TABLE dbo.[deduction_request_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [requestId] INT NOT NULL,
  [eventType] NVARCHAR(40) NOT NULL,
  [actorUserId] INT NULL,
  [fromStatus] NVARCHAR(20) NULL,
  [toStatus] NVARCHAR(20) NULL,
  [stepOrder] INT NULL,
  [reason] NVARCHAR(1000) NULL,
  [payload] NVARCHAR(MAX) NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_7c3343ac026a4fc8ddb01f8e80f] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_deduction_request_events] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_deduction_request_events_request' AND object_id = OBJECT_ID(N'dbo.deduction_request_events'))
CREATE INDEX [IX_deduction_request_events_request] ON dbo.[deduction_request_events] ([requestId]);
GO

IF OBJECT_ID(N'dbo.deduction_batches', N'U') IS NULL
CREATE TABLE dbo.[deduction_batches] (
  [id] INT NOT NULL IDENTITY(1,1),
  [deductionTypeId] INT NOT NULL,
  [selectionMode] NVARCHAR(20) NOT NULL,
  [selection] NVARCHAR(MAX) NOT NULL,
  [targetPeriod] NVARCHAR(7) NOT NULL,
  [previewHash] NVARCHAR(64) NOT NULL,
  [candidateCount] INT NOT NULL,
  [createdCount] INT NOT NULL,
  [skippedCount] INT NOT NULL,
  [result] NVARCHAR(MAX) NOT NULL,
  [createdByUserId] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_02b7eb7eaa1a2b7a67343b94069] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_deduction_batches] PRIMARY KEY ([id])
);
GO

-- دفتر المديونيات: أعمدة nullable فقط؛ الصفوف القائمة تبقى NULL (قيود غير مصنفة وغير محجوزة)
IF COL_LENGTH(N'dbo.employee_obligations', N'deductionRequestId') IS NULL ALTER TABLE dbo.employee_obligations ADD [deductionRequestId] INT NULL;
IF COL_LENGTH(N'dbo.employee_obligations', N'targetPeriod') IS NULL ALTER TABLE dbo.employee_obligations ADD [targetPeriod] NVARCHAR(7) NULL;
IF COL_LENGTH(N'dbo.employee_obligations', N'reservedPayrollRunId') IS NULL ALTER TABLE dbo.employee_obligations ADD [reservedPayrollRunId] INT NULL;
IF COL_LENGTH(N'dbo.employee_obligations', N'reservedAt') IS NULL ALTER TABLE dbo.employee_obligations ADD [reservedAt] DATETIME2 NULL;
IF COL_LENGTH(N'dbo.employee_obligations', N'appliedAmount') IS NULL ALTER TABLE dbo.employee_obligations ADD [appliedAmount] DECIMAL(18,2) NULL;
IF COL_LENGTH(N'dbo.employee_obligations', N'carriedFromObligationId') IS NULL ALTER TABLE dbo.employee_obligations ADD [carriedFromObligationId] INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_deduction_request' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
CREATE INDEX [IX_employee_obligations_deduction_request] ON dbo.[employee_obligations] ([deductionRequestId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_reserved_run' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
CREATE INDEX [IX_employee_obligations_reserved_run] ON dbo.[employee_obligations] ([reservedPayrollRunId]);
GO

-- DD-01 قاعدة 1: الأنواع الأربعة كبذرة قابلة للتعديل. الافتراضات: الحد الأدنى 1.00، سقف 25% من إجمالي الراتب للخصم الواحد،
-- تصعيد فوق يوم راتب واحد بخطوة مدير القسم، عمر الواقعة 90 يومًا، والسلسلة تنتهي بالموارد البشرية.
INSERT INTO dbo.deduction_types ([code],[nameAr],[nameEn],[category],[calcMethod],[defaultValue],[valueStep],[minAmount],[maxAmount],[maxPctOfGross],
  [isExemptable],[installmentAllowed],[maxInstallments],[requiresAttachment],[creatorScopes],[approvalSteps],[escalationDays],[escalationStep],
  [maxIncidentAgeDays],[carryForwardPriority],[version],[isActive],[updatedByUserId],[updatedAt])
SELECT s.[code], s.[nameAr], s.[nameEn], s.[category], s.[calcMethod], s.[defaultValue], s.[valueStep], 1.00, NULL, 25.0000,
  1, s.[installmentAllowed], s.[maxInstallments], 0, N'DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,HR', N'HR', 1.0000, N'DEPARTMENT_MANAGER',
  90, s.[carryForwardPriority], 1, 1, NULL, NULL
FROM (VALUES
  (N'QUALITY', N'خصم جودة', N'Quality deduction', N'PERFORMANCE', N'DAYS_OF_SALARY', CAST(0.5 AS decimal(18,4)), CAST(0.25 AS decimal(9,4)), CAST(0 AS bit), 1, 3),
  (N'COMMITMENT', N'خصم التزام', N'Commitment deduction', N'DISCIPLINARY', N'DAYS_OF_SALARY', CAST(1 AS decimal(18,4)), CAST(0.25 AS decimal(9,4)), CAST(0 AS bit), 1, 3),
  (N'ADMINISTRATIVE', N'خصم إداري', N'Administrative deduction', N'ADMINISTRATIVE', N'FIXED_AMOUNT', CAST(NULL AS decimal(18,4)), CAST(NULL AS decimal(9,4)), CAST(1 AS bit), 6, 2),
  (N'PRODUCTIVITY', N'خصم إنتاجية', N'Productivity deduction', N'PERFORMANCE', N'PERCENT_OF_BASE', CAST(5 AS decimal(18,4)), CAST(NULL AS decimal(9,4)), CAST(0 AS bit), 1, 3)
) AS s([code],[nameAr],[nameEn],[category],[calcMethod],[defaultValue],[valueStep],[installmentAllowed],[maxInstallments],[carryForwardPriority])
WHERE NOT EXISTS (SELECT 1 FROM dbo.deduction_types t WHERE t.[code] = s.[code]);
GO

-- مفاتيح الإعداد (الإقلاع يضيف الناقص بنفس القيم؛ هنا لتثبيتها في الترحيل)
INSERT INTO dbo.requests_config ([key], [value])
SELECT s.[key], s.[value] FROM (VALUES
  (N'deductions.reason_min_length', N'20'),
  (N'deductions.duplicate_window_hours', N'24'),
  (N'deductions.manager_creation_enabled', N'true'),
  (N'deductions.bulk_max_employees', N'500')
) AS s([key],[value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = s.[key]);
GO

-- صلاحيات الدورين القائمين: إلحاق كل صلاحية ناقصة بآخر مصفوفة JSON (لا حذف ولا إعادة ترتيب)
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"deductions.view"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"deductions.view"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"deductions.approve"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"deductions.approve"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"deductions.manage"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"deductions.manage"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"deductions.view"]')
WHERE code = N'branch_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"deductions.view"%';
