-- 20260914_026 (مسار C4، خطة المراجعة الخطوة 27): المكافأة الفردية ثم الجماعية (EX-05).
-- إضافي فقط: أربعة جداول جديدة (كتالوج المكافآت، الطلبات، أحداثها، الدفعات الجماعية) وعمود nullable واحد في دفتر المديونيات
-- (employee_obligations.bonusRequestId) مع فهرسه.
-- البيانات: بذرة أنواع المكافأة الثلاثة (أداء، فورية، مشروع) قابلة للتعديل، ومفاتيح bonuses.*، وإلحاق صلاحيات bonuses.view/approve/manage
-- بدور hr_manager وbonuses.view بدور branch_manager (بلا حذف ولا إعادة ترتيب). bonuses.exceed_cap لا تُمنح لأي دور افتراضيًا.
-- تصحيح قيمة (قرار الخطوة 27): قيد المكافأة القديم من محرك الطلبات بلا فترة (CREDIT/bonus، PENDING، targetPeriod وeffectiveDate فارغان)
-- كان يدخل أي مسودة سابقة؛ يُسند لشهر مسير تاريخ اكتمال طلبه وبداية دورته. لا حذف لأي صف.
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.bonus_types', N'U') IS NULL
CREATE TABLE dbo.[bonus_types] (
  [id] INT NOT NULL IDENTITY(1,1),
  [code] NVARCHAR(40) NOT NULL,
  [nameAr] NVARCHAR(120) NOT NULL,
  [nameEn] NVARCHAR(120) NULL,
  [calcMethod] NVARCHAR(20) NOT NULL,
  [defaultValue] DECIMAL(18,4) NULL,
  [valueStep] DECIMAL(9,4) NULL,
  [minAmount] DECIMAL(18,2) NULL,
  [maxAmount] DECIMAL(18,2) NULL,
  [maxPctOfBase] DECIMAL(9,4) NULL,
  [isTaxable] BIT NOT NULL,
  [isInsurable] BIT NOT NULL,
  [creatorScopes] NVARCHAR(200) NOT NULL,
  [approvalSteps] NVARCHAR(200) NOT NULL,
  [escalationDays] DECIMAL(9,4) NULL,
  [escalationStep] NVARCHAR(30) NULL,
  [version] INT NOT NULL,
  [isActive] BIT NOT NULL,
  [updatedByUserId] INT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_6cf6b0756137fccb64a192eadc1] DEFAULT SYSUTCDATETIME(),
  [updatedAt] DATETIME2 NULL,
  CONSTRAINT [PK_bonus_types] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_bonus_types_code' AND object_id = OBJECT_ID(N'dbo.bonus_types'))
CREATE UNIQUE INDEX [UX_bonus_types_code] ON dbo.[bonus_types] ([code]);
GO

IF OBJECT_ID(N'dbo.bonus_requests', N'U') IS NULL
CREATE TABLE dbo.[bonus_requests] (
  [id] INT NOT NULL IDENTITY(1,1),
  [batchId] INT NULL,
  [employeeId] INT NOT NULL,
  [bonusTypeId] INT NOT NULL,
  [typeVersion] INT NOT NULL,
  [typeSnapshot] NVARCHAR(MAX) NOT NULL,
  [calcMethod] NVARCHAR(20) NOT NULL,
  [inputValue] DECIMAL(18,4) NOT NULL,
  [estimatedAmount] DECIMAL(18,2) NOT NULL,
  [finalAmount] DECIMAL(18,2) NULL,
  [amountTrace] NVARCHAR(MAX) NOT NULL,
  [reason] NVARCHAR(1000) NOT NULL,
  [attachmentRef] NVARCHAR(300) NULL,
  [targetPeriod] NVARCHAR(7) NOT NULL,
  [status] NVARCHAR(20) NOT NULL,
  [creatorUserId] INT NOT NULL,
  [creatorEmployeeId] INT NULL,
  [scopeBasis] NVARCHAR(30) NOT NULL,
  [scopeSnapshot] NVARCHAR(MAX) NOT NULL,
  [steps] NVARCHAR(MAX) NOT NULL,
  [escalated] BIT NOT NULL,
  [capExceeded] BIT NOT NULL,
  [outOfScope] BIT NOT NULL,
  [overrides] NVARCHAR(MAX) NULL,
  [obligationId] INT NULL,
  [decisionReason] NVARCHAR(1000) NULL,
  [decidedByUserId] INT NULL,
  [decidedAt] DATETIME2 NULL,
  [revision] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_4951301c5d525494c3dcd967182] DEFAULT SYSUTCDATETIME(),
  [updatedAt] DATETIME2 NULL,
  CONSTRAINT [PK_bonus_requests] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_bonus_requests_batch' AND object_id = OBJECT_ID(N'dbo.bonus_requests'))
CREATE INDEX [IX_bonus_requests_batch] ON dbo.[bonus_requests] ([batchId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_bonus_requests_status' AND object_id = OBJECT_ID(N'dbo.bonus_requests'))
CREATE INDEX [IX_bonus_requests_status] ON dbo.[bonus_requests] ([status]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_bonus_requests_employee' AND object_id = OBJECT_ID(N'dbo.bonus_requests'))
CREATE INDEX [IX_bonus_requests_employee] ON dbo.[bonus_requests] ([employeeId]);
GO

IF OBJECT_ID(N'dbo.bonus_request_events', N'U') IS NULL
CREATE TABLE dbo.[bonus_request_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [requestId] INT NOT NULL,
  [eventType] NVARCHAR(40) NOT NULL,
  [actorUserId] INT NULL,
  [fromStatus] NVARCHAR(20) NULL,
  [toStatus] NVARCHAR(20) NULL,
  [stepOrder] INT NULL,
  [reason] NVARCHAR(1000) NULL,
  [payload] NVARCHAR(MAX) NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_9d109fb16e0dec98080fbbd093f] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_bonus_request_events] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_bonus_request_events_request' AND object_id = OBJECT_ID(N'dbo.bonus_request_events'))
CREATE INDEX [IX_bonus_request_events_request] ON dbo.[bonus_request_events] ([requestId]);
GO

IF OBJECT_ID(N'dbo.bonus_batches', N'U') IS NULL
CREATE TABLE dbo.[bonus_batches] (
  [id] INT NOT NULL IDENTITY(1,1),
  [bonusTypeId] INT NOT NULL,
  [selectionMode] NVARCHAR(20) NOT NULL,
  [selection] NVARCHAR(MAX) NOT NULL,
  [targetPeriod] NVARCHAR(7) NOT NULL,
  [previewHash] NVARCHAR(64) NOT NULL,
  [candidateCount] INT NOT NULL,
  [createdCount] INT NOT NULL,
  [skippedCount] INT NOT NULL,
  [result] NVARCHAR(MAX) NOT NULL,
  [createdByUserId] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_8790a328efc89b8d30c5477e935] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_bonus_batches] PRIMARY KEY ([id])
);
GO

-- دفتر المديونيات: عمود nullable؛ الصفوف القائمة تبقى NULL (ليست من موديول المكافآت)
IF COL_LENGTH(N'dbo.employee_obligations', N'bonusRequestId') IS NULL ALTER TABLE dbo.employee_obligations ADD [bonusRequestId] INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_bonus_request' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
CREATE INDEX [IX_employee_obligations_bonus_request] ON dbo.[employee_obligations] ([bonusRequestId]);
GO

-- EX-05: الأنواع الثلاثة كبذرة قابلة للتعديل. الافتراضات: الحد الأدنى 1.00، سقف 100% من الأساسي للمكافأة الواحدة،
-- تصعيد فوق يوم راتب واحد بخطوة مدير القسم، المُقترِح مدير هيكلي أو الموارد البشرية، والسلسلة تنتهي بالموارد البشرية.
INSERT INTO dbo.bonus_types ([code],[nameAr],[nameEn],[calcMethod],[defaultValue],[valueStep],[minAmount],[maxAmount],[maxPctOfBase],
  [isTaxable],[isInsurable],[creatorScopes],[approvalSteps],[escalationDays],[escalationStep],[version],[isActive],[updatedByUserId],[updatedAt])
SELECT s.[code], s.[nameAr], s.[nameEn], s.[calcMethod], s.[defaultValue], s.[valueStep], 1.00, NULL, 100.0000,
  1, 0, N'DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,BRANCH_MANAGER,HR', N'HR', 1.0000, N'DEPARTMENT_MANAGER', 1, 1, NULL, NULL
FROM (VALUES
  (N'PERFORMANCE', N'مكافأة أداء', N'Performance bonus', N'DAYS_OF_SALARY', CAST(1 AS decimal(18,4)), CAST(0.25 AS decimal(9,4))),
  (N'SPOT', N'مكافأة فورية', N'Spot bonus', N'FIXED_AMOUNT', CAST(NULL AS decimal(18,4)), CAST(NULL AS decimal(9,4))),
  (N'PROJECT', N'مكافأة مشروع', N'Project bonus', N'FIXED_AMOUNT', CAST(NULL AS decimal(18,4)), CAST(NULL AS decimal(9,4)))
) AS s([code],[nameAr],[nameEn],[calcMethod],[defaultValue],[valueStep])
WHERE NOT EXISTS (SELECT 1 FROM dbo.bonus_types t WHERE t.[code] = s.[code]);
GO

-- مفاتيح الإعداد (الإقلاع يضيف الناقص بنفس القيم؛ هنا لتثبيتها في الترحيل)
INSERT INTO dbo.requests_config ([key], [value])
SELECT s.[key], s.[value] FROM (VALUES
  (N'bonuses.reason_min_length', N'20'),
  (N'bonuses.duplicate_window_hours', N'24'),
  (N'bonuses.bulk_max_employees', N'500'),
  (N'bonuses.manager_creation_enabled', N'true'),
  (N'bonuses.missing_approver_fallback', N'NEXT_LEVEL')
) AS s([key],[value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = s.[key]);
GO

-- صلاحيات الدورين القائمين: إلحاق كل صلاحية ناقصة بآخر مصفوفة JSON (لا حذف ولا إعادة ترتيب)
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"bonuses.view"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"bonuses.view"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"bonuses.approve"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"bonuses.approve"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"bonuses.manage"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"bonuses.manage"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"bonuses.view"]')
WHERE code = N'branch_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"bonuses.view"%';
GO

-- قيد المكافأة القديم بلا فترة: شهر مسير تاريخ اكتمال طلب BONUS (بداية الدورة 23: 13 يوليو ← مسير يوليو من 23 يونيو).
-- مقيد بيوم دورة 1..28 حيث البداية = يوم الدورة من الشهر السابق بلا قص؛ غير ذلك لا يُغيَّر شيء.
DECLARE @cycle INT = TRY_CAST((SELECT TOP (1) [value] FROM dbo.requests_config WHERE [key] = N'payroll.cycle_start_day') AS INT);
IF @cycle IS NULL SET @cycle = 23;
IF @cycle BETWEEN 1 AND 28
BEGIN
  UPDATE o SET
    o.[targetPeriod] = FORMAT(p.[periodMonth], 'yyyy-MM'),
    o.[effectiveDate] = CASE WHEN @cycle = 1 THEN p.[periodMonth]
      ELSE DATEFROMPARTS(YEAR(DATEADD(month, -1, p.[periodMonth])), MONTH(DATEADD(month, -1, p.[periodMonth])), @cycle) END
  FROM dbo.employee_obligations o
  INNER JOIN dbo.requests r ON r.[id] = o.[sourceRequestId] AND r.[typeCode] = N'BONUS' AND r.[completedAt] IS NOT NULL
  CROSS APPLY (SELECT CASE WHEN @cycle > 1 AND DAY(r.[completedAt]) >= @cycle
      THEN DATEFROMPARTS(YEAR(DATEADD(month, 1, r.[completedAt])), MONTH(DATEADD(month, 1, r.[completedAt])), 1)
      ELSE DATEFROMPARTS(YEAR(r.[completedAt]), MONTH(r.[completedAt]), 1) END AS [periodMonth]) p
  WHERE o.[category] = N'bonus' AND o.[type] = N'CREDIT' AND o.[status] = N'PENDING'
    AND o.[targetPeriod] IS NULL AND o.[effectiveDate] IS NULL AND o.[bonusRequestId] IS NULL;
END
GO

IF OBJECT_ID(N'dbo.bonus_types', N'U') IS NULL OR OBJECT_ID(N'dbo.bonus_requests', N'U') IS NULL
  OR OBJECT_ID(N'dbo.bonus_request_events', N'U') IS NULL OR OBJECT_ID(N'dbo.bonus_batches', N'U') IS NULL
  THROW 55401, N'جداول المكافآت لم تُنشأ', 1;
IF COL_LENGTH(N'dbo.employee_obligations', N'bonusRequestId') IS NULL
  THROW 55402, N'عمود bonusRequestId لم يُضف لدفتر المديونيات', 1;
GO
