-- 20261003_083: تسجيل صرف التصفية (خطة التنفيذ — الدفعة B1.8c / B0.1 16-23).
-- أعمدة جديدة على offboarding_cases:
--   settlementPaidAt: تاريخ صرف التصفية المعتمدة (الاعتماد مش إثبات صرف).
--   settlementPaidByUserId / settlementPaymentMethod / settlementPaymentReference: مين سجّل الصرف، والطريقة (CASH | BANK_TRANSFER | CHEQUE)، والمرجع.
-- الكود بيشتغل قبل الترحيل ده (زرار التسجيل بيقول إن الترحيل مش متطبق، وتفاصيل الملف من غير بيانات صرف) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ومن غير افتراضيات (زي الكيان). آمن للتكرار بحراسة COL_LENGTH.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaidAt') IS NULL
  ALTER TABLE dbo.offboarding_cases ADD [settlementPaidAt] date NULL;
GO
IF COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaidByUserId') IS NULL
  ALTER TABLE dbo.offboarding_cases ADD [settlementPaidByUserId] int NULL;
GO
IF COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaymentMethod') IS NULL
  ALTER TABLE dbo.offboarding_cases ADD [settlementPaymentMethod] nvarchar(20) NULL;
GO
IF COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaymentReference') IS NULL
  ALTER TABLE dbo.offboarding_cases ADD [settlementPaymentReference] nvarchar(100) NULL;
GO

-- تحقق: الأعمدة الأربعة بنوعها وطولها وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.offboarding_cases') AND name = N'settlementPaidAt'
               AND system_type_id = TYPE_ID(N'date') AND is_nullable = 1 AND default_object_id = 0)
  THROW 83001, N'20261003_083: العمود offboarding_cases.settlementPaidAt ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.offboarding_cases') AND name = N'settlementPaidByUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
  THROW 83002, N'20261003_083: العمود offboarding_cases.settlementPaidByUserId ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.offboarding_cases') AND name = N'settlementPaymentMethod'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 1 AND default_object_id = 0)
  THROW 83003, N'20261003_083: العمود offboarding_cases.settlementPaymentMethod ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.offboarding_cases') AND name = N'settlementPaymentReference'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 200 AND is_nullable = 1 AND default_object_id = 0)
  THROW 83004, N'20261003_083: العمود offboarding_cases.settlementPaymentReference ناقص أو بنوع غلط', 1;
GO
