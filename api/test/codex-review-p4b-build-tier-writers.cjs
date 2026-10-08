'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'leave-entitlement-tiers.integration.cjs'),'utf8')
fs.writeFileSync(path.join(__dirname,'codex-review-p4b-tiers-writers.integration.cjs'),source.slice(0,source.indexOf('\ntest('))+String.raw`
async function pauseWriter(svc,id,operation,change){
 const original=svc.lockEmployee;let reached,release,hit=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
 svc.lockEmployee=async function(em,target,...rest){if(target===id&&!hit){hit=true;reached();await gate}return original.call(this,em,target,...rest)}
 const pending=operation()
 try{await Promise.race([arrived,pending.then(()=>{throw Error('writer completed before employee lock')})]);await change();release();return await pending}
 finally{release();svc.lockEmployee=original;await pending}
}
test('P4B-L02: rollover recalculates new-row country after waiting for employee',async t=>{
 ok(await patchType(annual.id,{category:'ANNUAL',balanceType:'annual',entitlementTiers:[{country:'EG',minServiceYears:null,minAge:null,days:30},{country:'SA',minServiceYears:null,minAge:null,days:15}],carryOverEnabled:true,carryOverMaxDays:60}),200)
 const svc=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService),target=E.egSenior
 await repo('LeaveBalance').delete({employeeId:target.id,balanceType:'annual'})
 await repo('LeaveBalance').save({employeeId:target.id,balanceType:'annual',period:'2025',entitled:30,taken:0,openingDays:0,openingTaken:0})
 await pauseWriter(svc,target.id,()=>svc.rollover('2025'),async()=>{
  const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+target.id),200)
  ok(await request(admin,'PATCH','/employees/'+target.id,{branchId:B.sa.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'P4B rollover country race',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)
 })
 const row=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2026'})
 assert.equal(Number(row.entitled),15)
 t.diagnostic(JSON.stringify({writer:'rollover',country:'SA',entitled:Number(row.entitled),carry:Number(row.openingDays)}))
})
test('P4B-L03: daily renewal uses birthday committed before employee lock',async t=>{
 ok(await patchType(annual.id,{entitlementTiers:[{country:'EG',minServiceYears:null,minAge:null,days:15},{country:'EG',minServiceYears:null,minAge:50,days:40}]}),200)
 const svc=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService),target=E.egOld
 const balance=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2026'})
 await repo('LeaveBalance').update({id:balance.id},{entitled:1})
 await pauseWriter(svc,target.id,()=>svc.renewBalancePeriods('2026-10-09'),async()=>{
  ok(await request(admin,'PATCH','/employees/'+target.id,{birthDate:'2005-01-01'}),200)
 })
 const row=await repo('LeaveBalance').findOneByOrFail({id:balance.id})
 assert.equal(Number(row.entitled),15)
 t.diagnostic(JSON.stringify({writer:'renewal',birthDate:'2005-01-01',entitled:Number(row.entitled)}))
})
`)
