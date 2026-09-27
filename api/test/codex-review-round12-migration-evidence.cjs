module.exports = {
  "server": {
    "productVersion": "16.0.4255.1",
    "compatibility_level": 150
  },
  "trial": true,
  "applied": [
    "20260927_072_department_unit_type.sql",
    "20260927_073_requests_config_value_4000.sql"
  ],
  "existingDepartmentRows": 4,
  "existingConfigRows": 140,
  "oldValuesPreserved": true,
  "newColumns": [
    "departments.unitType"
  ],
  "widened": [
    "requests_config.value: nvarchar(500) → nvarchar(4000)"
  ],
  "schemaDiff": 0,
  "ledgerReplayApplied": 0,
  "directReplays": 2,
  "legacyExecutiveParentStillEditable": true
}
