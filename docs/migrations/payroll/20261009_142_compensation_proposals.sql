-- 20261009_142: سطور اقتراحات الزيادات (خطة التنفيذ — B5.1: تخطيط الزيادات وسلّم الرواتب).
-- جدول جديد:
--   compensation_proposals: سطر لكل موظف في الدورة: أساسيه وقت آخر كتابة، واقتراح المدير (زيادة شهرية على الأساسي) ومين اقترحه وإمتى وملاحظته،
--     والمبلغ النهائي ومين عدّله وإمتى وسبب التعديل، وإمتى اتطبّق ومين طبّقه ورقم مراجعة تاريخ الراتب اللي اتكتبت منه.
--     سطر واحد للموظف في الدورة (الخادم بيتأكد تحت قفل صف الدورة).
-- مفيش صفوف بتتضاف. السطر اقتراح بس: الراتب بيتغيّر من خدمة تاريخ الراتب بعد الاعتماد.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.compensation_proposals', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'currentBasic', N'decimal', 9, 12, 2, 0, 0),
      (N'proposedAmount', N'decimal', 9, 12, 2, 0, 0),
      (N'proposedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'proposedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'finalAmount', N'decimal', 9, 12, 2, 0, 0),
      (N'adjustedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'adjustedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'adjustNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'appliedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'appliedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'appliedRevision', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U') AND [name] = N'PK_compensation_proposals'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U') AND i.[name] = N'PK_compensation_proposals'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 142001, N'20261009_142: جدول compensation_proposals موجود وشكله مش شكل سطور اقتراحات الزيادات (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.compensation_proposals', N'U') IS NULL
CREATE TABLE dbo.compensation_proposals (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_compensation_proposals] PRIMARY KEY,
  [cycleId] int NOT NULL,
  [employeeId] int NOT NULL,
  [currentBasic] decimal(12,2) NOT NULL,
  [proposedAmount] decimal(12,2) NOT NULL,
  [proposedByUserId] int NOT NULL,
  [proposedAt] datetime2 NOT NULL,
  [note] nvarchar(500) NULL,
  [finalAmount] decimal(12,2) NOT NULL,
  [adjustedByUserId] int NULL,
  [adjustedAt] datetime2 NULL,
  [adjustNote] nvarchar(500) NULL,
  [appliedAt] datetime2 NULL,
  [appliedByUserId] int NULL,
  [appliedRevision] int NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.compensation_proposals', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'currentBasic', N'decimal', 9, 12, 2, 0, 0),
      (N'proposedAmount', N'decimal', 9, 12, 2, 0, 0),
      (N'proposedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'proposedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'finalAmount', N'decimal', 9, 12, 2, 0, 0),
      (N'adjustedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'adjustedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'adjustNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'appliedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'appliedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'appliedRevision', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U') AND [name] = N'PK_compensation_proposals'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.compensation_proposals', N'U') AND i.[name] = N'PK_compensation_proposals'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 142002, N'20261009_142: جدول compensation_proposals ناقص أو شكله غلط', 1;
GO
