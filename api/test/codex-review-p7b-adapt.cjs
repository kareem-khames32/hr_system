'use strict'
// Reproducible adaptation of COPIED review evidence only; no tracked file is edited.
const fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,`codex-review-p7b-${n}.integration.cjs`),'utf8').replace(/\r\n/g,'\n');
const write=(n,s)=>fs.writeFileSync(path.join(__dirname,`codex-review-p7b-${n}.integration.cjs`),s);
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('missing adaptation '+a.slice(0,90));return s.replace(a,b)};
let s=read('audience');
s=replace(s,"assert.ok(after.includes(title), 'Defect: out-of-branch team still delivers its old branch audience');","assert.equal(after.includes(title), false);");
s=replace(s,"assert.ok(people.includes(E.retail1.fullName));","assert.equal(people.includes(E.retail1.fullName), false);");
s=s.replace('delivered: true','delivered: false');
const a=s.indexOf("test('P7B-A02:"),b=s.indexOf('\nconst boardTitles',a);
s=s.slice(0,a)+`test('P7B-A02: empty new units audience is rejected and does not alter the module', async t => {
  const before = await repo('SystemModule').findOneBy({ key: 'surveys' });
  const response = await call(U.admin, 'PUT', '/modules/surveys', { enabled: true, audience: { mode: 'all', ids: [], where: { mode: 'units', ids: [], branchId: B.a.id } } });
  expect(response, 400);
  const after = await repo('SystemModule').findOneBy({ key: 'surveys' });
  assert.equal(after.audience, before.audience);
  t.diagnostic(JSON.stringify({ case: 'P7B-A02', status: response.status, unchanged: true }));
});
test('P7B-A03: group creation serializes before transfer, then rejects the moved employee', async t => {
  const tasks = app.get(require('../src/tasks/tasks.service').TasksService), original = tasks.assignment;
  let transfer, completed = false, hit = false;
  tasks.assignment = async function(user, input, em) {
    const judged = await original.call(this, user, input, em);
    if (input.assigneeEmployeeId === E.retail1.id && !hit) {
      hit = true;
      transfer = repo('Employee').update({ id: E.retail1.id }, { branchId: B.b.id, departmentId: D.other.id, teamId: null }).then(() => { completed = true; });
      await new Promise(r=>setTimeout(r,200)); assert.equal(completed,false,'transfer must wait for employee lock');
    }
    return judged;
  };
  try {
    const input={ title: 'P7B serialized task', audience: { mode: 'employees', ids: [String(E.retail1.id)] } };
    const body = expect(await call(U.tasksA,'POST','/tasks/group',input),201);
    assert.equal(hit,true); assert.equal(body.created,1); await transfer;
    const saved=await repo('Task').findOneBy({id:body.taskIds[0]});
    assert.equal(saved.branchId,B.a.id); assert.equal(completed,true);
    const retry=await call(U.tasksA,'POST','/tasks/group',input); assert.equal(retry.status,400);
    t.diagnostic(JSON.stringify({case:'P7B-A03',transferWaited:true,createdBeforeTransfer:1,afterTransfer:retry.status}));
  } finally { tasks.assignment=original; await transfer; await repo('Employee').update({id:E.retail1.id},{branchId:B.a.id,departmentId:D.retail.id,teamId:T.shop.id}); }
});
test('P7B-A04 defect: cached module subject retains a moved team until invalidation', async t => {
  const mod=app.get(require('../src/modules-registry/modules.service').ModulesService);
  expect(await call(U.admin,'PUT','/modules/surveys',{enabled:true,audience:teams(B.a,T.shop)}),200);
  expect(await call(U.retail1,'GET','/surveys/mine'),200);
  try {
    expect(await call(U.admin,'PATCH','/org/teams/'+T.shop.id,{departmentId:D.other.id}),200);
    assert.equal(await mod.allowedForIn(ds.manager,'surveys',claims(U.retail1)),false);
    const cached=await call(U.retail1,'GET','/surveys/mine'); expect(cached,200);
    mod.invalidate(); const fresh=await call(U.retail1,'GET','/surveys/mine'); expect(fresh,404);
    t.diagnostic(JSON.stringify({case:'P7B-A04',movedByHttp:true,transactionReader:false,cached:cached.status,afterInvalidation:fresh.status}));
  } finally { await repo('Team').update({id:T.shop.id},{departmentId:D.retail.id}); expect(await call(U.admin,'PUT','/modules/surveys',{enabled:true,audience:null}),200); }
});
`+s.slice(b);write('audience',s);
s=read('overtime');s=replace(s,'assert.ok(externalReads > 0);','assert.equal(externalReads, 0);');
s=replace(s,"assert.ok(responses.some(row => row.status === 500), 'Defect: a transaction-bound read would succeed with the same held pool');","assert.deepEqual(responses.map(row => row.status), Array(10).fill(200));");
s=replace(s,"assert.ok(rows.find(row => row.id === made.id).audienceText.includes('P7B private team in B'));","assert.equal(rows.find(row => row.id === made.id).audienceText.includes('P7B private team in B'), false);");s=s.replace('foreignTeamNameDisclosed: true','foreignTeamNameDisclosed: false');write('overtime',s);
s=read('dashboard');s=replace(s,"assert.equal(leaked?.name, 'P7B foreign branch private name');","assert.equal(leaked, undefined); assert.equal(JSON.stringify(body).includes('P7B foreign branch private name'),false);");s=s.replace('foreignEmployeeNameDisclosed: true','foreignEmployeeNameDisclosed: false');
s=replace(s,'assert.ok(JSON.stringify(body).includes(E.j3.fullName));','assert.equal(JSON.stringify(body).includes(E.j3.fullName),false);');s=replace(s,'assert.ok(JSON.stringify(body).includes(E.j3.phone));','assert.equal(JSON.stringify(body).includes(E.j3.phone),false);');s=s.replace('cachedLeak: true','cachedLeak: false');
s=replace(s,'assert.equal(after.pending, before.pending + 1);','assert.equal(after.pending, before.pending);');s=s.replace('secretDefinitionInDepartmentCount: true','secretDefinitionInDepartmentCount: false');write('dashboard',s);
s=read('channels');s=replace(s,'assert.ok(sent > 0);','assert.equal(sent, 0);');s=replace(s,"assert.equal((await deliveriesOf('request', req.id, 'EMAIL'))[0]?.status, 'SENT');","assert.equal((await deliveriesOf('request', req.id, 'EMAIL'))[0]?.status, 'SKIPPED');");s=replace(s,'assert.ok(mailbox.sent.some(message => message.text.includes(types.general.nameAr)));','assert.equal(mailbox.sent.length,0);');s=s.replace('emailSent: true','emailSent: false');
s=replace(s,'let hit = false;','let hit = false, transfer, completed = false;');
s=replace(s,"await repo('Employee').update({ id: emps.requester.id }, { branchId: org.branchB.id });","transfer = repo('Employee').update({ id: emps.requester.id }, { branchId: org.branchB.id }).then(()=>{completed=true;});\n      await new Promise(r=>setTimeout(r,200)); assert.equal(completed,false,'transfer waits for contact write');");
s=replace(s,'assert.equal(hit, true);','assert.equal(hit, true); await transfer;');
s=replace(s,"t.diagnostic(JSON.stringify({ case: 'P7B-N02', response: response.status, savedAfterTransfer: true }));","const retry=await request(users.hrA,'PUT',`/notification-channels/contacts/${emps.requester.id}`,{whatsappNumber:'+966500008888'});\n    expectStatus(retry,404); assert.equal((await repo('EmployeeWhatsappNumber').findOneBy({employeeId:emps.requester.id})).number,'966500009999');\n    t.diagnostic(JSON.stringify({case:'P7B-N02',response:response.status,transferWaited:true,afterTransfer:retry.status}));");
s=replace(s,'} finally { Repository.prototype.findOne = original; await repo(', '} finally { Repository.prototype.findOne = original; await transfer; await repo(');write('channels',s);
