'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouteFilter } from '@/lib/modules'

interface ModuleLinkProps {
  href: string
  className?: string
  title?: string
  // بديل بيتعرض لو الشاشة مش متاحة (الافتراضي: نفس النص من غير لينك)
  fallback?: ReactNode
  children: ReactNode
}

/**
 * لينك من شاشة مشتركة لشاشة موديول اختياري: لو الموديول مقفول بيتعرض النص من غير لينك (أو البديل)،
 * بدل لينك بيودّي على «الصفحة دي مش متاحة».
 */
export default function ModuleLink({ href, className, title, fallback, children }: ModuleLinkProps) {
  const available = useRouteFilter()
  if (!available(href)) return <>{fallback === undefined ? children : fallback}</>
  return <Link href={href} className={className} title={title}>{children}</Link>
}
