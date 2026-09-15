-- 20260915_031 (مسار C3، خطة المراجعة الخطوة 26): الإعفاء المالي في مسير — SRS EX-01..EX-08.
-- إضافي فقط: جدول الإعفاءات وسجل انتقالاتها بفهارسهما، وعمود nullable على دفتر المديونيات لمرجع قرار الإعفاء الذي أسقط القيد أو أجّله (وفهرسه).
-- البيانات: مفاتيح financial_exemptions.* (الإقلاع يضيف الناقص بنفس القيم؛ هنا لتثبيتها في الترحيل)، وإلحاق صلاحيات financial_exemption.*
-- بدوري hr_manager وbranch_manager القائمين (إلحاق بآخر القائمة دون حذف أو إعادة ترتيب). لا تغيير لأي صف قائم في الدفتر أو المسيرات أو الأقساط.
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.payroll_financial_exemptions', N'U') IS NULL
CREATE TABLE dbo.[payroll_financial_exemptions] (
  [id] INT NOT NULL IDENTITY(1,1),
  [runId] INT NOT NULL,
  [period] NVARCHAR(7) NOT NULL,
  [employeeId] INT NOT NULL,
  [scopeKind] NVARCHAR(20) NOT NULL,
  [targetKind] NVARCHAR(30) NULL,
  [deductionTypeId] INT NULL,
  [targetRef] NVARCHAR(40) NULL,
  [disposition] NVARCHAR(20) NOT NULL,
  [reason] NVARCHAR(1000) NOT NULL,
  [attachmentRef] NVARCHAR(300) NULL,
  [status] NVARCHAR(20) NOT NULL,
  [grantorBasis] NVARCHAR(30) NOT NULL,
  [grantedByUserId] INT NOT NULL,
  [grantedByEmployeeId] INT NULL,
  [estimatedAmount] DECIMAL(18,2) NOT NULL,
  [exemptedAmountSnapshot] DECIMAL(18,2) NULL,
  [appliedLines] NVARCHAR(MAX) NULL,
  [appliedSnapshotVersion] INT NULL,
  [evaluation] NVARCHAR(MAX) NULL,
  [overrides] NVARCHAR(MAX) NULL,
  [approvedByUserId] INT NULL,
  [approvedAt] DATETIME2 NULL,
  [decidedByUserId] INT NULL,
  [decidedAt] DATETIME2 NULL,
  [decisionReason] NVARCHAR(1000) NULL,
  [supersededById] INT NULL,
  [revision] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_b98020a19960b9c716acaaabbff] DEFAULT SYSUTCDATETIME(),
  [updatedAt] DATETIME2 NULL,
  CONSTRAINT [PK_payroll_financial_exemptions] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_financial_exemptions_status' AND object_id = OBJECT_ID(N'dbo.payroll_financial_exemptions'))
CREATE INDEX [IX_payroll_financial_exemptions_status] ON dbo.[payroll_financial_exemptions] ([status]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_financial_exemptions_employee' AND object_id = OBJECT_ID(N'dbo.payroll_financial_exemptions'))
CREATE INDEX [IX_payroll_financial_exemptions_employee] ON dbo.[payroll_financial_exemptions] ([employeeId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_financial_exemptions_run' AND object_id = OBJECT_ID(N'dbo.payroll_financial_exemptions'))
CREATE INDEX [IX_payroll_financial_exemptions_run] ON dbo.[payroll_financial_exemptions] ([runId]);
GO

IF OBJECT_ID(N'dbo.payroll_financial_exemption_events', N'U') IS NULL
CREATE TABLE dbo.[payroll_financial_exemption_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [exemptionId] INT NOT NULL,
  [runId] INT NOT NULL,
  [employeeId] INT NOT NULL,
  [eventType] NVARCHAR(40) NOT NULL,
  [actorUserId] INT NULL,
  [fromStatus] NVARCHAR(20) NULL,
  [toStatus] NVARCHAR(20) NULL,
  [reason] NVARCHAR(1000) NULL,
  [payload] NVARCHAR(MAX) NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_9f1317880d5b6815a7f0a9aa267] DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [PK_payroll_financial_exemption_events] PRIMARY KEY ([id])
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_financial_exemption_events_employee' AND object_id = OBJECT_ID(N'dbo.payroll_financial_exemption_events'))
CREATE INDEX [IX_payroll_financial_exemption_events_employee] ON dbo.[payroll_financial_exemption_events] ([employeeId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_financial_exemption_events_exemption' AND object_id = OBJECT_ID(N'dbo.payroll_financial_exemption_events'))
CREATE INDEX [IX_payroll_financial_exemption_events_exemption] ON dbo.[payroll_financial_exemption_events] ([exemptionId]);
GO

-- دفتر المديونيات: عمود nullable فقط؛ الصفوف القائمة تبقى NULL (لم يُسقطها أو يؤجلها إعفاء)
IF COL_LENGTH(N'dbo.employee_obligations', N'financialExemptionId') IS NULL ALTER TABLE dbo.employee_obligations ADD [financialExemptionId] INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_obligations_financial_exemption' AND object_id = OBJECT_ID(N'dbo.employee_obligations'))
CREATE INDEX [IX_employee_obligations_financial_exemption] ON dbo.[employee_obligations] ([financialExemptionId]);
GO

-- مفاتيح الإعداد (EX-03/06/07) بنفس افتراضات EXEMPTION_CONFIG_SEED؛ القيمة القائمة لا تُلمس
INSERT INTO dbo.requests_config ([key], [value])
SELECT s.[key], s.[value] FROM (VALUES
  (N'financial_exemptions.reason_min_length', N'20'),
  (N'financial_exemptions.attachment_threshold_days', N'1'),
  (N'financial_exemptions.max_per_employee_year', N'4'),
  (N'financial_exemptions.max_pct_per_grantor', N'20'),
  (N'financial_exemptions.cooldown_hours', N'24'),
  (N'financial_exemptions.repeat_alert_count', N'3'),
  (N'financial_exemptions.type_drain_alert_pct', N'30'),
  (N'financial_exemptions.department_manager_enabled', N'true')
) AS s([key],[value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = s.[key]);
GO

-- صلاحيات الدورين القائمين: عرض ومنح واعتماد وتجاوز الحدود للموارد البشرية (المانح لا يعتمد ما منحه — فصل مهام في الخدمة)،
-- والعرض لمدير الفرع (منحه الهيكلي كمدير قسم لا يحتاج صلاحية نظام)
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"financial_exemption.view"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"financial_exemption.view"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"financial_exemption.grant"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"financial_exemption.grant"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"financial_exemption.approve"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"financial_exemption.approve"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"financial_exemption.override_limits"]')
WHERE code = N'hr_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"financial_exemption.override_limits"%';
UPDATE dbo.roles SET permissions = STUFF(permissions, LEN(permissions), 1, N',"financial_exemption.view"]')
WHERE code = N'branch_manager' AND ISJSON(permissions) = 1 AND permissions LIKE N'[[]"%]' AND permissions NOT LIKE N'%"financial_exemption.view"%';
GO

-- تحقق داخل معاملة الملف: الكائنات موجودة، والمفاتيح مبذورة، ولا قيد في الدفتر يحمل مرجع إعفاء بعد (لم يُكتب شيء على الصفوف القائمة)
IF OBJECT_ID(N'dbo.payroll_financial_exemptions', N'U') IS NULL OR OBJECT_ID(N'dbo.payroll_financial_exemption_events', N'U') IS NULL
  OR COL_LENGTH(N'dbo.employee_obligations', N'financialExemptionId') IS NULL
  THROW 51701, N'20260915_031_c3: جدولا الإعفاء المالي أو عمود مرجعه في دفتر المديونيات غير مكتملة', 1;
IF (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] LIKE N'financial[_]exemptions.%') < 8
  THROW 51702, N'20260915_031_c3: مفاتيح إعداد الإعفاء المالي غير مبذورة كاملة', 1;
IF EXISTS (SELECT 1 FROM dbo.employee_obligations WHERE [financialExemptionId] IS NOT NULL AND [status] NOT IN (N'EXEMPTED', N'DEFERRED', N'PENDING'))
  THROW 51703, N'20260915_031_c3: قيد دفتر يحمل مرجع إعفاء بحالة غير متوقعة', 1;
GO
