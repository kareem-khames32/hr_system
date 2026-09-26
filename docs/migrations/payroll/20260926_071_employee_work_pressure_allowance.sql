-- 20260926_071: «بدل ضغط العمل» خانة في راتب الموظف (قرار المالك 26 سبتمبر: «نعمله في مكان الراتب … عشان يبقى ظاهر
--   للموظف في بيانات راتبه، بس مايتحسبش على البدل ده مؤثرات — لا إضافي ولا خصومات»، ومش داخل في مكافأة نهاية الخدمة).
-- رقم 071 حر: ملف 071 سابق (البدل الثابت في تابة البدلات) اترجع قبل ما يتطبق على أي قاعدة حقيقية.
-- عمودين decimal(18,2) NOT NULL بقيمة افتراضية صفر:
--   employees.workPressureAllowance               — الخانة في ملف الموظف جنب باقي البدلات
--   employee_salary_history.workPressureAllowance — «سجل الأجر المؤرخ»: تغيير البدل بيتأرخ بشهر سريان زي أي تغيير أجر
-- الصفوف القائمة بتاخد الصفر الافتراضي وقت الإضافة نفسها (NOT NULL + DEFAULT) — مفيش UPDATE ولا تعبئة رجعية:
--   كل موظف قديم = صفر = نفس الحساب بالحرف، وبصمات سجل الأجر المحفوظة ماتتغيرش (البدل الصفري مش داخل في البصمة).
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE. آمن للتكرار بحارس COL_LENGTH. متوافق مع SQL Server 2019.
-- أسماء القيود الافتراضية = اللي بيولّدها TypeORM للكيانين (DF_ + أول 27 حرف من sha1 «الجدول_العمود») عشان فرق المخطط يبقى صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.employees', N'workPressureAllowance') IS NULL
  ALTER TABLE dbo.employees ADD [workPressureAllowance] decimal(18,2) NOT NULL
    CONSTRAINT [DF_a224ba42fd335e5eea40372899f] DEFAULT 0;
GO

IF COL_LENGTH(N'dbo.employee_salary_history', N'workPressureAllowance') IS NULL
  ALTER TABLE dbo.employee_salary_history ADD [workPressureAllowance] decimal(18,2) NOT NULL
    CONSTRAINT [DF_b73bb8b205dde1f6de240e81f73] DEFAULT 0;
GO

-- تحقق: العمودين موجودين بنوعهم ومش بيقبلوا الفراغ، وقيمتهم الافتراضية صفر باسم قيد TypeORM
IF COL_LENGTH(N'dbo.employees', N'workPressureAllowance') IS NULL
  THROW 71001, N'20260926_071: عمود workPressureAllowance ناقص في employees', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employees') AND name = N'workPressureAllowance'
               AND system_type_id = TYPE_ID(N'decimal') AND precision = 18 AND scale = 2 AND is_nullable = 0)
  THROW 71002, N'20260926_071: employees.workPressureAllowance لازم decimal(18,2) NOT NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d
               JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.parent_object_id = OBJECT_ID(N'dbo.employees') AND c.name = N'workPressureAllowance'
                 AND d.name = N'DF_a224ba42fd335e5eea40372899f' AND d.definition = N'((0))')
  THROW 71003, N'20260926_071: القيمة الافتراضية لـ employees.workPressureAllowance لازم صفر باسم DF_a224ba42fd335e5eea40372899f', 1;
IF COL_LENGTH(N'dbo.employee_salary_history', N'workPressureAllowance') IS NULL
  THROW 71004, N'20260926_071: عمود workPressureAllowance ناقص في employee_salary_history', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_salary_history') AND name = N'workPressureAllowance'
               AND system_type_id = TYPE_ID(N'decimal') AND precision = 18 AND scale = 2 AND is_nullable = 0)
  THROW 71005, N'20260926_071: employee_salary_history.workPressureAllowance لازم decimal(18,2) NOT NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d
               JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.parent_object_id = OBJECT_ID(N'dbo.employee_salary_history') AND c.name = N'workPressureAllowance'
                 AND d.name = N'DF_b73bb8b205dde1f6de240e81f73' AND d.definition = N'((0))')
  THROW 71006, N'20260926_071: القيمة الافتراضية لـ employee_salary_history.workPressureAllowance لازم صفر باسم DF_b73bb8b205dde1f6de240e81f73', 1;
GO
