import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

const statsData = [
  { value: 42, suffix: '+', label: 'Years of practice' },
  { value: 120, suffix: 'K', label: 'Patients treated' },
  { value: 80, suffix: '+', label: 'Physicians & therapists' },
  { value: 96, suffix: '%', label: 'Patient satisfaction' },
]

function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (isInView) {
      let start = 0
      const duration = 1400 // ms matching Lovable's 1400 duration
      const tick = (t: number) => {
        if (!start) start = t
        const p = Math.min((t - start) / duration, 1)
        setCount(Math.round(value * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [value, isInView])

  return <span ref={ref}>{count}</span>
}

export function HeroStatistics() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.7 }}
      className="glass-panel w-full rounded-3xl p-6 md:p-8 grid grid-cols-2 gap-6 md:grid-cols-4 text-left"
    >
      {statsData.map((stat, i) => (
        <div key={i} className="flex flex-col items-start justify-center">
          <p 
            className="text-primary font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl"
          >
            <AnimatedNumber value={stat.value} />{stat.suffix}
          </p>
          <p className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
            {stat.label}
          </p>
        </div>
      ))}
    </motion.div>
  )
}
