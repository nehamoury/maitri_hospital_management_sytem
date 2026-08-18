import type { SummaryReport } from '../types'
import { Users, Activity, BriefcaseMedical, IndianRupee, Bed } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  summary: SummaryReport
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  if (!summary) return null

  const cards = [
    {
      title: 'OPD Encounters',
      value: summary.opd_encounters,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30',
    },
    {
      title: 'IPD Admissions',
      value: summary.ipd_admissions,
      icon: Bed,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30',
    },
    {
      title: 'Current Active IPD',
      value: summary.current_ipd,
      icon: Bed,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30',
    },
    {
      title: 'New Patients',
      value: summary.new_patients,
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30',
    },
    {
      title: 'Treatment Plans',
      value: summary.treatment_plans,
      icon: BriefcaseMedical,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30',
    },
    {
      title: 'Total Revenue',
      value: `₹${(summary.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <Card key={i} className="shadow-sm border-border hover:shadow-md transition-shadow">
            <div className="p-5 flex flex-col items-start gap-3">
              <div className={cn('p-3 rounded-xl flex items-center justify-center shrink-0', c.bg, c.color)}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.title}</p>
                <p className="text-xl font-bold text-foreground mt-0.5 font-mono">{c.value}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
