'use client'

import Sidebar from './Sidebar'
import Header from './Header'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="mr-72">
        <Header />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
