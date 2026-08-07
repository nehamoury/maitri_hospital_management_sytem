import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Calendar, Info, ArrowLeft, ShieldAlert } from 'lucide-react'
import { portalApi, errorMessage } from '../../lib/api'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui'

interface RxItem {
  medicine: string
  formulation: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  anupana: string
  route: string
  dispensed_qty: number
}

interface Rx {
  id: string
  date: string
  doctor: string
  status: string
  notes: string
  items: RxItem[]
}

export default function PortalPrescriptions() {
  const [list, setList] = useState<Rx[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    portalApi
      .get<{ data: Rx[] }>('/portal/prescriptions')
      .then((res) => setList(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load prescriptions')))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Prescriptions</h1>
          <p className="text-sm text-slate-500">View and download your medication plans</p>
        </div>
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Portal
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {!list ? (
        <div className="flex justify-center py-12"><Spinner label="Loading prescriptions..." /></div>
      ) : list.length === 0 ? (
        <Card className="border-slate-100 shadow-sm">
          <div className="py-12">
            <EmptyState message="No prescriptions found. Once a doctor prescribes medicines, they will appear here." />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {list.map((rx) => (
            <Card key={rx.id} className="border-slate-100 shadow-md hover:shadow-lg transition-all overflow-hidden rounded-2xl">
              {/* Prescription Header */}
              <div className="bg-gradient-to-r from-emerald-800/5 to-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Dr. {rx.doctor}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> Prescribed on {new Date(rx.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Badge color={rx.status === 'DISPENSED' ? 'green' : rx.status === 'PARTIALLY_DISPENSED' ? 'amber' : 'blue'}>
                  {rx.status}
                </Badge>
              </div>

              {/* Items List */}
              <div className="p-6 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pr-4">Medicine / Formulation</th>
                        <th className="pb-3 pr-4">Dose</th>
                        <th className="pb-3 pr-4">Frequency</th>
                        <th className="pb-3 pr-4">Duration</th>
                        <th className="pb-3 pr-4">Anupana (Carrier)</th>
                        <th className="pb-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rx.items.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-4 font-semibold text-slate-800">
                            {it.medicine}
                            {it.formulation && (
                              <span className="ml-1.5 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {it.formulation}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">{it.dose}</td>
                          <td className="py-3.5 pr-4 text-slate-600">{it.frequency}</td>
                          <td className="py-3.5 pr-4 text-slate-600 font-mono text-xs">{it.duration}</td>
                          <td className="py-3.5 pr-4 text-emerald-700 italic font-medium">{it.anupana || 'Warm Water'}</td>
                          <td className="py-3.5 text-right font-mono font-semibold text-slate-700">
                            {it.dispensed_qty}/{it.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {rx.notes && (
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-start gap-2.5 mt-4">
                    <Info className="h-4.5 w-4.5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Doctor's Advice / Notes</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{rx.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
