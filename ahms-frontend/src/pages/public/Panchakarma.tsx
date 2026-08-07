import { PageHero, Section, InfoSection, FeatureCards, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { panchakarmaTherapies } from '../../design-system/tokens'
import { SEO } from '../../components/SEO'

export default function Panchakarma() {
  const benefits = [
    { title: 'Detoxification', description: 'Removes deep-rooted toxins from the body and mind.', icon: '🧹' },
    { title: 'Rejuvenation', description: 'Restores youthfulness and revitalizes cellular function.', icon: '🌱' },
    { title: 'Immunity Boost', description: 'Strengthens the immune system and builds resistance to disease.', icon: '🛡️' },
  ]

  return (
    <>
      <SEO 
        title="Panchakarma Therapy" 
        description="Experience complete detoxification and rejuvenation through the five classical therapies of Panchakarma."
      />

      <PageHero
        title="Panchakarma"
        subtitle="The ultimate Ayurvedic detoxification and rejuvenation program."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Treatments', to: '/treatments' }, { label: 'Panchakarma' }]}
      />

      {/* Introduction */}
      <InfoSection
        title="What is Panchakarma?"
        subtitle="The Science of Purification"
        content={
          <>
            <p>
              Panchakarma (meaning "Five Actions") is Ayurveda's primary purification and detoxification treatment. It is a highly personalized series of therapies designed to cleanse the body of deep-rooted toxins, balance the doshas, and restore optimal health.
            </p>
            <p className="mt-4">
              Unlike standard spa treatments, Panchakarma is a deep clinical procedure that requires careful preparation, strict dietary protocols, and post-treatment rejuvenation to ensure the body heals from the inside out.
            </p>
          </>
        }
        imageSrc="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      />

      {/* The Five Therapies */}
      <Section bg="ivory">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>The Core Therapies</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Depending on your condition, our Vaidyas will prescribe a specific combination of these classical treatments.
          </p>
        </div>
        <FeatureCards features={panchakarmaTherapies.map(t => ({ title: t.name, description: t.desc, icon: t.icon }))} />
      </Section>

      {/* Benefits & Process */}
      <InfoSection
        reverse
        title="The Treatment Process"
        subtitle="Purva, Pradhana & Paschat Karma"
        content={
          <>
            <ul className="space-y-4 mb-6">
              <li><strong>1. Purva Karma (Preparation):</strong> Oleation (Snehana) and sweating (Swedana) therapies to dislodge toxins and bring them to the GI tract.</li>
              <li><strong>2. Pradhana Karma (Main Treatment):</strong> The actual elimination of toxins through specific Panchakarma therapies like Vamana, Virechana, or Basti.</li>
              <li><strong>3. Paschat Karma (Rejuvenation):</strong> Strict dietary regimens, lifestyle modifications, and rejuvenating herbs to restore digestive fire and build tissues.</li>
            </ul>
          </>
        }
        imageSrc="https://images.unsplash.com/photo-1599824640103-60589bd1423c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      />

      {/* Benefits */}
      <Section bg="white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Benefits of Panchakarma</h2>
        </div>
        <FeatureCards features={benefits} />
      </Section>

      <CTASection
        title="Experience Deep Healing"
        subtitle="Our 7 to 21-day residential Panchakarma programs are customized for you."
      >
        <Link
          to="/appointment"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-muted/30 transition-colors shadow-lg"
        >
          Book an Assessment
        </Link>
      </CTASection>
    </>
  )
}
