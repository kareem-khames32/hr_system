-- 20261006_092: إقرار الموظف بمستند صادر (خطة التنفيذ — الدفعة B2.7، الجزء ب).
-- أعمدة جديدة على جدول قايم:
--   hr_issued_documents.ackRequestedAt / ackDueDate / ackTaskId / ackContentHash: طلب إقرار الموظف بالمستند — وقته، وآخر موعد (اختياري)،
--     ومهمته في محرك المهام (tasks.id)، وبصمة الملف اللي هيتعرض له. فاضي = من غير طلب (السلوك القايم لكل المستندات).
--   وفهرس فريد مفلتر: المهمة الواحدة مهمة إقرار مستند واحد.
-- وجدول جديد:
--   hr_document_acknowledgements: دليل الإقرار — المستند والموظف والحساب والوقت وبصمة اللي اتعرض والـIP والجهاز. سطر واحد للمستند،
--     وإضافة بس: مشغّل TR_hr_document_acknowledgements_append_only بيرفض أي تعديل أو مسح.
-- الكود بيشتغل قبل الترحيل ده (الإصدار العادي زي ما هو، وطلب الإقرار مرفوض برسالته) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة COL_LENGTH وOBJECT_ID وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير: جدول قديم بنفس الاسم وبشكل تاني = الترحيل بيقف هنا من غير ما يلمسه ولا يزوّد أعمدة المستند
IF OBJECT_ID(N'dbo.hr_document_acknowledgements', N'U') IS NOT NULL AND ((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_document_acknowledgements')) <> 8
   OR COL_LENGTH(N'dbo.hr_document_acknowledgements', N'documentId') IS NULL OR COL_LENGTH(N'dbo.hr_document_acknowledgements', N'contentHash') IS NULL
   OR COL_LENGTH(N'dbo.hr_document_acknowledgements', N'userAgent') IS NULL)
  THROW 92001, N'20261006_092: جدول hr_document_acknowledgements موجود وأعمدته مش أعمدة الإقرار الـ8', 1;
IF OBJECT_ID(N'dbo.hr_issued_documents', N'U') IS NULL
  THROW 92002, N'20261006_092: جدول hr_issued_documents مش موجود', 1;
GO

IF COL_LENGTH(N'dbo.hr_issued_documents', N'ackRequestedAt') IS NULL
  ALTER TABLE dbo.hr_issued_documents ADD [ackRequestedAt] datetime2 NULL;
GO
IF COL_LENGTH(N'dbo.hr_issued_documents', N'ackDueDate') IS NULL
  ALTER TABLE dbo.hr_issued_documents ADD [ackDueDate] date NULL;
GO
IF COL_LENGTH(N'dbo.hr_issued_documents', N'ackTaskId') IS NULL
  ALTER TABLE dbo.hr_issued_documents ADD [ackTaskId] int NULL;
GO
IF COL_LENGTH(N'dbo.hr_issued_documents', N'ackContentHash') IS NULL
  ALTER TABLE dbo.hr_issued_documents ADD [ackContentHash] nvarchar(64) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'UX_hr_issued_documents_ack_task')
  CREATE UNIQUE INDEX [UX_hr_issued_documents_ack_task] ON dbo.hr_issued_documents ([ackTaskId]) WHERE [ackTaskId] IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.hr_document_acknowledgements', N'U') IS NULL
CREATE TABLE dbo.hr_document_acknowledgements (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_hr_document_acknowledgements] PRIMARY KEY,
  [documentId] int NOT NULL,
  [employeeId] int NOT NULL,
  [userId] int NOT NULL,
  [acknowledgedAt] datetime2 NOT NULL,
  [contentHash] nvarchar(64) NOT NULL,
  [ip] nvarchar(64) NULL,
  [userAgent] nvarchar(300) NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.hr_document_acknowledgements') AND name = N'UQ_hr_document_acknowledgements_document')
  CREATE UNIQUE INDEX [UQ_hr_document_acknowledgements_document] ON dbo.hr_document_acknowledgements ([documentId]);
GO

-- الإقرار إضافة بس: مفيش تعديل ولا مسح
CREATE OR ALTER TRIGGER dbo.[TR_hr_document_acknowledgements_append_only] ON dbo.[hr_document_acknowledgements] INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 92010, N'إقرارات المستندات إضافة بس: مفيش تعديل ولا مسح', 1;
END
GO

-- تحقق: أعمدة المستند الأربعة بأنواعها وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'ackRequestedAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 1 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'ackDueDate'
               AND system_type_id = TYPE_ID(N'date') AND is_nullable = 1 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'ackTaskId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'ackContentHash'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 128 AND is_nullable = 1 AND default_object_id = 0)
  THROW 92003, N'20261006_092: أعمدة طلب الإقرار على hr_issued_documents ناقصة أو بنوع غلط', 1;
GO

-- تحقق: الفهرس فريد ومفلتر، وجدول الدليل بعدد أعمدته وفهرسه الفريد، والمشغّل
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'UX_hr_issued_documents_ack_task'
               AND is_unique = 1 AND has_filter = 1)
  THROW 92004, N'20261006_092: الفهرس UX_hr_issued_documents_ack_task ناقص أو مش فريد مفلتر', 1;
IF (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.hr_document_acknowledgements')) <> 8
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.hr_document_acknowledgements') AND name = N'UQ_hr_document_acknowledgements_document' AND is_unique = 1)
  THROW 92005, N'20261006_092: جدول hr_document_acknowledgements أو فهرسه ناقص', 1;
IF OBJECT_ID(N'dbo.TR_hr_document_acknowledgements_append_only', N'TR') IS NULL
  THROW 92006, N'20261006_092: مشغّل منع تعديل إقرارات المستندات ناقص', 1;
GO
