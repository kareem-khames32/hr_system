module.exports = {
  "selected": [
    "approval-delegations",
    "codex-review-p2k-audit-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 29508.5125
  },
  "results": [
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 7912.817,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 585.4165,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 483.7466,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 197.4682,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 353.2923,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 1673.672,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 1274.2214,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 793.5355,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 3770.9352,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 1425.8046,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 111.8818,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K recorded party actor remains concealed after real unlink, relink and disable; mixed actor filters preserve unrelated events",
      "ms": 5215.9673,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K current names drive exact counts and pages and literal wildcard searches cannot reveal renamed foreign parties",
      "ms": 401.0103,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable",
      "ms": 230.8124,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_delegation_test_725be89a60c31db8 is absent from sys.databases.",
    "{\"case\":\"recorded-actor-transition-matrix\",\"realUnlink\":true,\"realRelink\":true,\"disabled\":true,\"hiddenActorRows\":2,\"filteredCount\":0,\"unrelatedActorRows\":1,\"storageUnchanged\":true,\"allBranchesUnchanged\":true}",
    "{\"case\":\"name-query-and-pagination\",\"literalWildcards\":true,\"matchedRows\":2,\"pages\":[1,1,0],\"foreignRenameInvisible\":true,\"currentNameForCompany\":true,\"storageUnchanged\":true}",
    "{\"case\":\"current-link-and-other-actor\",\"currentPartyHidden\":true,\"unrelatedOfficerPreserved\":true,\"prototypeEntityUnchanged\":true,\"storageUnchanged\":true}",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 29508.5125"
  ],
  "stdout": [
    "REVIEW_PROGRESS synthetic User-Agent on in-process review requests; no network listener\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_test_725be89a60c31db8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_test_725be89a60c31db8\"}\n",
    "REVIEW_PROGRESS synthetic User-Agent on in-process review requests; no network listener\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_audit_test_764d4be6833de7ee\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_audit_test_764d4be6833de7ee\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_audit_test_764d4be6833de7ee\"}\n"
  ]
}
