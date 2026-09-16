-- 20260916_035 (مسار employee-attendance، القرار أ2): «بداية استحقاق الراتب» على ملف الموظف.
-- إضافي فقط: عمود تاريخ nullable واحد بلا تعبئة رجعية — NULL يسقط على actualStartDate ثم joinDate تمامًا
-- كسلوك اليوم، فلا يتغير أي مسير قائم ولا أي صف. بلا DROP وبلا DELETE وبلا تغيير أي قيمة محفوظة.
SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.employees', N'salaryEntitlementStart') IS NULL
  ALTER TABLE dbo.employees ADD [salaryEntitlementStart] DATE NULL;
GO

-- تحقق داخل معاملة الملف: العمود موجود، وكل الصفوف القائمة بقيت NULL (لم تُكتب تعبئة رجعية)
IF COL_LENGTH(N'dbo.employees', N'salaryEntitlementStart') IS NULL
  THROW 56201, N'20260916_035: عمود بداية استحقاق الراتب غير موجود بعد الترحيل', 1;
IF EXISTS (SELECT 1 FROM dbo.employees WHERE [salaryEntitlementStart] IS NOT NULL)
  THROW 56202, N'20260916_035: الترحيل لا يملأ بداية استحقاق الراتب لأي موظف', 1;
GO
