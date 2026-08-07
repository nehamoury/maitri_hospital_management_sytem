import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

// ─── Floating Label Input ─────────────────────────────────────────────────────
interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: ReactNode
}

export function FloatingInput({ label, error, icon, id, className = '', ...props }: FloatingInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          placeholder=" "
          className={`peer w-full rounded-2xl border px-4 pt-5 pb-2 text-sm outline-none transition-all bg-white ${icon ? 'pl-11' : ''} ${className}`}
          style={{
            borderColor: error ? '#DC2626' : '#E2E8F0',
            color: '#0F172A',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#0F766E'; e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(220,38,38,0.12)' : '0 0 0 3px rgba(15,118,110,0.12)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`absolute top-1 text-[10px] font-medium transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#94A3B8] peer-focus:top-1 peer-focus:text-[10px] ${icon ? 'left-11' : 'left-4'}`}
          style={{ color: error ? '#DC2626' : '#0F766E' }}
        >
          {label}
        </label>
      </div>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  )
}

// ─── Floating Label Select ────────────────────────────────────────────────────
interface FloatingSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

export function FloatingSelect({ label, error, children, id, className = '', ...props }: FloatingSelectProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="relative">
      <div className="relative">
        <select
          id={inputId}
          className={`w-full rounded-2xl border px-4 pt-5 pb-2 text-sm outline-none transition-all bg-white appearance-none ${className}`}
          style={{
            borderColor: error ? '#DC2626' : '#E2E8F0',
            color: '#0F172A',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.12)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
          {...props}
        >
          {children}
        </select>
        <label
          htmlFor={inputId}
          className="absolute left-4 top-1 text-[10px] font-medium"
          style={{ color: error ? '#DC2626' : '#0F766E' }}
        >
          {label}
        </label>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  )
}

// ─── Floating Label Textarea ──────────────────────────────────────────────────
interface FloatingTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function FloatingTextarea({ label, error, id, className = '', ...props }: FloatingTextareaProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="relative">
      <textarea
        id={inputId}
        placeholder=" "
        className={`peer w-full rounded-2xl border px-4 pt-6 pb-2 text-sm outline-none transition-all bg-white resize-none ${className}`}
        style={{
          borderColor: error ? '#DC2626' : '#E2E8F0',
          color: '#0F172A',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.12)' }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className="absolute left-4 top-1.5 text-[10px] font-medium transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-[#94A3B8] peer-focus:top-1.5 peer-focus:text-[10px]"
        style={{ color: error ? '#DC2626' : '#0F766E' }}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{error}</p>
      )}
    </div>
  )
}

// ─── Form Error Alert ─────────────────────────────────────────────────────────
export function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
      <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
      </svg>
      <p className="text-sm" style={{ color: '#DC2626' }}>{message}</p>
    </div>
  )
}

// ─── Form Success Alert ───────────────────────────────────────────────────────
export function FormSuccess({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
      <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <p className="text-sm font-medium" style={{ color: '#16A34A' }}>{message}</p>
    </div>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
interface StepIndicatorProps {
  steps: string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
              style={{
                background: i < current ? '#0F766E' : i === current ? 'linear-gradient(135deg,#0F766E,#14B8A6)' : 'white',
                color: i <= current ? 'white' : '#94A3B8',
                border: i <= current ? 'none' : '2px solid #E2E8F0',
                boxShadow: i === current ? '0 4px 16px rgba(15,118,110,0.35)' : 'none',
              }}
            >
              {i < current ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: i <= current ? '#0F766E' : '#94A3B8' }}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-12 sm:w-20 h-0.5 mb-5 mx-2 transition-all duration-500"
              style={{ background: i < current ? '#0F766E' : '#E2E8F0' }} />
          )}
        </div>
      ))}
    </div>
  )
}
