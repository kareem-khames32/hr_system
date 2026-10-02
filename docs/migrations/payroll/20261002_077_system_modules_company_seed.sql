-- 20261002_077: حالة الموديولات للشركة الحالية (خطة التنفيذ — الدفعة B0.4). بيتطبق بعد 076.
-- الهدف: صفوف صريحة بالحالة اللي الشركة عليها النهارده، فماحدش يحس بأي فرق — ولو افتراضي السجل اتغيّر في إصدار جاي حالة الشركة ماتتغيرش.
-- (1) الباقة الأساسية: صف «مفعّل» لكل موديول اختياري موجود (الحضور، الورديات، الإضافي، الإجازات، الرواتب، السلف، المصروفات،
--     التهيئة، العهد، إنهاء الخدمة). الموديولات الأساسية مالهاش صفوف: مابتتقفلش.
-- (2) التوظيف: مفعّل لو جدول المرشحين فيه بيانات، أو فيه دور مفعّل أو مستخدم معاه «المرشحون والتعيين» (candidates.manage)؛ غير كده مقفول.
-- (3) ميزة «شاشات العرض التجريبية» (platform.demo_screens): مفعّلة. الشاشات دي (الأداء، التدريب، إضافة وظيفة، المقابلات، العروض،
--     التقارير المخصصة) ظاهرة في الشركة النهارده، والمالك قال يوم 30 سبتمبر تفضل لحد ما يقرر — يقفلها بضغطة من «الإعدادات ← الموديولات».
--     أي قاعدة جديدة من غير الصف ده الشاشات دي مقفولة فيها (افتراضي السجل).
-- إضافة صفوف بس في جدولين جداد من 076: بلا DROP ولا DELETE ولا UPDATE، ولا لمس لأي جدول قائم. آمن للتكرار: كل INSERT بشرط إن الصف
-- مش موجود، فصف غيّره المالك من الشاشة مايتغيرش لو الملف اتشغّل تاني. متوافق مع SQL Server 2019.
-- enabledAt وenabledBy فاضيين = صف مزروع بالترحيل (مش تغيير من مستخدم)، ومفيش أحداث في system_module_events.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.system_modules', N'U') IS NULL OR OBJECT_ID(N'dbo.system_module_features', N'U') IS NULL
  THROW 77001, N'20261002_077: جدولا الموديولات غير موجودين — طبّق 20261002_076 الأول', 1;
GO

-- (1) الباقة الأساسية
INSERT INTO dbo.system_modules ([key], [enabled], [enabledAt], [enabledBy], [audience])
SELECT v.[key], 1, NULL, NULL, NULL
FROM (VALUES (N'attendance'), (N'shifts'), (N'overtime'), (N'leave'), (N'payroll'), (N'loans'), (N'expenses'),
             (N'onboarding'), (N'custody'), (N'offboarding')) AS v([key])
WHERE NOT EXISTS (SELECT 1 FROM dbo.system_modules AS m WHERE m.[key] = v.[key]);
GO

-- (2) التوظيف حسب استخدام الشركة الفعلي
IF NOT EXISTS (SELECT 1 FROM dbo.system_modules WHERE [key] = N'recruitment')
  INSERT INTO dbo.system_modules ([key], [enabled], [enabledAt], [enabledBy], [audience])
  SELECT N'recruitment',
         CASE WHEN EXISTS (SELECT 1 FROM dbo.candidates)
                OR EXISTS (SELECT 1 FROM dbo.roles AS r WHERE r.[isActive] = 1 AND r.[permissions] LIKE N'%"candidates.manage"%')
                OR EXISTS (SELECT 1 FROM dbo.users AS u WHERE u.[permissions] LIKE N'%"candidates.manage"%')
                OR EXISTS (SELECT 1 FROM dbo.user_permission_overrides AS o WHERE o.[permission] = N'candidates.manage' AND o.[effect] = N'GRANT')
              THEN 1 ELSE 0 END,
         NULL, NULL, NULL;
GO

-- (3) شاشات العرض التجريبية: ظاهرة زي ما هي لحد قرار المالك
IF NOT EXISTS (SELECT 1 FROM dbo.system_module_features WHERE [key] = N'platform.demo_screens')
  INSERT INTO dbo.system_module_features ([key], [enabled], [updatedAt], [updatedBy])
  VALUES (N'platform.demo_screens', 1, NULL, NULL);
GO

-- تحقق: الأحد عشر موديول اختياري كلهم لهم صف، والعشرة بتوع الباقة الأساسية مفعّلين (إلا لو المالك قفل واحد من الشاشة قبل إعادة التشغيل)،
-- وميزة شاشات العرض لها صف
IF (SELECT COUNT(*) FROM dbo.system_modules WHERE [key] IN (N'attendance', N'shifts', N'overtime', N'leave', N'payroll', N'loans', N'expenses',
                                                             N'onboarding', N'custody', N'offboarding', N'recruitment')) <> 11
  THROW 77002, N'20261002_077: صفوف الموديولات الاختيارية ناقصة بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.system_module_features WHERE [key] = N'platform.demo_screens')
  THROW 77003, N'20261002_077: صف ميزة شاشات العرض التجريبية غير موجود بعد الترحيل', 1;
IF EXISTS (SELECT 1 FROM dbo.system_modules WHERE [key] IN (N'platform', N'org', N'employees', N'self_service', N'requests', N'notifications', N'documents', N'reports')
           AND [enabled] = 0)
  THROW 77004, N'20261002_077: موديول أساسي متسجّل مقفول — الأساسي مايتقفلش', 1;
GO
