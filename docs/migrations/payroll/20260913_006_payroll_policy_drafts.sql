-- PL-01: ثلاث جداول جديدة لمسودات السياسات وتاريخها، دون تعديل أعمدة أو بيانات قائمة.
-- العلاقات محصورة بين الجداول الجديدة، مع منع الحذف والتعديل المتتابع.
CREATE TABLE dbo.[payroll_policies] (
  [id] INT NOT NULL IDENTITY(1,1),
  [code] NVARCHAR(40) NOT NULL,
  [name] NVARCHAR(200) NOT NULL,
  [description] NVARCHAR(MAX) NULL,
  [branchId] INT NULL,
  [defaultScopeType] NVARCHAR(20) NULL,
  [defaultScopeIds] NTEXT NULL,
  [isActive] BIT NOT NULL CONSTRAINT [DF_75e1c0cf09663c2100fb8a23578] DEFAULT 1,
  [revision] INT NOT NULL CONSTRAINT [DF_07fe6b06305ded6c261c5f93342] DEFAULT 1,
  [createdBy] INT NOT NULL,
  [updatedBy] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_8764cd2e7463995c07a20c53a72] DEFAULT GETDATE(),
  [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_4c75e616d871c998c552bdd8f26] DEFAULT GETDATE(),
  CONSTRAINT [PK_7772b93d94609fbac797e252696] PRIMARY KEY ([id])
);

CREATE INDEX [IX_payroll_policy_branch] ON dbo.[payroll_policies] ([branchId]);

CREATE UNIQUE INDEX [UX_payroll_policy_code] ON dbo.[payroll_policies] ([code]);

CREATE TABLE dbo.[payroll_policy_versions] (
  [id] INT NOT NULL IDENTITY(1,1),
  [policyId] INT NOT NULL,
  [versionNo] INT NOT NULL,
  [sourceVersionId] INT NULL,
  [status] NVARCHAR(12) NOT NULL CONSTRAINT [DF_bf342e8f407532d509f08c9da78] DEFAULT 'DRAFT',
  [effectiveFrom] DATE NOT NULL,
  [effectiveTo] DATE NULL,
  [contractVersion] NVARCHAR(20) NOT NULL CONSTRAINT [DF_2f4a220017b0022183328b1a150] DEFAULT 'SRS_V1',
  [metadata] NTEXT NULL,
  [revision] INT NOT NULL CONSTRAINT [DF_8e61e2bbda4f10eecd0334d2587] DEFAULT 1,
  [publishedAt] DATETIME2 NULL,
  [publishedBy] INT NULL,
  [frozenAt] DATETIME2 NULL,
  [createdBy] INT NOT NULL,
  [updatedBy] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_f53b35ca4a109e9de0c1a66a7cc] DEFAULT GETDATE(),
  [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_b60e57f24522b076489d04ecbcc] DEFAULT GETDATE(),
  CONSTRAINT [FK_payroll_policy_version_policy] FOREIGN KEY ([policyId]) REFERENCES dbo.[payroll_policies] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_payroll_policy_version_source] FOREIGN KEY ([sourceVersionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_3bdd89aa730b0e6ece18b7dbd97] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_payroll_policy_version_number] ON dbo.[payroll_policy_versions] ([policyId], [versionNo]);

CREATE TABLE dbo.[payroll_policy_events] (
  [id] INT NOT NULL IDENTITY(1,1),
  [policyId] INT NOT NULL,
  [versionId] INT NULL,
  [eventType] NVARCHAR(30) NOT NULL,
  [actorUserId] INT NOT NULL,
  [reason] NVARCHAR(500) NULL,
  [payload] NTEXT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_9c7c0cc8c38d14ae61109de9568] DEFAULT GETDATE(),
  CONSTRAINT [FK_payroll_policy_event_policy] FOREIGN KEY ([policyId]) REFERENCES dbo.[payroll_policies] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_payroll_policy_event_version] FOREIGN KEY ([versionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_c96e1a9242999996d6e56ff2f8a] PRIMARY KEY ([id])
);

CREATE INDEX [IX_payroll_policy_event_policy] ON dbo.[payroll_policy_events] ([policyId], [id]);
