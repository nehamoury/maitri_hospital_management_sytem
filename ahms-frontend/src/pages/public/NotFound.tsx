import { Link } from 'react-router-dom'
import { Section, SectionNarrow, PageHero } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" />
      <PageHero 
        title="Page Not Found" 
        subtitle="The page you are looking for doesn't exist or has been moved."
        tag="404 Error"
      />
      <Section bg="white">
        <SectionNarrow className="text-center py-12">
          <Link
            to="/"
            className="inline-flex px-8 py-4 rounded-2xl font-semibold text-white transition-colors shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}
          >
            Return Home
          </Link>
        </SectionNarrow>
      </Section>
    </>
  )
}
