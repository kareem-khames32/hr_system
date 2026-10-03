'use strict'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const source=fs.readFileSync(path.join(__dirname,'codex-review-round39-payslip.integration.cjs'),'utf8')
const prefix=source.slice(0,source.indexOf("test('CR39 ledger and payslip"))
assert.ok(prefix.includes("type:'CREDIT'")&&prefix.includes('after(async'))
const tests=String.raw`
// This decoder accepts only the string returned to the restricted reader. No DB, privileged response, or run metadata.
function periodsRecoverableFromKey(key){
 const split=key.lastIndexOf('~'),rendered=key.slice(0,split),fingerprint=key.slice(split+1)
 if(split<0||!/^[a-f0-9]{8}$/.test(fingerprint))return []
 const candidates=[]
 for(let year=2000;year<=2035;year++)for(let month=1;month<=12;month++){
  const period=year+'-'+String(month).padStart(2,'0')
  const original=rendered.split('مسير خارج نطاق صلاحيتك').join('مسير '+period)
  if(require('node:crypto').createHash('sha1').update(original).digest('hex').slice(0,8)===fingerprint)candidates.push(period)
 }
 return candidates
}
test('CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history',{timeout:60000},async t=>{
 const before=await state(),url='/payroll/runs/'+current.id+'/lines'
 const branch=await f.ok('GET',url,null,reader),again=await f.ok('GET',url,null,reader),company=await f.ok('GET',url)
 const slip=await f.ok('GET','/payroll/items/'+item.id,null,reader),own=await f.ok('GET','/payroll/items/'+item.id,null,owner)
 const companySlip=await f.ok('GET','/payroll/items/'+item.id)
 assert.deepEqual(again,branch);assert.deepEqual(slip.lines,branch.rows[0].totals?{earnings:branch.rows[0].earnings,deductions:branch.rows[0].deductions,totals:branch.rows[0].totals}:null)
 for(const side of ['earnings','deductions'])for(const line of branch.rows[0][side])assert.equal(branch.columns[side].filter(col=>col.key===line.key&&col.name===line.name).length,1)
 assert.equal(branch.rows[0].totals.net,9067.89);assert.equal(branch.rows[0].totals.earnings,9067.89)
 assert.equal(JSON.stringify(branch).includes(forbidden),false);assert.equal(JSON.stringify(slip.lines).includes(forbidden),false)
 assert.deepEqual(own.lines,companySlip.lines);assert.ok(JSON.stringify(company).includes(forbidden));assert.ok(JSON.stringify(own.lines).includes(forbidden))
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'line-key-rendering-controls',hiddenKeys:branch.columns.earnings.map(x=>x.key),rowColumnMapping:true,stableReads:true,net:9067.89,companySelfPreserved:true,storedUnchanged:true}))
})
for(const route of ['payslip','run-lines'])test('CR40 '+route+': a masked key must not allow recovering the hidden payroll period offline',{timeout:60000},async t=>{
 const before=await state(),url=route==='payslip'?'/payroll/items/'+item.id:'/payroll/runs/'+current.id+'/lines'
 const branch=await f.ok('GET',url,null,reader),lines=route==='payslip'?branch.lines.earnings:branch.rows[0].earnings
 const line=lines.find(x=>x.key.includes('مسير خارج نطاق صلاحيتك'));assert.ok(line)
 assert.equal(line.key.includes('2026-07'),false);assert.equal(line.name.includes('2026-07'),false)
 const decoded=periodsRecoverableFromKey(line.key)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'recover-hidden-period-from-key',route,directForeignRead:403,currentRead:200,key:line.key,readerOnlyCandidateSpace:432,decoded,net:9067.89,storedUnchanged:true}))
 assert.deepEqual(decoded,[],'The returned unkeyed digest verifies a small dictionary of hidden payroll periods')
})
for(const route of ['overview-lines','approval-review'])test('CR40 adjacent '+route+': old foreign period must not survive in another line reader',{timeout:60000},async t=>{
 const before=await state(),url=route==='overview-lines'?'/payroll/overview/lines?period='+period:'/payroll/approval-chain/runs/'+current.id+'/review'
 const branch=await f.ok('GET',url,null,reader),company=await f.ok('GET',url),leaks=textPaths(branch),companyRefs=textPaths(company)
 const row=branch.rows.find(x=>x.employeeId===employee.id);assert.ok(row)
 assert.equal(Number(route==='overview-lines'?row.totals.net:row.net),9067.89)
 assert.deepEqual(await state(),before)
 t.diagnostic(JSON.stringify({case:'adjacent-reader-foreign-period',route,url,foreignRead:403,currentRead:200,leaks,companyRefs,net:9067.89,storedUnchanged:true}))
 assert.deepEqual(leaks,[],'A visible current payroll does not authorize an embedded foreign historical payroll period')
})
`
fs.writeFileSync(path.join(__dirname,'codex-review-round40-key-boundary.integration.cjs'),(prefix+tests).replaceAll('round39','round40').replaceAll('CR39','CR40').replaceAll('r39','r40'))
console.log('Created real API key-boundary tests; original fixtures unchanged.')
