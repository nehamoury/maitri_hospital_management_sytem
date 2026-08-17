import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'
import { cardHover, staggerContainer, fadeUp, viewportOpts } from './animations'

// ─── Department Card ──────────────────────────────────────────────────────────
interface DepartmentCardProps {
  name: string
  description: string
  icon?: string
  id?: string
  code?: string
  type?: string
  fee?: number
  subtitle?: string
  specialists?: number
  treatments?: string[]
}

export function DepartmentCard({ name, description, subtitle, code, type, fee, specialists = 5 }: DepartmentCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
      className="group relative overflow-hidden rounded-3xl bg-card text-card-foreground flex flex-col h-full border border-primary/10 shadow-soft hover:shadow-lift transition-all duration-300 hover:border-primary/25"
    >
      <div className="p-8 flex flex-col h-full">
        {/* Top: Icon + code badge */}
        <div className="mb-6 flex-shrink-0 flex items-start justify-between">
          <div className="h-12 w-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          {code && (
            <span className="rounded-md px-2 py-1 text-[10px] font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">
              {code}
            </span>
          )}
        </div>

        {/* Text Details */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-xl font-bold leading-tight font-[family-name:var(--font-display)] text-foreground">
            {name}
          </h3>

          {(type || subtitle) && (
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
              {type && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                  {type}
                </span>
              )}
              {subtitle && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                  {subtitle}
                </span>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed mb-8 flex-1 text-muted-foreground">
            {(() => {
              let displayDesc = description || 'Specialized Ayurvedic care with traditional treatments and modern diagnostics.';
              try {
                if (description && description.trim().startsWith('{')) {
                  const parsed = JSON.parse(description);
                  if (parsed && parsed.descriptionText) {
                    displayDesc = parsed.descriptionText;
                  }
                }
              } catch (e) {
                // ignore
              }
              return displayDesc;
            })()}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {specialists} specialists
            </span>
            {fee != null && fee > 0 && (
              <span className="text-xs font-bold text-foreground">
                ₹{fee.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Full card clickable link */}
      <Link to={`/doctors?dept=${encodeURIComponent(name)}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Specialists in {name}</span>
      </Link>
    </motion.div>
  )
}




// ─── Department Skeleton ──────────────────────────────────────────────────────
export function DepartmentSkeleton() {
  return (
    <div className="rounded-3xl bg-card p-7 overflow-hidden relative shadow-soft border border-primary/10">
      <div className="skeleton h-14 w-14 rounded-2xl mb-5" />
      <div className="skeleton h-5 w-3/4 rounded-lg mb-3" />
      <div className="skeleton h-3 w-full rounded-lg mb-2" />
      <div className="skeleton h-3 w-5/6 rounded-lg mb-5" />
      <div className="skeleton h-4 w-36 rounded-lg" />
    </div>
  )
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
interface DoctorCardProps {
  full_name: string
  department_name?: string
  specialization?: string
  qualification?: string
  experience_years?: number
  consultation_fee?: number
  image?: string
  rating?: number
  slug?: string
}

export function DoctorCard({ full_name, department_name, specialization, qualification, experience_years, image, rating = 4.8, slug }: DoctorCardProps) {
  const initials = full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const computedSlug = slug || full_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative rounded-3xl bg-card text-card-foreground overflow-hidden p-8 flex flex-col h-full cursor-pointer border border-primary/10 shadow-soft hover:shadow-lift transition-all duration-300 hover:border-primary/25"
    >
      {/* Top Left Avatar */}
      <div className="mb-6 flex-shrink-0">
        {image ? (
          <img src={image} alt={full_name} className="h-16 w-16 rounded-2xl object-cover shadow-md" />
        ) : (
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold bg-primary text-primary-foreground shadow-md">
            {initials}
          </div>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-bold mb-1 font-[family-name:var(--font-display)] text-foreground">
          {full_name}
        </h3>

        <p className="text-sm font-medium mb-4 text-muted-foreground">
          {qualification && `${qualification.split(',')[0]} — `}
          <span className="text-foreground">{specialization || department_name || 'Consultant'}</span>
        </p>

        <div className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Mon - Sat · 09:00 - 16:00
          </div>

          <div className="flex items-center gap-2 text-primary">
            <span>★ {rating.toFixed(1)}</span>
            {experience_years && experience_years > 0 && (
              <span>• {experience_years} yrs</span>
            )}
          </div>
        </div>
      </div>

      {/* Profile on hover (Full card clickable) */}
      <Link to={`/doctors/${computedSlug}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Profile</span>
      </Link>
    </motion.div>
  )
}

// ─── Doctor Skeleton ──────────────────────────────────────────────────────────
export function DoctorSkeleton() {
  return (
    <div className="rounded-3xl bg-card overflow-hidden shadow-soft border border-primary/10">
      <div className="h-32 skeleton" />
      <div className="p-6">
        <div className="skeleton h-5 w-3/4 mx-auto rounded-lg mb-3" />
        <div className="skeleton h-4 w-1/2 mx-auto rounded-lg mb-4" />
        <div className="skeleton h-3 w-full rounded-lg" />
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  value: number
  suffix?: string
  label: string
  icon?: ReactNode
}

export function StatCard({ value, suffix = '', label, icon }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="text-center"
    >
      <div className="inline-flex flex-col items-center gap-2">
        {icon && (
          <div className="mb-1 text-3xl">{icon}</div>
        )}
        <div className="text-4xl font-bold font-[family-name:var(--font-display)] text-primary">
          {value}{suffix}
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {label}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
interface TestimonialCardProps {
  name: string
  city: string
  quote: string
  rating: number
  treatment: string
}

export function TestimonialCard({ name, city, quote, rating, treatment }: TestimonialCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative rounded-3xl p-8 h-full bg-card shadow-soft border border-primary/10"
    >
      {/* Quote icon */}
      <div className="absolute top-6 right-6 text-6xl font-serif leading-none select-none text-gold/15"
        style={{ fontFamily: 'Georgia, serif' }}>
        "
      </div>

      <div className="relative">
        {/* Rating stars */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: rating }).map((_, i) => (
            <span key={i} className="text-lg text-gold">★</span>
          ))}
        </div>

        <p className="text-base leading-relaxed mb-6 italic text-foreground">
          "{quote}"
        </p>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground flex-shrink-0">
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{city} · {treatment}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Panchakarma Treatment Card ───────────────────────────────────────────────
interface TreatmentCardProps {
  name: string
  desc: string
  icon: string
  index?: number
}

export function TreatmentCard({ name, desc, icon }: TreatmentCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="group relative rounded-3xl p-6 overflow-hidden cursor-default bg-card border border-primary/10 shadow-soft"
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 transition-opacity group-hover:opacity-10 bg-primary" />

      <div className="text-3xl mb-4">{icon}</div>
      <h4 className="font-semibold text-base mb-2 font-[family-name:var(--font-display)] text-foreground">
        {name}
      </h4>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
        <div className="w-5 h-0.5 rounded-full bg-gold" />
        Traditional Therapy
      </div>
    </motion.div>
  )
}

// ─── Blog Card ────────────────────────────────────────────────────────────────
interface BlogCardProps {
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
  emoji?: string
}

export function BlogCard({ title, excerpt, category, date, readTime, emoji = '🌿' }: BlogCardProps) {
  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="group rounded-3xl bg-card overflow-hidden cursor-pointer shadow-soft border border-primary/10"
    >
      {/* Image placeholder */}
      <div className="h-44 flex items-center justify-center text-6xl relative overflow-hidden bg-primary/5">
        <span className="group-hover:scale-110 transition-transform duration-500">{emoji}</span>
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
            {category}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 text-xs mb-3 text-muted-foreground">
          <span>{date}</span>
          <span>·</span>
          <span>{readTime} read</span>
        </div>

        <h4 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors font-[family-name:var(--font-display)] text-foreground leading-[1.4]">
          {title}
        </h4>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
          Read More
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Glass Info Card ──────────────────────────────────────────────────────────
export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-3xl p-6 ${className}`}>
      {children}
    </div>
  )
}

// ─── Feature Card (Why Maitri) ────────────────────────────────────────────────
interface FeatureCardProps {
  icon: string
  title: string
  desc: string
}

export function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ 
        y: -10, 
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(15,118,110,0.12)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      }}
      className="group relative rounded-3xl p-8 bg-card border border-primary/10 transition-colors duration-300 overflow-hidden shadow-soft cursor-default"
    >
      {/* Dynamic Background Glow on Hover */}
      <div className="absolute -right-16 -bottom-16 w-32 h-32 rounded-full bg-teal-500/5 group-hover:bg-teal-500/10 group-hover:scale-150 transition-all duration-700 ease-out" />
      
      {/* Icon Container with custom hover animation */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-gradient-to-tr group-hover:from-teal-500 group-hover:to-[#C8A14D] group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:rotate-6 transition-all duration-500">
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-bold mb-3 font-[family-name:var(--font-display)] text-foreground group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors duration-300">
        {desc}
      </p>
    </motion.div>
  )
}

// ─── Stagger Wrapper ──────────────────────────────────────────────────────────
export function StaggerGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOpts}
      className={className}
    >
      {children}
    </motion.div>
  )
}
