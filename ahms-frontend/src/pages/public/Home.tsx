import { useEffect, useState } from 'react'

import { Hero } from '../../components/home/Hero'

import { DepartmentSection } from '../../components/home/DepartmentSection'
import { PanchakarmaSection } from '../../components/home/PanchakarmaSection'
import { DoctorSection } from '../../components/home/DoctorSection'
import { TestimonialCard, FeatureCard, StaggerGrid } from '../../design-system/Cards'
import { SectionTitle, Section } from '../../design-system/Layout'
import { LinkButton } from '../../design-system/Buttons'
import { blogs, testimonials } from '../../lib/site-data'
import { fetchDoctors, fetchDepartments, fetchTreatments, type PublicTreatment } from '../../lib/public-site'
import herbsImg from '../../assets/herbs.jpg'


interface Doctor {
  id: string; full_name: string; department_name: string
  specialization: string; qualification: string
  experience_years: number; consultation_fee: number; is_active: boolean
}
interface Department {
  id: string; name: string; description: string; is_active: boolean
}

// Fallback when backend has no data yet
const fallbackDepts: Department[] = [
  { id: 'f1', name: 'Kayachikitsa', description: 'General Ayurvedic medicine treating internal diseases through herbs, diet and Panchakarma.', is_active: true },
  { id: 'f2', name: 'Panchakarma', description: 'Classical five-fold detoxification and rejuvenation therapies for whole-body purification.', is_active: true },
  { id: 'f3', name: 'Shalya Tantra', description: 'Ayurvedic surgical and para-surgical procedures for wound management and ano-rectal disorders.', is_active: true },
  { id: 'f4', name: 'Prasuti & Stri Roga', description: "Women's health, obstetrics and gynecology through Ayurvedic principles.", is_active: true },
  { id: 'f5', name: 'Kaumarabhritya', description: 'Pediatric Ayurvedic care from neonatal wellness to adolescent health.', is_active: true },
  { id: 'f6', name: 'Rasayana & Rejuvenation', description: 'Anti-aging, immunity and vitality using traditional Rasayana herbs.', is_active: true },
]

export default function Home() {
  const [departments, setDepartments] = useState<Department[] | null>(null)
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [treatments, setTreatments] = useState<PublicTreatment[]>([])

  useEffect(() => {
    let active = true
    Promise.all([fetchDoctors(), fetchDepartments(), fetchTreatments()])
      .then(([docList, deptList, treatmentList]) => {
        if (!active) return
        setDoctors(
          docList.slice(0, 4).map((d) => ({
            id: d.id || d.slug,
            full_name: d.name,
            department_name: d.department,
            specialization: d.title,
            qualification: '',
            experience_years: d.experience,
            consultation_fee: d.fee,
            is_active: true,
          }))
        )
        setDepartments(
          deptList.length > 0
            ? deptList.slice(0, 8).map((d) => ({
                id: d.id || d.slug,
                name: d.name,
                description: d.description,
                doctor_count: d.doctor_count ?? 0,
                is_active: true,
              }))
            : fallbackDepts
        )
        setTreatments(treatmentList)
      })
      .catch(() => {
        setDepartments(fallbackDepts)
        setDoctors([])
        setTreatments([])
      })
    return () => { active = false }
  }, [])

  return (
    <div className="bg-card">
      <Hero />

      <div className="pt-12 md:pt-16">
        <DepartmentSection departments={departments} />
      </div>

      <PanchakarmaSection />

      <Section bg="white">
        <SectionTitle
          tag="Our Philosophy"
          title="Why Choose Maitri Ayurveda?"
          subtitle="We blend 5,000 years of Ayurvedic tradition with modern clinical excellence to deliver personalized, whole-person healthcare."
        />
        <StaggerGrid className="grid gap-6 md:grid-cols-3">
          {[
            { icon: '🌿', title: 'Authentic Ayurveda', desc: 'Panchakarma, Rasayana and classical formulations practiced by qualified BAMS/MD Ayurvedic physicians.' },
            { icon: '🧬', title: 'Whole-Person Care', desc: 'Treatment plans addressing your Prakriti, dosha balance, diet (Pathya) and lifestyle — not just symptoms.' },
            { icon: '💻', title: 'Modern Infrastructure', desc: 'Digital health records, streamlined appointments, and a complete care timeline — Ayurveda for the 21st century.' },
          ].map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </StaggerGrid>
      </Section>

      <DoctorSection doctors={doctors} />

      {/* Treatments Section */}
      <Section bg="dark" className="text-white">
        <SectionTitle
          tag="Therapies"
          title="Treatments we are known for"
          subtitle="Explore our comprehensive range of specialized Ayurvedic therapies."
          light={true}
        />
        <div className="grid gap-px overflow-hidden rounded-3xl bg-card/10 sm:grid-cols-2 lg:grid-cols-4">
          {treatments.slice(0, 8).map((t) => (
            <div key={t.name} className="bg-[#0F172A] hover:bg-teal-950/40 p-7 transition-colors">
              <p className="text-[#14B8A6] text-xs tracking-wide uppercase font-semibold">{t.dept}</p>
              <h3 className="text-white mt-3 text-lg font-semibold">{t.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              <p className="mt-5 text-xs text-muted-foreground font-medium">{t.duration}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section bg="ivory">
        <SectionTitle
          tag="Patient Stories"
          title="Real Healing, Real Lives"
          subtitle="Hear from patients whose lives have been transformed through authentic Ayurvedic care."
        />
        <StaggerGrid className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} name={t.name} city={t.city} quote={t.text} rating={5} treatment="" />
          ))}
        </StaggerGrid>
      </Section>

      {/* Blog Section */}
      <Section bg="white">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C8A14D]" style={{ letterSpacing: '0.2em' }}>
              Journal
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mt-2 text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Health letters
            </h2>
          </div>
          <LinkButton to="/blog" variant="secondary" size="sm" className="rounded-full">
            Read the blog
          </LinkButton>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {blogs.slice(0, 3).map((b) => (
            <article key={b.slug} className="bg-card shadow-sm border border-border hover:shadow-md hover:-translate-y-1 transition-all duration-300 rounded-3xl p-7 flex flex-col h-full">
              <p className="text-[#C8A14D] text-xs tracking-wide uppercase font-semibold">{b.category}</p>
              <h3 className="mt-3 text-lg font-bold text-foreground leading-snug">{b.title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed flex-1">{b.excerpt}</p>
              <p className="text-muted-foreground mt-6 text-xs font-medium">
                {b.author} · {b.read} read
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="pb-12">
        <div className="gradient-hero text-primary-foreground relative overflow-hidden rounded-[2.5rem] px-8 py-16 md:px-16 shadow-[0_20px_50px_rgba(15,118,110,0.25)]">
          <img
            src={herbsImg}
            alt=""
            aria-hidden
            loading="lazy"
            width={1600}
            height={1008}
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div className="relative max-w-2xl text-left">
            <h2 className="text-3xl font-bold md:text-5xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Start with a 30-minute consultation.
            </h2>
            <p className="mt-5 opacity-90 text-base md:text-lg leading-relaxed">
              Share your history, get a dosha assessment and leave with a written plan — in person
              or over video.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <LinkButton to="/appointment" variant="gold" size="lg" className="rounded-full">
                Book now
              </LinkButton>
              <LinkButton to="/contact" variant="glass" size="lg" className="rounded-full">
                Talk to us
              </LinkButton>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
