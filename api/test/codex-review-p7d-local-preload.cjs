'use strict'
require('./codex-review-p7d-lfsql-preload.cjs')
const assert=require('node:assert/strict'),net=require('node:net'),native=global.__p7dNative,owned=new Set()
assert.ok(native)
net.Server.prototype.listen=function(...args){const opt=typeof args[0]==='object'?args[0]:{port:args[0],host:args[1]};assert.equal(Number(opt.port),0,'Only ephemeral test receiver ports');assert.equal(opt.host,'127.0.0.1');this.once('listening',()=>owned.add(this.address().port));return native.listen.apply(this,args)}
net.Socket.prototype.connect=function(...args){let o=Array.isArray(args[0])?args[0][0]:args[0];if(typeof o==='number')o={port:o,host:args[1]};assert.ok(o&&typeof o==='object');const port=Number(o.port),host=o.host||'localhost';assert.ok(port===1433&&['localhost','127.0.0.1','::1'].includes(host)||owned.has(port)&&host==='127.0.0.1','P7D network must be local SQL or owned test receiver');return native.connect.apply(this,args)}
const inProcess=global.fetch
global.fetch=async(url,options={})=>{const u=new URL(url);if(u.origin==='http://127.0.0.1:1')return inProcess(url,options);assert.equal(u.hostname,'127.0.0.1','P7D external HTTP forbidden');assert.ok(owned.has(Number(u.port)),'P7D only owned receiver');return native.fetch(url,options)}
const {NestFactory}=require('../node_modules/@nestjs/core'),original=NestFactory.create.bind(NestFactory)
NestFactory.create=async(...args)=>{delete process.env.AI_PROVIDER;delete process.env.AI_API_KEY;const app=await original(...args);app.get(require('../src/ai/ai.service').AiService).useProvider(null);return app}
global.__p7dOwnedPorts=owned
