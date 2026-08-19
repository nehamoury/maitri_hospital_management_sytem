import { Link } from 'react-router-dom'
import { PageHero, Section, CTASection } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'
import blogHerbs from '../../assets/blog_herbs.jpg'
import blogShirodhara from '../../assets/blog_shirodhara.jpg'
import blogYoga from '../../assets/blog_yoga.jpg'
import featuredImg from '../../assets/hero_treatment_room.png'

export default function Blog() {
  const categories = ['All', 'Health Tips', 'Ayurvedic Diet', 'Yoga & Meditation', 'Case Studies']
  
  const featuredPost = {
    title: 'Understanding Your Prakriti: The Key to Personalized Health',
    excerpt: 'In Ayurveda, no two individuals are the same. Discover how identifying your unique Vata, Pitta, or Kapha constitution can transform your diet and lifestyle.',
    category: 'Health Tips',
    date: 'Oct 12, 2023',
    image: featuredImg
  }

  const posts = [
    {
      id: 1,
      title: '5 Ayurvedic Herbs to Boost Your Immunity This Winter',
      excerpt: 'Prepare your body for the cold season with these powerful, easily accessible Ayurvedic herbs like Tulsi and Ashwagandha.',
      category: 'Ayurvedic Diet',
      date: 'Nov 05, 2023',
      image: blogHerbs
    },
    {
      id: 2,
      title: 'The Science Behind Shirodhara',
      excerpt: 'How a continuous stream of warm oil on the forehead can alleviate stress, anxiety, and insomnia naturally.',
      category: 'Treatments',
      date: 'Oct 28, 2023',
      image: blogShirodhara
    },
    {
      id: 3,
      title: 'Yoga Asanas for Better Digestion',
      excerpt: 'Incorporate these simple daily stretches to stimulate Agni (digestive fire) and prevent bloating and acidity.',
      category: 'Yoga & Meditation',
      date: 'Oct 15, 2023',
      image: blogYoga
    }
  ]

  return (
    <>
      <SEO 
        title="Ayurveda Blog & Health Tips" 
        description="Read the latest articles on Ayurvedic health, diet, lifestyle, and natural healing from our expert Vaidyas."
      />

      <PageHero
        title="Ayurveda Insights"
        subtitle="Articles, health tips, and stories from our experts."
      />

      <Section>
        {/* Search & Categories */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="w-full md:w-96 relative">
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-none">
            {categories.map((cat, i) => (
              <button 
                key={cat}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${i === 0 ? 'bg-teal-700 text-white' : 'bg-card text-muted-foreground border border-border hover:bg-muted/30'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Article */}
        <Link to="/blog/understanding-your-prakriti" className="mb-16 block rounded-3xl overflow-hidden bg-card shadow-sm border border-border group cursor-pointer hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-5 aspect-[16/9] lg:aspect-auto overflow-hidden relative">
              <img src={featuredPost.image} alt={featuredPost.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">{featuredPost.category}</span>
                <span className="text-slate-300">•</span>
                <span className="text-sm text-muted-foreground">{featuredPost.date}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {featuredPost.title}
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                {featuredPost.excerpt}
              </p>
              <div className="mt-auto pt-4 flex">
                <span className="text-primary font-semibold flex items-center gap-2 transition-all px-5 py-2 rounded-full group-hover:bg-red-500 group-hover:text-white">
                  Read Article <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link to={`/blog/${post.id}`} key={post.id} className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border group cursor-pointer hover:shadow-md transition-shadow flex flex-col">
              <div className="aspect-[16/9] overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{post.category}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {post.title}
                </h3>
                <p className="text-muted-foreground mb-6 text-sm flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                  <span className="text-primary font-semibold text-sm flex items-center gap-1 transition-all px-4 py-1.5 rounded-full group-hover:bg-red-500 group-hover:text-white">
                    Read <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <CTASection
        title="Stay Updated"
        subtitle="Subscribe to our newsletter for weekly Ayurvedic health tips."
      >
        <div className="flex flex-col sm:flex-row w-full max-w-md mx-auto gap-3">
          <input 
            type="email" 
            placeholder="Enter your email address" 
            className="flex-1 px-5 py-3 rounded-2xl border border-white/30 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all shadow-sm"
          />
          <button className="px-8 py-3 bg-white text-teal-950 font-bold rounded-2xl hover:bg-slate-100 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            Subscribe
          </button>
        </div>
      </CTASection>
    </>
  )
}
