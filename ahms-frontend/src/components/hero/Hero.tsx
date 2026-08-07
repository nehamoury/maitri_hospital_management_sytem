import { motion } from 'framer-motion'
import { HeroBackground } from './HeroBackground'
import { HeroBadge } from './HeroBadge'
import { HeroButtons } from './HeroButtons'
import { HeroStatistics, HeroStatisticsMobile } from './HeroStatistics'
import { staggerContainer, fadeUp } from '../../design-system/animations'

export function Hero() {
  return (
    <section className="relative w-full h-[85vh] md:h-[90vh] lg:h-[95vh] xl:h-[100vh] flex items-center mb-16 md:mb-24">
      {/* Background layer */}
      <HeroBackground />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-0">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          {/* Badge */}
          <HeroBadge />

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            className="mt-6 font-bold leading-[1.1] text-white"
            style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            Ancient Healing,<br />
            <span style={{ color: '#14B8A6' }}>Delivered with</span><br />
            Modern Precision.
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg sm:text-xl leading-relaxed text-white/80 max-w-2xl"
          >
            Experience authentic Ayurvedic treatments tailored to your unique mind-body constitution in our NABH-accredited luxury facility.
          </motion.p>

          {/* Buttons */}
          <HeroButtons />

          {/* Mobile Statistics (shows inside flow on mobile) */}
          <HeroStatisticsMobile />
        </motion.div>
      </div>

      {/* Desktop/Tablet Statistics (absolute positioned overlapping next section) */}
      <HeroStatistics />
      
      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-20"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">Scroll</span>
        <div className="w-[1px] h-12 bg-card/20 relative overflow-hidden">
          <motion.div 
            className="w-full h-1/2 bg-card/80 absolute top-0"
            animate={{ y: [0, 48, 0] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
