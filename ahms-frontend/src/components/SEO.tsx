import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
}

export function SEO({ title, description, canonical }: SEOProps) {
  const siteTitle = 'Maitri Ayurveda';
  const fullTitle = `${title} | ${siteTitle}`;
  const defaultDesc = 'A NABH-accredited Ayurvedic hospital blending 5,000-year-old classical medicine with modern diagnostics, research and hospitality.';
  const metaDesc = description || defaultDesc;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content="website" />
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
}
