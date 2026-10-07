-- 20261007_100: الإعلانات (خطة التنفيذ — B2.16 الجزء أ).
-- جدولين جداد:
--   announcements: إعلان بعنوان ونص، وجمهور «مين + فين» (audience: نفس صيغة جمهور أنواع الطلبات؛ الفاضي = كل الشركة)، وتاريخ نشر
--     (publishDate) وانتهاء (expiryDate؛ الفاضي = من غير انتهاء)، ومثبّت (pinned)، ومحتاج إقرار قراءة (requiresRead)، وحالة
--     (status: DRAFT أو PUBLISHED أو WITHDRAWN)، ومين عمله وإمتى واتنشر إمتى.
--   announcement_reads: مين قرا الإعلان وإمتى — سطر واحد لكل موظف (فهرس فريد على الإعلان والموظف).
-- الكود بيشتغل قبل الترحيل ده: لوحة الإعلانات فاضية، والإدارة مرفوضة برسالة الترحيل، والموديول نفسه مقفول افتراضيًا.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بأعمدته بالترتيب — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد
-- التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.announcements', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'body', N'nvarchar', 8000, 0, 0, 0, 0),
      (N'audience', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'publishDate', N'date', 3, 10, 0, 0, 0),
      (N'expiryDate', N'date', 3, 10, 0, 1, 0),
      (N'pinned', N'bit', 1, 1, 0, 0, 0),
      (N'requiresRead', N'bit', 1, 1, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'publishedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.announcements', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcements', N'U') AND [name] = N'PK_announcements'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcements', N'U') AND i.[name] = N'PK_announcements'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 100001, N'20261007_100: جدول announcements موجود وشكله مش شكل الإعلانات (الأعمدة أو المفتاح)', 1;
IF OBJECT_ID(N'dbo.announcement_reads', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'announcementId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'readAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'PK_announcement_reads'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND i.[name] = N'PK_announcement_reads'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 100002, N'20261007_100: جدول announcement_reads موجود وشكله مش شكل قراءات الإعلانات (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'UX_announcement_reads_announcement_employee') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'UX_announcement_reads_announcement_employee'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'announcementId'), (2, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND i.[name] = N'UX_announcement_reads_announcement_employee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 100003, N'20261007_100: فهرس UX_announcement_reads_announcement_employee موجود ومش فريد على الإعلان والموظف بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.announcements', N'U') IS NULL
CREATE TABLE dbo.announcements (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_announcements] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [body] nvarchar(4000) NOT NULL,
  [audience] nvarchar(2000) NULL,
  [publishDate] date NOT NULL,
  [expiryDate] date NULL,
  [pinned] bit NOT NULL,
  [requiresRead] bit NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [publishedAt] datetime2 NULL
);
GO

IF OBJECT_ID(N'dbo.announcement_reads', N'U') IS NULL
CREATE TABLE dbo.announcement_reads (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_announcement_reads] PRIMARY KEY,
  [announcementId] int NOT NULL,
  [employeeId] int NOT NULL,
  [userId] int NOT NULL,
  [readAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'UX_announcement_reads_announcement_employee')
  CREATE UNIQUE INDEX [UX_announcement_reads_announcement_employee] ON dbo.announcement_reads ([announcementId], [employeeId]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.announcements', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'body', N'nvarchar', 8000, 0, 0, 0, 0),
      (N'audience', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'publishDate', N'date', 3, 10, 0, 0, 0),
      (N'expiryDate', N'date', 3, 10, 0, 1, 0),
      (N'pinned', N'bit', 1, 1, 0, 0, 0),
      (N'requiresRead', N'bit', 1, 1, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'publishedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.announcements', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcements', N'U') AND [name] = N'PK_announcements'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcements', N'U') AND i.[name] = N'PK_announcements'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 100004, N'20261007_100: جدول announcements ناقص أو شكله غلط', 1;
IF OBJECT_ID(N'dbo.announcement_reads', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'announcementId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'readAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'PK_announcement_reads'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND i.[name] = N'PK_announcement_reads'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 100005, N'20261007_100: جدول announcement_reads ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'UX_announcement_reads_announcement_employee') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND [name] = N'UX_announcement_reads_announcement_employee'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'announcementId'), (2, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.announcement_reads', N'U') AND i.[name] = N'UX_announcement_reads_announcement_employee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 100006, N'20261007_100: فهرس قراءات الإعلانات الفريد ناقص أو شكله غلط', 1;
GO
