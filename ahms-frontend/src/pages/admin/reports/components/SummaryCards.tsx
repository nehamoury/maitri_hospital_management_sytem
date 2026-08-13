import type { SummaryReport } from '../types'
import { Users, Activity, BriefcaseMedical, IndianRupee, Bed } from 'lucide-react'
import { Card } from '@/components/ui'

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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'IPD Admissions',
      value: summary.ipd_admissions,
      icon: Bed,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Current Active IPD',
      value: summary.current_ipd,
      icon: Bed,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'New Patients',
      value: summary.new_patients,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Treatment Plans',
      value: summary.treatment_plans,
      icon: BriefcaseMedical,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Total Revenue',
      value: `₹${summary.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: IndianRupee,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <Card key={i} className="shadow-sm border-slate-200">
            <div className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{c.title}</p>
                <p className="text-xl font-bold text-slate-800">{c.value}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
