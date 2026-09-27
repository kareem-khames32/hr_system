module.exports = {
  "selected": [
    "codex-review-round16-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 9237.6131
  },
  "results": [
    {
      "file": "codex-review-round16-boundaries.integration.cjs",
      "name": "CR16 leave guards preserve each rule while hiding branch names and retaining permitted names",
      "ms": 5690.1232,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round16-boundaries.integration.cjs",
      "name": "CR16 once-per-service and occasion quota redact names while retaining previously granted leave",
      "ms": 559.9999,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round16-boundaries.integration.cjs",
      "name": "CR16 valid three-day unpaid leave still completes once after the proxy loses branch scope",
      "ms": 234.6498,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round16-boundaries.integration.cjs",
      "name": "CR16 historical unsupported definitions are redacted on create submit and resubmit for each viewer scope",
      "ms": 590.2057,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9237.6131"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r16boundaries_test_cb2f89478dce3567\"}\n",
    "CR16_EVIDENCE {\"case\":\"leave-guard-scope-matrix\",\"branchComparisons\":40,\"globalNameVisible\":true,\"evidence\":[{\"rule\":\"half\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» مينفعش تتاخد نص يوم — اختار يوم كامل\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» مينفعش تتاخد نص يوم — اختار يوم كامل\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_half» مينفعش تتاخد نص يوم — اختار يوم كامل\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_half» مينفعش تتاخد نص يوم — اختار يوم كامل\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_half» مينفعش تتاخد نص يوم — اختار يوم كامل\"}],\"definitionUnchanged\":true},{\"rule\":\"minimum\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_minimum» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_minimum» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_minimum» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"}],\"definitionUnchanged\":true},{\"rule\":\"maximum\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أقصى مدة للطلب الواحد 2 يوم (أيام تقويم) — إنت طالب 3\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أقصى مدة للطلب الواحد 2 يوم (أيام تقويم) — إنت طالب 3\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_maximum» أقصى مدة للطلب الواحد 2 يوم (أيام تقويم) — إنت طالب 3\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_maximum» أقصى مدة للطلب الواحد 2 يوم (أيام تقويم) — إنت طالب 3\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_maximum» أقصى مدة للطلب الواحد 2 يوم (أيام تقويم) — إنت طالب 3\"}],\"definitionUnchanged\":true},{\"rule\":\"fixed\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أيامها 2 يوم بس في المرة — إنت طالب 3\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» أيامها 2 يوم بس في المرة — إنت طالب 3\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_fixed» أيامها 2 يوم بس في المرة — إنت طالب 3\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_fixed» أيامها 2 يوم بس في المرة — إنت طالب 3\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_fixed» أيامها 2 يوم بس في المرة — إنت طالب 3\"}],\"definitionUnchanged\":true},{\"rule\":\"attachment\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» لازم ترفع مستند داعم مع الطلب\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» لازم ترفع مستند داعم مع الطلب\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_attachment» لازم ترفع مستند داعم مع الطلب\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_attachment» لازم ترفع مستند داعم مع الطلب\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_attachment» لازم ترفع مستند داعم مع الطلب\"}],\"definitionUnchanged\":true},{\"rule\":\"backdate-denied\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-denied» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-denied» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-denied» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده\"}],\"definitionUnchanged\":true},{\"rule\":\"backdate-limit\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» بأثر رجعي لحد 5 يوم بس — أقدم تاريخ بداية مسموح 2026-09-22\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» بأثر رجعي لحد 5 يوم بس — أقدم تاريخ بداية مسموح 2026-09-22\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-limit» بأثر رجعي لحد 5 يوم بس — أقدم تاريخ بداية مسموح 2026-09-22\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-limit» بأثر رجعي لحد 5 يوم بس — أقدم تاريخ بداية مسموح 2026-09-22\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_backdate-limit» بأثر رجعي لحد 5 يوم بس — أقدم تاريخ بداية مسموح 2026-09-22\"}],\"definitionUnchanged\":true},{\"rule\":\"notice\",\"states\":[{\"scope\":\"outside\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» لازم تتقدّم قبلها بـ40 يوم على الأقل — أقرب تاريخ بداية 2026-11-06\"},{\"scope\":\"empty\",\"nameVisible\":false,\"message\":\"«نوع الإجازة ده» لازم تتقدّم قبلها بـ40 يوم على الأقل — أقرب تاريخ بداية 2026-11-06\"},{\"scope\":\"local\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_notice» لازم تتقدّم قبلها بـ40 يوم على الأقل — أقرب تاريخ بداية 2026-11-06\"},{\"scope\":\"multi\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_notice» لازم تتقدّم قبلها بـ40 يوم على الأقل — أقرب تاريخ بداية 2026-11-06\"},{\"scope\":\"company\",\"nameVisible\":true,\"message\":\"«CR16_PRIVATE_notice» لازم تتقدّم قبلها بـ40 يوم على الأقل — أقرب تاريخ بداية 2026-11-06\"}],\"definitionUnchanged\":true}]}\n",
    "CR16_EVIDENCE {\"case\":\"single-use-and-quota\",\"evidence\":[{\"rule\":\"once\",\"message\":\"«نوع الإجازة ده» تُمنح مرة واحدة طوال الخدمة — للموظف طلب/إجازة سابقة من هذا النوع\",\"leaves\":1,\"originalLeaveUnchanged\":true},{\"rule\":\"quota\",\"message\":\"«نوع الإجازة ده» مسموحة 1 مرة في السنة، وعندك 1 في 2026 (معتمدة أو تحت الاعتماد)\",\"leaves\":1,\"originalLeaveUnchanged\":true}]}\n",
    "CR16_EVIDENCE {\"case\":\"valid-leave-completion\",\"expectedCalendarDays\":3,\"actualDays\":3,\"isUnpaid\":true,\"status\":\"COMPLETED\",\"leaves\":1,\"repeatedApproval\":400,\"storedDefinitionNameUnchanged\":true}\n",
    "CR16_EVIDENCE {\"case\":\"unsupported-all-entrypoints\",\"comparisons\":24,\"evidence\":[{\"general\":false,\"scope\":\"outside\",\"namesVisible\":false,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":false,\"scope\":\"empty\",\"namesVisible\":false,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":false,\"scope\":\"local\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":false,\"scope\":\"company\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":true,\"scope\":\"outside\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":true,\"scope\":\"empty\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":true,\"scope\":\"local\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true},{\"general\":true,\"scope\":\"company\",\"namesVisible\":true,\"create\":400,\"submit\":400,\"resubmit\":400,\"rowsUnchanged\":true}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r16boundaries_test_cb2f89478dce3567\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r16boundaries_test_cb2f89478dce3567\"}\n"
  ]
}
