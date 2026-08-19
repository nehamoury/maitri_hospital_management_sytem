import { motion } from 'framer-motion'
import { Leaf, Calendar, Clock, Tag, Quote, Wind, Flame, Droplets } from 'lucide-react'

export function BlogPostLayout({ post }: { post: any }) {
  // Generate Table of Contents dynamically from post.content H2/H3 tags
  const headings = post.content.match(/<h[23][^>]*>(.*?)<\/h[23]>/g)
  let tableOfContents = headings ? headings.map((h: string) => h.replace(/<[^>]+>/g, '')) : []

  // Override TOC for the specific custom post to match perfectly
  if (post.id === 'understanding-your-prakriti') {
    tableOfContents = [
      'What is Prakriti?',
      '1. Vata (Space and Air)',
      '2. Pitta (Fire and Water)',
      '3. Kapha (Earth and Water)',
      'Balancing Your Doshas'
    ]
  }

  // Calculate estimated read time (assuming ~200 words per minute)
  const wordCount = post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  // Process generic content to look like the custom one
  let processedContent = post.content;
  if (post.id !== 'understanding-your-prakriti') {
    const leafDividerHtml = `
      <div class="flex items-center gap-3 my-6 max-w-md not-prose">
        <div class="flex-1 h-px bg-teal-900/20 dark:bg-teal-100/20"></div>
        <svg class="w-5 h-5 text-teal-600 dark:text-teal-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
        <div class="flex-1 h-px bg-teal-900/20 dark:bg-teal-100/20"></div>
      </div>
    `;

    processedContent = post.content
      .replace(/<h2>(.*?)<\/h2>/g, `<h2 class="!text-3xl md:!text-4xl !font-semibold !text-teal-900 dark:!text-white !mb-2 !mt-12 !leading-tight" style="font-family: 'Poppins', sans-serif;">$1</h2>${leafDividerHtml}`)
      .replace(/<h3>(.*?)<\/h3>/g, `<h3 class="!text-2xl md:!text-3xl !font-semibold !text-slate-800 dark:!text-slate-200 !mt-10 !mb-4 !leading-snug" style="font-family: 'Poppins', sans-serif;">$1</h3>`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      
      {/* Dark Hero Section matching the rest of the site */}
      <div className="relative overflow-hidden flex flex-col justify-center min-h-[400px] sm:min-h-[450px] md:min-h-[500px]"
        style={{ paddingTop: '100px', paddingBottom: '60px' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(15, 23, 42, 0.6), rgba(15, 118, 110, 0.9)), url("${post.image}") center/cover no-repeat`,
          }}
        />
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* Decorative circles */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C8A14D, transparent)' }} />
        <div className="absolute -left-12 bottom-0 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #14B8A6, transparent)' }} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2">
              <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
              <span className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: '#C8A14D' }}>
                <Leaf className="w-3.5 h-3.5" />
                {post.category}
              </span>
              <div className="w-8 h-px" style={{ background: '#C8A14D' }} />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight drop-shadow-lg mx-auto"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #d1fae5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: '#ffffff',
              }}
            >
              {post.title}
            </span>
          </motion.h1>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {post.date}</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {readTime} min read</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> By {post.author}</span>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-12">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 lg:col-start-1">
            <div className="sticky top-28 space-y-8">
              
              {/* In This Article */}
              {tableOfContents.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-lg mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <Leaf className="w-5 h-5 text-primary" /> In This Article
                  </h3>
                  <ul className="space-y-4">
                    {tableOfContents.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary cursor-pointer transition-colors font-medium">
                        <Leaf className="w-3.5 h-3.5 mt-0.5 text-primary/50 shrink-0" />
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quote Block */}
              <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-8 shadow-sm border border-primary/10 relative overflow-hidden">
                <Quote className="w-10 h-10 text-primary/20 absolute top-6 left-6" />
                <p className="relative z-10 text-lg font-bold text-slate-800 dark:text-slate-200 leading-snug mt-8 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  "When you know your nature, you can nurture your health. Balance is the key to life."
                </p>
                <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-primary">
                  <div className="w-4 h-px bg-primary" />
                  Ayurvedic Wisdom
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9 lg:col-start-5 xl:col-start-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 lg:p-12 shadow-sm border border-slate-100 dark:border-slate-800">
              
              {/* If it's the custom prakriti post, render the beautiful hardcoded content */}
              {post.id === 'understanding-your-prakriti' ? (
                <div className="prose prose-lg max-w-none text-slate-600 dark:text-slate-300">
                  <h2 className="text-3xl md:text-4xl font-bold text-teal-900 dark:text-white mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>What is Prakriti?</h2>
                  
                  <div className="flex items-center gap-3 my-6 max-w-md">
                    <div className="flex-1 h-px bg-primary/20" />
                    <Leaf className="w-5 h-5 text-primary" />
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>

                  <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 mb-10">
                    Prakriti refers to your unique mind-body constitution. According to Ayurveda, everything in the universe,
                    including humans, is made up of five elements: <strong className="text-primary">Space, Air, Fire, Water,</strong> and <strong className="text-primary">Earth.</strong>
                    <br /><br />
                    These elements combine to form three primary energies or doshas—<strong className="text-primary">Vata, Pitta,</strong> and <strong className="text-primary">Kapha.</strong>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12 not-prose">
                    {/* Vata Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                          <Wind className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">1. Vata</h4>
                          <span className="text-sm font-semibold text-blue-600/80 dark:text-blue-400">(Space and Air)</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                        Vata governs all movement in the mind and body. It controls blood flow, elimination of wastes.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Physical:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Thin, light frame, dry skin.</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Mental:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Creative, but prone to anxiety.</span>
                        </div>
                      </div>
                    </div>

                    {/* Pitta Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-orange-100/50 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center shrink-0">
                          <Flame className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">2. Pitta</h4>
                          <span className="text-sm font-semibold text-orange-600/80 dark:text-orange-400">(Fire and Water)</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                        Pitta governs digestion, absorption, assimilation, nutrition, metabolism.
                      </p>
                      <div className="space-y-3 mt-auto">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Physical:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Medium build, warm body.</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Mental:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Intelligent, focused, ambitious.</span>
                        </div>
                      </div>
                    </div>

                    {/* Kapha Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-xl bg-green-100/50 dark:bg-green-900/30 text-green-600 flex items-center justify-center shrink-0">
                          <Droplets className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">3. Kapha</h4>
                          <span className="text-sm font-semibold text-green-700/80 dark:text-green-400">(Earth & Water)</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                        Kapha provides structure, solidity, and cohesiveness to the body.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Physical:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Solid, heavier build, smooth skin.</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 block mb-1">Mental:</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">Calm, loving, and forgiving.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold text-teal-900 dark:text-white mb-2 mt-16" style={{ fontFamily: "'Poppins', sans-serif" }}>Balancing Your Doshas</h2>
                  
                  <div className="flex items-center gap-3 my-6 max-w-md">
                    <div className="flex-1 h-px bg-primary/20" />
                    <Leaf className="w-5 h-5 text-primary" />
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>

                  <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                    The goal of Ayurveda is not to change your original constitution, but rather to bring your current state of health back into alignment with it. This involves personalized dietary choices, lifestyle modifications, and herbal treatments.
                    <br /><br />
                    Consult with our Ayurvedic practitioners to discover your unique Prakriti and receive a tailored plan for optimal health.
                  </p>
                </div>
              ) : (
                /* Fallback generic layout for all other blogs */
                <div 
                  className="prose prose-base md:prose-lg prose-slate max-w-none dark:prose-invert prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-a:text-teal-600 hover:prose-a:text-teal-700 prose-blockquote:border-l-teal-500 prose-blockquote:bg-teal-50/50 dark:prose-blockquote:bg-teal-900/20 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:font-medium prose-blockquote:not-italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
