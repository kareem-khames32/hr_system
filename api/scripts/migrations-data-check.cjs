'use strict'
const { fs, pool, reviewGuard, checksum, identifier, artifactPath, schemaSnapshot } = require('./migrations-lib.cjs')
const { maskedIban } = require('../src/employees/employee-change-log')
const pairs = { transfers: [['fromTeam','fromTeamId'],['toTeam','toTeamId']],
  custody_assignments: [['assignedBy','assignedByEmployeeId']], offboarding_cases: [['openedBy','openedByUserId'],['settlementApprovedBy','settlementApprovedByUserId']],
  clearance_items: [['doneBy','doneByUserId']], onboarding_tasks: [['doneBy','doneByUserId']] }
async function main() {
  const mode = process.argv[2]
  if (!['before','after'].includes(mode)) throw new Error('Use before or after')
  const manifest = JSON.parse(fs.readFileSync(artifactPath('review-database.json'),'utf8'))
  reviewGuard(manifest.database)
  const stateFile=artifactPath('review-server-state.json')
  const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null
  if (state?.database===manifest.database && state.running) throw new Error('Stop review writers before checking migration data invariants')
  const p=await pool(manifest.database)
  try {
    const schema=await schemaSnapshot(p)
    const hashes={}
    const history=(await p.request().query('SELECT * FROM dbo.employee_status_history ORDER BY id')).recordset
    hashes.historyIdentityDates=checksum(JSON.stringify(history.map(r=>[r.id,r.employeeId,r.requestId,r.changedAt])))
    hashes.historyReasons=checksum(JSON.stringify(history.map(r=>{
      let reason=r.reason
      if(mode==='before' && /^iban:/i.test(r.newStatus||'')) for(const raw of [r.oldStatus,r.newStatus]){
        const value=raw?.replace(/^iban:/i,'').trim()
        if(value) reason=reason?.split(value).join(maskedIban(value) ?? value)
      }
      return [r.id,reason]
    })))
    hashes.historyBankValues=checksum(JSON.stringify(history.filter(r=>r.fieldName==='iban'||/^iban:/i.test(r.newStatus||'')).map(r=>{
      if(!r.changeType) return [r.id,...[r.oldStatus,r.newStatus].map(v=>{
        const value=v?.replace(/^iban:/i,'').trim()
        return value==='—'?value:maskedIban(value)
      })]
      return [r.id,r.oldValue==null?null:JSON.parse(r.oldValue),r.newValue==null?null:JSON.parse(r.newValue)]
    })))
    const workTypes=(await p.request().query('SELECT id,workType FROM dbo.employees ORDER BY id')).recordset
    hashes.workTypes=checksum(JSON.stringify(workTypes.map(r=>[r.id,mode==='before'?(r.workType==='fulltime'?'full_time':r.workType==='parttime'?'part_time':r.workType):r.workType])))
    for(const [table,columns] of Object.entries(pairs)){
      const selection=columns.map(([old,canonical])=>{
        const actual=schema.columns.some(c=>c.table===table&&c.column===canonical)?canonical:old
        return identifier(actual)+' AS '+identifier(canonical)
      })
      hashes[table+'IdentityValues']=checksum(JSON.stringify((await p.request().query(`SELECT id,${selection.join(',')} FROM ${identifier(table)} ORDER BY id`)).recordset))
    }
    for(const table of ['requests','request_types','approval_chains','approval_steps','request_approvals']){
      const columns=schema.columns.filter(c=>c.table===table&&!(['typeCode','definitionCode','payload'].includes(c.column)&&table==='requests')).map(c=>c.column)
      hashes[table+'PreservedFields']=checksum(JSON.stringify((await p.request().query(`SELECT ${columns.map(identifier).join(',')} FROM ${identifier(table)} ORDER BY id`)).recordset))
    }
    const output={database:manifest.database,mode,checkedAt:new Date().toISOString(),hashes,note:'SHA-256 only: no individual personal or bank values are stored in this artifact.'}
    if(mode==='before') fs.writeFileSync(artifactPath('data-preservation-baseline.json'),JSON.stringify(output,null,2))
    else{
      const baseline=JSON.parse(fs.readFileSync(artifactPath('data-preservation-baseline.json'),'utf8'))
      if(baseline.database!==manifest.database) throw new Error('Baseline belongs to another database')
      output.mismatches=Object.keys(hashes).filter(key=>hashes[key]!==baseline.hashes[key])
      output.passed=output.mismatches.length===0
      fs.writeFileSync(artifactPath('data-preservation-result.json'),JSON.stringify(output,null,2))
      if(!output.passed) throw new Error('Data invariant mismatch: '+output.mismatches.join(', '))
    }
    console.log(JSON.stringify({database:manifest.database,mode,invariants:Object.keys(hashes).length,passed:output.passed??true}))
  } finally {await p.close()}
}
main().catch(err=>{console.error(err.name+': '+err.message);process.exitCode=1})
