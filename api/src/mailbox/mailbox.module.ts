import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { User } from '../auth/user.entity'
import { EwsService } from './ews.service'
import { MailboxController } from './mailbox.controller'
import { MailAccount, MailSharedMailbox, MailSharedMailboxUser } from './mailbox.entities'
import { MailboxService } from './mailbox.service'
import { SharedMailboxesService } from './shared-mailboxes.service'

// B-ADD.16: البريد — صندوق Exchange بتاع الموظف جوه النظام (EWS بدخوله هو، ومن غير تخزين أي رسالة). موديول جديد مقفول لحد ما الشركة تفتحه.
// مخزن كلمة سر الجلسة (MailVaultService) ونقط ربطه بالدخول والخروج (MailSessionService) متسجّلين في AuthModule عشان مسار الدخول بيستخدمهم.
@Module({
  imports: [TypeOrmModule.forFeature([MailAccount, MailSharedMailbox, MailSharedMailboxUser, User]), AuthModule],
  controllers: [MailboxController],
  // EwsService نسخة واحدة: الاختبارات بتستبدل نداءاتها على النسخة نفسها بـ app.get(...) فمفيش اتصال Exchange حقيقي في أي اختبار
  providers: [EwsService, SharedMailboxesService, MailboxService],
})
export class MailboxModule {}
