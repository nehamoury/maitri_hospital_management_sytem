// ─── Design Tokens ───────────────────────────────────────────────────────────

export const colors = {
  primary:    '#0F766E',
  primaryDk:  '#0a5954',
  primaryLt:  '#14B8A6',
  accent:     '#C8A14D',
  accentLt:   '#dbb96b',
  bg:         '#FFFFFF',
  surface:    '#FFFFFF',
  dark:       '#0F172A',
  text:       '#334155',
  textMuted:  '#64748B',
  border:     '#E2E8F0',
  success:    '#16A34A',
  warning:    '#F59E0B',
  danger:     '#DC2626',
} as const

export const fonts = {
  heading: "'Poppins', sans-serif",
  body:    "'Inter', sans-serif",
} as const

export const shadows = {
  sm:   '0 1px 3px rgba(15,118,110,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  md:   '0 4px 24px rgba(15,118,110,0.10), 0 2px 8px rgba(0,0,0,0.06)',
  lg:   '0 8px 40px rgba(15,118,110,0.14), 0 4px 16px rgba(0,0,0,0.08)',
  xl:   '0 20px 60px rgba(15,118,110,0.18), 0 8px 24px rgba(0,0,0,0.10)',
  gold: '0 0 30px rgba(200,161,77,0.25)',
} as const

export const hospitalInfo = {
  name:       'Maitri Ayurveda',
  fullName:   'Maitri College of Ayurvedic Medical & Research Institute',
  address:    'Anjora, Durg, Chhattisgarh — 491001',
  phone:      '+91 98765 43210',
  emergency:  '+91 98765 43210',
  whatsapp:   '919876543210',
  email:      'contact@maitriyurveda.in',
  opdHours:   '9:00 AM – 5:00 PM, Monday–Saturday',
  mapEmbed:   'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.2!2d81.28!3d21.19!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDExJzI0LjAiTiA4McKwMTYnNDguMCJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin',
} as const

export const navLinks = [
  { to: '/',             label: 'Home' },
  { to: '/about',        label: 'About' },
  { to: '/departments',  label: 'Departments' },
  { to: '/doctors',      label: 'Doctors' },
  { to: '/treatments',   label: 'Treatments' },
  { to: '/panchakarma',  label: 'Panchakarma' },
  { to: '/facilities',   label: 'Facilities' },
  { to: '/research',     label: 'Research' },
  { to: '/gallery',      label: 'Gallery' },
  { to: '/blog',         label: 'Blog' },
  { to: '/contact',      label: 'Contact' },
] as const

export const footerGroups = [
  {
    title: "Hospital",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/departments", label: "Departments" },
      { to: "/doctors", label: "Doctors" },
      { to: "/facilities", label: "Facilities" },
    ],
  },
  {
    title: "Treatments",
    links: [
      { to: "/panchakarma", label: "Panchakarma" },
      { to: "/treatments", label: "Ayurveda" },
      { to: "/research", label: "Research" },
    ],
  },
  {
    title: "Patients",
    links: [
      { to: "/contact", label: "Contact" },
      { to: "/blog", label: "Blog" },
      { to: "/gallery", label: "Gallery" },
      { to: "/portal/login", label: "Patient Portal" },
    ],
  },
] as const

export const stats = [
  { value: 15000, suffix: '+', label: 'Patients Treated' },
  { value: 40,    suffix: '+', label: 'Expert Doctors' },
  { value: 12,    suffix: '+', label: 'Departments' },
  { value: 25,    suffix: '+', label: 'Years of Excellence' },
] as const

export const testimonials = [
  {
    name:   'Priya Sharma',
    city:   'Raipur',
    quote:  'The Panchakarma treatment at Maitri completely transformed my health. The doctors are incredibly knowledgeable and the atmosphere is so peaceful.',
    rating: 5,
    treatment: 'Panchakarma Therapy',
  },
  {
    name:   'Rajesh Kumar',
    city:   'Durg',
    quote:  'I had chronic back pain for years. After 3 weeks of Ayurvedic treatment here, I feel like a new person. Highly recommended.',
    rating: 5,
    treatment: 'Kayachikitsa',
  },
  {
    name:   'Anita Patel',
    city:   'Bhilai',
    quote:  'The digital appointment system is very convenient. No waiting, professional staff, and authentic Ayurvedic care. Wonderful experience.',
    rating: 5,
    treatment: 'General Consultation',
  },
] as const

export const panchakarmaTherapies = [
  { name: 'Abhyanga',    desc: 'Full body therapeutic oil massage that balances doshas and rejuvenates tissues', icon: '🌿' },
  { name: 'Shirodhara',  desc: 'Continuous flow of warm oil on the forehead for deep mental relaxation and clarity', icon: '💧' },
  { name: 'Basti',       desc: 'Medicated enema therapy — most powerful treatment for Vata imbalance and detox', icon: '🍃' },
  { name: 'Nasya',       desc: 'Nasal administration of herbal oils for head, neck and neurological conditions', icon: '🌸' },
  { name: 'Virechana',   desc: 'Therapeutic purgation to eliminate Pitta toxins from the body through the gut', icon: '✨' },
  { name: 'Raktamokshana', desc: 'Bloodletting therapy for skin disorders, gout and chronic inflammatory conditions', icon: '🔴' },
] as const
