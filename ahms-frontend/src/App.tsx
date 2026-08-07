import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { getPortalToken } from './lib/api'
import { AdminLayout, AdminProtected } from './components/AdminLayout'
import { PublicPage, PortalShell } from './components/PublicLayout'
import { PermissionGate } from './lib/can'

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Patients = lazy(() => import('./pages/admin/Patients'))
const PatientNew = lazy(() => import('./pages/admin/PatientNew'))
const PatientDetail = lazy(() => import('./pages/admin/PatientDetail'))
const Appointments = lazy(() => import('./pages/admin/Appointments'))
const Encounters = lazy(() => import('./pages/admin/Encounters'))
const Consultation = lazy(() => import('./pages/admin/Consultation'))
const Prescriptions = lazy(() => import('./pages/admin/Prescriptions'))
const Referrals = lazy(() => import('./pages/admin/Referrals'))
const ReferralDetail = lazy(() => import('./pages/admin/ReferralDetail'))
const TreatmentPlans = lazy(() => import('./pages/admin/TreatmentPlans'))
const TreatmentSessions = lazy(() => import('./pages/admin/TreatmentSessions'))
const Pharmacy = lazy(() => import('./pages/admin/Pharmacy'))
const Billing = lazy(() => import('./pages/admin/Billing'))
const Doctors = lazy(() => import('./pages/admin/Doctors'))
const Departments = lazy(() => import('./pages/admin/Departments'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))

const Home = lazy(() => import('./pages/public/Home'))
const PublicDepartments = lazy(() => import('./pages/public/Departments'))
const PublicDoctors = lazy(() => import('./pages/public/Doctors'))
const DoctorDetail = lazy(() => import('./pages/public/DoctorDetail'))
const Appointment = lazy(() => import('./pages/public/Appointment'))
const Contact = lazy(() => import('./pages/public/Contact'))
const About = lazy(() => import('./pages/public/About'))
const Treatments = lazy(() => import('./pages/public/Treatments'))
const Panchakarma = lazy(() => import('./pages/public/Panchakarma'))
const Facilities = lazy(() => import('./pages/public/Facilities'))
const Research = lazy(() => import('./pages/public/Research'))
const Gallery = lazy(() => import('./pages/public/Gallery'))
const Blog = lazy(() => import('./pages/public/Blog'))
const NotFound = lazy(() => import('./pages/public/NotFound'))

const PatientLogin = lazy(() => import('./pages/portal/PatientLogin'))
const PortalHome = lazy(() => import('./pages/portal/PortalHome'))
const PortalAppointments = lazy(() => import('./pages/portal/PortalAppointments'))
const PortalPrescriptions = lazy(() => import('./pages/portal/PortalPrescriptions'))
const PortalBills = lazy(() => import('./pages/portal/PortalBills'))
const PortalProfile = lazy(() => import('./pages/portal/PortalProfile'))

function PortalProtected({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const portalToken = getPortalToken()
  if (!portalToken && !(token && user?.role_name === 'PATIENT')) {
    return <Navigate to="/portal/login" replace />
  }
  return <>{children}</>
}

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  
  return null
}

import { ThemeProvider } from './components/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ahms-theme">
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />

            <Route path="/admin" element={<AdminProtected><AdminLayout /></AdminProtected>}>
              <Route index element={<PermissionGate permission="dashboard.view"><Dashboard /></PermissionGate>} />
              <Route path="patients" element={<PermissionGate permission="patient.view"><Patients /></PermissionGate>} />
              <Route path="patients/new" element={<PermissionGate permission="patient.create"><PatientNew /></PermissionGate>} />
              <Route path="patients/:id" element={<PermissionGate permission="patient.view"><PatientDetail /></PermissionGate>} />
              <Route path="appointments" element={<PermissionGate permission="appointment.view"><Appointments /></PermissionGate>} />
              <Route path="encounters" element={<PermissionGate permission="encounter.view"><Encounters /></PermissionGate>} />
              <Route path="encounters/:id/consultation" element={<PermissionGate permission="consultation.view"><Consultation /></PermissionGate>} />
              <Route path="encounters/:id/prescriptions" element={<PermissionGate permission="prescription.view"><Prescriptions /></PermissionGate>} />
              <Route path="referrals" element={<PermissionGate permission="referral.view"><Referrals /></PermissionGate>} />
              <Route path="referrals/:id" element={<PermissionGate permission="referral.view"><ReferralDetail /></PermissionGate>} />
              <Route path="treatment-plans" element={<PermissionGate permission="treatment.view"><TreatmentPlans /></PermissionGate>} />
              <Route path="treatment-sessions" element={<PermissionGate permission="treatment.session"><TreatmentSessions /></PermissionGate>} />
              <Route path="pharmacy" element={<PermissionGate permission="pharmacy.view"><Pharmacy /></PermissionGate>} />
              <Route path="billing" element={<PermissionGate permission="billing.view"><Billing /></PermissionGate>} />
              <Route path="doctors" element={<PermissionGate permission="doctor.view"><Doctors /></PermissionGate>} />
              <Route path="departments" element={<PermissionGate permission="department.view"><Departments /></PermissionGate>} />
              <Route path="audit" element={<PermissionGate permission="audit.view"><AuditLogs /></PermissionGate>} />
            </Route>

            <Route path="/portal/login" element={<PublicPage><PatientLogin /></PublicPage>} />
            <Route
              path="/portal"
              element={
                <PortalProtected>
                  <PublicPage>
                    <PortalShell />
                  </PublicPage>
                </PortalProtected>
              }
            >
              <Route index element={<PortalHome />} />
              <Route path="appointments" element={<PortalAppointments />} />
              <Route path="prescriptions" element={<PortalPrescriptions />} />
              <Route path="bills" element={<PortalBills />} />
              <Route path="profile" element={<PortalProfile />} />
            </Route>

            <Route path="/" element={<PublicPage><Home /></PublicPage>} />
            <Route path="/about" element={<PublicPage><About /></PublicPage>} />
            <Route path="/departments" element={<PublicPage><PublicDepartments /></PublicPage>} />
            <Route path="/doctors" element={<PublicPage><PublicDoctors /></PublicPage>} />
            <Route path="/doctors/:slug" element={<PublicPage><DoctorDetail /></PublicPage>} />
            <Route path="/treatments" element={<PublicPage><Treatments /></PublicPage>} />
            <Route path="/panchakarma" element={<PublicPage><Panchakarma /></PublicPage>} />
            <Route path="/facilities" element={<PublicPage><Facilities /></PublicPage>} />
            <Route path="/research" element={<PublicPage><Research /></PublicPage>} />
            <Route path="/gallery" element={<PublicPage><Gallery /></PublicPage>} />
            <Route path="/blog" element={<PublicPage><Blog /></PublicPage>} />
            <Route path="/appointment" element={<PublicPage><Appointment /></PublicPage>} />
            <Route path="/contact" element={<PublicPage><Contact /></PublicPage>} />

            <Route path="*" element={<PublicPage><NotFound /></PublicPage>} />
          </Routes>
        </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}