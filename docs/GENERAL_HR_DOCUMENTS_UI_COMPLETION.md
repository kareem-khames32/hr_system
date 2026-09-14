# General HR document interfaces

The existing request-letter editor was copied without behavior changes to `/settings/letter-templates`. It still uses the letter APIs, published request bindings, and approval-driven issuance.

`/settings/document-templates` now manages general HR templates through the independent `/hr-documents` API. It supports the five text sections, four categories, up to 20 named custom fields, readable variable insertion, sample PDF preview, saving drafts, publishing revisions, duplicating into a new template, deactivation, and version-conflict recovery that retains the user's unsaved text. It does not import Word/PDF formatting.

The four optional starters are contracts, acknowledgements, certificates and a general document. Loading a starter writes nothing to the server. Contract terms are a required custom field supplied by the company; the starter supplies no legal terms. The general starter uses no employee fields.

`/employees/documents/create` uses the published template catalog and scoped employee directory. An employee is optional for general documents and required when the template uses employee, contract or salary variables. It supports `?employeeId=123`, required custom values, a server PDF preview, actual issuance, saved PDF viewing/downloading/printing, and the scoped issued-document list. Salary data access remains enforced by the backend and errors are displayed directly.

Issuance retains one UUID and the same payload for retries in the current page. When a network/server response is uncertain, editing is blocked and the user is offered a retry of that exact attempt. A navigation warning prevents casually losing that unresolved attempt; its state is not persisted across page closure. A successful issue is marked saved before refreshing the history, and its action is disabled until the user starts another document or changes the inputs.

Printing uses the downloaded, saved PDF and renders all its pages locally through the existing bundled PDF.js assets. It does not regenerate document HTML or use a remote viewer. Popup blocking and rendering failures are surfaced; PDF downloading remains available.

## Files

- `src/app/settings/letter-templates/page.tsx`
- `src/app/settings/document-templates/page.tsx`
- `src/app/employees/documents/create/page.tsx`
- `src/lib/hr-documents.ts`
- `src/lib/hr-document-template-editor.ts`
- `src/lib/print-hr-document.ts`
- `api/test/hr-document-ui.test.cjs`

## Verification

- Frontend `tsc --noEmit --incremental false --pretty false`: PASS.
- `node --test api/test/hr-document-ui.test.cjs`: **4/4 PASS**, including Arabic/canonical token conversion, a custom label matching a builtin label, invalid/removed variables, all four starters, and the stable issuance fingerprint.
- API response/validation contracts reviewed against the implemented controller and service.
- Browser interaction, PDF printing and screenshots require the parent task's combined production build and browser QA; they have not been claimed as verified here.
- This frontend task did not start services or issue documents against customer data.

Code frozen after the passing checks for the parent task's combined build.
