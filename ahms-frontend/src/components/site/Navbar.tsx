import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Menu, Phone, X, Leaf, ChevronDown, Stethoscope, Building2, FlaskConical, Image, BookOpen, Layers3, UserCircle2, Info, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '../ThemeToggle'
import { getPortalToken, clearPortalAuth } from '@/lib/api'

// ─── All links for mobile drawer ─────────────────────────────────────────────
const allLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us', icon: Info },
  { to: '/facilities', label: 'Facilities', icon: Building2 },
  { to: '/departments', label: 'Departments' },
  { to: '/doctors', label: 'Doctors' },
  { to: '/treatments', label: 'Treatments', icon: Stethoscope },
  { to: '/panchakarma', label: 'Panchakarma', icon: Layers3 },
  { to: '/research', label: 'Research', icon: FlaskConical },
  { to: '/blog', label: 'Blog', icon: BookOpen },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/contact', label: 'Contact' },
] as const

// ─── Custom Nav Dropdown ──────────────────────────────────────────────────────
interface NavDropdownProps {
  label: string
  scrolled: boolean
  links: { to: string; label: string; icon: any }[]
}

function NavDropdown({ label, scrolled, links }: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasActiveChild = links.some(l => location.pathname === l.to)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
          hasActiveChild
            ? (scrolled ? 'text-primary' : 'text-white')
            : (scrolled ? 'text-muted-foreground hover:text-primary' : 'text-white/80 hover:text-white'),
          open && (scrolled ? 'text-primary' : 'text-white'),
        )}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-2 w-52 rounded-2xl p-2 z-50',
            'glass-panel shadow-lift bg-card/95 text-foreground animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          {links.map(({ to, label: childLabel, icon: Icon }) => (
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
              {childLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Auth Dropdown (Desktop/Tablet) ───────────────────────────────────────────
function AuthDropdown({ onLogout }: { onLogout: (e: React.MouseEvent) => void }) {
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
          "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-700 shadow-md",
          open && "bg-teal-700"
        )}
        aria-expanded={open}
      >
        <UserCircle2 className="h-3.5 w-3.5" /> My Account
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 w-48 rounded-2xl p-2 z-50',
            'glass-panel shadow-lift bg-card/95 text-foreground animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          <Link
            to="/portal"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <UserCircle2 className="h-4 w-4 shrink-0" />
            Dashboard
          </Link>
          <button
            onClick={(e) => {
              setOpen(false)
              onLogout(e)
            }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Mobile Auth Accordion (Drawer) ───────────────────────────────────────────
function MobileAuthAccordion({ onLogout, closeNav }: { onLogout: (e: React.MouseEvent) => void, closeNav: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-teal-600 bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        <span className="flex items-center gap-2"><UserCircle2 className="h-4 w-4" /> My Account</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 grid gap-1 pl-4 border-l-2 border-teal-600/20 ml-2 animate-in slide-in-from-top-2">
          <Link
            to="/portal"
            onClick={closeNav}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Dashboard
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer"
          >
            Logout
          </button>
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
  const navigate = useNavigate()
  
  const isPortalInside = location.pathname.startsWith('/portal') && location.pathname !== '/portal/login'
  const scrolled = hasScrolled || isPortalInside
  
  const isLoggedIn = !!getPortalToken()

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault()
    clearPortalAuth()
    setOpen(false)
    navigate('/')
  }

  // Close drawer on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const aboutLinks = [
    { to: '/about', label: 'About Us', icon: Info },
    { to: '/departments', label: 'Departments', icon: Building2 },
    { to: '/facilities', label: 'Facilities', icon: Layers3 },
  ]

  const treatmentLinks = [
    { to: '/treatments', label: 'Treatments', icon: Stethoscope },
    { to: '/panchakarma', label: 'Panchakarma', icon: Layers3 },
    { to: '/research', label: 'Research', icon: FlaskConical },
  ]

  const mediaLinks = [
    { to: '/blog', label: 'Blog', icon: BookOpen },
    { to: '/gallery', label: 'Gallery', icon: Image },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'glass-panel shadow-soft py-2 bg-card/85 backdrop-blur-md'
          : 'border-b border-transparent py-3 bg-transparent',
      )}
    >
      <div className="w-full max-w-[96%] mx-auto px-4 md:px-8 flex items-center justify-between gap-3">

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
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'relative rounded-full px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? (scrolled ? 'text-primary' : 'text-white')
                  : (scrolled ? 'text-muted-foreground hover:text-primary' : 'text-white/80 hover:text-white'),
              )
            }
          >
            Home
          </NavLink>

          <NavDropdown label="About" scrolled={scrolled} links={aboutLinks} />


          <NavLink
            to="/doctors"
            className={({ isActive }) =>
              cn(
                'relative rounded-full px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? (scrolled ? 'text-primary' : 'text-white')
                  : (scrolled ? 'text-muted-foreground hover:text-primary' : 'text-white/80 hover:text-white'),
              )
            }
          >
            Doctors
          </NavLink>

          <NavDropdown label="Treatments" scrolled={scrolled} links={treatmentLinks} />
          <NavDropdown label="Media" scrolled={scrolled} links={mediaLinks} />

          <NavLink
            to="/contact"
            className={({ isActive }) =>
              cn(
                'relative rounded-full px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? (scrolled ? 'text-primary' : 'text-white')
                  : (scrolled ? 'text-muted-foreground hover:text-primary' : 'text-white/80 hover:text-white'),
              )
            }
          >
            Contact
          </NavLink>
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden lg:flex items-center gap-2.5">
          {isLoggedIn ? (
            <AuthDropdown onLogout={handleLogout} />
          ) : (
            <Link
              to="/portal/login"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors shadow-sm backdrop-blur-sm",
                scrolled
                  ? "border-teal-600/30 text-teal-700 hover:bg-teal-50 bg-teal-50/50"
                  : "border-white/40 text-white hover:bg-white/20 bg-white/10"
              )}
            >
              <UserCircle2 className="h-3.5 w-3.5" /> Patient Portal
            </Link>
          )}
          <Button asChild size="sm" className="rounded-full text-xs">
            <Link to="/appointment">Book Appointment</Link>
          </Button>
          <ThemeToggle />
          <a
            href="tel:+911800123456"
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20"
          >
            <Phone className="h-3.5 w-3.5" /> Emergency
          </a>
        </div>

        {/* Tablet Right Actions (md only) */}
        <div className="hidden md:flex lg:hidden items-center gap-2">
          {isLoggedIn ? (
            <AuthDropdown onLogout={handleLogout} />
          ) : (
            <Link
              to="/portal/login"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors shadow-sm",
                scrolled
                  ? "border-teal-600/30 text-teal-700 hover:bg-teal-50 bg-teal-50/50"
                  : "border-white/40 text-white hover:bg-white/20 bg-white/10"
              )}
            >
              <UserCircle2 className="h-3.5 w-3.5" /> Portal
            </Link>
          )}
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
          <a
            href="tel:+911800123456"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors bg-red-600 text-white hover:bg-red-700 shadow-sm"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
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
        <div className="lg:hidden glass-panel max-w-[96%] mx-auto mt-2 rounded-2xl p-3 grid gap-1">
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
                {'icon' in l && l.icon && (
                  <l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Patient Portal */}
          {isLoggedIn ? (
            <MobileAuthAccordion onLogout={handleLogout} closeNav={() => setOpen(false)} />
          ) : (
            <Link
              to="/portal/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-teal-600/30 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors mt-1"
            >
              <UserCircle2 className="h-4 w-4" /> Patient Portal
            </Link>
          )}

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
