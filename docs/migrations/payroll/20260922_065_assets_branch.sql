-- 20260922_065: فرع الأصل (تدقيق الأدوار 22 سبتمبر — عيب D3).
-- سجل الأصول كان بلا عمود فرع، فأمين عهدة أي فرع بيقرا ويعدّل أصول كل الشركة (ثبت حيًّا: حساب فرع 11 عدّل أصل فرع 10 ورجع 200).
-- 1) عمود جديد assets.branchId (int NULL) + فهرسه. NULL = أصل قديم لسه مالوش فرع: حساب الفرع يشوفه قراءة بس،
--    وحساب نطاقه كل الفروع هو اللي يعدّله ويحدد فرعه (فردي أو دفعة) من شاشة سجل العهد.
-- 2) تعبئة رجعية بقرار موثق: الأصل المُسنَد حاليًا (currentHolderId) بياخد فرع حامله الحالي. الباقي يفضل NULL — مفيش فرع يتخمَّن.
--    بعد كده الأصل الجديد بيتختم بفرع اللي أضافه، وعند تنشيط العهدة بياخد فرع حامله (api/src/assets/asset-branch.ts).
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE، ولا تغيير على أي عمود قائم. آمن للتكرار: العمود بحارس COL_LENGTH والفهرس بحارس
-- sys.indexes، والتعبئة لا تمس إلا branchId الفاضي. العمود nullable بلا قيد افتراضي، واسم الفهرس هو اللي TypeORM بيولّده
-- من الكيان (@Index على branchId في جدول assets) حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.assets', N'branchId') IS NULL
  ALTER TABLE dbo.assets ADD [branchId] int NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IDX_b9a2d908e40ada723882053f98' AND object_id = OBJECT_ID(N'dbo.assets'))
  CREATE INDEX [IDX_b9a2d908e40ada723882053f98] ON dbo.assets ([branchId]);
GO

-- الأصل المُسنَد حاليًا بياخد فرع حامله؛ الأصل اللي له فرع (تشغيل سابق أو شاشة) لا يُلمس
UPDATE a SET a.[branchId] = e.[branchId]
FROM dbo.assets a
INNER JOIN dbo.employees e ON e.[id] = a.[currentHolderId]
WHERE a.[branchId] IS NULL AND a.[currentHolderId] IS NOT NULL AND e.[branchId] IS NOT NULL;
GO

-- تحقق: العمود والفهرس موجودان باسم TypeORM، ومفيش أصل مع حامل معروف الفرع فضل بلا فرع
IF COL_LENGTH(N'dbo.assets', N'branchId') IS NULL
  THROW 56651, N'20260922_065: عمود branchId ناقص في assets', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
               JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
               WHERE i.object_id = OBJECT_ID(N'dbo.assets') AND i.name = N'IDX_b9a2d908e40ada723882053f98' AND c.name = N'branchId')
  THROW 56652, N'20260922_065: فهرس فرع الأصل مش موجود باسم TypeORM', 1;
IF EXISTS (SELECT 1 FROM dbo.assets a INNER JOIN dbo.employees e ON e.[id] = a.[currentHolderId]
           WHERE a.[branchId] IS NULL AND e.[branchId] IS NOT NULL)
  THROW 56653, N'20260922_065: فيه أصل مُسنَد فضل بلا فرع بعد التعبئة', 1;
GO
