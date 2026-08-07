// ─── Framer Motion Animation Variants ───────────────────────────────────────
// Import from here in every component for consistent motion across the site.
import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const fadeLeft: Variants = {
  hidden:  { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeRight: Variants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1,  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

export const staggerContainerFast: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const cardHover: Variants = {
  rest:  { y: 0, boxShadow: '0 4px 24px rgba(15,118,110,0.10)' },
  hover: { y: -8, boxShadow: '0 20px 60px rgba(15,118,110,0.18)', transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

export const drawerVariants: Variants = {
  closed: { x: '100%', transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  open:   { x: '0%',  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

export const backdropVariants: Variants = {
  closed: { opacity: 0 },
  open:   { opacity: 1, transition: { duration: 0.3 } },
}

export const navLinkVariants: Variants = {
  rest:  { scaleX: 0, originX: 0 },
  hover: { scaleX: 1, originX: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export const buttonTap = { scale: 0.96, transition: { duration: 0.1 } }

export const heroTextVariants: Variants = {
  hidden:  { opacity: 0, y: 60, filter: 'blur(12px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
  },
}

export const floatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
  },
}

export const viewportOpts = { once: true, margin: '-80px' }
