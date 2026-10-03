-- 20261003_084: سجل التدقيق المركزي (خطة التنفيذ — الدفعة B2.1).
-- (1) جدول جديد audit_log: مين وإمتى والعملية والكيان والفرع، وقبل وبعد للحقول الحساسة (JSON، والبنكية متخفية)، والـIP والجهاز.
--     الفئات: الدخول، والصلاحيات والنطاق، والإعدادات والموديولات، والبيانات البنكية والرواتب، والتصدير، وإجراءات المسير.
-- (2) مشغّل TR_audit_log_append_only: أي تعديل أو مسح على الجدول بيترفض (THROW 84010) — السجل إضافة بس.
--     التطبيق نفسه مابيعدّلش ولا بيمسح؛ الاحتفاظ (audit.retention_months) بيخفي القديم من البحث العادي بس.
-- الكود بيشتغل قبل الترحيل ده (الأحداث مابتتسجلش وتحذير واحد في سجل الخادم، والشاشة بتقول محتاجة الترحيل) وبعده.
-- إضافي فقط: جدول ومشغّل جداد، بلا لمس لأي جدول موجود ولا تعبئة رجعية. آمن للتكرار بحراسة OBJECT_ID وCREATE OR ALTER. متوافق مع SQL Server 2019.
-- الأسماء بالحرف اللي الكيان AuditLog بيطلعها عشان فرق المخطط يبقى صفرًا:
-- PK_audit_log وCK_audit_log_before_json وCK_audit_log_after_json وIX_audit_log_at وIX_audit_log_category_at وIX_audit_log_entity وIX_audit_log_actor_at.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.audit_log', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.audit_log (
    [id] bigint NOT NULL IDENTITY(1,1),
    [at] datetime2 NOT NULL,
    [category] nvarchar(20) NOT NULL,
    [action] nvarchar(60) NOT NULL,
    [entityType] nvarchar(40) NULL,
    [entityId] nvarchar(60) NULL,
    [actorUserId] int NULL,
    [branchId] int NULL,
    [summary] nvarchar(500) NULL,
    [before] nvarchar(MAX) NULL,
    [after] nvarchar(MAX) NULL,
    [ip] nvarchar(64) NULL,
    [userAgent] nvarchar(300) NULL,
    CONSTRAINT [PK_audit_log] PRIMARY KEY ([id]),
    CONSTRAINT [CK_audit_log_before_json] CHECK ([before] IS NULL OR ISJSON([before]) = 1),
    CONSTRAINT [CK_audit_log_after_json] CHECK ([after] IS NULL OR ISJSON([after]) = 1)
  );
END
GO

-- البحث بالوقت، وبالفئة والوقت، وبالكيان، وبمين والوقت
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_log_at' AND object_id = OBJECT_ID(N'dbo.audit_log'))
  CREATE INDEX [IX_audit_log_at] ON dbo.audit_log ([at]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_log_category_at' AND object_id = OBJECT_ID(N'dbo.audit_log'))
  CREATE INDEX [IX_audit_log_category_at] ON dbo.audit_log ([category], [at]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_log_entity' AND object_id = OBJECT_ID(N'dbo.audit_log'))
  CREATE INDEX [IX_audit_log_entity] ON dbo.audit_log ([entityType], [entityId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_log_actor_at' AND object_id = OBJECT_ID(N'dbo.audit_log'))
  CREATE INDEX [IX_audit_log_actor_at] ON dbo.audit_log ([actorUserId], [at]);
GO

-- السجل إضافة بس: أي تعديل أو مسح مرفوض
CREATE OR ALTER TRIGGER dbo.[TR_audit_log_append_only] ON dbo.[audit_log] INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 84010, N'سجل التدقيق إضافة بس: مفيش تعديل ولا مسح', 1;
END
GO

-- تحقق: الجدول بأعمدته ومفتاحه وقيوده وفهارسه بأسمائهم، والمشغّل على التعديل والمسح
IF OBJECT_ID(N'dbo.audit_log', N'U') IS NULL
  THROW 84001, N'20261003_084: جدول audit_log غير موجود بعد الترحيل', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'id' AND system_type_id = TYPE_ID(N'bigint') AND is_nullable = 0 AND is_identity = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'at' AND system_type_id = TYPE_ID(N'datetime2') AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'category' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'action' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 120 AND is_nullable = 0)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'entityType' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 80 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'entityId' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 120 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'actorUserId' AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'branchId' AND system_type_id = TYPE_ID(N'int') AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'summary' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 1000 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'before' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'after' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = -1 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'ip' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 128 AND is_nullable = 1)
  OR NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.audit_log') AND name = N'userAgent' AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 600 AND is_nullable = 1)
  THROW 84002, N'20261003_084: أعمدة audit_log ناقصة أو بنوع غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'PK_audit_log' AND type = 'PK' AND parent_object_id = OBJECT_ID(N'dbo.audit_log'))
  THROW 84003, N'20261003_084: المفتاح الأساسي PK_audit_log غير موجود باسمه', 1;
IF (SELECT COUNT(*) FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.audit_log')
      AND name IN (N'CK_audit_log_before_json', N'CK_audit_log_after_json')) <> 2
  THROW 84004, N'20261003_084: قيود JSON على audit_log ناقصة', 1;
IF (SELECT COUNT(*) FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.audit_log')
      AND name IN (N'IX_audit_log_at', N'IX_audit_log_category_at', N'IX_audit_log_entity', N'IX_audit_log_actor_at')) <> 4
  THROW 84005, N'20261003_084: فهارس audit_log ناقصة', 1;
IF (SELECT COUNT(*) FROM sys.triggers t JOIN sys.trigger_events e ON e.object_id = t.object_id
      WHERE t.name = N'TR_audit_log_append_only' AND t.parent_id = OBJECT_ID(N'dbo.audit_log') AND t.is_instead_of_trigger = 1 AND t.is_disabled = 0
        AND e.[type] IN (2, 3)) <> 2 -- 2 = التعديل، 3 = المسح (sys.trigger_events)
  THROW 84006, N'20261003_084: مشغّل منع التعديل والمسح على audit_log ناقص أو متعطل', 1;
GO
