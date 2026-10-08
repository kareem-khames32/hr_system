-- 20261010_176: دعوات تقييم 360 (خطة التنفيذ — B5.10: الأداء: 360 والـ1:1 والتقدير).
-- جدول جديد:
--   feedback360_invites: مين يقيّم مين في دورة تقييم (review_cycles) — العلاقة (PEER زميل رشّحه الموظف / UPWARD مرؤوس مباشر)، وحالة الترشيح
--     (PENDING / APPROVED / REJECTED)، وعلامة «رد» بس: من غير وقت الرد ولا ربط بالرد نفسه (السرية).
-- مفيش صفوف بتتضاف: الميزة الفرعية «تقييم 360» مقفولة افتراضيًا.
-- الكود بيشتغل قبل الترحيل: الشاشة بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.feedback360_invites', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'subjectEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'reviewerEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'relation', N'nvarchar', 20, 0, 0, 0, 0),
      (N'status', N'nvarchar', 20, 0, 0, 0, 0),
      (N'responded', N'bit', 1, 1, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U') AND [name] = N'PK_feedback360_invites'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U') AND i.[name] = N'PK_feedback360_invites'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 176001, N'20261010_176: جدول feedback360_invites موجود وشكله مش شكل دعوات تقييم 360 (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.feedback360_invites', N'U') IS NULL
CREATE TABLE dbo.feedback360_invites (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_feedback360_invites] PRIMARY KEY,
  [cycleId] int NOT NULL,
  [subjectEmployeeId] int NOT NULL,
  [reviewerEmployeeId] int NOT NULL,
  [relation] nvarchar(10) NOT NULL,
  [status] nvarchar(10) NOT NULL,
  [responded] bit NOT NULL,
  [createdByUserId] int NOT NULL,
  [decidedByUserId] int NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.feedback360_invites', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'subjectEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'reviewerEmployeeId', N'int', 4, 10, 0, 0, 0),
      (N'relation', N'nvarchar', 20, 0, 0, 0, 0),
      (N'status', N'nvarchar', 20, 0, 0, 0, 0),
      (N'responded', N'bit', 1, 1, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'decidedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U') AND [name] = N'PK_feedback360_invites'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.feedback360_invites', N'U') AND i.[name] = N'PK_feedback360_invites'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 176002, N'20261010_176: جدول feedback360_invites ناقص أو شكله غلط', 1;
GO
