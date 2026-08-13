import { useState, useEffect } from 'react'
import type { ReportFilters as Filters } from '@/lib/api'
import { reportsApi } from '@/lib/api'
import { ReportFilters } from './components/ReportFilters'
import { SummaryCards } from './components/SummaryCards'
import { RevenueChart } from './components/RevenueChart'
import { DepartmentDistribution } from './components/DepartmentDistribution'
import { ReportTable } from './components/ReportTable'
import { ExportButtons } from './components/ExportButtons'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'department-distribution', label: 'Department Distribution' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'pharmacy-dispensing', label: 'Pharmacy Dispensing' },
  { id: 'pharmacy-stock', label: 'Pharmacy Stock' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'patients', label: 'Patients' },
  { id: 'panchakarma', label: 'Panchakarma' },
  { id: 'referrals', label: 'Referrals' },
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
          data = await reportsApi.getSummary(filters)
          break
        case 'department-distribution':
          data = await reportsApi.getDepartmentDistribution(filters)
          break
        case 'revenue':
          data = await reportsApi.getRevenue(filters)
          break
        case 'pharmacy-dispensing':
          data = await reportsApi.getPharmacyDispensing(filters)
          break
        case 'pharmacy-stock':
          data = await reportsApi.getPharmacyStock(filters)
          break
        case 'doctors':
          data = await reportsApi.getDoctors(filters)
          break
        case 'patients':
          data = await reportsApi.getPatients(filters)
          break
        case 'panchakarma':
          data = await reportsApi.getPanchakarma(filters)
          break
        case 'referrals':
          data = await reportsApi.getReferrals(filters)
          break
      }
      setReportData(data)
    } catch (err: any) {
      toast.error('Failed to load report data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Hospital performance, financials, and clinical insights.</p>
        </div>
        
        {reportData && (
          <ExportButtons reportType={activeTab} filters={filters} />
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0">
          <nav className="flex flex-col space-y-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Report Content */}
        <div className="flex-1 min-w-0">
          <ReportFilters 
            filters={filters} 
            setFilters={setFilters} 
            showDepartment={['department-distribution', 'doctors'].includes(activeTab)}
            showGroupBy={activeTab === 'revenue'}
            departments={departments}
          />

          {loading && !reportData ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : reportData ? (
            <div className="space-y-6 animate-in fade-in duration-300">
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
            <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500">
              Select a report to view data
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
