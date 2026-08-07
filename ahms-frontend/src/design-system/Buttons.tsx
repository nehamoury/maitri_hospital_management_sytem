import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { buttonTap } from './animations'

type BtnSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<BtnSize, string> = {
  sm:  'px-4 py-2 text-sm rounded-xl',
  md:  'px-6 py-3 text-sm rounded-2xl',
  lg:  'px-8 py-4 text-base rounded-2xl',
}

// ─── Primary Button (Deep Green) ────────────────────────────────────────────
export function PrimaryButton({
  children, size = 'md', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: BtnSize }) {
  return (
    <motion.button
      whileTap={buttonTap}
      className={`btn font-medium text-white ${sizeClasses[size]} ${className}`}
      style={{ background: 'linear-gradient(135deg, #0F766E, #0a5954)', boxShadow: '0 4px 20px rgba(15,118,110,0.35)' }}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ─── Secondary Button (Outline Green) ───────────────────────────────────────
export function SecondaryButton({
  children, size = 'md', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: BtnSize }) {
  return (
    <motion.button
      whileTap={buttonTap}
      className={`btn font-medium border-2 ${sizeClasses[size]} ${className}`}
      style={{ borderColor: '#0F766E', color: '#0F766E', background: 'transparent' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#0F766E'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#0F766E' }}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ─── Glass Button (for hero/dark sections) ───────────────────────────────────
export function GlassButton({
  children, size = 'md', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: BtnSize }) {
  return (
    <motion.button
      whileTap={buttonTap}
      className={`btn font-medium text-white glass ${sizeClasses[size]} ${className}`}
      style={{ border: '1.5px solid rgba(255,255,255,0.35)' }}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ─── Gold Accent Button ──────────────────────────────────────────────────────
export function GoldButton({
  children, size = 'md', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: BtnSize }) {
  return (
    <motion.button
      whileTap={buttonTap}
      className={`btn font-semibold text-white ${sizeClasses[size]} ${className}`}
      style={{ background: 'linear-gradient(135deg, #C8A14D, #dbb96b)', boxShadow: '0 4px 20px rgba(200,161,77,0.40)' }}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ─── Emergency Button ────────────────────────────────────────────────────────
export function EmergencyButton({
  children, href, className = '',
}: { children: ReactNode; href?: string; className?: string }) {
  return (
    <motion.a
      whileTap={buttonTap}
      href={href}
      className={`btn font-semibold text-white px-5 py-2.5 rounded-2xl text-sm ${className}`}
      style={{ background: 'linear-gradient(135deg, #DC2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.35)', animation: 'pulseGold 2s ease-in-out infinite' }}
    >
      {children}
    </motion.a>
  )
}

// ─── Link Button (React Router) ──────────────────────────────────────────────
export function LinkButton({
  children, to, size = 'md', variant = 'primary', className = '',
}: { children: ReactNode; to: string; size?: BtnSize; variant?: 'primary' | 'glass' | 'gold' | 'secondary'; className?: string }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: 'linear-gradient(135deg, #0F766E, #0a5954)', boxShadow: '0 4px 20px rgba(15,118,110,0.35)', color: '#fff' },
    glass:     { background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', color: '#fff', backdropFilter: 'blur(10px)' },
    gold:      { background: 'linear-gradient(135deg, #C8A14D, #dbb96b)', boxShadow: '0 4px 20px rgba(200,161,77,0.40)', color: '#fff' },
    secondary: { border: '2px solid #0F766E', color: '#0F766E', background: 'transparent' },
  }
  return (
    <motion.div whileTap={buttonTap} className="inline-block">
      <Link
        to={to}
        className={`btn font-medium ${sizeClasses[size]} ${className}`}
        style={styles[variant]}
      >
        {children}
      </Link>
    </motion.div>
  )
}

// ─── Icon Button ─────────────────────────────────────────────────────────────
export function IconButton({
  children, label, className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <motion.button
      whileTap={buttonTap}
      aria-label={label}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}

// ─── Anchor Button (external links) ─────────────────────────────────────────
export function AnchorButton({
  children, size = 'md', variant = 'primary', className = '', ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { size?: BtnSize; variant?: 'primary' | 'secondary' | 'glass' | 'gold' }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: 'linear-gradient(135deg, #0F766E, #0a5954)', boxShadow: '0 4px 20px rgba(15,118,110,0.35)', color: '#fff' },
    glass:     { background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', color: '#fff', backdropFilter: 'blur(10px)' },
    gold:      { background: 'linear-gradient(135deg, #C8A14D, #dbb96b)', boxShadow: '0 4px 20px rgba(200,161,77,0.40)', color: '#fff' },
    secondary: { border: '2px solid #0F766E', color: '#0F766E', background: 'transparent' },
  }
  return (
    <motion.a
      whileTap={buttonTap}
      className={`btn font-medium ${sizeClasses[size]} ${className}`}
      style={styles[variant]}
      {...(props as any)}
    >
      {children}
    </motion.a>
  )
}
