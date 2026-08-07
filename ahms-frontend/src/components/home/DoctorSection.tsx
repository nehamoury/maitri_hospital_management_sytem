import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DoctorCard, DoctorSkeleton } from '../../design-system/Cards'
import { staggerContainer, fadeUp, viewportOpts } from '../../design-system/animations'
import { Section } from '../../design-system/Layout'

interface Doctor {
  id: string
  full_name: string
  department_name?: string
  specialization?: string
  qualification?: string
  experience_years?: number
  consultation_fee?: number
}

// Temporary images for the mockup
const drImages = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=256&h=256',
  'https://images.unsplash.com/photo-1594824436951-7f1267da4c1e?auto=format&fit=crop&q=80&w=256&h=256',
  'https://images.unsplash.com/photo-1537368910025-702800faa86b?auto=format&fit=crop&q=80&w=256&h=256',
]

export function DoctorSection({ doctors }: { doctors: Doctor[] | null }) {
  return (
    <Section bg="transparent">
      <div className="flex flex-col items-center text-center mb-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          <div className="text-xs font-bold uppercase tracking-widest text-[#0F766E] mb-3">
            Head of Departments
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Meet our senior physicians
          </h2>
          <Link 
            to="/doctors"
            className="inline-flex items-center justify-center rounded-full border border-[#0F766E]/20 bg-card px-6 py-3 text-sm font-semibold text-[#0F766E] shadow-sm hover:border-[#0F766E] hover:bg-[#0F766E] hover:text-white transition-all duration-300"
          >
            View all doctors
          </Link>
        </motion.div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOpts}
      >
        {!doctors ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <DoctorSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {doctors.slice(0, 4).map((d, i) => (
              <DoctorCard 
                key={d.id} 
                {...d} 
                image={drImages[i % drImages.length]}
                rating={4.8 + (Math.random() * 0.2)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </Section>
  )
}
