'use strict'
// Execute the shipped TSX event handlers with a deterministic hook host and fake API.
// This checks state transitions, not a browser layout, hydration, or real authentication server.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const ts=require('../node_modules/typescript')
class ApiError extends Error{constructor(status,message,details){super(message);this.status=status;this.details=details}}
function page(relative,options={}){
  const state=[],effects=[],deps=[],calls=[],timers=[];let cursor=0,tree
  const location={href:'',search:'',pathname:'/login'}
  const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}]},
    useRef(initial){const i=cursor++;return state[i]??(state[i]={current:initial})},useCallback:fn=>fn,useMemo:fn=>fn(),
    useEffect(fn,values){const i=cursor++;if(!deps[i]||!values||values.some((v,j)=>v!==deps[i][j])){deps[i]=values;effects.push(fn)}}}
  const session={accessToken:'review-session',user:{id:1,displayName:'Review user',mustChangePassword:false}}
  const api={ApiError,CHANGE_PASSWORD_PATH:'/login/change-password',saveSession:(...args)=>calls.push(['save',...args]),clearSession:()=>calls.push(['clear']),
    getToken:()=> 'review-old-session',getCurrentUser:()=>session.user,isSessionRemembered:()=>true,
    fetchLoginOptions:async()=>({domainLoginEnabled:true}),isTwoFactorChallenge:o=>o?.twoFactorRequired===true,
    login:async(...args)=>{calls.push(['login',...args]);return session},domainLogin:async(...args)=>{calls.push(['domain',...args]);return session},
    verifyLoginCode:async(...args)=>{calls.push(['verify',...args]);return session},resendLoginCode:async()=>({sentTo:'test@codex.invalid',resendAfterSeconds:2}),
    changeMyPassword:async(...args)=>{calls.push(['change',...args]);return session},...options}
  const jsx=(type,props)=>({type,props:props||{}}),exports={}
  const source=fs.readFileSync(path.resolve(__dirname,'../../src/app/login',relative),'utf8')
  const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const load=name=>{
    if(name==='react')return react
    if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'fragment'}
    if(name==='@/lib/api')return api
    if(name==='@/lib/branding')return{useBranding:()=>({ready:true,companyName:'CR10 Company',logoUrl:null,initials:'CC'})}
    if(name==='clsx')return{default:(...v)=>v.flat().filter(Boolean).join(' ')}
    if(name==='lucide-react'||name.startsWith('@/components/branding/'))return new Proxy({},{get:(_,key)=>`component-${String(key)}`})
    throw Error('Unexpected page dependency: '+name)
  }
  vm.runInNewContext(compiled,{exports,require:load,window:{location},URLSearchParams,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{}},{filename:relative})
  function render(){cursor=0;tree=exports.default();while(effects.length)effects.shift()();return tree}
  function nodes(v,out=[]){if(Array.isArray(v)){v.forEach(n=>nodes(n,out));return out}if(v&&typeof v==='object'){out.push(v);nodes(v.props?.children,out)}return out}
  const find=(type,predicate=()=>true)=>{const n=nodes(tree).find(n=>n.type===type&&predicate(n.props));assert.ok(n,`Missing ${type}`);return n.props}
  const text=v=>v==null?'':Array.isArray(v)?v.map(text).join(''):typeof v==='object'?text(v.props?.children):String(v)
  const input=(id,value)=>{find('input',p=>p.id===id).onChange({target:{value}});render()}
  const submit=async()=>{await find('form').onSubmit({preventDefault(){}});render()}
  const flush=async()=>{await Promise.resolve();await Promise.resolve();render()}
  render();return{api,calls,location,render,find,input,submit,flush,text:()=>text(tree),button:label=>find('button',p=>text(p.children).includes(label)),tick:()=>{timers.splice(0).forEach(fn=>fn());render()}}
}
test('CR10 login handlers preserve password, remembered session and forced password-change redirect',async()=>{
  const p=page('page.tsx',{login:async()=>({accessToken:'review-session',user:{mustChangePassword:true}})})
  await p.flush();p.input('login-email','user@codex.invalid');p.input('login-password','synthetic-password')
  p.find('input',x=>x.type==='checkbox').onChange({target:{checked:true}});p.render();await p.submit()
  const saved=p.calls.find(x=>x[0]==='save');assert.ok(saved);assert.equal(saved[3],true);assert.equal(p.location.href,'/login/change-password')
})
test('CR10 login handlers preserve domain switching and clear the old password',async()=>{
  const p=page('page.tsx');await p.flush();p.input('login-password','discard-me')
  await p.button('بحساب الشركة').onClick();p.render();assert.equal(p.find('input',x=>x.id==='login-password').value,'')
  p.input('login-username','review-user');p.input('login-password','synthetic-password');await p.submit()
  assert.deepEqual(p.calls.find(x=>x[0]==='domain').slice(1),['review-user','synthetic-password']);assert.equal(p.location.href,'/')
})
test('CR10 two-factor handlers withhold the session, filter the code, recover from a wrong code and allow resend then verification',async()=>{
  let attempts=0,resends=0
  const p=page('page.tsx',{login:async()=>({twoFactorRequired:true,challengeToken:'review-challenge',codeLength:6,resendAfterSeconds:1,sentTo:'test@codex.invalid',expiresInSeconds:300}),
    verifyLoginCode:async(token,code)=>{assert.equal(token,'review-challenge');assert.equal(code,'123456');if(++attempts===1)throw new ApiError(400,'رمز خاطئ');return{accessToken:'review-final',user:{mustChangePassword:false}}},
    resendLoginCode:async()=>{resends++;return{sentTo:'test@codex.invalid',resendAfterSeconds:1}}})
  await p.flush();p.input('login-email','test@codex.invalid');p.input('login-password','synthetic-password');await p.submit()
  assert.equal(p.calls.filter(x=>x[0]==='save').length,0);p.input('login-code','1x2345678');assert.equal(p.find('input',x=>x.id==='login-code').value,'123456')
  await p.submit();assert.equal(p.find('input',x=>x.id==='login-code').value,'');assert.ok(p.text().includes('رمز خاطئ'));assert.equal(p.calls.filter(x=>x[0]==='save').length,0)
  p.tick();await p.button('ابعت رمز جديد').onClick();p.render();assert.equal(resends,1)
  p.input('login-code','123456');await p.submit();assert.equal(p.calls.filter(x=>x[0]==='save').length,1);assert.equal(p.location.href,'/')
})
test('CR10 change-password handlers validate confirmation and retain session persistence after success',async()=>{
  const p=page('change-password/page.tsx',{getCurrentUser:()=>({displayName:'Review',mustChangePassword:true})});await p.flush()
  p.input('cp-current','synthetic-old');p.input('cp-new','synthetic-new');p.input('cp-confirm','wrong')
  assert.equal(p.find('button',x=>x.type==='submit').disabled,true);await p.submit();assert.equal(p.calls.length,0)
  p.input('cp-confirm','synthetic-new');await p.submit()
  assert.deepEqual(p.calls.map(x=>x[0]),['change','clear','save']);assert.equal(p.calls[2][3],true);assert.equal(p.location.href,'/')
})
test('CR10 expired session during password change clears it and returns to expired-login state',async()=>{
  const p=page('change-password/page.tsx',{changeMyPassword:async()=>{throw new ApiError(401,'انتهت الجلسة')}});await p.flush()
  p.input('cp-current','synthetic-old');p.input('cp-new','synthetic-new');p.input('cp-confirm','synthetic-new');await p.submit()
  assert.deepEqual(p.calls,[['clear']]);assert.equal(p.location.href,'/login?expired=1')
})
