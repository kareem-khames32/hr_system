-- 20261003_078: أمان الدخول (خطة التنفيذ — الدفعة B1.3).
-- (1) عمودين على users: failedLoginCount int NULL (محاولات كلمة السر الغلط ورا بعض — NULL = صفر)، وlockedUntil datetime2 NULL (الحساب مقفول لحد إمتى).
--     من غير افتراضي عن قصد: الكيان بيستبعدهم من الإنشاء والحفظ والقراءة، فإنشاء حساب شغال قبل الترحيل وبعده.
--     الحسابات الموجودة: العداد صفر ومفيش قفل = نفس السلوك النهارده بالحرف.
-- (2) جدول جديد login_events: سجل الدخول (كل محاولة بوقتها ونتيجتها والـIP والجهاز، وفك القفل ومين فكه) — إضافة بس، فاضي بعد الترحيل.
-- الكود بيشتغل قبل الترحيل ده (من غير قفل ولا سجل، ودخول زي الأول بالحرف) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة COL_LENGTH وOBJECT_ID. متوافق مع SQL Server 2019.
-- الأسماء بالحرف اللي الكيانات بتطلعها عشان فرق المخطط يبقى صفرًا:
-- وPK_login_events وIX_login_events_at وIX_login_events_user (صريحة في الكيان LoginEvent).
SET NOCOUNT ON;
GO

-- (1) القفل المؤقت على حسابات الدخول
IF COL_LENGTH(N'dbo.users', N'failedLoginCount') IS NULL
  ALTER TABLE dbo.users ADD [failedLoginCount] int NULL;
GO
IF COL_LENGTH(N'dbo.users', N'lockedUntil') IS NULL
  ALTER TABLE dbo.users ADD [lockedUntil] datetime2 NULL;
GO

-- (2) سجل الدخول
IF OBJECT_ID(N'dbo.login_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.login_events (
    [id] int NOT NULL IDENTITY(1,1),
    [at] datetime2 NOT NULL,
    [userId] int NULL,
    [identifier] nvarchar(200) NOT NULL,
    [method] nvarchar(10) NOT NULL,
    [outcome] nvarchar(30) NOT NULL,
    [ip] nvarchar(64) NULL,
    [userAgent] nvarchar(400) NULL,
    [actorUserId] int NULL,
    CONSTRAINT [PK_login_events] PRIMARY KEY ([id])
  );
END
GO

-- السجل بالوقت (الشاشة)، ومحاولات حساب بعينه بالوقت
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_login_events_at' AND object_id = OBJECT_ID(N'dbo.login_events'))
  CREATE INDEX [IX_login_events_at] ON dbo.login_events ([at]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_login_events_user' AND object_id = OBJECT_ID(N'dbo.login_events'))
  CREATE INDEX [IX_login_events_user] ON dbo.login_events ([userId], [at]);
GO

-- تحقق: العمودين بنوعهم وقابلية الفراغ ومن غير افتراضي، والجدول بأعمدته ومفتاحه وفهرسيه بأسمائهم
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = N'failedLoginCount'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = N'lockedUntil'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 1)
  THROW 78001, N'20261003_078: عمودي القفل على users ناقصين أو بنوع غلط', 1;
IF EXISTS (SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
           WHERE d.parent_object_id = OBJECT_ID(N'dbo.users') AND c.name IN (N'failedLoginCount', N'lockedUntil'))
  THROW 78002, N'20261003_078: عمودي القفل على users لازم يكونوا من غير افتراضي (زي الكيان)', 1;
IF OBJECT_ID(N'dbo.login_events', N'U') IS NULL
  THROW 78003, N'20261003_078: جدول login_events غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'id'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'at'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'userId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'identifier'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 400 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'method'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 20 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'outcome'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 60 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'ip'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 128 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'userAgent'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 800 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.login_events') AND name = N'actorUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  THROW 78004, N'20261003_078: أعمدة login_events ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_login_events' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.login_events'))
  THROW 78005, N'20261003_078: المفتاح الأساسي PK_login_events غير موجود باسمه', 1;
IF (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.login_events') AND i.name = N'IX_login_events_at' AND ic.key_ordinal = 1 AND c.name = N'at') <> 1
  OR (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.login_events') AND i.name = N'IX_login_events_user'
      AND ((ic.key_ordinal = 1 AND c.name = N'userId') OR (ic.key_ordinal = 2 AND c.name = N'at'))) <> 2
  THROW 78006, N'20261003_078: فهرسي login_events (at) و(userId، at) غير موجودين', 1;
GO
