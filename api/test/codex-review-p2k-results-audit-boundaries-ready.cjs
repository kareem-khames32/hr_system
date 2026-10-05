module.exports = {
  "selected": [
    "codex-review-p2k-audit-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 11255.7521
  },
  "results": [
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K recorded party actor remains concealed after real unlink, relink and disable; mixed actor filters preserve unrelated events",
      "ms": 7188.1867,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K current names drive exact counts and pages and literal wildcard searches cannot reveal renamed foreign parties",
      "ms": 615.4549,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2k-audit-boundaries.integration.cjs",
      "name": "P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable",
      "ms": 380.7631,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"recorded-actor-transition-matrix\",\"realUnlink\":true,\"realRelink\":true,\"disabled\":true,\"hiddenActorRows\":2,\"filteredCount\":0,\"unrelatedActorRows\":1,\"storageUnchanged\":true,\"allBranchesUnchanged\":true}",
    "{\"case\":\"name-query-and-pagination\",\"literalWildcards\":true,\"matchedRows\":2,\"pages\":[1,1,0],\"foreignRenameInvisible\":true,\"currentNameForCompany\":true,\"storageUnchanged\":true}",
    "{\"case\":\"current-link-and-other-actor\",\"currentPartyHidden\":true,\"unrelatedOfficerPreserved\":true,\"prototypeEntityUnchanged\":true,\"storageUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11255.7521"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2k_audit_test_6c87031ff3681a6d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2k_audit_test_6c87031ff3681a6d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2k_audit_test_6c87031ff3681a6d\"}\n"
  ]
}
