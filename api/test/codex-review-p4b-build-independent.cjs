'use strict'
const fs=require('node:fs'),path=require('node:path')
function fixture(source,target,body){let s=fs.readFileSync(path.join(__dirname,source+'.integration.cjs'),'utf8');s=s.slice(0,s.indexOf('\ntest('));fs.writeFileSync(path.join(__dirname,'codex-review-p4b-'+target+'.integration.cjs'),s+'\n'+body+'\n')}
fixture('payroll-statutory','tax',String.raw`
const ack = async id => { const r=expectStatus(await request(users.approver,'GET','/payroll/runs/'+id+'/unassigned'),200);expectStatus(await request(users.approver,'POST','/payroll/runs/'+id+'/unassigned-ack',{reportHash:r.reportHash}),201) }
test('P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them',async t=>{
 const defs=repo('StatutoryDefinition'),old=await defs.findOneByOrFail({country:'EG',key:tax.EG_TAX_BRACKETS_KEY})
 await defs.update({id:old.id},{verified:false})
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 expectStatus(await request(users.admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-06-01',values,verified:true}),201)
 const blocked=await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'})
 assert.equal(blocked.status,400);assert.match(JSON.stringify(blocked.body),/محتاج تحقق/)
 await settings({[run.EG_TAX_ENABLED_KEY]:'true',[run.EG_TAX_START_PERIOD_KEY]:'2026-01'})
 const may=await runFor('2026-05',[state.full]);assert.equal(statutoryOf(itemOf(may,state.full)),undefined)
 const june=await runFor('2026-06',[state.raised]);assert.equal(statutoryOf(itemOf(june,state.raised)).egTax.tableVerified,true)
 await defs.update({id:old.id},{verified:true})
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:false}),200)
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'}),200)
 t.diagnostic(JSON.stringify({activation:blocked.status,historicalTax:false,verifiedSuccessorTax:true}))
})
test('P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation',async t=>{
 const emp=await employee(org.cairo,{basicSalary:50000}),first=await runFor('2026-08',[emp])
 await repo('Employee').update({id:emp.id},{basicSalary:15000})
 const second=await runFor('2026-09',[emp]);assert.deepEqual(statutoryOf(itemOf(second,emp)).egTax.sourceItemIds,[itemOf(first,emp).id])
 await ack(second.id)
 const before=await request(users.approver,'POST','/payroll/runs/'+second.id+'/approve');assert.equal(before.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 expectStatus(await request(users.admin,'POST','/payroll/runs/'+first.id+'/cancel',{reason:'P4B cancel the obsolete calculation'}),201)
 const blocked=await request(users.approver,'POST','/payroll/runs/'+second.id+'/approve');assert.equal(blocked.status,409);assert.equal(blocked.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 const fresh=expectStatus(await request(users.admin,'POST','/payroll/runs/'+second.id+'/recalculate',{reason:'P4B recompute after cancellation'}),201)
 assert.deepEqual(statutoryOf(itemOf(fresh,emp)).egTax.sourceItemIds,[]);assert.equal(statutoryOf(itemOf(fresh,emp)).egTax.tax,1482.5)
 await approve(second.id)
 const later=await runFor('2026-10',[emp]);await approve(later.id)
 const reopen=await request(users.admin,'POST','/payroll/runs/'+second.id+'/reopen',{reason:'P4B source cannot change under approved dependent'})
 assert.equal(reopen.status,409);assert.equal(reopen.body.code,'PAYRUN-TAX-HAS-DEPENDENTS')
 t.diagnostic(JSON.stringify({unfinalizedSource:before.status,cancelledSource:blocked.status,recalculatedTax:1482.5,dependentReopen:reopen.status}))
})
test('P4B-F03: missing source IDs in a legacy snapshot force recalculation',async()=>{
 const emp=await employee(org.cairo),r=await runFor('2026-07',[emp]),item=itemOf(r,emp),b=JSON.parse(item.breakdown)
 delete b.statutory.egTax.sourceItemIds;await repo('PayrollItem').update({id:item.id},{breakdown:JSON.stringify(b)})
 await ack(r.id);const blocked=await request(users.approver,'POST','/payroll/runs/'+r.id+'/approve')
 assert.equal(blocked.status,409);assert.equal(blocked.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
})
test('P4B-F04: final approval and source reopening serialize in both actual request orders',async t=>{
 const results=[]
 for(const order of ['approve-first','reopen-first']){
  const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]);await approve(source.id)
  const dependent=await runFor('2026-09',[emp]);await ack(dependent.id)
  const key=order==='approve-first'?'egTaxSourcesIssue':'egTaxDependentsIssue',original=run[key],target=order==='approve-first'?dependent.id:source.id
  let reached,release,hit=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
  run[key]=async function(em,r,...args){if(!hit&&r.id===target){hit=true;reached();await gate}return original.call(this,em,r,...args)}
  const ap=()=>request(users.approver,'POST','/payroll/runs/'+dependent.id+'/approve'),re=()=>request(users.admin,'POST','/payroll/runs/'+source.id+'/reopen',{reason:'P4B concurrent reopen source'})
  const first=(order==='approve-first'?ap:re)();let second
  try{await Promise.race([arrived,first.then(()=>{throw Error('tax locking barrier not reached')})]);let done=false;second=(order==='approve-first'?re:ap)().then(r=>{done=true;return r})
   await new Promise(r=>setTimeout(r,650));assert.equal(done,false);release()
   const a=await first,b=await second;expectStatus(a,201);assert.equal(b.status,409)
   assert.equal(b.body.code,order==='approve-first'?'PAYRUN-TAX-HAS-DEPENDENTS':'PAYRUN-TAX-SOURCES-CHANGED')
   results.push({order,first:a.status,second:b.status,waited:true})
  }finally{release();run[key]=original;await first;if(second)await second}
 }
 t.diagnostic(JSON.stringify(results))
})
test('P4B-F05: reversal after dependent approval removes both historical income and tax from the next calculation',async t=>{
 const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]);await approve(source.id)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+source.id+'/pay',{channel:'BANK_TRANSFER',reference:'P4B synthetic payment'}),201)
 const dep=await runFor('2026-09',[emp]);await approve(dep.id)
 const saved=await repo('PayrollItem').findOneByOrFail({runId:dep.id,employeeId:emp.id})
 const preview=expectStatus(await request(users.admin,'POST','/payroll/runs/'+source.id+'/reversal-preview',{employeeIds:[emp.id]}),201)
 assert.equal(preview.blocked,false,JSON.stringify(preview.blockers))
 const rev=expectStatus(await request(users.admin,'POST','/payroll/runs/'+source.id+'/reversals',{employeeIds:[emp.id],reason:'P4B reverse synthetic source after later approval',previewHash:preview.previewHash}),201)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+rev.id+'/approve'),201)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+rev.id+'/pay',{channel:'CASH',reference:'P4B synthetic reversal'}),201)
 assert.equal((await repo('PayrollItem').findOneByOrFail({id:saved.id})).breakdown,saved.breakdown)
 const next=await runFor('2026-10',[emp]),snapshot=statutoryOf(itemOf(next,emp)).egTax,prior=JSON.parse(saved.breakdown).statutory.egTax
 assert.deepEqual(snapshot.sourceItemIds,[saved.id]);assert.equal(snapshot.ytdNetIncome,prior.netIncome);assert.equal(snapshot.ytdTax,prior.tax)
 await approve(next.id)
 t.diagnostic(JSON.stringify({reversal:rev.id,dependentUnchanged:true,nextSources:snapshot.sourceItemIds,ytdIncome:snapshot.ytdNetIncome,ytdTax:snapshot.ytdTax}))
})
test('P4B-F06: the final approval-chain step also enforces finalized tax sources',async t=>{
 const final=await repo('User').save({email:'p4b-final@review.invalid',displayName:'Synthetic final approver',passwordHash:'unused',role:'super_admin',permissions:'["*"]',isActive:true})
 const emp=await employee(org.cairo),source=await runFor('2026-08',[emp]),dep=await runFor('2026-09',[emp])
 expectStatus(await request(users.admin,'PUT','/payroll/approval-chain/config/company',{steps:[{kind:'USER',userId:users.approver.id},{kind:'USER',userId:final.id}]}),200)
 expectStatus(await request(users.approver,'POST','/payroll/runs/'+dep.id+'/approval-chain/approve',{}),201)
 const denied=await request(final,'POST','/payroll/runs/'+dep.id+'/approval-chain/approve',{})
 assert.equal(denied.status,409);assert.equal(denied.body.code,'PAYRUN-TAX-SOURCES-CHANGED')
 assert.equal((await repo('PayrollRun').findOneByOrFail({id:dep.id})).status,'CALCULATED')
 t.diagnostic(JSON.stringify({lastStep:denied.status,code:denied.body.code,sourceStatus:source.status}))
})
`)
// Reuse the previous independent race, with successful closure expectations and current fixture.
let old=fs.readFileSync(path.join(__dirname,'codex-review-p4a-tiers-race.integration.cjs'),'utf8');let body=old.slice(old.indexOf('\ntest(')).replaceAll('P4A','P4B').replace('assert.equal(Number(row.entitled),30)','assert.equal(Number(row.entitled),15)').replace('assert.equal(Number(next.openingDays),30)','assert.equal(Number(next.openingDays),15)')
fixture('leave-entitlement-tiers','tiers-race',body)
fixture('employee-privacy','export',String.raw`
test('P4B-D01: canonical confidential request and requestId-linked rows stay out',async t=>{
 const rt=await repo('RequestType').findOneByOrFail({code:'LEAVE_ANNUAL'});await repo('RequestType').update({id:rt.id},{isConfidential:true,isActive:true})
 const created=ok(await request(U.self,'POST','/requests',{typeCode:'LEAVE',definitionCode:rt.code,payload:{leaveTypeCode:'ANNUAL',fromDate:'2026-11-01',toDate:'2026-11-01',reason:'P4B_PRIVATE_LEAVE_REASON'},submit:false}),201)
 const result=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(!JSON.stringify(result).includes('P4B_PRIVATE_LEAVE_REASON'))
 assert.ok(!result.sections.find(x=>x.key==='requests').rows.some(r=>r.id===created.id))
 t.diagnostic(JSON.stringify({confidentialRequestOmitted:true}))
})
test('P4B-D02: export holds employee scope until final read, so a branch transfer waits',async t=>{
 const emProto=require('../node_modules/typeorm').EntityManager.prototype,orig=emProto.query
 let reached,release,paused=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
 emProto.query=async function(sql,args,...rest){const result=await orig.call(this,sql,args,...rest);if(!paused && /SELECT \[id\], \[branchId\] FROM \[employees\] WITH \(UPDLOCK, ROWLOCK\)/.test(sql)&&args?.[0]===E.target.id){paused=true;reached();await gate}return result}
 const pending=request(U.editor,'GET','/employees/'+E.target.id+'/data-export');let move
 try{
 await Promise.race([arrived,pending.then(()=>{throw Error('export finished before locked barrier')})])
 const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+E.target.id),200)
 let done=false;move=request(admin,'PATCH','/employees/'+E.target.id,{branchId:B.two.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'P4B scope transfer',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}).then(r=>{done=true;return r})
 await new Promise(r=>setTimeout(r,700));assert.equal(done,false)
 release();const result=ok(await pending,200);ok(await move,200)
 assert.equal(result.employee.branchId,B.one.id)
 assert.equal((await request(U.editor,'GET','/employees/'+E.target.id+'/data-export')).status,404)
 t.diagnostic(JSON.stringify({transferWaited:true,exportBranch:result.employee.branchId,nextRead:404}))
 }finally{release();emProto.query=orig;await pending;if(move)await move}
})
`)
console.log('P4B independent fixtures prepared')
fixture('overtime-legal-minimum','overtime-history',String.raw`
test('P4B-O01: both activation and runtime reject historical unverified overtime prices',async t=>{
 const old=await repo('StatutoryDefinition').findOneByOrFail({key:'eg.overtime',country:'EG'});assert.equal(old.verified,false)
 const off=await evidenceOf(E.eg,D.weekend)
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 ok(await request(admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-10-01',values,verified:true}),201)
 await verify('sa.overtime');const rejected=await enable(true);assert.equal(rejected.status,400)
 await repo('RequestsConfig').save({key:'overtime.legal_minimum.enabled',value:'true'})
 const ignored=await evidenceOf(E.eg,D.weekend);assert.equal(ignored.legal,null);assert.equal(ignored.multiplier,off.multiplier);assert.equal(ignored.fingerprint,off.fingerprint)
 await repo('StatutoryDefinition').update({id:old.id},{verified:true})
 const active=await evidenceOf(E.eg,D.weekend);assert.equal(active.multiplier,2);assert.equal(active.legal.verified,true)
 t.diagnostic(JSON.stringify({activation:rejected.status,ignoredMultiplier:ignored.multiplier,verifiedMultiplier:active.multiplier,unverifiedFingerprintUnchanged:true}))
})
`)
