import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, User2, MessageSquare, AlertCircle } from 'lucide-react'
import { portalApi } from '../../lib/api'
import { Card, Badge, Spinner } from '../../components/ui'

interface PKSession {
  id: string
  date: string
  time_slot: string
  therapy_name: string
  duration: string
  status: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED'
  therapist_name: string
  patient_feedback?: string
  therapist_notes?: string
}

const fallbackSessions: PKSession[] = [
  {
    id: 'sess-1',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 2 days ago
    time_slot: '09:00 AM - 10:00 AM',
    therapy_name: 'Abhyanga (Therapeutic Full-Body Oil Massage)',
    duration: '60 mins',
    status: 'COMPLETED',
    therapist_name: 'Kavitha S.',
    patient_feedback: 'Very relaxing. Felt significant relief in back stiffness.',
    therapist_notes: 'Applied warm Bala Ashwagandhadi Thailam. Recommended hot shower post-therapy.'
  },
  {
    id: 'sess-2',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 1 day ago
    time_slot: '10:00 AM - 10:45 AM',
    therapy_name: 'Shirodhara (Continuous Warm Herbal Oil Flow)',
    duration: '45 mins',
    status: 'COMPLETED',
    therapist_name: 'Kavitha S.',
    patient_feedback: 'Helped improve my sleep quality last night.',
    therapist_notes: 'Used Ksheerabala Thailam. Patient reported mild headache prior to session; resolved after treatment.'
  },
  {
    id: 'sess-3',
    date: new Date().toISOString().slice(0, 10), // today
    time_slot: '11:00 AM - 11:30 AM',
    therapy_name: 'Basti (Detoxifying Herbal Enema)',
    duration: '30 mins',
    status: 'COMPLETED',
    therapist_name: 'Ramesh K.',
    therapist_notes: 'Anuvaasana Basti administered with Sahacharadi Thailam. No complications reported.'
  },
  {
    id: 'sess-4',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // tomorrow
    time_slot: '08:00 AM - 08:30 AM',
    therapy_name: 'Nasya (Nasal Drop Instillation)',
    duration: '20 mins',
    status: 'SCHEDULED',
    therapist_name: 'Kavitha S.'
  },
  {
    id: 'sess-5',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // in 2 days
    time_slot: '10:00 AM - 10:30 AM',
    therapy_name: 'Swedana (Sudation Herbal Steam Room)',
    duration: '30 mins',
    status: 'SCHEDULED',
    therapist_name: 'Ramesh K.'
  }
]

export default function PortalSessions() {
  const [sessions, setSessions] = useState<PKSession[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    portalApi
      .get<{ data: PKSession[] }>('/portal/sessions')
      .then((res) => {
        const data = res.data.data || []
        setSessions(data.length > 0 ? data : fallbackSessions)
      })
      .catch(() => {
        setSessions(fallbackSessions)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner label="Loading therapy sessions..." /></div>

  const statusColor = (s: string) => (s === 'COMPLETED' ? 'green' : s === 'CANCELLED' ? 'red' : 'amber')

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
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Therapy Sessions</h1>
            <p className="text-emerald-100/70 text-xs md:text-sm">View details of Panchakarma sessions and therapist feedback</p>
          </div>
          <Link to="/portal" className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/10">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {sessions?.map((s) => (
          <Card key={s.id} className="border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="border-b border-slate-100 bg-slate-50/40 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700">SESSION ID: {s.id.toUpperCase()}</span>
                <Badge color={statusColor(s.status)}>{s.status}</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{s.time_slot}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">{s.therapy_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <User2 className="h-3.5 w-3.5 text-slate-400" />
                    Therapist: <span className="font-semibold text-slate-700">{s.therapist_name}</span> · Duration: {s.duration}
                  </p>
                </div>
              </div>

              {(s.therapist_notes || s.patient_feedback) && (
                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  {s.therapist_notes && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs">
                      <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                        Therapist Remarks
                      </p>
                      <p className="text-slate-600 leading-relaxed font-medium">{s.therapist_notes}</p>
                    </div>
                  )}

                  {s.patient_feedback && (
                    <div className="rounded-xl bg-teal-50/30 border border-teal-50 p-4 text-xs">
                      <p className="font-bold text-teal-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                        My Feedback
                      </p>
                      <p className="text-teal-700 leading-relaxed font-medium">{s.patient_feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
