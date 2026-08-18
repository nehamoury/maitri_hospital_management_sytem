import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { heroTextVariants, fadeUp, staggerContainer } from '../../design-system/animations'
import heroBg1 from '../../assets/maitri_ayurveda_hero.png'
import heroBg2 from '../../assets/hero_treatment_room.png'
import heroBg3 from '../../assets/hero_herbal_garden.png'

import { HeroStatistics } from './HeroStatistics'

const heroImages = [heroBg1, heroBg2, heroBg3]

export function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className="relative w-full flex flex-col justify-center overflow-hidden pt-28 pb-12 min-h-screen"
    >
      {/* Animated Carousel Background */}
      <div className="absolute inset-0 z-0 bg-foreground">
        {heroImages.map((src, index) => (
          <motion.img
            key={src}
            src={src}
            initial={false}
            animate={{
              opacity: currentImageIndex === index ? 1 : 0,
              scale: currentImageIndex === index ? 1 : 1.05
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            alt={`Hero Background ${index + 1}`}
            style={{ pointerEvents: 'none' }}
          />
        ))}
      </div>

      {/* Dark gradient overlay for text readability (Warm/Teal blend for sunset image) */}
      <div
        className="absolute inset-0 z-0"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to right, rgba(10,35,30,0.95) 0%, rgba(15,35,30,0.6) 40%, rgba(0,0,0,0.1) 100%)'
        }}
      />

      {/* Soft vignette on edges */}
      <div
        className="absolute inset-0 z-0"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          boxShadow: 'inset 0 0 150px rgba(0,0,0,0.6)'
        }}
      />

      {/* Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full container-page"
      >
        <div className="max-w-3xl">
          <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: '#14B8A6' }}>
              NABH ACCREDITED • EST. 1984
            </span>
          </motion.div>

          <motion.h1
            variants={heroTextVariants}
            className="text-4xl md:text-[3.5rem] lg:text-[4.2rem] font-bold leading-[1.05] tracking-tighter mb-5"
            style={{ fontFamily: "'Outfit', 'Inter', sans-serif", color: '#ffffff' }}
          >
            Ancient healing,<br />
            delivered with<br />
            modern precision.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base md:text-lg max-w-2xl leading-relaxed mb-6 font-medium"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Eight specialty departments, dedicated Panchakarma suites and an
            in-house research centre — all built around one thing: your long-term balance.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
            <a
              href="/appointment"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold transition-all duration-300"
              style={{
                background: '#0F766E',
                color: '#ffffff',
                boxShadow: '0 4px 24px rgba(15,118,110,0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#14B8A6'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,118,110,0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0F766E'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(15,118,110,0.4)'
              }}
            >
              Book Appointment →
            </a>
            <a
              href="tel:1800123456"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold transition-all duration-300"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <svg className="mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Emergency 1800 123 456
            </a>
          </motion.div>
        </div>

        {/* Stats Bar (Inside Content Flow for Responsiveness) */}
        <div className="mt-8 w-full max-w-[1200px]">
          <HeroStatistics />
        </div>
      </motion.div>
    </div>
  )
}
