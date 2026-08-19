import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, CreditCard, User, Phone, Mail, FileText, Activity, Sparkles, HeartPulse, Heart, Smile, Eye, Brain, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { PageHero, Section } from '../../design-system/Layout'
import { fetchDepartments } from '../../lib/public-site'
import { SEO } from '../../components/SEO'

const DEPT_ICONS: Record<string, any> = {
  'Kayachikitsa': Activity,
  'Panchakarma': Sparkles,
  'Shalya Tantra': HeartPulse,
  'Prasuti & Stri Roga': Heart,
  'Prasuti Tantra': Heart,
  'Kaumarabhritya': Smile,
  'Kaumarbhritya': Smile,
  'Shalakya Tantra': Eye,
  'Manas Roga': Brain,
  'Swasthavritta': Sun,
}

interface Doctor {
  id: string
  name: string
  department: string
  specialization: string
  consultation_fee: number
  availability?: string
}

const STEPS = ['Department', 'Doctor', 'Date & time', 'Your details', 'Confirm']

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  AVAILABLE: { label: 'Available now', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  IN_CONSULTATION: { label: 'In consultation', dot: 'bg-amber-500', text: 'text-amber-700' },
  NOT_AVAILABLE: { label: 'Not available', dot: 'bg-slate-400', text: 'text-slate-500' },
}

interface Slot {
  slot: string
  available: boolean
}

export default function Appointment() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorStatuses, setDoctorStatuses] = useState<Record<string, string>>({})
  const [staticDepts, setStaticDepts] = useState<{ slug: string; name: string; description: string }[]>([])
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [referenceId, setReferenceId] = useState('')

  // Form State matching Lovable and backend
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDocId, setSelectedDocId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [patientMobile, setPatientMobile] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [reason, setReason] = useState('')

  const location = useLocation()

  useEffect(() => {
    api.get('/public/doctors')
      .then(({ data }) => setDoctors(data.data || []))
      .catch(() => setError('Failed to load doctors list. Please reload.'))
  }, [])

  // Live doctor status badges: AVAILABLE / IN_CONSULTATION / NOT_AVAILABLE.
  // Advisory UI only — never blocks booking a future slot.
  useEffect(() => {
    if (doctors.length === 0) return
    let active = true
    const fetchStatuses = () => {
      Promise.all(
        doctors.map((d) =>
          api
            .get(`/public/doctors/${d.id}/status`)
            .then(({ data }) => ({ id: d.id, status: data?.data?.status || '' }))
            .catch(() => ({ id: d.id, status: '' }))
        )
      ).then((results) => {
        if (!active) return
        const map: Record<string, string> = {}
        results.forEach((r) => { if (r.status) map[r.id] = r.status })
        setDoctorStatuses(map)
      })
    }
    fetchStatuses()
    const timer = setInterval(fetchStatuses, 60000)
    return () => { active = false; clearInterval(timer) }
  }, [doctors])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const deptParam = params.get('dept')
    const docParam = params.get('doc')
    if (deptParam && docParam) {
      setSelectedDept(deptParam)
      setSelectedDocId(docParam)
      setStep(2) // Jump to Date & time
    }
  }, [location])

  useEffect(() => {
    let active = true
    fetchDepartments()
      .then((depts) => {
        if (!active) return
        setStaticDepts(
          depts.map((d) => {
            let parsedDesc = d.description;
            try {
              if (parsedDesc && parsedDesc.startsWith('{')) {
                const p = JSON.parse(parsedDesc);
                if (p.descriptionText) parsedDesc = p.descriptionText;
              }
            } catch (e) {}
            return {
              slug: d.slug,
              name: d.name,
              description: parsedDesc,
            };
          })
        )
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const filteredDoctors = useMemo(() => {
    if (!selectedDept) return doctors
    return doctors.filter(d => d.department.toLowerCase() === selectedDept.toLowerCase())
  }, [doctors, selectedDept])

  const selectedDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDocId)
  }, [doctors, selectedDocId])

  // Fetch real-time slot availability whenever a doctor + date are chosen.
  useEffect(() => {
    if (!selectedDocId || !selectedDate) return
    let active = true
    setSlotsLoading(true)
    setSelectedSlot('')
    api
      .get('/public/slots', { params: { doctor_id: selectedDocId, date: selectedDate } })
      .then(({ data }) => {
        if (active) {
          let fetchedSlots = data.data || []
          
          // Disable past slots if the selected date is today
          const today = new Date()
          const [yyyy, mm, dd] = selectedDate.split('-')
          const isToday = 
            today.getFullYear() === parseInt(yyyy, 10) &&
            today.getMonth() === parseInt(mm, 10) - 1 &&
            today.getDate() === parseInt(dd, 10)

          if (isToday) {
            fetchedSlots = fetchedSlots.map((s: Slot) => {
              const [time, modifier] = s.slot.split(' ')
              let [hours, minutes] = time.split(':')
              let hoursNum = parseInt(hours, 10)
              
              if (modifier === 'PM' && hoursNum < 12) hoursNum += 12
              if (modifier === 'AM' && hoursNum === 12) hoursNum = 0
              
              const slotTime = new Date()
              slotTime.setHours(hoursNum, parseInt(minutes, 10), 0, 0)
              
              if (slotTime < today) {
                return { ...s, available: false }
              }
              return s
            })
          }
          
          setSlots(fetchedSlots)
        }
      })
      .catch(() => { if (active) setSlots([]) })
      .finally(() => { if (active) setSlotsLoading(false) })
    return () => { active = false }
  }, [selectedDocId, selectedDate])

  const canGoNext = () => {
    if (step === 0) return !!selectedDept
    if (step === 1) return !!selectedDocId
    if (step === 2) return !!selectedDate && !!selectedSlot
    if (step === 3) return !!patientName.trim() && patientMobile.trim().length >= 10
    return true
  }

  const handleNext = () => {
    if (canGoNext() && step < 4) {
      setStep(s => s + 1)
      window.scrollTo({ top: 400, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1)
      window.scrollTo({ top: 400, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      // Map frontend fields to backend expected format
      const payload = {
        full_name: patientName,
        mobile: patientMobile,
        email: patientEmail,
        doctor_id: selectedDocId,
        appointment_date: selectedDate, // Backend handles date string
        time_slot: selectedSlot,
        reason: reason || `${selectedSlot} slot request`,
      }

      const res = await api.post('/public/appointments', payload)
      setReferenceId(res.data?.data?.patient_uhid || `AYU-${Math.floor(Math.random() * 90000 + 10000)}`)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <SEO title="Appointment Confirmed | Maitri Ayurveda" />
        <PageHero title="Appointment Requested" tag="Success" />
        <Section bg="ivory">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto rounded-3xl p-10 text-center bg-card border border-border shadow-[0_20px_50px_rgba(15,118,110,0.15)]"
          >
            <div className="mb-6 mx-auto h-20 w-20 rounded-full flex items-center justify-center bg-teal-50 text-primary border border-teal-100 shadow-inner">
              <Check className="h-10 w-10 stroke-[2.5]" />
            </div>

            <h2 className="text-2xl font-bold mb-3 text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Appointment Requested
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
              {patientName}, your slot with {selectedDoctor?.name || 'our consultant'} on {selectedDate} at {selectedSlot} is being confirmed.
            </p>

            <div className="mb-8 p-6 rounded-2xl text-left bg-muted/30 border border-border/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Booking Details</p>
              <div className="space-y-2 text-sm text-foreground">
                <p><strong>Reference UHID:</strong> <code className="bg-card px-2 py-0.5 border border-border rounded font-semibold text-primary">{referenceId}</code></p>
                <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                <p><strong>Department:</strong> {selectedDoctor?.department}</p>
                <p><strong>Date & Time:</strong> {selectedDate} at {selectedSlot}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccess(false)
                setStep(0)
                setSelectedDept('')
                setSelectedDocId('')
                setSelectedDate('')
                setSelectedSlot('')
                setPatientName('')
                setPatientMobile('')
                setPatientEmail('')
                setReason('')
              }}
              className="w-full py-4 rounded-full text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-lg"
            >
              Book Another Appointment
            </button>
          </motion.div>
        </Section>
      </>
    )
  }

  return (
    <>
      <SEO
        title="Book Appointment | Maitri Ayurveda"
        description="Schedule your consulting OPD with our certified doctors. Realtime slot verification."
      />

      <PageHero
        title="Book a consultation in under a minute."
        subtitle="Choose in-person or video. You will get an SMS confirmation with preparation notes."
        tag="Appointments"
      />

      <Section bg="ivory">
        <div className="max-w-6xl mx-auto">
          {/* Progress Indicator */}
          <ol className="grid gap-3 grid-cols-2 md:grid-cols-5 mb-10">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${i < step
                    ? 'bg-teal-700 text-white'
                    : i === step
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-card border border-border text-muted-foreground'
                    }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`text-xs font-semibold ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s}
                </span>
              </li>
            ))}
          </ol>

          {/* Form Card Container */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-[0_8px_40px_rgba(15,118,110,0.06)]">
            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 0: Select Department */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {staticDepts.map((d) => {
                    const IconComponent = DEPT_ICONS[d.name] || Activity
                    return (
                      <button
                        key={d.slug}
                        onClick={() => setSelectedDept(d.name)}
                        className={`rounded-2xl border p-6 text-left transition-all hover:shadow-md flex items-start gap-4 ${selectedDept.toLowerCase() === d.name.toLowerCase()
                          ? 'border-teal-600 bg-teal-50/20 ring-1 ring-teal-600'
                          : 'border-border/80 hover:border-border bg-card'
                          }`}
                      >
                        <div className="bg-teal-50 text-primary p-3 rounded-2xl shrink-0">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">{d.name}</p>
                          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{d.description.slice(0, 80)}...</p>
                        </div>
                      </button>
                    )
                  })}
                </motion.div>
              )}

              {/* Step 1: Select Doctor */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {filteredDoctors.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                      No doctors available in this department right now. Please select another department.
                    </div>
                  ) : (
                    filteredDoctors.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDocId(d.id)}
                        className={`rounded-2xl border p-6 text-left transition-all hover:shadow-md ${selectedDocId === d.id
                          ? 'border-teal-600 bg-teal-50/20 ring-1 ring-teal-600'
                          : 'border-border hover:border-border bg-card'
                          }`}
                      >
                        <p className="text-base font-bold text-foreground">{d.name}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{d.specialization}</p>
                        <div className="mt-3 flex items-center gap-2">
                          {STATUS_META[doctorStatuses[d.id]] ? (
                            <>
                              <span className={`h-2 w-2 rounded-full ${STATUS_META[doctorStatuses[d.id]].dot} animate-pulse`} />
                              <span className={`text-[11px] font-semibold ${STATUS_META[doctorStatuses[d.id]].text}`}>
                                {STATUS_META[doctorStatuses[d.id]].label}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">Checking status...</span>
                          )}
                        </div>
                        <p className="text-primary mt-4 text-xs font-semibold">Consultation: ₹{d.consultation_fee}</p>
                      </button>
                    ))
                  )}
                </motion.div>
              )}

              {/* Step 2: Select Date & Time Slot */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-8 md:grid-cols-2"
                >
                  <div>
                    <label htmlFor="date" className="block text-sm font-semibold text-foreground mb-2">Preferred Date</label>
                    <input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {
                            // ignore if already showing
                          }
                        }
                      }}
                      className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none bg-card text-foreground cursor-pointer"
                    />
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
                      {STATUS_META[doctorStatuses[selectedDocId]] ? (
                        <>
                          <span className={`h-2 w-2 rounded-full ${STATUS_META[doctorStatuses[selectedDocId]].dot} animate-pulse`} />
                          <span className={`text-xs font-semibold ${STATUS_META[doctorStatuses[selectedDocId]].text}`}>
                            {selectedDoctor?.name} — {STATUS_META[doctorStatuses[selectedDocId]].label}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {selectedDoctor?.name}
                        </span>
                      )}
                      {doctorStatuses[selectedDocId] === 'IN_CONSULTATION' && (
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          currently seeing a patient
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground mb-2">Available Slots</span>
                    <div className="grid grid-cols-2 gap-2">
                      {slotsLoading ? (
                        <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">Checking availability...</div>
                      ) : slots.length === 0 ? (
                        <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">Select a date above to see opening times.</div>
                      ) : (
                        slots.map((s) => (
                          <button
                            key={s.slot}
                            disabled={!s.available}
                            onClick={() => setSelectedSlot(s.slot)}
                            className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                              selectedSlot === s.slot
                                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                                : s.available
                                  ? 'border-border text-muted-foreground hover:border-border bg-card'
                                  : 'border-border text-slate-300 bg-muted/30 cursor-not-allowed line-through'
                            }`}
                          >
                            {s.slot}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Patient Details */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <div className="relative">
                    <label className="block text-sm font-semibold text-foreground mb-2">Full name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="w-full rounded-2xl border border-border pl-11 pr-5 py-3.5 text-sm outline-none text-foreground"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-semibold text-foreground mb-2">Mobile number *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={patientMobile}
                        onChange={(e) => setPatientMobile(e.target.value)}
                        placeholder="10 digit mobile"
                        required
                        className="w-full rounded-2xl border border-border pl-11 pr-5 py-3.5 text-sm outline-none text-foreground"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-semibold text-foreground mb-2">Email (optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="Your email address"
                        className="w-full rounded-2xl border border-border pl-11 pr-5 py-3.5 text-sm outline-none text-foreground"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-2">Symptoms or notes</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Briefly describe your concern"
                        rows={4}
                        className="w-full rounded-2xl border border-border pl-11 pr-5 py-3.5 text-sm outline-none text-foreground"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirm Booking */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-6 md:grid-cols-2"
                >
                  <dl className="space-y-3 text-sm text-foreground">
                    {[
                      ['Department', selectedDept],
                      ['Doctor', selectedDoctor?.name],
                      ['Date', selectedDate],
                      ['Time Slot', selectedSlot],
                      ['Patient Name', patientName],
                      ['Mobile Number', patientMobile],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-border pb-3">
                        <dt className="text-muted-foreground font-medium">{k}</dt>
                        <dd className="font-semibold text-foreground">{v || '—'}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="p-6 rounded-2xl bg-teal-50/30 border border-teal-100 flex flex-col justify-center">
                    <p className="flex items-center gap-2 text-sm font-bold text-primary">
                      <CreditCard className="h-4 w-4" /> Consultation Fee
                    </p>
                    <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                      Consultation fee is collected at the reception counter or via a secure payment link sent with your confirmation SMS.
                    </p>
                    <div className="mt-5 flex justify-between items-center bg-card p-4 border border-teal-100/50 rounded-xl">
                      <span className="text-sm font-semibold text-muted-foreground">Amount Due</span>
                      <span className="text-lg font-bold text-primary">₹{selectedDoctor?.consultation_fee || 0}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-10 flex justify-between border-t border-border pt-6">
              <button
                disabled={step === 0}
                onClick={handleBack}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all border ${step === 0
                  ? 'border-border text-slate-300 cursor-not-allowed'
                  : 'border-border text-muted-foreground hover:border-border bg-card'
                  }`}
              >
                Back
              </button>

              {step < 4 ? (
                <button
                  disabled={!canGoNext()}
                  onClick={handleNext}
                  className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${canGoNext()
                    ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-md'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-2.5 rounded-full text-xs font-bold transition-all bg-teal-700 hover:bg-teal-800 text-white shadow-md flex items-center gap-2"
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
