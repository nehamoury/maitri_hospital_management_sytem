import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Award, BookOpen, GraduationCap, Star, ShieldAlert, Languages, Clock } from 'lucide-react'
import { PageHero, Section } from '../../design-system/Layout'
import { LinkButton } from '../../design-system/Buttons'
import { fetchDoctors } from '../../lib/public-site'
import { SEO } from '../../components/SEO'
import { Reveal } from '../../components/site/Reveal'

export default function DoctorDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchDoctors()
      .then((docs) => {
        if (!active) return
        setD(docs.find((doc) => doc.slug === slug || doc.id === slug) || null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [slug])

  if (loading) {
    return (
      <>
        <SEO title="Doctor Profile | Maitri Ayurveda" />
        <PageHero title="Loading profile..." tag="Our Physicians" />
        <Section>
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="skeleton h-8 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-1/2 rounded-lg" />
              <div className="skeleton h-32 w-full rounded-2xl" />
            </div>
            <div className="skeleton h-64 w-full rounded-3xl" />
          </div>
        </Section>
      </>
    )
  }

  if (!d) {
    return (
      <>
        <SEO title="Doctor Not Found | Maitri Ayurveda" />
        <PageHero title="Doctor Not Found" subtitle="The doctor profile you are looking for does not exist." />
        <Section>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-red-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Profile Unavailable</h2>
            <p className="text-muted-foreground mb-6 max-w-md">We couldn't find a doctor with the URL slug "{slug}". Please check the spelling or search our complete team list.</p>
            <LinkButton to="/doctors" variant="primary" size="md">
              View All Doctors
            </LinkButton>
          </div>
        </Section>
      </>
    )
  }

  return (
    <>
      <SEO 
        title={`${d.name} | ${d.department} Specialist`}
        description={`${d.title} in the ${d.department} department. Experience: ${d.experience} years. Availability: ${d.availability}.`}
      />

      <div className="relative overflow-hidden bg-slate-900 pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Decorative background glows */}
        <div className="absolute top-0 left-1/4 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center md:items-start gap-10 z-10 text-white animate-fade-up">
          {/* Doctor Image Container */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-tr from-teal-500 to-[#C8A14D] opacity-40 blur-lg transition duration-1000 group-hover:opacity-70 group-hover:duration-200" />
            {d.image ? (
              <img
                src={d.image}
                alt={d.name}
                className="relative h-32 w-32 md:h-36 md:w-36 rounded-[1.75rem] object-cover border-2 border-white/20 shadow-2xl transition duration-500 hover:scale-[1.02]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="relative bg-gradient-to-tr from-teal-800 to-emerald-700 border-2 border-white/20 text-white grid h-32 w-32 md:h-36 md:w-36 place-items-center rounded-[1.75rem] font-display text-4xl font-bold shadow-2xl">
                {d.name.split(" ")[1]?.[0]}
                {d.name.split(" ")[2]?.[0] || d.name.split(" ")[1]?.[1]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-grow text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {d.department}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold md:text-5xl lg:text-6xl text-white tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {d.name}
            </h1>
            <p className="mt-3 text-emerald-200/80 text-lg md:text-xl font-medium max-w-3xl leading-relaxed">
              {d.title}
            </p>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-sm">
              <span className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center font-medium shadow-inner">
                <Star className="mr-2 h-4 w-4 text-[#C8A14D] fill-current" />
                {d.rating} Rating
              </span>
              <span className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center font-medium shadow-inner">
                <Clock className="mr-2 h-4 w-4 text-teal-400" />
                {d.experience} Years Experience
              </span>
              <span className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center font-medium shadow-inner">
                <span className="mr-2 font-semibold text-emerald-400">₹</span>
                {d.fee} Consultation
              </span>
            </div>
          </div>
          <div className="md:ml-auto self-center shrink-0 mt-6 md:mt-0">
            <LinkButton to={`/appointment?dept=${encodeURIComponent(d.department)}&doc=${d.id}`} variant="gold" size="lg" className="rounded-full shadow-lg hover:shadow-gold/20 hover:-translate-y-0.5 transition-all">
              Book Appointment
            </LinkButton>
          </div>
        </div>
      </div>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div>
            {/* About Section */}
            <Reveal>
              <h2 className="text-2xl font-semibold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>About</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">{d.bio}</p>
            </Reveal>

            {/* Experience Section */}
            <Reveal className="mt-14">
              <h2 className="text-2xl font-semibold text-foreground mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>Experience & education</h2>
              <div className="grid gap-4">
                {[
                  { icon: GraduationCap, t: "MD / MS (Ayurveda) Specialization", s: "Academically certified specialist in Ayurvedic sciences" },
                  { icon: Award, t: `Senior consultant, ${d.department} — Maitri Ayurveda`, s: `${d.experience} years` },
                  { icon: BookOpen, t: "18 peer-reviewed publications", s: "AYUSH & integrative journals" },
                ].map((r, idx) => (
                  <div key={idx} className="bg-card border border-border shadow-sm flex gap-4 rounded-2xl p-6 hover:shadow-md transition-shadow">
                    <r.icon className="text-[#14B8A6] mt-0.5 h-6 w-6 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.t}</p>
                      <p className="text-muted-foreground mt-1 text-xs">{r.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Patient Reviews Section */}
            <Reveal className="mt-14">
              <h2 className="text-2xl font-semibold text-foreground mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>Patient reviews</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { n: "R. Mehta", t: "Explained my prakriti in plain language and never rushed the consultation." },
                  { n: "S. Fernandes", t: "Follow-ups over video have been consistent and genuinely helpful." }
                ].map((rev, idx) => (
                  <div key={idx} className="bg-card border border-border shadow-sm rounded-2xl p-6">
                    <div className="flex gap-1 text-[#C8A14D] mb-4">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">“{rev.t}”</p>
                    <p className="text-xs font-semibold text-muted-foreground">{rev.n}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* FAQ Section */}
            <Reveal className="mt-14">
              <h2 className="text-2xl font-semibold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>FAQ</h2>
              <div className="mt-4 space-y-2">
                {[
                  { q: "What should I bring to the first consultation?", a: "Any recent reports, current medication and a short note on your symptom timeline." },
                  { q: "Are video consultations available?", a: "Yes, on the same schedule as in-person slots. You will receive a secure link after booking." },
                  { q: "How long is a follow-up?", a: "Typically 15 minutes, scheduled two to four weeks after the first visit." },
                ].map((f, idx) => (
                  <details key={idx} className="group bg-card border border-border/60 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between p-5 text-sm font-semibold text-foreground cursor-pointer list-none select-none hover:bg-muted/30 transition-colors">
                      <span>{f.q}</span>
                      <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-200">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </span>
                    </summary>
                    <div className="p-5 pt-0 text-muted-foreground text-sm leading-relaxed border-t border-border bg-muted/30/50">
                      {f.a}
                    </div>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right Side Sidebar */}
          <div>
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              {/* Availability Box */}
              <div className="bg-card border border-border shadow-sm rounded-3xl p-7">
                <h3 className="text-sm font-bold tracking-wide uppercase text-foreground mb-4">Availability</h3>
                <div className="space-y-3">
                  <p className="text-muted-foreground flex items-start gap-2 text-sm">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {d.availability}
                  </p>
                  <p className="text-muted-foreground flex items-start gap-2 text-sm">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {d.languages?.join(', ') || 'English, Hindi, Sanskrit'}
                  </p>
                </div>
                <LinkButton to={`/appointment?dept=${encodeURIComponent(d.department)}&doc=${d.id}`} variant="primary" size="md" className="mt-6 w-full text-center block rounded-full">
                  Book a slot
                </LinkButton>
              </div>

              {/* Help Desk Box */}
              <div className="bg-muted/30 border border-border rounded-3xl p-7">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Need help choosing a specialist? Our care desk responds within 15 minutes on weekdays.
                </p>
                <LinkButton to="/contact" variant="secondary" size="md" className="mt-5 w-full text-center block rounded-full">
                  Contact care desk
                </LinkButton>
              </div>
            </aside>
          </div>
        </div>
      </Section>
    </>
  )
}
