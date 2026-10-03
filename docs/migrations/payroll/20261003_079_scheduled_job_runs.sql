-- 20261003_079: سجل تشغيل المهام المجدولة (خطة التنفيذ — الدفعة B1.4).
-- جدول جديد scheduled_job_runs: صف لكل تشغيل مجدول بخانة دقيقته (UTC) ونتيجته ومدته ورسالة الخطأ والسيرفر. المفتاح الفريد
-- (jobId, slot) بيخلّي نسخة تانية من الـAPI في نفس الدقيقة تتعدّى، وفهرس startedAt للشاشة والمسح بعد 30 يوم.
-- الكود بيشتغل قبل الترحيل ده (المهام بقفلها من غير سجل، وتحذير واحد في سجل الخادم) وبعده.
-- إضافي فقط: بلا DROP ولا DELETE ولا UPDATE ولا تعبئة رجعية. آمن للتكرار بحراسة OBJECT_ID. متوافق مع SQL Server 2019.
-- الأسماء صريحة في الكيان ScheduledJobRun عشان فرق المخطط يبقى صفرًا: PK_scheduled_job_runs وUX_scheduled_job_runs_slot
-- وIX_scheduled_job_runs_started.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.scheduled_job_runs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.scheduled_job_runs (
    [id] int NOT NULL IDENTITY(1,1),
    [jobId] nvarchar(80) NOT NULL,
    [slot] nvarchar(20) NOT NULL,
    [status] nvarchar(12) NOT NULL,
    [startedAt] datetime2 NOT NULL,
    [finishedAt] datetime2 NULL,
    [durationMs] int NULL,
    [error] nvarchar(500) NULL,
    [host] nvarchar(120) NULL,
    CONSTRAINT [PK_scheduled_job_runs] PRIMARY KEY ([id])
  );
END
GO

-- تشغيل واحد لكل مهمة في كل دقيقة (نسختين من الـAPI بيطلعوا نفس الخانة)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_scheduled_job_runs_slot' AND object_id = OBJECT_ID(N'dbo.scheduled_job_runs'))
  CREATE UNIQUE INDEX [UX_scheduled_job_runs_slot] ON dbo.scheduled_job_runs ([jobId], [slot]);
GO
-- الشاشة والمسح بعد 30 يوم
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_scheduled_job_runs_started' AND object_id = OBJECT_ID(N'dbo.scheduled_job_runs'))
  CREATE INDEX [IX_scheduled_job_runs_started] ON dbo.scheduled_job_runs ([startedAt]);
GO

-- تحقق: الجدول بأعمدته ومفتاحه وفهرسيه بأسمائهم
IF OBJECT_ID(N'dbo.scheduled_job_runs', N'U') IS NULL
  THROW 79001, N'20261003_079: جدول scheduled_job_runs غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'id'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'jobId'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 160 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'slot'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'status'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 24 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'startedAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'finishedAt'
               AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'durationMs'
               AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'error'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 1000 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND name = N'host'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 240 AND is_nullable = 1)
  THROW 79002, N'20261003_079: أعمدة scheduled_job_runs ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_scheduled_job_runs' AND type = 'PK'
               AND parent_object_id = OBJECT_ID(N'dbo.scheduled_job_runs'))
  THROW 79003, N'20261003_079: المفتاح الأساسي PK_scheduled_job_runs غير موجود باسمه', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_scheduled_job_runs_slot' AND object_id = OBJECT_ID(N'dbo.scheduled_job_runs') AND is_unique = 1)
  OR (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.name = N'UX_scheduled_job_runs_slot' AND i.object_id = OBJECT_ID(N'dbo.scheduled_job_runs')
        AND ((ic.key_ordinal = 1 AND c.name = N'jobId') OR (ic.key_ordinal = 2 AND c.name = N'slot'))) <> 2
  THROW 79004, N'20261003_079: الفهرس الفريد UX_scheduled_job_runs_slot ناقص أو بأعمدة غلط', 1;
IF (SELECT COUNT(*) FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.name = N'IX_scheduled_job_runs_started' AND i.object_id = OBJECT_ID(N'dbo.scheduled_job_runs')
      AND ic.key_ordinal = 1 AND c.name = N'startedAt') <> 1
  THROW 79005, N'20261003_079: الفهرس IX_scheduled_job_runs_started ناقص أو بعمود غلط', 1;
GO
