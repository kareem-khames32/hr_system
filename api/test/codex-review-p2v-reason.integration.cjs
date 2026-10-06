'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
before(async()=>{f=await require('./codex-review-p2v-employment-fixture.cjs')('p2v_reason')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2V A accepted 500-character return reason should retain its final explanation in history',async t=>{
 const {emp}=await f.ended(),reason='A'.repeat(475)+' final reason ending here'
 assert.equal(reason.length,500)
 const r=await f.request('POST',`/employees/${emp.id}/reactivate`,{reason},f.archiver)
 assert.equal(r.status,201)
 const [history]=await f.ds.query('SELECT TOP (1) reason FROM employee_status_history WHERE employeeId=@0 AND fieldName=@1 ORDER BY id DESC',[emp.id,'status'])
 t.diagnostic(JSON.stringify({case:'maximum-return-reason',status:r.status,inputLength:reason.length,storedLength:history.reason.length,finalExplanationRetained:history.reason.endsWith('final reason ending here')}))
 assert.equal(history.reason.endsWith('final reason ending here'),true,'An accepted reason must not lose its final explanation to the automatic prefix')
})
