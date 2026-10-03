-- 20261003_086: الطابور والـoutbox (خطة التنفيذ — الدفعة B2.3).
-- جدولين جداد:
--   outbox_events: حدث نطاق بيتكتب في نفس معاملة العملية (تم التعيين، اعتماد ورفض طلب، المسير اتعتمد، مستند هينتهي، انتهاء الخدمة).
--     العامل بيوزعه على مستهلكينه ويعلّمه «اتوزع». مفتاح منع تكرار اختياري (eventKey) فريد لما يكون موجود.
--   jobs_queue: مهمة لكل مستهلك (PENDING / RUNNING / DONE / DEAD) بمحاولاتها وحدها الأقصى و«يشتغل بعد»، ومفتاح منع تكرار فريد لما يكون موجود.
-- الكود بيشتغل قبل الترحيل ده (الأحداث مابتتسجلش، والعامل مابيعملش حاجة، وتحذير واحد في سجل الخادم) وبعده.
-- إضافي فقط: جداول جديدة بس. آمن للتكرار بحراسة OBJECT_ID وsys.indexes. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.outbox_events', N'U') IS NULL
CREATE TABLE dbo.outbox_events (
  [id] bigint IDENTITY(1,1) NOT NULL CONSTRAINT [PK_outbox_events] PRIMARY KEY,
  [eventType] nvarchar(60) NOT NULL,
  [entityType] nvarchar(40) NULL,
  [entityId] nvarchar(60) NULL,
  [payload] nvarchar(MAX) NULL,
  [eventKey] nvarchar(160) NULL,
  [createdAt] datetime2 NOT NULL,
  [dispatchedAt] datetime2 NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.outbox_events') AND name = N'IX_outbox_events_pending')
  CREATE INDEX [IX_outbox_events_pending] ON dbo.outbox_events ([dispatchedAt], [id]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.outbox_events') AND name = N'UX_outbox_events_key')
  CREATE UNIQUE INDEX [UX_outbox_events_key] ON dbo.outbox_events ([eventKey]) WHERE [eventKey] IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.jobs_queue', N'U') IS NULL
CREATE TABLE dbo.jobs_queue (
  [id] bigint IDENTITY(1,1) NOT NULL CONSTRAINT [PK_jobs_queue] PRIMARY KEY,
  [jobType] nvarchar(60) NOT NULL,
  [payload] nvarchar(MAX) NULL,
  [status] nvarchar(10) NOT NULL,
  [attempts] int NOT NULL,
  [maxAttempts] int NOT NULL,
  [runAfter] datetime2 NOT NULL,
  [idempotencyKey] nvarchar(200) NULL,
  [outboxEventId] bigint NULL,
  [lockedBy] nvarchar(120) NULL,
  [lockedAt] datetime2 NULL,
  [lastError] nvarchar(1000) NULL,
  [createdAt] datetime2 NOT NULL,
  [finishedAt] datetime2 NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.jobs_queue') AND name = N'IX_jobs_queue_due')
  CREATE INDEX [IX_jobs_queue_due] ON dbo.jobs_queue ([status], [runAfter], [id]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.jobs_queue') AND name = N'UX_jobs_queue_key')
  CREATE UNIQUE INDEX [UX_jobs_queue_key] ON dbo.jobs_queue ([idempotencyKey]) WHERE [idempotencyKey] IS NOT NULL;
GO

-- تحقق: الجدولين بأعمدتهم وفهارسهم
IF OBJECT_ID(N'dbo.outbox_events', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.outbox_events')) <> 8
  THROW 86001, N'20261003_086: جدول outbox_events ناقص أو أعمدته مش 8', 1;
IF OBJECT_ID(N'dbo.jobs_queue', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.jobs_queue')) <> 14
  THROW 86002, N'20261003_086: جدول jobs_queue ناقص أو أعمدته مش 14', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.outbox_events') AND name = N'UX_outbox_events_key' AND is_unique = 1 AND has_filter = 1)
  THROW 86003, N'20261003_086: الفهرس الفريد UX_outbox_events_key ناقص', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.jobs_queue') AND name = N'UX_jobs_queue_key' AND is_unique = 1 AND has_filter = 1)
  THROW 86004, N'20261003_086: الفهرس الفريد UX_jobs_queue_key ناقص', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.jobs_queue') AND name = N'IX_jobs_queue_due')
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.outbox_events') AND name = N'IX_outbox_events_pending')
  THROW 86005, N'20261003_086: فهارس السحب ناقصة', 1;
GO
