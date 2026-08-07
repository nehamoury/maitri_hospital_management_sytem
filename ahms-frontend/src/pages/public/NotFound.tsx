import { Link } from 'react-router-dom'
import { Section } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" />
      <div className="min-h-[80vh] flex flex-col items-center justify-center pt-20">
        <Section className="flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-9xl font-bold text-primary mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>404</h1>
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>Page Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
              The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/"
              className="inline-flex px-8 py-4 rounded-2xl font-semibold text-white transition-colors shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}
            >
              Return Home
            </Link>
          </div>
        </Section>
      </div>
    </>
  )
}
