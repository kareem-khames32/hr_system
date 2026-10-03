// B1.4: api/.env بيتقرا قبل أي كود تاني (أول import في main.ts) عشان TZ — توقيت الشركة — يسري على التواريخ ومواعيد المهام المجدولة
// من أول لحظة (مواعيد @Scheduled بتتحدد وقت تحميل الملفات). ConfigModule بيقراه برضه بعدين من غير ما يغيّر قيمة موجودة.
// TZ الغلط بيوقف الإقلاع في validateEnv (Node بيرجع لـUTC من غير ما حد يحس).
import { config } from 'dotenv'

config({ quiet: true })
