-- 20260916_050: طريقة الصرف «نقدي + بنك» وكود الموظف من النظام (قرار المالك 16 سبتمبر).
-- 1) عمود جديد employees.bankTransferAmount (decimal(18,2) NULL): مبلغ التحويل البنكي في «نقدي + بنك» والباقي من الصافي نقدي.
--    قيمة payMethod الجديدة 'mixed' (5 خانات) تدخل في العمود الحالي nvarchar(20) بلا تعديل.
-- 2) رقم البصمة بقى المفتاح الوحيد لربط البصمات (الكود الوظيفي يولّده النظام EMP0001… ومش مفتاح بصمة).
--    الموظف القديم اللي بصماته كانت بتتربط بكوده الوظيفي ومالوش رقم بصمة: رقم بصمته = كوده الحالي،
--    بشرط ألا يكون الكود رقم بصمة لموظف آخر وألا يتجاوز 20 خانة (طول كود جهاز البصمة). لا يُلمس أي رقم بصمة موجود.
-- آمن للتكرار: العمود بحارس COL_LENGTH، والتعبئة لا تمس إلا الفارغ.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.employees', N'bankTransferAmount') IS NULL
  ALTER TABLE dbo.employees ADD [bankTransferAmount] decimal(18,2) NULL;
GO

UPDATE e SET e.[fingerprintCode] = LTRIM(RTRIM(e.[employeeCode]))
FROM dbo.employees e
WHERE NULLIF(LTRIM(RTRIM(e.[fingerprintCode])), N'') IS NULL
  AND LEN(LTRIM(RTRIM(e.[employeeCode]))) BETWEEN 1 AND 20
  AND NOT EXISTS (SELECT 1 FROM dbo.employees o WHERE o.[id] <> e.[id] AND o.[fingerprintCode] = LTRIM(RTRIM(e.[employeeCode])));
GO

-- تحقق
IF COL_LENGTH(N'dbo.employees', N'bankTransferAmount') IS NULL
  THROW 56551, N'20260916_050: عمود bankTransferAmount غير موجود بعد الترحيل', 1;
IF COL_LENGTH(N'dbo.employees', N'payMethod') < 10
  THROW 56552, N'20260916_050: عمود payMethod أقصر من قيمة mixed', 1;
GO
