-- 20261012_192: البريد — صندوق Exchange بتاع الموظف جوه النظام (إضافات المالك — B-ADD.16).
-- تلات جداول جديدة، ولا واحد فيهم فيه رسالة ولا مرفق ولا كلمة سر (البريد كله بيفضل على خادم البريد، وكلمة السر في ذاكرة الخادم مشفّرة للجلسة بس):
--   mail_accounts: اسم دخول الحساب في المجال (UPN) — بيتسجّل وقت «الدخول بحساب الشركة»، وبيه «افتح بريدك» بيعرف يدخل خادم البريد باسم مين. صف للحساب.
--   mail_shared_mailboxes: الصناديق المشتركة المعرّفة من الشاشة (العنوان بحروف صغيرة، والاسم، ومفعّل ولا لأ).
--   mail_shared_mailbox_users: مين من الحسابات يفتح أنهي صندوق مشترك من جوه النظام (خادم البريد نفسه بيتحقق من صلاحيته).
-- مفيش صفوف بتتضاف. الكود بيشتغل قبل الترحيل: صندوق الموظف نفسه شغال (اسم الدخول = بريد الحساب)، ومفيش صناديق مشتركة، وشاشتها بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل لكل جدول: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح والفهرس الفريد باسمهم
-- وأعمدتهم — مرة قبل أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- mail_accounts: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.mail_accounts', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'login', N'nvarchar', 400, 0, 0, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'PK_mail_accounts'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND i.[name] = N'PK_mail_accounts'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'UX_mail_accounts_user')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'UX_mail_accounts_user'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND i.[name] = N'UX_mail_accounts_user'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 192001, N'20261012_192: جدول mail_accounts موجود وشكله مش شكل أسماء دخول البريد (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.mail_accounts', N'U') IS NULL
CREATE TABLE dbo.mail_accounts (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_mail_accounts] PRIMARY KEY,
  [userId] int NOT NULL,
  [login] nvarchar(200) NOT NULL,
  [updatedAt] datetime2 NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'UX_mail_accounts_user')
  CREATE UNIQUE INDEX [UX_mail_accounts_user] ON dbo.mail_accounts ([userId]);
GO

-- mail_accounts: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.mail_accounts', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'login', N'nvarchar', 400, 0, 0, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'PK_mail_accounts'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND i.[name] = N'PK_mail_accounts'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND [name] = N'UX_mail_accounts_user'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_accounts', N'U') AND i.[name] = N'UX_mail_accounts_user'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 192002, N'20261012_192: جدول mail_accounts ناقص أو شكله غلط', 1;
GO

-- mail_shared_mailboxes: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'address', N'nvarchar', 400, 0, 0, 0, 0),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'PK_mail_shared_mailboxes'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND i.[name] = N'PK_mail_shared_mailboxes'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'UX_mail_shared_mailboxes_address')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'UX_mail_shared_mailboxes_address'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'address')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND i.[name] = N'UX_mail_shared_mailboxes_address'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 192003, N'20261012_192: جدول mail_shared_mailboxes موجود وشكله مش شكل الصناديق المشتركة (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') IS NULL
CREATE TABLE dbo.mail_shared_mailboxes (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_mail_shared_mailboxes] PRIMARY KEY,
  [address] nvarchar(200) NOT NULL,
  [name] nvarchar(200) NOT NULL,
  [isActive] bit NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [createdByUserId] int NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'UX_mail_shared_mailboxes_address')
  CREATE UNIQUE INDEX [UX_mail_shared_mailboxes_address] ON dbo.mail_shared_mailboxes ([address]);
GO

-- mail_shared_mailboxes: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'address', N'nvarchar', 400, 0, 0, 0, 0),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'PK_mail_shared_mailboxes'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND i.[name] = N'PK_mail_shared_mailboxes'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND [name] = N'UX_mail_shared_mailboxes_address'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'address')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') AND i.[name] = N'UX_mail_shared_mailboxes_address'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 192004, N'20261012_192: جدول mail_shared_mailboxes ناقص أو شكله غلط', 1;
GO

-- mail_shared_mailbox_users: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'mailboxId', N'int', 4, 10, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'PK_mail_shared_mailbox_users'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND i.[name] = N'PK_mail_shared_mailbox_users'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'UX_mail_shared_mailbox_users_pair')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'UX_mail_shared_mailbox_users_pair'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'mailboxId'), (2, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND i.[name] = N'UX_mail_shared_mailbox_users_pair'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 192005, N'20261012_192: جدول mail_shared_mailbox_users موجود وشكله مش شكل حسابات الصناديق المشتركة (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') IS NULL
CREATE TABLE dbo.mail_shared_mailbox_users (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_mail_shared_mailbox_users] PRIMARY KEY,
  [mailboxId] int NOT NULL,
  [userId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [createdByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'UX_mail_shared_mailbox_users_pair')
  CREATE UNIQUE INDEX [UX_mail_shared_mailbox_users_pair] ON dbo.mail_shared_mailbox_users ([mailboxId], [userId]);
GO

-- mail_shared_mailbox_users: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'mailboxId', N'int', 4, 10, 0, 0, 0),
      (N'userId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'PK_mail_shared_mailbox_users'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND i.[name] = N'PK_mail_shared_mailbox_users'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND [name] = N'UX_mail_shared_mailbox_users_pair'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'mailboxId'), (2, N'userId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') AND i.[name] = N'UX_mail_shared_mailbox_users_pair'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 192006, N'20261012_192: جدول mail_shared_mailbox_users ناقص أو شكله غلط', 1;
GO
