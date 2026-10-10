-- 20261011_187: قنوات الإشعارات — البريد والواتساب (إضافات المالك — B-ADD.5: التحكم في البريد والواتساب).
-- تلات جداول جديدة:
--   notification_channel_settings: إعداد كل قناة على مستوى الشركة (صف للبريد: خادم SMTP والمرسل؛ وصف للواتساب: معرّفات Meta) — config نص JSON
--     من غير أسرار، وsecret كلمة سر البريد أو توكن الواتساب مختوم (AES-256-GCM بمفتاح مشتق من سر الخادم)، وenabled القناة مفتوحة ولا لأ.
--   notification_event_rules: لكل حدث — القنوات المفتوحة له (داخل النظام / بريد / واتساب)، وهل هو «إلزامي»، وربط قالب Meta لكل لغة (JSON).
--   employee_whatsapp_numbers: رقم واتساب الموظف (E.164 أرقام بس) — جدول لوحده عشان قراءة ملف الموظف ماتتأثرش قبل الترحيل.
-- مفيش صفوف بتتضاف: من غير صف البريد بإعداد الخادم الحالي (api/.env) ومفتاح الشركة القايم، والواتساب مقفول، وكل حدث بسلوكه الحالي.
-- الكود بيشتغل قبل الترحيل: المحرك بسلوكه الحالي بالحرف، وشاشة «قنوات الإشعارات» بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل لكل جدول: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح والفهرس الفريد باسمهم
-- وعمودهم — مرة قبل أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- notification_channel_settings: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.notification_channel_settings', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'channel', N'nvarchar', 40, 0, 0, 0, 0),
      (N'enabled', N'bit', 1, 1, 0, 0, 0),
      (N'config', N'nvarchar', -1, 0, 0, 0, 0),
      (N'secret', N'nvarchar', -1, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'PK_notification_channel_settings'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND i.[name] = N'PK_notification_channel_settings'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'UX_notification_channel_settings_channel')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'UX_notification_channel_settings_channel'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'channel')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND i.[name] = N'UX_notification_channel_settings_channel'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 187001, N'20261011_187: جدول notification_channel_settings موجود وشكله مش شكل إعداد قنوات الإشعارات (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.notification_channel_settings', N'U') IS NULL
CREATE TABLE dbo.notification_channel_settings (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notification_channel_settings] PRIMARY KEY,
  [channel] nvarchar(20) NOT NULL,
  [enabled] bit NOT NULL,
  [config] nvarchar(max) NOT NULL,
  [secret] nvarchar(max) NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'UX_notification_channel_settings_channel')
  CREATE UNIQUE INDEX [UX_notification_channel_settings_channel] ON dbo.notification_channel_settings ([channel]);
GO

-- notification_channel_settings: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.notification_channel_settings', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'channel', N'nvarchar', 40, 0, 0, 0, 0),
      (N'enabled', N'bit', 1, 1, 0, 0, 0),
      (N'config', N'nvarchar', -1, 0, 0, 0, 0),
      (N'secret', N'nvarchar', -1, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'PK_notification_channel_settings'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND i.[name] = N'PK_notification_channel_settings'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND [name] = N'UX_notification_channel_settings_channel'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'channel')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_channel_settings', N'U') AND i.[name] = N'UX_notification_channel_settings_channel'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 187002, N'20261011_187: جدول notification_channel_settings ناقص أو شكله غلط', 1;
GO

-- notification_event_rules: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.notification_event_rules', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'eventCode', N'nvarchar', 120, 0, 0, 0, 0),
      (N'inApp', N'bit', 1, 1, 0, 0, 0),
      (N'email', N'bit', 1, 1, 0, 0, 0),
      (N'whatsapp', N'bit', 1, 1, 0, 0, 0),
      (N'mandatory', N'bit', 1, 1, 0, 0, 0),
      (N'whatsappTemplates', N'nvarchar', -1, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'PK_notification_event_rules'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND i.[name] = N'PK_notification_event_rules'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'UX_notification_event_rules_event')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'UX_notification_event_rules_event'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'eventCode')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND i.[name] = N'UX_notification_event_rules_event'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 187003, N'20261011_187: جدول notification_event_rules موجود وشكله مش شكل قواعد أحداث الإشعارات (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.notification_event_rules', N'U') IS NULL
CREATE TABLE dbo.notification_event_rules (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notification_event_rules] PRIMARY KEY,
  [eventCode] nvarchar(60) NOT NULL,
  [inApp] bit NOT NULL,
  [email] bit NOT NULL,
  [whatsapp] bit NOT NULL,
  [mandatory] bit NOT NULL,
  [whatsappTemplates] nvarchar(max) NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'UX_notification_event_rules_event')
  CREATE UNIQUE INDEX [UX_notification_event_rules_event] ON dbo.notification_event_rules ([eventCode]);
GO

-- notification_event_rules: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.notification_event_rules', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'eventCode', N'nvarchar', 120, 0, 0, 0, 0),
      (N'inApp', N'bit', 1, 1, 0, 0, 0),
      (N'email', N'bit', 1, 1, 0, 0, 0),
      (N'whatsapp', N'bit', 1, 1, 0, 0, 0),
      (N'mandatory', N'bit', 1, 1, 0, 0, 0),
      (N'whatsappTemplates', N'nvarchar', -1, 0, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'PK_notification_event_rules'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND i.[name] = N'PK_notification_event_rules'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND [name] = N'UX_notification_event_rules_event'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'eventCode')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.notification_event_rules', N'U') AND i.[name] = N'UX_notification_event_rules_event'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 187004, N'20261011_187: جدول notification_event_rules ناقص أو شكله غلط', 1;
GO

-- employee_whatsapp_numbers: تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'number', N'nvarchar', 40, 0, 0, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'PK_employee_whatsapp_numbers'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND i.[name] = N'PK_employee_whatsapp_numbers'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'UX_employee_whatsapp_numbers_employee')
      AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'UX_employee_whatsapp_numbers_employee'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND i.[name] = N'UX_employee_whatsapp_numbers_employee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))))
  THROW 187005, N'20261011_187: جدول employee_whatsapp_numbers موجود وشكله مش شكل أرقام واتساب الموظفين (الأعمدة أو المفتاح أو الفهرس)', 1;
GO

IF OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') IS NULL
CREATE TABLE dbo.employee_whatsapp_numbers (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employee_whatsapp_numbers] PRIMARY KEY,
  [employeeId] int NOT NULL,
  [number] nvarchar(20) NOT NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'UX_employee_whatsapp_numbers_employee')
  CREATE UNIQUE INDEX [UX_employee_whatsapp_numbers_employee] ON dbo.employee_whatsapp_numbers ([employeeId]);
GO

-- employee_whatsapp_numbers: تحقق بعد التنفيذ — نفس الشكل كامل
IF OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'number', N'nvarchar', 40, 0, 0, 0, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'PK_employee_whatsapp_numbers'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND i.[name] = N'PK_employee_whatsapp_numbers'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND [name] = N'UX_employee_whatsapp_numbers_employee'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'employeeId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers', N'U') AND i.[name] = N'UX_employee_whatsapp_numbers_employee'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 187006, N'20261011_187: جدول employee_whatsapp_numbers ناقص أو شكله غلط', 1;
GO
