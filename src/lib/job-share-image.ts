// B-ADD.6: صورة الوظيفة بهوية الشركة — بتترسم في المتصفح على canvas (من غير أي خدمة صور برّه): شعار الشركة أو علامة حروفها، واسمها،
// والمسمى، والمكان. مقاسين: LinkedIn ‏1200×627 وInstagram ‏1080×1080. اللي عليها خانات الوظيفة العامة بس.
import { SHARE_IMAGE_SIZES, wrapLines, type PostLang, type ShareImageSize, type SharedJob } from './job-share'

export interface JobImageInput {
  job: Pick<SharedJob, 'title' | 'branchName' | 'code'>
  company: string
  /** علامة الحروف لما مفيش شعار (أو الشعار ماتحمّلش) */
  initials: string
  logo: CanvasImageSource | null
  lang: PostLang
  size: ShareImageSize
}

const FONT = "'Tajawal', system-ui, sans-serif"
// ألوان النظام (primary في tailwind.config.js)
const COLORS = { from: '#1d4ed8', to: '#1e3a8a', accent: '#93c5fd', text: '#ffffff', soft: '#dbeafe', dark: '#1e3a8a' }

/** شعار الشركة للرسم: بطلب CORS من غير بيانات جلسة (عشان الـcanvas يفضل يتصدّر)، وأي فشل أو تأخير = من غير شعار */
export function loadLogo(url: string | null, timeoutMs = 5000): Promise<HTMLImageElement | null> {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(() => resolve(null), timeoutMs)
    const done = (value: HTMLImageElement | null) => {
      clearTimeout(timer)
      resolve(value)
    }
    image.crossOrigin = 'anonymous'
    image.onload = () => done(image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null)
    image.onerror = () => done(null)
    image.src = url
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

/** بيرسم صورة الوظيفة على الـcanvas بالمقاس المطلوب. الاتجاه من لغة البوست: عربي من اليمين، وإنجليزي من الشمال. */
export function drawJobImage(canvas: HTMLCanvasElement, input: JobImageInput): void {
  const { width, height } = SHARE_IMAGE_SIZES[input.size]
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rtl = input.lang === 'ar', square = input.size === 'instagram'
  const pad = Math.round(width * 0.07)
  // بداية السطر: يمين الصورة في العربي وشمالها في الإنجليزي — و`step` اتجاه الكتابة
  const start = rtl ? width - pad : pad, step = rtl ? -1 : 1
  const font = (weight: number, size: number) => `${weight} ${Math.round(size)}px ${FONT}`

  const background = ctx.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, COLORS.from)
  background.addColorStop(1, COLORS.to)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  for (const [cx, cy, radius] of [[rtl ? 0 : width, height, height * 0.55], [rtl ? width * 0.12 : width * 0.88, height * 0.1, height * 0.22]] as const) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.direction = rtl ? 'rtl' : 'ltr'
  ctx.textAlign = 'start'
  ctx.textBaseline = 'middle'

  // فوق: الشعار (أو علامة الحروف) في مربع أبيض، واسم الشركة جنبه
  const box = Math.round(height * (square ? 0.12 : 0.17)), boxX = rtl ? width - pad - box : pad, boxY = pad
  ctx.fillStyle = COLORS.text
  roundedRect(ctx, boxX, boxY, box, box, box * 0.2)
  ctx.fill()
  const inner = box * 0.76
  let drawn = false
  if (input.logo) {
    const source = input.logo as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
    const logoWidth = Number(source.naturalWidth ?? source.width ?? 0), logoHeight = Number(source.naturalHeight ?? source.height ?? 0)
    if (logoWidth > 0 && logoHeight > 0) {
      const scale = Math.min(inner / logoWidth, inner / logoHeight)
      ctx.drawImage(input.logo, boxX + (box - logoWidth * scale) / 2, boxY + (box - logoHeight * scale) / 2, logoWidth * scale, logoHeight * scale)
      drawn = true
    }
  }
  if (!drawn) {
    ctx.fillStyle = COLORS.dark
    ctx.font = font(700, box * 0.46)
    ctx.textAlign = 'center'
    ctx.fillText(input.initials, boxX + box / 2, boxY + box / 2 + box * 0.03)
    ctx.textAlign = 'start'
  }
  ctx.fillStyle = COLORS.text
  ctx.font = font(700, height * (square ? 0.042 : 0.062))
  const nameWidth = width - pad * 2 - box - pad * 0.4
  ctx.fillText(wrapLines(input.company, nameWidth, (value) => ctx.measureText(value).width, 1)[0] ?? '', start + step * (box + pad * 0.4), boxY + box / 2)

  // تحت: زرار «قدّم الآن» وكود الوظيفة
  const pillHeight = Math.round(height * (square ? 0.075 : 0.115)), pillY = height - pad - pillHeight
  ctx.font = font(700, pillHeight * 0.44)
  const pillText = rtl ? 'قدّم الآن' : 'Apply now'
  const pillWidth = Math.round(ctx.measureText(pillText).width + pillHeight * 1.3)
  ctx.fillStyle = COLORS.text
  roundedRect(ctx, rtl ? width - pad - pillWidth : pad, pillY, pillWidth, pillHeight, pillHeight / 2)
  ctx.fill()
  ctx.fillStyle = COLORS.dark
  ctx.textAlign = 'center'
  ctx.fillText(pillText, (rtl ? width - pad - pillWidth : pad) + pillWidth / 2, pillY + pillHeight / 2 + pillHeight * 0.04)
  ctx.fillStyle = COLORS.accent
  ctx.font = font(500, pillHeight * 0.36)
  ctx.direction = 'ltr'
  ctx.textAlign = rtl ? 'left' : 'right'
  ctx.fillText(input.job.code, rtl ? pad : width - pad, pillY + pillHeight / 2)
  ctx.direction = rtl ? 'rtl' : 'ltr'
  ctx.textAlign = 'start'

  // النص: «مطلوب للتعيين»، والمسمى (لحد 2 أو 3 سطور)، والمكان — متوسّط بين اللي فوق واللي تحت
  const labelSize = height * (square ? 0.04 : 0.058), titleSize = height * (square ? 0.085 : 0.125), placeSize = height * (square ? 0.042 : 0.06)
  ctx.font = font(800, titleSize)
  const titleLines = wrapLines(input.job.title, width - pad * 2, (value) => ctx.measureText(value).width, square ? 3 : 2)
  const titleGap = titleSize * 1.25
  const blockHeight = labelSize * 1.9 + titleLines.length * titleGap + (input.job.branchName ? placeSize * 1.9 : 0)
  const top = boxY + box, bottom = pillY
  let y = top + Math.max(0, (bottom - top - blockHeight) / 2) + labelSize / 2
  ctx.fillStyle = COLORS.accent
  ctx.font = font(700, labelSize)
  ctx.fillText(rtl ? 'مطلوب للتعيين' : 'We are hiring', start, y)
  y += labelSize * 0.95 + titleGap / 2
  ctx.fillStyle = COLORS.text
  ctx.font = font(800, titleSize)
  for (const line of titleLines) {
    ctx.fillText(line, start, y)
    y += titleGap
  }
  if (input.job.branchName) {
    ctx.fillStyle = COLORS.soft
    ctx.font = font(500, placeSize)
    const place = `${rtl ? 'المكان' : 'Location'}: ${input.job.branchName}`
    ctx.fillText(wrapLines(place, width - pad * 2, (value) => ctx.measureText(value).width, 1)[0] ?? '', start, y - titleGap / 2 + placeSize * 1.1)
  }
}

/** الصورة ملف PNG للتنزيل — null لو المتصفح رفض التصدير (شعار من غير إذن CORS) */
export function jobImageBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    } catch {
      resolve(null)
    }
  })
}
