import { motion } from 'framer-motion'
import { fadeUp } from '../../design-system/animations'
import { useEffect, useState } from 'react'

// Simple counter animation hook for numbers
function useCounter(end: number, duration: number = 2) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      
      setCount(Math.floor(easeProgress * end))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      }
    }
    
    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return count
}

function StatItem({ value, label, suffix = '' }: { value: number, label: string, suffix?: string }) {
  const count = useCounter(value, 2.5)
  
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-bold" style={{ color: '#0F172A', fontFamily: "'Poppins', sans-serif" }}>
        {count}{suffix}
      </span>
      <span className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: '#64748B' }}>
        {label}
      </span>
    </div>
  )
}

export function HeroStatistics() {
  return (
    <motion.div
      variants={fadeUp}
      className="hidden md:flex absolute bottom-0 right-8 lg:right-16 translate-y-1/2 z-30"
    >
      <div 
        className="rounded-3xl p-8 flex items-center gap-12 shadow-[0_20px_60px_rgba(15,118,110,0.15)]"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        <StatItem value={42} suffix="+" label="Years" />
        <StatItem value={120} suffix="K" label="Patients" />
        <StatItem value={80} suffix="+" label="Doctors" />
        <StatItem value={96} suffix="%" label="Success" />
      </div>
    </motion.div>
  )
}

// Mobile version that scrolls horizontally
export function HeroStatisticsMobile() {
  return (
    <motion.div
      variants={fadeUp}
      className="md:hidden w-full overflow-x-auto pb-4 mt-12 scrollbar-hide"
    >
      <div className="flex gap-4 px-4 w-max">
        {[
          { value: 42, suffix: '+', label: 'Years' },
          { value: 120, suffix: 'K', label: 'Patients' },
          { value: 80, suffix: '+', label: 'Doctors' },
          { value: 96, suffix: '%', label: 'Success' },
        ].map((stat, i) => (
          <div 
            key={i}
            className="rounded-2xl p-5 w-32 flex-shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span className="block text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {stat.value}{stat.suffix}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
