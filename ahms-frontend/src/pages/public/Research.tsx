import { PageHero, InfoSection, CTASection } from '../../design-system/Layout'
import { motion, useReducedMotion } from 'framer-motion'
import { viewportOpts } from '../../design-system/animations'
import { Link } from 'react-router-dom'
import { SEO } from '../../components/SEO'

export default function Research() {
  const prefersReducedMotion = useReducedMotion()
  
  const researchAreas = [
    {
      id: '01',
      title: 'Clinical Research',
      description: 'Conducting evidence-based trials to validate the efficacy of classical Ayurvedic formulations in modern contexts.',
      icon: '🔬',
      iconBg: 'bg-teal-50',
      isFeatured: false
    },
    {
      id: '02',
      title: 'Publications',
      description: 'Publishing findings in peer-reviewed journals to contribute to the global understanding of Ayurvedic medicine.',
      icon: '📚',
      iconBg: 'bg-orange-50',
      isFeatured: false
    },
    {
      id: '03',
      title: 'Ayurveda Studies',
      description: 'Deep textual research into ancient Samhitas to unearth forgotten therapies and drug formulations.',
      icon: '📜',
      iconBg: 'bg-amber-50',
      isFeatured: false
    },
    {
      id: '04',
      title: 'Innovation',
      description: 'Developing standardized, high-quality herbal extracts and delivery mechanisms without compromising classical principles.',
      icon: '💡',
      iconBg: 'bg-purple-50',
      isFeatured: false
    },
    {
      id: '05',
      title: 'Herbal Formulations',
      description: 'Researching and developing safe, effective, and standardized herbal formulations for various health conditions.',
      icon: '🌿',
      iconBg: 'bg-rose-50',
      isFeatured: false
    },
    {
      id: '06',
      title: 'Global Collaboration',
      description: 'Building partnerships with institutions worldwide to advance Ayurvedic research and its global acceptance.',
      icon: '🌍',
      iconBg: 'bg-blue-50',
      isFeatured: false
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  // Botanical background decorative elements
  const FloatingLeaf = ({ className, delay = 0, duration = 8 }: { className: string, delay?: number, duration?: number }) => {
    if (prefersReducedMotion) return null;
    return (
      <motion.svg
        className={`absolute opacity-[0.03] pointer-events-none ${className}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        initial={{ y: 0, rotate: 0 }}
        animate={{ y: [-15, 15, -15], rotate: [-5, 5, -5] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
      >
        <path d="M17.6 3.6C16.8 3.2 15.6 3 14 3 9.6 3 6 6.6 6 11c0 1.5.4 2.8 1 4L3.6 18.4c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3L8.4 16c1.2.6 2.5 1 4 1 4.4 0 8-3.6 8-8 0-1.6-.2-2.8-.6-3.6-.4-.8-1.2-1.4-2.2-1.8z" />
      </motion.svg>
    )
  }

  return (
    <>
      <SEO 
        title="Research & Innovation" 
        description="Discover how Maitri Ayurveda is advancing the science of Ayurveda through clinical research and publications."
      />

      <PageHero
        title="Research & Innovation"
        subtitle="Validating ancient wisdom through modern scientific rigor."
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

      {/* Premium Research Areas Section */}
      <section className="relative py-16 md:py-24 lg:py-32 bg-[#F7FBF9] overflow-hidden">
        {/* Animated Botanical Background */}
        <FloatingLeaf className="w-64 h-64 -top-12 -left-12 text-teal-900" duration={9} />
        <FloatingLeaf className="w-96 h-96 top-1/4 -right-24 text-teal-800" delay={2} duration={11} />
        <FloatingLeaf className="w-48 h-48 bottom-12 left-1/4 text-emerald-900" delay={1} duration={8} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1350px]">
          
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOpts}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center mb-16 md:mb-20"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-medium text-sm mb-6 shadow-sm">
              <span className="text-base">🌿</span> Our Research Areas
            </div>
            
            {/* Main Heading */}
            <h2 className="font-bold text-slate-900 mb-6 tracking-tight leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontFamily: "'Poppins', sans-serif" }}>
              Our Research <span className="text-teal-700">Focus</span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-slate-600 max-w-[700px] leading-relaxed mb-8">
              Exploring traditional wisdom through modern science to create a healthier tomorrow.
            </p>
            
            {/* Elegant Divider */}
            <div className="flex items-center gap-4 opacity-70">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-teal-600/40"></div>
              <span className="text-teal-700 text-xl">🌿</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-teal-600/40"></div>
            </div>
          </motion.div>

          {/* Cards Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {researchAreas.map((card) => (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className={`group relative flex flex-col p-6 sm:p-8 rounded-[24px] transition-all duration-300 border overflow-hidden
                  ${card.isFeatured 
                    ? 'border-transparent shadow-[0_15px_40px_rgba(0,134,111,0.2)] hover:shadow-[0_20px_50px_rgba(0,134,111,0.3)]' 
                    : 'bg-white/90 backdrop-blur-sm border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,134,111,0.3)] hover:border-transparent'
                  }
                  ${!prefersReducedMotion && 'hover:-translate-y-1.5'}
                `}
              >
                {/* Background layers for smooth hover transition */}
                <div className={`absolute inset-0 bg-gradient-to-br from-[#00866F] to-[#006B5B] transition-opacity duration-300 
                  ${card.isFeatured ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `} />

                {/* Decorative botanical */}
                <svg className={`absolute bottom-0 right-0 w-48 h-48 text-white pointer-events-none transform translate-x-8 translate-y-8 transition-opacity duration-300
                  ${card.isFeatured ? 'opacity-[0.04]' : 'opacity-0 group-hover:opacity-[0.04]'}
                `} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 3.6C16.8 3.2 15.6 3 14 3 9.6 3 6 6.6 6 11c0 1.5.4 2.8 1 4L3.6 18.4c-.4.4-.4 1 0 1.4.2.2.5.3.7.3.3 0 .5-.1.7-.3L8.4 16c1.2.6 2.5 1 4 1 4.4 0 8-3.6 8-8 0-1.6-.2-2.8-.6-3.6-.4-.8-1.2-1.4-2.2-1.8z" />
                </svg>

                {/* Card Header (Icon & Counter) */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-[56px] h-[56px] rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${!prefersReducedMotion && 'group-hover:scale-105'} 
                    ${card.isFeatured ? 'bg-white/10' : `${card.iconBg} group-hover:bg-white/10`}
                  `}>
                    {card.icon}
                  </div>
                  <span className={`text-sm font-semibold tracking-widest transition-colors duration-300
                    ${card.isFeatured ? 'text-teal-100' : 'text-slate-400 group-hover:text-teal-100'}
                  `}>
                    {card.id} / 06
                  </span>
                </div>

                {/* Card Content */}
                <div className="flex-1 relative z-10">
                  <h3 className={`text-xl sm:text-2xl font-bold mb-3 transition-colors duration-300
                    ${card.isFeatured ? 'text-white' : 'text-slate-900 group-hover:text-white'}
                  `} style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {card.title}
                  </h3>
                  <p className={`text-sm sm:text-[15px] leading-[1.6] transition-colors duration-300
                    ${card.isFeatured ? 'text-teal-50' : 'text-slate-600 group-hover:text-teal-50'}
                  `}>
                    {card.description}
                  </p>
                </div>

                {/* Card Footer (Learn More) */}
                <div className="mt-8 relative z-10">
                  <Link to="#" className={`inline-flex items-center gap-2 text-[15px] font-semibold transition-colors duration-300
                    ${card.isFeatured ? 'text-white hover:text-teal-100' : 'text-teal-700 group-hover:text-white'}
                  `}>
                    Learn More 
                    <span className={`text-lg transition-transform duration-300 ${!prefersReducedMotion && 'group-hover:translate-x-1.5'}`}>→</span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <CTASection
        title="Collaborate With Us"
        subtitle="We welcome partnerships with researchers, institutions, and scholars."
      >
        <Link
          to="/contact"
          className="px-8 py-4 rounded-2xl font-semibold text-primary bg-card hover:bg-primary hover:text-white transition-colors shadow-lg"
        >
          Contact Research Department
        </Link>
        <Link
          to="/about"
          className="px-8 py-4 rounded-2xl font-semibold text-white border-2 border-white/20 hover:bg-white/10 transition-colors"
        >
          Learn About Our Mission
        </Link>
      </CTASection>
    </>
  )
}
