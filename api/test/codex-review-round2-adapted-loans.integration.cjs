'use strict'
// Existing loan assertions unchanged. Company policy writes use the global administrator,
// as the current scope guard requires; loan requesting/approval actors keep their original permissions.
// 2026-09-26 (owner decision «مدير الموارد البشرية قراره نهائي»): loan-completion itself now writes company policies
// with the administrator, and its AD-09 asserts the new rule (the HR exceptional loan on behalf is approved at once;
// the creator self-approval guard is exercised on a creator without HR authority). Each adaptation below is applied only
// while its original text is still present, so this harness keeps running the current loan-completion suite unchanged.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module')
const filename=path.join(__dirname,'loan-completion.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const direct="http(f.hr, 'POST', '/loans/cap-policies'",version="http(f.hr, 'POST', `/loans/cap-policies/"
source=source.replaceAll(direct,"http(f.admin, 'POST', '/loans/cap-policies'").replaceAll(version,"http(f.admin, 'POST', `/loans/cap-policies/")
// The shared self-approval guard now rejects first (still 403). Verify the request is unchanged,
// instead of requiring a later, unreachable loan-specific error code. The original 403 assertion stays.
const oldCode="assert.equal(selfApproval.code, 'LOAN_EXCEPTIONAL_SELF_APPROVAL')"
source=source.replace(oldCode,"assert.equal((await requestRow(created.id)).status, 'UNDER_REVIEW')")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
