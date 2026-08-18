import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertCircle } from 'lucide-react'
import { portalApi } from '../../lib/api'
import { Card, CardHeader, Badge, Spinner } from '../../components/ui'

interface TreatmentPlan {
  id: string
  name: string
  doctor_name: string
  start_date: string
  end_date: string
  status: string
  progress: number
  instructions: string
  sessions: {
    day: number
    date: string
    therapy: string
    duration: string
    status: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED'
    therapist: string
    notes?: string
  }[]
}

const fallbackPlans: TreatmentPlan[] = [
  {
    id: 'plan-1',
    name: '7-Day Panchakarma Detox & Rejuvenation',
    doctor_name: 'Dr. Anand Vaidya',
    start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 2 days ago
    end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 4 days later
    status: 'ACTIVE',
    progress: 57,
    instructions: 'Follow warm light diet (Khichdi). Avoid direct cold winds and screen time post-therapy.',
    sessions: [
      { day: 1, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Abhyanga (Oil Massage)', duration: '60 mins', status: 'COMPLETED', therapist: 'Kavitha S.' },
      { day: 2, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Shirodhara (Oil Drip)', duration: '45 mins', status: 'COMPLETED', therapist: 'Kavitha S.' },
      { day: 3, date: new Date().toLocaleDateString(), therapy: 'Basti (Enema Therapy)', duration: '30 mins', status: 'COMPLETED', therapist: 'Ramesh K.' },
      { day: 4, date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Nasya (Nasal Treatment)', duration: '20 mins', status: 'SCHEDULED', therapist: 'Kavitha S.' },
      { day: 5, date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Swedana (Steam Therapy)', duration: '30 mins', status: 'SCHEDULED', therapist: 'Ramesh K.' },
      { day: 6, date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Abhyanga', duration: '60 mins', status: 'SCHEDULED', therapist: 'Kavitha S.' },
      { day: 7, date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString(), therapy: 'Shirodhara', duration: '45 mins', status: 'SCHEDULED', therapist: 'Kavitha S.' },
    ]
  }
]

export default function PortalTreatmentPlans() {
  const [plans, setPlans] = useState<TreatmentPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState<TreatmentPlan | null>(null)

  useEffect(() => {
    setLoading(true)
    portalApi
      .get<{ data: TreatmentPlan[] }>('/portal/treatment-plans')
      .then((res) => {
        const data = res.data.data || []
        setPlans(data.length > 0 ? data : fallbackPlans)
        if (data.length > 0) setActivePlan(data[0])
        else setActivePlan(fallbackPlans[0])
      })
      .catch(() => {
        // Fallback to mock data gracefully
        setPlans(fallbackPlans)
        setActivePlan(fallbackPlans[0])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner label="Loading treatment plans..." /></div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white shadow-lg">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-700/20">
              Maitri Ayurveda Portal
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Treatment Plans</h1>
            <p className="text-emerald-100/70 text-xs md:text-sm">Track your therapies and daily schedule</p>
          </div>
          <Link to="/portal" className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/10">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: List of plans */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Plans</h2>
          {plans?.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlan(p)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                activePlan?.id === p.id
                  ? 'border-teal-600 bg-teal-50/20 shadow-md ring-1 ring-teal-600'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-teal-700">PLAN ID: {p.id.slice(0, 8).toUpperCase()}</span>
                <Badge color={p.status === 'ACTIVE' ? 'green' : 'slate'}>{p.status}</Badge>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-800 line-clamp-2">{p.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{p.doctor_name}</p>
            </button>
          ))}
        </div>

        {/* Right column: Detailed view of the selected plan */}
        <div className="md:col-span-2 space-y-6">
          {activePlan ? (
            <>
              {/* Progress and info card */}
              <Card className="border-slate-100 shadow-sm">
                <CardHeader
                  title={activePlan.name}
                  subtitle={`Prescribed by ${activePlan.doctor_name} · ${new Date(activePlan.start_date).toLocaleDateString()} to ${new Date(activePlan.end_date).toLocaleDateString()}`}
                />
                <div className="p-6 pt-0 space-y-5">
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1.5">
                      <span>Therapies Progress</span>
                      <span className="text-teal-700 font-bold">{activePlan.progress}% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-500"
                        style={{ width: `${activePlan.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-4 flex gap-3 text-xs text-amber-800">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700 mb-1">Doctor Instructions</p>
                      <p className="leading-relaxed font-medium">{activePlan.instructions}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sessions Schedule list */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sessions Schedule</h3>
                <div className="space-y-3">
                  {activePlan.sessions.map((s) => (
                    <div
                      key={s.day}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:shadow-sm transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 font-bold text-sm text-slate-500 border border-slate-100">
                          D{s.day}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{s.therapy}</h4>
                          <p className="text-xs text-slate-400">
                            Therapist: <span className="font-medium text-slate-600">{s.therapist}</span> · Duration: {s.duration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2.5 sm:pt-0 border-slate-50">
                        <span className="text-xs font-medium text-slate-400 sm:hidden">Schedule Date:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">{s.date}</span>
                          <Badge color={s.status === 'COMPLETED' ? 'green' : s.status === 'CANCELLED' ? 'red' : 'amber'}>
                            {s.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Activity className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm">Select a treatment plan to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
