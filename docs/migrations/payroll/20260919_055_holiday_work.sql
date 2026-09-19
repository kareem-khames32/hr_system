-- 20260919_055: «بدل دوام أيام العطلات» (قرار المالك 19 سبتمبر).
-- (1) جدول جديد holiday_work_orders: أمر الموارد البشرية «أمر دوام يوم عطلة» (ORDER) باسمه واستهدافه (شركة/فرع/أقسام/فرق/موظفين)
--     وأيام العطلة والمضاعف، أو طلب «دوام يوم عطلة» معتمد لموظف واحد (REQUEST). ساعات البصمة في الأيام دي بتتحسب عند حساب المسير
--     قيد «بدل» (CREDIT / allowance) في دفتر المديونيات = الساعات × (الإجمالي ÷ أيام الشهر ÷ ساعات اليوم) × المضاعف، مقصوص لقرشين.
-- (2) إعداد attendance.holiday_work_multiplier = 1.5 (المضاعف الافتراضي، ويتعدل لكل أمر).
-- (3) نوع الطلب HOLIDAY_WORK «دوام يوم عطلة» (الحضور والوقت، الحقول: dates + reason، الوجهة holiday_work) وسلسلته CH_HOLIDAY_WORK
--     بخطوة واحدة «الموارد البشرية» زي باقي أنواع الحضور في القاعدة الحية — المالك يعدّل المعتمدين من «أنواع الطلبات».
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE لصف قائم ولا تعبئة رجعية. قابل لإعادة التشغيل بحراسات الوجود.
-- أسماء القيود والفهارس مطابقة لما تولّده TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.holiday_work_orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.holiday_work_orders (
    [id] int NOT NULL IDENTITY(1,1),
    [kind] nvarchar(10) NOT NULL CONSTRAINT [DF_a64783c89ee63e68e2ba845f5be] DEFAULT 'ORDER',
    [name] nvarchar(150) NOT NULL,
    [targetLevel] nvarchar(20) NOT NULL,
    [branchId] int NULL,
    [targetIds] nvarchar(MAX) NULL,
    [dates] nvarchar(MAX) NOT NULL,
    [firstDate] date NOT NULL,
    [lastDate] date NOT NULL,
    [multiplier] decimal(5,2) NOT NULL,
    [status] nvarchar(12) NOT NULL CONSTRAINT [DF_22af30500d1f40d301bdb02f92c] DEFAULT 'ACTIVE',
    [sourceRequestId] int NULL,
    [note] nvarchar(500) NULL,
    [createdByUserId] int NULL,
    [createdAt] datetime2 NOT NULL CONSTRAINT [DF_0c0c5edf7109716a1f42c872b0d] DEFAULT SYSUTCDATETIME(),
    [updatedByUserId] int NULL,
    [updatedAt] datetime2 NULL,
    [cancelledByUserId] int NULL,
    [cancelledAt] datetime2 NULL,
    [cancelReason] nvarchar(300) NULL,
    CONSTRAINT [PK_holiday_work_orders] PRIMARY KEY ([id])
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_holiday_work_orders_range' AND object_id = OBJECT_ID(N'dbo.holiday_work_orders'))
  CREATE INDEX [IX_holiday_work_orders_range] ON dbo.holiday_work_orders ([status], [firstDate], [lastDate]);
GO

-- طلب معتمد واحد = سجل واحد (إعادة تنفيذ الوجهة ما تكررش الأيام)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_holiday_work_orders_request' AND object_id = OBJECT_ID(N'dbo.holiday_work_orders'))
  CREATE UNIQUE INDEX [UX_holiday_work_orders_request] ON dbo.holiday_work_orders ([sourceRequestId]) WHERE [sourceRequestId] IS NOT NULL;
GO

-- (2) المضاعف الافتراضي — لا يُلمس لو المالك ضبطه قبل كده
INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value]
FROM (VALUES (N'attendance.holiday_work_multiplier', N'1.5')) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

-- (3) سلسلة اعتماد النوع (عامة لكل الفروع) بخطوة الموارد البشرية — تُنشأ مرة واحدة بس
IF NOT EXISTS (SELECT 1 FROM dbo.approval_chains WHERE [code] = N'CH_HOLIDAY_WORK' AND [branchId] IS NULL)
BEGIN
  INSERT INTO dbo.approval_chains ([code], [nameAr], [branchId], [isActive], [requestTypeCode], [autoApprove])
  VALUES (N'CH_HOLIDAY_WORK', N'سلسلة اعتماد دوام يوم عطلة', NULL, 1, N'HOLIDAY_WORK', 0);

  INSERT INTO dbo.approval_steps ([chainId], [stepOrder], [approverRole], [isParallel], [canDelegate])
  SELECT c.[id], 1, N'hr', 0, 1
  FROM dbo.approval_chains c
  WHERE c.[code] = N'CH_HOLIDAY_WORK' AND c.[branchId] IS NULL;
END
GO

INSERT INTO dbo.request_types ([code], [nameAr], [category], [requiredFields], [requiredAttachments], [approvalChainId],
  [destinationHandler], [affectsBalance], [isSecurityRoute], [isConfidential], [autoGeneratesPdf], [phase], [isActive], [customFields], [visibleTo], [branchId])
SELECT N'HOLIDAY_WORK', N'دوام يوم عطلة', N'time_attendance', N'["dates","reason"]', NULL, c.[id],
  N'holiday_work', 0, 0, 0, 0, N'P1', 1, NULL, NULL, NULL
FROM dbo.approval_chains c
WHERE c.[code] = N'CH_HOLIDAY_WORK' AND c.[branchId] IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.request_types t WHERE t.[code] = N'HOLIDAY_WORK');
GO

-- تحقق بعد التطبيق
IF OBJECT_ID(N'dbo.holiday_work_orders', N'U') IS NULL
  THROW 57551, N'20260919_055: جدول أوامر دوام أيام العطلات غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_holiday_work_orders_range' AND object_id = OBJECT_ID(N'dbo.holiday_work_orders'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_holiday_work_orders_request' AND object_id = OBJECT_ID(N'dbo.holiday_work_orders'))
  THROW 57552, N'20260919_055: فهارس أوامر دوام أيام العطلات ناقصة', 1;
IF COL_LENGTH(N'dbo.holiday_work_orders', N'multiplier') IS NULL OR COL_LENGTH(N'dbo.holiday_work_orders', N'cancelReason') IS NULL
  THROW 57553, N'20260919_055: أعمدة أوامر دوام أيام العطلات ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'attendance.holiday_work_multiplier')
  THROW 57554, N'20260919_055: إعداد مضاعف دوام أيام العطلات غير موجود', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.request_types t INNER JOIN dbo.approval_chains c ON c.[id] = t.[approvalChainId]
               WHERE t.[code] = N'HOLIDAY_WORK' AND t.[destinationHandler] = N'holiday_work' AND t.[category] = N'time_attendance')
  THROW 57555, N'20260919_055: نوع طلب «دوام يوم عطلة» غير موجود أو غير مربوط بسلسلته', 1;
GO
