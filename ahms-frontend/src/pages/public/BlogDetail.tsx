import { useParams, Link } from 'react-router-dom'
import { BlogPostLayout } from './BlogPostLayout'
import blogHerbs from '../../assets/blog_herbs.jpg'
import blogShirodhara from '../../assets/blog_shirodhara.jpg'
import blogYoga from '../../assets/blog_yoga.jpg'
import featuredImg from '../../assets/hero_treatment_room.png'

const BLOG_DATA = [
  {
    id: 'understanding-your-prakriti',
    title: 'Understanding Your Prakriti: The Key to Personalized Health',
    excerpt: 'In Ayurveda, no two individuals are the same. Discover how identifying your unique Vata, Pitta, or Kapha constitution can transform your diet and lifestyle.',
    category: 'Health Tips',
    date: 'Oct 12, 2023',
    author: 'Dr. Sunita Sharma',
    image: featuredImg,
    content: `
      <h2>The Foundation of Ayurvedic Healing</h2>
      <p>Ayurveda is a 5,000-year-old system of natural healing that has its origins in the Vedic culture of India. It reminds us that health is the balanced and dynamic integration between our environment, body, mind, and spirit.</p>
      
      <h2>What is Prakriti?</h2>
      <p>Prakriti refers to your unique mind-body constitution. According to Ayurveda, everything in the universe, including humans, is made up of five elements: Space, Air, Fire, Water, and Earth. These elements combine to form three primary energies or doshas—Vata, Pitta, and Kapha.</p>
      
      <h3>1. Vata (Space and Air)</h3>
      <p>Vata governs all movement in the mind and body. It controls blood flow, elimination of wastes, breathing and the movement of thoughts across the mind.</p>
      <ul>
        <li><strong>Physical Traits:</strong> Generally thin, light frame, dry skin, and irregular appetite.</li>
        <li><strong>Mental Traits:</strong> Creative, enthusiastic, but prone to anxiety when out of balance.</li>
      </ul>

      <h3>2. Pitta (Fire and Water)</h3>
      <p>Pitta governs digestion, absorption, assimilation, nutrition, metabolism, and body temperature.</p>
      <ul>
        <li><strong>Physical Traits:</strong> Medium build, warm body, good digestion, and a strong appetite.</li>
        <li><strong>Mental Traits:</strong> Intelligent, focused, and ambitious, but can become irritable or angry when unbalanced.</li>
      </ul>

      <h3>3. Kapha (Earth and Water)</h3>
      <p>Kapha provides the structure, solidity, and cohesiveness to the body. It hydrates all cells and systems, lubricates joints, moisturizes the skin, and maintains immunity.</p>
      <ul>
        <li><strong>Physical Traits:</strong> Solid, heavier build, smooth skin, and slow but steady digestion.</li>
        <li><strong>Mental Traits:</strong> Calm, loving, and forgiving, but can become lethargic or depressed if out of balance.</li>
      </ul>

      <h2>Balancing Your Doshas</h2>
      <p>The goal of Ayurveda is not to change your original constitution, but rather to bring your current state of health back into alignment with it. This involves personalized dietary choices, lifestyle modifications, and herbal treatments.</p>
      
      <blockquote>"Health is not merely the absence of disease, but the vibrant, joyful expression of life."</blockquote>
      
      <p>Consult with our Ayurvedic practitioners to discover your unique Prakriti and receive a tailored plan for optimal health.</p>
    `
  },
  {
    id: '1',
    title: '5 Ayurvedic Herbs to Boost Your Immunity This Winter',
    excerpt: 'Prepare your body for the cold season with these powerful, easily accessible Ayurvedic herbs like Tulsi and Ashwagandha.',
    category: 'Ayurvedic Diet',
    date: 'Nov 05, 2023',
    author: 'Dr. Rajesh Kumar',
    image: blogHerbs,
    content: `
      <h2>Embracing Winter Wellness</h2>
      <p>Winter is a season of rest and rejuvenation. In Ayurveda, it is considered a time to build strength and immunity. Incorporating specific herbs into your daily routine can help protect your body from seasonal ailments.</p>

      <h3>1. Tulsi (Holy Basil)</h3>
      <p>Revered as the "Queen of Herbs," Tulsi is excellent for respiratory health. It helps clear congestion, soothes a sore throat, and supports the immune system. Enjoy a warm cup of Tulsi tea every morning.</p>

      <h3>2. Ashwagandha</h3>
      <p>This powerful adaptogen helps the body manage stress and bolsters physical endurance. Taking Ashwagandha root powder with warm milk and a pinch of cardamom before bed promotes restful sleep and robust immunity.</p>

      <h3>3. Turmeric (Haldi)</h3>
      <p>Turmeric is a potent anti-inflammatory and antioxidant. Curcumin, its active compound, is highly beneficial for joint health and immune defense. Golden milk (Haldi Doodh) is a perfect winter evening drink.</p>

      <h3>4. Ginger (Adrak)</h3>
      <p>Ginger ignites the digestive fire (Agni) and burns away toxins (Ama). It is excellent for fighting off colds and improving circulation. Sip on warm ginger tea throughout the day.</p>

      <h3>5. Amla (Indian Gooseberry)</h3>
      <p>Amla is one of the richest natural sources of Vitamin C. It rejuvenates all bodily tissues and is the primary ingredient in Chyawanprash, a classic Ayurvedic immune-boosting jam.</p>
    `
  },
  {
    id: '2',
    title: 'The Science Behind Shirodhara',
    excerpt: 'How a continuous stream of warm oil on the forehead can alleviate stress, anxiety, and insomnia naturally.',
    category: 'Treatments',
    date: 'Oct 28, 2023',
    author: 'Dr. Sunita Sharma',
    image: blogShirodhara,
    content: `
      <h2>The Art of Deep Relaxation</h2>
      <p>Shirodhara is a profound Ayurvedic therapy that involves gently pouring a continuous stream of warm herbal oil over the forehead, specifically on the "third eye" (Ajna chakra). The name comes from the Sanskrit words 'shiro' (head) and 'dhara' (flow).</p>

      <h2>How It Works</h2>
      <p>The rhythmic pouring of oil stimulates the vital points on the head, inducing a state of deep relaxation. This process directly impacts the central nervous system, calming the mind and reducing stress hormones like cortisol.</p>

      <h3>Benefits of Shirodhara</h3>
      <ul>
        <li><strong>Reduces Anxiety and Stress:</strong> By calming the nervous system, it helps alleviate generalized anxiety and chronic stress.</li>
        <li><strong>Improves Sleep Quality:</strong> Highly effective in treating insomnia and promoting deep, restful sleep.</li>
        <li><strong>Relieves Headaches:</strong> Often used in the management of chronic headaches and migraines.</li>
        <li><strong>Enhances Mental Clarity:</strong> Clears mental fog and improves concentration and cognitive function.</li>
      </ul>

      <h2>The Experience</h2>
      <p>A typical Shirodhara session lasts for 30 to 60 minutes. The patient lies comfortably while the practitioner carefully regulates the flow and temperature of the oil. It is often preceded by an Abhyanga (full-body oil massage) for maximum benefit.</p>
    `
  },
  {
    id: '3',
    title: 'Yoga Asanas for Better Digestion',
    excerpt: 'Incorporate these simple daily stretches to stimulate Agni (digestive fire) and prevent bloating and acidity.',
    category: 'Yoga & Meditation',
    date: 'Oct 15, 2023',
    author: 'Dr. Meena Deshmukh',
    image: blogYoga,
    content: `
      <h2>Igniting the Digestive Fire</h2>
      <p>In Ayurveda, digestion (Agni) is the cornerstone of health. Poor digestion leads to the accumulation of toxins (Ama), which is the root cause of many diseases. Yoga offers specific asanas that gently massage the abdominal organs and stimulate the digestive fire.</p>

      <h3>1. Pawanmuktasana (Wind-Relieving Pose)</h3>
      <p>As the name suggests, this pose is excellent for releasing trapped gas in the digestive tract. It massages the intestines and improves bowel movements.</p>

      <h3>2. Vajrasana (Thunderbolt Pose)</h3>
      <p>This is one of the few asanas that can be practiced immediately after a meal. Sitting in Vajrasana alters blood flow to the pelvic region, significantly enhancing the digestive process.</p>

      <h3>3. Ardha Matsyendrasana (Half Lord of the Fishes Pose)</h3>
      <p>Twisting poses are highly beneficial for digestion. This seated twist wrings out the abdominal organs, stimulating the liver and kidneys, and helping to detoxify the system.</p>

      <h3>4. Paschimottanasana (Seated Forward Bend)</h3>
      <p>This deep forward fold tones the abdominal organs, improves digestion, and helps relieve stress, which is often a contributing factor to digestive issues.</p>

      <h2>Creating a Routine</h2>
      <p>Practicing these asanas daily, ideally on an empty stomach (except for Vajrasana), can profoundly improve your digestive health and overall well-being.</p>
    `
  }
];

export default function BlogDetail() {
  const { id } = useParams()
  
  const post = BLOG_DATA.find(p => p.id === id)

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Post Not Found</h1>
        <Link to="/blog" className="text-primary font-medium hover:underline">
          ← Back to Blog
        </Link>
      </div>
    )
  }

  return <BlogPostLayout post={post} />
}
