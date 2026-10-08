-- 20261009_129: الاستبيانات (خطة التنفيذ — B3.13: الاستبيانات).
-- جدول جديد:
--   surveys: استبيان — العنوان، والنوع (SATISFACTION رضا / ENPS / PULSE نبض / ONBOARDING تهيئة / EXIT خروج / TRAINING تقييم تدريب / SERVICE رضا الخدمة)،
--     والجمهور «مين + فين» (بصيغة جمهور الإعلانات؛ الفاضي = كل الشركة)، ومجهول ولا بالاسم، والحد الأدنى لعرض نتايج مجموعة، والأسئلة (JSON)،
--     وآخر يوم للرد، والحالة (DRAFT مسودة / OPEN مفتوح / CLOSED مقفول)، ومين عمله وإمتى، وإمتى اتفتح واتقفل.
-- الكود بيشتغل قبل الترحيلات: شاشة الاستبيانات بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.surveys', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'audience', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'isAnonymous', N'bit', 1, 1, 0, 0, 0),
      (N'minGroup', N'int', 4, 10, 0, 0, 0),
      (N'questions', N'nvarchar', -1, 0, 0, 0, 0),
      (N'closeDate', N'date', 3, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'openedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.surveys', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.surveys', N'U') AND [name] = N'PK_surveys'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.surveys', N'U') AND i.[name] = N'PK_surveys'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 129001, N'20261009_129: جدول surveys موجود وشكله مش شكل الاستبيانات (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.surveys', N'U') IS NULL
CREATE TABLE dbo.surveys (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_surveys] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [kind] nvarchar(20) NOT NULL,
  [audience] nvarchar(2000) NULL,
  [isAnonymous] bit NOT NULL,
  [minGroup] int NOT NULL,
  [questions] nvarchar(max) NOT NULL,
  [closeDate] date NULL,
  [status] nvarchar(20) NOT NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [openedAt] datetime2 NULL,
  [closedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.surveys', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'audience', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'isAnonymous', N'bit', 1, 1, 0, 0, 0),
      (N'minGroup', N'int', 4, 10, 0, 0, 0),
      (N'questions', N'nvarchar', -1, 0, 0, 0, 0),
      (N'closeDate', N'date', 3, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'openedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.surveys', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.surveys', N'U') AND [name] = N'PK_surveys'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.surveys', N'U') AND i.[name] = N'PK_surveys'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 129002, N'20261009_129: جدول surveys ناقص أو شكله غلط', 1;
GO
