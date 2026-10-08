module.exports = {
  "selected": [
    "codex-review-p3m-units"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 17,
      "failed": 0,
      "passed": 17,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 17,
      "suites": 0
    },
    "duration_ms": 3779.3311
  },
  "results": [
    {
      "file": "surveys.test.cjs",
      "name": "SU-01: title, kind, minimum group, questions keyed by the server, and answers of each question type only",
      "ms": 2.5012,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-02: eNPS and the summary, groups shown without one that lets a hidden group be subtracted, and the comment threshold from its setting",
      "ms": 0.5335,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-03: a new closed module, a one-transaction answer with no link from the response to the invitation, no audit line, the routes and the screens",
      "ms": 48.1922,
      "pass": true,
      "skip": false
    },
    {
      "file": "surveys.test.cjs",
      "name": "SU-06: Codex P3L-B02 — per-question complementary suppression between the shown groups",
      "ms": 0.7677,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-11: case values, the objection window from its setting, and the conflict of interest",
      "ms": 0.5035,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes",
      "ms": 3.905,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens",
      "ms": 2.6004,
      "pass": true,
      "skip": false
    },
    {
      "file": "cases.test.cjs",
      "name": "CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction",
      "ms": 605.4027,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-01: rating and comment, the first-response limit from its setting, the report range and the average",
      "ms": 0.7081,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-02: a new closed module owning the inquiry types, the category and the seed, the rating under the request row lock, the scoped report, and the routes",
      "ms": 199.1044,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "HU-03: knowledge base — article values, search matching, the reader limited to published articles in the viewer audience, and management within the branch scope under the row lock",
      "ms": 260.792,
      "pass": true,
      "skip": false
    },
    {
      "file": "helpdesk.test.cjs",
      "name": "Codex P3L-B06: the policy reference of an article is read with the manager of the transaction that holds the article row",
      "ms": 1.0059,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-01: the mark closes the session until the start day only; a system admin and an unlinked account stay outside",
      "ms": 0.3249,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-02: the feature is closed by default; the guard, the permission-less session, and the allowed routes",
      "ms": 38.8832,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "PG-03: the web app sends a pre-boarding account to its documents, lists the pre-boarding screens only, and greets it with the start date",
      "ms": 2.402,
      "pass": true,
      "skip": false
    },
    {
      "file": "preboarding.test.cjs",
      "name": "Codex P3L-B01: a pre-boarding session sees only the task that awaits itself — no manager, assigner or task-admin authority",
      "ms": 0.6842,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-units.integration.cjs",
      "name": "P3M-S05: published totals minus every published group never isolate fewer than the threshold",
      "ms": 49.7013,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 17",
    "suites 0",
    "pass 17",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 3779.3311"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_MEASURE {\"case\":\"S05\",\"publicationScenarios\":10020,\"unsafeResiduals\":0}\n"
  ]
}
