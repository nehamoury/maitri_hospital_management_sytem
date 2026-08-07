import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

// ─── Admin Stat Card ────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: { value: number; isUp: boolean }
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple'
  subtitle?: string
}

const colorMap = {
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200' },
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', ring: 'ring-blue-200' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-200' },
  red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', ring: 'ring-red-200' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', ring: 'ring-purple-200' },
}

export function AdminStatCard({ title, value, icon, trend, color = 'emerald', subtitle }: StatCardProps) {
  const c = colorMap[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend.isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              <span>{trend.isUp ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% from yesterday</span>
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.icon} ring-1 ${c.ring}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Admin Alert Card ───────────────────────────────────────────────
interface AlertCardProps {
  title: string
  items: { label: string; value: string | number; color?: string }[]
  icon: ReactNode
  color?: 'amber' | 'red' | 'blue'
}

const alertColors = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100 text-amber-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100 text-red-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100 text-blue-600' },
}

export function AdminAlertCard({ title, items, icon, color = 'amber' }: AlertCardProps) {
  const c = alertColors[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-5`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className={`font-semibold ${item.color || 'text-slate-800'}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Admin Quick Action Card ────────────────────────────────────────
interface QuickActionProps {
  label: string
  icon: ReactNode
  onClick: () => void
  color?: 'emerald' | 'blue' | 'amber' | 'purple'
}

const qaColors = {
  emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-emerald-200',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 ring-blue-200',
  amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100 ring-amber-200',
  purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 ring-purple-200',
}

export function AdminQuickAction({ label, icon, onClick, color = 'emerald' }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md ${qaColors[color]}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1">
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </motion.button>
  )
}

// ─── Admin Section Header ───────────────────────────────────────────
export function AdminSectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Admin Loading Skeleton ─────────────────────────────────────────
export function AdminSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-slate-100 p-4">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

// ─── Admin Empty State ──────────────────────────────────────────────
export function AdminEmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    </motion.div>
  )
}
