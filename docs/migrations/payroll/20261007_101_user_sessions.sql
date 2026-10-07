-- 20261007_101: الجلسات النشطة (خطة التنفيذ — B2.17 الجزء ب).
-- جدول جديد:
--   user_sessions: صف لكل دخول ناجح — رقم الجلسة العشوائي اللي جوه توكنها (sid، فريد)، والحساب (userId) وإصداره وقت الدخول
--     (tokenVersion)، وإمتى اتفتحت (createdAt) وآخر نشاط (lastSeenAt) ونهاية مدتها (expiresAt)، والـIP والجهاز، وإمتى اتنهت وليه
--     (revokedAt وrevokedReason: LOGOUT أو USER أو PASSWORD).
-- الكود بيشتغل قبل الترحيل ده: الجلسة بتتفتح من غير رقم (زي الأول)، وشاشة «جلساتي» بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية (الجلسات المفتوحة وقت الترحيل بتفضل شغالة من غير صف لحد ما مدتها تخلص)، ومن غير افتراضي
-- (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بعموده — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.user_sessions', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'sid', N'nvarchar', 128, 0, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'tokenVersion', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'lastSeenAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'expiresAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'ip', N'nvarchar', 128, 0, 0, 1, 0),
      (N'userAgent', N'nvarchar', 800, 0, 0, 1, 0),
      (N'revokedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'revokedReason', N'nvarchar', 40, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'PK_user_sessions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND i.[name] = N'PK_user_sessions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 101001, N'20261007_101: جدول user_sessions موجود وشكله مش شكل الجلسات النشطة (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'UX_user_sessions_sid') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'UX_user_sessions_sid'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'sid')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND i.[name] = N'UX_user_sessions_sid'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 101002, N'20261007_101: فهرس UX_user_sessions_sid موجود ومش فريد على رقم الجلسة', 1;
GO

IF OBJECT_ID(N'dbo.user_sessions', N'U') IS NULL
CREATE TABLE dbo.user_sessions (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_user_sessions] PRIMARY KEY,
  [sid] nvarchar(64) NOT NULL,
  [userId] int NOT NULL,
  [tokenVersion] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [lastSeenAt] datetime2 NOT NULL,
  [expiresAt] datetime2 NOT NULL,
  [ip] nvarchar(64) NULL,
  [userAgent] nvarchar(400) NULL,
  [revokedAt] datetime2 NULL,
  [revokedReason] nvarchar(20) NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'UX_user_sessions_sid')
  CREATE UNIQUE INDEX [UX_user_sessions_sid] ON dbo.user_sessions ([sid]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.user_sessions', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'sid', N'nvarchar', 128, 0, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'tokenVersion', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'lastSeenAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'expiresAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'ip', N'nvarchar', 128, 0, 0, 1, 0),
      (N'userAgent', N'nvarchar', 800, 0, 0, 1, 0),
      (N'revokedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'revokedReason', N'nvarchar', 40, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'PK_user_sessions'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND i.[name] = N'PK_user_sessions'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 101003, N'20261007_101: جدول user_sessions ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'UX_user_sessions_sid') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND [name] = N'UX_user_sessions_sid'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'sid')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_sessions', N'U') AND i.[name] = N'UX_user_sessions_sid'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 101004, N'20261007_101: فهرس الجلسات الفريد ناقص أو شكله غلط', 1;
GO
