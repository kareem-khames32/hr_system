import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/MainLayout'
import { PRODUCT_NAME } from '@/lib/product'
import './globals.css'

// عنوان التبويب = اسم المنتج (الشاشات اللي جوه الإطار بتضيف قبله اسم الشاشة من الهيدر)
export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: 'نظام متكامل لإدارة الموارد البشرية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 min-h-screen">
        {/* الإطار (القائمة الجانبية + الهيدر) يُركَّب مرة واحدة ويبقى ثابتًا بين الصفحات */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
