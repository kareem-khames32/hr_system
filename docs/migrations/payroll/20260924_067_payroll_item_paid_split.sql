-- 20260924_067: تثبيت تقسيم الصرف على بند المسير وقت الصرف (مراجعة مستقلة 24 سبتمبر — العيب N02 المتبقّي).
-- المشكلة اللي ثبتت حيًّا على قاعدة مؤقتة:
--   أ) مسير اتصرف كله مرة واحدة بلا علامات فردية: كشف البنك كان بيقول «بنك 1,000 / نقدي 0» قبل الصرف (من ملف الموظف)،
--      وبمجرد الصرف ينقلب «بنك 0 / نقدي 1,000» (لأنه بيرجع لطريقة الصرف المحفوظة وقت الحساب). الفلوس اتحركت بالبنك
--      وبعدين التقرير قال نقدي — نسبة خاطئة لمال اتصرف خلاص.
--   ب) صرف «نقدي + بنك» مثبت 300 بنك / 700 نقدي بيتحول تاريخيًا لـ800 / 200 بمجرد تعديل مبلغ التحويل في ملف الموظف،
--      لأن مبلغ البنك في «نقدي + بنك» ما كانش بيتثبّت في أي مكان.
-- الحل: 3 أعمدة جديدة على payroll_items تتكتب مرة واحدة وقت الصرف (APPROVED→PAID) بطريقة الصرف الفعلية وتقسيمها
--   من ملف الموظف في تلك اللحظة — نفس اللي كشف البنك كان بيقوله قبل الصرف بلحظة. بعد كده أي تعديل في ملف الموظف
--   ما بيغيّرش واقعة صرف حصلت.
-- NULL = بند مسير اتصرف قبل الترحيل ده (أو لسه ما اتصرفش): السلوك القديم بالحرف، فالتاريخ المسجل ما بيتغيّرش رجعيًا.
-- إضافي فقط: بلا DROP ولا DELETE ولا TRUNCATE ولا تعبئة رجعية ولا تغيير على أي عمود قائم. آمن للتكرار بحارس COL_LENGTH.
-- أعمدة nullable بلا قيد افتراضي عشان فرق المخطط يبقى صفرًا مع الكيان. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.payroll_items', N'paidPayMethod') IS NULL
  ALTER TABLE dbo.payroll_items ADD [paidPayMethod] nvarchar(20) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_items', N'paidBankAmount') IS NULL
  ALTER TABLE dbo.payroll_items ADD [paidBankAmount] decimal(18,2) NULL;
GO

IF COL_LENGTH(N'dbo.payroll_items', N'paidCashAmount') IS NULL
  ALTER TABLE dbo.payroll_items ADD [paidCashAmount] decimal(18,2) NULL;
GO

-- تحقق: الأعمدة التلاتة موجودة بأنواعها، وكلها فاضية (مفيش تعبئة رجعية — التاريخ زي ما هو)
IF COL_LENGTH(N'dbo.payroll_items', N'paidPayMethod') IS NULL
  THROW 67001, N'20260924_067: عمود paidPayMethod ناقص في payroll_items', 1;
IF COL_LENGTH(N'dbo.payroll_items', N'paidBankAmount') IS NULL
  THROW 67002, N'20260924_067: عمود paidBankAmount ناقص في payroll_items', 1;
IF COL_LENGTH(N'dbo.payroll_items', N'paidCashAmount') IS NULL
  THROW 67003, N'20260924_067: عمود paidCashAmount ناقص في payroll_items', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_items')
               AND name = N'paidPayMethod' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 1)
  THROW 67004, N'20260924_067: paidPayMethod لازم nvarchar(20) NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_items')
               AND name = N'paidBankAmount' AND system_type_id = TYPE_ID(N'decimal') AND precision = 18 AND scale = 2 AND is_nullable = 1)
  THROW 67005, N'20260924_067: paidBankAmount لازم decimal(18,2) NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.payroll_items')
               AND name = N'paidCashAmount' AND system_type_id = TYPE_ID(N'decimal') AND precision = 18 AND scale = 2 AND is_nullable = 1)
  THROW 67006, N'20260924_067: paidCashAmount لازم decimal(18,2) NULL', 1;
GO
