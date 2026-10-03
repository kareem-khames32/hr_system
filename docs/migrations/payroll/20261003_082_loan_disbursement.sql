-- 20261003_082: تسجيل صرف السلفة (خطة التنفيذ — الدفعة B1.8 / R09).
-- أعمدة جديدة على loans:
--   requiresDisbursement: السلفة اتعملت والإعداد «لازم تتصرف الأول» مفتوح — أقساطها مابتدخلش المسير لحد ما صرفها يتسجل.
--     NULL = سلفة قديمة أو اتعملت والإعداد مقفول (أقساطها زي النهارده).
--   disbursedByUserId / disbursementMethod / disbursementReference: مين سجّل الصرف، والطريقة (CASH | BANK_TRANSFER | CHEQUE)، والمرجع.
--     تاريخ الصرف نفسه في العمود القائم disbursedAt.
-- الكود بيشتغل قبل الترحيل ده (زرار الصرف بيقول إن الترحيل مش متطبق، والإعداد مالوش أثر) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ومن غير افتراضيات (زي الكيان). آمن للتكرار بحراسة COL_LENGTH.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.loans', N'requiresDisbursement') IS NULL
  ALTER TABLE dbo.loans ADD [requiresDisbursement] bit NULL;
GO
IF COL_LENGTH(N'dbo.loans', N'disbursedByUserId') IS NULL
  ALTER TABLE dbo.loans ADD [disbursedByUserId] int NULL;
GO
IF COL_LENGTH(N'dbo.loans', N'disbursementMethod') IS NULL
  ALTER TABLE dbo.loans ADD [disbursementMethod] nvarchar(20) NULL;
GO
IF COL_LENGTH(N'dbo.loans', N'disbursementReference') IS NULL
  ALTER TABLE dbo.loans ADD [disbursementReference] nvarchar(100) NULL;
GO

-- تحقق: الأعمدة الأربعة بنوعها وطولها وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.loans') AND name = N'requiresDisbursement'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 1 AND default_object_id = 0)
  THROW 82001, N'20261003_082: العمود loans.requiresDisbursement ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.loans') AND name = N'disbursedByUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
  THROW 82002, N'20261003_082: العمود loans.disbursedByUserId ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.loans') AND name = N'disbursementMethod'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 1 AND default_object_id = 0)
  THROW 82003, N'20261003_082: العمود loans.disbursementMethod ناقص أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.loans') AND name = N'disbursementReference'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 200 AND is_nullable = 1 AND default_object_id = 0)
  THROW 82004, N'20261003_082: العمود loans.disbursementReference ناقص أو بنوع غلط', 1;
GO
