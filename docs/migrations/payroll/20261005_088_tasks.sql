-- 20261005_088: محرك المهام (خطة التنفيذ — الدفعة B2.5).
-- جدول واحد جديد:
--   tasks: مهمة عامة على موظف (assigneeEmployeeId) أو على دور وظيفي (assigneeRole) في فرع المهمة، بموعدها وأولويتها
--     وحالتها (OPEN / IN_PROGRESS / WAITING / DONE / CANCELLED)، وإثبات إقفالها (نص وملف)، ووقت تذكيرها وتصعيدها.
-- مهام التهيئة (onboarding_tasks) وبنود إخلاء الطرف (clearance_items) في جداولها زي ما هي.
-- الكود بيشتغل قبل الترحيل ده («مهامي» بتعرض التهيئة والإخلاء بس، والمهمة العامة مرفوضة برسالة) وبعده.
-- إضافي فقط: جدول جديد بس. آمن للتكرار بحراسة OBJECT_ID وsys.indexes. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.tasks', N'U') IS NULL
CREATE TABLE dbo.tasks (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_tasks] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [description] nvarchar(2000) NULL,
  [assigneeEmployeeId] int NULL,
  [assigneeRole] nvarchar(40) NULL,
  [branchId] int NOT NULL,
  [createdByUserId] int NOT NULL,
  [dueDate] date NULL,
  [priority] nvarchar(10) NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [requiresProof] bit NOT NULL,
  [proofNote] nvarchar(1000) NULL,
  [proofFileId] int NULL,
  [statusNote] nvarchar(500) NULL,
  [closedByUserId] int NULL,
  [closedAt] datetime2 NULL,
  [remindedAt] datetime2 NULL,
  [escalatedAt] datetime2 NULL,
  [createdAt] datetime2 NOT NULL,
  [updatedAt] datetime2 NOT NULL
);
GO

-- تحقق قبل الفهارس: جدول tasks قديم بشكل تاني = الترحيل بيقف هنا من غير ما يلمسه
IF OBJECT_ID(N'dbo.tasks', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.tasks')) <> 20
  THROW 88001, N'20261005_088: جدول tasks ناقص أو أعمدته مش 20', 1;
IF COL_LENGTH(N'dbo.tasks', N'assigneeEmployeeId') IS NULL OR COL_LENGTH(N'dbo.tasks', N'assigneeRole') IS NULL
   OR COL_LENGTH(N'dbo.tasks', N'proofFileId') IS NULL OR COL_LENGTH(N'dbo.tasks', N'escalatedAt') IS NULL
  THROW 88002, N'20261005_088: جدول tasks موجود بأعمدة غير أعمدة محرك المهام', 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tasks') AND name = N'IX_tasks_assignee')
  CREATE INDEX [IX_tasks_assignee] ON dbo.tasks ([assigneeEmployeeId], [status]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tasks') AND name = N'IX_tasks_branch')
  CREATE INDEX [IX_tasks_branch] ON dbo.tasks ([branchId], [status], [dueDate]);
GO

-- تحقق: الفهرسين
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tasks') AND name = N'IX_tasks_assignee')
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.tasks') AND name = N'IX_tasks_branch')
  THROW 88003, N'20261005_088: فهارس جدول tasks ناقصة', 1;
GO
