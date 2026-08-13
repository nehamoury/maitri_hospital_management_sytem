import { LAB_STATUS_CONFIG } from '../types'

interface Props {
  status: string
  size?: 'sm' | 'md'
}

export function LabStatusBadge({ status, size = 'md' }: Props) {
  const cfg = LAB_STATUS_CONFIG[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ${padding} ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
