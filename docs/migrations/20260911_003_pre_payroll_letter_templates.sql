-- Version 20260911_003: new template tables and nullable issued-letter snapshots.

-- Existing issued letters and their stored PDF references remain unchanged.

IF OBJECT_ID(N'dbo.letter_templates',N'U') IS NULL
  CREATE TABLE "letter_templates" ("id" int NOT NULL IDENTITY(1,1), "code" nvarchar(64) NOT NULL, "name" nvarchar(150) NOT NULL, "isActive" bit NOT NULL CONSTRAINT "DF_77fcdfa6ac326731ea138010254" DEFAULT 1, "version" int NOT NULL CONSTRAINT "DF_a54ac87c930131cbdb1413d1124" DEFAULT 1, "draft" ntext NOT NULL, "publishedRevisionId" int, "updatedByUserId" int, "createdAt" datetime2 NOT NULL CONSTRAINT "DF_4798a0c318755bb65698992e7e2" DEFAULT getdate(), "updatedAt" datetime2 NOT NULL CONSTRAINT "DF_3d57c2d43ce2e9bdc5d99855de4" DEFAULT getdate(), CONSTRAINT "PK_d649190668fdfcddc29294ab22f" PRIMARY KEY ("id"));

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.letter_templates') AND name=N'IDX_9b30e86c71dc29f951a2b1e6c6')
  CREATE UNIQUE INDEX "IDX_9b30e86c71dc29f951a2b1e6c6" ON "letter_templates" ("code") ;

IF OBJECT_ID(N'dbo.letter_template_revisions',N'U') IS NULL
  CREATE TABLE "letter_template_revisions" ("id" int NOT NULL IDENTITY(1,1), "templateId" int NOT NULL, "revision" int NOT NULL, "content" ntext NOT NULL, "publishedByUserId" int, "publishedAt" datetime2 NOT NULL CONSTRAINT "DF_ff9f2761fea95794d521f242265" DEFAULT getdate(), CONSTRAINT "UQ_2231c140201b3184df38f9a4313" UNIQUE ("templateId", "revision"), CONSTRAINT "PK_bfb710ed614b07242612429f1c3" PRIMARY KEY ("id"));

IF OBJECT_ID(N'dbo.letter_template_bindings',N'U') IS NULL
  CREATE TABLE "letter_template_bindings" ("requestTypeCode" nvarchar(50) NOT NULL, "templateId" int NOT NULL, CONSTRAINT "PK_08f103685c18264386e10ff8aed" PRIMARY KEY ("requestTypeCode"));

IF COL_LENGTH(N'dbo.letter_requests',N'templateId') IS NULL
  ALTER TABLE "letter_requests" ADD "templateId" int NULL;

IF COL_LENGTH(N'dbo.letter_requests',N'templateRevisionId') IS NULL
  ALTER TABLE "letter_requests" ADD "templateRevisionId" int NULL;

IF COL_LENGTH(N'dbo.letter_requests',N'contentSnapshot') IS NULL
  ALTER TABLE "letter_requests" ADD "contentSnapshot" ntext NULL;
