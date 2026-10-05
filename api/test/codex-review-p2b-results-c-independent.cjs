module.exports = {
  "selected": [
    "codex-review-p2b-live",
    "codex-review-p2b-live-controls",
    "codex-review-p2b-money"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 10,
      "failed": 3,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 25590.055
  },
  "results": [
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C calculation-only refresh must not return payroll amounts hidden by GET",
      "ms": 6248.3989,
      "pass": false,
      "error": "Operation permission must not bypass the payroll view permission",
      "cause": "Operation permission must not bypass the payroll view permission",
      "stack": "AssertionError [ERR_ASSERTION]: Operation permission must not bypass the payroll view permission\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:15:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C the latest day alone must not mark a partially accumulated period complete",
      "ms": 441.2318,
      "pass": false,
      "error": "Earlier gaps are missing even when the last day exists\n\ntrue !== false\n",
      "cause": "Earlier gaps are missing even when the last day exists\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Earlier gaps are missing even when the last day exists\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C a refresh chosen before real payroll approval must not rewrite its accrual afterward",
      "ms": 1155.1692,
      "pass": false,
      "error": "Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n",
      "cause": "Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n",
      "stack": "AssertionError [ERR_ASSERTION]: Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2b-live-controls.integration.cjs",
      "name": "P2B C mine cannot be enabled or redirected by caller supplied employee or feature values",
      "ms": 7653.8411,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-live-controls.integration.cjs",
      "name": "P2B C invalid settings are rejected; corrupt stored values use documented safe behavior",
      "ms": 90.2066,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-live-controls.integration.cjs",
      "name": "P2B C adding a hidden previous payroll cannot change alerts or change counters",
      "ms": 303.0437,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-01: النسبة من الإعداد — عدد صحيح من 0 لـ1000، وغيره = الافتراضي 20",
      "ms": 0.2197,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-02: الفرق قد النسبة أو أكتر ← تنبيه بالبنود اللي فرقت بس؛ تحت النسبة أو من غير فرق ← مفيش",
      "ms": 0.2722,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-net-change-alert.test.cjs",
      "name": "NC-03: السابق صفر أو سالب = أي فرق تنبيه من غير نسبة؛ النسبة 0 = مقفول؛ ومن غير بند سابق أو حالي ← مفيش",
      "ms": 0.1342,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-money.integration.cjs",
      "name": "P2A payroll outbox and audit failure roll back actual approval; all four money scenarios equal committed phase 1",
      "ms": 6860.8396,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C calculation-only refresh must not return payroll amounts hidden by GET",
      "ms": 6248.3989,
      "pass": false,
      "error": "Operation permission must not bypass the payroll view permission",
      "cause": "Operation permission must not bypass the payroll view permission",
      "stack": "AssertionError [ERR_ASSERTION]: Operation permission must not bypass the payroll view permission\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:15:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C the latest day alone must not mark a partially accumulated period complete",
      "ms": 441.2318,
      "pass": false,
      "error": "Earlier gaps are missing even when the last day exists\n\ntrue !== false\n",
      "cause": "Earlier gaps are missing even when the last day exists\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Earlier gaps are missing even when the last day exists\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:31:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2b-live.integration.cjs",
      "name": "P2B C a refresh chosen before real payroll approval must not rewrite its accrual afterward",
      "ms": 1155.1692,
      "pass": false,
      "error": "Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n",
      "cause": "Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n",
      "stack": "AssertionError [ERR_ASSERTION]: Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-live.integration.cjs:58:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"live-refresh-permission\",\"getStatus\":403,\"postStatus\":201,\"employeeId\":1,\"earned\":3600,\"estimatedNet\":3600}",
    "{\"case\":\"missing-earlier-days\",\"window\":{\"period\":\"2026-10\",\"startDate\":\"2026-09-23\",\"endDate\":\"2026-10-22\",\"upTo\":\"2026-10-04\",\"today\":\"2026-10-05\"},\"before\":{\"days\":1,\"complete\":true,\"earned\":300},\"refresh\":{\"computed\":0,\"remaining\":0},\"control\":{\"computed\":11,\"days\":12,\"earned\":3600}}",
    "{\"case\":\"refresh-after-approval\",\"status\":\"APPROVED\",\"computed\":1,\"beforeDirty\":true,\"afterDirty\":false,\"beforeEarnings\":200,\"afterEarnings\":300,\"changedRows\":1,\"totalNet\":6000,\"laterSalaryFixture\":true}",
    "{\"case\":\"P2A-money\",\"totalNet\":34236.56,\"net\":[7455.56,18163,1703,6915],\"allDecimalColumnsEqualPhase1\":true,\"controls\":[{\"failedTable\":\"outbox_events\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true},{\"failedTable\":\"audit_log\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true}]}",
    "tests 10",
    "suites 0",
    "pass 7",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25590.055"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2b_live_test_9210960c5c21055f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2b_live_test_9210960c5c21055f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2b_live_test_9210960c5c21055f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2b_live_controls_test_ad0b4a38b734e4ff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2b_live_controls_test_ad0b4a38b734e4ff\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2b_live_controls_test_ad0b4a38b734e4ff\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_money_test_0d4564b5525bb2fe\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_money_test_0d4564b5525bb2fe\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_money_test_0d4564b5525bb2fe\"}\n"
  ]
}
