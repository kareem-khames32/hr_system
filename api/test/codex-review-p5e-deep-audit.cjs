module.exports = {
  "target": "fbd2350dea5d6d354ebea1e713e536137b77e2dd",
  "base": "69ed68a6",
  "method": "Manual transitive review plus AST call inventory and physical SQL pool acquisition guard in real in-process HTTP integration tests.",
  "roots": [
    "submitLocked",
    "resubmit",
    "act",
    "executeDestinationLocked",
    "retryExecution"
  ],
  "inspected": [
    {
      "area": "Request authorization, attachment ownership and module gates",
      "paths": [
        "requests/requests.service.ts",
        "modules/modules.service.ts"
      ],
      "result": "Transaction callers pass em; allowedForIn/isFeatureEnabledIn and ownership queries use it. Nontransaction create and after-commit callbacks remain outside this restriction."
    },
    {
      "area": "Structural chains and delegated/escalated approvers",
      "paths": [
        "requests/approver-resolver.service.ts",
        "requests/requests.service.ts"
      ],
      "result": "inManager binds all four repositories. skipLevelMissingMessage, delegationContext and escalationApprover use transaction repositories. No independent pool read found."
    },
    {
      "area": "Expense report staging and execution",
      "paths": [
        "expenses/expense-reports.ts",
        "expenses/human-approval.ts"
      ],
      "result": "Readiness, report locking, category/grade limits, lines, attachments, human decision validation and ledger effects use em."
    },
    {
      "area": "Travel advance staging and settlement",
      "paths": [
        "expenses/travel-advances.ts",
        "requests/destinations.service.ts"
      ],
      "result": "Advance readiness, attached/open advances, employee financial lock, current branch and execution use em."
    },
    {
      "area": "Calendar and leave gate",
      "paths": [
        "requests/requests.service.ts",
        "attendance/attendance.service.ts",
        "requests/leave-balances.service.ts"
      ],
      "result": "batchScope(em), maxBackdateDays(em), assertSufficient(...,em), accrualContext, settings/tier/service-period readers, deduct and restore propagate the transaction manager."
    },
    {
      "area": "Events and audit",
      "result": "Writes reachable from the reviewed expense transaction use the supplied/event manager. Notification processing after commit is outside the held transaction."
    }
  ],
  "remainingPoolReadersInReviewedExpenseTransactionPaths": [],
  "readpast": {
    "parentRequestLockRequired": true,
    "concurrentReturnAndResubmit": "Q02: resubmission waits, then rejects old-round approval without ledger effect",
    "distinctRequests": "T02: ten expense approvals and ten travel advance approvals complete with one effect each",
    "qualification": "Skipping the latest RETURNED_FOR_INFO row would not itself fail closed: an older approval could qualify. Current acceptance relies on serialization of relevant decision writers by the parent request lock. READPAST also does not skip page locks."
  },
  "dynamicGuard": {
    "hook": "mssql ConnectionPool._acquire",
    "roots": [
      "submit",
      "resubmit",
      "act",
      "executeDestination",
      "retryExecution",
      "runEscalations"
    ],
    "activeTransactionOnly": true,
    "positiveControl": "Q01 intentionally attempts ds.manager.query while a transaction is active; it is rejected, while em.query stays on the same SPID.",
    "regressionTransactions": 464,
    "unexpected": []
  },
  "limitation": "No exhaustive proof over unexecuted data-dependent branches; source review and the listed test coverage support the conclusion. Post-commit work, HTTP guards before transaction acquisition and unrelated domain services are outside the pool prohibition."
}
