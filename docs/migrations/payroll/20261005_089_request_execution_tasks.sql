-- 20261005_089: مهمة تنفيذ بعد الاعتماد (خطة التنفيذ — الدفعة B2.6، الجزء أ).
-- أعمدة جديدة على جدولين قايمين:
--   request_types.executionRole / executionDays / executionProof: «مهمة تنفيذ بعد الاعتماد» على نوع الطلب — الدور الوظيفي
--     اللي بينفّذ، ومهلته بالأيام، والإثبات إجباري ولا لأ. فاضي = من غير مهمة (السلوك القايم لكل الأنواع).
--   requests.executionTaskId: مهمة تنفيذ الطلب في محرك المهام (tasks.id) — الطلب بيفضل «قيد التنفيذ» لحد ما تتقفل.
-- وفهرس فريد مفلتر: المهمة الواحدة مهمة تنفيذ طلب واحد.
-- الكود بيشتغل قبل الترحيل ده (الإعداد مرفوض برسالة، والاعتماد بيكمّل الطلب زي الأول) وبعده.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيانات). آمن للتكرار بحراسة COL_LENGTH وsys.indexes.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.request_types', N'executionRole') IS NULL
  ALTER TABLE dbo.request_types ADD [executionRole] nvarchar(40) NULL;
GO
IF COL_LENGTH(N'dbo.request_types', N'executionDays') IS NULL
  ALTER TABLE dbo.request_types ADD [executionDays] int NULL;
GO
IF COL_LENGTH(N'dbo.request_types', N'executionProof') IS NULL
  ALTER TABLE dbo.request_types ADD [executionProof] bit NULL;
GO
IF COL_LENGTH(N'dbo.requests', N'executionTaskId') IS NULL
  ALTER TABLE dbo.requests ADD [executionTaskId] int NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.requests') AND name = N'UX_requests_execution_task')
  CREATE UNIQUE INDEX [UX_requests_execution_task] ON dbo.requests ([executionTaskId]) WHERE [executionTaskId] IS NOT NULL;
GO

-- تحقق: الأعمدة الأربعة بأنواعها وnullable ومن غير افتراضي
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.request_types') AND name = N'executionRole'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 80 AND is_nullable = 1 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.request_types') AND name = N'executionDays'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
   OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.request_types') AND name = N'executionProof'
               AND system_type_id = TYPE_ID(N'bit') AND is_nullable = 1 AND default_object_id = 0)
  THROW 89001, N'20261005_089: أعمدة مهمة التنفيذ على request_types ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.requests') AND name = N'executionTaskId'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1 AND default_object_id = 0)
  THROW 89002, N'20261005_089: العمود requests.executionTaskId ناقص أو بنوع غلط', 1;
GO

-- تحقق: الفهرس فريد ومفلتر
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.requests') AND name = N'UX_requests_execution_task'
               AND is_unique = 1 AND has_filter = 1)
  THROW 89003, N'20261005_089: الفهرس UX_requests_execution_task ناقص أو مش فريد مفلتر', 1;
GO
