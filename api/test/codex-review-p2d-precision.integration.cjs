'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
test('P2C D independent SQL insert/update returning: decimals, dates, Unicode MAX, bits, identity and transaction rollback',async t=>{
 const f=await require('./codex-review-p2d-fixture.cjs')('p2d_precision')
 let ds
 try{
  const {DataSource,EntitySchema}=require('../node_modules/typeorm')
  const schema=new EntitySchema({name:'PrecisionProbe',tableName:'codex_precision_probe',columns:{
   id:{type:Number,primary:true,generated:true},money:{type:'decimal',precision:18,scale:2,default:0},ratio:{type:'numeric',precision:18,scale:6,default:0},
   whole:{type:'decimal',precision:18,scale:0,default:0},flag:{type:'bit',default:false},label:{type:'nvarchar',length:'MAX',default:''},
   date:{type:'datetime2',precision:3,default:()=>"'2026-01-01'"},stamp:{type:'datetime2',precision:3,createDate:true},revision:{type:Number,version:true},guid:{type:'uniqueidentifier',default:()=> 'NEWID()'}
  }})
  ds=new DataSource({...f.ds.options,entities:[schema],synchronize:true});await ds.initialize()
  const repo=ds.getRepository('PrecisionProbe'),decl=ds.driver.buildTableVariableDeclaration('@O',repo.metadata.getInsertionReturningColumns())
  assert.match(decl,/decimal\(18,2\)/);assert.match(decl,/numeric\(18,6\)/);assert.match(decl,/datetime2\(3\)/);assert.match(decl,/nvarchar\(MAX\)/i)
  const cases=[{money:123.45,ratio:0.123456,whole:999,flag:true,label:'مبلغ تجريبي '.repeat(600),date:new Date('2026-07-01T12:34:56.789Z')},{money:-99.99,ratio:-0.000001,whole:-4,flag:false,label:'سالب',date:new Date('2026-07-02T12:34:56.123Z')},{money:0.01,ratio:0,whole:0,flag:true,label:'قرش',date:new Date('2026-07-03T12:34:56.456Z')}]
  const rows=await repo.save(cases.map(c=>repo.create(c)))
  const compare=(a,b)=>{for(const k of ['money','ratio','whole','flag','label'])assert.deepEqual(a[k],b[k],k);assert.equal(a.date.toISOString(),b.date.toISOString())}
  for(let i=0;i<rows.length;i++){compare(rows[i],cases[i]);assert.ok(rows[i].id);assert.match(rows[i].guid,/^[0-9a-f-]{36}$/i);assert.ok(rows[i].stamp instanceof Date)}
  await repo.save(rows);for(let i=0;i<rows.length;i++)compare(await repo.findOneByOrFail({id:rows[i].id}),cases[i])
  rows[0].label='تغيير نص فقط';await repo.save(rows[0]);assert.equal(rows[0].money,123.45);assert.equal(rows[0].revision,2)
  const updated=await repo.createQueryBuilder().update().set({money:45.67,ratio:0.654321,flag:false}).where('id = :id',{id:rows[0].id}).output(['id','money','ratio','flag','date','label','stamp','guid','revision']).execute()
  assert.equal(Number(updated.raw[0].money),45.67);assert.equal(Number(updated.raw[0].ratio),0.654321)
  const before=await repo.find({order:{id:'ASC'}})
  await assert.rejects(ds.transaction(async em=>{await em.getRepository('PrecisionProbe').save({id:rows[0].id,money:777.77});throw new Error('intentional rollback')}),/intentional rollback/)
  assert.deepEqual(await repo.find({order:{id:'ASC'}}),before)
  const {patchMssqlOutputTablePrecision}=require('../src/common/typeorm-mssql-output-precision'),fn=ds.driver.buildTableVariableDeclaration;patchMssqlOutputTablePrecision();assert.equal(ds.driver.buildTableVariableDeclaration,fn)
  t.diagnostic(JSON.stringify({case:'precision-types',bulk:3,secondSaveExact:true,updateOutput:updated.raw[0].money,rollback:true,patchIdempotent:true}))
 }finally{if(ds?.isInitialized)await ds.destroy();await f.close()}
},{timeout:180000})
