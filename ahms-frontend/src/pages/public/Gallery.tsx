import { useState } from 'react'
import { PageHero, Section, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'
import { motion, AnimatePresence } from 'framer-motion'

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = ['All', 'Hospital', 'Treatments', 'Herbal Garden', 'Events']

  const images = [
    { id: 1, category: 'Hospital', src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Hospital Exterior' },
    { id: 2, category: 'Treatments', src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Panchakarma Therapy' },
    { id: 3, category: 'Hospital', src: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Consultation Room' },
    { id: 4, category: 'Herbal Garden', src: 'https://images.unsplash.com/photo-1466692476877-361ad3532646?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Medicinal Plants' },
    { id: 5, category: 'Events', src: 'https://images.unsplash.com/photo-1542840410-3092f99611a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Yoga Session' },
    { id: 6, category: 'Treatments', src: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Herbal Medicine Preparation' },
  ]

  const filteredImages = activeCategory === 'All' ? images : images.filter(img => img.category === activeCategory)

  return (
    <>
      <SEO 
        title="Photo Gallery" 
        description="Take a visual tour of Maitri Ayurveda Hospital, our facilities, treatments, and herbal gardens."
      />

      <PageHero
        title="Photo Gallery"
        subtitle="A glimpse into the healing environment of Maitri Ayurveda."
      />

      <Section>
        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat 
                  ? 'bg-teal-700 text-white shadow-md' 
                  : 'bg-muted text-muted-foreground hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredImages.map((img) => (
              <motion.div
                layout
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="group relative aspect-square rounded-3xl overflow-hidden bg-muted cursor-pointer"
              >
                <img 
                  src={img.src} 
                  alt={img.alt} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="text-white font-medium text-lg">{img.alt}</span>
                  <span className="text-teal-300 text-sm">{img.category}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </Section>

      <CTASection
        title="Experience It In Person"
        subtitle="We invite you to visit our campus and experience the serenity."
      >
        <Link
          to="/contact"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-muted/30 transition-colors shadow-lg"
        >
          Plan a Visit
        </Link>
      </CTASection>
    </>
  )
}
