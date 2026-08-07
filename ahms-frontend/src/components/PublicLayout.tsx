import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/site/Navbar'
import { Footer } from '@/components/site/Footer'
import type { ReactNode } from 'react'

// ─── Public Layout (used as <Route element>) ───────────────────────────────────
// This is the main layout wrapper. Outlet renders the matched child route.
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// ─── PublicPage wrapper (used by App.tsx for individual page routes) ───────────
// App.tsx uses <PublicPage><SomePage /></PublicPage> pattern
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

// ─── PortalShell (used by App.tsx for /portal nested routes) ──────────────────
// Portal routes use <PortalShell /> inside <PublicPage> with <Outlet />
export function PortalShell() {
  return (
    <div className="pt-20 pb-16 bg-muted/30/30 min-h-[75vh]">
      <Outlet />
    </div>
  )
}
