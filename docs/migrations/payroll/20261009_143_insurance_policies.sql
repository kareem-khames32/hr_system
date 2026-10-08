-- 20261009_143: وثائق التأمين الطبي (خطة التنفيذ — B5.2: المزايا والتأمين الطبي).
-- جدول جديد:
--   insurance_policies: كل وثيقة باسمها، وشركة التأمين، ورقم الوثيقة، ودولتها (EG / SA، أو فاضي = لكل الشركة)، ومن وإلى، وهل مفعّلة، وملاحظة،
--     ومين سجّلها وعدّلها وإمتى.
-- مفيش صفوف بتتضاف: الوثائق بيدخلها صاحب الصلاحية من شاشة «المزايا والتأمين الطبي»، والموديول نفسه مقفول افتراضيًا.
-- الكود بيشتغل قبل الترحيل: الشاشة بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.insurance_policies', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 300, 0, 0, 0, 0),
      (N'insurerName', N'nvarchar', 300, 0, 0, 0, 0),
      (N'policyNumber', N'nvarchar', 120, 0, 0, 1, 0),
      (N'country', N'nvarchar', 4, 0, 0, 1, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'endDate', N'date', 3, 10, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U') AND [name] = N'PK_insurance_policies'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U') AND i.[name] = N'PK_insurance_policies'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 143001, N'20261009_143: جدول insurance_policies موجود وشكله مش شكل وثائق التأمين الطبي (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.insurance_policies', N'U') IS NULL
CREATE TABLE dbo.insurance_policies (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_insurance_policies] PRIMARY KEY,
  [name] nvarchar(150) NOT NULL,
  [insurerName] nvarchar(150) NOT NULL,
  [policyNumber] nvarchar(60) NULL,
  [country] nvarchar(2) NULL,
  [startDate] date NOT NULL,
  [endDate] date NOT NULL,
  [isActive] bit NOT NULL,
  [note] nvarchar(500) NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL,
  [updatedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.insurance_policies', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 300, 0, 0, 0, 0),
      (N'insurerName', N'nvarchar', 300, 0, 0, 0, 0),
      (N'policyNumber', N'nvarchar', 120, 0, 0, 1, 0),
      (N'country', N'nvarchar', 4, 0, 0, 1, 0),
      (N'startDate', N'date', 3, 10, 0, 0, 0),
      (N'endDate', N'date', 3, 10, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'note', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U') AND [name] = N'PK_insurance_policies'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.insurance_policies', N'U') AND i.[name] = N'PK_insurance_policies'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 143002, N'20261009_143: جدول insurance_policies ناقص أو شكله غلط', 1;
GO
