'use strict'
require('./codex-review-p7a-http-preload.cjs')
const {NestFactory}=require('../node_modules/@nestjs/core'),{MailService}=require('../src/auth/mail.service')
const original=NestFactory.create.bind(NestFactory)
NestFactory.create=async(...args)=>{const app=await original(...args),mail=app.get(MailService);mail.isConfigured=()=>false;mail.send=async()=>{throw Error('P7A unexpected email attempt; no SMTP transport')};app.get(require('../src/auth/directory.service').DirectoryService).client=()=>{throw Error('P7A real LDAP prohibited')};app.get(require('../src/notifications/channels/notification-channels.service').NotificationChannelsService).http=async()=>{throw Error('P7A unexpected WhatsApp; no network')};return app}
