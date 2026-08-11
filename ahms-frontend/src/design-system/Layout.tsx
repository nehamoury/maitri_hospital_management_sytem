import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp, staggerContainer, viewportOpts } from './animations'

// ─── Section Container ────────────────────────────────────────────────────────
interface SectionProps {
  children: ReactNode
  className?: string
  id?: string
  bg?: 'white' | 'ivory' | 'green' | 'dark' | 'transparent'
}

const bgStyles: Record<string, string> = {
  white:       'bg-white',
  ivory:       'bg-white',
  green:       'bg-[#0F766E]',
  dark:        'bg-[#0F172A]',
  transparent: '',
}

export function Section({ children, className = '', id, bg = 'transparent' }: SectionProps) {
  return (
    <section id={id} className={`py-16 md:py-24 lg:py-[120px] ${bgStyles[bg]} ${className}`}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        {children}
      </div>
    </section>
  )
}

export function SectionNarrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-3xl ${className}`}>
      {children}
    </div>
  )
}

// ─── Section Title ────────────────────────────────────────────────────────────
interface SectionTitleProps {
  tag?: string
  title: string
  subtitle?: string
  center?: boolean
  light?: boolean
}

export function SectionTitle({ tag, title, subtitle, center = true, light = false }: SectionTitleProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOpts}
      className={`mb-14 ${center ? 'text-center' : ''}`}
    >
      {tag && (
        <div className={`inline-flex items-center gap-2 mb-4`}>
          <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
          <span className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#C8A14D', letterSpacing: '0.2em' }}>
            {tag}
          </span>
          <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
        </div>
      )}
      <h2
        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
        style={{
          fontFamily: "'Poppins', sans-serif",
          color: light ? '#FFFFFF' : '#0F172A',
          lineHeight: '1.15',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ color: light ? 'rgba(255,255,255,0.75)' : '#64748B' }}>
          {subtitle}
        </p>
      )}
      {center && (
        <div className="mt-5 section-divider" />
      )}
    </motion.div>
  )
}

// ─── Page Hero ────────────────────────────────────────────────────────────────
interface PageHeroProps {
  title: string
  subtitle?: string
  tag?: string
  bgImage?: string
}

export function PageHero({ title, subtitle, tag, bgImage }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden"
      style={{
        paddingTop: '120px',
        paddingBottom: '80px',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: bgImage
            ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 118, 110, 0.8)), url(${bgImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0F172A 0%, #0F766E 60%, #14B8A6 100%)',
        }}
      />
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

      {/* Decorative circles */}
      <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #C8A14D, transparent)' }} />
      <div className="absolute -left-12 bottom-0 w-64 h-64 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #14B8A6, transparent)' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center pt-8 md:pt-12">

        {tag && (
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C8A14D' }}>
              {tag}
            </span>
            <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
          </div>
        )}

        <motion.h1
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 flex flex-wrap justify-center gap-x-4 gap-y-2 drop-shadow-lg"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {title.split(' ').map((word, i) => (
            <motion.span
              key={i}
              variants={fadeUp}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #d1fae5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: '#ffffff', // fallback
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </div>
  )
}

// ─── Info Section ──────────────────────────────────────────────────────────────
interface InfoSectionProps {
  title: string
  subtitle?: string
  content: ReactNode
  imageSrc?: string
  reverse?: boolean
}

export function InfoSection({ title, subtitle, content, imageSrc, reverse = false }: InfoSectionProps) {
  return (
    <Section>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
        <motion.div
          initial={{ opacity: 0, x: reverse ? 30 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOpts}
          className={reverse ? 'lg:order-2' : 'lg:order-1'}
        >
          <SectionTitle title={title} subtitle={subtitle} center={false} />
          <div className="prose prose-lg text-slate-600 prose-p:leading-relaxed max-w-none">
            {content}
          </div>
        </motion.div>
        
        {imageSrc && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOpts}
            className={reverse ? 'lg:order-1' : 'lg:order-2'}
          >
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-lg">
              <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[6px] border-white/10 rounded-3xl pointer-events-none" />
            </div>
          </motion.div>
        )}
      </div>
    </Section>
  )
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
interface FeatureCardProps {
  title: string
  description: string
  icon?: string
}

export function FeatureCards({ features }: { features: FeatureCardProps[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          transition={{ delay: i * 0.1 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-600 to-amber-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          {feature.icon && (
            <div className="text-4xl mb-6 bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center">
              {feature.icon}
            </div>
          )}
          <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {feature.title}
          </h3>
          <p className="text-slate-600 leading-relaxed">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
interface CTASectionProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function CTASection({ title, subtitle, children }: CTASectionProps) {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-br from-teal-800 to-teal-950 text-white my-16 mx-4 md:mx-8 lg:mx-auto max-w-5xl rounded-[2.5rem] shadow-2xl border border-teal-700/50">
      {/* Decorations */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-10 blur-3xl bg-white pointer-events-none" />
      <div className="absolute -left-10 -bottom-20 w-72 h-72 rounded-full opacity-30 blur-3xl bg-teal-600 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          <motion.p variants={fadeUp} className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-4 text-teal-200/90">
            Begin Your Healing Journey
          </motion.p>
          <motion.h2 variants={fadeUp}
            className="text-3xl md:text-4xl lg:text-4xl font-bold mb-5 leading-tight text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}>
            {title}
          </motion.h2>
          {subtitle && (
            <motion.p variants={fadeUp} className="text-base md:text-lg mb-10 text-teal-100/80 max-w-xl mx-auto font-medium">
              {subtitle}
            </motion.p>
          )}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            {children}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ message, icon = '🌿' }: { message: string; icon?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-base" style={{ color: '#64748B' }}>{message}</p>
    </motion.div>
  )
}

// ─── Full Page Spinner ────────────────────────────────────────────────────────
export function FullSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative h-12 w-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-t-[#0F766E] border-[#E2E8F0] animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-t-[#C8A14D] border-transparent animate-spin"
          style={{ animationDuration: '0.6s', animationDirection: 'reverse' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: '#64748B' }}>{label}</p>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = 'green' | 'gold' | 'red' | 'blue' | 'gray'
const badgeStyles: Record<BadgeColor, React.CSSProperties> = {
  green: { background: 'rgba(15,118,110,0.10)', color: '#0F766E' },
  gold:  { background: 'rgba(200,161,77,0.12)',  color: '#C8A14D' },
  red:   { background: 'rgba(220,38,38,0.08)',   color: '#DC2626' },
  blue:  { background: 'rgba(59,130,246,0.08)',  color: '#3B82F6' },
  gray:  { background: 'rgba(100,116,139,0.08)', color: '#64748B' },
}

export function Badge({ children, color = 'green' }: { children: ReactNode; color?: BadgeColor }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={badgeStyles[color]}>
      {children}
    </span>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #C8A14D)' }} />
      <span className="text-xl">🌿</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #C8A14D, transparent)' }} />
    </div>
  )
}
