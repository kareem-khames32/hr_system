'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round22-fixture.cjs')
let f,A,B,AR,D1,D2,DB,T1,TB,viewer,denied,run,employees,context,filter
const PERIOD='2026-09'
before(async()=>{
  f=await fixture('r22_independent')
  A=await f.repo('Branch').save({code:'R22-A',name:'فرع أ',country:'EG',insuranceSystem:'NONE'})
  B=await f.repo('Branch').save({code:'R22-B',name:'فرع ب محجوب',country:'EG',insuranceSystem:'NONE'})
  AR=await f.repo('Department').save({name:'إدارة أ',branchId:A.id,unitType:'ADMINISTRATION'})
  D1=await f.repo('Department').save({name:'قسم أ الأول',branchId:A.id,parentId:AR.id})
  D2=await f.repo('Department').save({name:'قسم أ الثاني',branchId:A.id})
  DB=await f.repo('Department').save({name:'قسم ب محجوب',branchId:B.id})
  T1=await f.repo('Team').save({name:'فريق أ',departmentId:D1.id})
  TB=await f.repo('Team').save({name:'فريق ب محجوب',departmentId:DB.id})
  viewer=await f.repo('User').save({email:'view@r22.invalid',displayName:'قارئ أ',role:'employee',branchId:A.id,permissions:JSON.stringify(['reports.view','payroll.view','payroll.disburse','leaves.view_all','approve.hr']),passwordHash:'test-only'})
  denied=await f.repo('User').save({email:'none@r22.invalid',displayName:'بلا صلاحيات',role:'employee',branchId:A.id,permissions:'[]',passwordHash:'test-only'})
  employees=[]
  for(const [i,salary,branch,dept,team] of [[1,6000.11,A,D1,T1],[2,3000.22,A,D1,null],[3,2000.33,A,D2,null],[4,7000.44,B,DB,TB]]){
    const e=await f.repo('Employee').save({employeeCode:`R22-${i}`,fullName:`موظف الاختبار ${i}`,nationalId:`R22-ID-${i}`,branchId:branch.id,departmentId:dept.id,teamId:team?.id??null,joinDate:'2020-01-01',basicSalary:salary,currency:'EGP',payMethod:i===1?'transfer':'cash',...(i===1?{bankName:'بنك الاختبار',iban:'EG380019000500000000263180002'}:{}),status:'active',isActive:true})
    await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2026-01-01',effectiveTo:'2027-12-31',reasonCode:'field_role',reason:'عزل حساب اختبار الفلتر',status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date(),requiresCheckinForPresence:false})
    employees.push(e)
  }
  const policyVersionId=await f.policy()
  const made=await f.ok('POST','/payroll/runs',{name:'مسير فلتر أ',period:PERIOD,policyVersionId,filters:{branchIds:[A.id]}})
  run=made.run??made
  await f.ok('POST',`/payroll/runs/${run.id}/calculate`,{})
  await f.approve(run.id)
  context=await f.ok('GET','/org/filter-context',null,viewer)
  filter={branchId:A.id,departmentIds:[AR.id,D1.id]}
},{timeout:180000})
after(async()=>{if(f)await f.close()})
const rowsOf=r=>r.rows??r.items
const ids=rows=>rows.map(r=>Number(r.employeeId)).sort((a,b)=>a-b)
const q=()=>`branchId=${A.id}&departmentIds=${AR.id},${D1.id}`

test('CR22 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing',async t=>{
  const items=await f.repo('PayrollItem').findBy({runId:run.id})
  assert.deepEqual(items.map(x=>Number(x.netPay)).sort((a,b)=>a-b),[2000.33,3000.22,6000.11])
  const register=await f.ok('GET',`/reports/financial/payroll-register?period=${PERIOD}&${q()}`,null,viewer)
  assert.deepEqual(ids(rowsOf(register)),[employees[0].id,employees[1].id])
  assert.equal(register.totals.net,'9000.33');assert.equal(register.totals.bank,'6000.11');assert.equal(register.totals.cash,'3000.22')
  const cost=await f.ok('GET',`/reports/financial/payroll-cost?period=${PERIOD}&${q()}`,null,viewer)
  const centers=await f.ok('GET',`/reports/cost-centers?period=${PERIOD}&${q()}`,null,viewer)
  assert.equal(cost.totals.net,'9000.33');assert.equal(centers.totals.net,'9000.33');assert.equal(centers.totals.headcount,2)
  for(const endpoint of ['included','roster']){
    const overview=await f.ok('GET',`/payroll/overview/${endpoint}?period=${PERIOD}&${q()}`,null,viewer)
    assert.deepEqual(ids(rowsOf(overview)),[employees[0].id,employees[1].id])
  }
  const team=await f.ok('GET',`/reports/financial/payroll-register?period=${PERIOD}&departmentIds=${D1.id}&teamId=${T1.id}`,null,viewer)
  assert.deepEqual(ids(team.rows),[employees[0].id]);assert.equal(team.totals.net,'6000.11')
  const reports=await f.ok('GET',`/reports/payroll?${q()}`,null,viewer)
  assert.equal(Number(reports.runs.find(r=>r.id===run.id).totalNet),9000.33)
  assert.equal(reports.byMethod.reduce((s,r)=>s+Math.round(Number(r.total)*100),0),900033)
  const shown=await f.ok('GET',`/payroll/disbursement/runs/${run.id}?${q()}`,null,viewer)
  assert.deepEqual(ids(shown.rows),[employees[0].id,employees[1].id]);assert.equal(shown.filteredTotals.unpaid.total,9000.33)
  for(const query of [`departmentIds=${DB.id}`,`departmentIds=999999`]){
    const r=await f.ok('GET',`/reports/payroll?${query}`,null,viewer);assert.deepEqual(r.runs,[]);assert.deepEqual(r.byMethod,[])
  }
  t.diagnostic(JSON.stringify({case:'filtered-real-payroll',netAmounts:items.map(x=>Number(x.netPay)),filteredHandSum:9000.33,report:reports.runs.find(r=>r.id===run.id),disbursement:shown.filteredTotals}))
})

test('CR22 new query inputs reject injection and overflow; read/write permissions remain independent',async t=>{
  const reads=['/leaves','/reports/headcount','/reports/leaves?year=2026','/reports/requests','/reports/payroll',`/reports/financial/payroll-register?period=${PERIOD}`,`/reports/cost-centers?period=${PERIOD}`,`/payroll/disbursement/runs/${run.id}`,`/payroll/runs/${run.id}/bank-sheet`]
  for(const endpoint of reads){
    for(const value of ["1); SELECT 1--",Array.from({length:501},(_,i)=>i+1).join(',')]){
      const r=await f.request('GET',`${endpoint}${endpoint.includes('?')?'&':'?'}departmentIds=${encodeURIComponent(value)}`,null,viewer)
      assert.equal(r.status,400,`${endpoint}: ${r.status}`)
    }
  }
  for(const route of ['/org/filter-context','/reports/headcount',`/payroll/overview/roster?period=${PERIOD}`])assert.equal((await f.request('GET',route,null,denied)).status,403)
  assert.equal((await f.request('GET','/org/filter-context',null,null)).status,401)
  assert.equal((await f.request('GET',`/payroll/runs/${run.id}/bank-sheet?${q()}`,null,denied)).status,403)
  assert.equal((await f.request('GET',`/payroll/runs/${run.id}/bank-sheet`,null,null)).status,401)
  t.diagnostic(JSON.stringify({case:'query-and-permission-guards',queriesRejected:reads.length*2,unauthenticated:401,unauthorized:403}))
})

test('CR22 mark-filtered serializes two stale callers and writes exactly the filtered employees once',async t=>{
  const runner=f.ds.createQueryRunner();let pending=[],waits=0,responses
  try{
    await runner.connect();await runner.startTransaction()
    await runner.query("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; IF @r<0 THROW 59999,'fixture lock failed',1",[`hr:payroll:run:${run.id}`])
    const body={paid:true,expectedCount:2,filter,note:'اختبار صرف القسم المحدد'}
    pending=[1,2].map(()=>f.request('POST',`/payroll/disbursement/runs/${run.id}/mark-filtered`,body,viewer))
    for(let i=0;i<150;i++){waits=Number((await runner.query("SELECT COUNT(*) n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND resource_type='APPLICATION' AND request_status='WAIT'"))[0].n);if(waits>=2)break;await new Promise(r=>setTimeout(r,25))}
    assert.ok(waits>=2);await runner.commitTransaction();responses=await Promise.all(pending)
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await Promise.allSettled(pending);await runner.release()}
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal(responses.find(r=>r.status===409).body.code,'PAYRUN-DISBURSE-STALE')
  const marks=await f.repo('PayrollItemDisbursement').findBy({runId:run.id});assert.deepEqual(ids(marks),[employees[0].id,employees[1].id])
  assert.equal(await f.repo('PayrollRunEvent').countBy({runId:run.id,eventType:'DISBURSEMENT_MARKED'}),1)
  assert.equal((await f.request('POST',`/payroll/disbursement/runs/${run.id}/mark-filtered`,{paid:true,expectedCount:1,filter:{departmentIds:[D2.id]}},denied)).status,403)
  t.diagnostic(JSON.stringify({case:'mark-filtered-race',sqlWaiters:waits,statuses:responses.map(r=>r.status),markedIds:ids(marks),events:1}))
})

async function moveEmployee(){
  const e=employees[0],day=require('../src/attendance/attendance.service').localDateOf(new Date())
  let c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  await f.ok('POST','/attendance/calendar-context/confirm',{scope:'EMPLOYEE',sourceId:e.id,calendarChange:{effectiveFrom:day,reason:'اختبار سجل القسم',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
  c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  await f.ok('PATCH',`/employees/${e.id}`,{branchId:B.id,departmentId:DB.id,teamId:TB.id,managerEmployeeId:null,attendanceEffectiveFrom:day,attendanceChangeReason:'نقل بعد اعتماد المسير',calendarChange:{effectiveFrom:day,reason:'نقل بعد اعتماد المسير',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
}

test('CR22 old request counts must not reveal the transferred requester department or team outside viewer scope',async t=>{
  const chain=await f.repo('ApprovalChain').save({code:'R22-PERSONAL',nameAr:'اعتماد البيانات',isActive:true,autoApprove:false})
  await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
  await f.repo('RequestType').save({code:'PERSONAL_DATA_UPDATE',nameAr:'تحديث بيانات شخصية',category:'personal_data',destinationHandler:'employee_record',requiredFields:'[]',approvalChainId:chain.id,isActive:true,isConfidential:false})
  const owner=await f.repo('User').save({email:'owner@r22.invalid',displayName:'صاحب الطلب',role:'employee',branchId:A.id,employeeId:employees[0].id,permissions:'[]',passwordHash:'test-only'})
  const submitted=await f.ok('POST','/requests',{typeCode:'PERSONAL_DATA_UPDATE',payload:{phone:'01011112222'},submit:true},owner)
  assert.equal(submitted.status,'UNDER_REVIEW')
  await f.repo('RequestType').save({code:'R22-SECRET',nameAr:'طلب سري',category:'confidential',destinationHandler:'employee_record',requiredFields:'[]',isActive:true,isConfidential:true})
  await f.repo('Request').save({typeCode:'R22-SECRET',requesterId:employees[0].id,branchId:A.id,status:'UNDER_REVIEW',createdByUserId:f.admin.id,payload:'{}'})
  await moveEmployee()
  const count=r=>r.byType.reduce((s,x)=>s+Number(x.total),0)
  const all=await f.ok('GET','/reports/requests',null,viewer),foreignDept=await f.ok('GET',`/reports/requests?departmentIds=${DB.id}`,null,viewer)
  const foreignTeam=await f.ok('GET',`/reports/requests?teamId=${TB.id}`,null,viewer),missing=await f.ok('GET','/reports/requests?departmentIds=999999',null,viewer)
  t.diagnostic(JSON.stringify({case:'request-count-org-oracle',all:count(all),foreignDepartment:foreignDept,foreignTeam,missingDepartment:missing}))
  assert.equal(count(all),2);assert.deepEqual(foreignDept,missing,'Foreign department must be indistinguishable from missing');assert.equal(count(foreignTeam),0)
  const missingTeam=await f.ok('GET','/reports/requests?teamId=999999',null,viewer)
  assert.deepEqual(foreignTeam,missingTeam)
  for(const query of [`departmentIds=${DB.id}&teamId=${TB.id}`,`branchId=${A.id}&departmentIds=${DB.id}`])assert.equal(count(await f.ok('GET',`/reports/requests?${query}`,null,viewer)),0)
  const foreignBranch=await f.request('GET',`/reports/requests?branchId=${B.id}`,null,viewer),missingBranch=await f.request('GET','/reports/requests?branchId=999999',null,viewer)
  assert.equal(foreignBranch.status,403);assert.deepEqual(foreignBranch,missingBranch)
  const company=await f.ok('GET',`/reports/requests?departmentIds=${DB.id}`)
  assert.equal(count(company),1,'Company viewer may see the current organization; confidential request stays excluded')
  const multi=await f.repo('User').save({email:'multi@r22.invalid',displayName:'قارئ الفرعين',role:'employee',branchId:A.id,scopeBranchIds:JSON.stringify([A.id,B.id]),permissions:JSON.stringify(['reports.view']),passwordHash:'test-only'})
  assert.equal(count(await f.ok('GET',`/reports/requests?departmentIds=${DB.id}`,null,multi)),1)
})

test('CR22 server bank sheet and actual CSV and Excel exports match the register after employee transfer',async t=>{
  const c=await f.ok('GET','/org/filter-context',null,viewer)
  const {compileOrgFilter}=require('../../src/lib/org-filter')
  const compiled=compileOrgFilter(c,{branchId:A.id,administrationId:AR.id,departmentId:null,teamId:null})
  assert.equal(c.employees.some(e=>e.id===employees[0].id),false,'Moved employee is absent from current viewer context')
  const fs=require('node:fs'),path=require('node:path'),ts=require('../node_modules/typescript'),vm=require('node:vm')
  const exportsApi={};let requested
  const apiCode=fs.readFileSync(path.resolve(__dirname,'../../src/lib/reports-org-api.ts'),'utf8')
  vm.runInNewContext(ts.transpileModule(apiCode,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports:exportsApi,URLSearchParams,require:name=>name==='./org-filter'?require('../../src/lib/org-filter'):{apiFetch:route=>{requested=route;return f.ok('GET',route,null,viewer)}}})
  const shown=await exportsApi.fetchBankSheetFor(run.id,compiled.params)
  const register=await f.ok('GET',`/reports/financial/payroll-register?period=${PERIOD}&${q()}`,null,viewer)
  const expected=rowsOf(register).reduce((s,r)=>s+Math.round(Number(r.net)*100),0)/100
  // Execute the actual page's export helpers extracted by TypeScript AST, without rendering a browser or changing product files.
  const page=fs.readFileSync(path.resolve(__dirname,'../../src/app/payroll/bank-sheet/page.tsx'),'utf8')
  const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),names=new Set(['sheetRows','sheetTotals','downloadExcel','HEADER','fileBase'])
  const source=ast.statements.filter(node=>ts.isFunctionDeclaration(node)?names.has(node.name?.text):ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>names.has(d.name.getText(ast)))).map(node=>node.getText(ast)).join('\n')
  let blob,clicked=false
  const sandbox={module:{exports:{}},Blob,URL:{createObjectURL:value=>{blob=value;return 'blob:review'},revokeObjectURL:()=>{}},document:{createElement:()=>({click:()=>{clicked=true},remove:()=>{}}),body:{appendChild:()=>{}}},setTimeout:()=>0}
  vm.runInNewContext(ts.transpileModule(source+'\nmodule.exports={sheetRows,sheetTotals,downloadExcel,HEADER}',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox)
  const exporters=sandbox.module.exports,csvRows=exporters.sheetRows(shown);exporters.downloadExcel(shown)
  const html=await blob.text();assert.ok(clicked);assert.ok(html.includes(employees[0].employeeCode));assert.equal(csvRows.length,2)
  const csvExports={}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../src/lib/csv.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{...sandbox,exports:csvExports})
  csvExports.downloadCsv('review.csv',exporters.HEADER,[...csvRows,...exporters.sheetTotals(shown)])
  const csv=await blob.text()
  for(const e of employees.slice(0,2)){assert.ok(html.includes(e.employeeCode));assert.ok(csv.includes(e.employeeCode))}
  for(const e of employees.slice(2)){assert.ok(!html.includes(e.employeeCode));assert.ok(!csv.includes(e.employeeCode))}
  for(const amount of ['6000.11','3000.22','9000.33']){assert.ok(html.includes(amount));assert.ok(csv.includes(amount))}
  const csvSum=csv.split('\r\n').filter(line=>/^R22-[12],/.test(line)).reduce((sum,line)=>sum+Math.round(Number(line.split(',')[5])*100),0)
  const excelRows=[...html.matchAll(/<tr>(.*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(x=>x[1]))
  const excelSum=excelRows.filter(row=>/^R22-[12]$/.test(row[0])).reduce((sum,row)=>sum+Math.round(Number(row[5])*100),0)
  assert.equal(csvSum,900033);assert.equal(excelSum,900033)
  assert.deepEqual(ids(shown.rows),ids(register.rows));assert.equal(shown.totals.bank,6000.11);assert.equal(shown.totals.cash,3000.22)
  assert.equal(shown.banks.reduce((sum,bank)=>sum+Math.round(bank.total*100),0),600011)
  assert.equal(Number(exporters.sheetTotals(shown).find(row=>row[0]==='الإجمالي')[5]),shown.totals.net)
  t.diagnostic(JSON.stringify({case:'bank-filter-after-transfer',frontendRequest:requested,registerEmployeeIds:ids(rowsOf(register)),bankEmployeeIds:ids(shown.rows),registerTotal:expected,bankTotal:shown.totals.net,registerBank:Number(register.totals.bank),shownBank:shown.totals.bank,csvEmployeeCount:csvRows.length,csvSum:csvSum/100,excelSum:excelSum/100,excelIncludesTransferredEmployee:html.includes(employees[0].employeeCode)}))
  assert.equal(expected,9000.33);assert.equal(shown.totals.net,expected,'Bank sheet must match payroll snapshot filter and register')
})

test('CR22 bank filters intersect snapshot placement; foreign and nonexistent organization cannot change counts',async t=>{
  const url=`/payroll/runs/${run.id}/bank-sheet`
  for(const query of ['',`branchId=${A.id}`,`departmentIds=${D1.id}`,`teamId=${T1.id}`,`departmentIds=${D1.id}&teamId=${T1.id}`,`departmentIds=${D2.id}&teamId=${T1.id}`]){
    const bank=await f.ok('GET',`${url}?${query}`,null,viewer)
    const register=await f.ok('GET',`/reports/financial/payroll-register?period=${PERIOD}&${query}`,null,viewer)
    assert.deepEqual(ids(bank.rows),ids(register.rows));assert.equal(bank.totals.net,Number(register.totals.net));assert.equal(bank.totals.bank,Number(register.totals.bank));assert.equal(bank.totals.cash,Number(register.totals.cash))
  }
  const absent=await f.ok('GET',`${url}?departmentIds=999999`,null,viewer)
  for(const query of [`departmentIds=${DB.id}`,`teamId=${TB.id}`,`teamId=999999`])assert.deepEqual(await f.ok('GET',`${url}?${query}`,null,viewer),absent)
  const forbidden=await f.request('GET',`${url}?branchId=${B.id}`,null,viewer),missing=await f.request('GET',`${url}?branchId=999999`,null,viewer)
  assert.equal(forbidden.status,403);assert.deepEqual(forbidden,missing)
  for(const query of ['branchId=-1','teamId=NaN','departmentIds=,'])assert.equal((await f.request('GET',`${url}?${query}`,null,viewer)).status,400)
  t.diagnostic(JSON.stringify({case:'bank-filter-edges',matchingRegisterQueries:6,foreignDepartmentAndTeamEqualMissing:true,foreignAndMissingBranchStatus:403}))
})

test('CR22 legacy missing membership snapshot falls back to current placement; explicit snapshot nulls do not',async t=>{
  const employee=await f.repo('Employee').findOneByOrFail({id:employees[1].id})
  const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:employee.id})
  const endpoint=`/payroll/runs/${run.id}/bank-sheet`
  const compare=async(query,expected)=>{
    const bank=await f.ok('GET',`${endpoint}?${query}`,null,viewer)
    const register=await f.ok('GET',`/reports/financial/payroll-register?period=${PERIOD}&${query}`,null,viewer)
    assert.deepEqual(ids(bank.rows),expected);assert.deepEqual(ids(bank.rows),ids(register.rows));assert.equal(bank.totals.net,Number(register.totals.net))
    return bank
  }
  try{
    // A legacy shape is seeded on our disposable data only; reads still use the real API and SQL.
    await f.repo('Employee').update(employee.id,{departmentId:D2.id,teamId:T1.id})
    await f.repo('PayrollRunMember').update(member.id,{snapshot:{...member.snapshot,departmentId:null,teamId:null}})
    await compare(`departmentIds=${D2.id}`,[employees[2].id])
    await compare(`teamId=${T1.id}`,[employees[0].id])
    await f.repo('PayrollRunMember').update(member.id,{snapshot:null})
    const legacy=await compare(`departmentIds=${D2.id}`,[employee.id,employees[2].id]);assert.equal(legacy.totals.net,5000.55)
    await f.repo('PayrollRunMember').delete(member.id)
    await compare(`departmentIds=${D2.id}`,[employee.id,employees[2].id])
    t.diagnostic(JSON.stringify({case:'bank-legacy-placement',explicitSnapshotNullDoesNotUseCurrent:true,missingSnapshotAndMissingMemberUseCurrent:true,legacyFilteredNet:5000.55}))
  }finally{
    const exists=await f.repo('PayrollRunMember').findOneBy({runId:run.id,employeeId:employee.id})
    if(exists)await f.repo('PayrollRunMember').update(exists.id,{snapshot:member.snapshot})
    else{const {id,...saved}=member;await f.repo('PayrollRunMember').save(saved)}
    await f.repo('Employee').update(employee.id,{departmentId:employee.departmentId,teamId:employee.teamId})
  }
})
