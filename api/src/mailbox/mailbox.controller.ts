import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { IsOptional } from 'class-validator'
import { memoryStorage } from 'multer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { readCookie, sessionCookieOptions } from '../auth/session-cookie'
import { RequireModule } from '../modules-registry/module.guard'
import { EwsService } from './ews.service'
import { appendSetCookie } from './mail-session.service'
import { clearedMailKeyCookieHeader, mailKeyCookieHeader, mailKeyCookieName } from './mail-vault'
import {
  MAIL_PAGE_MAX, MAIL_SHARED_PERMISSION, MAIL_TOO_LARGE, MAX_ATTACHMENT_FILES, MAX_ATTACHMENTS_BYTES, cleanAttachmentId, cleanCompose, cleanEwsId, cleanTarget, intParam, uploadedFileName,
} from './mailbox-rules'
import { MailboxService } from './mailbox.service'
import { isEmptyQuery, mailQueryOf } from './search'
import { SharedMailboxesService } from './shared-mailboxes.service'

// القيم بتتفحص في القواعد والخدمة برسايلها
class UnlockDto {
  @IsOptional() password?: unknown
}
class PatchDto {
  @IsOptional() isRead?: unknown
  @IsOptional() flagged?: unknown
  @IsOptional() folder?: unknown
}
class SharedDto {
  @IsOptional() address?: unknown
  @IsOptional() name?: unknown
  @IsOptional() isActive?: unknown
  @IsOptional() userIds?: unknown
}

type MailRequest = { headers: Record<string, unknown> }
type MailResponse = { setHeader(name: string, value: string | string[]): unknown; getHeader(name: string): unknown; send(body: unknown): unknown }

/** نص المفتاح من cookie المتصفح (بالاسم اللي الخادم بيكتبه دلوقتي بس) — نص تشفير كلمة السر عند الخادم، والمفتاح مع المتصفح */
const browserKeyOf = (req: MailRequest): string | null => readCookie(req.headers?.cookie, mailKeyCookieName(sessionCookieOptions()))
const flag = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

// B-ADD.16: البريد — صندوق Exchange بتاع الموظف جوه النظام. كل مسار بيشتغل على صندوق صاحب الجلسة بس (الهوية من التوكن ومخزن الجلسة)،
// والصندوق المشترك (‎?mbx=‎) للمضاف عليه بس؛ وإدارة الصناديق المشتركة بصلاحيتها. ولا رسالة بتتخزن في النظام.
@RequireModule('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mail')
export class MailboxController {
  constructor(private readonly mailbox: MailboxService, private readonly ews: EwsService, private readonly shared: SharedMailboxesService) {}

  // ===== حالة البريد للجلسة و«افتح بريدك» =====
  @Get('status')
  async status(@CurrentUser() user: JwtPayload, @Req() req: MailRequest) {
    return { ...(await this.mailbox.status(user, browserKeyOf(req))), canManageShared: userHasPerm(user, MAIL_SHARED_PERMISSION) }
  }

  // كلمة مرور بريد الشركة مرة واحدة للجلسة: بتتجرّب على Exchange، وبتتخزن مشفّرة في ذاكرة الخادم، ومفتاحها بيرجع في cookie للمتصفح بس
  @Post('unlock')
  @HttpCode(200)
  async unlock(@CurrentUser() user: JwtPayload, @Body() dto: UnlockDto, @Res({ passthrough: true }) res: MailResponse) {
    const key = await this.mailbox.unlock(user, dto?.password)
    appendSetCookie(res, mailKeyCookieHeader(key, sessionCookieOptions()))
    return { unlocked: true }
  }

  @Post('lock')
  @HttpCode(200)
  lock(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: MailResponse) {
    this.mailbox.lock(user)
    appendSetCookie(res, clearedMailKeyCookieHeader(sessionCookieOptions()))
    return { unlocked: false }
  }

  // ===== صندوق الموظف =====
  @Get('folders')
  async folders(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('mbx') mbx?: string) {
    const target = cleanTarget(mbx)
    const folders = await this.mailbox.run(user, browserKeyOf(req), target, (who) => this.ews.folders(who))
    return target ? folders : { ...folders, shared: await this.shared.listFor(user.sub) }
  }

  @Get('messages')
  list(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query() q: Record<string, string>) {
    const query = mailQueryOf(q), limit = intParam(q.limit, 50, 1, MAIL_PAGE_MAX)
    return this.mailbox.run(user, browserKeyOf(req), cleanTarget(q.mbx), (who) => q.scope === 'all' && !isEmptyQuery(query)
      ? this.ews.searchAll(who, limit, query)
      : this.ews.list(who, typeof q.folder === 'string' && q.folder ? q.folder : 'inbox', intParam(q.offset, 0, 0, 100_000), limit, query))
  }

  @Get('conversations')
  conversations(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query() q: Record<string, string>) {
    return this.mailbox.run(user, browserKeyOf(req), cleanTarget(q.mbx), (who) =>
      this.ews.conversations(who, typeof q.folder === 'string' && q.folder ? q.folder : 'inbox', intParam(q.offset, 0, 0, 100_000), intParam(q.limit, 50, 1, MAIL_PAGE_MAX), q.unread === '1'))
  }

  @Get('conversation')
  conversation(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('id') id: string, @Query('folder') folder = 'inbox', @Query('mbx') mbx?: string) {
    return this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.conversation(who, cleanEwsId(id), String(folder)))
  }

  @Patch('conversation')
  async updateConversation(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Body() dto: PatchDto, @Query('id') id: string, @Query('folder') folder = 'inbox', @Query('mbx') mbx?: string) {
    await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.conversationAction(who, cleanEwsId(id), String(folder), {
      isRead: flag(dto?.isRead), flagged: flag(dto?.flagged), moveTo: typeof dto?.folder === 'string' ? dto.folder : undefined }))
    return { ok: true }
  }

  // الحذف = نقل لـ«المحذوف» في Exchange
  @Delete('conversation')
  @HttpCode(200)
  async removeConversation(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('id') id: string, @Query('folder') folder = 'inbox', @Query('mbx') mbx?: string) {
    await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.conversationAction(who, cleanEwsId(id), String(folder), { remove: true }))
    return { ok: true }
  }

  @Get('message')
  message(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('id') id: string, @Query('peek') peek?: string, @Query('mbx') mbx?: string) {
    return this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.message(who, cleanEwsId(id), peek === '1'))
  }

  @Patch('message')
  async update(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Body() dto: PatchDto, @Query('id') id: string, @Query('mbx') mbx?: string) {
    await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.update(who, cleanEwsId(id), {
      isRead: flag(dto?.isRead), flagged: flag(dto?.flagged), folder: typeof dto?.folder === 'string' ? dto.folder : undefined }))
    return { ok: true }
  }

  @Delete('message')
  @HttpCode(200)
  async remove(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('id') id: string, @Query('mbx') mbx?: string) {
    await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.remove(who, cleanEwsId(id)))
    return { ok: true }
  }

  // المرفق بيعدّي من Exchange للمتصفح وقت التنزيل (مابيتخزنش). دايمًا تنزيل وبنوع محايد: مرفق عمره ما بيتفتح كصفحة من النظام
  @Get('attachment')
  async attachment(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Res() res: MailResponse, @Query('id') id: string, @Query('att') att: string, @Query('mbx') mbx?: string) {
    const file = await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.attachment(who, cleanEwsId(id), cleanAttachmentId(att)))
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name || 'attachment')}`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(file.data)
  }

  // multipart: حقل payload (JSON الرسالة) + ملفات attachments
  @Post('send')
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor('attachments', MAX_ATTACHMENT_FILES, { storage: memoryStorage(), limits: { fileSize: MAX_ATTACHMENTS_BYTES, files: MAX_ATTACHMENT_FILES, fields: 5, fieldSize: 4 * 1024 * 1024 } }))
  async send(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @UploadedFiles() files: Express.Multer.File[] = [], @Body('payload') payload: string, @Query('mbx') mbx?: string) {
    const input = cleanCompose(payload)
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENTS_BYTES) throw new BadRequestException({ code: 'MAIL_TOO_LARGE', message: MAIL_TOO_LARGE })
    const attachments = files.map((file) => ({ name: uploadedFileName(file.originalname), base64: file.buffer.toString('base64') }))
    await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.send(who, { ...input, attachments }))
    return { ok: true }
  }

  // عدد غير المقروء في الوارد
  @Get('unread')
  async unread(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('mbx') mbx?: string) {
    return { unread: await this.mailbox.run(user, browserKeyOf(req), cleanTarget(mbx), (who) => this.ews.unread(who)) }
  }

  // إكمال العناوين من دليل Exchange بدخول الموظف نفسه (اللي شايفه في Outlook)
  @Get('contacts')
  contacts(@CurrentUser() user: JwtPayload, @Req() req: MailRequest, @Query('q') q = '') {
    const term = String(q).trim().slice(0, 100)
    if (term.length < 2) return []
    return this.mailbox.run(user, browserKeyOf(req), undefined, (who) => this.ews.contacts(who, term))
  }

  // ===== إدارة الصناديق المشتركة (بالصلاحية) =====
  @Perm('mail.shared.manage')
  @Get('shared')
  sharedList() {
    return this.shared.list()
  }

  @Perm('mail.shared.manage')
  @Get('shared/users')
  sharedUsers(@Query('q') q?: string) {
    return this.shared.searchUsers(q)
  }

  @Perm('mail.shared.manage')
  @Post('shared')
  sharedCreate(@CurrentUser() user: JwtPayload, @Body() dto: SharedDto) {
    return this.shared.create(user, dto)
  }

  @Perm('mail.shared.manage')
  @Patch('shared/:id')
  sharedUpdate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SharedDto) {
    return this.shared.update(user, id, dto)
  }

  @Perm('mail.shared.manage')
  @Delete('shared/:id')
  @HttpCode(200)
  sharedRemove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.shared.remove(user, id)
  }
}
