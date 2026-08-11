import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { portalApi, saveAuth, errorMessage } from '../../lib/api'
import { SEO } from '../../components/SEO'
import { PageHero, Section } from '../../design-system/Layout'
import { ShieldCheck, CalendarHeart, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp } from '../../design-system/animations'

interface PortalLoginData {
  access_token: string
  refresh_token: string
  expires_in_seconds: number
  user: {
    id: string
    full_name: string
    email: string
    mobile: string
    role_name: string
    permissions: string[]
  }
}

export default function PatientLogin() {
  const navigate = useNavigate()
  const [uhid, setUhid] = useState('')
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await portalApi.post<{ data: PortalLoginData }>('/portal/login', { uhid, mobile })
      const d = res.data.data
      saveAuth(
        {
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_in_seconds: d.expires_in_seconds,
          user: {
            id: d.user.id,
            full_name: d.user.full_name,
            email: d.user.email,
            mobile: d.user.mobile,
            role_name: d.user.role_name,
            permissions: d.user.permissions ?? [],
          },
        },
        true,
      )
      navigate('/portal')
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your UHID and mobile number.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SEO title="Patient Portal Login | Maitri Ayurveda" description="Login to access your medical records, prescriptions, and book appointments." />
      
      <PageHero 
        title="Patient Portal" 
        subtitle="Access your consultation records, personalized diet plans, and panchakarma schedules in one secure place."
      />

      <Section bg="ivory">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          
          {/* Left Side: Features */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-3xl font-bold text-emerald-950 mb-6 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Your health journey,<br />
              <span className="text-[#C8A14D]">managed beautifully.</span>
            </h2>
            
            <div className="space-y-6">
              {[
                { icon: ShieldCheck, title: 'Secure Health Records', desc: 'View prescriptions and test reports anytime.' },
                { icon: CalendarHeart, title: 'Easy Appointments', desc: 'Book and manage follow-ups seamlessly.' },
                { icon: Activity, title: 'Treatment Tracking', desc: 'Monitor your holistic wellness progress.' },
              ].map((feature, i) => (
                <motion.div 
                  key={i} 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-start gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
                    <feature.icon className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-950 text-lg">{feature.title}</h3>
                    <p className="text-sm text-emerald-700/80 mt-1">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side: Login Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-[2rem] p-8 sm:p-12 shadow-xl shadow-teal-900/5 border border-teal-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full opacity-50 -translate-y-1/2 translate-x-1/3" />
              
              <div className="relative z-10">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-emerald-950 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Welcome Back</h2>
                  <p className="text-sm text-emerald-700/70">Login with your UHID and registered mobile number</p>
                </div>

                <form onSubmit={submit} className="space-y-5">
                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-emerald-900 ml-1">UHID Number</label>
                    <input 
                      value={uhid} 
                      onChange={(e) => setUhid(e.target.value)} 
                      placeholder="e.g. AHMS-2026-XXXXXX" 
                      required 
                      className="w-full h-12 bg-white border border-emerald-200 rounded-xl px-4 text-emerald-950 placeholder:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#C8A14D]/50 focus:border-[#C8A14D] transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-emerald-900 ml-1">Registered Mobile</label>
                    <input 
                      type="tel" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      placeholder="Enter 10-digit number" 
                      required 
                      className="w-full h-12 bg-white border border-emerald-200 rounded-xl px-4 text-emerald-950 placeholder:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#C8A14D]/50 focus:border-[#C8A14D] transition-all"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 mt-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold shadow-md shadow-teal-900/10 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Access My Portal'
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-emerald-50 text-center">
                  <p className="text-xs text-emerald-600/70 mb-2">
                    Don't know your UHID? Contact reception.
                  </p>
                  <Link to="/" className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors">
                    &larr; Back to hospital website
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </Section>
    </>
  )
}
