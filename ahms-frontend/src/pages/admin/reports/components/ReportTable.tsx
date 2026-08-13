import type { ReportTable as ReportTableType } from '../types'
import { Card, CardHeader } from '@/components/ui'

interface ReportTableProps {
  table: ReportTableType
}

export function ReportTable({ table }: ReportTableProps) {
  if (!table || !table.columns) return null

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader title={table.title} />
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                {table.columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-3 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIdx) => {
                const isLast = rowIdx === table.rows.length - 1
                return (
                  <tr
                    key={rowIdx}
                    className={`bg-white border-b border-slate-100 hover:bg-slate-50 ${
                      isLast ? 'font-semibold bg-slate-50 border-t-2 border-t-slate-200' : ''
                    }`}
                  >
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-6 py-4 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {table.rows.length === 0 && (
                <tr>
                  <td colSpan={table.columns.length} className="px-6 py-8 text-center text-slate-500">
                    No data available for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
