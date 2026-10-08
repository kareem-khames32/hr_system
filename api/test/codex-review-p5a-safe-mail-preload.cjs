'use strict'
require('./codex-review-p5a-http-preload.cjs')
const {NestFactory}=require('../node_modules/@nestjs/core'),{MailService}=require('../src/auth/mail.service')
const original=NestFactory.create.bind(NestFactory)
NestFactory.create=async(...args)=>{const app=await original(...args),mail=app.get(MailService);mail.isConfigured=()=>false;mail.send=async()=>{throw Error('P5A unexpected email attempt; no SMTP transport')};app.get(require('../src/auth/directory.service').DirectoryService).client=()=>{throw Error('P5A real LDAP prohibited')};return app}
