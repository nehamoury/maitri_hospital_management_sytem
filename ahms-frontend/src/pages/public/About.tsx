import { Award, Building2, HeartPulse, Quote, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHero, Section } from '../../design-system/Layout'
import { fadeUp, viewportOpts } from '../../design-system/animations'
import { SEO } from '../../components/SEO'

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOpts}
      transition={{ delay: delay / 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const timeline = [
  { year: '1984', text: 'Founded as a 20-bed clinic by Vaidya R. Sharma in the old city.' },
  { year: '1996', text: 'First dedicated Panchakarma wing with eight therapy suites.' },
  { year: '2005', text: 'Research centre established in collaboration with a state university.' },
  { year: '2013', text: 'NABH accreditation and expansion to a 220-bed campus.' },
  { year: '2019', text: 'Ayurveda postgraduate teaching programme launched.' },
  { year: '2026', text: 'Digital patient portal and teleconsultation across 14 countries.' },
]

const awards = [
  'NABH Accredited Hospital',
  'AYUSH Excellence Award 2024',
  'Best Panchakarma Centre — South Zone',
  'ISO 9001:2015 Certified',
  'Green Campus Certification',
  'Top Ayurveda Employer 2025',
]

const stats = [
  { value: '42', suffix: '+', label: 'Years of Trust' },
  { value: '15k', suffix: '+', label: 'Patients Treated' },
  { value: '220', suffix: '', label: 'Bed Capacity' },
  { value: '8', suffix: '', label: 'Specialty Depts' },
]

export default function About() {
  return (
    <>
      <SEO
        title="About Us | Our Story & Mission"
        description="Four decades of Ayurvedic care: our story, mission, chairman's message, milestones, awards and infrastructure."
      />

      <PageHero
        tag="Since 1984"
        title="A hospital built around the patient, not the procedure."
        subtitle="What began as a twenty-bed clinic is now a 220-bed teaching hospital — still run by physicians, still guided by the classical texts."
      />

      <Section>
        <div className="grid gap-14 lg:grid-cols-2 items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C8A14D] mb-3">Our story</p>
            <h2 className="text-3xl font-bold md:text-4xl text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Forty-two years of continuity
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground text-lg">
              Vaidya R. Sharma opened the first clinic with two therapy rooms and a hand-written
              register. The register is still in the lobby. Everything else — the diagnostics, the
              pharmacy, the research wing — grew around the same principle: treat the person, follow
              the text, measure the outcome.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground text-lg">
              Today the campus houses eight specialty departments, an in-house GMP pharmacy, a
              four-acre medicinal herb garden and a postgraduate teaching programme.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <img
              src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"
              alt="Ayurvedic herbs and brass mortar"
              loading="lazy"
              className="w-full rounded-[2rem] object-cover shadow-xl hover:-translate-y-2 transition-transform duration-500"
              style={{ aspectRatio: '4/3' }}
            />
          </Reveal>
        </div>
      </Section>

      <Section bg="ivory">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Target, title: 'Mission', text: 'Deliver authentic Ayurvedic care with measurable outcomes, at a standard families trust for a lifetime.' },
            { icon: HeartPulse, title: 'Vision', text: 'To be the reference institution where classical Ayurveda and modern evidence meet without compromise.' },
            { icon: Building2, title: 'Values', text: 'Shastra-first practice, transparent pricing, unhurried consultations and lifelong follow-up.' },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 90} className="h-full">
              <div className="bg-card shadow-sm border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full rounded-3xl p-8">
                <span className="flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-50 text-primary mb-6">
                  <c.icon className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{c.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section bg="transparent" className="bg-[#022C22] !py-12 lg:!py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 50}>
              <div className="text-center">
                <p className="text-4xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", color: '#34d399' }}>
                  {s.value}
                  {s.suffix}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-wider uppercase text-white/60">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
          {awards.map((a, i) => (
            <Reveal key={a} delay={i * 50}>
              <div className="flex items-center gap-3 rounded-xl bg-card/5 border border-white/10 px-4 py-3.5 hover:bg-card/10 transition-colors">
                <Award className="text-[#C8A14D] h-5 w-5 shrink-0" />
                <span className="text-white/90 text-sm font-medium">{a}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8A14D] mb-3">Milestones</p>
          <h2 className="text-3xl font-bold md:text-4xl text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            How the campus grew
          </h2>
        </Reveal>
        <div className="border-l-2 border-border mt-14 pl-8 ml-4 md:ml-0">
          {timeline.map((t, i) => (
            <Reveal key={t.year} delay={i * 70}>
              <div className="relative pb-12">
                <span className="absolute top-1.5 -left-[41px] h-4 w-4 rounded-full bg-teal-600 ring-4 ring-white" />
                <p className="text-xl font-bold text-primary" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {t.year}
                </p>
                <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed text-lg">
                  {t.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <div className="bg-card shadow-md border border-border rounded-[2.5rem] p-8 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full opacity-50 -translate-y-1/2 translate-x-1/3" />
            <Quote className="text-[#C8A14D] h-12 w-12 relative z-10" />
            <blockquote className="mt-8 max-w-4xl text-2xl leading-relaxed text-foreground relative z-10" style={{ fontFamily: "'Poppins', sans-serif" }}>
              “We never wanted the largest hospital. We wanted the one where a patient is remembered
              by name ten years after discharge. That is still the measure we hold ourselves to.”
            </blockquote>
            <p className="mt-8 text-sm text-muted-foreground relative z-10">
              <span className="font-bold text-foreground">Dr. Nandini Sharma</span> · Chairperson
              &amp; Managing Trustee
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
