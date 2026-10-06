'use strict'
// Second application process: no listener, same owned disposable DB, fresh schema cache.
const assert=require('node:assert/strict')
async function main(){
 assert.match(process.env.DB_DATABASE,/^hr_codex_p2n_[a-z_]+_test_[a-f0-9]{16}$/)
 process.env.DB_SYNCHRONIZE='false';process.env.NODE_ENV='test';process.env.QUEUE_WORKER='off'
 const app=await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule,{logger:false})
 try{
  const mail=app.get(require('../src/auth/mail.service').MailService);mail.isConfigured=()=>false;mail.send=async()=>{throw Error('No mail in worker')}
  await app.init();const ds=app.get(require('../node_modules/typeorm').DataSource);assert.equal(ds.options.database,process.env.DB_DATABASE)
  const {actor,inputs}=JSON.parse(process.argv[2]),service=app.get(require('../src/hr-documents/hr-documents.service').HrDocumentsService)
  const issued=[];for(const input of inputs)issued.push(await service.issue(actor,input))
  console.log('P2N_SECOND_PROCESS '+JSON.stringify(issued))
 }finally{await app.close()}
}
main().catch(e=>{console.error(e.name+': '+e.message);process.exitCode=1})
