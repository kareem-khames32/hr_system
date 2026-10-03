'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {scopeRunRefRows,payloadRunIds}=require('../src/payroll/payroll-run-visibility')
test('CR37 scopeRunRefRows: nested references, Date values, allowed identity and immutable source',async t=>{
 const em={query:async()=>[{id:11,branchId:1,hasMembers:1,runType:'REGULAR',parentRunId:null},{id:22,branchId:2,hasMembers:1,runType:'REGULAR',parentRunId:null}],getRepository:()=>({find:async()=>[{id:1,runId:11,employeeId:5,snapshot:{branchId:1}},{id:2,runId:22,employeeId:5,snapshot:{branchId:2}}]})}
 const date=new Date('2026-07-01T10:20:30.123Z'),allowed={employeeId:5,runId:11,amount:'126.56',createdAt:date,nested:[{appliedPayrollRunId:11,at:date}]}
 const foreign={employeeId:5,runId:22,amount:'126.56',createdAt:date,nested:[{allowedRunId:11,at:date},{rows:[{reversalRunId:22,amount:5.25}]}]}
 const noRef={employeeId:5,amount:0,at:date},rows=[allowed,foreign,noRef],source=JSON.stringify(rows)
 const viewer={sub:8,role:'employee',branchId:1,branchIds:[1],scopeAllBranches:false,employeeId:null,permissions:['payroll.view']}
 const result=await scopeRunRefRows(em,viewer,rows,x=>x.employeeId)
 assert.strictEqual(result[0],allowed);assert.strictEqual(result[2],noRef);assert.notStrictEqual(result[1],foreign)
 assert.equal(result[1].runId,null);assert.equal(result[1].nested[1].rows[0].reversalRunId,null);assert.equal(result[1].nested[0].allowedRunId,11)
 assert.strictEqual(result[1].createdAt,date);assert.strictEqual(result[1].nested[0].at,date);assert.equal(result[1].amount,'126.56');assert.equal(result[1].nested[1].rows[0].amount,5.25)
 assert.equal(JSON.stringify(rows),source)
 for(const reader of [null,{...viewer,scopeAllBranches:true,branchIds:undefined,branchId:null},{...viewer,employeeId:5}]){
  const permitted=await scopeRunRefRows(em,reader,rows,x=>x.employeeId)
  assert.deepEqual(permitted,rows);rows.forEach((row,i)=>assert.strictEqual(permitted[i],row))
 }
 assert.deepEqual(payloadRunIds(date),[])
 t.diagnostic(JSON.stringify({case:'scope-raw-row-helper',nestedForeignRefsNull:true,allowedRowsSameObject:true,dateIdentityPreserved:true,moneyPreserved:true,sourceUnchanged:true,companyInternalAndSelfUnchanged:true,kind:'unit with explicit repository fixture'}))
})
