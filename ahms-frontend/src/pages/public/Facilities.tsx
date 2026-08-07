import { PageHero, Section, FeatureCards, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'

export default function Facilities() {
  const facilities = [
    {
      title: 'Modern OPD',
      description: 'Fully equipped Outpatient Departments for all major Ayurvedic specialties with digital record keeping.',
      icon: '🏥',
    },
    {
      title: 'In-House Pharmacy',
      description: 'Authentic Ayurvedic medicines sourced from certified manufacturers and prepared under expert supervision.',
      icon: '💊',
    },
    {
      title: 'Consultation Rooms',
      description: 'Private, comfortable spaces designed to facilitate deep conversations between Vaidyas and patients.',
      icon: '🚪',
    },
    {
      title: 'Peaceful Waiting Area',
      description: 'A serene environment designed to calm the mind before your consultation or treatment.',
      icon: '🛋️',
    },
    {
      title: 'Therapy Rooms',
      description: 'Hygienic, traditional wooden massage tables (Dronis) with attached bath facilities for complete privacy.',
      icon: '🛏️',
    },
    {
      title: 'Herbal Garden',
      description: 'A lush garden featuring over 150 species of medicinal plants used in our treatments.',
      icon: '🌿',
    },
  ]

  return (
    <>
      <SEO 
        title="Our Facilities" 
        description="Explore the world-class infrastructure and healing environment at Maitri Ayurveda Hospital."
      />

      <PageHero
        title="Our Facilities"
        subtitle="A healing environment designed for your comfort and recovery."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Facilities' }]}
      />

      <Section bg="ivory">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Infrastructure & Amenities</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We blend traditional Ayurvedic aesthetics with modern medical infrastructure to provide a safe, clean, and profoundly healing atmosphere.
          </p>
        </div>
        <FeatureCards features={facilities} />
      </Section>

      <CTASection
        title="Experience the Healing Atmosphere"
        subtitle="Visit our hospital or book an online consultation today."
      >
        <Link
          to="/appointment"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-muted/30 transition-colors shadow-lg"
        >
          Book Appointment
        </Link>
        <Link
          to="/contact"
          className="px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/20 hover:bg-card/10 transition-colors"
        >
          Get Directions
        </Link>
      </CTASection>
    </>
  )
}
