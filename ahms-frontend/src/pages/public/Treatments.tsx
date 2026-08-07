import { PageHero, Section, InfoSection, FeatureCards, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'

export default function Treatments() {
  const opdIpdFeatures = [
    {
      title: 'Modern OPD',
      description: 'Consult with expert Vaidyas for personalized treatment plans in our state-of-the-art Outpatient Department.',
      icon: '🩺',
    },
    {
      title: 'Comfortable IPD',
      description: 'Inpatient facilities providing 24/7 care, prescribed Ayurvedic diets, and specialized therapies in a healing environment.',
      icon: '🛏️',
    },
    {
      title: 'Preventive Care',
      description: 'Lifestyle counseling, dietary planning (Pathya-Apathya), and seasonal regimens (Ritucharya) for long-term wellness.',
      icon: '🛡️',
    },
  ]

  return (
    <>
      <SEO 
        title="Treatments" 
        description="Explore our comprehensive range of Ayurvedic treatments, therapies, and holistic healthcare services."
      />
      
      <PageHero
        title="Ayurvedic Treatments"
        subtitle="Holistic, personalized therapies to restore balance and vitality."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Treatments' }]}
      />

      {/* Ayurveda Therapies */}
      <InfoSection
        title="Classical Ayurveda Therapies"
        subtitle="Healing from the Roots"
        content={
          <>
            <p>
              We offer a wide spectrum of classical Ayurvedic therapies tailored to your unique mind-body constitution (Prakriti). Our treatments aim to address the root cause of the ailment rather than merely suppressing the symptoms.
            </p>
            <p className="mt-4">
              From specialized oil massages (Abhyanga) to localized treatments (Kati Basti, Janu Basti) and herbal steam baths (Swedana), our therapies are administered by highly trained therapists under the strict supervision of expert Vaidyas.
            </p>
          </>
        }
        imageSrc="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      />

      {/* OPD, IPD, Preventive Care */}
      <Section bg="ivory">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Comprehensive Care Facilities</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you need a quick consultation or extended residential care, we have the right facilities to support your healing journey.
          </p>
        </div>
        <FeatureCards features={opdIpdFeatures} />
      </Section>

      <CTASection
        title="Not Sure Which Treatment is Right for You?"
        subtitle="Our doctors can evaluate your doshas and recommend a personalized plan."
      >
        <Link
          to="/doctors"
          className="px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/20 hover:bg-card/10 transition-colors"
        >
          View Our Doctors
        </Link>
        <Link
          to="/appointment"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-muted/30 transition-colors shadow-lg"
        >
          Consult a Vaidya
        </Link>
      </CTASection>
    </>
  )
}
