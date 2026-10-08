-- 20261008_107: مقابلات المرشحين (خطة التنفيذ — B3.4 الجزء ب: المقابلات وبطاقات التقييم).
-- جدول جديد:
--   candidate_interviews: مقابلة مرشح — المرشح (candidates.id)، والموعد (بساعة التطبيق)، والمدة بالدقايق، والنوع (ONSITE حضوري / VIDEO فيديو /
--     PHONE تليفون)، والمكان أو الرابط والملاحظات (اختياريين)، والحالة (SCHEDULED محددة / DONE تمّت / CANCELLED ملغاة)، ومين حددها، وإمتى اتقفلت.
-- بطاقات المحاورين في ترحيل 20261008_108 (interview_scorecards).
-- الكود بيشتغل قبل الترحيلين: قايمة المقابلات بتقول إن الترحيل ناقص، وتحديد مقابلة أو تسليم بطاقة مرفوضين برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.candidate_interviews', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'candidateId', N'int', 4, 10, 0, 0, 0),
      (N'scheduledAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'durationMinutes', N'int', 4, 10, 0, 0, 0),
      (N'mode', N'nvarchar', 40, 0, 0, 0, 0),
      (N'location', N'nvarchar', 600, 0, 0, 1, 0),
      (N'notes', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U') AND [name] = N'PK_candidate_interviews'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U') AND i.[name] = N'PK_candidate_interviews'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 107001, N'20261008_107: جدول candidate_interviews موجود وشكله مش شكل مقابلات المرشحين (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.candidate_interviews', N'U') IS NULL
CREATE TABLE dbo.candidate_interviews (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_candidate_interviews] PRIMARY KEY,
  [candidateId] int NOT NULL,
  [scheduledAt] datetime2 NOT NULL,
  [durationMinutes] int NOT NULL,
  [mode] nvarchar(20) NOT NULL,
  [location] nvarchar(300) NULL,
  [notes] nvarchar(1000) NULL,
  [status] nvarchar(20) NOT NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [closedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.candidate_interviews', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'candidateId', N'int', 4, 10, 0, 0, 0),
      (N'scheduledAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'durationMinutes', N'int', 4, 10, 0, 0, 0),
      (N'mode', N'nvarchar', 40, 0, 0, 0, 0),
      (N'location', N'nvarchar', 600, 0, 0, 1, 0),
      (N'notes', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U') AND [name] = N'PK_candidate_interviews'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.candidate_interviews', N'U') AND i.[name] = N'PK_candidate_interviews'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 107002, N'20261008_107: جدول candidate_interviews ناقص أو شكله غلط', 1;
GO
