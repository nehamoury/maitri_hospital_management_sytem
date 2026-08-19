import { Link } from 'react-router-dom'
import { ArrowUp, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
}
function InstagramIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
}
function LinkedinIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
}
function YoutubeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" /></svg>
}

const socialIcons = [FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon]



const groups = [
  {
    title: 'Hospital',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/facilities', label: 'Facilities' },
      { to: '/research', label: 'Research & Education' },
      { to: '/careers', label: 'Careers' },
    ],
  },
  {
    title: 'Care',
    links: [
      { to: '/departments', label: 'Departments' },
      { to: '/doctors', label: 'Find a Doctor' },
      { to: '/treatments', label: 'Treatments' },
      { to: '/panchakarma', label: 'Panchakarma' },
    ],
  },
  {
    title: 'Patients',
    links: [
      { to: '/appointment', label: 'Book Appointment' },
      { to: '/portal/login', label: 'Patient Portal' },
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Contact' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="bg-foreground text-background/80 relative mt-0 overflow-hidden">
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        className="text-white block w-full"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,72 L1440,0 L0,0 Z"
        />
      </svg>

      <div className="container-page pt-8 pb-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-secondary text-foreground grid h-11 w-11 place-items-center rounded-2xl">
                <Leaf className="h-6 w-6" />
              </span>
              <span className="text-background font-[family-name:var(--font-display)] text-xl font-semibold">
                Maitri Ayurveda
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              A NABH-accredited Ayurvedic hospital blending 5,000-year-old classical medicine with
              modern diagnostics, research and hospitality.
            </p>
            <form
              className="mt-6 flex max-w-[260px]"
              onSubmit={(e) => {
                e.preventDefault()
                  ; (e.currentTarget as HTMLFormElement).reset()
              }}
            >
              <Input
                type="email"
                required
                placeholder="Email for health letters"
                className="border-background/20 text-background placeholder:text-background/50 bg-transparent rounded-r-none focus-visible:z-10"
              />
              <Button type="submit" variant="secondary" className="shrink-0 rounded-l-none">
                Join
              </Button>
            </form>
            <div className="mt-6 flex gap-3">
              {socialIcons.map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="border-background/20 hover:bg-background/10 grid h-9 w-9 place-items-center rounded-full border transition-colors"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link Groups */}
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-background text-sm font-semibold tracking-[0.16em] uppercase">
                {g.title}
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-secondary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-background/15 mt-12 flex flex-col gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Maitri Ayurveda Hospital. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy" className="hover:text-secondary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-secondary">
              Terms &amp; Conditions
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-secondary inline-flex items-center gap-1.5"
            >
              <ArrowUp className="h-3.5 w-3.5" /> Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
