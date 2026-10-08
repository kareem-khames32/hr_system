-- 20261009_138: جدول البنوك بأكوادها (خطة التنفيذ — B4.6: البنوك وحماية الأجور).
-- جدول جديد:
--   banks: كل بنك بدولته (EG / SA)، وكوده زي ما بيظهر في الآيبان (السعودي رقمين، المصري 4 أرقام)، واسمه بالعربي والإنجليزي، وكود السويفت،
--     وهل مفعّل، ومين عدّله وإمتى. الدولة والكود فريدين (الخادم بيتأكد تحت قفل الجدول).
-- مفيش صفوف بتتضاف: أكواد البنوك بيدخلها المالك من شاشة «البنوك» (الجدول الفاضي = كشف البنك زي الأول).
-- كود بنك الموظف مش عمود جديد: بيتقري من آيبانه ويتطابق مع الجدول.
-- الكود بيشتغل قبل الترحيل: كشف البنك وشاشة الصرف من غير تنبيه كود البنك، وشاشة البنوك بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.banks', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'country', N'nvarchar', 4, 0, 0, 0, 0),
      (N'ibanCode', N'nvarchar', 20, 0, 0, 0, 0),
      (N'nameAr', N'nvarchar', 400, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 400, 0, 0, 1, 0),
      (N'swiftCode', N'nvarchar', 40, 0, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.banks', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.banks', N'U') AND [name] = N'PK_banks'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.banks', N'U') AND i.[name] = N'PK_banks'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 138001, N'20261009_138: جدول banks موجود وشكله مش شكل جدول البنوك (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.banks', N'U') IS NULL
CREATE TABLE dbo.banks (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_banks] PRIMARY KEY,
  [country] nvarchar(2) NOT NULL,
  [ibanCode] nvarchar(10) NOT NULL,
  [nameAr] nvarchar(200) NOT NULL,
  [nameEn] nvarchar(200) NULL,
  [swiftCode] nvarchar(20) NULL,
  [isActive] bit NOT NULL,
  [updatedByUserId] int NULL,
  [updatedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.banks', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'country', N'nvarchar', 4, 0, 0, 0, 0),
      (N'ibanCode', N'nvarchar', 20, 0, 0, 0, 0),
      (N'nameAr', N'nvarchar', 400, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 400, 0, 0, 1, 0),
      (N'swiftCode', N'nvarchar', 40, 0, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.banks', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.banks', N'U') AND [name] = N'PK_banks'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.banks', N'U') AND i.[name] = N'PK_banks'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 138002, N'20261009_138: جدول banks ناقص أو شكله غلط', 1;
GO
