-- 20261007_102: التحقق بتطبيق مصادقة — TOTP (خطة التنفيذ — B2.17 الجزء ج).
-- جدول جديد:
--   user_totp: سر تطبيق المصادقة لحساب — صف واحد لكل حساب (فهرس فريد على userId). السر مشفّر (secret) ومابيرجعش في أي رد بعد
--     التفعيل؛ confirmedAt فاضي = تفعيل لسه مااتأكدش برمز (مابيتطلبش في الدخول)؛ lastStep = آخر خطوة زمنية اتقبل رمزها (الرمز مرة
--     واحدة)؛ failedCount وlockedUntil = رموز غلط ورا بعض بتقفل التحقق مدة.
-- الكود بيشتغل قبل الترحيل ده: ولا حساب مفعّل، وإلزام الأدوار واقف (محدش بيتقفل برّه النظام)، والتفعيل مرفوض برسالة الترحيل.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بعموده — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.user_totp', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'secret', N'nvarchar', 400, 0, 0, 0, 0),
      (N'confirmedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'lastStep', N'int', 4, 10, 0, 1, 0),
      (N'failedCount', N'int', 4, 10, 0, 0, 0),
      (N'lockedUntil', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'PK_user_totp'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND i.[name] = N'PK_user_totp'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 102001, N'20261007_102: جدول user_totp موجود وشكله مش شكل أسرار تطبيق المصادقة (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'UX_user_totp_user') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'UX_user_totp_user'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND i.[name] = N'UX_user_totp_user'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 102002, N'20261007_102: فهرس UX_user_totp_user موجود ومش فريد على الحساب', 1;
GO

IF OBJECT_ID(N'dbo.user_totp', N'U') IS NULL
CREATE TABLE dbo.user_totp (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_user_totp] PRIMARY KEY,
  [userId] int NOT NULL,
  [secret] nvarchar(200) NOT NULL,
  [confirmedAt] datetime2 NULL,
  [lastStep] int NULL,
  [failedCount] int NOT NULL,
  [lockedUntil] datetime2 NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'UX_user_totp_user')
  CREATE UNIQUE INDEX [UX_user_totp_user] ON dbo.user_totp ([userId]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.user_totp', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'secret', N'nvarchar', 400, 0, 0, 0, 0),
      (N'confirmedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'lastStep', N'int', 4, 10, 0, 1, 0),
      (N'failedCount', N'int', 4, 10, 0, 0, 0),
      (N'lockedUntil', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'PK_user_totp'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND i.[name] = N'PK_user_totp'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 102003, N'20261007_102: جدول user_totp ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'UX_user_totp_user') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND [name] = N'UX_user_totp_user'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.user_totp', N'U') AND i.[name] = N'UX_user_totp_user'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 102004, N'20261007_102: فهرس أسرار تطبيق المصادقة الفريد ناقص أو شكله غلط', 1;
GO
