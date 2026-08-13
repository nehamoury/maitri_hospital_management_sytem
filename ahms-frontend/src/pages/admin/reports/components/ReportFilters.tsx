import { Input } from '@/components/ui'

interface ReportFiltersProps {
  filters: {
    from?: string
    to?: string
    department_id?: string
    group_by?: string
  }
  setFilters: (f: any) => void
  showDepartment?: boolean
  showGroupBy?: boolean
  departments?: { id: string; name: string }[]
}

export function ReportFilters({
  filters,
  setFilters,
  showDepartment = false,
  showGroupBy = false,
  departments = [],
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">From Date</label>
        <Input
          type="date"
          value={filters.from || ''}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="w-40"
        />
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">To Date</label>
        <Input
          type="date"
          value={filters.to || ''}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="w-40"
        />
      </div>

      {showDepartment && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Department</label>
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={filters.department_id || ''}
            onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showGroupBy && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Group By</label>
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={filters.group_by || 'day'}
            onChange={(e) => setFilters({ ...filters, group_by: e.target.value })}
          >
            <option value="day">Day</option>
            <option value="department">Department</option>
            <option value="service">Service</option>
          </select>
        </div>
      )}
    </div>
  )
}
