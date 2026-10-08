-- 20261009_119: تسجيل الموظفين في جلسات التدريب (خطة التنفيذ — B3.9 الجزء أ: خادم التدريب).
-- جدول جديد:
--   training_enrollments: موظف في جلسة (training_sessions.id) — الحالة (ENROLLED مسجّل / ATTENDED حضر / COMPLETED أكمل / ABSENT غاب / CANCELLED اتلغى)،
--     والنتيجة، وتقييم الموظف للتدريب (من 1 لـ5) وتعليقه، وطلب التدريب اللي اتسجّل منه (requests.id)، ومستند الشهادة (employee_documents.id)،
--     ومين سجّله وإمتى، وإمتى أكمل.
-- بيتطبق بعد ترحيل 20261009_118 (training_sessions).
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.training_enrollments', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'sessionId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'result', N'nvarchar', 400, 0, 0, 1, 0),
      (N'rating', N'int', 4, 10, 0, 1, 0),
      (N'ratingComment', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'requestId', N'int', 4, 10, 0, 1, 0),
      (N'documentId', N'int', 4, 10, 0, 1, 0),
      (N'enrolledByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'completedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U') AND [name] = N'PK_training_enrollments'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U') AND i.[name] = N'PK_training_enrollments'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 119001, N'20261009_119: جدول training_enrollments موجود وشكله مش شكل تسجيل الموظفين في جلسات التدريب (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.training_enrollments', N'U') IS NULL
CREATE TABLE dbo.training_enrollments (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_training_enrollments] PRIMARY KEY,
  [sessionId] int NOT NULL,
  [employeeId] int NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [result] nvarchar(200) NULL,
  [rating] int NULL,
  [ratingComment] nvarchar(500) NULL,
  [requestId] int NULL,
  [documentId] int NULL,
  [enrolledByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [completedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.training_enrollments', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'sessionId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'result', N'nvarchar', 400, 0, 0, 1, 0),
      (N'rating', N'int', 4, 10, 0, 1, 0),
      (N'ratingComment', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'requestId', N'int', 4, 10, 0, 1, 0),
      (N'documentId', N'int', 4, 10, 0, 1, 0),
      (N'enrolledByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'completedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U') AND [name] = N'PK_training_enrollments'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.training_enrollments', N'U') AND i.[name] = N'PK_training_enrollments'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 119002, N'20261009_119: جدول training_enrollments ناقص أو شكله غلط', 1;
GO
