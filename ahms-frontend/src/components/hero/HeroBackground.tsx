import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface HeroBackgroundProps {
  imageSrc?: string
}

export function HeroBackground({ imageSrc }: HeroBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  
  // Parallax effect on scroll
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  
  // Use provided image or a fallback premium placeholder
  const bgImage = imageSrc || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=2073&auto=format&fit=crop'

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#0F172A]">
      <motion.div
        className="absolute inset-0"
        style={{ y }}
        initial={{ scale: 1.1, filter: 'brightness(1.1)' }}
        animate={{ scale: 1, filter: 'brightness(1)' }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        {/* The actual image with slow Ken Burns effect happening continuously if desired, 
            or just the initial settle + scroll parallax. We'll do a subtle continuous scale. */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
        
        {/* Gradient Overlays */}
        {/* 1. Base dark overlay 45-60% */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* 2. Left side darker gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        
        {/* 3. Bottom gradient to blend into the next section */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90" />
      </motion.div>
    </div>
  )
}
