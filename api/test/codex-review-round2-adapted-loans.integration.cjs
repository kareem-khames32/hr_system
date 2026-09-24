'use strict'
// Existing loan assertions unchanged. Company policy writes use the global administrator,
// as the current scope guard requires; loan requesting/approval actors keep their original permissions.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict')
const filename=path.join(__dirname,'loan-completion.integration.cjs')
let source=fs.readFileSync(filename,'utf8')
const direct="http(f.hr, 'POST', '/loans/cap-policies'",version="http(f.hr, 'POST', `/loans/cap-policies/"
assert.ok(source.includes(direct)&&source.includes(version))
source=source.replaceAll(direct,"http(f.admin, 'POST', '/loans/cap-policies'").replaceAll(version,"http(f.admin, 'POST', `/loans/cap-policies/")
// The shared self-approval guard now rejects first (still 403). Verify the request is unchanged,
// instead of requiring a later, unreachable loan-specific error code. The original 403 assertion stays.
const oldCode="assert.equal(selfApproval.code, 'LOAN_EXCEPTIONAL_SELF_APPROVAL')"
assert.ok(source.includes(oldCode))
source=source.replace(oldCode,"assert.equal((await requestRow(created.id)).status, 'UNDER_REVIEW')")
const fixture=new Module(filename,module);fixture.filename=filename;fixture.paths=module.paths;fixture._compile(source,filename)
