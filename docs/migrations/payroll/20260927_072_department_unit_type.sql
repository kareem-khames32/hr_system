-- 20260927_072: مستوى «الإدارة» فوق القسم (قرار المالك 27 سبتمبر: الهيكل «الإدارة ← القسم ← الفريق»، ومعتمد «مدير الإدارة»).
-- الإدارة نوع وحدة على شجرة الأقسام نفسها (مش جدول جديد): departments.unitType = 'ADMINISTRATION' (إدارة) أو 'DEPARTMENT' (قسم)،
--   فأي حاجة بتختار قسم بأقسامه الفرعية (فلاتر المسير، جمهور العطلات، الخصومات) بتشتغل على الإدارة من غير تعديل.
-- عمود nvarchar(20) NOT NULL بقيمة افتراضية 'DEPARTMENT': كل الأقسام القائمة بتفضل «قسم» وقت الإضافة نفسها (NOT NULL + DEFAULT).
-- القيم بتتفحص في الكود (org.dto وorg.service) من غير قيد CHECK — عشان المخطط يطابق بيانات الكيان.
-- تعبئة إضافية واحدة: «الإدارة التنفيذية» (القسم المعلَّم isExecutive) نوعها «إدارة» — نفس اللي الخادم بيعمله لما وحدة تتعلّم إدارة تنفيذية.
--   الهيكل القائم يفضل صالح من غير أي تعديل: باقي الأقسام «قسم» وآباؤها (قسم من فرعها أو الإدارة التنفيذية) مسموحة للقسم.
-- بلا DROP ولا DELETE. آمن للتكرار بحارس COL_LENGTH، والتعبئة بتلمس الصف اللي لسه مش «إدارة» بس. متوافق مع SQL Server 2019.
-- اسم القيد الافتراضي = اللي بيولّده TypeORM للكيان (DF_ + أول 27 حرف من sha1 «departments_unitType») عشان فرق المخطط يبقى صفرًا.
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.departments', N'unitType') IS NULL
  ALTER TABLE dbo.departments ADD [unitType] nvarchar(20) NOT NULL
    CONSTRAINT [DF_8445a8ae50fcab9b4a3c007e0f1] DEFAULT 'DEPARTMENT';
GO

UPDATE dbo.departments SET [unitType] = N'ADMINISTRATION' WHERE [isExecutive] = 1 AND [unitType] <> N'ADMINISTRATION';
GO

-- تحقق: العمود موجود بنوعه ومش بيقبل الفراغ، وقيمته الافتراضية 'DEPARTMENT' باسم قيد TypeORM، والإدارة التنفيذية «إدارة»
IF COL_LENGTH(N'dbo.departments', N'unitType') IS NULL
  THROW 72001, N'20260927_072: عمود unitType ناقص في departments', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.departments') AND name = N'unitType'
               AND system_type_id = TYPE_ID(N'nvarchar') AND max_length = 40 AND is_nullable = 0)
  THROW 72002, N'20260927_072: departments.unitType لازم nvarchar(20) NOT NULL', 1;
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints d
               JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
               WHERE d.parent_object_id = OBJECT_ID(N'dbo.departments') AND c.name = N'unitType'
                 AND d.name = N'DF_8445a8ae50fcab9b4a3c007e0f1' AND d.definition = N'(''DEPARTMENT'')')
  THROW 72003, N'20260927_072: القيمة الافتراضية لـ departments.unitType لازم ''DEPARTMENT'' باسم DF_8445a8ae50fcab9b4a3c007e0f1', 1;
IF EXISTS (SELECT 1 FROM dbo.departments WHERE [isExecutive] = 1 AND [unitType] <> N'ADMINISTRATION')
  THROW 72004, N'20260927_072: «الإدارة التنفيذية» لازم نوعها ADMINISTRATION', 1;
GO
