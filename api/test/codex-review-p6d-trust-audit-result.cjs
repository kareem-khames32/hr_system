module.exports = {
  "target": "b7ef9826ff65c08959a05785877d44f2e06e1ddf",
  "calls": [
    {
      "file": "api/src/ai/ai-assist.service.ts",
      "line": 106,
      "call": "trustedShape(form.periodStart, 'date')"
    },
    {
      "file": "api/src/ai/ai-assist.service.ts",
      "line": 106,
      "call": "trustedShape(form.periodEnd, 'date')"
    },
    {
      "file": "api/src/ai/ai-assist.service.ts",
      "line": 107,
      "call": "trustedShape(goal.targetValue, 'amount')"
    },
    {
      "file": "api/src/ai/ai-assist.service.ts",
      "line": 107,
      "call": "trustedShape(goal.actualValue, 'amount')"
    },
    {
      "file": "api/src/ai/ai-proposals.service.ts",
      "line": 164,
      "call": "trustedShape(dto.targetPeriod, 'period')"
    },
    {
      "file": "api/src/ai/ai-proposals.service.ts",
      "line": 164,
      "call": "trustedShape(preview.totals.totalAmount, 'amount')"
    },
    {
      "file": "api/src/ai/ai-proposals.service.ts",
      "line": 185,
      "call": "trustedShape(fromDate, 'date')"
    },
    {
      "file": "api/src/ai/ai-proposals.service.ts",
      "line": 185,
      "call": "trustedShape(toDate, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 39,
      "call": "trustedShape(row.period, 'period')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 39,
      "call": "trustedShape(row.periodStart, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 39,
      "call": "trustedShape(row.periodEnd, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 46,
      "call": "trustedShape(today.date, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 46,
      "call": "trustedShape(today.day?.checkIn, 'time')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 46,
      "call": "trustedShape(today.day?.checkOut, 'time')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 47,
      "call": "trustedShape(today.shift?.start, 'time')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 47,
      "call": "trustedShape(today.shift?.end, 'time')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 54,
      "call": "trustedShape(slip.run?.period, 'period')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 54,
      "call": "trustedShape(slip.run?.startDate, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 54,
      "call": "trustedShape(slip.run?.endDate, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 64,
      "call": "trusted('مكتبة السياسات')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 65,
      "call": "trustedShape((row.version as Record<string, unknown> | undefined)?.effectiveFrom, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 80,
      "call": "trustedShape(row.joinDate, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 125,
      "call": "trusted('قاموس مؤشرات التقارير')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 125,
      "call": "trustedShape(report.period, 'period')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 125,
      "call": "trustedShape(report.from, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 125,
      "call": "trustedShape(report.to, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 125,
      "call": "trustedShape(report.date, 'date')"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 127,
      "call": "trusted(dictionary.key)"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 127,
      "call": "trusted(dictionary.label)"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 127,
      "call": "trusted(dictionary.unit)"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 127,
      "call": "trusted(dictionary.definition)"
    },
    {
      "file": "api/src/ai/ai-tools.service.ts",
      "line": 128,
      "call": "trustedShape(row.value, 'amount')"
    }
  ],
  "sources": [
    {
      "path": "my_leave_balance.period/periodStart/periodEnd",
      "origin": "LeaveBalancesService.allBalances: generated year/service periods and date boundaries; numeric balance quantities remain numbers."
    },
    {
      "path": "my_attendance_today.date/checkIn/checkOut/shiftStart/shiftEnd",
      "origin": "AttendanceService.myToday: local calendar date, AttendanceDay five-character clock fields, resolved shift clock fields. Attendance parser/calculator and validated schedule writers produce these. Names remain untrusted.",
      "test": "P6D-R01"
    },
    {
      "path": "my_payslips.period/startDate/endDate",
      "origin": "PayrollRun period and SQL date columns returned by payslipsOf. Financial decimal columns are numbers at the provider boundary.",
      "test": "P6D-R01"
    },
    {
      "path": "company_policies.source",
      "origin": "Literal in the tool source."
    },
    {
      "path": "company_policies.effectiveFrom",
      "origin": "Incorrect source property; library version has effectiveDate. Result is null, not arbitrary user text.",
      "note": "P6D-N01",
      "test": "P6D-R02"
    },
    {
      "path": "employee_lookup.joinDate",
      "origin": "Employee SQL date column; normal employee writers validate dates. Names, employee code and job title remain untrusted."
    },
    {
      "path": "report_metric.source/metric.key/label/unit/definition",
      "origin": "Literals and METRICS fixed source dictionary. The dictionary is not editable through an application writer."
    },
    {
      "path": "report_metric.payrollPeriod/from/to/date",
      "origin": "MetricsService.values -> FinancialReportService.periodOf and workforce calendar date, based on validated month input."
    },
    {
      "path": "report_metric.metric.byCurrency[].value",
      "origin": "FinancialReportService employee cost calculations. Currency remains untrusted; keys in metric.parts are fixed in source."
    },
    {
      "path": "bonus proposal.targetPeriod/totalAmount",
      "origin": "Validated bonus DTO or current payroll period; BonusesService.preview computed total. User reason/type label are not marked trusted."
    },
    {
      "path": "leave proposal.fromDate/toDate",
      "origin": "Date-shaped explicit proposal arguments, not copied system free text. The full request engine validates the eventual leave request on execution."
    },
    {
      "path": "review draft.period",
      "origin": "ReviewCycle SQL dates, validated at cycle creation."
    },
    {
      "path": "review draft.goals[].targetValue/actualValue",
      "origin": "PerformanceGoal decimal columns normalized using Number(...).toFixed(2) in ReviewsService.goalsOf. Goal title/unit and employee self-comment are untrusted.",
      "test": "P6D-A12"
    }
  ],
  "providerPaths": [
    "AiService.ask: every tool result passes through toolResultText -> redactForProvider. User question and model-produced messages are the documented exceptions.",
    "AiAssistService.ranking and reviewDraft explicitly redact before JSON serialization.",
    "AiAssistService.cvSummary scrubs the user-authored position title; the full PDF remains the previously accepted explicit exception."
  ],
  "objectKeys": "Tool projections use static keys; review evidence attendance.byStatus is constructed from AttendanceStatus generated by the attendance calculator. No general user JSON payload or arbitrary user-defined object keys reach these tool projections.",
  "identityWriters": [
    "UsersController.update: security changes increment tokenVersion, compared and saved on the locked current row.",
    "RolesController.create/update: role package creation/change invalidates every affected account in the same transaction. Actual role-package race covered by A16.",
    "RolesController.set permissions: overrides and tokenVersion increment in one transaction; actual override race covered by A16.",
    "EmployeesService move/disable/reactivate and DestinationsService branch transfer invalidate the affected accounts.",
    "DestinationsService archive sets isActive=false without a version increment; the new active predicate still rejects it.",
    "Seed script role-package union does not advance tokenVersion; it is the previously recorded off-line seed limitation, not a new live privilege-removal writer."
  ],
  "boundaries": "Authorization may change after successful claim under the accepted boundary. No proof here of privacy for numeric data deliberately encoded in a legitimate structured numeric/date field, written-out numbers, names, the user question, or the accepted full PDF."
}
