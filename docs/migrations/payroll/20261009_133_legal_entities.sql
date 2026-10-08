-- 20261009_133: الكيانات القانونية (خطة التنفيذ — B4.1: الكيان القانوني الأدنى).
-- جدول جديد:
--   legal_entities: كيان قانوني — اسمه بالعربي والإنجليزي، ودولته (EG / SA)، وعملته (عملة دولته: EGP / SAR)، ومنطقته الزمنية (الفاضي =
--     منطقة الخادم)، والسجل التجاري، والرقم الضريبي، ورقم منشأة التأمينات، ورقم قوى، وبنك الرواتب وآيبانه، ورقم حماية الأجور، ويوم
--     بداية دورة الرواتب (الفاضي = الإعداد العام)، وهل ساري، وإمتى اتسجّل.
-- الكود بيشتغل قبل الترحيل: العملة من دولة الفرع زي الأول، وشاشة الكيانات بتقول إن الترحيل ناقص.
-- ربط الفروع وتعبئة الكيانات من بيانات الشركة في ترحيل 20261009_134.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.legal_entities', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 400, 0, 0, 1, 0),
      (N'country', N'nvarchar', 10, 0, 0, 0, 0),
      (N'currency', N'nvarchar', 6, 0, 0, 0, 0),
      (N'timeZone', N'nvarchar', 128, 0, 0, 1, 0),
      (N'commercialRegister', N'nvarchar', 200, 0, 0, 1, 0),
      (N'taxNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'insuranceNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'qiwaNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'payrollBankName', N'nvarchar', 400, 0, 0, 1, 0),
      (N'payrollIban', N'nvarchar', 80, 0, 0, 1, 0),
      (N'wpsNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'cycleStartDay', N'int', 4, 10, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.legal_entities', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.legal_entities', N'U') AND [name] = N'PK_legal_entities'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.legal_entities', N'U') AND i.[name] = N'PK_legal_entities'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 133001, N'20261009_133: جدول legal_entities موجود وشكله مش شكل الكيانات القانونية (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.legal_entities', N'U') IS NULL
CREATE TABLE dbo.legal_entities (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_legal_entities] PRIMARY KEY,
  [name] nvarchar(200) NOT NULL,
  [nameEn] nvarchar(200) NULL,
  [country] nvarchar(5) NOT NULL,
  [currency] nvarchar(3) NOT NULL,
  [timeZone] nvarchar(64) NULL,
  [commercialRegister] nvarchar(100) NULL,
  [taxNumber] nvarchar(100) NULL,
  [insuranceNumber] nvarchar(100) NULL,
  [qiwaNumber] nvarchar(100) NULL,
  [payrollBankName] nvarchar(200) NULL,
  [payrollIban] nvarchar(40) NULL,
  [wpsNumber] nvarchar(100) NULL,
  [cycleStartDay] int NULL,
  [isActive] bit NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.legal_entities', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 400, 0, 0, 1, 0),
      (N'country', N'nvarchar', 10, 0, 0, 0, 0),
      (N'currency', N'nvarchar', 6, 0, 0, 0, 0),
      (N'timeZone', N'nvarchar', 128, 0, 0, 1, 0),
      (N'commercialRegister', N'nvarchar', 200, 0, 0, 1, 0),
      (N'taxNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'insuranceNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'qiwaNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'payrollBankName', N'nvarchar', 400, 0, 0, 1, 0),
      (N'payrollIban', N'nvarchar', 80, 0, 0, 1, 0),
      (N'wpsNumber', N'nvarchar', 200, 0, 0, 1, 0),
      (N'cycleStartDay', N'int', 4, 10, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.legal_entities', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.legal_entities', N'U') AND [name] = N'PK_legal_entities'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.legal_entities', N'U') AND i.[name] = N'PK_legal_entities'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 133002, N'20261009_133: جدول legal_entities ناقص أو شكله غلط', 1;
GO
