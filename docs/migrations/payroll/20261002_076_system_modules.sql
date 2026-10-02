-- 20261002_076: نظام تشغيل وقفل الموديولات (خطة التنفيذ — الجزء 3، الدفعة B0.2).
-- (1) جدول جديد system_modules: حالة كل موديول (key، enabled، آخر تغيير إمتى ومين، وجمهور تفعيل اختياري JSON بنفس «مين + فين» بتاع أنواع الطلبات).
-- (2) جدول جديد system_module_features: حالة المزايا الفرعية (key، enabled، آخر تغيير إمتى ومين).
-- (3) جدول جديد system_module_events: سجل التغييرات (مين فتح أو قفل أنهي موديول أو ميزة أو طبّق أنهي باقة، وإمتى) — إضافة بس؛
--     سجل مبدئي لحد ما سجل التدقيق المركزي ينزل (B2.1).
-- الجداول التلاتة فاضية بعد الترحيل ده: الموديول أو الميزة من غير صف = القيمة الافتراضية في سجل الكود (api/src/modules-registry/registry.ts)،
-- وكل الموجود النهارده افتراضيه «مفعّل» — فمفيش شاشة ولا endpoint ولا مهمة مجدولة بتتقفل بالترحيل ده. صفوف الشركة الحالية بتتزرع في ترحيل تاني (B0.4).
-- الكود بيشتغل قبل الترحيل ده وبعده: لو الجداول مش موجودة القراءة بتمشي على الافتراضي (والتغيير من الشاشة محتاج الترحيل).
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة OBJECT_ID. متوافق مع SQL Server 2019 (ISJSON موجودة من 2016).
-- المفاتيح الأساسية وقيد الـJSON والفهرس بأسماء صريحة مطابقة للكيانات SystemModule وSystemModuleFeature وSystemModuleEvent
-- (PK_system_modules، CK_system_modules_audience_json، PK_system_module_features، PK_system_module_events، IX_system_module_events_key)
-- عشان فرق المخطط يبقى صفرًا. مفيش قيم افتراضية = مفيش قيود DF.
SET NOCOUNT ON;
GO

-- (1) حالة الموديولات
IF OBJECT_ID(N'dbo.system_modules', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.system_modules (
    [key] nvarchar(60) NOT NULL,
    [enabled] bit NOT NULL,
    [enabledAt] datetime2 NULL,
    [enabledBy] int NULL,
    [audience] nvarchar(max) NULL,
    CONSTRAINT [PK_system_modules] PRIMARY KEY ([key]),
    CONSTRAINT [CK_system_modules_audience_json] CHECK ([audience] IS NULL OR ISJSON([audience]) = 1)
  );
END
GO

-- (2) حالة المزايا الفرعية
IF OBJECT_ID(N'dbo.system_module_features', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.system_module_features (
    [key] nvarchar(100) NOT NULL,
    [enabled] bit NOT NULL,
    [updatedAt] datetime2 NULL,
    [updatedBy] int NULL,
    CONSTRAINT [PK_system_module_features] PRIMARY KEY ([key])
  );
END
GO

-- (3) سجل التغييرات
IF OBJECT_ID(N'dbo.system_module_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.system_module_events (
    [id] int NOT NULL IDENTITY(1,1),
    [kind] nvarchar(20) NOT NULL,
    [key] nvarchar(100) NOT NULL,
    [enabled] bit NULL,
    [audience] nvarchar(max) NULL,
    [byUserId] int NOT NULL,
    [at] datetime2 NOT NULL,
    CONSTRAINT [PK_system_module_events] PRIMARY KEY ([id])
  );
END
GO

-- سجل موديول أو ميزة بعينها بالترتيب
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_system_module_events_key' AND object_id = OBJECT_ID(N'dbo.system_module_events'))
  CREATE INDEX [IX_system_module_events_key] ON dbo.system_module_events ([key], [id]);
GO

-- تحقق: الجداول التلاتة بأعمدتها وأنواعها وقابلية الفراغ، والمفاتيح الأساسية وقيد الـJSON والفهرس بأسمائهم
IF OBJECT_ID(N'dbo.system_modules', N'U') IS NULL
  THROW 76001, N'20261002_076: جدول system_modules غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_modules') AND name = N'key'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 120 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_modules') AND name = N'enabled'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_modules') AND name = N'enabledAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_modules') AND name = N'enabledBy'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_modules') AND name = N'audience'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
  THROW 76002, N'20261002_076: أعمدة system_modules ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_system_modules' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.system_modules'))
  THROW 76003, N'20261002_076: المفتاح الأساسي PK_system_modules غير موجود باسمه', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_system_modules_audience_json'
               AND parent_object_id = OBJECT_ID(N'dbo.system_modules') AND is_disabled = 0)
  THROW 76004, N'20261002_076: قيد CK_system_modules_audience_json غير موجود أو معطّل', 1;
IF OBJECT_ID(N'dbo.system_module_features', N'U') IS NULL
  THROW 76005, N'20261002_076: جدول system_module_features غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_features') AND name = N'key'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 200 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_features') AND name = N'enabled'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_features') AND name = N'updatedAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_features') AND name = N'updatedBy'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  THROW 76006, N'20261002_076: أعمدة system_module_features ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_system_module_features' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.system_module_features'))
  THROW 76007, N'20261002_076: المفتاح الأساسي PK_system_module_features غير موجود باسمه', 1;
IF OBJECT_ID(N'dbo.system_module_events', N'U') IS NULL
  THROW 76008, N'20261002_076: جدول system_module_events غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'kind'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'key'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 200 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'enabled'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'audience'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'byUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.system_module_events') AND name = N'at'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  THROW 76009, N'20261002_076: أعمدة system_module_events ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_system_module_events' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.system_module_events'))
  THROW 76010, N'20261002_076: المفتاح الأساسي PK_system_module_events غير موجود باسمه', 1;
IF (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.system_module_events') AND i.name = N'IX_system_module_events_key'
      AND ((ic.key_ordinal = 1 AND c.name = N'key') OR (ic.key_ordinal = 2 AND c.name = N'id'))) <> 2
  THROW 76011, N'20261002_076: فهرس IX_system_module_events_key على (key، id) غير موجود', 1;
GO
