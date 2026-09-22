-- 20260922_066: الدخول بحساب الشركة (Active Directory) والتحقق بخطوتين برمز بريد (قرار المالك 22 سبتمبر).
-- الشركة عندها Active Directory عادي على الشبكة (بلا Entra ولا ADFS) والموظفين بيدخلوا بـ name@maharah.local.
-- المجال بيثبت الهوية بس: الأدوار والصلاحيات ونطاق الفروع بيفضلوا من جداولنا، ومفيش مجموعة AD بتتقري ولا بتمنح حاجة.
--
-- (1) عمود جديد users.domainObjectGuid (nvarchar(64) NULL) + فهرس فريد **مفلتر** UX_users_domain_object_guid.
--     الربط بالـobjectGUID لأنه ثابت في المجال: إعادة تسمية الحساب أو تغيير بريده مابتكسرش الربط (بخلاف البريد والـUPN).
--     الفهرس مفلتر (WHERE IS NOT NULL) لأن الفهرس الفريد العادي في SQL Server بيسمح بصف واحد NULL بس، وعندنا
--     كل حسابات البريد+كلمة المرور NULL. NULL = حساب عادي مش مربوط بمجال.
-- (2) جدول جديد login_challenges: حالة الدخول المعلَّقة للتحقق بخطوتين. الصف ده **مش جلسة ومش توكن**:
--     مايفتحش أي مسار. رمز الـ6 أرقام مخزَّن bcrypt (codeHash) — الرمز الصريح مايتخزنش ولا يتسجّل،
--     وله انتهاء (expiresAt) واستخدام مرة واحدة (consumedAt) وحد محاولات (attempts/lockedAt) ومهلة إعادة إرسال
--     (lastSentAt/resendCount)، ومربوط بمحاولة دخول واحدة بتوكنها الفريد.
-- (3) مفتاح الإعداد auth.two_factor_enabled بقيمة 'false' — **بيتسلّم مقفول**. مايتفتحش إلا بعد ما المالك يتأكد
--     إن البريد بيشتغل (POST /auth/mail-test أو node api/scripts/mail-selftest.cjs)، وبيتقفل من الترمينال بلا
--     تطبيق بـ node api/scripts/two-factor-off.cjs (مفتاح الطوارئ). لو المفتاح موجود قبل كده قيمته ماتتلمسش.
--
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE، ولا تغيير على أي عمود أو جدول قائم، ولا تعبئة رجعية
-- (كل الحسابات الحالية domainObjectGuid = NULL فمحدش يتقفل ومحدش يتربط). آمن للتكرار: العمود بحارس COL_LENGTH،
-- الجدول بحارس OBJECT_ID، الفهارس بحارس sys.indexes، والمفتاح بـNOT EXISTS.
-- أسماء القيد والفهارس صريحة ومطابقة لكيانات TypeORM (PK_login_challenges، UX_login_challenges_token،
-- IX_login_challenges_user، UX_users_domain_object_guid) حتى يبقى فرق المخطط صفرًا، ومفيش أي قيد افتراضي
-- مُدار على الجدول الجديد (الخدمة بتكتب كل الأعمدة). متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- (1) ربط الحساب بحساب المجال
IF COL_LENGTH(N'dbo.users', N'domainObjectGuid') IS NULL
  ALTER TABLE dbo.users ADD [domainObjectGuid] nvarchar(64) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_users_domain_object_guid' AND object_id = OBJECT_ID(N'dbo.users'))
  CREATE UNIQUE INDEX [UX_users_domain_object_guid] ON dbo.users ([domainObjectGuid]) WHERE [domainObjectGuid] IS NOT NULL;
GO

-- (2) حالة الدخول المعلَّقة (التحقق بخطوتين)
IF OBJECT_ID(N'dbo.login_challenges', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.login_challenges (
    [id] int NOT NULL IDENTITY(1,1),
    [token] nvarchar(64) NOT NULL,
    [userId] int NOT NULL,
    [codeHash] nvarchar(200) NOT NULL,
    [method] nvarchar(20) NOT NULL,
    [sentTo] nvarchar(200) NOT NULL,
    [expiresAt] datetime2 NOT NULL,
    [attempts] int NOT NULL,
    [resendCount] int NOT NULL,
    [lastSentAt] datetime2 NOT NULL,
    [consumedAt] datetime2 NULL,
    [lockedAt] datetime2 NULL,
    [createdAt] datetime2 NOT NULL,
    CONSTRAINT [PK_login_challenges] PRIMARY KEY ([id])
  );
END
GO

-- توكن واحد لكل محاولة دخول: طلبان متوازيان مايشاركوش نفس الحالة المعلَّقة
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_login_challenges_token' AND object_id = OBJECT_ID(N'dbo.login_challenges'))
  CREATE UNIQUE INDEX [UX_login_challenges_token] ON dbo.login_challenges ([token]);
GO

-- إغلاق الحالات المفتوحة لنفس الحساب عند دخول جديد، والتنضيف الدوري
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_login_challenges_user' AND object_id = OBJECT_ID(N'dbo.login_challenges'))
  CREATE INDEX [IX_login_challenges_user] ON dbo.login_challenges ([userId]);
GO

-- (3) مفتاح التحقق بخطوتين — مقفول، ولا يُلمس لو موجود
INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value]
FROM (VALUES (N'auth.two_factor_enabled', N'false')) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

-- تحقق: العمود والفهرس المفلتر، والجدول بأعمدته وقيده وفهرسيه، والمفتاح موجود ومقفول، ومحدش اتربط بالترحيل
IF COL_LENGTH(N'dbo.users', N'domainObjectGuid') IS NULL
  THROW 66001, N'20260922_066: عمود domainObjectGuid ناقص في users', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
               JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
               WHERE i.object_id = OBJECT_ID(N'dbo.users') AND i.name = N'UX_users_domain_object_guid'
                 AND i.is_unique = 1 AND i.has_filter = 1 AND c.name = N'domainObjectGuid')
  THROW 66002, N'20260922_066: فهرس ربط المجال مش موجود فريدًا ومفلترًا باسم TypeORM', 1;
IF OBJECT_ID(N'dbo.login_challenges', N'U') IS NULL
  THROW 66003, N'20260922_066: جدول حالات الدخول المعلَّقة غير موجود بعد الترحيل', 1;
IF COL_LENGTH(N'dbo.login_challenges', N'codeHash') IS NULL OR COL_LENGTH(N'dbo.login_challenges', N'expiresAt') IS NULL
  OR COL_LENGTH(N'dbo.login_challenges', N'attempts') IS NULL OR COL_LENGTH(N'dbo.login_challenges', N'consumedAt') IS NULL
  OR COL_LENGTH(N'dbo.login_challenges', N'lockedAt') IS NULL OR COL_LENGTH(N'dbo.login_challenges', N'resendCount') IS NULL
  OR COL_LENGTH(N'dbo.login_challenges', N'lastSentAt') IS NULL OR COL_LENGTH(N'dbo.login_challenges', N'method') IS NULL
  OR COL_LENGTH(N'dbo.login_challenges', N'sentTo') IS NULL OR COL_LENGTH(N'dbo.login_challenges', N'createdAt') IS NULL
  THROW 66004, N'20260922_066: أعمدة حالات الدخول المعلَّقة ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_login_challenges' AND parent_object_id = OBJECT_ID(N'dbo.login_challenges'))
  THROW 66005, N'20260922_066: المفتاح الأساسي PK_login_challenges غير موجود باسمه', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_login_challenges_token' AND is_unique = 1 AND object_id = OBJECT_ID(N'dbo.login_challenges'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_login_challenges_user' AND object_id = OBJECT_ID(N'dbo.login_challenges'))
  THROW 66006, N'20260922_066: فهارس حالات الدخول المعلَّقة ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.requests_config WHERE [key] = N'auth.two_factor_enabled')
  THROW 66007, N'20260922_066: مفتاح التحقق بخطوتين غير موجود', 1;
-- إضافي بالحرف: العمود بيقبل NULL فمفيش حساب قائم اتغيّر ولا اتقفل، والربط بيحصل عند أول دخول ناجح بس
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = N'domainObjectGuid' AND is_nullable = 1)
  THROW 66008, N'20260922_066: عمود ربط المجال لازم يقبل NULL (الترحيل إضافي ومايقفلش أي حساب قائم)', 1;
GO
