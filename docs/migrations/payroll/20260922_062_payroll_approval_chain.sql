-- 20260922_062: سلسلة اعتماد المسير (قرار المالك 22 سبتمبر).
-- مسؤول الرواتب يحسب المسير ولا يعتمده؛ بعد الحساب المسير بيطلع سلسلة خطوات بالترتيب، كل خطوة شخص بعينه
-- (حساب دخول) أو دور، وآخر خطوة = الاعتماد النهائي (APPROVED = لحظة ظهور القسيمة للموظف). أي خطوة ترفض بسبب
-- مكتوب فيرجع المسير لمسؤول الرواتب. بلا سلسلة = الاعتماد بخطوة واحدة زي ما هو بالحرف.
-- جدولان جديدان فقط:
--   payroll_approval_chains  تعريف السلسلة: سلسلة الشركة (scope=COMPANY، seriesName='') وسلسلة خاصة بمسير دائم باسمه
--                            (scope=RUN_SERIES)؛ الخطوات JSON مرتبة، وقائمة فاضية = «مفيش سلسلة».
--   payroll_run_approvals    سجل القرارات (إلحاقي): اعتماد خطوة أو رفض بسبب لنسخة حساب بعينها (snapshotVersion) وببصمة
--                            السلسلة وقتها؛ الإلغاء بـvoidedAt (رفض / إعادة فتح / إلغاء / تغيير السلسلة) لا بالحذف.
--                            الفهرس الفريد المرشّح يضمن إن الخطوة الواحدة تتعتمد مرة واحدة لنسخة الحساب.
-- المسير نفسه مابيتغيرش: يفضل CALCULATED طول ما هو طالع السلسلة، ومفيش عمود جديد على payroll_runs ولا payroll_items.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ولا تغيير على أي جدول قائم.
-- أسماء القيود والفهارس مطابقة لكيانات TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_approval_chains', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_approval_chains (
    [id] int NOT NULL IDENTITY(1,1),
    [scope] nvarchar(20) NOT NULL,
    [seriesName] nvarchar(200) NOT NULL,
    [steps] nvarchar(MAX) NOT NULL,
    [revision] int NOT NULL,
    [updatedByUserId] int NOT NULL,
    [updatedAt] datetime2 NOT NULL,
    CONSTRAINT [CK_payroll_approval_chain_scope] CHECK (([scope] = 'COMPANY' AND [seriesName] = '') OR ([scope] = 'RUN_SERIES' AND [seriesName] <> '')),
    CONSTRAINT [PK_payroll_approval_chains] PRIMARY KEY ([id])
  );
END
GO

-- سلسلة واحدة للشركة، وسلسلة واحدة لكل مسير دائم باسمه
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_approval_chain_key' AND object_id = OBJECT_ID(N'dbo.payroll_approval_chains'))
  CREATE UNIQUE INDEX [UX_payroll_approval_chain_key] ON dbo.payroll_approval_chains ([scope], [seriesName]);
GO

IF OBJECT_ID(N'dbo.payroll_run_approvals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_run_approvals (
    [id] int NOT NULL IDENTITY(1,1),
    [runId] int NOT NULL,
    [snapshotVersion] int NOT NULL,
    [chainId] int NOT NULL,
    [chainHash] nvarchar(64) NOT NULL,
    [stepOrder] int NOT NULL,
    [stepCount] int NOT NULL,
    [stepLabel] nvarchar(100) NOT NULL,
    [approverKind] nvarchar(10) NOT NULL,
    [approverRoleCode] nvarchar(50) NULL,
    [decision] nvarchar(10) NOT NULL,
    [reason] nvarchar(500) NULL,
    [actorUserId] int NOT NULL,
    [decidedAt] datetime2 NOT NULL,
    [voidedAt] datetime2 NULL,
    [voidReason] nvarchar(20) NULL,
    CONSTRAINT [CK_payroll_run_approval_decision] CHECK ([decision] = 'APPROVED' OR ([decision] = 'REJECTED' AND [reason] IS NOT NULL)),
    CONSTRAINT [PK_payroll_run_approvals] PRIMARY KEY ([id])
  );
END
GO

-- قرارات المسير لنسخة الحساب (شريط السلسلة وقائمة «مسيرات بانتظار اعتمادي»)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_run_approval_run' AND object_id = OBJECT_ID(N'dbo.payroll_run_approvals'))
  CREATE INDEX [IX_payroll_run_approval_run] ON dbo.payroll_run_approvals ([runId], [snapshotVersion]);
GO

-- الخطوة الواحدة تتعتمد مرة واحدة لنسخة الحساب (حارس على مستوى القاعدة فوق قفل المسير)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_run_approval_active_step' AND object_id = OBJECT_ID(N'dbo.payroll_run_approvals'))
  CREATE UNIQUE INDEX [UX_payroll_run_approval_active_step] ON dbo.payroll_run_approvals ([runId], [snapshotVersion], [stepOrder])
    WHERE [voidedAt] IS NULL AND [decision] = 'APPROVED';
GO

-- تحقق: الجدولان والفهارس والقيود موجودة بأسمائها
IF OBJECT_ID(N'dbo.payroll_approval_chains', N'U') IS NULL OR OBJECT_ID(N'dbo.payroll_run_approvals', N'U') IS NULL
  THROW 62001, N'20260922_062: جداول سلسلة اعتماد المسير غير موجودة بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_approval_chain_key' AND is_unique = 1 AND object_id = OBJECT_ID(N'dbo.payroll_approval_chains'))
  THROW 62002, N'20260922_062: الفهرس الفريد لسلسلة الشركة وسلسلة كل مسير دائم غير موجود', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_run_approval_active_step' AND is_unique = 1 AND has_filter = 1 AND object_id = OBJECT_ID(N'dbo.payroll_run_approvals'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_run_approval_run' AND object_id = OBJECT_ID(N'dbo.payroll_run_approvals'))
  THROW 62003, N'20260922_062: فهارس قرارات اعتماد المسير ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_payroll_approval_chain_scope' AND parent_object_id = OBJECT_ID(N'dbo.payroll_approval_chains'))
  OR NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_payroll_run_approval_decision' AND parent_object_id = OBJECT_ID(N'dbo.payroll_run_approvals'))
  THROW 62004, N'20260922_062: قيود سلسلة اعتماد المسير ناقصة', 1;
IF COL_LENGTH(N'dbo.payroll_approval_chains', N'steps') IS NULL OR COL_LENGTH(N'dbo.payroll_approval_chains', N'revision') IS NULL
  OR COL_LENGTH(N'dbo.payroll_run_approvals', N'chainHash') IS NULL OR COL_LENGTH(N'dbo.payroll_run_approvals', N'voidedAt') IS NULL
  OR COL_LENGTH(N'dbo.payroll_run_approvals', N'reason') IS NULL
  THROW 62005, N'20260922_062: أعمدة سلسلة اعتماد المسير ناقصة', 1;
GO
