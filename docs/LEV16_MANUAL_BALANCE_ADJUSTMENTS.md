# LEV-16 manual leave balance adjustment

The adjustment is a separate `leave_balances.adjustmentDays` layer. It never rewrites entitlement policy, `taken`, `openingTaken`, or approved/cancelled leave records. All shared balance views, sufficiency checks, settlement previews and annual carryover use the layer. Carryover transfers the resulting remaining balance into next year's opening layer under the existing cap/expiry policy; it does not copy the adjustment again.

`POST /api/requests/leave-balances/:employeeId/adjust` requires the existing `leave_balances.manage` permission and an employee inside the actor's branch. Non-admin accounts without a branch have an empty scope. Archived/terminated employees and periods other than the current year are rejected. Existing custom balance rows can be adjusted; missing rows are created only for annual/sick balances, inside the same transaction.

The business date and current-year check use the API's localDateOf helper under its configured TZ, consistently with current balance views. The period is not derived from a UTC ISO date around New Year's midnight.

Request:

```json
{
  "balanceType": "annual",
  "period": "2026",
  "delta": -0.5,
  "reason": "Documented balance reconciliation",
  "idempotencyKey": "b00c476f-70a6-4e43-890d-5dcb7ace4d33",
  "expectedRemaining": 8.5
}
```

- Delta is a finite nonzero number, up to two decimal places and at most 9999.99 days in either direction. The reason is trimmed and must contain 3–500 characters.
- A UUID operation key is required. Its scope is employee, balance type and year. Retrying the same actor/key/delta/reason returns the original audit row and the current balance without applying the delta again. Reusing the key for different inputs returns 409. A failed transaction does not consume the key.
- Optional `expectedRemaining` is the clamped `BalanceView.remaining` last shown to the user. A different current value returns 409 before writing. An already-successful retry is recognized first so an old expected value does not prevent recovery from a lost response.
- The server rejects any new adjustment leaving a negative real balance. Each audit entry records delta, old/new adjustment layer, real before/after balance, actor user ID, reason, operation key and creation timestamp. A pre-existing deficit appears as a negative `beforeRemaining`; successful `afterRemaining` is nonnegative.

Response: `{ balance, adjustment, replayed }`. `balance` has the normal balance-view fields plus `adjustmentDays`. `adjustment` is the persisted audit entry. `GET /api/requests/leave-balances/:employeeId/adjustments?period=2026` retrieves the history with the same permission and branch scope. No update/delete audit endpoint is provided.

The transaction locks the employee, then the balance, serializing first-row creation, concurrent adjustments and scope changes. Both the balance update and the audit insert commit together. Deduction reads accrual context before acquiring the balance lock to avoid reversing this lock order. The database unique constraint is an additional guard against duplicate audit operations.

The SQL Server migration is `docs/migrations/2026-09-11_leave_balance_adjustments.sql`. It adds the new zero-valued layer and audit table without changing existing entitlement or consumed days. Deploy it before this API version with production synchronization disabled. It is tested on a separate disposable database, including repeated execution and preservation of existing values. It has not been applied to the original/customer database. MySQL migration and multi-replica deployment certification remain outside this change.

Regression coverage is in `api/test/integrity.integration.cjs`: permission/scope/validation; persisted layer under policy changes; deduction/restoration and settlement/carryover agreement; simultaneous duplicate/reduction submissions; stale/reused command rejection; SQL migration; and forced audit-storage failure rolling back both writes. All five LEV-16 cases passed in the **30/30** integrity run. The parent release report records the final combined test outcome.
