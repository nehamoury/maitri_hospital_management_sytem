import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DepartmentCard, DepartmentSkeleton, StaggerGrid } from '../../design-system/Cards'
import { PageHero, Section, EmptyState } from '../../design-system/Layout'
import { fadeUp } from '../../design-system/animations'
import { fetchDepartments } from '../../lib/public-site'
import heroBg from '../../assets/hero_treatment_room.png'

interface Department {
  id: string
  code: string
  name: string
  type: string
  description: string
  default_fee: number
  doctor_count: number
}

const deptIcons: Record<string, string> = {
  kayachikitsa: '🫀', panchakarma: '🌿', shalya: '🔬',
  prasuti: '👶', kaumarabhritya: '🌸', rasayana: '✨',
  netra: '👁️', shalakya: '👂', swasthavritta: '🧘', default: '🌱',
}

function getDeptIcon(name: string): string {
  const lower = name.toLowerCase()
  return Object.entries(deptIcons).find(([k]) => lower.includes(k))?.[1] ?? deptIcons.default
}

// Static Ayurvedic department descriptions
const deptDescriptions: Record<string, string> = {
  'Kayachikitsa': 'General Ayurvedic medicine for internal diseases. Treats chronic conditions through diet, herbs and Panchakarma.',
  'Panchakarma': 'The five classical detoxification therapies that purify and rejuvenate the body at a deep cellular level.',
  'Shalya Tantra': 'Ayurvedic surgery and para-surgical procedures for wound management, fistula, and ano-rectal disorders.',
  'Prasuti & Stri Roga': 'Women\'s health including obstetrics, gynecology, and post-natal care through Ayurvedic principles.',
  'Kaumarabhritya': 'Pediatric Ayurvedic care — from neonatal wellness to adolescent health using classical formulations.',
  'Rasayana & Rejuvenation': 'Anti-aging, immunity and vitality treatments using traditional Rasayana herbs and therapies.',
}

const deptSubtitles: Record<string, string> = {
  'Kayachikitsa': 'INTERNAL MEDICINE',
  'Panchakarma': 'DETOX & REJUVENATION',
  'Shalya Tantra': 'AYURVEDIC SURGERY',
  'Prasuti & Stri Roga': "WOMEN'S HEALTH",
  'Kaumarabhritya': 'PAEDIATRICS',
  'Rasayana & Rejuvenation': 'WELLNESS & ANTI-AGING',
}

const deptTreatments: Record<string, string[]> = {
  'Kayachikitsa': ['Diabetes Care', 'Arthritis', 'Digestive Disorders'],
  'Panchakarma': ['Vamana', 'Virechana', 'Basti', 'Nasya'],
  'Shalya Tantra': ['Ksharasutra', 'Agnikarma', 'Piles & Fistula'],
  'Prasuti & Stri Roga': ['Garbha Sanskar', 'PCOS Care', 'Postnatal Care'],
  'Kaumarabhritya': ['Suvarnaprashan', 'Immunity Care', 'Growth Support'],
  'Rasayana & Rejuvenation': ['Shirodhara', 'Rasayana Therapy', 'Anti-Aging'],
}

const deptSpecialists: Record<string, number> = {
  'Kayachikitsa': 14, 'Panchakarma': 11, 'Shalya Tantra': 8,
  'Prasuti & Stri Roga': 9, 'Kaumarabhritya': 6, 'Rasayana & Rejuvenation': 7,
}

function getDeptSubtitle(name: string): string {
  const lower = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(deptSubtitles)) {
    if (lower.includes(k.toLowerCase().replace(/\s+/g, ''))) return v;
  }
  return 'SPECIALTY CARE'
}

function getDeptTreatments(name: string): string[] {
  const lower = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(deptTreatments)) {
    if (lower.includes(k.toLowerCase().replace(/\s+/g, ''))) return v;
  }
  if (lower.includes('general') || lower.includes('nadi')) return ['Nadi Pariksha', 'Diet Plan', 'Consultation'];
  return [];
}

function getDeptSpecialists(name: string, backendCount: number): number {
  // Backend count is authoritative when present (even 0 means no doctors).
  if (backendCount !== undefined) return backendCount;
  const lower = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(deptSpecialists)) {
    if (lower.includes(k.toLowerCase().replace(/\s+/g, ''))) return v;
  }
  return 5;
}

export default function Departments() {
  const [depts, setDepts] = useState<Department[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    fetchDepartments()
      .then((deptList) => {
        if (!active) return
        if (deptList.length > 0) {
          setDepts(
            deptList.map((d) => ({
              id: d.id || d.slug,
              code: d.code || '',
              name: d.name,
              type: d.type || 'OPD',
              description: d.description || deptDescriptions[d.name] || 'Specialized Ayurvedic care with traditional treatments and modern diagnostics.',
              default_fee: d.default_fee ?? 0,
              doctor_count: d.doctor_count ?? 0,
            }))
          )
        } else {
          // Fallback: show known departments statically
          setDepts(Object.entries(deptDescriptions).map(([name, description], i) => ({
            id: `static_${i}`,
            code: '',
            name,
            type: 'OPD',
            description,
            default_fee: 0,
            doctor_count: deptSpecialists[name] ?? 0,
          })))
        }
      })
      .catch(() => {
        setError('Could not load departments. Please try again later.')
      })
    return () => { active = false }
  }, [])

  const filtered = depts?.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHero
        title="Our Departments"
        subtitle="Specialized Ayurvedic departments staffed by experienced practitioners for comprehensive holistic care."
        tag="Specialized Care"
        bgImage={heroBg}
      />

      <Section>
        {/* Search Bar */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="max-w-xl mx-auto mb-14"
        >
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18"
              viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-2xl pl-12 pr-5 py-4 text-sm outline-none bg-card border border-primary/15 text-foreground shadow-soft focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-sans"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        {error ? (
          <EmptyState message={error} icon="⚠️" />
        ) : !depts ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <DepartmentSkeleton key={i} />)}
          </div>
        ) : filtered && filtered.length === 0 ? (
          <EmptyState message={`No departments found for "${search}"`} icon="🔍" />
        ) : (
          <>
            {search && filtered && (
              <motion.p variants={fadeUp} initial="hidden" animate="visible"
                className="text-sm text-center mb-8 text-muted-foreground">
                Showing {filtered.length} department{filtered.length !== 1 ? 's' : ''} for <strong>"{search}"</strong>
              </motion.p>
            )}
            <StaggerGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(filtered ?? depts).map(d => (
                <DepartmentCard
                  key={d.id}
                  {...d}
                  fee={d.default_fee}
                  icon={getDeptIcon(d.name)}
                  subtitle={getDeptSubtitle(d.name)}
                  treatments={getDeptTreatments(d.name)}
                  specialists={getDeptSpecialists(d.name, d.doctor_count)}
                />
              ))}
            </StaggerGrid>
          </>
        )}
      </Section>

      {/* Bottom CTA */}
      <section className="py-16 bg-card">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible"
            className="text-3xl font-bold mb-3 font-[family-name:var(--font-display)] text-foreground">
            Not sure which department?
          </motion.h2>
          <motion.p variants={fadeUp} initial="hidden" whileInView="visible"
            className="text-base mb-8 text-muted-foreground">
            Book a general consultation and our doctors will guide you to the right department.
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible">
            <a href="/appointment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground shadow-soft hover:shadow-lift transition-all">
              Book a General Consultation
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
