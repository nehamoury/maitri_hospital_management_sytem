import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, Star, Bookmark, SlidersHorizontal, ChevronDown, PhoneCall, GraduationCap, Calendar } from 'lucide-react'
import { LinkButton } from '../../design-system/Buttons'
import { PageHero, Section } from '../../design-system/Layout'
import { Reveal } from '../../components/site/Reveal'
import { SEO } from '../../components/SEO'
import { fetchDoctors, fetchDepartments } from '../../lib/public-site'
import herbsImg from '../../assets/herbs.jpg'

function getShortDeptName(name: string): string {
  const mapping: Record<string, string> = {
    'Prasuti Tantra Evam Stri Roga': 'Prasuti & Stri Roga',
    'Agad Tantra Evam Vidhi Vaidyaka': 'Agad Tantra',
    'Kaumarbhritya (Bal Roga)': 'Kaumarbhritya',
    'Rasashastra & Bhaishajya Kalpana': 'Rasashastra',
    'General Ayurveda Consultation': 'General Consult',
    'Swasthavritta & Yoga': 'Swasthavritta',
  }
  return mapping[name] || name
}

export default function Doctors() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('All')
  const [deptNames, setDeptNames] = useState<string[]>(['All'])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('experience')
  const [savedDoctors, setSavedDoctors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    Promise.all([fetchDoctors(), fetchDepartments()])
      .then(([docList, deptList]) => {
        if (!active) return
        setDoctors(docList)
        const names = ['All', ...deptList.map((d) => d.name)]
        setDeptNames(names)
        const urlDept = searchParams.get('dept')
        if (urlDept && names.some((n) => n.toLowerCase() === urlDept.toLowerCase())) {
          setDept(names.find((n) => n.toLowerCase() === urlDept.toLowerCase())!)
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeptChange = (newDept: string) => {
    setDept(newDept)
    if (newDept === 'All') {
      searchParams.delete('dept')
    } else {
      searchParams.set('dept', newDept)
    }
    setSearchParams(searchParams)
  }

  const toggleSaveDoctor = (slug: string) => {
    setSavedDoctors(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }))
  }

  const list = useMemo(() => {
    let filtered = doctors.filter(
      (d) =>
        (dept === 'All' || d.department.toLowerCase() === dept.toLowerCase()) &&
        (d.name + d.title + d.department).toLowerCase().includes(q.toLowerCase())
    )

    if (sortBy === 'experience') {
      filtered.sort((a, b) => b.experience - a.experience)
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating)
    }

    return filtered
  }, [q, dept, doctors, sortBy])

  return (
    <>
      <SEO
        title="Our Ayurvedic Doctors | Maitri Ayurveda"
        description="Browse Ayurvedic physicians by department, experience and availability. Book a consultation online."
      />

      {/* Hero Banner Section */}
      <PageHero
        tag="Our Experts"
        title="Our Ayurvedic Doctors"
        subtitle="Meet our experienced physicians dedicated to your holistic healing and wellness."
        bgImage={herbsImg}
      />

      <Section bg="ivory" className="!py-12">
        {/* Search, Filter Pill & Sort controls */}
        <div className="flex flex-col gap-6 mb-10 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:max-w-md">
              <Search className="text-slate-400 absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search doctors by name, department..."
                className="w-full rounded-full pl-12 pr-6 py-3.5 text-sm outline-none border border-slate-200 dark:border-border focus:border-teal-700 focus:ring-1 focus:ring-teal-700 bg-card text-foreground shadow-sm transition-all hover:shadow-md"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative shrink-0 flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Sort by:
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-card border border-slate-200 dark:border-border rounded-full py-2 pl-4 pr-10 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-700 shadow-sm cursor-pointer hover:shadow-md"
                >
                  <option value="experience">Experience</option>
                  <option value="rating">Rating</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Filter Buttons / Pills (Scrollable horizontally on mobile, wrapped on tablet/desktop) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none md:flex-wrap md:overflow-visible md:pb-0">
            {deptNames.map((t) => {
              const isActive = dept.toLowerCase() === t.toLowerCase()
              return (
                <button
                  key={t}
                  onClick={() => handleDeptChange(t)}
                  className={`rounded-full border px-5 py-2.5 text-xs font-semibold tracking-wide transition-all shrink-0 ${isActive
                    ? 'bg-teal-800 text-white border-teal-800 shadow-sm'
                    : 'border-slate-200 dark:border-border text-slate-600 dark:text-slate-300 hover:border-slate-300 bg-card hover:text-slate-900'
                    }`}
                >
                  {t === 'All' ? 'All Departments' : getShortDeptName(t)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Doctor Grid */}
        <div className="grid gap-6 md:grid-cols-2 max-w-6xl mx-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-slate-100 dark:border-border shadow-sm rounded-3xl p-7 flex gap-6">
                <div className="skeleton h-24 w-24 rounded-full shrink-0" />
                <div className="space-y-4 flex-1">
                  <div className="skeleton h-5 w-1/2 rounded-lg" />
                  <div className="skeleton h-4 w-1/3 rounded-lg" />
                  <div className="skeleton h-4 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-5/6 rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            list.map((d, i) => {
              const isSaved = !!savedDoctors[d.slug]
              const initials = d.name.split(" ").slice(1).map((n: string) => n[0]).join("").toUpperCase() || 'Dr'
              return (
                <Reveal key={`${d.slug}-${d.id || i}`} delay={i * 50}>
                  <article className="bg-card border border-slate-200/80 dark:border-border/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl p-6 relative flex flex-col justify-between h-full group">

                    {/* Save/Bookmark Button */}
                    <button
                      onClick={() => toggleSaveDoctor(d.slug)}
                      className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-700 transition-colors"
                      title={isSaved ? "Saved" : "Save Profile"}
                    >
                      <Bookmark className={`h-4.5 w-4.5 ${isSaved ? 'fill-teal-700 text-teal-700' : 'text-slate-400'}`} />
                    </button>

                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      {/* Avatar Image or Initial Circle */}
                      <div className="shrink-0 mx-auto sm:mx-0">
                        <DoctorAvatar src={d.image} name={d.name} initials={initials} />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{d.name}</h2>
                        <p className="text-teal-800 dark:text-teal-400 text-xs font-bold tracking-wider mt-0.5">
                          {getShortDeptName(d.department)} Specialist
                        </p>

                        {/* Experience and Rating */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
                          <span className="text-[#C8A14D] font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 fill-current text-[#C8A14D]" /> {d.rating.toFixed(1)} Rating
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className="text-teal-800 dark:text-teal-400 font-bold flex items-center gap-1">
                            🌱 {d.experience}+ Years Experience
                          </span>
                        </div>

                        {/* Qualification Degrees */}
                        <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-slate-600 dark:text-slate-200 text-xs font-semibold">
                          <GraduationCap className="h-4 w-4 text-teal-700 shrink-0" />
                          <span>{d.title}</span>
                        </div>

                        {/* Timing / Schedule */}
                        <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                          <Clock className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                          <span>{d.availability || 'Mon – Sat · 09:00 – 16:00'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row (Department Tag on left, Buttons on right) */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-border/60">
                      {/* Department Tag */}
                      <span className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-full px-3.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 tracking-wider">
                        {getShortDeptName(d.department)}
                      </span>

                      {/* Action buttons side-by-side */}
                      <div className="flex items-center gap-2">
                        <LinkButton
                          to={`/doctors/${d.slug}`}
                          variant="secondary"
                          size="sm"
                          className="text-xs font-semibold rounded-lg border-slate-200 dark:border-border text-slate-700 dark:text-slate-200 px-4 py-2"
                        >
                          👤 View Profile
                        </LinkButton>
                        <LinkButton
                          to={`/appointment?dept=${encodeURIComponent(d.department)}&doc=${d.id}`}
                          variant="primary"
                          size="sm"
                          className="text-xs font-semibold rounded-lg px-4 py-2"
                        >
                          <Calendar className="h-3.5 w-3.5 inline mr-1" /> Book Appointment
                        </LinkButton>
                      </div>
                    </div>

                  </article>
                </Reveal>
              )
            })
          )}
        </div>

        {!loading && list.length === 0 && (
          <div className="text-center py-20 max-w-[1440px] mx-auto">
            <p className="text-slate-500 text-base">No doctors found matching that search filter.</p>
          </div>
        )}

        {/* Bottom CTA Team Banner */}
        <div className="max-w-[1440px] mx-auto mt-16 px-4">
          <div className="bg-[#f0f5f2] dark:bg-card border border-teal-800/10 dark:border-border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              <div className="h-12 w-12 rounded-full bg-teal-800 text-white flex items-center justify-center shrink-0">
                <LeafIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Can't find the right doctor?</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
                  Our care team is here to help you find the perfect specialist.
                </p>
              </div>
            </div>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-800/20 dark:border-border bg-card px-6 py-3 text-sm font-semibold text-teal-800 dark:text-teal-300 shadow-sm hover:bg-teal-800 hover:text-white transition-all duration-300 whitespace-nowrap"
            >
              <PhoneCall className="h-4 w-4" /> Talk to Our Care Team
            </a>
          </div>
        </div>
      </Section>
    </>
  )
}

function LeafIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58-1 9.8a7 7 0 0 1-7 8.2z" />
      <path d="M9 22v-4" />
    </svg>
  )
}

function DoctorAvatar({ src, name, initials }: { src?: string; name: string; initials: string }) {
  const [error, setError] = useState(false)

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        className="h-20 w-20 rounded-full object-cover border border-slate-100 dark:border-border"
      />
    )
  }

  return (
    <div className="h-20 w-20 rounded-full bg-teal-800 text-white flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-bold shadow-inner">
      {initials}
    </div>
  )
}

