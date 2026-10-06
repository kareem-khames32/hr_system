-- 20261006_093: التعليقات والإشارات على الطلبات والمهام (خطة التنفيذ — الدفعة B2.8).
-- جدول جديد:
--   comments: حوار مكتوب على كيان (طلب أو مهمة) — نوع الكيان ورقمه، وحساب الكاتب وموظفه وقت الكتابة، والنص، و«داخلي»
--     (مابيظهرش لصاحب الطلب)، والإشارات (JSON: أدوار الموضوع وأرقام التعليقات المردود عليها)، والوقت.
--     وفهرس بالكيان ورقم التعليق: الحوار بيتقري بيه مرتّب.
-- الكود بيشتغل قبل الترحيل ده (الطلبات والمهام زي ما هم، والتعليقات مرفوضة برسالتها) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة OBJECT_ID وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير: جدول قديم بنفس الاسم وبشكل تاني = الترحيل بيقف هنا من غير ما يلمسه
IF OBJECT_ID(N'dbo.comments', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments')) <> 9
   OR COL_LENGTH(N'dbo.comments', N'entityType') IS NULL OR COL_LENGTH(N'dbo.comments', N'authorEmployeeId') IS NULL
   OR COL_LENGTH(N'dbo.comments', N'mentions') IS NULL)
  THROW 93001, N'20261006_093: جدول comments موجود وأعمدته مش أعمدة التعليقات الـ9', 1;
GO

IF OBJECT_ID(N'dbo.comments', N'U') IS NULL
CREATE TABLE dbo.comments (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_comments] PRIMARY KEY,
  [entityType] nvarchar(30) NOT NULL,
  [entityId] int NOT NULL,
  [authorUserId] int NOT NULL,
  [authorEmployeeId] int NULL,
  [body] nvarchar(2000) NOT NULL,
  [internal] bit NOT NULL,
  [mentions] nvarchar(max) NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'IX_comments_entity')
  CREATE INDEX [IX_comments_entity] ON dbo.comments ([entityType], [entityId], [id]);
GO

-- تحقق: الأعمدة بأنواعها، والفهرس
IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments')) <> 9
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'entityType'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 60 AND is_nullable = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'authorEmployeeId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'body'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 4000 AND is_nullable = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'internal'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'mentions'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'createdAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0 AND default_object_id = 0)
  THROW 93002, N'20261006_093: أعمدة جدول comments ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.comments') AND name = N'IX_comments_entity' AND is_unique = 0)
  THROW 93003, N'20261006_093: الفهرس IX_comments_entity ناقص', 1;
GO
