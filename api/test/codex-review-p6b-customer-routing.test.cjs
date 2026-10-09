'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('P6B-I02: upgrade-all checks the named database and passes it explicitly to the migrator',()=>{
 const area=path.resolve(__dirname,'codex-review-p6b-tmp');fs.mkdirSync(area,{recursive:true});const root=fs.mkdtempSync(path.join(area,'routing-'));
 const api=path.join(root,'instance','api');fs.mkdirSync(path.join(api,'scripts'),{recursive:true});
 fs.writeFileSync(path.join(api,'.env'),'DB_DATABASE=hr_c_actual_other\n');
 // A fake migrator writes only a local trace; no database or network is opened.
 fs.writeFileSync(path.join(api,'scripts','db-migrate.cjs'),"const fs=require('node:fs');const db=fs.readFileSync('.env','utf8').trim().split('=')[1];const row={database:db,args:process.argv.slice(2)};fs.appendFileSync('trace.jsonl',JSON.stringify(row)+'\\n');console.log(JSON.stringify(row));");
 const registry=path.join(root,'registry.json');fs.writeFileSync(registry,JSON.stringify([{database:'hr_c_requested_review',apiRoot:api}]));
 try {
 const customer=require('../scripts/customer.cjs');let result=customer.upgradeAll({registry});
 assert.equal(result.results[0].ok,false);assert.equal(fs.existsSync(path.join(api,'trace.jsonl')),false);
 fs.writeFileSync(path.join(api,'.env'),'DB_DATABASE=hr_c_requested_review\n');result=customer.upgradeAll({registry});
 const trace=fs.readFileSync(path.join(api,'trace.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(result.results[0].ok,true);assert.deepEqual(trace.map(r=>r.args),[['plan','--database','hr_c_requested_review'],['apply','--company','--database','hr_c_requested_review']]);
 assert.ok(trace.every(r=>r.database==='hr_c_requested_review'));
 const evidence={mismatchedEnvironmentRejected:true,validCustomerAccepted:true,explicitDatabaseArguments:trace.map(r=>r.args),realDatabaseAccess:false};
 fs.writeFileSync(path.join(__dirname,'codex-review-p6b-customer-routing-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 }finally{assert.ok(root.startsWith(area+path.sep));fs.rmSync(root,{recursive:true,force:true})}
});
