-- 20260930_075: «مسوغات التعيين» (طلب المالك 30 سبتمبر: المستندات اللي لازم كل موظف يسلّمها عشان يتعيّن — عقد عمل، شهادة ميلاد،
--   فيش وتشبيه… — والتهيئة ماتعدّيش غير لما تترفع كلها، وتقرير بالناقص عند كل موظف وتذكير له بالناقص).
-- (1) doc_types.requiredForHiring bit NOT NULL بقيمة افتراضية صفر: علامة «مطلوب للتعيين» على نوع المستند.
--     الأنواع القائمة بتاخد الصفر وقت الإضافة نفسها (NOT NULL + DEFAULT) = مفيش نوع مطلوب لحد ما المالك يعلّمه من «أنواع المستندات»،
--     فمفيش موظف قائم بيبان ناقص ولا مهمة تهيئة بتتفتح بالترحيل.
-- (2) onboarding_tasks.systemKey nvarchar(40) NULL: مفتاح مهمة النظام ('HIRING_DOCS' = «استلام مسوغات التعيين»، حالتها من المستندات).
--     NULL = مهمة عادية من القالب أو أضافتها الموارد البشرية — كل المهام القائمة NULL زي ما هي.
-- (3) جدول جديد hiring_document_reminders: تذكير الموظف بالناقص (الموظف، مين بعته، إمتى، وأكواد الناقص وقتها JSON).
--     الإشعار بيتحسب وقت القراءة من آخر تذكير والناقص الحالي — الصف سجل بس.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسات COL_LENGTH وOBJECT_ID وsys.indexes. متوافق مع SQL Server 2019.
-- اسم القيد الافتراضي = اللي بيولّده TypeORM للكيان (DF_ + أول 27 حرف من sha1 «doc_types_requiredForHiring»)، والمفتاح والفهرس بأسماء
-- صريحة مطابقة لكيان HiringDocumentReminder (PK_hiring_document_reminders، IX_hiring_document_reminders_employee) عشان فرق المخطط يبقى صفرًا.
SET NOCOUNT ON;
GO

-- (1) «مطلوب للتعيين» على نوع المستند
IF COL_LENGTH(N'dbo.doc_types', N'requiredForHiring') IS NULL
  ALTER TABLE dbo.doc_types ADD [requiredForHiring] bit NOT NULL
    CONSTRAINT [DF_2caa2b3de768bf45b96d893289e] DEFAULT 0;
GO

-- (2) مفتاح مهمة النظام في مهام التهيئة
IF COL_LENGTH(N'dbo.onboarding_tasks', N'systemKey') IS NULL
  ALTER TABLE dbo.onboarding_tasks ADD [systemKey] nvarchar(40) NULL;
GO

-- (3) تذكيرات مسوغات التعيين
IF OBJECT_ID(N'dbo.hiring_document_reminders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.hiring_document_reminders (
    [id] int NOT NULL IDENTITY(1,1),
    [employeeId] int NOT NULL,
    [sentByUserId] int NOT NULL,
    [sentAt] datetime2 NOT NULL,
    [missingDocTypes] nvarchar(400) NOT NULL,
    CONSTRAINT [PK_hiring_document_reminders] PRIMARY KEY ([id])
  );
END
GO

-- آخر تذكير لكل موظف (الإشعار والتقرير)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hiring_document_reminders_employee' AND object_id = OBJECT_ID(N'dbo.hiring_document_reminders'))
  CREATE INDEX [IX_hiring_document_reminders_employee] ON dbo.hiring_document_reminders ([employeeId]);
GO

-- تحقق: العمودين بنوعهم وقابلية الفراغ، والقيمة الافتراضية صفر باسم قيد TypeORM، والجدول بأعمدته ومفتاحه وفهرسه بأسمائهم
IF COL_LENGTH(N'dbo.doc_types', N'requiredForHiring') IS NULL
  THROW 75001, N'20260930_075: عمود requiredForHiring ناقص في doc_types', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.doc_types') AND name = N'requiredForHiring'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 0)
  THROW 75002, N'20260930_075: doc_types.requiredForHiring لازم bit NOT NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d
               JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.parent_object_id = OBJECT_ID(N'dbo.doc_types') AND c.name = N'requiredForHiring'
                 AND d.name = N'DF_2caa2b3de768bf45b96d893289e' AND d.definition = N'((0))')
  THROW 75003, N'20260930_075: القيمة الافتراضية لـ doc_types.requiredForHiring لازم صفر باسم DF_2caa2b3de768bf45b96d893289e', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.onboarding_tasks') AND name = N'systemKey'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 80 AND is_nullable = 1)
  THROW 75004, N'20260930_075: onboarding_tasks.systemKey لازم nvarchar(40) NULL', 1;
IF OBJECT_ID(N'dbo.hiring_document_reminders', N'U') IS NULL
  THROW 75005, N'20260930_075: جدول تذكيرات مسوغات التعيين غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hiring_document_reminders') AND name = N'employeeId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hiring_document_reminders') AND name = N'sentByUserId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hiring_document_reminders') AND name = N'sentAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hiring_document_reminders') AND name = N'missingDocTypes'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 800 AND is_nullable = 0)
  THROW 75006, N'20260930_075: أعمدة تذكيرات مسوغات التعيين ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_hiring_document_reminders' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.hiring_document_reminders'))
  THROW 75007, N'20260930_075: المفتاح الأساسي PK_hiring_document_reminders غير موجود باسمه', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
               JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
               WHERE i.object_id = OBJECT_ID(N'dbo.hiring_document_reminders') AND i.name = N'IX_hiring_document_reminders_employee'
                 AND c.name = N'employeeId')
  THROW 75008, N'20260930_075: فهرس IX_hiring_document_reminders_employee على employeeId غير موجود', 1;
GO
