import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  // كل المسارات تحت /api
  app.setGlobalPrefix('api')

  // تحقق تلقائي من الـ DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true })
  )

  // السماح للفرونت المحلي
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  })

  const port = config.get<number>('PORT', 4000)
  // محلي افتراضيًا: لا يُفتح المنفذ على الشبكة إلا بضبط API_HOST صراحةً (مثل 0.0.0.0)
  const host = config.get<string>('API_HOST', '127.0.0.1')
  await app.listen(port, host)
  // eslint-disable-next-line no-console
  console.log(`🚀 HR API running on http://${host}:${port}/api`)
}

bootstrap()
