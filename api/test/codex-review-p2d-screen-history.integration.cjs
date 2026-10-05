'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
test('P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full',async t=>{
 const f=await require('./codex-review-p2d-support.cjs')('p2d_screen_history')
 try{
  const employee=await f.employee(6000,f.A,{payMethod:'cash'}),run=await f.draft('P2B event history',[employee.id]);await f.calculate(run)
  const old=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:employee.id})
  const hash=item=>crypto.createHash('sha256').update(item.breakdown??'').digest('hex')
  await f.ok('POST','/obligations',{employeeId:employee.id,type:'CREDIT',amount:123.45,label:'P2B event credit',category:'allowance',effectiveDate:'2026-07-01'})
  await f.ok('POST',`/payroll/runs/${run.id}/recalculate`,{reason:'Independent before and after evidence'})
  const current=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:employee.id})
  const event=await f.repo('PayrollRunEvent').findOne({where:{runId:run.id,eventType:'RECALCULATED'},order:{id:'DESC'}})
  assert.ok(event)
  const numericDifferences=[]
  t.diagnostic(JSON.stringify({case:'event-numeric-comparison',ref:process.env.REVIEW_REF,beforeEvent:event.payload.before.items[0].otherAdditions,afterEvent:event.payload.after.items[0].otherAdditions,beforeStored:old.otherAdditions,afterStored:current.otherAdditions,eventNet:event.payload.after.items[0].netPay,storedNet:current.netPay}))
  for(const[phase,item]of[['before',old],['after',current]]){
   const saved=event.payload[phase].items[0]
   if(process.env.REVIEW_REF==='658e15f'){assert.equal(saved.breakdown,item.breakdown)}else{assert.equal(saved.breakdown,undefined);assert.equal(saved.breakdownSha256,hash(item))}
   for(const key of f.repo('PayrollItem').metadata.columns.filter(c=>c.type==='decimal').map(c=>c.propertyName))if(Number(saved[key]??0)!==Number(item[key]??0))numericDifferences.push({phase,key,event:Number(saved[key]??0),stored:Number(item[key]??0)})
  }
  assert.equal(Number(old.netPay),6000);assert.equal(Number(current.netPay),6123.45)
  const full=await f.ok('GET',`/payroll/runs/${run.id}`),slim=await f.ok('GET',`/payroll/runs/${run.id}?view=screen`)
  assert.equal(full.items[0].breakdown,current.breakdown)
  const a=JSON.parse(full.items[0].breakdown),b=JSON.parse(slim.items[0].breakdown)
  if(process.env.REVIEW_REF!=='658e15f')for(const key of require('../src/payroll/payroll-run-screen-view').PAYROLL_RUN_SCREEN_BREAKDOWN_KEYS)assert.deepEqual(b[key],a[key])
  assert.equal((await f.ok('GET',`/payroll/items/${current.id}`)).item.breakdown,current.breakdown)
  const unchanged=await f.repo('PayrollRunEvent').findOneByOrFail({id:event.id});assert.deepEqual(unchanged,event)
  t.diagnostic(JSON.stringify({case:'calculation-event-history',ref:process.env.REVIEW_REF,oldNet:old.netPay,newNet:current.netPay,oldDetailSavedInEvent:process.env.REVIEW_REF==='658e15f',bothHashesMatch:process.env.REVIEW_REF!=='658e15f',defaultAndPayslipFull:true,numericDifferences}))
  assert.deepEqual(numericDifferences,[],'Event amount columns must match the persisted item (also checked on pre-performance baseline)')
 }finally{await f.close()}
},{timeout:180000})
