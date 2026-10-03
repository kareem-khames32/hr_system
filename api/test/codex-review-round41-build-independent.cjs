'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const source=fs.readFileSync(path.join(__dirname,'codex-review-round40-key-boundary.integration.cjs'),'utf8')
const prefix=source.slice(0,source.indexOf('// This decoder accepts only'))
assert.ok(prefix.includes('after(async')&&prefix.includes("type:'CREDIT'"))
const tests=String.raw`
function publicDictionaryMatches(key){
 const at=key.lastIndexOf('~'),rendered=key.slice(0,at),fingerprint=key.slice(at+1),matches=[]
 assert.match(fingerprint,/^[a-f0-9]{16}$/)
 for(let y=2000;y<=2035;y++)for(let m=1;m<=12;m++){
  const period=y+'-'+String(m).padStart(2,'0'),guess=rendered.split('مسير خارج نطاق صلاحيتك').join('مسير '+period)
  for(const algorithm of ['sha1','sha256','sha512','md5']){
   const digest=require('node:crypto').createHash(algorithm).update(guess).digest('hex')
   if(digest.startsWith(fingerprint)||digest.slice(0,8)===fingerprint.slice(0,8))matches.push({algorithm,period})
  }
 }
 return matches
}
test('CR41 closures: seven real readers, opaque stable keys, permitted self/company text, exact money and stored history',{timeout:120000},async t=>{
 const before=await state(),routes={
  payslip:'/payroll/items/'+item.id,lines:'/payroll/runs/'+current.id+'/lines',run:'/payroll/runs/'+current.id,
  overview:'/payroll/overview/lines?period='+period,review:'/payroll/approval-chain/runs/'+current.id+'/review',
  ledger:'/obligations/employee/'+employee.id,register:'/reports/financial/payroll-register?period='+period
 },branch={},company={}
 for(const [name,url] of Object.entries(routes)){
  branch[name]=await f.ok('GET',url,null,reader);company[name]=await f.ok('GET',url)
  assert.deepEqual(textPaths(branch[name]),[],name+' hides the foreign historical period')
 }
 const own=await f.ok('GET',routes.payslip,null,owner)
 assert.deepEqual(own.lines,company.payslip.lines);assert.ok(textPaths(own).length>0)
 const key=branch.payslip.lines.earnings.find(x=>x.amount===67.89).key
 const getAllowance=lines=>lines.find(x=>Number(x.amount)===67.89)
 assert.equal(getAllowance(branch.lines.rows.find(x=>x.employeeId===employee.id).earnings).key,key)
 assert.equal(getAllowance(branch.overview.rows.find(x=>x.employeeId===employee.id).earnings).key,key)
 assert.equal(getAllowance(branch.review.rows.find(x=>x.employeeId===employee.id).earningLines).key,key)
 for(const name of ['lines','overview'])assert.equal(branch[name].columns.earnings.filter(x=>x.key===key).length,1)
 const again=await f.ok('GET',routes.payslip,null,reader);assert.deepEqual(again,branch.payslip)
 const matches=publicDictionaryMatches(key);assert.deepEqual(matches,[])
 for(const view of [branch.payslip,company.payslip,own]){assert.equal(Number(view.item.netPay),9067.89);assert.equal(view.lines.totals.net,9067.89)}
 for(const name of ['payslip','lines','overview','review','ledger'])assert.ok(textPaths(company[name]).length>0,name+' company text retained')
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'CR41-seven-reader-closures',routes:Object.keys(routes),status:200,oldForeignRunStatus:403,key,publicCandidates:432,algorithms:4,matches,net:9067.89,reversal:-9067.89,companySelfPreserved:true,storedUnchanged:true}))
})

let foreignJuly,foreignAugust,noPayroll,foreignJulyRun
async function prepareOracle(){
 if(foreignJuly)return
 const exemption=async e=>f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 foreignJuly=await f.employee(6000,f.B,{bankName:'CR41 fixture bank'});await exemption(foreignJuly)
 foreignAugust=await f.employee(7000,f.B,{bankName:'CR41 fixture bank'});await exemption(foreignAugust)
 noPayroll=await f.employee(8000,f.B,{bankName:'CR41 fixture bank'});await exemption(noPayroll)
 foreignJulyRun=await f.draft('CR41 hidden target July',[foreignJuly.id],'2026-07');await f.calculate(foreignJulyRun);await f.pay(foreignJulyRun)
 const august=await f.draft('CR41 hidden target August',[foreignAugust.id],'2026-08');await f.calculate(august);await f.pay(august)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:foreignJulyRun.id})).totalNet),6000)
 assert.equal(Number((await f.repo('PayrollRun').findOneByOrFail({id:august.id})).totalNet),7000)
}
test('CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip',{timeout:180000},async t=>{
 await prepareOracle()
 const before=await state(),url='/payroll/items/'+item.id,plain=await f.ok('GET',url,null,owner)
 assert.ok(JSON.stringify(plain).includes(forbidden));assert.equal(owner.employeeId,employee.id);assert.equal(owner.permissions,'[]')
 const foreignItem=await f.repo('PayrollItem').findOneByOrFail({runId:foreignJulyRun.id,employeeId:foreignJuly.id})
 const denied=await f.request('GET','/payroll/items/'+foreignItem.id,null,owner);assert.ok([403,404].includes(denied.status))
 const controls=[['nonexistent',2147483647],['foreignNoPayroll',noPayroll.id],['foreignAugust',foreignAugust.id],['self',employee.id]]
 const observations=[]
 for(const [target,id] of controls){
  const body=await f.ok('GET',url+'?employeeId='+id,null,owner)
  observations.push({target,retainsOwnJuly:JSON.stringify(body).includes(forbidden),identical:JSON.stringify(body)===JSON.stringify(plain)})
  assert.deepEqual(body,plain,'Unused query must not change self payslip: '+target)
 }
 const probed=await f.ok('GET',url+'?employeeId='+foreignJuly.id,null,owner)
 observations.push({target:'foreignJuly',retainsOwnJuly:JSON.stringify(probed).includes(forbidden),identical:JSON.stringify(probed)===JSON.stringify(plain)})
 assert.equal(Number(probed.item.netPay),9067.89);assert.deepEqual(await state(),before)
 const companyPlain=await f.ok('GET',url),companyProbe=await f.ok('GET',url+'?employeeId='+foreignJuly.id);assert.deepEqual(companyProbe,companyPlain)
 t.diagnostic(JSON.stringify({case:'CR41-query-payroll-month-oracle',actorHasPayrollView:false,ownPayslipStatus:200,foreignItemStatus:denied.status,observations,ownLineBefore:plain.lines.earnings.find(x=>x.amount===67.89).name,ownLineAfter:probed.lines.earnings.find(x=>x.amount===67.89).name,net:9067.89,companyUnchanged:true,storedUnchanged:true}))
 assert.deepEqual(probed,plain,'Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee')
})
`
fs.writeFileSync(path.join(__dirname,'codex-review-round41-independent.integration.cjs'),prefix.replaceAll('round40','round41').replaceAll('CR40','CR41').replaceAll('r40','r41')+tests)
