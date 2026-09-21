-- 20260922_063: صرف المسير موظف بموظف (قرار المالك 22 سبتمبر).
-- موظف المالية حامل payroll.disburse بيشوف موظفي المسير المعتمد ويعلّم على كل واحد «تم الصرف / لم يتم»
-- (من علّم ومتى وملاحظة اختيارية) — ولا بيغيّر أي مبلغ ولا أي حالة للمسير غير علامة الصرف.
-- جدول واحد جديد:
--   payroll_item_disbursements  صف واحد لكل بند مسير (itemId فريد) بحالته الحالية PAID | UNPAID؛ غياب الصف = «لم يتم».
--                               صافي البند وتقسيمه بنك/نقدي وطريقة الصرف بيتثبتوا وقت «تم الصرف» (دليل اللي اتصرف فعلًا).
--                               تاريخ كل تعليم محفوظ كحدث على المسير (payroll_run_events: DISBURSEMENT_MARKED).
-- العلامة مالهاش أي أثر مالي: قفل الإضافي وترحيل أقساط السلف وقيود الدفتر بيحصلوا مرة واحدة عند «إقفال الصرف»
-- (POST /payroll/runs/:id/pay) للمسير كله؛ مسير بلا علامات بيتصرف كله مرة واحدة زي ما هو.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية، ولا تغيير على payroll_items ولا أي جدول قائم.
-- أسماء القيود والفهارس مطابقة لكيان TypeORM حتى يبقى فرق المخطط صفرًا. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.payroll_item_disbursements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.payroll_item_disbursements (
    [id] int NOT NULL IDENTITY(1,1),
    [runId] int NOT NULL,
    [itemId] int NOT NULL,
    [employeeId] int NOT NULL,
    [status] nvarchar(10) NOT NULL,
    [amount] decimal(18,2) NOT NULL,
    [bankAmount] decimal(18,2) NOT NULL,
    [cashAmount] decimal(18,2) NOT NULL,
    [payMethod] nvarchar(20) NULL,
    [note] nvarchar(500) NULL,
    [markedByUserId] int NOT NULL,
    [markedAt] datetime2 NOT NULL,
    CONSTRAINT [CK_payroll_item_disbursement_status] CHECK ([status] IN ('PAID','UNPAID')),
    CONSTRAINT [PK_payroll_item_disbursements] PRIMARY KEY ([id])
  );
END
GO

-- علامة واحدة لكل بند مسير: تعليمان متزامنان لنفس الموظف مايعملوش صفين
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_item_disbursement_item' AND object_id = OBJECT_ID(N'dbo.payroll_item_disbursements'))
  CREATE UNIQUE INDEX [UX_payroll_item_disbursement_item] ON dbo.payroll_item_disbursements ([itemId]);
GO

-- علامات المسير بحالتها (شاشة الصرف وملخص المالك)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_item_disbursement_run' AND object_id = OBJECT_ID(N'dbo.payroll_item_disbursements'))
  CREATE INDEX [IX_payroll_item_disbursement_run] ON dbo.payroll_item_disbursements ([runId], [status]);
GO

-- تحقق: الجدول والفهرسان والقيد والأعمدة موجودة بأسمائها
IF OBJECT_ID(N'dbo.payroll_item_disbursements', N'U') IS NULL
  THROW 63001, N'20260922_063: جدول علامات صرف الموظفين غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_payroll_item_disbursement_item' AND is_unique = 1 AND object_id = OBJECT_ID(N'dbo.payroll_item_disbursements'))
  OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_payroll_item_disbursement_run' AND object_id = OBJECT_ID(N'dbo.payroll_item_disbursements'))
  THROW 63002, N'20260922_063: فهارس علامات صرف الموظفين ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_payroll_item_disbursement_status' AND parent_object_id = OBJECT_ID(N'dbo.payroll_item_disbursements'))
  THROW 63003, N'20260922_063: قيد حالة علامة الصرف غير موجود', 1;
IF COL_LENGTH(N'dbo.payroll_item_disbursements', N'bankAmount') IS NULL OR COL_LENGTH(N'dbo.payroll_item_disbursements', N'cashAmount') IS NULL
  OR COL_LENGTH(N'dbo.payroll_item_disbursements', N'markedByUserId') IS NULL OR COL_LENGTH(N'dbo.payroll_item_disbursements', N'note') IS NULL
  THROW 63004, N'20260922_063: أعمدة علامات صرف الموظفين ناقصة', 1;
GO
