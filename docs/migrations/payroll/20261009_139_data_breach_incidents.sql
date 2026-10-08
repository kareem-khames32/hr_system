-- 20261009_139: سجل حوادث تسريب البيانات (خطة التنفيذ — B4.8: حماية البيانات).
-- جدول جديد:
--   data_breach_incidents: كل حادثة بعنوانها وتفاصيلها، ووقت اكتشافها، وآخر موعد لإخطار الجهة المختصة (الاكتشاف + 72 ساعة — الخادم بيحسبه)،
--     وحالتها (OPEN لسه مااتبلّغتش / NOTIFIED اتبلّغت / CLOSED اتقفلت)، ووقت الإخطار وملاحظته، وعدد المتأثرين، ووقت الإقفال وملاحظته، ومين سجّل وعدّل وإمتى.
-- مفيش صفوف بتتضاف. مدد الاحتفاظ إعدادات في requests_config (من غير جدول).
-- الكود بيشتغل قبل الترحيل: شاشة «حماية البيانات» بتقول إن السجل ناقص، ومدد الاحتفاظ شغالة.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.data_breach_incidents', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'details', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'discoveredAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'notifyBy', N'datetime2', 8, 27, 7, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'notifiedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'notificationNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'affectedCount', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closeNote', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U') AND [name] = N'PK_data_breach_incidents'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U') AND i.[name] = N'PK_data_breach_incidents'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 139001, N'20261009_139: جدول data_breach_incidents موجود وشكله مش شكل سجل حوادث تسريب البيانات (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.data_breach_incidents', N'U') IS NULL
CREATE TABLE dbo.data_breach_incidents (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_data_breach_incidents] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [details] nvarchar(2000) NULL,
  [discoveredAt] datetime2 NOT NULL,
  [notifyBy] datetime2 NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [notifiedAt] datetime2 NULL,
  [notificationNote] nvarchar(500) NULL,
  [affectedCount] int NULL,
  [closedAt] datetime2 NULL,
  [closeNote] nvarchar(1000) NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL,
  [updatedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.data_breach_incidents', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'details', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'discoveredAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'notifyBy', N'datetime2', 8, 27, 7, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'notifiedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'notificationNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'affectedCount', N'int', 4, 10, 0, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closeNote', N'nvarchar', 2000, 0, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U') AND [name] = N'PK_data_breach_incidents'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.data_breach_incidents', N'U') AND i.[name] = N'PK_data_breach_incidents'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 139002, N'20261009_139: جدول data_breach_incidents ناقص أو شكله غلط', 1;
GO
