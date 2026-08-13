import { useState, useEffect, useCallback } from 'react'
import { dietApi } from '@/lib/api'
import type { MealOrder } from './types'
import { MEAL_STATUS_CONFIG, MEAL_TYPE_CONFIG } from './types'
import { Input, Button } from '@/components/ui'
import { toast } from 'sonner'
import { ChefHat, RefreshCw, Calendar, CheckCircle2, AlertTriangle, Play } from 'lucide-react'

export default function KitchenDashboard() {
  const [meals, setMeals] = useState<MealOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Filters
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState<string>('')
  const [wardFilter, setWardFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { date }
      if (mealType) params.meal_type = mealType
      if (wardFilter) params.ward_id = wardFilter
      const res = await dietApi.getKitchenSheet(params)
      if (res.data.success) {
        setMeals(res.data.data ?? [])
      }
    } catch {
      toast.error('Failed to load kitchen sheet')
    } finally {
      setLoading(false)
    }
  }, [date, mealType, wardFilter])

  useEffect(() => { load() }, [load])

  const triggerGeneration = async () => {
    setGenerating(true)
    try {
      const res = await dietApi.generateDailyMeals(date)
      if (res.data.success) {
        toast.success(`Generated ${res.data.data.count} meal orders for ${date}`)
        load()
      }
    } catch {
      toast.error('Failed to trigger meal orders generation')
    } finally {
      setGenerating(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await dietApi.updateMealStatus(id, status)
      toast.success(`Meal marked as ${status.toLowerCase()}`)
      load()
    } catch (err: any) {
      const msg = err.response?.data?.error || `Failed to mark as ${status.toLowerCase()}`
      toast.error(msg)
    }
  }

  // Group meals by Ward
  const wards = Array.from(new Set(meals.map(m => m.ward_name)))
  
  // Filter local view by status
  const filteredMeals = statusFilter
    ? meals.filter(m => m.status === statusFilter)
    : meals

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Kitchen & Diet Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage active IPD meals, schedules, and serving logs.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={triggerGeneration} disabled={generating}>
            <Play size={14} className="mr-1.5 text-orange-600" />
            {generating ? 'Generating...' : 'Generate Daily Meals'}
          </Button>
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-9 w-40" />
          </div>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Meal Session</label>
          <select 
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={mealType} 
            onChange={e => setMealType(e.target.value)}
          >
            <option value="">All Meals</option>
            {Object.keys(MEAL_TYPE_CONFIG).map(t => (
              <option key={t} value={t}>{MEAL_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Ward Filter</label>
          <select 
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={wardFilter} 
            onChange={e => setWardFilter(e.target.value)}
          >
            <option value="">All Wards</option>
            <option value="GENMED">General Medicine Ward</option>
            <option value="PANCHIPD">Panchakarma IPD</option>
            <option value="PRIV">Private Rooms</option>
            <option value="ICU">ICU / Critical Care</option>
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
          <select 
            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.keys(MEAL_STATUS_CONFIG).map(s => (
              <option key={s} value={s}>{MEAL_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ward-wise Kitchen Sheet */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading kitchen sheet...</div>
        ) : meals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center text-muted-foreground flex flex-col items-center gap-2">
            <ChefHat size={36} className="text-muted-foreground/40" />
            <h3 className="font-bold text-foreground">No meal orders found</h3>
            <p className="text-sm">Click "Generate Daily Meals" to prepare orders for today's active admissions.</p>
          </div>
        ) : (
          wards.map(wardName => {
            const wardMeals = filteredMeals.filter(m => m.ward_name === wardName)
            if (wardMeals.length === 0) return null
            return (
              <div key={wardName} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-muted/30 border-b border-border flex justify-between items-center">
                  <h2 className="font-bold text-foreground">{wardName}</h2>
                  <span className="text-xs text-muted-foreground font-semibold">{wardMeals.length} meals</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10 border-b border-border">
                      <tr>
                        {['Bed', 'Patient', 'Session', 'Diet Type', 'Pathya / Instructions', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {wardMeals.map(meal => {
                        const mcfg = MEAL_STATUS_CONFIG[meal.status] ?? MEAL_STATUS_CONFIG.PENDING
                        const tcfg = MEAL_TYPE_CONFIG[meal.meal_type]
                        return (
                          <tr key={meal.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-4 font-mono font-bold text-teal-700">{meal.bed_no}</td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-foreground">{meal.patient_name}</p>
                              <p className="text-xs text-muted-foreground">{meal.patient_uhid}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold ${tcfg?.color}`}>{tcfg?.label}</span>
                              <p className="text-[10px] text-muted-foreground">{tcfg?.time}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
                                {meal.diet_type}
                              </span>
                            </td>
                            <td className="px-5 py-4 max-w-[240px]">
                              {meal.pathya && <p className="text-xs text-slate-700"><span className="font-semibold text-emerald-700">Pathya:</span> {meal.pathya}</p>}
                              {meal.special_instructions && <p className="text-xs text-slate-600 italic mt-0.5">Notes: {meal.special_instructions}</p>}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide px-2 py-0.5 text-[10px] ${mcfg.bg} ${mcfg.text}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${mcfg.dot}`} />
                                {mcfg.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-1.5">
                                {meal.status === 'PENDING' && (
                                  <Button variant="secondary" onClick={() => updateStatus(meal.id, 'PREPARED')}>
                                    <ChefHat size={12} className="mr-1" /> Prepare
                                  </Button>
                                )}
                                {meal.status === 'PREPARED' && (
                                  <Button variant="primary" onClick={() => updateStatus(meal.id, 'SERVED')}>
                                    <CheckCircle2 size={12} className="mr-1" /> Serve
                                  </Button>
                                )}
                                {meal.status !== 'SERVED' && meal.status !== 'HELD' && (
                                  <Button variant="ghost" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => updateStatus(meal.id, 'HELD')}>
                                    <AlertTriangle size={12} /> Hold
                                  </Button>
                                )}
                                {meal.status === 'HELD' && (
                                  <Button variant="secondary" onClick={() => updateStatus(meal.id, 'PREPARED')}>
                                    Reopen
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
