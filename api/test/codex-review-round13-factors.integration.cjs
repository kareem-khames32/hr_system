'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {buildEosPolicy,EOS_DEFAULTS,eosReasonKnown,computeEos}=require('../src/offboarding/eos')
const {terminationReasonLabel}=require('../../src/lib/termination-reasons')
test('CR13 inherited keys and invalid owned custom factors are rejected while exact zero and one remain valid',()=>{
  const invalid=[NaN,Infinity,-Infinity,-0.01,1.01,'0.5',null,undefined]
  let checked=0
  for(const factor of invalid){const p={...buildEosPolicy(EOS_DEFAULTS),custom:{custom_1:{factor,label:'test',reasonLabel:'review'}}};assert.equal(eosReasonKnown('custom_1',p),false);assert.throws(()=>computeEos(12000,5,'custom_1',p));checked++}
  const inherited={...buildEosPolicy(EOS_DEFAULTS),custom:Object.create({custom_inherited:{factor:0.5,label:'1/2',reasonLabel:'not owned'}})}
  for(const key of ['constructor','__proto__','toString','hasOwnProperty','custom_inherited']){assert.equal(eosReasonKnown(key,inherited),false);assert.throws(()=>computeEos(12000,5,key,inherited));checked++}
  for(const [factor,expected]of [[0,0],[1,30000],[1/3,10000]]){
    const p={...buildEosPolicy(EOS_DEFAULTS),custom:{custom_1:{factor,label:String(factor),reasonLabel:'review'}}}
    assert.equal(eosReasonKnown('custom_1',p),true);assert.equal(computeEos(12000,5,'custom_1',p).amount,expected)
  }
  const ownConstructor={...buildEosPolicy(EOS_DEFAULTS),custom:{constructor:{factor:0.5,label:'1/2',reasonLabel:'configured own key'}}}
  assert.equal(computeEos(12000,5,'constructor',ownConstructor).amount,15000,'Actual owned valid entries are distinct from inherited ones')
  console.log('CR13_EVIDENCE '+JSON.stringify({case:'factor-validation',invalidCases:checked,validZeroOneAndThird:[0,30000,10000],ownedConstructor:15000}))
})
test('CR13 frontend returns text for inherited names and preserves builtin and custom labels',()=>{
  for(const key of ['constructor','__proto__','toString','hasOwnProperty']){assert.equal(terminationReasonLabel(key),key);assert.equal(terminationReasonLabel(key,' Custom label '),'Custom label')}
  assert.equal(terminationReasonLabel('resignation','wrong replacement'),'استقالة موثقة')
  assert.equal(terminationReasonLabel('custom_1','  سبب مخصص  '),'سبب مخصص');assert.equal(terminationReasonLabel(null),'—')
})
