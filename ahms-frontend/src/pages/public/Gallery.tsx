import { useState, useEffect } from 'react'
import { PageHero, Section, CTASection } from '../../design-system/Layout'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedImage, setSelectedImage] = useState<typeof images[0] | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const categories = ['All', 'Hospital', 'Treatments', 'Herbal Garden', 'Events']

  const images = [
    { id: 1, category: 'Hospital', src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', alt: 'Hospital Exterior' },
    { id: 2, category: 'Treatments', src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Panchakarma Therapy' },
    { id: 3, category: 'Hospital', src: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Consultation Room' },
    { id: 4, category: 'Herbal Garden', src: 'https://images.unsplash.com/photo-1466692476877-361ad3532646?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', alt: 'Medicinal Plants' },
    { id: 5, category: 'Events', src: 'https://images.unsplash.com/photo-1542840410-3092f99611a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', alt: 'Yoga Session' },
    { id: 6, category: 'Treatments', src: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80', alt: 'Herbal Medicine Preparation' },
  ]

  const filteredImages = activeCategory === 'All' ? images : images.filter(img => img.category === activeCategory)

  // Ensure modal closes if selected image is filtered out
  useEffect(() => {
    if (selectedImage && !filteredImages.find(img => img.id === selectedImage.id)) {
      setSelectedImage(null)
    }
  }, [filteredImages, selectedImage])

  // Body scroll lock
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedImage])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calculate specific Bento grid classes based on filtered index
  const getBentoClasses = (index: number) => {
    const desktopClasses = [
      'md:col-span-2 md:row-span-2', // Large square
      'md:col-span-1 md:row-span-1', // Small square
      'md:col-span-1 md:row-span-1', // Small square
      'md:col-span-1 md:row-span-1', // Small square
      'md:col-span-2 md:row-span-1', // Wide
      'md:col-span-3 md:row-span-1', // Very wide
    ]

    const tabletClasses = [
      'sm:col-span-2 sm:row-span-1',
      'sm:col-span-1 sm:row-span-1',
      'sm:col-span-1 sm:row-span-1',
      'sm:col-span-1 sm:row-span-1',
      'sm:col-span-1 sm:row-span-1',
      'sm:col-span-2 sm:row-span-1',
    ]

    return `${desktopClasses[index % desktopClasses.length]} ${tabletClasses[index % tabletClasses.length]} col-span-1 row-span-1`
  }

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
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-slate-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bento Image Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[250px] md:auto-rows-[300px] grid-flow-row dense">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((img, index) => (
              <motion.div
                layout
                key={img.id}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.4,
                  delay: prefersReducedMotion ? 0 : index * 0.05,
                  layout: { duration: 0.4, ease: "easeOut" }
                }}
                className={`group relative rounded-3xl overflow-hidden bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${getBentoClasses(index)}`}
                onClick={() => setSelectedImage(img)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedImage(img)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View full image: ${img.alt}`}
              >
                <motion.img
                  layoutId={`gallery-img-${img.id}`}
                  src={img.src}
                  alt={img.alt}
                  whileHover={!prefersReducedMotion ? { scale: 1.04 } : {}}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full h-full object-cover"
                />

                {/* Soft dark green overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#004d40]/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
                  <span className="text-white font-medium text-lg md:text-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    {img.alt}
                  </span>
                  <span className="text-teal-200 text-sm mt-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                    View Image →
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </Section>

      {/* FLIP Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
              aria-hidden="true"
            />

            {/* Modal Content Container */}
            <div className="relative z-10 w-full max-w-6xl flex flex-col items-center pointer-events-none">

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 md:-right-12 md:top-0 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close modal"
              >
                <X className="w-8 h-8" />
              </motion.button>

              {/* The FLIP Animated Image */}
              <motion.img
                layoutId={`gallery-img-${selectedImage.id}`}
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="w-full max-h-[80vh] object-contain rounded-2xl pointer-events-auto shadow-2xl"
                // Ensure the modal image doesn't scale on hover by overriding any residual hover state
                whileHover={{ scale: 1 }}
              />

              {/* Modal Metadata */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-6 text-center pointer-events-auto"
              >
                <h3 className="text-white text-xl md:text-2xl font-medium tracking-wide" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {selectedImage.alt}
                </h3>
                <p className="text-teal-400 mt-2 font-medium tracking-widest uppercase text-sm">
                  {selectedImage.category}
                </p>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <CTASection
        title="Experience It In Person"
        subtitle="We invite you to visit our campus and experience the serenity."
      >
        <Link
          to="/contact"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-primary hover:text-white transition-colors shadow-lg"
        >
          Plan a Visit
        </Link>
      </CTASection>
    </>
  )
}
