import { Input, Select } from '@/components/ui'

interface ReportFiltersProps {
  filters: {
    from?: string
    to?: string
    department_id?: string
    group_by?: string
    expiry_days?: number
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
    <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-muted/20 rounded-2xl border border-border">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">From Date</label>
        <Input
          type="date"
          value={filters.from || ''}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="w-40"
        />
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">To Date</label>
        <Input
          type="date"
          value={filters.to || ''}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="w-40"
        />
      </div>

      {showDepartment && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Department</label>
          <Select
            value={filters.department_id || ''}
            onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
            className="w-48"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {showGroupBy && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Group By</label>
          <Select
            value={filters.group_by || 'day'}
            onChange={(e) => setFilters({ ...filters, group_by: e.target.value })}
            className="w-40"
          >
            <option value="day">Day</option>
            <option value="department">Department</option>
            <option value="service">Service</option>
          </Select>
        </div>
      )}
    </div>
  )
}
