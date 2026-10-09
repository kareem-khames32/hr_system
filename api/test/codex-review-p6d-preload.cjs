'use strict'
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net')
global.__p6dNative={listen:net.Server.prototype.listen,connect:net.Socket.prototype.connect,fetch:global.fetch}
const temporary=path.join(__dirname,'codex-review-p6d-tmp');fs.mkdirSync(temporary,{recursive:true});os.tmpdir=()=>temporary
delete process.env.AI_PROVIDER;delete process.env.AI_API_KEY
