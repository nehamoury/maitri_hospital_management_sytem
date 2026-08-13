import type { RevenueReport } from '../types'
import { Card, CardHeader } from '@/components/ui'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

interface RevenueChartProps {
  report: RevenueReport
}

export function RevenueChart({ report }: RevenueChartProps) {
  if (!report || !report.rows || report.rows.length === 0) return null

  // Format data for recharts
  const data = report.rows.map((r) => ({
    name: r.key,
    Net: r.net,
    Collected: r.paid,
    Due: r.due,
  }))

  return (
    <Card className="shadow-sm border-slate-200 mt-6">
      <CardHeader title={`Revenue Breakdown (${report.group_by})`} />
      <div className="p-6">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Collected" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Due" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
