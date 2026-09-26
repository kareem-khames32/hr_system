-- 20260926_068: «نطاق الفروع» بعلامات صح لحسابات الدخول (طلب المالك 26 سبتمبر — بند «الصلاحيات: اختيار الفروع بعلامات صح»).
-- المشكلة: الحساب كان يا مقفول على فرعه الأصلي (users.branchId) بس، يا «كل الفروع» (users.scopeAllBranches — ترحيل 064).
--   مفيش طريقة تقول «مدير الموارد البشرية ده على الفرع 2 و3 بس» من غير ما يشوف الفرع 1 كمان.
-- الحل: عمود واحد users.scopeBranchIds nvarchar(400) NULL = مصفوفة JSON بأرقام الفروع المختارة، زي [2,3].
--   الحساب الفعّال (effectiveBranchScope في api/src/auth/guards.ts — مصدر واحد للتوكن والشاشة والتحقق كل طلب):
--   مدير النظام أو «كل الفروع» → كل الفروع؛ وإلا الفروع المختارة لو فيها رقم صالح؛ وإلا فرعه الأصلي؛ وإلا ولا فرع.
--   المصفوفة الفاضية أو النص التالف مابيتقروش «كل الفروع» أبدًا (فشل مقفول).
-- NULL = فرعه الأصلي بس: السلوك القديم بالحرف، فمحدش نطاقه بيتغيّر من الترحيل (كل الحسابات الحالية NULL — بلا تعبئة رجعية).
--   الفروع بتتحط من شاشة المستخدمين بس، والتغيير بيزوّد tokenVersion (النطاق راكب في التوكن).
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE ولا تعبئة ولا تغيير على أي عمود قائم. آمن للتكرار بحارس COL_LENGTH.
-- عمود nullable بلا قيد افتراضي عشان فرق المخطط يبقى صفرًا مع الكيان (User.scopeBranchIds). متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.users', N'scopeBranchIds') IS NULL
  ALTER TABLE dbo.users ADD [scopeBranchIds] nvarchar(400) NULL;
GO

-- تحقق: العمود موجود بنوعه وطوله (nvarchar(400) = 800 بايت) ويقبل الفراغ
IF COL_LENGTH(N'dbo.users', N'scopeBranchIds') IS NULL
  THROW 68001, N'20260926_068: عمود scopeBranchIds ناقص في users', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users')
               AND name = N'scopeBranchIds' AND system_type_id = TYPE_ID(N'nvarchar'))
  THROW 68002, N'20260926_068: scopeBranchIds لازم يكون nvarchar', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users')
               AND name = N'scopeBranchIds' AND max_length = 800)
  THROW 68003, N'20260926_068: scopeBranchIds لازم يكون nvarchar(400) — 800 بايت', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users')
               AND name = N'scopeBranchIds' AND is_nullable = 1)
  THROW 68004, N'20260926_068: scopeBranchIds لازم يقبل الفراغ (NULL = فرعه الأصلي بس)', 1;
GO
