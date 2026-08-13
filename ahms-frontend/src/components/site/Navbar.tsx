import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Menu, Phone, X, Leaf, ChevronDown, Stethoscope, Building2, FlaskConical, Image, BookOpen, Layers3, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '../ThemeToggle'

// ─── Primary links always visible in desktop nav ────────────────────────────
const primaryLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/departments', label: 'Departments' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/contact', label: 'Contact' },
] as const

// ─── Secondary links inside "More" dropdown ─────────────────────────────────
const moreLinks = [
  { to: '/treatments', label: 'Treatments', icon: Stethoscope },
  { to: '/panchakarma', label: 'Panchakarma', icon: Layers3 },
  { to: '/facilities', label: 'Facilities', icon: Building2 },
  { to: '/research', label: 'Research', icon: FlaskConical },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/blog', label: 'Blog', icon: BookOpen },
] as const

// ─── All links for mobile drawer ─────────────────────────────────────────────
const allLinks = [...primaryLinks, ...moreLinks] as const

// ─── More Dropdown ────────────────────────────────────────────────────────────
function MoreDropdown({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
          scrolled 
            ? 'text-muted-foreground hover:text-primary' 
            : 'text-white/80 hover:text-white',
          open && (scrolled ? 'text-primary' : 'text-white'),
        )}
        aria-expanded={open}
      >
        More
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 w-52 rounded-2xl p-2 z-50',
            'glass-panel shadow-lift bg-card/95 text-foreground',
          )}
        >
          {moreLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export function Navbar() {
  const [hasScrolled, setHasScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 24)
      const h = document.body.scrollHeight - window.innerHeight
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const location = useLocation()
  const isPortal = location.pathname.startsWith('/portal')
  const scrolled = hasScrolled || isPortal

  // Close drawer on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'glass-panel shadow-soft py-2 bg-card/85 backdrop-blur-md'
          : 'border-b border-transparent py-3 bg-transparent',
      )}
    >
      <div className="container-page flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-xl">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="leading-tight hidden sm:block">
            <span className={cn(
              "block font-[family-name:var(--font-display)] text-sm font-semibold transition-colors",
              scrolled ? "text-foreground" : "text-white"
            )}>
              Maitri Ayurveda
            </span>
            <span className={cn(
              "block text-[9px] tracking-[0.2em] uppercase transition-colors",
              scrolled ? "text-muted-foreground" : "text-white/60"
            )}>
              Healing Through Nature
            </span>
          </span>
          <span className={cn(
            "block sm:hidden font-[family-name:var(--font-display)] text-sm font-semibold transition-colors",
            scrolled ? "text-foreground" : "text-white"
          )}>
            Maitri
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {primaryLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  'after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform',
                  isActive
                    ? (scrolled ? 'text-primary after:scale-x-100' : 'text-white after:scale-x-100')
                    : (scrolled ? 'text-muted-foreground hover:text-primary after:scale-x-0 hover:after:scale-x-100' : 'text-white/80 hover:text-white after:scale-x-0 hover:after:scale-x-100'),
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <MoreDropdown scrolled={scrolled} />
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/portal/login"
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              scrolled
                ? "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                : "border-white/20 text-white/80 hover:bg-card/10 hover:text-white"
            )}
          >
            <UserCircle2 className="h-3.5 w-3.5" /> Patient Portal
          </Link>
          <a
            href="tel:+911800123456"
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <Phone className="h-3 w-3" /> Emergency
          </a>
          <Button asChild size="sm" className="rounded-full text-xs">
            <Link to="/appointment">Book Appointment</Link>
          </Button>
          <ThemeToggle />
        </div>

        {/* Tablet Right Actions (md only) */}
        <div className="hidden md:flex lg:hidden items-center gap-2">
          <Link
            to="/portal/login"
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
              scrolled
                ? "border-border text-muted-foreground hover:bg-muted"
                : "border-white/20 text-white/80 hover:bg-card/10"
            )}
          >
            <UserCircle2 className="h-3.5 w-3.5" />
          </Link>
          <a
            href="tel:+911800123456"
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <Phone className="h-3 w-3" />
          </a>
          <Button asChild size="sm" className="rounded-full text-xs px-3">
            <Link to="/appointment">Book</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              scrolled ? "text-foreground" : "text-white hover:bg-card/10"
            )}
            aria-label="Toggle menu"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <ThemeToggle />
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          <a 
            href="tel:+911800123456" 
            className="p-1.5 transition-colors text-red-500 hover:text-red-600"
          >
            <Phone className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              scrolled ? "text-foreground" : "text-white hover:bg-card/10"
            )}
            aria-label="Toggle menu"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Scroll progress bar */}
      <div
        className="bg-secondary absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-150"
        style={{ transform: `scaleX(${progress / 100})` }}
      />

      {/* Mobile + Tablet Drawer */}
      {open && (
        <div className="lg:hidden glass-panel container-page mt-2 rounded-2xl p-3 grid gap-1">
          {/* Book Appointment CTA */}
          <Link
            to="/appointment"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold mb-1"
          >
            Book Appointment
          </Link>

          {/* All nav links in 2-column grid on tablet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {allLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {'icon' in l && (
                  <l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Patient Portal */}
          <Link
            to="/portal/login"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <UserCircle2 className="h-4 w-4" /> Patient Portal
          </Link>

          {/* Emergency */}
          <a
            href="tel:+911800123456"
            className="mt-1 flex items-center justify-center gap-2 text-destructive border border-destructive/30 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide uppercase"
          >
            <Phone className="h-3.5 w-3.5" /> Emergency: 1800 123 456
          </a>
        </div>
      )}
    </header>
  )
}
