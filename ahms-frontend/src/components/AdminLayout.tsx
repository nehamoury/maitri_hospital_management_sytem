import { NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { useCan } from '../lib/can'
import { api } from '../lib/api'
import {
  LayoutDashboard, Users, Calendar, Stethoscope, ArrowLeftRight,
  Pill, Receipt, UserCog, Building2, FileText, Search, Bell, LogOut,
  Menu, X, ChevronRight, ChevronDown, Settings, User as UserIcon,
  Leaf, CalendarClock, ShieldCheck, MonitorPlay, BedDouble, Hospital,
  FlaskConical, ChefHat
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'
import { toast } from 'sonner'

// ─── Navigation Config ──────────────────────────────────────────────
const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: 'dashboard.view' },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { to: '/admin/patients', label: 'Patients', icon: Users, perm: 'patient.view' },
      { to: '/admin/appointments', label: 'Appointments', icon: Calendar, perm: 'appointment.view' },
      { to: '/admin/encounters', label: 'OPD', icon: Stethoscope, perm: 'encounter.view' },
      { to: '/admin/token-board', label: 'Token Board', icon: MonitorPlay, perm: 'encounter.view' },
      { to: '/admin/referrals', label: 'Referrals', icon: ArrowLeftRight, perm: 'referral.view' },
      { to: '/admin/treatment-plans', label: 'Treatment Plans', icon: Leaf, perm: 'treatment.view' },
      { to: '/admin/treatment-sessions', label: 'Therapist Sessions', icon: CalendarClock, perm: 'treatment.session' },
      { to: '/admin/admissions', label: 'IPD Admissions', icon: BedDouble, perm: 'admission.view' },
      { to: '/admin/wards', label: 'Wards & Beds', icon: Hospital, perm: 'ward.view' },
      { to: '/admin/lab', label: 'Laboratory', icon: FlaskConical, perm: 'lab.view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/pharmacy', label: 'Pharmacy', icon: Pill, perm: 'pharmacy.view' },
      { to: '/admin/billing', label: 'Billing', icon: Receipt, perm: 'billing.view' },
      { to: '/admin/diet', label: 'Diet & Kitchen', icon: ChefHat, perm: 'diet.serve' },
      { to: '/admin/reports', label: 'Reports', icon: FileText, perm: 'reports.view' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/doctors', label: 'Doctors', icon: UserCog, perm: 'doctor.view' },
      { to: '/admin/departments', label: 'Departments', icon: Building2, perm: 'department.view' },
      { to: '/admin/users', label: 'Staff Users', icon: Users, perm: 'user.view' },
      { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck, perm: 'role.manage' },
      { to: '/admin/audit', label: 'Audit Logs', icon: FileText, perm: 'audit.view' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/admin/profile', label: 'My Profile', icon: UserIcon },
    ],
  },
] as const

// ─── Sidebar ────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()
  const { can } = useCan()

  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => !('perm' in item) || can(item.perm)) }))
    .filter((section) => section.items.length > 0)

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 280 }}
      className="hidden flex-col border-r border-emerald-700/30 bg-emerald-900 md:flex shadow-2xl relative z-40"
    >
      {/* Logo */}
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20 text-white">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-wide">AHMS</span>
                <span className="text-[11px] font-medium text-emerald-400/80 uppercase tracking-widest">Maitri</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="rounded-xl p-2 text-emerald-300/70 transition-all hover:bg-emerald-800 hover:text-white"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <ChevronRight className="h-5 w-5" />
          </motion.div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {visibleSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3 pl-3 text-xs font-bold uppercase tracking-wider text-emerald-400/50"
              >
                {section.label}
              </motion.p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = (item as { end?: boolean }).end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to) && location.pathname !== '/admin'
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={(item as { end?: boolean }).end}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-emerald-200/70 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-xl bg-emerald-800/80 border border-emerald-700/50 shadow-inner"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`relative z-10 h-[22px] w-[22px] transition-transform duration-300 ${isActive ? 'text-emerald-400' : 'group-hover:scale-110'}`} />
                    {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  )
}

// ─── Mobile Nav ─────────────────────────────────────────────────────
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { can } = useCan()
  const visibleSections = navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => !('perm' in item) || can(item.perm)) }))
    .filter((section) => section.items.length > 0)
  
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-emerald-900 shadow-2xl"
          >
            <div className="flex h-20 items-center justify-between px-6 border-b border-emerald-700/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white tracking-wide">AHMS</span>
                  <span className="text-[11px] font-medium text-emerald-400/80 uppercase tracking-widest">Maitri</span>
                </div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-emerald-300/70 hover:bg-emerald-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {visibleSections.map((section) => (
                <div key={section.label}>
                  <p className="mb-2 pl-3 text-xs font-bold uppercase tracking-wider text-emerald-400/50">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={(item as { end?: boolean }).end}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                              isActive ? 'bg-emerald-800 text-white' : 'text-emerald-200/70 hover:bg-emerald-800/50 hover:text-white'
                            }`
                          }
                        >
                          <Icon className={`h-5 w-5 ${location.pathname.startsWith(item.to) ? 'text-emerald-400' : ''}`} />
                          <span>{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Topbar ─────────────────────────────────────────────────────────
function Topbar({ onMenuClick, notifications, setNotifications }: { onMenuClick: () => void, notifications: any[], setNotifications: React.Dispatch<React.SetStateAction<any[]>> }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ patients: any[]; referrals: any[]; bills: any[] }>({ patients: [], referrals: [], bills: [] })
  const [showResults, setShowResults] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(undefined)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const profileBoxRef = useRef<HTMLDivElement>(null)
  const notifBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) { setResults({ patients: [], referrals: [], bills: [] }); setShowResults(false); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: query } })
        const raw = data.data || {}
        setResults({ patients: raw.patients || [], referrals: raw.referrals || [], bills: raw.bills || [] })
        setShowResults(true)
      } catch { /* ignore */ }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowResults(false)
      if (profileBoxRef.current && !profileBoxRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goTo = (path: string) => { setShowResults(false); setQuery(''); navigate(path) }
  const total = results.patients.length + results.referrals.length + results.bills.length

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A'

  return (
    <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-border/50 bg-card/70 px-4 backdrop-blur-xl md:px-8">
      {/* Mobile hamburger */}
      <div className="flex items-center gap-4 md:hidden">
        <button onClick={onMenuClick} className="rounded-xl p-2.5 text-muted-foreground bg-card border border-border shadow-sm transition-all active:scale-95">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div ref={searchBoxRef} className="relative hidden flex-1 max-w-2xl md:block">
        <div className="group relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-emerald-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patients, referrals, bills..."
            className="h-12 w-full rounded-2xl border border-border bg-muted/30/50 pl-12 pr-12 text-[15px] text-foreground placeholder-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          />
          <div className="absolute right-4 flex items-center gap-1 opacity-50 transition-opacity group-focus-within:opacity-0 pointer-events-none">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">⌘</kbd>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">K</kbd>
          </div>
        </div>
        
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-[calc(100%+8px)] z-50 w-full max-h-[26rem] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-2xl"
            >
              {total > 0 ? (
                <>
                  {results.patients.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600/70">Patients</p>
                      {results.patients.map(p => (
                        <button key={p.id} onClick={() => goTo(`/admin/patients/${p.id}`)} className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-all hover:bg-muted/30 focus:bg-muted/30 focus:outline-none">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{p.full_name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{p.uh_id}</span>
                              <span>•</span>
                              <span>{p.mobile}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.referrals.length > 0 && (
                    <div className="mb-2 border-t border-border pt-2">
                      <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-orange-600/70">Referrals</p>
                      {results.referrals.map(r => (
                        <button key={r.id} onClick={() => goTo('/admin/referrals')} className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-all hover:bg-muted/30 focus:bg-muted/30 focus:outline-none">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 group-hover:bg-orange-100">
                            <ArrowLeftRight className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="font-semibold text-foreground">{r.patient_name}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">{r.from_department_name}</span>
                          </div>
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">{r.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.bills.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-purple-600/70">Bills</p>
                      {results.bills.map(b => (
                        <button key={b.id} onClick={() => goTo('/admin/billing')} className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-all hover:bg-muted/30 focus:bg-muted/30 focus:outline-none">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 group-hover:bg-purple-100">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="font-semibold text-foreground">{b.bill_no}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">{b.patient_name}</span>
                          </div>
                          <span className="text-sm font-bold text-foreground">₹{b.total_amount}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 text-muted-foreground mb-3">
                    <Search className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">We couldn't find anything matching "{query}"</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {/* Notification bell */}
        <div ref={notifBoxRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen)
              if (!notifOpen) {
                // Mark all as read when opening
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
              }
            }}
            className="relative rounded-full p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors bg-card border border-border shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 border-2 border-card text-[9px] font-bold text-white shadow-sm">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-80 rounded-2xl border border-border bg-card p-0 shadow-2xl origin-top-right overflow-hidden flex flex-col max-h-[24rem]"
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                  <span className="font-bold text-foreground">Notifications</span>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Clear All</button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((n) => (
                        <div key={n.id} className={`flex flex-col gap-1 rounded-xl p-3 text-sm transition-colors ${n.read ? 'bg-transparent' : 'bg-emerald-50/50 dark:bg-emerald-950/20'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(n.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-tight">{n.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div ref={profileBoxRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 rounded-full border border-border bg-card p-1 pr-4 shadow-sm transition-all hover:bg-muted/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-sm font-bold text-emerald-800 shadow-inner">
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-bold text-foreground leading-tight">{user?.full_name}</p>
              <p className="text-[11px] font-medium text-emerald-600">{user?.role_name}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl origin-top-right"
              >
                <div className="flex items-center gap-3 border-b border-border px-3 pb-3 pt-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-lg font-bold text-emerald-800">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{user?.full_name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{user?.email}</span>
                  </div>
                </div>

                <div className="py-2">
                  <button onClick={() => { setProfileOpen(false); navigate('/admin/profile') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-emerald-600 transition-colors">
                    <UserIcon className="h-4 w-4" />
                    My Profile
                  </button>
                  <button onClick={() => { setProfileOpen(false); navigate('/admin/profile') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-emerald-600 transition-colors">
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </button>
                </div>
                
                <div className="border-t border-border pt-2">
                  <button
                    onClick={async () => { setProfileOpen(false); await logout(); navigate('/login') }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

// ─── Main Layout ────────────────────────────────────────────────────
export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const { token, user } = useAuth()

  useEffect(() => {
    if (!token || !user) return

    // Only allow websocket connection for roles that handle live appointment notifications
    const allowedRoles = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST']
    if (!allowedRoles.includes(user.role_name)) return

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Token travels in the Sec-WebSocket-Protocol subprotocol header instead
    // of the URL query string, so the JWT never lands in access logs.
    const wsUrl = `${wsProto}//${window.location.host}/ws`
    
    const ws = new WebSocket(wsUrl, [`ahms.${token}`])
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'NEW_APPOINTMENT') {
          // Play a simple beep sound using Web Audio API
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.setValueAtTime(800, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
            gain.gain.setValueAtTime(0.5, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start()
            osc.stop(ctx.currentTime + 0.2)
          } catch (e) { /* ignore audio error */ }

          setNotifications(prev => [{
            id: Date.now(),
            title: 'New Appointment',
            message: `Token ${data.token_number} for ${data.patient_name} on ${data.appointment_date}`,
            time: new Date().toISOString(),
            read: false
          }, ...prev])

          toast.success(`New Appointment Booked`, {
            description: `Token ${data.token_number} for ${data.patient_name} on ${data.appointment_date}`,
          })
          window.dispatchEvent(new CustomEvent('appointment_updated'))
        } else if (data.type === 'appointment_updated') {
          // Status changed on the appointment board — let open lists refresh.
          window.dispatchEvent(new CustomEvent('appointment_updated'))
        } else if (data.type === 'encounter_created' || data.type === 'encounter_updated') {
          // Status or queue changed on the live Token Board
          window.dispatchEvent(new CustomEvent('encounter_updated'))
        }
      } catch (e) {
        console.error('WebSocket parse error:', e)
      }
    }

    return () => {
      // Only close if the socket finished opening; closing a still-connecting
      // socket (e.g. StrictMode double-mount) can throw in the browser.
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
    }
  }, [token])

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30/50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col relative">
        {/* Optional subtle background gradient */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-white to-transparent pointer-events-none -z-10" />
        
        <Topbar onMenuClick={() => setMenuOpen(v => !v)} notifications={notifications} setNotifications={setNotifications} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AdminProtected({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role_name === 'PATIENT') return <Navigate to="/portal" replace />
  return <>{children}</>
}

