-- C2 (إعادة العمل) / الخطوة 25 — DD-01 الجهة المالكة، DD-03 قاعدة 1/5 مصفوفة حد التصعيد لكل دور مُنشئ،
-- DD-04 قاعدة 2 النطاق الوظيفي. إضافي فقط: ثلاثة أعمدة NULL على deduction_types؛ الأنواع القائمة تبقى بلا جهة مالكة
-- ولا نطاق وظيفي ولا مصفوفة (= حد تصعيد النوع نفسه كما كان). لا تغيير لأي صف قائم.
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.deduction_types', N'U') IS NULL
  THROW 55201, N'جدول deduction_types غير موجود؛ طبّق 20260914_020_c2_typed_deductions أولًا', 1;
GO

IF COL_LENGTH(N'dbo.deduction_types', N'ownerDepartmentId') IS NULL
  ALTER TABLE dbo.[deduction_types] ADD [ownerDepartmentId] INT NULL;
GO

IF COL_LENGTH(N'dbo.deduction_types', N'functionalScope') IS NULL
  ALTER TABLE dbo.[deduction_types] ADD [functionalScope] NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH(N'dbo.deduction_types', N'basisEscalationDays') IS NULL
  ALTER TABLE dbo.[deduction_types] ADD [basisEscalationDays] NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH(N'dbo.deduction_types', N'ownerDepartmentId') IS NULL
  OR COL_LENGTH(N'dbo.deduction_types', N'functionalScope') IS NULL
  OR COL_LENGTH(N'dbo.deduction_types', N'basisEscalationDays') IS NULL
  THROW 55202, N'أعمدة ملكية نوع الخصم لم تُضف', 1;
GO
