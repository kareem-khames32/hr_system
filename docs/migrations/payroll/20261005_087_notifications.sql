-- 20261005_087: محرك الإشعارات (خطة التنفيذ — الدفعة B2.4).
-- أربع جداول جداد:
--   notifications: إشعار لمستلم واحد (حساب) عن حدث واحد، بفئته وكيانه ونصه ولينكه، ومفتاح منع تكرار فريد (dedupeKey)،
--     وهل بيظهر في قايمة الإشعارات داخل النظام (inApp).
--   notification_deliveries: سجل توصيل الإشعار على قناة واحدة (IN_APP / EMAIL) بحالته (PENDING / SENT / FAILED / SKIPPED / DIGEST)
--     ومحاولاته وسبب التخطّي أو آخر خطأ. العنوان متخفي. صف واحد لكل إشعار وقناة.
--   notification_templates: نص قالب معدَّل لحدث وقناة ولغة (من غير صف = النص الافتراضي في الكود).
--   notification_preferences: اختيار المستخدم لفئة وقناة (ON / OFF / DIGEST). من غير صف = ON.
-- الكود بيشتغل قبل الترحيل ده (مفيش إشعار بيتخزن ولا بريد بيتبعت، وقايمة الإشعارات الحالية زي ما هي) وبعده.
-- إضافي فقط: جداول جديدة بس. آمن للتكرار بحراسة OBJECT_ID وsys.indexes. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
CREATE TABLE dbo.notifications (
  [id] bigint IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notifications] PRIMARY KEY,
  [recipientUserId] int NOT NULL,
  [eventCode] nvarchar(60) NOT NULL,
  [category] nvarchar(30) NOT NULL,
  [entityType] nvarchar(40) NULL,
  [entityId] nvarchar(60) NULL,
  [kind] nvarchar(20) NOT NULL,
  [title] nvarchar(300) NOT NULL,
  [body] nvarchar(1000) NOT NULL,
  [link] nvarchar(300) NOT NULL,
  [inApp] bit NOT NULL,
  [dedupeKey] nvarchar(200) NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notifications') AND name = N'IX_notifications_recipient')
  CREATE INDEX [IX_notifications_recipient] ON dbo.notifications ([recipientUserId], [id]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notifications') AND name = N'UX_notifications_dedupe')
  CREATE UNIQUE INDEX [UX_notifications_dedupe] ON dbo.notifications ([dedupeKey]);
GO

IF OBJECT_ID(N'dbo.notification_deliveries', N'U') IS NULL
CREATE TABLE dbo.notification_deliveries (
  [id] bigint IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notification_deliveries] PRIMARY KEY,
  [notificationId] bigint NOT NULL,
  [channel] nvarchar(20) NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [attempts] int NOT NULL,
  [address] nvarchar(200) NULL,
  [subject] nvarchar(300) NULL,
  [body] nvarchar(MAX) NULL,
  [detail] nvarchar(1000) NULL,
  [createdAt] datetime2 NOT NULL,
  [sentAt] datetime2 NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_deliveries') AND name = N'UX_notification_deliveries_channel')
  CREATE UNIQUE INDEX [UX_notification_deliveries_channel] ON dbo.notification_deliveries ([notificationId], [channel]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_deliveries') AND name = N'IX_notification_deliveries_status')
  CREATE INDEX [IX_notification_deliveries_status] ON dbo.notification_deliveries ([status], [id]);
GO

IF OBJECT_ID(N'dbo.notification_templates', N'U') IS NULL
CREATE TABLE dbo.notification_templates (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notification_templates] PRIMARY KEY,
  [eventCode] nvarchar(60) NOT NULL,
  [channel] nvarchar(20) NOT NULL,
  [language] nvarchar(5) NOT NULL,
  [title] nvarchar(300) NOT NULL,
  [body] nvarchar(2000) NOT NULL,
  [updatedAt] datetime2 NOT NULL,
  [updatedByUserId] int NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_templates') AND name = N'UX_notification_templates_key')
  CREATE UNIQUE INDEX [UX_notification_templates_key] ON dbo.notification_templates ([eventCode], [channel], [language]);
GO

IF OBJECT_ID(N'dbo.notification_preferences', N'U') IS NULL
CREATE TABLE dbo.notification_preferences (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notification_preferences] PRIMARY KEY,
  [userId] int NOT NULL,
  [category] nvarchar(30) NOT NULL,
  [channel] nvarchar(20) NOT NULL,
  [mode] nvarchar(10) NOT NULL,
  [updatedAt] datetime2 NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_preferences') AND name = N'UX_notification_preferences_key')
  CREATE UNIQUE INDEX [UX_notification_preferences_key] ON dbo.notification_preferences ([userId], [category], [channel]);
GO

-- تحقق: الجداول الأربعة بأعمدتها وفهارسها
IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.notifications')) <> 13
  THROW 87001, N'20261005_087: جدول notifications ناقص أو أعمدته مش 13', 1;
IF OBJECT_ID(N'dbo.notification_deliveries', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.notification_deliveries')) <> 11
  THROW 87002, N'20261005_087: جدول notification_deliveries ناقص أو أعمدته مش 11', 1;
IF OBJECT_ID(N'dbo.notification_templates', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.notification_templates')) <> 8
  THROW 87003, N'20261005_087: جدول notification_templates ناقص أو أعمدته مش 8', 1;
IF OBJECT_ID(N'dbo.notification_preferences', N'U') IS NULL OR (SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.notification_preferences')) <> 6
  THROW 87004, N'20261005_087: جدول notification_preferences ناقص أو أعمدته مش 6', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notifications') AND name = N'UX_notifications_dedupe' AND is_unique = 1)
  THROW 87005, N'20261005_087: الفهرس الفريد UX_notifications_dedupe ناقص', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_deliveries') AND name = N'UX_notification_deliveries_channel' AND is_unique = 1)
  THROW 87006, N'20261005_087: الفهرس الفريد UX_notification_deliveries_channel ناقص', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_templates') AND name = N'UX_notification_templates_key' AND is_unique = 1)
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_preferences') AND name = N'UX_notification_preferences_key' AND is_unique = 1)
  THROW 87007, N'20261005_087: فهارس القوالب والتفضيلات الفريدة ناقصة', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notifications') AND name = N'IX_notifications_recipient')
   OR NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.notification_deliveries') AND name = N'IX_notification_deliveries_status')
  THROW 87008, N'20261005_087: فهارس القراءة ناقصة', 1;
GO
