-- 20261007_096: قواعد إسناد المهام وتقييمها (خطة التنفيذ — «7.1 (إضافة المالك)» على الدفعة B2.5).
-- جدولين جداد:
--   task_extras: حالة قواعد الإسناد لمهمة، صف واحد لكل مهمة ليها حاجة منها، ومفتاحه رقم المهمة:
--     isPersonal: المهمة «شخصية» (الموظف كلّف نفسه) — بيشوفها صاحبها ومديره المباشر بس.
--     returnCount: عدد مرات «رجّعها للتعديل» (اللي بيدير المهمة رفض الإنجاز).
--     needsRating / rating / ratingNote: علامة «تحتاج تقييم»، وتقييم اللي كلّف بيها (1–5) وتعليقه — الميزة الفرعية tasks.rating.
--     extensionDueDate / extensionReason: طلب تمديد الميعاد المعلّق من المسؤول (الموعد المطلوب وسببه). فاضيين = مفيش طلب معلّق.
--     مهمة من غير صف = السلوك القايم (مهمة عادية، من غير رجوع ولا تقييم ولا طلب تمديد).
--   task_log: سجل المهمة — سطر لكل تغيير عليها (نوعه ونصه)، بالحساب اللي عمله وموظفه المتسجّل وقتها ووقته. بيتضاف عليه بس.
--     فهرس فريد (taskId، id): قراءة سجل مهمة بالترتيب.
-- في جداول لوحدها مش أعمدة على tasks: ترحيل 088 بيتحقق إن tasks بأعمدته العشرين بالظبط، فعمود زيادة عليه كان هيوقّف إعادة تشغيل 088.
-- الكود بيشتغل قبل الترحيل ده (المهام زي ما هي، والمهمة الشخصية والتمديد والتقييم وعدّاد الرجوع مقفولين برسالتهم، ومن غير سجل) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده، والفهرس
-- الفريد بأعمدته بالترتيب — مرة قبل أي تغيير (جدول أو فهرس موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يلمس حاجة)، ومرة بعد
-- التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.task_extras', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'taskId', N'int', 4, 10, 0, 0, 0),
      (N'isPersonal', N'bit', 1, 1, 0, 0, 0),
      (N'returnCount', N'int', 4, 10, 0, 0, 0),
      (N'needsRating', N'bit', 1, 1, 0, 0, 0),
      (N'rating', N'tinyint', 1, 3, 0, 1, 0),
      (N'ratingNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'extensionDueDate', N'date', 3, 10, 0, 1, 0),
      (N'extensionReason', N'nvarchar', 1000, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.task_extras', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_extras', N'U') AND [name] = N'PK_task_extras'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'taskId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_extras', N'U') AND i.[name] = N'PK_task_extras'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 96001, N'20261007_096: جدول task_extras موجود وشكله مش شكل قواعد إسناد المهام (الأعمدة أو المفتاح)', 1;
IF OBJECT_ID(N'dbo.task_log', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'taskId', N'int', 4, 10, 0, 0, 0),
      (N'event', N'nvarchar', 80, 0, 0, 0, 0),
      (N'actorUserId', N'int', 4, 10, 0, 0, 0),
      (N'actorEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'body', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.task_log', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'PK_task_log'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND i.[name] = N'PK_task_log'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 96002, N'20261007_096: جدول task_log موجود وشكله مش شكل سجل المهمة (الأعمدة أو المفتاح)', 1;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'UX_task_log_task_id') AND (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'UX_task_log_task_id'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'taskId'), (2, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND i.[name] = N'UX_task_log_task_id'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 96003, N'20261007_096: فهرس UX_task_log_task_id موجود ومش فريد على المهمة ورقم السطر بالترتيب', 1;
GO

IF OBJECT_ID(N'dbo.task_extras', N'U') IS NULL
CREATE TABLE dbo.task_extras (
  [taskId] int NOT NULL CONSTRAINT [PK_task_extras] PRIMARY KEY,
  [isPersonal] bit NOT NULL,
  [returnCount] int NOT NULL,
  [needsRating] bit NOT NULL,
  [rating] tinyint NULL,
  [ratingNote] nvarchar(500) NULL,
  [extensionDueDate] date NULL,
  [extensionReason] nvarchar(500) NULL
);
GO

IF OBJECT_ID(N'dbo.task_log', N'U') IS NULL
CREATE TABLE dbo.task_log (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_task_log] PRIMARY KEY,
  [taskId] int NOT NULL,
  [event] nvarchar(40) NOT NULL,
  [actorUserId] int NOT NULL,
  [actorEmployeeId] int NULL,
  [body] nvarchar(1000) NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'UX_task_log_task_id')
  CREATE UNIQUE INDEX [UX_task_log_task_id] ON dbo.task_log ([taskId], [id]);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.task_extras', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'taskId', N'int', 4, 10, 0, 0, 0),
      (N'isPersonal', N'bit', 1, 1, 0, 0, 0),
      (N'returnCount', N'int', 4, 10, 0, 0, 0),
      (N'needsRating', N'bit', 1, 1, 0, 0, 0),
      (N'rating', N'tinyint', 1, 3, 0, 1, 0),
      (N'ratingNote', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'extensionDueDate', N'date', 3, 10, 0, 1, 0),
      (N'extensionReason', N'nvarchar', 1000, 0, 0, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.task_extras', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_extras', N'U') AND [name] = N'PK_task_extras'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'taskId')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_extras', N'U') AND i.[name] = N'PK_task_extras'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 96004, N'20261007_096: جدول task_extras ناقص أو شكله غلط', 1;
IF OBJECT_ID(N'dbo.task_log', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'taskId', N'int', 4, 10, 0, 0, 0),
      (N'event', N'nvarchar', 80, 0, 0, 0, 0),
      (N'actorUserId', N'int', 4, 10, 0, 0, 0),
      (N'actorEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'body', N'nvarchar', 2000, 0, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.task_log', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'PK_task_log'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND i.[name] = N'PK_task_log'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 96005, N'20261007_096: جدول task_log ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'UX_task_log_task_id') OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND [name] = N'UX_task_log_task_id'
      AND [is_unique] = 1 AND [is_primary_key] = 0 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'taskId'), (2, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.task_log', N'U') AND i.[name] = N'UX_task_log_task_id'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name]))
  THROW 96006, N'20261007_096: فهرس سجل المهمة الفريد ناقص أو شكله غلط', 1;
GO
