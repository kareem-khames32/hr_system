-- 20261009_140: دورات الزيادات (خطة التنفيذ — B5.1: تخطيط الزيادات وسلّم الرواتب).
-- جدول جديد:
--   compensation_cycles: كل دورة باسمها، و«يسري من راتب شهر» (YYYY-MM)، وحالتها (DRAFT مسودة / OPEN مفتوحة للاقتراحات / REVIEW تحت المراجعة /
--     APPROVED معتمدة / APPLIED اتطبّقت / CANCELLED ملغاة)، وملاحظتها، ومين عملها وإمتى، وإمتى اتفتحت، ومين بعتها للمراجعة وإمتى، ومين اعتمدها وإمتى، وإمتى اتطبّقت.
-- مفيش صفوف بتتضاف: الدورة بيفتحها صاحب الصلاحية من شاشة «دورات الزيادات»، والموديول نفسه مقفول افتراضيًا.
-- الكود بيشتغل قبل الترحيل: شاشة الدورات بتقول إن الترحيل ناقص، وسلّم الرواتب شغال.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.compensation_cycles', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 240, 0, 0, 0, 0),
      (N'effectivePayrollPeriod', N'nvarchar', 14, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'openedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'reviewByUserId', N'int', 4, 10, 0, 1, 0),
      (N'reviewAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'approvedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'approvedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'appliedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U') AND [name] = N'PK_compensation_cycles'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U') AND i.[name] = N'PK_compensation_cycles'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 140001, N'20261009_140: جدول compensation_cycles موجود وشكله مش شكل دورات الزيادات (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.compensation_cycles', N'U') IS NULL
CREATE TABLE dbo.compensation_cycles (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_compensation_cycles] PRIMARY KEY,
  [name] nvarchar(120) NOT NULL,
  [effectivePayrollPeriod] nvarchar(7) NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [note] nvarchar(500) NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [openedAt] datetime2 NULL,
  [reviewByUserId] int NULL,
  [reviewAt] datetime2 NULL,
  [approvedByUserId] int NULL,
  [approvedAt] datetime2 NULL,
  [appliedAt] datetime2 NULL,
  [updatedByUserId] int NULL,
  [updatedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.compensation_cycles', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 240, 0, 0, 0, 0),
      (N'effectivePayrollPeriod', N'nvarchar', 14, 0, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'openedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'reviewByUserId', N'int', 4, 10, 0, 1, 0),
      (N'reviewAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'approvedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'approvedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'appliedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U') AND [name] = N'PK_compensation_cycles'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.compensation_cycles', N'U') AND i.[name] = N'PK_compensation_cycles'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 140002, N'20261009_140: جدول compensation_cycles ناقص أو شكله غلط', 1;
GO
