-- 20261003_081: سجل تغييرات الصرف (خطة التنفيذ — الدفعة B1.7).
-- جدول جديد employee_payment_changes: صف لكل تغيير في الآيبان أو البنك أو فرع البنك أو طريقة الصرف أو مبلغ التحويل، بيتكتب في نفس
-- معاملة التغيير (تعديل الملف، Excel، طلب تغيير حساب بنكي، إنشاء الملف): قبل وبعد (الآيبان متخفي)، ومين، وإمتى، والمصدر، ورقم الطلب.
-- مصدر «مين غيّر» لتاب «اتغيّر إيه من آخر مسير» ولضابط «اللي غيّر مايعتمدش لوحده» (مقفول افتراضيًا).
-- الكود بيشتغل قبل الترحيل ده (من غير السجل الجديد، والتاب بيقرا سجل تغييرات الموظف القديم) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة OBJECT_ID. متوافق مع SQL Server 2019.
-- الأسماء بالحرف اللي الكيان بيطلعها عشان فرق المخطط يبقى صفرًا: PK_employee_payment_changes وIX_employee_payment_changes_employee.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.employee_payment_changes', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.employee_payment_changes (
    [id] int NOT NULL IDENTITY(1,1),
    [employeeId] int NOT NULL,
    [field] nvarchar(40) NOT NULL,
    [oldValue] nvarchar(200) NULL,
    [newValue] nvarchar(200) NULL,
    [changedByUserId] int NULL,
    [changedAt] datetime2 NOT NULL,
    [source] nvarchar(20) NOT NULL,
    [requestId] int NULL,
    CONSTRAINT [PK_employee_payment_changes] PRIMARY KEY ([id])
  );
END
GO

-- تغييرات موظف بعينه بالوقت (التاب والضابط)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_employee_payment_changes_employee' AND object_id = OBJECT_ID(N'dbo.employee_payment_changes'))
  CREATE INDEX [IX_employee_payment_changes_employee] ON dbo.employee_payment_changes ([employeeId], [changedAt]);
GO

-- تحقق: الجدول بأعمدته ومفتاحه وفهرسه بأسمائهم
IF OBJECT_ID(N'dbo.employee_payment_changes', N'U') IS NULL
  THROW 81001, N'20261003_081: جدول employee_payment_changes غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'id'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'employeeId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'field'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 80 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'oldValue'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 400 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'newValue'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 400 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'changedByUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'changedAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'source'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employee_payment_changes') AND name = N'requestId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  THROW 81002, N'20261003_081: أعمدة employee_payment_changes ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_employee_payment_changes' AND type = 'PK' AND parent_object_id = OBJECT_ID(N'dbo.employee_payment_changes'))
  THROW 81003, N'20261003_081: المفتاح الأساسي PK_employee_payment_changes مش موجود باسمه', 1;
IF (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.name = N'IX_employee_payment_changes_employee' AND i.object_id = OBJECT_ID(N'dbo.employee_payment_changes')
      AND ((ic.key_ordinal = 1 AND c.name = N'employeeId') OR (ic.key_ordinal = 2 AND c.name = N'changedAt'))) <> 2
  THROW 81004, N'20261003_081: الفهرس IX_employee_payment_changes_employee ناقص أو بأعمدة غلط', 1;
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.employee_payment_changes'))
  THROW 81005, N'20261003_081: جدول employee_payment_changes من غير افتراضيات (زي الكيان)', 1;
GO
