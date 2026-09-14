-- PL-04: نسخ الأجر المؤرخ الموثقة صراحة؛ لا تعبئة من الراتب الحالي ولا تعديل سجل موظف قائم.

CREATE TABLE dbo.[employee_salary_history_versions] (
  [id] INT NOT NULL IDENTITY(1,1),
  [employeeId] INT NOT NULL,
  [revision] INT NOT NULL,
  [reason] NVARCHAR(500) NOT NULL,
  [evidenceReference] NVARCHAR(200) NOT NULL,
  [currentSourceHash] NVARCHAR(64) NOT NULL,
  [contentHash] NVARCHAR(64) NOT NULL,
  [createdBy] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_7544540837e04a4e295dda27375] DEFAULT GETDATE(),
  CONSTRAINT [FK_employee_salary_history_employee] FOREIGN KEY ([employeeId]) REFERENCES dbo.[employees] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_9232583e0f862892fcadbfcb9fe] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_employee_salary_history_revision] ON dbo.[employee_salary_history_versions] ([employeeId], [revision]);

CREATE TABLE dbo.[employee_salary_history] (
  [id] INT NOT NULL IDENTITY(1,1),
  [versionId] INT NOT NULL,
  [sequence] INT NOT NULL,
  [effectiveFrom] DATE NOT NULL,
  [effectiveTo] DATE NULL,
  [currency] NVARCHAR(3) NOT NULL,
  [basicSalary] DECIMAL(18,2) NOT NULL,
  [housingAllowance] DECIMAL(18,2) NOT NULL,
  [transportAllowance] DECIMAL(18,2) NOT NULL,
  [phoneAllowance] DECIMAL(18,2) NOT NULL,
  [workNatureAllowance] DECIMAL(18,2) NOT NULL,
  [otherAllowance] DECIMAL(18,2) NOT NULL,
  CONSTRAINT [FK_employee_salary_history_version] FOREIGN KEY ([versionId]) REFERENCES dbo.[employee_salary_history_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_0d0766845b70e91af5656e03d2f] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_employee_salary_history_sequence] ON dbo.[employee_salary_history] ([versionId], [sequence]);
