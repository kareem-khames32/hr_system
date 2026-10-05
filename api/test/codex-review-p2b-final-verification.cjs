module.exports = {
  "target": "1ca474c9c4f3dd8413955eb14e876f665d360c92",
  "trackedFilesUnchanged": 2509,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "databasesChecked": [
    "hr_codex_p2a_independent_test_caa22677938f1225",
    "hr_codex_p1r_invariance_test_63e5e6c27b622868",
    "hr_one_person_test_dc4543bb09bc4b80",
    "hr_audit_log_test_410fc9c7d30f94b7",
    "hr_file_upload_test_d18ee54653231c98",
    "hr_codex_p2b_office_test_5d5107b24e6a5a9e",
    "hr_codex_p2b_screen_history_test_2750de41177210cd",
    "hr_payroll_perf_test_f752e992392f7990",
    "hr_codex_p2b_range_edges_test_48abb59e26582a04",
    "hr_codex_p2a_money_test_4e82d1c1428f1193",
    "hr_chain_disburse_test_2eda93bae89ebd7a",
    "hr_payroll_ot_test_c331fd6c15ebbc0a",
    "hr_payroll_installment_ledger_test_96fa85cf0c91e577",
    "hr_payroll_exempt_test_790a86cc5a879674",
    "hr_payroll_perf_test_7c2d38d51405ffb5",
    "hr_codex_p2b_screen_history_test_cd543557a0baca2a",
    "hr_live_absences_test_293d9f084ce057b5",
    "hr_payroll_accrual_test_7763445bc61471f7",
    "hr_attendance_proof_test_3712eb83b541ba8b",
    "hr_payroll_flex_test_e5149518b3fbc8af",
    "hr_calendar_history_test_131902cf551ca6ab",
    "hr_calendar_transfer_test_da62ddf6409b5df3",
    "hr_payroll_exempt_test_d8a84a431269dd0d",
    "hr_permission_window_test_8ff7560ff1b31e50",
    "hr_employee_suspension_test_2cfe544f73a59780",
    "hr_codex_p2b_live_test_9210960c5c21055f",
    "hr_codex_p2b_live_controls_test_ad0b4a38b734e4ff",
    "hr_codex_p2a_money_test_0d4564b5525bb2fe",
    "hr_payroll_live_test_4f86c0eb332c77ed",
    "hr_payroll_live_rcsi_test_84090238b78e4254",
    "hr_payroll_accrual_test_f6941b98f8dee0e6",
    "hr_queue_outbox_test_df8348dfcaa120dc",
    "hr_one_person_test_0a6eee1137d8ef5b",
    "hr_codex_p2b_office_test_834e7365b9e9c348",
    "hr_codex_p2b_live_test_144111a64e1a5f81",
    "hr_codex_p2b_screen_history_test_8a3c2d1034135b62",
    "hr_codex_p2b_screen_history_test_f8b289f70e946f1b"
  ],
  "remainingDatabases": [],
  "secretScan": "passed",
  "shadow": {
    "ranges": 53,
    "compared": 395,
    "mismatches": 0,
    "live": 9,
    "liveRows": 29
  },
  "results": [
    {
      "file": "codex-review-p2b-results-a-closure.cjs",
      "tests": {
        "tests": 30,
        "failed": 0,
        "passed": 30,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 30,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-a-office.cjs",
      "tests": {
        "tests": 9,
        "failed": 2,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2B A an XML comment must not override an actual macro document content type",
          "error": "A commented Override is not a declared part type; the actual declaration remains macro-enabled\n\n201 !== 400\n"
        },
        {
          "name": "P2B A an OLE storage named WordDocument is not a document stream",
          "error": "OLE storage names cannot establish the Word document stream\n\n201 !== 400\n"
        }
      ]
    },
    {
      "file": "codex-review-p2b-results-b-baseline-history.cjs",
      "tests": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full",
          "error": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p2b-results-b-baseline-performance.cjs",
      "tests": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-b-edges.cjs",
      "tests": {
        "tests": 7,
        "failed": 0,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-b-financial-shadow.cjs",
      "tests": {
        "tests": 103,
        "failed": 0,
        "passed": 103,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 103,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-b-performance.cjs",
      "tests": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-b-screen-history.cjs",
      "tests": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full",
          "error": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p2b-results-b-shadow.cjs",
      "tests": {
        "tests": 101,
        "failed": 0,
        "passed": 101,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 101,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2b-results-c-independent.cjs",
      "tests": {
        "tests": 10,
        "failed": 3,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2B C calculation-only refresh must not return payroll amounts hidden by GET",
          "error": "Operation permission must not bypass the payroll view permission"
        },
        {
          "name": "P2B C the latest day alone must not mark a partially accumulated period complete",
          "error": "Earlier gaps are missing even when the last day exists\n\ntrue !== false\n"
        },
        {
          "name": "P2B C a refresh chosen before real payroll approval must not rewrite its accrual afterward",
          "error": "Closed accrual rows must remain exactly unchanged after approval\n+ actual - expected\n\n  [\n    {\n      absenceAmount: 0,\n      attendanceStatus: 'present',\n+     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":300}',\n+     computedAt: 2026-10-05T00:10:15.417Z,\n-     components: '{\"v\":1,\"note\":\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\",\"attendanceDayId\":121,\"deduction\":{\"date\":\"2026-06-23\",\"rawShortfallMinutes\":0,\"unexcusedLateMinutes\":0,\"paidPermissionCoveredMinutes\":0,\"overlapMinutes\":0,\"shortfallGraceMinutes\":0,\"chargeableShortfallMinutes\":0,\"latenessBeforeOverlap\":0,\"shortfallBeforeOverlap\":0,\"latenessBeforeCap\":0,\"shortfallBeforeCap\":0,\"latenessAmount\":0,\"shortfallAmount\":0,\"permissionAmount\":0,\"dailyCapAmount\":0,\"cappedAmount\":0,\"totalAmount\":0},\"leaveIds\":[],\"overtimeIds\":[],\"dayRate\":200}',\n-     computedAt: 2026-10-05T00:10:14.828Z,\n      date: 2026-06-22T21:00:00.000Z,\n      deductibleMinutes: 0,\n      dirtyAt: null,\n+     dirtyReason: null,\n-     dirtyReason: 'P2B selected before approval',\n      earlyLeaveMinutes: 0,\n+     earningsAmount: 300,\n-     earningsAmount: 200,\n      employeeId: 3,\n      id: 25,\n+     inputsHash: '844c95caf73c23ae4b135d15acfe92454111cac4b53576fc1cd158570db0ad48',\n-     inputsHash: 'e87eab372f88eb40b900a0379b14f9466b7d33e4dc1f0b305e414f3ef0a44f84',\n      isAbsent: false,\n+     isDirty: false,\n-     isDirty: true,\n      isExempt: false,\n      isHolidayWork: false,\n      isLeave: false,\n      isSickLeave: false,\n      isSuspended: false,\n"
        }
      ]
    },
    {
      "file": "codex-review-p2b-results-c-regression.cjs",
      "tests": {
        "tests": 33,
        "failed": 0,
        "passed": 33,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 33,
        "suites": 0
      },
      "failures": []
    }
  ]
}
