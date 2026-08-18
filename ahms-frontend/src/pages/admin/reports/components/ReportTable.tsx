import type { ReportTable as ReportTableType } from '../types'
import { Card, CardHeader } from '@/components/ui'

interface ReportTableProps {
  table: ReportTableType
}

export function ReportTable({ table }: ReportTableProps) {
  if (!table || !table.columns) return null

  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardHeader title={table.title} />
      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-foreground">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
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
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${
                      isLast ? 'font-bold bg-muted/20 border-t-2 border-border' : 'bg-card'
                    }`}
                  >
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-6 py-3.5 whitespace-nowrap text-xs">
                        {cell}
                      </td>
                    ))}
                  </tr>
                )
              })}
              {table.rows.length === 0 && (
                <tr>
                  <td colSpan={table.columns.length} className="px-6 py-12 text-center text-xs text-muted-foreground">
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
