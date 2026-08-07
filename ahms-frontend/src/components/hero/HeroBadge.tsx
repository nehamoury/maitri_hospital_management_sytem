import { motion } from 'framer-motion'
import { fadeUp } from '../../design-system/animations'

export function HeroBadge() {
  return (
    <motion.div
      variants={fadeUp}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="w-2 h-2 rounded-full bg-[#C8A14D] animate-pulse" />
      <span className="text-xs font-semibold tracking-wider text-white uppercase">
        NABH Accredited • Est. 1984
      </span>
    </motion.div>
  )
}
