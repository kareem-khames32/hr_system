-- 20261005_091: مكتبة السياسات والإقرار (خطة التنفيذ — الدفعة B2.7، الجزء أ).
-- 3 جداول جديدة:
--   policies: السياسة — عنوانها وفئتها وجمهورها «مين + فين» (audience، بشكل جمهور نوع الطلب) وإلزاميتها ومهلة السماح وحالتها،
--     وgraceFrom: اليوم اللي بقت فيه إلزامية أو جمهورها اتغيّر بعد النشر (المهلة بتتحسب منه لو أبعد).
--   policy_versions: نسخ السياسة — نص (bodyText) أو ملف PDF (fileId) واحد منهم بالظبط (CK_policy_versions_content)، ببصمة المحتوى (contentHash)
--     وتاريخ السريان وعلامة «تغيير جوهري».
--     النسخة بتتكتب مرة واحدة وقت النشر: مشغّل TR_policy_versions_frozen بيرفض أي تعديل أو مسح.
--   policy_acknowledgements: إقرارات الموظفين — الموظف والحساب والنسخة والوقت وبصمة اللي اتعرض والـIP والجهاز. سطر لكل موظف ونسخة،
--     وإضافة بس: مشغّل TR_policy_acknowledgements_append_only بيرفض أي تعديل أو مسح.
-- الكود بيشتغل قبل الترحيل ده (شاشة السياسات بتقول إنها مستنياه، ومفيش بوابة إقرار) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة OBJECT_ID وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي إنشاء: جدول قديم بنفس الاسم وبشكل تاني = الترحيل بيقف هنا من غير ما يلمسه ولا ينشئ الباقي
IF OBJECT_ID(N'dbo.policies', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policies')) <> 12
   OR COL_LENGTH(N'dbo.policies', N'audience') IS NULL OR COL_LENGTH(N'dbo.policies', N'graceFrom') IS NULL OR COL_LENGTH(N'dbo.policies', N'withdrawnAt') IS NULL)
  THROW 91001, N'20261005_091: جدول policies موجود وأعمدته مش أعمدة السياسة الـ12', 1;
IF OBJECT_ID(N'dbo.policy_versions', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policy_versions')) <> 10
   OR COL_LENGTH(N'dbo.policy_versions', N'contentHash') IS NULL OR COL_LENGTH(N'dbo.policy_versions', N'effectiveDate') IS NULL OR COL_LENGTH(N'dbo.policy_versions', N'isMaterial') IS NULL)
  THROW 91002, N'20261005_091: جدول policy_versions موجود وأعمدته مش أعمدة النسخة الـ10', 1;
IF OBJECT_ID(N'dbo.policy_acknowledgements', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements')) <> 9
   OR COL_LENGTH(N'dbo.policy_acknowledgements', N'versionId') IS NULL OR COL_LENGTH(N'dbo.policy_acknowledgements', N'contentHash') IS NULL OR COL_LENGTH(N'dbo.policy_acknowledgements', N'userAgent') IS NULL)
  THROW 91003, N'20261005_091: جدول policy_acknowledgements موجود وأعمدته مش أعمدة الإقرار الـ9', 1;
GO

IF OBJECT_ID(N'dbo.policies', N'U') IS NULL
CREATE TABLE dbo.policies (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_policies] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [category] nvarchar(100) NULL,
  [audience] nvarchar(2000) NULL,
  [isMandatory] bit NOT NULL,
  [graceDays] int NOT NULL,
  [graceFrom] date NULL,
  [status] nvarchar(20) NOT NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [withdrawnAt] datetime2 NULL,
  [withdrawnByUserId] int NULL
);
GO

IF OBJECT_ID(N'dbo.policy_versions', N'U') IS NULL
CREATE TABLE dbo.policy_versions (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_policy_versions] PRIMARY KEY,
  [policyId] int NOT NULL,
  [versionNo] int NOT NULL,
  [bodyText] nvarchar(max) NULL,
  [fileId] int NULL,
  [contentHash] nvarchar(64) NOT NULL,
  [effectiveDate] date NOT NULL,
  [isMaterial] bit NOT NULL,
  [publishedAt] datetime2 NOT NULL,
  [publishedByUserId] int NOT NULL,
  CONSTRAINT [CK_policy_versions_content] CHECK (([bodyText] IS NULL AND [fileId] IS NOT NULL) OR ([bodyText] IS NOT NULL AND [fileId] IS NULL))
);
GO

IF OBJECT_ID(N'dbo.policy_acknowledgements', N'U') IS NULL
CREATE TABLE dbo.policy_acknowledgements (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_policy_acknowledgements] PRIMARY KEY,
  [policyId] int NOT NULL,
  [versionId] int NOT NULL,
  [employeeId] int NOT NULL,
  [userId] int NOT NULL,
  [acknowledgedAt] datetime2 NOT NULL,
  [contentHash] nvarchar(64) NOT NULL,
  [ip] nvarchar(64) NULL,
  [userAgent] nvarchar(300) NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_versions') AND name = N'UQ_policy_versions_number')
  CREATE UNIQUE INDEX [UQ_policy_versions_number] ON dbo.policy_versions ([policyId], [versionNo]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements') AND name = N'UQ_policy_acknowledgements_version_employee')
  CREATE UNIQUE INDEX [UQ_policy_acknowledgements_version_employee] ON dbo.policy_acknowledgements ([versionId], [employeeId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements') AND name = N'IX_policy_acknowledgements_employee')
  CREATE INDEX [IX_policy_acknowledgements_employee] ON dbo.policy_acknowledgements ([employeeId], [policyId]);
GO

-- النسخة المنشورة مابتتعدلش: التعديل نسخة جديدة
CREATE OR ALTER TRIGGER dbo.[TR_policy_versions_frozen] ON dbo.[policy_versions] INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 91010, N'نسخة السياسة المنشورة مابتتعدلش ولا بتتمسح: انشر نسخة جديدة', 1;
END
GO

-- الإقرار إضافة بس: مفيش تعديل ولا مسح
CREATE OR ALTER TRIGGER dbo.[TR_policy_acknowledgements_append_only] ON dbo.[policy_acknowledgements] INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 91011, N'إقرارات السياسات إضافة بس: مفيش تعديل ولا مسح', 1;
END
GO

-- تحقق: الجداول التلاتة بعدد أعمدتها، وقيد محتوى النسخة، والفهارس بأسمائها وتفرّدها، والمشغّلين
IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policies')) <> 12 OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policy_versions')) <> 10
   OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements')) <> 9
   OR NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.policy_versions') AND name = N'CK_policy_versions_content')
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_versions') AND name = N'UQ_policy_versions_number' AND is_unique = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements') AND name = N'UQ_policy_acknowledgements_version_employee' AND is_unique = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.policy_acknowledgements') AND name = N'IX_policy_acknowledgements_employee')
  THROW 91004, N'20261005_091: جداول السياسات أو فهارسها ناقصة', 1;
IF OBJECT_ID(N'dbo.TR_policy_versions_frozen', N'TR') IS NULL OR OBJECT_ID(N'dbo.TR_policy_acknowledgements_append_only', N'TR') IS NULL
  THROW 91005, N'20261005_091: مشغّل منع تعديل النسخ أو الإقرارات ناقص', 1;
GO
