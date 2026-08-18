import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'
  const styles: Record<string, string> = {
    primary: 'bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-sm hover:shadow-md hover:shadow-teal-900/20 hover:-translate-y-0.5 border border-transparent',
    secondary: 'bg-card text-foreground border border-border hover:border-border hover:bg-muted/30 shadow-sm hover:shadow hover:-translate-y-0.5',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-sm hover:shadow-md hover:shadow-red-900/20 hover:-translate-y-0.5 border border-transparent',
    ghost: 'text-muted-foreground hover:bg-muted',
  }
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-muted/30/50 px-4 py-2.5 text-sm outline-none transition-all hover:bg-card focus:bg-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-muted-foreground ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-border bg-muted/30/50 px-4 py-2.5 text-sm outline-none transition-all hover:bg-card focus:bg-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-border bg-muted/30/50 px-4 py-2.5 text-sm outline-none transition-all hover:bg-card focus:bg-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-muted-foreground ${className}`}
      rows={3}
      {...props}
    />
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>{children}</div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-border px-6 py-5">
      <div>
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between border-b border-border pb-5 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Badge({ color = 'slate', children }: { color?: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple'; children: ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    slate: 'bg-muted text-foreground',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide uppercase ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
