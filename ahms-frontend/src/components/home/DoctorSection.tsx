import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { DoctorCard, DoctorSkeleton } from '../../design-system/Cards'
import { staggerContainer, fadeUp, viewportOpts } from '../../design-system/animations'
import { Section } from '../../design-system/Layout'
import { AutoScrollCarousel } from '../../design-system/Carousel'

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
          <div className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400 mb-3">
            Head of Departments
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Meet our senior physicians
          </h2>
          <Link 
            to="/doctors"
            className="inline-flex items-center justify-center rounded-full border border-teal-700/20 dark:border-teal-500/20 bg-card px-6 py-3 text-sm font-semibold text-teal-700 dark:text-teal-400 shadow-sm hover:border-teal-600 hover:bg-teal-700 hover:text-white transition-all duration-300"
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
        className="w-full"
      >
        {!doctors ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => <DoctorSkeleton key={i} />)}
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6 lg:-mx-12">
            <AutoScrollCarousel speed="slow" gap="gap-6" className="py-4">
              {doctors.map((d, i) => (
                <div key={d.id} className="w-[260px] sm:w-[280px]">
                  <DoctorCard 
                    {...d} 
                    image={(d as any).image || drImages[i % drImages.length]}
                    rating={4.8 + (Math.random() * 0.2)}
                  />
                </div>
              ))}
            </AutoScrollCarousel>
          </div>
        )}
      </motion.div>
    </Section>
  )
}
