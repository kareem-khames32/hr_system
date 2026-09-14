import { BadRequestException } from '@nestjs/common'
import { isAbsolute, relative, resolve } from 'path'

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
