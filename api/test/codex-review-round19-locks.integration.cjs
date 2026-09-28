'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const fixture=require('./codex-review-round19-fixture.cjs')
let f,b,d,n=0
before(async()=>{f=await fixture('r19_locks');b=await f.repo('Branch').save({code:'R19',name:'فرع المراجعة'});d=await f.repo('Department').save({branchId:b.id,name:'قسم المراجعة'});await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE')},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function person(extra={}){n++;return f.repo('Employee').save({employeeCode:`R19-${n}`,fullName:'أحمد علي محمد',branchId:b.id,departmentId:d.id,joinDate:'2020-01-01',basicSalary:5000,payMethod:'cash',status:'active',isActive:true,nationalId:`ID-${n}`,passportNo:`PASS-${n}`,fingerprintCode:`R19-FP-${n}`,...extra})}
// Queue both actual API requests behind a real SQL finance lock. No validation or database stubs.
async function queuedPair(e,first,second){
  const runner=f.ds.createQueryRunner(),pending=[];const observed=[]
  try{
    await runner.connect();await runner.startTransaction()
    const lock=await runner.query("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; SELECT @r AS result",[`hr:employee-finance:${e.id}`])
    assert.ok(lock[0].result>=0)
    for(const body of [first,second]){
      pending.push(f.request('PATCH',`/employees/${e.id}`,body))
      let waiters=0
      for(let i=0;i<150;i++){
        const rows=await runner.query("SELECT COUNT(*) AS n FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID() AND resource_type='APPLICATION' AND request_status='WAIT'")
        waiters=Number(rows[0].n);if(waiters>=pending.length)break
        await new Promise(resolve=>setTimeout(resolve,25))
      }
      assert.ok(waiters>=pending.length,'Both preflights must finish before the SQL blocker is released');observed.push(waiters)
    }
    await runner.commitTransaction()
    return {responses:await Promise.all(pending),observed}
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await Promise.allSettled(pending);await runner.release()}
}

test('CR19 identity pair remains valid in both serialization orders and rejected side fields roll back',async t=>{
  const evidence=[]
  for(const fields of [['nationalId','passportNo'],['passportNo','nationalId']]){
    const e=await person(),{responses,observed}=await queuedPair(e,{[fields[0]]:null},{[fields[1]]:null,phone:'0559876543'})
    assert.deepEqual(responses.map(r=>r.status),[200,400],JSON.stringify(responses))
    const fresh=await f.repo('Employee').findOneByOrFail({id:e.id})
    assert.equal(fresh[fields[0]],null);assert.equal(fresh[fields[1]],e[fields[1]]);assert.equal(fresh.phone,null)
    evidence.push({order:fields,statuses:responses.map(r=>r.status),observed,preservedField:fields[1],rejectedPhoneRolledBack:true})
  }
  t.diagnostic(JSON.stringify({case:'both-clear-orders',evidence}))
})

test('CR19 stale legacy invalid identifier cannot overwrite a concurrent valid correction',async t=>{
  const evidence=[]
  for(const field of ['nationalId','passportNo']){
    const e=await person({[field]:'AB/123'}),{responses,observed}=await queuedPair(e,{[field]:`VALID-${n}`},{[field]:' ab/١٢٣ ',phone:'0559876543'})
    assert.deepEqual(responses.map(r=>r.status),[200,400],JSON.stringify(responses))
    const fresh=await f.repo('Employee').findOneByOrFail({id:e.id})
    assert.equal(fresh[field],`VALID-${n}`);assert.equal(fresh.phone,null)
    evidence.push({field,statuses:responses.map(r=>r.status),observed,validCorrectionPreserved:true})
  }
  t.diagnostic(JSON.stringify({case:'legacy-change-after-real-lock',evidence}))
})

test('CR19 atomic identity replacement is allowed while clearing the remaining identity is refused',async t=>{
  const e=await person({passportNo:null})
  const swap=await f.request('PATCH',`/employees/${e.id}`,{nationalId:null,passportNo:' ab-١٢٣ '});assert.equal(swap.status,200,JSON.stringify(swap.body))
  const clear=await f.request('PATCH',`/employees/${e.id}`,{passportNo:'   '});assert.equal(clear.status,400)
  const fresh=await f.repo('Employee').findOneByOrFail({id:e.id});assert.equal(fresh.nationalId,null);assert.equal(fresh.passportNo,'AB-123')
  t.diagnostic(JSON.stringify({case:'atomic-replacement',statuses:[swap.status,clear.status],savedPassport:fresh.passportNo}))
})

test('CR19 legacy files missing both identities still accept phone email and fingerprint edits',async t=>{
  const e=await person({nationalId:null,passportNo:null})
  const results=[]
  for(const patch of [{phone:'0551234455'},{email:'legacy@r19.invalid'},{fingerprintCode:'R19-LEGACY-FP'}]){
    const r=await f.request('PATCH',`/employees/${e.id}`,patch);assert.equal(r.status,200,JSON.stringify(r.body));results.push(r.status)
  }
  const fresh=await f.repo('Employee').findOneByOrFail({id:e.id});assert.equal(fresh.nationalId,null);assert.equal(fresh.passportNo,null)
  assert.equal(fresh.phone,'0551234455');assert.equal(fresh.email,'legacy@r19.invalid');assert.equal(fresh.fingerprintCode,'R19-LEGACY-FP')
  t.diagnostic(JSON.stringify({case:'legacy-empty-identities',statuses:results}))
})
