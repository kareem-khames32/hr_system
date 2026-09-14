# HR document templates — migration 007

Root verification update: 007 was subsequently applied successfully to the retained review database after a verified checkpoint backup; existing table row counts are unchanged and metadata diff is zero. The 9/9 HTTP/PDF integration tests now also cover SQL failure after PDF creation, complete rollback/file cleanup and successful retry. See the root `HR_DOCUMENT_TEMPLATES_RESTORED_2026-09-12.md` report. The independent-agent observations below record the state before root application.

`20260912_007_pre_payroll_hr_document_templates.sql` adds only `hr_document_templates`, `hr_document_template_revisions` and `hr_issued_documents`, with four indexes. Definitions and generated constraint names match `api/src/hr-documents/hr-document.entities.ts`. Table/index creation is guarded by existence checks. Existing document, file, request-letter and payroll tables are untouched; there are no data updates, deletes, seeds or required-field backfills.

Validation on a random, isolated SQL Server database: `node --test api/test/hr-document-migration.test.cjs` passed **3/3** on 2026-09-12.

- A forced transaction failure rolls back all new tables and preserves existing document metadata/bytes.
- After applying 007, the TypeORM schema diff for the three new entities is empty.
- Replaying the migration preserves saved drafts, published revisions, issued snapshots, actor/employee references and existing bytes. SQL uniqueness prevents repeated reference, reused file ID, repeated issuer/idempotency key and repeated template revision. An operation key can independently belong to another issuer, as specified by the entity.

The test uses only synthetic data in a guarded `hr_hrdoc_migration_test_<random hex>` database and removes only that temporary database. Migration 007 has **not** been applied to the retained review database by this task, and no service was started or restarted. The existing versioned runner discovers this filename without code changes; the root task will apply it after the HR document module is finalized and the review API is stopped.

Read-only application review on 2026-09-12 found no confirmed authorization bypass in the implemented HR document routes:

- `hr-documents.controller.ts` restricts template editing/publication to `settings.manage`, and issuance/personalized previews to `documents.manage`.
- `hr-document-access.ts:11` uses the employee's current branch, with the intended employee-owner exception; financial documents also require the existing employee financial-read policy. Both download routes use this check. Generic `files.controller.ts:159` checks `hr_document` before its ordinary uploader/owner access path, and the shared helper matches file ID, issuance ID and employee ID.
- `hr-documents.service.ts:176` returns an explicit issuance projection without the snapshot or resolved values. Salary variables are resolved only after financial permission is checked and only when referenced by the template.
- Issuance locks the actor row before checking the actor/key pair; the SQL unique constraint provides a second barrier against duplicate issuance. A retry checks current access and the normalized input hash, then returns the already saved issuance rather than rendering changed employee/template data.
- Generated storage names are server-created UUID paths resolved under the private uploads root. The shared PDF renderer escapes interpolated text, disables JavaScript and blocks external network requests. SQL saves are in one transaction; the catch path removes the newly written PDF when issuance fails.

This is a source review, separate from the three DDL tests above. The root task is running HTTP/PDF integration tests. A specific additional regression was requested for a SQL failure after PDF writing: verify rollback of both metadata records, removal of the new PDF, and successful retry using the same operation key. This report does not claim crash-recovery or deployment validation from source review alone.
