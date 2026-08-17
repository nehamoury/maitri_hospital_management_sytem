import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUp, viewportOpts } from '../../design-system/animations'
import panchakarmaImg from '../../assets/images/panchakarma.jpg'
import { Section } from '../../design-system/Layout'

export function PanchakarmaSection() {
  return (
    <Section bg="ivory" className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        
        {/* Left Image */}
        <motion.div 
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          className="w-full lg:w-1/2 relative group"
        >
          <div className="overflow-hidden rounded-[40px] shadow-[0_20px_40px_rgba(15,118,110,0.15)] aspect-[4/3] lg:aspect-square w-full relative z-10">
            <img 
              src={panchakarmaImg} 
              alt="Panchakarma Treatment" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
          {/* Decorative backdrop */}
          <div className="absolute -left-6 -bottom-6 w-full h-full rounded-[40px] border-2 border-teal-700/20 dark:border-teal-500/20 z-0 transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2" />
        </motion.div>

        {/* Right Content */}
        <motion.div 
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          className="w-full lg:w-1/2"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400 mb-3">
            Signature Programme
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-[1.15]" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Panchakarma,<br />supervised end to end
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            A physician-designed 7 to 28 day detox pathway with daily assessment, in-house pharmacy support and residential suites overlooking the herb garden.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {[
              'Physician-led daily rounds',
              'Classical herbal formulations',
              'Residential suites',
              'Diet & yoga integration'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 text-teal-750 dark:text-teal-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{feature}</span>
              </div>
            ))}
          </div>

          <Link 
            to="/appointment" 
            className="inline-flex items-center justify-center rounded-full bg-teal-700 hover:bg-teal-650 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-700/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            Explore Panchakarma
          </Link>
        </motion.div>

      </div>
    </Section>
  )
}
