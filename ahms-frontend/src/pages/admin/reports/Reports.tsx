import { useState, useEffect, useMemo } from 'react'
import type { ReportFilters as Filters } from '@/lib/api'
import { reportsApi } from '@/lib/api'
import { ReportFilters } from './components/ReportFilters'
import { SummaryCards } from './components/SummaryCards'
import { RevenueChart } from './components/RevenueChart'
import { DepartmentDistribution } from './components/DepartmentDistribution'
import { ReportTable } from './components/ReportTable'
import { ExportButtons } from './components/ExportButtons'
import { api } from '@/lib/api'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'summary', label: 'Summary Overview' },
  { id: 'department-distribution', label: 'Department Distribution' },
  { id: 'revenue', label: 'Revenue Trends' },
  { id: 'pharmacy-dispensing', label: 'Pharmacy Dispensing' },
  { id: 'pharmacy-stock', label: 'Pharmacy Stock Ledger' },
  { id: 'doctors', label: 'Practitioner Performance' },
  { id: 'patients', label: 'Patient Demographics' },
  { id: 'panchakarma', label: 'Panchakarma Cycles' },
  { id: 'referrals', label: 'Referrals & Affiliates' },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState('summary')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  
  // Set default dates: Last 30 days
  const [filters, setFilters] = useState<Filters>(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
      group_by: 'day',
      expiry_days: 30,
    }
  })

  const sanitizedFilters = useMemo(() => {
    const copy = { ...filters }
    if (!['department-distribution', 'doctors'].includes(activeTab)) {
      delete copy.department_id
    }
    return copy
  }, [filters, activeTab])

  useEffect(() => {
    api.get('/departments').then(res => {
      if (res.data?.data) {
        setDepartments(res.data.data)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters.from, filters.to, filters.department_id, filters.group_by, filters.expiry_days])

  const fetchReport = async () => {
    setLoading(true)
    try {
      let data
      switch (activeTab) {
        case 'summary':
          data = await reportsApi.getSummary(sanitizedFilters)
          break
        case 'department-distribution':
          data = await reportsApi.getDepartmentDistribution(sanitizedFilters)
          break
        case 'revenue':
          data = await reportsApi.getRevenue(sanitizedFilters)
          break
        case 'pharmacy-dispensing':
          data = await reportsApi.getPharmacyDispensing(sanitizedFilters)
          break
        case 'pharmacy-stock':
          data = await reportsApi.getPharmacyStock(sanitizedFilters)
          break
        case 'doctors':
          data = await reportsApi.getDoctors(sanitizedFilters)
          break
        case 'patients':
          data = await reportsApi.getPatients(sanitizedFilters)
          break
        case 'panchakarma':
          data = await reportsApi.getPanchakarma(sanitizedFilters)
          break
        case 'referrals':
          data = await reportsApi.getReferrals(sanitizedFilters)
          break
      }
      setReportData(data?.data || null)
    } catch (err: any) {
      toast.error('Failed to load report data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Analyze clinical performance, pharmacy log streams, and financial distributions."
        action={
          reportData && (
            <ExportButtons reportType={activeTab} filters={sanitizedFilters} />
          )
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0">
          <nav className="flex flex-col space-y-1 bg-card p-3 rounded-2xl border border-border shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-3 mb-2">Available Reports</p>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all text-left border',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border-primary/20 font-bold'
                    : 'text-muted-foreground border-transparent hover:bg-muted/40 hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0 space-y-6">
          <ReportFilters 
            filters={filters} 
            setFilters={setFilters} 
            showDepartment={['department-distribution', 'doctors'].includes(activeTab)}
            showGroupBy={activeTab === 'revenue'}
            departments={departments}
          />

          {loading && !reportData ? (
            <div className="flex items-center justify-center p-16 bg-card rounded-2xl border border-border shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reportData ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {activeTab === 'summary' && (
                <>
                  <SummaryCards summary={reportData} />
                  <ReportTable table={reportData.table} />
                </>
              )}
              {activeTab === 'department-distribution' && (
                <>
                  <DepartmentDistribution report={reportData} />
                  <ReportTable table={reportData.table} />
                </>
              )}
              {activeTab === 'revenue' && (
                <>
                  <RevenueChart report={reportData} />
                  <ReportTable table={reportData.table} />
                </>
              )}
              {['pharmacy-dispensing', 'pharmacy-stock', 'doctors', 'patients', 'panchakarma', 'referrals'].includes(activeTab) && (
                <ReportTable table={reportData.table} />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border shadow-sm text-center">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-foreground">Select a report</p>
              <p className="text-xs text-muted-foreground mt-1">Please select an analytics category from the sidebar navigation panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
