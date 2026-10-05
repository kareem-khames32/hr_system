-- 20261005_090: تفويض الاعتمادات (خطة التنفيذ — الدفعة B2.6، الجزء ب).
-- جدول جديد وعمود جديد:
--   approval_delegations: المفوِّض (delegatorEmployeeId) بيحدد بديل واحد (delegateEmployeeId) لفترة (startDate لـendDate، الطرفين
--     داخلين)، لكل فئات الطلبات أو لفئات بعينها (categories)، بسببه ومين سجّله، ووقت إلغائه لو اتلغى. التفويض مابيتمسحش.
--   request_approvals.onBehalfOfEmployeeId: القرار اللي اتاخد بتفويض — المفوِّض اللي الخطوة كانت باسمه (approverId = حساب البديل).
-- الكود بيشتغل قبل الترحيل ده (التفويض مرفوض برسالة، والصندوق والقرار زي ما هم) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة OBJECT_ID وCOL_LENGTH وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.approval_delegations', N'U') IS NULL
CREATE TABLE dbo.approval_delegations (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_approval_delegations] PRIMARY KEY,
  [delegatorEmployeeId] int NOT NULL,
  [delegateEmployeeId] int NOT NULL,
  [startDate] date NOT NULL,
  [endDate] date NOT NULL,
  [categories] nvarchar(500) NULL,
  [reason] nvarchar(300) NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [revokedAt] datetime2 NULL,
  [revokedByUserId] int NULL
);
GO

-- تحقق قبل الفهارس: جدول approval_delegations قديم بشكل تاني = الترحيل بيقف هنا من غير ما يلمسه
IF OBJECT_ID(N'dbo.approval_delegations', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.approval_delegations')) <> 11
  THROW 90001, N'20261005_090: جدول approval_delegations ناقص أو أعمدته مش 11', 1;
IF COL_LENGTH(N'dbo.approval_delegations', N'delegatorEmployeeId') IS NULL OR COL_LENGTH(N'dbo.approval_delegations', N'delegateEmployeeId') IS NULL
   OR COL_LENGTH(N'dbo.approval_delegations', N'startDate') IS NULL OR COL_LENGTH(N'dbo.approval_delegations', N'revokedAt') IS NULL
  THROW 90002, N'20261005_090: جدول approval_delegations موجود بأعمدة غير أعمدة التفويض', 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.approval_delegations') AND name = N'IX_approval_delegations_delegate')
  CREATE INDEX [IX_approval_delegations_delegate] ON dbo.approval_delegations ([delegateEmployeeId], [startDate], [endDate]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.approval_delegations') AND name = N'IX_approval_delegations_delegator')
  CREATE INDEX [IX_approval_delegations_delegator] ON dbo.approval_delegations ([delegatorEmployeeId], [startDate], [endDate]);
GO

IF COL_LENGTH(N'dbo.request_approvals', N'onBehalfOfEmployeeId') IS NULL
  ALTER TABLE dbo.request_approvals ADD [onBehalfOfEmployeeId] int NULL;
GO

-- تحقق: الفهرسين، والعمود بنوعه وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.approval_delegations') AND name = N'IX_approval_delegations_delegate')
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.approval_delegations') AND name = N'IX_approval_delegations_delegator')
  THROW 90003, N'20261005_090: فهارس جدول approval_delegations ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.request_approvals') AND name = N'onBehalfOfEmployeeId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
  THROW 90004, N'20261005_090: العمود request_approvals.onBehalfOfEmployeeId ناقص أو بنوع غلط', 1;
GO
