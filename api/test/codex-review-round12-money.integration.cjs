'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,branch,seq=0,customCode,emp
const route='/offboarding/termination-reasons',lwd='2025-12-31'
const note=v=>console.log('CR12_EVIDENCE '+JSON.stringify(v))
const input=view=>view.reasons.filter(x=>!x.builtin).map(({code,label,eosFactor,active})=>({code,label,eosFactor,active}))
const eos=lines=>(lines||[]).filter(x=>x.label.startsWith('مكافأة نهاية الخدمة'))
const employee=()=>f.repo('Employee').save({employeeCode:`R12M${++seq}`,fullName:`CR12 financial employee ${seq}`,branchId:branch.id,joinDate:'2019-01-01',status:'active',isActive:true,basicSalary:10000.03,housingAllowance:1000,transportAllowance:200,phoneAllowance:100,workNatureAllowance:300,otherAllowance:400,workPressureAllowance:9999,currency:'EGP',payMethod:'cash'})
const preview=reason=>f.ok('GET',`/offboarding/preview?employeeId=${emp.id}&reason=${reason}&lastWorkingDay=${lwd}`)
async function changeReason(patch){const view=await f.ok('GET',route);return f.ok('PUT',route,{revision:view.revision,reasons:input(view).map(r=>r.code===customCode?{...r,...patch}:r)})}
before(async()=>{
  f=await require('./codex-review-round12-fixture.cjs')('r12money')
  branch=await f.repo('Branch').save({name:'CR12 financial branch',code:'R12M'})
  emp=await employee()
  const initial=await f.ok('GET',route)
  const view=await f.ok('PUT',route,{revision:initial.revision,reasons:[...input(initial),{label:'CR12 custom one third',eosFactor:'1/3'}]})
  customCode=view.reasons.find(x=>x.label==='CR12 custom one third').code
})
after(async()=>{if(f)await f.close()})

test('CR12 custom EOS uses full seven-year benefit and six salary components with literal cent expectations',async()=>{
  // Gross = 10000.03 + 1000 + 200 + 100 + 300 + 400 = 12000.03. Pressure 9999 excluded.
  // Seven complete years: 5*0.5 + 2*1 = 4.5 months. Full=54000.13; one third=18000.04.
  const custom=await preview(customCode)
  assert.equal(custom.serviceYears,7);assert.equal(eos(custom.lines)[0].amount,18000.04)
  const amounts={}
  for(const [reason,amount] of [['resignation',36000.08],['termination',54000.13],['dismissal',0],['contract_end',54000.13],['retirement',54000.13],['death',54000.13],['disability',54000.13],['force_majeure',54000.13],['absence',0]]){
    const p=await preview(reason);amounts[reason]=eos(p.lines)[0]?.amount||0;assert.equal(amounts[reason],amount,reason)
  }
  note({case:'manual-seven-year-EOS',gross:12000.03,excludedPressure:9999,months:4.5,full:54000.13,oneThird:18000.04,builtinAndDefaultAmounts:amounts})
})

test('CR12 factor edits require recalculation before approval; disabled used reasons and settled money stay stable',async()=>{
  const kase=await f.ok('POST','/offboarding',{employeeId:emp.id,reason:customCode,lastWorkingDay:lwd})
  for(const item of kase.items)await f.ok('POST',`/offboarding/items/${item.id}/complete`,{})
  let detail=await f.ok('GET',`/offboarding/${kase.id}`);assert.equal(detail.status,'IN_SETTLEMENT');assert.equal(eos(detail.lines)[0].amount,18000.04)
  await changeReason({eosFactor:'1/2',active:false})
  const stale=await f.request('POST',`/offboarding/${kase.id}/approve-settlement`,{},f.approver);assert.equal(stale.status,409)
  const next=await f.ok('POST',`/offboarding/${kase.id}/recalc-lines`,{});assert.equal(eos(next.lines).length,1);assert.equal(eos(next.lines)[0].amount,27000.06)
  const again=await f.ok('POST',`/offboarding/${kase.id}/recalc-lines`,{});assert.equal(eos(again.lines).length,1);assert.equal(eos(again.lines)[0].amount,27000.06)
  const end=await f.ok('POST',`/offboarding/${kase.id}/approve-settlement`,{},f.approver);assert.equal(end.status,'CLOSED')
  const frozen=end.lines.map(x=>({id:x.id,amount:x.amount,label:x.label,type:x.type}))
  await changeReason({eosFactor:'0',label:'CR12 revised after settlement'})
  detail=await f.ok('GET',`/offboarding/${kase.id}`)
  assert.deepEqual(detail.lines.map(x=>({id:x.id,amount:x.amount,label:x.label,type:x.type})),frozen)
  assert.equal(Number(detail.settlementNet),Number(end.settlementNet))
  assert.ok((await f.request('POST',`/offboarding/${kase.id}/recalc-lines`,{})).status>=400)
  const view=await f.ok('GET',route)
  assert.equal((await f.request('PUT',route,{revision:view.revision,reasons:input(view).filter(x=>x.code!==customCode)})).status,409)
  note({case:'EOS-recalc-approval-freeze',before:18000.04,staleApproval:409,recalculated:27000.06,repeatedEOSCount:1,finalStatus:end.status,approvedLinesUnchanged:true,usedReasonDelete:409})
})

test('CR12 concurrent revision edits have one winner and deleted codes are not reused',async()=>{
  const view=await f.ok('GET',route)
  const results=await Promise.all(['Alpha','Beta'].map(name=>f.request('PUT',route,{revision:view.revision,reasons:[...input(view),{label:`CR12 concurrency ${name}`,eosFactor:'1/4'}]})))
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
  const current=await f.ok('GET',route),added=input(current).find(x=>x.label.startsWith('CR12 concurrency'))
  assert.ok(added)
  const removed=await f.ok('PUT',route,{revision:current.revision,reasons:input(current).filter(x=>x.code!==added.code)})
  const next=await f.ok('PUT',route,{revision:removed.revision,reasons:[...input(removed),{label:'CR12 code after deletion',eosFactor:'1'}]})
  const replacement=next.reasons.find(x=>x.label==='CR12 code after deletion')
  assert.ok(Number(replacement.code.split('_')[1])>Number(added.code.split('_')[1]))
  note({case:'concurrent-reason-edit',statuses:results.map(r=>r.status),deletedCode:added.code,newCode:replacement.code})
})

test('CR12 open-versus-delete race cannot leave an offboarding case with a removed reason',async()=>{
  const view=await f.ok('GET',route),candidate=view.reasons.find(x=>x.label==='CR12 code after deletion'),e=await employee()
  const results=await Promise.all([
    f.request('POST','/offboarding',{employeeId:e.id,reason:candidate.code,lastWorkingDay:lwd}),
    f.request('PUT',route,{revision:view.revision,reasons:input(view).filter(x=>x.code!==candidate.code)})
  ])
  const cases=await f.repo('OffboardingCase').findBy({employeeId:e.id}),remaining=(await f.ok('GET',route)).reasons.some(x=>x.code===candidate.code)
  if(cases.length){assert.equal(results[0].status,201);assert.equal(results[1].status,409);assert.equal(remaining,true)}
  else {assert.equal(results[0].status,400);assert.equal(results[1].status,200);assert.equal(remaining,false)}
  note({case:'open-versus-delete',statuses:results.map(r=>r.status),cases:cases.length,reasonRemains:remaining})
})

test('CR12 unknown inherited object key must fail closed and preserve previously generated EOS',async()=>{
  const e=await employee()
  for(const reason of ['mystery_code','constructor'])assert.equal((await f.request('POST','/offboarding',{employeeId:e.id,reason,lastWorkingDay:lwd})).status,400)
  const kase=await f.repo('OffboardingCase').save({employeeId:e.id,lastWorkingDay:lwd,status:'IN_SETTLEMENT',terminationReason:'retirement'})
  const initial=await f.ok('POST',`/offboarding/${kase.id}/recalc-lines`,{});assert.equal(eos(initial.lines)[0].amount,54000.13)
  // Deliberately corrupt ONLY the disposable fixture row, exercising the new unknown-code fail-closed guard.
  await f.repo('OffboardingCase').update({id:kase.id},{terminationReason:'mystery_code'})
  assert.equal((await f.request('POST',`/offboarding/${kase.id}/recalc-lines`,{})).status,409)
  await f.repo('OffboardingCase').update({id:kase.id},{terminationReason:'constructor'})
  const r=await f.request('POST',`/offboarding/${kase.id}/recalc-lines`,{})
  const persisted=await f.repo('SettlementLine').findBy({caseId:kase.id})
  note({case:'unknown-prototype-key',ordinaryUnknown:409,constructorStatus:r.status,EOSBefore:54000.13,EOSAfter:eos(persisted).map(x=>Number(x.amount)),normalCreateBlocked:true,requiresCorruptStoredCode:true})
  assert.equal(r.status,409,'Every nonconfigured code must be rejected, including Object.prototype property names')
  assert.equal(Number(eos(persisted)[0].amount),54000.13)
})
