'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('P6A-I02: upgrade-all applies to an apiRoot environment without checking the named registry database',()=>{
 const area=path.resolve(__dirname,'codex-review-p6a-tmp');fs.mkdirSync(area,{recursive:true});const root=fs.mkdtempSync(path.join(area,'routing-'));
 const api=path.join(root,'instance','api');fs.mkdirSync(path.join(api,'scripts'),{recursive:true});
 fs.writeFileSync(path.join(api,'.env'),'DB_DATABASE=hr_c_actual_other\n');
 // A fake migrator writes only a local trace; no database or network is opened.
 fs.writeFileSync(path.join(api,'scripts','db-migrate.cjs'),"const fs=require('node:fs');const db=fs.readFileSync('.env','utf8').trim().split('=')[1];const row={database:db,args:process.argv.slice(2)};fs.appendFileSync('trace.jsonl',JSON.stringify(row)+'\\n');console.log(JSON.stringify(row));");
 const registry=path.join(root,'registry.json');fs.writeFileSync(registry,JSON.stringify([{database:'hr_c_requested_review',apiRoot:api}]));
 try {const result=require('../scripts/customer.cjs').upgradeAll({registry});const trace=fs.readFileSync(path.join(api,'trace.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(result.results[0].ok,true);assert.equal(result.results[0].database,'hr_c_requested_review');assert.equal(trace[1].database,'hr_c_actual_other');assert.deepEqual(trace[1].args,['apply','--company']);
 const evidence={reportedDatabase:result.results[0].database,actualMigratorDatabase:trace[1].database,applyArgs:trace[1].args,realDatabaseAccess:false}; fs.writeFileSync(path.join(__dirname,'codex-review-p6a-customer-routing-result.cjs'),'module.exports = '+JSON.stringify(evidence,null,2)+'\n'); console.log('P6A_ROUTING '+JSON.stringify(evidence));
 }finally{assert.ok(root.startsWith(area+path.sep));fs.rmSync(root,{recursive:true,force:true})}
});
