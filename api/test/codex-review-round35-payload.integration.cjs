'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {payloadRunIds,maskPayloadRunRefs,scrubEventReferences}=require('../src/payroll/payroll-run-visibility')
test('CR35 recursive event masking preserves allowed references, amounts and the original JSON',t=>{
 const original={runId:11,exemptionId:71,amount:'123.45',employeeId:98,entries:[{originalRunId:11,child:{payrollRunId:22,amount:'67.89'}},null,{deferredPastClosedRunId:33}],description:'رصيد 500.00',flags:[false,0,'2026-07']}
 const saved=JSON.parse(JSON.stringify(original)),ids=payloadRunIds(original)
 assert.deepEqual([...new Set(ids)].sort((a,b)=>a-b),[11,22,33])
 const branch=maskPayloadRunRefs(original,id=>id===11)
 assert.equal(branch.hidden,true)
 assert.deepEqual(branch.payload,{...saved,exemptionId:null,entries:[{originalRunId:11,child:{payrollRunId:null,amount:'67.89'}},null,{deferredPastClosedRunId:null}]})
 assert.deepEqual(original,saved)
 const company=maskPayloadRunRefs(original,()=>true);assert.equal(company.hidden,false);assert.deepEqual(company.payload,saved);assert.notEqual(company.payload,original)
 assert.deepEqual(maskPayloadRunRefs(null,()=>false),{payload:null,hidden:false})
 assert.equal(scrubEventReferences('مسير 2026-07 (#22) بمسير العكس #33: المبلغ 123.45 والإعفاء #71'),'مسير 2026-07 بمسير العكس: المبلغ 123.45 والإعفاء')
 t.diagnostic(JSON.stringify({case:'nested-payload-redaction',allowedRetained:true,hiddenAtMultipleDepths:true,amountsAndOriginalPreserved:true,companyDeepEqual:true}))
})
