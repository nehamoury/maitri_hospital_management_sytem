import { Section, SectionNarrow, PageHero } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'

export default function Privacy() {
  return (
    <>
      <SEO title="Privacy Policy" />
      <PageHero 
        title="Privacy Policy" 
        subtitle="Your privacy is important to us. Learn how we handle your data."
        tag="Security"
      />
      <Section bg="white">
        <SectionNarrow className="space-y-6">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800">1. Information Collection</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We collect personal details such as your name, date of birth, contact number, email address, and clinical/medical history when you register or book an appointment through our website or patient portal.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">2. Use of Information</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your information is used strictly to provide healthcare consultations, manage digital health records, process bills, and coordinate Ayurvedic therapies (Panchakarma sessions).
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">3. Data Security</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We implement industry-standard encryption and security measures to protect your medical details and personal data from unauthorized access or disclosure.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">4. Sharing of Data</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We do not sell or share patient data with third-party marketing companies. Your records are only accessed by authorized hospital physicians and therapists involved in your healing plan.
            </p>
          </div>
        </SectionNarrow>
      </Section>
    </>
  )
}
