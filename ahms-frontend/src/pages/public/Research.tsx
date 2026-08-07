import { PageHero, Section, InfoSection, FeatureCards, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'

export default function Research() {
  const researchAreas = [
    {
      title: 'Clinical Research',
      description: 'Conducting evidence-based trials to validate the efficacy of classical Ayurvedic formulations in modern contexts.',
      icon: '🔬',
    },
    {
      title: 'Publications',
      description: 'Publishing findings in peer-reviewed journals to contribute to the global understanding of Ayurvedic medicine.',
      icon: '📚',
    },
    {
      title: 'Ayurveda Studies',
      description: 'Deep textual research into ancient Samhitas to unearth forgotten therapies and drug formulations.',
      icon: '📜',
    },
    {
      title: 'Innovation',
      description: 'Developing standardized, high-quality herbal extracts and delivery mechanisms without compromising classical principles.',
      icon: '💡',
    },
  ]

  return (
    <>
      <SEO 
        title="Research & Innovation" 
        description="Discover how Maitri Ayurveda is advancing the science of Ayurveda through clinical research and publications."
      />

      <PageHero
        title="Research & Innovation"
        subtitle="Validating ancient wisdom through modern scientific rigor."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Research' }]}
      />

      {/* Introduction */}
      <InfoSection
        title="Evidence-Based Ayurveda"
        subtitle="Bridging the Gap"
        content={
          <>
            <p>
              At Maitri Ayurveda, we believe that the ancient science of Ayurveda holds the key to solving many of modern medicine's most pressing challenges. However, we also recognize the need for rigorous scientific validation.
            </p>
            <p className="mt-4">
              Our dedicated Research Wing collaborates with leading universities and modern medical hospitals to conduct clinical trials, standardize herbal preparations, and document case studies of successful Ayurvedic interventions in chronic diseases.
            </p>
          </>
        }
        imageSrc="https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      />

      {/* Research Areas */}
      <Section bg="ivory">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Our Core Focus Areas</h2>
        </div>
        <FeatureCards features={researchAreas} />
      </Section>

      <CTASection
        title="Collaborate With Us"
        subtitle="We welcome partnerships with researchers, institutions, and scholars."
      >
        <Link
          to="/contact"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-muted/30 transition-colors shadow-lg"
        >
          Contact Research Department
        </Link>
      </CTASection>
    </>
  )
}
