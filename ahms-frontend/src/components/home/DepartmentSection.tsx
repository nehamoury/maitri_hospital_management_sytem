import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DepartmentCard, DepartmentSkeleton } from '../../design-system/Cards'
import { staggerContainer, fadeUp, viewportOpts } from '../../design-system/animations'
import { Section } from '../../design-system/Layout'

interface Department {
  id: string; name: string; description: string; is_active?: boolean; doctor_count?: number
  code?: string; type?: string; default_fee?: number
}

const deptIcons: Record<string, string> = {
  'kayachikitsa': '🫀', 'panchakarma': '🌿', 'shalya': '🔬',
  'prasuti': '👶', 'kaumarabhritya': '🌸', 'rasayana': '✨',
  'default': '🌱',
}
const deptSubtitles: Record<string, string> = {
  'kayachikitsa': 'INTERNAL MEDICINE', 'panchakarma': 'DETOX & REJUVENATION', 'shalya tantra': 'AYURVEDIC SURGERY',
  'prasuti & stri roga': "WOMEN'S HEALTH", 'kaumarabhritya': 'PAEDIATRICS', 'rasayana & rejuvenation': 'WELLNESS & ANTI-AGING',
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

function getDeptIcon(name: string): string {
  const lower = name.toLowerCase()
  return Object.entries(deptIcons).find(([k]) => lower.includes(k))?.[1] ?? deptIcons.default
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
function getDeptSpecialists(name: string, backendCount?: number): number {
  // Backend count is authoritative when present (even 0 means no doctors).
  if (backendCount !== undefined) return backendCount;
  const lower = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, v] of Object.entries(deptSpecialists)) {
    if (lower.includes(k.toLowerCase().replace(/\s+/g, ''))) return v;
  }
  return 5;
}

export function DepartmentSection({ departments }: { departments: Department[] | null }) {
  return (
    <Section bg="white">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          <div className="text-xs font-bold uppercase tracking-widest text-[#0F766E] mb-3">
            Centres of Excellence
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A]" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Specialty departments<br />rooted in classical texts
          </h2>
        </motion.div>
        
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          <Link 
            to="/departments"
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground hover:border-[#0F766E] hover:text-[#0F766E] transition-all duration-300"
          >
            All departments
          </Link>
        </motion.div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOpts}
      >
        {!departments ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <DepartmentSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {departments.slice(0, 8).map((d) => (
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
          </div>
        )}
      </motion.div>
    </Section>
  )
}

