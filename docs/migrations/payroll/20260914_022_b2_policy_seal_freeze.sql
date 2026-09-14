-- 20260914_022 (مسار B2، الخطوة 15 — إصلاحات مراجعة محرر مجموعات السياسات)
-- (1) جدول ختم النسخة المنشورة payroll_policy_version_seals: بصمة SHA-256 للمحتوى كما جُمّد، صف لكل نسخة (بدل بقائها داخل حدث JSON فقط).
--     جدول مستقل حتى يبقى مخطط payroll_policy_versions كما تثبته ترحيلات 006–010 واختباراتها.
-- (2) وقت النشر والتجميد للنسخ المنشورة قبل هذا الإصلاح كُتب بساعة Node المحلية بينما createdAt/updatedAt بساعة UTC:
--     يُعاد تمثيل اللحظة نفسها بساعة UTC. الفرق يُحسب من حدث PUBLISHED للنسخة (ساعة القاعدة) مقربًا لربع ساعة، ولا يُمس صف له ختم.
--     القيمة الزمنية الحقيقية لا تتغير (نفس اللحظة)؛ الـAPI يقرأ العمود بعد هذا بتحويل UTC (payroll-policy.entities.ts).
-- (3) ختم النسخ المنشورة القائمة من بصمة حدث PUBLISHED نفسه (لا حساب جديد ولا قيم مخترعة).
-- (4) مشغلات تجميد على مستوى القاعدة: نسخة منشورة أو مجمدة لا تتغير إعداداتها ولا سريانها ولا بيانات نشرها، والانتقال الوحيد المسموح
--     لحالتها هو ACTIVE → ARCHIVED؛ بنود تعريفها (المعاملات والشرائح والبنود) لا تُضاف ولا تُعدل؛ والختم لا يُعدل.
--     ملاحظة: المُرحّل يمنع كلمة الحذف في الملفات، فمنع حذف صفوف البنود ليس مشغلًا؛ حذف صف النسخة نفسها يمنعه مفتاح حدث النشر،
--     وأي حذف لبنود نسخة مجمدة يظهر في مراجعة النشر لأن البصمة المعاد حسابها لا تطابق الختم (POLICY_CONTENT_SEAL_MISMATCH).
-- لا يُحذف أي صف ولا عمود. إعادة التشغيل لا تغير شيئًا. أكواد THROW: 51231–51239.
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.payroll_policy_version_seals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[payroll_policy_version_seals] (
    [versionId] int NOT NULL,
    [contentHash] nvarchar(64) NOT NULL,
    [sealVersion] nvarchar(40) NOT NULL,
    [sealedBy] int NOT NULL,
    [sealedAt] datetime2 NOT NULL CONSTRAINT [DF_e41499613722b3e1a4a678ce627] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_payroll_policy_version_seal] PRIMARY KEY ([versionId])
  );
  ALTER TABLE dbo.[payroll_policy_version_seals] ADD CONSTRAINT [FK_payroll_policy_version_seal_version]
    FOREIGN KEY ([versionId]) REFERENCES dbo.[payroll_policy_versions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END
GO

-- (2) قبل الختم: النسخ المنشورة بلا ختم التي يبعد وقت نشرها عن حدث نشرها بفارق منطقة زمنية (مضاعف ربع ساعة حتى 14 ساعة).
UPDATE v
SET v.[publishedAt] = DATEADD(minute, -x.[offsetMinutes], v.[publishedAt]),
    v.[frozenAt] = DATEADD(minute, -x.[offsetMinutes], v.[frozenAt])
FROM dbo.[payroll_policy_versions] v
CROSS APPLY (SELECT TOP (1) ev.[createdAt] FROM dbo.[payroll_policy_events] ev
  WHERE ev.[versionId] = v.[id] AND ev.[eventType] = N'PUBLISHED' ORDER BY ev.[id] DESC) e
CROSS APPLY (SELECT CAST(ROUND(DATEDIFF_BIG(second, e.[createdAt], v.[publishedAt]) / 900.0, 0) * 15 AS int) AS [offsetMinutes]) x
WHERE v.[publishedAt] IS NOT NULL AND v.[frozenAt] = v.[publishedAt]
  AND NOT EXISTS (SELECT 1 FROM dbo.[payroll_policy_version_seals] s WHERE s.[versionId] = v.[id])
  AND x.[offsetMinutes] <> 0 AND x.[offsetMinutes] BETWEEN -840 AND 840
  AND ABS(DATEDIFF_BIG(second, DATEADD(minute, -x.[offsetMinutes], v.[publishedAt]), e.[createdAt])) <= 60;

-- (3) ختم النسخ المنشورة القائمة ببصمة حدث PUBLISHED (64 حرفًا ست عشريًا فقط).
INSERT INTO dbo.[payroll_policy_version_seals] ([versionId], [contentHash], [sealVersion], [sealedBy], [sealedAt])
SELECT v.[id], e.[hashValue], N'POLICY_SEAL_V1_20260914', COALESCE(v.[publishedBy], e.[actorUserId]), e.[createdAt]
FROM dbo.[payroll_policy_versions] v
CROSS APPLY (SELECT TOP (1) ev.[createdAt], ev.[actorUserId],
    CASE WHEN ISJSON(CAST(ev.[payload] AS nvarchar(max))) = 1 THEN JSON_VALUE(CAST(ev.[payload] AS nvarchar(max)), N'$.contentHash') END AS [hashValue]
  FROM dbo.[payroll_policy_events] ev
  WHERE ev.[versionId] = v.[id] AND ev.[eventType] = N'PUBLISHED' ORDER BY ev.[id] DESC) e
WHERE v.[frozenAt] IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.[payroll_policy_version_seals] s WHERE s.[versionId] = v.[id])
  AND LEN(e.[hashValue]) = 64 AND e.[hashValue] NOT LIKE N'%[^0-9a-f]%';
GO

-- (4-أ) صف النسخة المنشورة أو المجمدة.
CREATE OR ALTER TRIGGER dbo.[TR_payroll_policy_version_frozen] ON dbo.[payroll_policy_versions] AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM deleted WHERE [frozenAt] IS NOT NULL OR [publishedAt] IS NOT NULL) RETURN;
  -- أعمدة ntext لا تُقرأ داخل المشغل؛ مجرد إدراجها في SET على نسخة مجمدة مرفوض.
  IF UPDATE([metadata]) OR UPDATE([definitionWarningAcknowledgements])
    THROW 51231, N'نسخة سياسة الرواتب منشورة ومجمدة: بياناتها الوصفية وإقرارات تعريفها لا تتغير؛ أنشئ مسودة جديدة منها', 1;
  IF EXISTS (
    SELECT 1 FROM deleted d INNER JOIN inserted i ON i.[id] = d.[id]
    WHERE (d.[frozenAt] IS NOT NULL OR d.[publishedAt] IS NOT NULL) AND EXISTS (
      SELECT d.[policyId], d.[versionNo], d.[sourceVersionId], d.[effectiveFrom], d.[effectiveTo], d.[contractVersion], d.[catalogVersion], d.[engineVersion],
        d.[collectionPolicy], d.[defaultPeriodType], d.[cycleStartDay], d.[cycleEndMode], d.[cycleEndDay], d.[baseDaysBasis], d.[monthlyDays], d.[dailyHours],
        d.[rateBase], d.[roundingMode], d.[roundingScale], d.[divisionByZeroMode], d.[maxDeductionPctOfGross], d.[minNetGuarantee], d.[netFloorPct],
        d.[carryOverExcess], d.[skipAttendance], d.[lateDeductionEnabled], d.[currency], d.[publishedAt], d.[publishedBy], d.[frozenAt], d.[createdBy], d.[createdAt]
      EXCEPT
      SELECT i.[policyId], i.[versionNo], i.[sourceVersionId], i.[effectiveFrom], i.[effectiveTo], i.[contractVersion], i.[catalogVersion], i.[engineVersion],
        i.[collectionPolicy], i.[defaultPeriodType], i.[cycleStartDay], i.[cycleEndMode], i.[cycleEndDay], i.[baseDaysBasis], i.[monthlyDays], i.[dailyHours],
        i.[rateBase], i.[roundingMode], i.[roundingScale], i.[divisionByZeroMode], i.[maxDeductionPctOfGross], i.[minNetGuarantee], i.[netFloorPct],
        i.[carryOverExcess], i.[skipAttendance], i.[lateDeductionEnabled], i.[currency], i.[publishedAt], i.[publishedBy], i.[frozenAt], i.[createdBy], i.[createdAt]))
    THROW 51232, N'نسخة سياسة الرواتب منشورة ومجمدة: لا تتغير إعداداتها ولا دورتها ولا سريانها ولا بيانات نشرها؛ أنشئ مسودة جديدة منها', 1;
  IF EXISTS (SELECT 1 FROM deleted d INNER JOIN inserted i ON i.[id] = d.[id]
    WHERE (d.[frozenAt] IS NOT NULL OR d.[publishedAt] IS NOT NULL) AND i.[status] <> d.[status] AND NOT (d.[status] = N'ACTIVE' AND i.[status] = N'ARCHIVED'))
    THROW 51233, N'نسخة سياسة الرواتب منشورة: الانتقال الوحيد المسموح لحالتها هو الأرشفة', 1;
END
GO

-- (4-ب) بنود تعريف النسخة المجمدة.
CREATE OR ALTER TRIGGER dbo.[TR_payroll_policy_parameter_frozen] ON dbo.[payroll_policy_parameters] AFTER INSERT, UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM (SELECT [versionId] FROM inserted UNION SELECT [versionId] FROM deleted) r
    INNER JOIN dbo.[payroll_policy_versions] v ON v.[id] = r.[versionId] WHERE v.[frozenAt] IS NOT NULL OR v.[publishedAt] IS NOT NULL)
    THROW 51234, N'معاملات نسخة سياسة منشورة مجمدة: لا تضاف ولا تعدل؛ أنشئ مسودة جديدة', 1;
END
GO

CREATE OR ALTER TRIGGER dbo.[TR_payroll_tier_set_frozen] ON dbo.[payroll_tier_sets] AFTER INSERT, UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM (SELECT [versionId] FROM inserted UNION SELECT [versionId] FROM deleted) r
    INNER JOIN dbo.[payroll_policy_versions] v ON v.[id] = r.[versionId] WHERE v.[frozenAt] IS NOT NULL OR v.[publishedAt] IS NOT NULL)
    THROW 51235, N'مجموعات شرائح نسخة سياسة منشورة مجمدة: لا تضاف ولا تعدل؛ أنشئ مسودة جديدة', 1;
END
GO

CREATE OR ALTER TRIGGER dbo.[TR_payroll_policy_component_frozen] ON dbo.[payroll_policy_components] AFTER INSERT, UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM (SELECT [versionId] FROM inserted UNION SELECT [versionId] FROM deleted) r
    INNER JOIN dbo.[payroll_policy_versions] v ON v.[id] = r.[versionId] WHERE v.[frozenAt] IS NOT NULL OR v.[publishedAt] IS NOT NULL)
    THROW 51236, N'بنود نسخة سياسة منشورة مجمدة: لا تضاف ولا تعدل؛ أنشئ مسودة جديدة', 1;
END
GO

CREATE OR ALTER TRIGGER dbo.[TR_payroll_policy_tier_frozen] ON dbo.[payroll_policy_tiers] AFTER INSERT, UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM (SELECT [tierSetId] FROM inserted UNION SELECT [tierSetId] FROM deleted) r
    INNER JOIN dbo.[payroll_tier_sets] s ON s.[id] = r.[tierSetId]
    INNER JOIN dbo.[payroll_policy_versions] v ON v.[id] = s.[versionId] WHERE v.[frozenAt] IS NOT NULL OR v.[publishedAt] IS NOT NULL)
    THROW 51237, N'شرائح نسخة سياسة منشورة مجمدة: لا تضاف ولا تعدل؛ أنشئ مسودة جديدة', 1;
END
GO

CREATE OR ALTER TRIGGER dbo.[TR_payroll_policy_version_seal_frozen] ON dbo.[payroll_policy_version_seals] AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM inserted)
    THROW 51238, N'ختم محتوى نسخة سياسة الرواتب لا يُعدل بعد النشر', 1;
END
GO

-- التحقق الفعلي قبل الالتزام.
IF OBJECT_ID(N'dbo.payroll_policy_version_seals', N'U') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_policy_version_frozen', N'TR') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_policy_parameter_frozen', N'TR') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_tier_set_frozen', N'TR') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_policy_component_frozen', N'TR') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_policy_tier_frozen', N'TR') IS NULL
  OR OBJECT_ID(N'dbo.TR_payroll_policy_version_seal_frozen', N'TR') IS NULL
  OR EXISTS (SELECT 1 FROM dbo.[payroll_policy_versions] v
    WHERE v.[frozenAt] IS NOT NULL
      AND EXISTS (SELECT 1 FROM dbo.[payroll_policy_events] ev WHERE ev.[versionId] = v.[id] AND ev.[eventType] = N'PUBLISHED')
      AND NOT EXISTS (SELECT 1 FROM dbo.[payroll_policy_version_seals] s WHERE s.[versionId] = v.[id]))
  OR EXISTS (SELECT 1 FROM dbo.[payroll_policy_versions] v
    CROSS APPLY (SELECT TOP (1) ev.[createdAt] FROM dbo.[payroll_policy_events] ev
      WHERE ev.[versionId] = v.[id] AND ev.[eventType] = N'PUBLISHED' ORDER BY ev.[id] DESC) e
    WHERE v.[publishedAt] IS NOT NULL AND ABS(DATEDIFF_BIG(second, v.[publishedAt], e.[createdAt])) > 300)
  THROW 51239, N'ترحيل 022: جدول الختم أو مشغلات التجميد ناقصة، أو نسخة منشورة بلا ختم، أو وقت نشر لا يطابق حدثه بتوقيت UTC', 1;
