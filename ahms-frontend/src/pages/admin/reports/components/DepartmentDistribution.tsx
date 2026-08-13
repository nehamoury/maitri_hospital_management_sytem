import type { DepartmentDistributionReport } from '../types'
import { Card, CardHeader } from '@/components/ui'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

interface DepartmentDistributionProps {
  report: DepartmentDistributionReport
}

export function DepartmentDistribution({ report }: DepartmentDistributionProps) {
  if (!report || !report.rows || report.rows.length === 0) return null

  // Format data for recharts
  const data = report.rows.map((r) => ({
    name: r.department_code || r.department_name.substring(0, 3).toUpperCase(),
    fullName: r.department_name,
    OPD: r.opd,
    IPD: r.ipd,
    Procedures: r.procedures,
  }))

  return (
    <Card className="shadow-sm border-slate-200 mt-6">
      <CardHeader title="Department Activity" />
      <div className="p-6">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0].payload.fullName
                  }
                  return ''
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="OPD" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
              <Bar dataKey="IPD" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Procedures" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
