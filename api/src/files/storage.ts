import { BadRequestException } from '@nestjs/common'
import { createReadStream, existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'path'
import type { Readable } from 'stream'

export const uploadsRoot = () => resolve(process.env.UPLOADS_ROOT || 'uploads')

export function storedPath(name: string): string {
  const root = uploadsRoot()
  const target = resolve(root, name)
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new BadRequestException('مسار ملف غير صالح')
  }
  return target
}

/**
 * B2.2: واجهة تخزين الملفات — الاسم المخزّن نسبي (YYYY-MM/uuid.ext). المشغّل الحالي القرص (uploads/)؛ مشغّلات تانية (S3 وغيره) بعدين
 * بنفس الواجهة. الملفات القديمة بأسمائها زي ما هي.
 */
export interface FileStorage {
  /** كتابة جديدة بس: اسم موجود = خطأ (مفيش كتابة فوق ملف) */
  write(name: string, bytes: Buffer | Uint8Array): Promise<void>
  read(name: string): Readable
  exists(name: string): Promise<boolean>
  remove(name: string): Promise<void>
  /** المسار على القرص لو المشغّل محلي (للإرسال المباشر)، وغير كده null */
  localPath(name: string): string | null
}

export class DiskFileStorage implements FileStorage {
  async write(name: string, bytes: Buffer | Uint8Array) {
    const target = storedPath(name)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes, { flag: 'wx' })
  }
  read(name: string) { return createReadStream(storedPath(name)) }
  async exists(name: string) { return existsSync(storedPath(name)) }
  async remove(name: string) { await unlink(storedPath(name)).catch(error => { if (error?.code !== 'ENOENT') throw error }) }
  localPath(name: string) { return storedPath(name) }
}

// المشغّل الوحيد دلوقتي — FILE_STORAGE_DRIVER غير «disk» = خطأ واضح بدل كتابة في مكان غلط
let storage: FileStorage | null = null
export function fileStorage(): FileStorage {
  const driver = (process.env.FILE_STORAGE_DRIVER || 'disk').trim().toLowerCase()
  if (driver !== 'disk') throw new Error(`مشغّل تخزين الملفات «${driver}» مش مدعوم — المتاح: disk`)
  return (storage ??= new DiskFileStorage())
}
