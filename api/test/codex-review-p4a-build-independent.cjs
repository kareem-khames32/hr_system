'use strict'
const fs=require('node:fs'),path=require('node:path')
const root=__dirname
function fixture(source,target,body){let s=fs.readFileSync(path.join(root,source+'.integration.cjs'),'utf8');s=s.slice(0,s.indexOf('\ntest('));fs.writeFileSync(path.join(root,'codex-review-p4a-'+target+'.integration.cjs'),s+'\n'+body+'\n')}
fixture('payroll-statutory','tax',String.raw`
test('P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor',async t=>{
 const defs=repo('StatutoryDefinition');const old=await defs.findOneByOrFail({country:'EG',key:tax.EG_TAX_BRACKETS_KEY});assert.equal(old.verified,false)
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 expectStatus(await request(users.admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-06-01',values,verified:true}),201)
 for(const row of await defs.findBy({country:'EG',key:tax.EG_TAX_HIGH_INCOME_KEY}))if(!row.verified)expectStatus(await request(users.admin,'PATCH','/settings/statutory/'+row.id,{verified:true}),200)
 expectStatus(await request(users.admin,'PUT','/settings/statutory/calculators/EG_SALARY_TAX',{enabled:true,startPeriod:'2026-01'}),200)
 const may=await runFor('2026-05',[state.full]);const item=itemOf(may,state.full),snapshot=statutoryOf(item)
 assert.equal(snapshot.egTax.tableVerified,false);assert.equal(snapshot.egTax.tableEffectiveFrom,String(old.effectiveFrom).slice(0,10));assert.ok(snapshot.egTax.tax>0)
 await approve(may.id)
 t.diagnostic(JSON.stringify({oldVerified:old.verified,tableVerified:snapshot.egTax.tableVerified,tax:snapshot.egTax.tax,net:Number(item.netPay),approved:true}))
 const june=await runFor('2026-06',[state.raised]);assert.equal(statutoryOf(itemOf(june,state.raised)).egTax.tableVerified,true)
})
test('P4A-F03: cancelled previous-month draft remains in tax of an approved later month',async t=>{
 const emp=await employee(org.cairo,{basicSalary:50000})
 const first=await runFor('2026-08',[emp],'P4A prior month')
 await repo('Employee').update({id:emp.id},{basicSalary:15000})
 const second=await runFor('2026-09',[emp],'P4A current month')
 const one=statutoryOf(itemOf(first,emp)).egTax,two=statutoryOf(itemOf(second,emp)).egTax
 assert.ok(one.tax>1482.5);assert.ok(two.tax<1482.5)
 expectStatus(await request(users.admin,'POST','/payroll/runs/'+first.id+'/cancel',{reason:'Only the second alternative is intended for payment'}),201)
 await approve(second.id)
 const reference=await employee(org.cairo),referenceRun=await runFor('2026-09',[reference],'P4A reference without cancelled income'),referenceTax=statutoryOf(itemOf(referenceRun,reference)).egTax.tax
 assert.equal(referenceTax,1482.5);assert.notEqual(two.tax,referenceTax)
 t.diagnostic(JSON.stringify({firstTax:one.tax,secondTax:two.tax,referenceTax,ytdNetIncome:two.ytdNetIncome,days:two.days,firstCancelled:true,secondApproved:true}))
})
`)
fixture('employee-privacy','export',String.raw`
test('P4A-D01: canonical confidential leave definition leaks through data export',async t=>{
 const rt=await repo('RequestType').findOneByOrFail({code:'LEAVE_ANNUAL'});await repo('RequestType').update({id:rt.id},{isConfidential:true,isActive:true})
 const payload={leaveTypeCode:'ANNUAL',fromDate:'2026-11-01',toDate:'2026-11-01',reason:'P4A_PRIVATE_LEAVE_REASON'}
 const created=ok(await request(U.self,'POST','/requests',{typeCode:'LEAVE',definitionCode:rt.code,payload,submit:false}),201)
 assert.equal(created.typeCode,'LEAVE');assert.equal(created.definitionCode,rt.code)
 await repo('User').update({id:U.editor.id},{permissions:JSON.stringify(['employees.view','employees.edit','requests.view_all'])});U.editor.permissions=JSON.stringify(['employees.view','employees.edit','requests.view_all'])
 const detail=ok(await request(U.editor,'GET','/requests/'+created.id),200)
 assert.ok(!JSON.stringify(detail).includes('P4A_PRIVATE_LEAVE_REASON'),'request endpoint masks confidential payload')
 const exported=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 const rows=exported.sections.find(x=>x.key==='requests').rows
 assert.ok(JSON.stringify(rows).includes('P4A_PRIVATE_LEAVE_REASON'))
 t.diagnostic(JSON.stringify({requestMasked:true,exportContainsConfidentialPayload:true,requestId:created.id}))
})
test('P4A-D02: export reads new branch documents after old branch authorization',async t=>{
 const {EmployeesService}=require('../src/employees/employees.service');const svc=app.get(EmployeesService),original=svc.findOne
 let reached,release;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r);let paused=false
 svc.findOne=async function(...args){const result=await original.apply(this,args);if(args[0]===E.target.id&&!paused){paused=true;reached();await gate}return result}
 const pending=request(U.editor,'GET','/employees/'+E.target.id+'/data-export')
 try{
 await Promise.race([arrived,pending.then(()=>{throw Error('export finished before authorization barrier')})])
 const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+E.target.id),200);
 ok(await request(admin,'PATCH','/employees/'+E.target.id,{branchId:B.two.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'Synthetic branch move',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)
 await repo('EmployeeDocument').save({employeeId:E.target.id,docType:'other',number:'P4A_NEW_BRANCH_DOCUMENT',issueDate:'2026-10-01'})
 release();const result=ok(await pending,200)
 assert.ok(JSON.stringify(result.sections.find(x=>x.key==='documents')).includes('P4A_NEW_BRANCH_DOCUMENT'))
 assert.equal((await request(U.editor,'GET','/employees/'+E.target.id+'/data-export')).status,404)
 t.diagnostic(JSON.stringify({oldScopeExport:200,newBranchDocumentLeaked:true,nextRead:404}))
 }finally{release();svc.findOne=original;await pending}
})
`)
console.log('Independent fixtures prepared; product and existing tests unchanged.')
fixture('leave-entitlement-tiers','tiers-race',String.raw`
test('P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry',async t=>{
 ok(await patchType(annual.id,{category:'ANNUAL',balanceType:'annual',entitlementTiers:[{country:'EG',minServiceYears:null,minAge:null,days:30},{country:'SA',minServiceYears:null,minAge:null,days:15}],carryOverEnabled:true,carryOverMaxDays:60}),200)
 const svc=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService),orig=svc.lockEmployee,target=E.egMid
 let reached,release,paused=false;const arrived=new Promise(r=>reached=r),gate=new Promise(r=>release=r)
 svc.lockEmployee=async function(em,id,...rest){if(id===target.id&&!paused){paused=true;reached();await gate}return orig.call(this,em,id,...rest)}
 const pending=svc.ensureYearRows('2025')
 try{
 await Promise.race([arrived,pending.then(()=>{throw Error('year-row creation ended before barrier')})])
 const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+target.id),200)
 ok(await request(admin,'PATCH','/employees/'+target.id,{branchId:B.sa.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'Synthetic country change after tier facts',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)
 release();await pending;svc.lockEmployee=orig
 const row=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2025'})
 const reference=await repo('LeaveBalance').findOneByOrFail({employeeId:E.saMid.id,balanceType:'annual',period:'2025'})
 assert.equal(Number(row.entitled),30);assert.equal(Number(reference.entitled),15)
 await svc.rollover('2025')
 const next=await repo('LeaveBalance').findOneByOrFail({employeeId:target.id,balanceType:'annual',period:'2026'})
 const nextRef=await repo('LeaveBalance').findOneByOrFail({employeeId:E.saMid.id,balanceType:'annual',period:'2026'})
 assert.equal(Number(next.openingDays),30);assert.equal(Number(nextRef.openingDays),15)
 t.diagnostic(JSON.stringify({currentCountry:'SA',staleHistoricEntitlement:Number(row.entitled),referenceEntitlement:Number(reference.entitled),carry:Number(next.openingDays),referenceCarry:Number(nextRef.openingDays)}))
 }finally{release();svc.lockEmployee=orig;await pending}
})
`)
fixture('overtime-legal-minimum','overtime-history',String.raw`
test('P4A-F02: verified current rule enables historical unverified overtime pricing',async t=>{
 const old=await repo('StatutoryDefinition').findOneByOrFail({key:'eg.overtime',country:'EG'});assert.equal(old.verified,false)
 const values=Object.fromEntries((await repo('StatutoryValue').findBy({definitionId:old.id})).map(x=>[x.code,Number(x.value)]))
 ok(await request(admin,'POST','/settings/statutory',{country:'EG',key:old.key,effectiveFrom:'2026-10-01',values,verified:true}),201)
 await verify('sa.overtime');ok(await enable(true),200)
 const result=await evidenceOf(E.eg,D.weekend)
 assert.equal(result.multiplier,2);assert.equal(result.legal.verified,false)
 t.diagnostic(JSON.stringify({date:D.weekend,multiplier:result.multiplier,legalVerified:result.legal.verified,companyMultiplier:result.legal.companyMultiplier}))
})
`)
