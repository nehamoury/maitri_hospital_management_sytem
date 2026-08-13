import { Button } from '@/components/ui'
import { Download, Printer, FileSpreadsheet, FileText } from 'lucide-react'
import type { ReportFilters } from '@/lib/api'
import { reportsApi } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { useCan } from '@/lib/can'

interface ExportButtonsProps {
  reportType: string
  filters: ReportFilters
}

export function ExportButtons({ reportType, filters }: ExportButtonsProps) {
  const { can } = useCan()
  const [isExporting, setIsExporting] = useState<string | null>(null)
  if (!can('reports.export')) return null

  const handleExport = async (format: string) => {
    try {
      setIsExporting(format)
      await reportsApi.exportReport(reportType, format, filters)
      if (format !== 'print') {
        toast.success(`Exported as ${format.toUpperCase()}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => handleExport('csv')}
        disabled={isExporting !== null}
        className="flex items-center gap-2"
      >
        <FileText size={16} />
        CSV
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('excel')}
        disabled={isExporting !== null}
        className="flex items-center gap-2"
      >
        <FileSpreadsheet size={16} />
        Excel
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('pdf')}
        disabled={isExporting !== null}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        PDF
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('print')}
        disabled={isExporting !== null}
        className="flex items-center gap-2"
      >
        <Printer size={16} />
        Print
      </Button>
    </div>
  )
}
