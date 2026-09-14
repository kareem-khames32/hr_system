-- General HR templates and issued documents, independent of request letters.
-- Additive only. Apply through the versioned runner after a verified backup.
-- Constraint/index names match HrDocument* TypeORM metadata (SQL Server).

IF OBJECT_ID(N'dbo.hr_document_templates',N'U') IS NULL
  CREATE TABLE "hr_document_templates" (
    "id" int NOT NULL IDENTITY(1,1), "name" nvarchar(150) NOT NULL, "category" nvarchar(30) NOT NULL,
    "isActive" bit NOT NULL CONSTRAINT "DF_0d70b22bb5dff2c6b1a2e619d50" DEFAULT 1,
    "version" int NOT NULL CONSTRAINT "DF_010089236e9eb1f232ad105d7b7" DEFAULT 1,
    "draft" ntext NOT NULL, "customFields" ntext NOT NULL, "publishedRevisionId" int, "updatedByUserId" int,
    "createdAt" datetime2 NOT NULL CONSTRAINT "DF_24c304df86a5bfeb6597e483ca3" DEFAULT getdate(),
    "updatedAt" datetime2 NOT NULL CONSTRAINT "DF_9aeed4bc3a72be5e8dc0d000f84" DEFAULT getdate(),
    CONSTRAINT "PK_24deff8b2bb128fec5392d12293" PRIMARY KEY ("id")
  );

IF OBJECT_ID(N'dbo.hr_document_template_revisions',N'U') IS NULL
  CREATE TABLE "hr_document_template_revisions" (
    "id" int NOT NULL IDENTITY(1,1), "templateId" int NOT NULL, "revision" int NOT NULL,
    "name" nvarchar(150) NOT NULL, "category" nvarchar(30) NOT NULL,
    "content" ntext NOT NULL, "customFields" ntext NOT NULL, "publishedByUserId" int,
    "publishedAt" datetime2 NOT NULL CONSTRAINT "DF_18e867e142d555bcbf549aae5fa" DEFAULT getdate(),
    CONSTRAINT "UQ_d24d2ca88e1029d5841b690ca33" UNIQUE ("templateId", "revision"),
    CONSTRAINT "PK_0403a1fc2da297b143a280dedc3" PRIMARY KEY ("id")
  );

IF OBJECT_ID(N'dbo.hr_issued_documents',N'U') IS NULL
  CREATE TABLE "hr_issued_documents" (
    "id" int NOT NULL IDENTITY(1,1), "reference" nvarchar(60) NOT NULL,
    "templateId" int NOT NULL, "revisionId" int NOT NULL, "employeeId" int, "branchId" int,
    "fileId" int NOT NULL, "employeeDocumentId" int, "templateName" nvarchar(150) NOT NULL, "category" nvarchar(30) NOT NULL,
    "isFinancial" bit NOT NULL CONSTRAINT "DF_c98e6c4feae6c28f3403cc98804" DEFAULT 0,
    "issuedByUserId" int NOT NULL, "idempotencyKey" nvarchar(36) NOT NULL, "inputHash" nvarchar(64) NOT NULL, "snapshot" ntext NOT NULL,
    "createdAt" datetime2 NOT NULL CONSTRAINT "DF_6cc7b8f2dd5b7140b35bd15c4dc" DEFAULT getdate(),
    CONSTRAINT "UQ_6836faccacb9d3d09e55bfdeb02" UNIQUE ("issuedByUserId", "idempotencyKey"),
    CONSTRAINT "PK_1756919209bf375430265b218b1" PRIMARY KEY ("id")
  );

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.hr_issued_documents') AND name=N'IDX_3f5d55c7638d59136b0dc6cccd')
  CREATE UNIQUE INDEX "IDX_3f5d55c7638d59136b0dc6cccd" ON "hr_issued_documents" ("reference");
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.hr_issued_documents') AND name=N'IDX_1fdd7c5717541247e7f4ead5f6')
  CREATE INDEX "IDX_1fdd7c5717541247e7f4ead5f6" ON "hr_issued_documents" ("employeeId");
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.hr_issued_documents') AND name=N'IDX_b211d9823cf70d52e00c90d577')
  CREATE INDEX "IDX_b211d9823cf70d52e00c90d577" ON "hr_issued_documents" ("branchId");
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.hr_issued_documents') AND name=N'IDX_6ede6c971eab34c6854a970741')
  CREATE UNIQUE INDEX "IDX_6ede6c971eab34c6854a970741" ON "hr_issued_documents" ("fileId");
