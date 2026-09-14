-- PL-03: تعريفات نسخة السياسة في أربعة جداول جديدة؛ لا إعادة حساب أو تعبئة تاريخية.

-- مرجع النسخة القائم مُدار بترحيل006؛ جميع العلاقات تمنع الحذف والتعديل المتتابع.

ALTER TABLE dbo.payroll_policy_versions ADD catalogVersion nvarchar(40) NULL;

ALTER TABLE dbo.payroll_policy_versions ADD engineVersion nvarchar(40) NULL;

ALTER TABLE dbo.payroll_policy_versions ADD definitionWarningAcknowledgements ntext NULL;

CREATE TABLE dbo.[payroll_tier_sets] (
  [id] INT NOT NULL IDENTITY(1,1),
  [versionId] INT NOT NULL,
  [code] NVARCHAR(40) NOT NULL,
  [nameAr] NVARCHAR(200) NOT NULL,
  [description] NVARCHAR(2000) NULL,
  [inputVar] NVARCHAR(40) NULL,
  [inputFormula] NVARCHAR(500) NULL,
  [inputUnit] NVARCHAR(12) NOT NULL,
  [applicationBasis] NVARCHAR(24) NOT NULL,
  [tierApplicationMode] NVARCHAR(8) NOT NULL,
  [graceMode] NVARCHAR(24) NOT NULL,
  [graceMinutes] INT NOT NULL,
  [graceMaxUsesPerPeriod] INT NULL,
  [allowGraceOnFlexibleShift] BIT NOT NULL,
  [allowShiftGraceOverride] BIT NOT NULL,
  [noMatchBehavior] NVARCHAR(16) NOT NULL,
  [maxDailyDeductionDayFraction] DECIMAL(5,4) NULL,
  [maxPeriodDeductionDayFraction] DECIMAL(7,4) NULL,
  [secondsRoundingMode] NVARCHAR(8) NOT NULL,
  [minutesRoundingMode] NVARCHAR(8) NOT NULL,
  [roundingUnitMinutes] TINYINT NOT NULL,
  [roundingMode] NVARCHAR(12) NULL,
  [roundingScale] TINYINT NULL,
  [isActive] BIT NOT NULL,
  CONSTRAINT [FK_payroll_tier_set_version] FOREIGN KEY ([versionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_1c18696afa514619b215b965e8c] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_payroll_tier_set_owner] ON dbo.[payroll_tier_sets] ([versionId], [id]);

CREATE UNIQUE INDEX [UX_payroll_tier_set_code] ON dbo.[payroll_tier_sets] ([versionId], [code]);

CREATE TABLE dbo.[payroll_policy_parameters] (
  [id] INT NOT NULL IDENTITY(1,1),
  [versionId] INT NOT NULL,
  [code] NVARCHAR(40) NOT NULL,
  [nameAr] NVARCHAR(200) NOT NULL,
  [value] DECIMAL(18,6) NOT NULL,
  [unit] NVARCHAR(24) NOT NULL,
  [isActive] BIT NOT NULL,
  CONSTRAINT [FK_payroll_policy_parameter_version] FOREIGN KEY ([versionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_ecc2853b9cc1ebbcc3843a109ce] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_payroll_policy_parameter_code] ON dbo.[payroll_policy_parameters] ([versionId], [code]);

CREATE TABLE dbo.[payroll_policy_components] (
  [id] INT NOT NULL IDENTITY(1,1),
  [versionId] INT NOT NULL,
  [code] NVARCHAR(40) NOT NULL,
  [nameAr] NVARCHAR(200) NOT NULL,
  [componentType] NVARCHAR(12) NOT NULL,
  [stage] TINYINT NOT NULL,
  [sequence] INT NOT NULL,
  [valueSource] NVARCHAR(20) NOT NULL,
  [conditionFormula] NVARCHAR(500) NULL,
  [unit] NVARCHAR(12) NOT NULL,
  [prorationMode] NVARCHAR(30) NOT NULL,
  [amount] DECIMAL(18,2) NULL,
  [fieldPath] NVARCHAR(60) NULL,
  [missingFieldBehavior] NVARCHAR(8) NULL,
  [varCode] NVARCHAR(40) NULL,
  [multiplier] DECIMAL(18,6) NULL,
  [percent] DECIMAL(9,4) NULL,
  [baseCode] NVARCHAR(48) NULL,
  [tierSetId] INT NULL,
  [formula] NVARCHAR(500) NULL,
  [ledgerCategory] NVARCHAR(40) NULL,
  [ledgerDirection] NVARCHAR(6) NULL,
  [ledgerPartialPayment] NVARCHAR(16) NULL,
  [minAmount] DECIMAL(18,2) NULL,
  [maxAmount] DECIMAL(18,2) NULL,
  [capPctOfBase] DECIMAL(9,4) NULL,
  [capBaseCode] NVARCHAR(48) NULL,
  [roundingMode] NVARCHAR(12) NULL,
  [roundingScale] TINYINT NULL,
  [deductionPriority] INT NULL,
  [carryOverEligible] BIT NOT NULL,
  [rollupTo] NVARCHAR(40) NULL,
  [exemptible] BIT NOT NULL,
  [showOnPayslip] BIT NOT NULL,
  [isActive] BIT NOT NULL,
  CONSTRAINT [FK_payroll_policy_component_version] FOREIGN KEY ([versionId]) REFERENCES dbo.[payroll_policy_versions] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [FK_payroll_policy_component_tier_set] FOREIGN KEY ([versionId], [tierSetId]) REFERENCES dbo.[payroll_tier_sets] ([versionId], [id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [PK_a7275731c45f76b1aec9d2f7bc7] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_payroll_policy_component_sequence] ON dbo.[payroll_policy_components] ([versionId], [stage], [sequence]);

CREATE UNIQUE INDEX [UX_payroll_policy_component_code] ON dbo.[payroll_policy_components] ([versionId], [code]);

CREATE TABLE dbo.[payroll_policy_tiers] (
  [id] INT NOT NULL IDENTITY(1,1),
  [tierSetId] INT NOT NULL,
  [sequence] INT NOT NULL,
  [fromValue] DECIMAL(18,6) NOT NULL,
  [toValue] DECIMAL(18,6) NULL,
  [method] NVARCHAR(16) NOT NULL,
  [multiplier] DECIMAL(6,3) NULL,
  [dayFraction] DECIMAL(5,4) NULL,
  [fixedAmount] DECIMAL(18,2) NULL,
  [formula] NVARCHAR(500) NULL,
  [label] NVARCHAR(200) NULL,
  [isActive] BIT NOT NULL,
  CONSTRAINT [FK_payroll_policy_tier_set] FOREIGN KEY ([tierSetId]) REFERENCES dbo.[payroll_tier_sets] ([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [CK_payroll_policy_tier_method] CHECK (([method] IN ('NONE','RATE_1_1') AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'MULTIPLIER' AND [multiplier] IS NOT NULL AND [multiplier] > 0 AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'DAY_FRACTION' AND [dayFraction] IS NOT NULL AND [dayFraction] > 0 AND [dayFraction] <= 1 AND [multiplier] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'FIXED_AMOUNT' AND [fixedAmount] IS NOT NULL AND [fixedAmount] > 0 AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [formula] IS NULL) OR ([method] = 'FORMULA' AND [formula] IS NOT NULL AND [formula] <> N'' AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL)),
  CONSTRAINT [CK_payroll_policy_tier_bounds] CHECK ([sequence] > 0 AND [fromValue] >= 0 AND ([toValue] IS NULL OR [toValue] > [fromValue])),
  CONSTRAINT [PK_968da93d89d7b8f6e8359d3ed0d] PRIMARY KEY ([id])
);

CREATE UNIQUE INDEX [UX_payroll_policy_tier_sequence] ON dbo.[payroll_policy_tiers] ([tierSetId], [sequence]);
