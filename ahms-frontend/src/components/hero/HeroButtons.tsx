import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeUp } from '../../design-system/animations'

export function HeroButtons() {
  return (
    <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-10">
      <Link to="/book">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group relative px-8 py-4 rounded-2xl overflow-hidden font-semibold text-white shadow-[0_8px_32px_rgba(15,118,110,0.4)]"
          style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}
        >
          {/* Button Glow effect */}
          <div className="absolute inset-0 bg-card opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          
          <span className="flex items-center gap-2">
            Book Appointment
            <motion.span
              className="inline-block"
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              →
            </motion.span>
          </span>
        </motion.button>
      </Link>

      <Link to="/contact">
        <motion.button
          whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.15)' }}
          whileTap={{ scale: 0.97 }}
          className="group px-8 py-4 rounded-2xl font-semibold text-white transition-colors duration-300 backdrop-blur-md"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="text-[#14B8A6]">📞</span>
            Emergency
          </span>
        </motion.button>
      </Link>
    </motion.div>
  )
}
