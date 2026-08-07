import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, Star } from 'lucide-react'
import { LinkButton } from '../../design-system/Buttons'
import { PageHero, Section } from '../../design-system/Layout'
import { Reveal } from '../../components/site/Reveal'
import { SEO } from '../../components/SEO'
import { fetchDoctors, fetchDepartments } from '../../lib/public-site'

export default function Doctors() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('All')
  const [deptNames, setDeptNames] = useState<string[]>(['All'])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      .catch(() => {})
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

  const list = useMemo(
    () =>
      doctors.filter(
        (d) =>
          (dept === 'All' || d.department.toLowerCase() === dept.toLowerCase()) &&
          (d.name + d.title + d.department).toLowerCase().includes(q.toLowerCase())
      ),
    [q, dept, doctors]
  )

  return (
    <>
      <SEO 
        title="Find a Doctor | Maitri Ayurveda"
        description="Browse Ayurvedic physicians by department, experience and availability. Book a consultation online."
      />

      <PageHero
        title="Find the right specialist for your condition."
        subtitle="Every consultant here holds an MD or MS in Ayurveda and practises full-time on campus."
        tag="Our Physicians"
        breadcrumb={[{ label: 'Home' }, { label: 'Doctors' }]}
      />

      <Section bg="ivory">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-12">
          <div className="relative w-full lg:max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or specialty"
              className="w-full rounded-full pl-10 pr-5 py-3 text-sm outline-none border border-border focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-card shadow-sm text-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {deptNames.slice(0, 9).map((t) => (
              <button
                key={t}
                onClick={() => handleDeptChange(t)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  dept.toLowerCase() === t.toLowerCase()
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'border-border text-muted-foreground hover:border-border bg-card hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border shadow-sm rounded-3xl p-7">
                <div className="skeleton h-14 w-14 rounded-2xl mb-5" />
                <div className="skeleton h-4 w-3/4 rounded-lg mb-3" />
                <div className="skeleton h-3 w-1/2 rounded-lg mb-6" />
                <div className="skeleton h-3 w-full rounded-lg mb-2" />
                <div className="skeleton h-3 w-5/6 rounded-lg" />
              </div>
            ))
          ) : (
            list.map((d, i) => (
              <Reveal key={d.slug} delay={i * 50}>
                <article className="bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex h-full flex-col rounded-3xl p-7 relative">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-700 text-white grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-[family-name:var(--font-display)] text-lg font-semibold shadow-inner">
                      {d.name.split(" ")[1]?.[0]}
                      {d.name.split(" ")[2]?.[0] || d.name.split(" ")[1]?.[1]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg leading-tight font-bold text-foreground">{d.name}</h2>
                      <p className="text-[#14B8A6] mt-1 text-[10px] font-bold tracking-wider uppercase">
                        {d.department}
                      </p>
                    </div>
                  </div>

                  <p className="text-muted-foreground mt-5 text-sm leading-relaxed flex-1">
                    {d.title}
                  </p>

                  <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs font-medium">
                    <Clock className="h-3.5 w-3.5 shrink-0" /> {d.availability}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-primary flex items-center gap-1.5 text-xs font-bold">
                      <Star className="h-3.5 w-3.5 fill-current text-[#C8A14D]" /> {d.rating} · {d.experience} yrs
                    </span>
                    <LinkButton to={`/doctors/${d.slug}`} variant="primary" size="sm" className="rounded-full text-xs font-semibold px-4">
                      Profile
                    </LinkButton>
                  </div>
                </article>
              </Reveal>
            ))
          )}
        </div>

        {!loading && list.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No doctors found matching that search.</p>
          </div>
        )}
      </Section>
    </>
  )
}
