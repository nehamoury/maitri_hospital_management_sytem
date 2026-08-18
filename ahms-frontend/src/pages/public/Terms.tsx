import { Section, SectionNarrow, PageHero } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'

export default function Terms() {
  return (
    <>
      <SEO title="Terms & Conditions" />
      <PageHero 
        title="Terms & Conditions" 
        subtitle="Please read these terms carefully before using our services."
        tag="Legal"
      />
      <Section bg="white">
        <SectionNarrow className="space-y-6">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800">1. Acceptance of Terms</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              By accessing and using Maitri Ayurveda, you agree to be bound by these Terms & Conditions. If you do not agree to all of these terms, please do not use our services or website.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">2. Medical Disclaimer</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The content provided on this website, including text, graphics, images, and other material, is for informational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">3. Appointment & Consultations</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Appointments booked online are subject to doctor availability. We reserve the right to cancel or reschedule consultations under unforeseen circumstances. Patients will be notified in advance.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">4. Privacy Policy</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your use of our website is also governed by our Privacy Policy, which outlines how we collect, use, and protect your personal and clinical data.
            </p>
          </div>
        </SectionNarrow>
      </Section>
    </>
  )
}
