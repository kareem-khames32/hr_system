-- 20261007_098: التقارير المحفوظة والمجدولة (خطة التنفيذ — B2.13 الجزء ب).
-- جدول واحد جديد:
--   saved_reports: تقرير محفوظ لحساب — اسم، ونوع التقرير (reportKey)، وفلاتره (filters: JSON بالفرع والأقسام والفريق والفترة النسبية)،
--     ودورية إرساله بالبريد (frequency: NONE أو DAILY أو WEEKLY أو MONTHLY) وصيغة الملف (format: xlsx أو pdf)، وآخر يوم اتبعت فيه
--     (lastSentOn) وآخر سبب تعذّر (lastError). التقرير بتاع صاحبه (ownerUserId) بس.
--     فهرس فريد (ownerUserId، name): اسم واحد لكل حساب، وقراءة تقارير الحساب.
-- الكود بيشتغل قبل الترحيل ده: التقارير وتصديرها زي ما هم، وحفظ تقرير مرفوض برسالة الترحيل، والقايمة فاضية، ومهمة الإرسال
-- المجدول مابتعملش حاجة.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بأعمدته بالترتيب — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد
-- التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.saved_reports', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'ownerUserId', N'int', 4, 10, 0, 0, 0),
      (N'name', N'nvarchar', 240, 0, 0, 0, 0),
      (N'reportKey', N'nvarchar', 60, 0, 0, 0, 0),
      (N'filters', N'nvarchar', 8000, 0, 0, 0, 0),
      (N'frequency', N'nvarchar', 20, 0, 0, 0, 0),
      (N'format', N'nvarchar', 10, 0, 0, 0, 0),
      (N'lastSentOn', N'date', 3, 10, 0, 1, 0),
      (N'lastError', N'nvarchar', 600, 0, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'PK_saved_reports'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND i.[name] = N'PK_saved_reports'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 98001, N'20261007_098: جدول saved_reports موجود وشكله مش شكل التقارير المحفوظة (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'UX_saved_reports_owner_name') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'UX_saved_reports_owner_name'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'ownerUserId'), (2, N'name')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND i.[name] = N'UX_saved_reports_owner_name'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 98002, N'20261007_098: فهرس UX_saved_reports_owner_name موجود ومش فريد على الحساب والاسم بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.saved_reports', N'U') IS NULL
CREATE TABLE dbo.saved_reports (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_saved_reports] PRIMARY KEY,
  [ownerUserId] int NOT NULL,
  [name] nvarchar(120) NOT NULL,
  [reportKey] nvarchar(30) NOT NULL,
  [filters] nvarchar(4000) NOT NULL,
  [frequency] nvarchar(10) NOT NULL,
  [format] nvarchar(5) NOT NULL,
  [lastSentOn] date NULL,
  [lastError] nvarchar(300) NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'UX_saved_reports_owner_name')
  CREATE UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.saved_reports ([ownerUserId], [name]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.saved_reports', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'ownerUserId', N'int', 4, 10, 0, 0, 0),
      (N'name', N'nvarchar', 240, 0, 0, 0, 0),
      (N'reportKey', N'nvarchar', 60, 0, 0, 0, 0),
      (N'filters', N'nvarchar', 8000, 0, 0, 0, 0),
      (N'frequency', N'nvarchar', 20, 0, 0, 0, 0),
      (N'format', N'nvarchar', 10, 0, 0, 0, 0),
      (N'lastSentOn', N'date', 3, 10, 0, 1, 0),
      (N'lastError', N'nvarchar', 600, 0, 0, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'PK_saved_reports'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND i.[name] = N'PK_saved_reports'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 98003, N'20261007_098: جدول saved_reports ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'UX_saved_reports_owner_name') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND [name] = N'UX_saved_reports_owner_name'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'ownerUserId'), (2, N'name')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.saved_reports', N'U') AND i.[name] = N'UX_saved_reports_owner_name'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 98004, N'20261007_098: فهرس التقارير المحفوظة الفريد ناقص أو شكله غلط', 1;
GO
