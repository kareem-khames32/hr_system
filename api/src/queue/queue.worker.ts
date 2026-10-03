import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common'
import { QueueService } from './queue.service'

// B2.3: العامل جوه الـAPI — دورة كل كام ثانية (QUEUE_WORKER_INTERVAL_MS، افتراضي 5000) من غير ما يعطّل الطلبات.
// مقفول في الاختبارات (NODE_ENV=test) أو بـQUEUE_WORKER=off؛ الاختبارات بتنادي QueueService.runOnce بإيدها.
// أكتر من نسخة من الـAPI آمن: السحب نفسه بـREADPAST فمحدش بياخد مهمة التاني. دورة لسه شغالة = الدورة الجاية بتتعدّى.
@Injectable()
export class QueueWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('QueueWorker')
  private timer: NodeJS.Timeout | null = null
  private running = false

  constructor(private readonly queue: QueueService) {}

  get enabled() {
    return process.env.NODE_ENV !== 'test' && (process.env.QUEUE_WORKER ?? 'on').trim().toLowerCase() !== 'off'
  }

  onApplicationBootstrap() {
    if (!this.enabled) return
    const interval = Math.min(60_000, Math.max(1000, Number(process.env.QUEUE_WORKER_INTERVAL_MS) || 5000))
    this.timer = setInterval(() => void this.tick(), interval)
    this.timer.unref()
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async tick() {
    if (this.running) return
    this.running = true
    try {
      await this.queue.runOnce()
    } catch (error) {
      // دورة فشلت (القاعدة وقعت مثلًا) = الدورة الجاية بتحاول تاني
      this.logger.error(`دورة الطابور فشلت: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      this.running = false
    }
  }
}
