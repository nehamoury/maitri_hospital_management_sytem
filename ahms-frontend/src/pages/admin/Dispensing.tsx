import { useEffect, useMemo, useState } from 'react'
import { api, errorMessage, openPrescriptionPrint } from '../../lib/api'
import { Can } from '../../lib/can'
import { Card, Badge, EmptyState, Spinner, Button, Input, Select } from '../../components/ui'

interface RxItem {
  id: string
  medicine: string
  formulation: string
  dose: string
  frequency: string
  duration: string
  quantity: number
  anupana: string
  route: string
  instructions: string
  dispensed_qty: number
}

interface Prescription {
  id: string
  encounter_id: string
  doctor_name: string
  status: string
  notes: string
  patient_name: string
  patient_uh_id: string
  items: RxItem[]
  created_at: string
}

interface Medicine {
  id: string
  name: string
  formulation: string
  unit: string
  batch_number: string
  expiry_date: string
  stock_qty: number
  low_stock_threshold: number
}

const STATUS_FILTERS = [
  { key: 'PRESCRIBED', label: 'Prescribed' },
  { key: 'PARTIALLY_DISPENSED', label: 'Partially Dispensed' },
  { key: 'DISPENSED', label: 'Dispensed' },
]

const statusBadge = (s: string) => {
  if (s === 'DISPENSED') return <Badge color="green">DISPENSED</Badge>
  if (s === 'PARTIALLY_DISPENSED') return <Badge color="amber">PARTIALLY DISPENSED</Badge>
  return <Badge color="blue">PRESCRIBED</Badge>
}

export default function Dispensing() {
  const [list, setList] = useState<Prescription[] | null>(null)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('PRESCRIBED')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [medSelections, setMedSelections] = useState<Record<string, string>>({})

  const load = () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (status) params.status = status
    api
      .get<{ data: Prescription[] }>('/prescriptions', { params })
      .then((res) => setList(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Failed to load prescriptions')))
  }

  useEffect(load, [search, status])

  useEffect(() => {
    api
      .get<{ data: Medicine[] }>('/medicines')
      .then((res) => setMedicines(res.data.data))
      .catch(() => {})
  }, [])

  const remaining = (item: RxItem) => Math.max(0, item.quantity - item.dispensed_qty)

  const matchingMedicine = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rx of list ?? []) {
      for (const it of rx.items) {
        const match = medicines.find((m) => m.name.toLowerCase() === it.medicine.toLowerCase())
        if (match) map[it.id] = match.id
      }
    }
    return map
  }, [list, medicines])

  const open = (id: string) => {
    setOpenId(openId === id ? null : id)
    const rx = list?.find((r) => r.id === id)
    if (rx) {
      const q: Record<string, string> = {}
      const m: Record<string, string> = {}
      for (const it of rx.items) {
        q[it.id] = String(remaining(it))
        m[it.id] = medSelections[it.id] ?? matchingMedicine[it.id] ?? ''
      }
      setQuantities(q)
      setMedSelections(m)
    }
  }

  const dispense = async (rx: Prescription) => {
    setError('')
    setLoading(true)
    try {
      const items = rx.items
        .filter((it) => Number(quantities[it.id]) > 0)
        .map((it) => ({
          prescription_item_id: it.id,
          quantity: Number(quantities[it.id]),
          medicine_id: medSelections[it.id] || undefined,
        }))
      if (items.length === 0) {
        setError('Enter a quantity for at least one item')
        return
      }
      await api.post(`/prescriptions/${rx.id}/dispense`, { items })
      setOpenId(null)
      load()
    } catch (err) {
      setError(errorMessage(err, 'Failed to dispense'))
    } finally {
      setLoading(false)
    }
  }

  const medicineOptions = (itemId: string, rxId: string) => {
    const rx = list?.find((r) => r.id === rxId)
    const item = rx?.items.find((i) => i.id === itemId)
    const name = item?.medicine.toLowerCase() ?? ''
    const matches = medicines.filter((m) => m.name.toLowerCase().includes(name))
    const options = matches.length > 0 ? matches : medicines
    return options
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <Input placeholder="Search patient name or UHID..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === f.key ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!list ? (
          <Spinner label="Loading prescriptions..." />
        ) : list.length === 0 ? (
          <EmptyState message="No prescriptions match this filter" />
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((rx) => (
              <div key={rx.id}>
                <button
                  onClick={() => open(rx.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{rx.patient_name}</span>
                      <span className="font-mono text-xs text-slate-400">{rx.patient_uh_id}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Dr. {rx.doctor_name} · {new Date(rx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(rx.status)}
                    <Can permission="prescription.print">
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPrescriptionPrint(rx.id).catch(() => {})
                        }}
                      >
                        Print
                      </Button>
                    </Can>
                  </div>
                </button>

                {openId === rx.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                    {rx.items.length === 0 ? (
                      <p className="text-sm text-slate-500">No medicine lines on this prescription.</p>
                    ) : (
                      <div className="space-y-3">
                        {rx.items.map((it) => {
                          const rem = remaining(it)
                          const match = medicines.find((m) => m.id === medSelections[it.id])
                          const insufficient = match && Number(quantities[it.id]) > match.stock_qty
                          return (
                            <div key={it.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-12 sm:items-center">
                              <div className="sm:col-span-4">
                                <div className="font-medium text-slate-800">
                                  {it.medicine}
                                  {it.formulation && <span className="text-slate-400"> ({it.formulation})</span>}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {[it.dose, it.frequency, it.duration].filter(Boolean).join(' · ')}
                                  {it.anupana && ` · with ${it.anupana}`}
                                </div>
                              </div>
                              <div className="text-sm text-slate-600 sm:col-span-2">
                                Dispensed {it.dispensed_qty}/{it.quantity}
                              </div>
                              <div className="sm:col-span-2">
                                <Select
                                  value={medSelections[it.id] ?? ''}
                                  onChange={(e) => setMedSelections({ ...medSelections, [it.id]: e.target.value })}
                                  className="text-sm"
                                >
                                  <option value="">No stock link</option>
                                  {medicineOptions(it.id, rx.id).map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.batch_number || 'no batch'} · {m.stock_qty} {m.unit})
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div className="sm:col-span-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={rem}
                                  value={quantities[it.id] ?? ''}
                                  onChange={(e) => setQuantities({ ...quantities, [it.id]: e.target.value })}
                                  placeholder="Qty"
                                  className="w-full"
                                  disabled={rem === 0}
                                />
                                {insufficient && <p className="mt-1 text-xs text-red-600">Stock: {match.stock_qty}</p>}
                                {rem === 0 && <p className="mt-1 text-xs text-green-600">Fully dispensed</p>}
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setOpenId(null)}>
                            Cancel
                          </Button>
                          <Button onClick={() => dispense(rx)} disabled={loading}>
                            {loading ? 'Dispensing...' : 'Dispense'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
