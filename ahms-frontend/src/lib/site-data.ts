export const departments = [
  {
    slug: "kayachikitsa",
    name: "Kayachikitsa",
    code: "KAYA",
    type: "OPD",
    fee: 500,
    tagline: "Internal Medicine",
    doctors: 14,
    treatments: ["Diabetes Care", "Arthritis", "Digestive Disorders"],
    description:
      "Internal medicine and general disorders, guided by dosha-based diagnosis.",
  },
  {
    slug: "panchakarma",
    name: "Panchakarma",
    code: "PANCH",
    type: "Procedure",
    fee: 800,
    tagline: "Detox & Rejuvenation",
    doctors: 11,
    treatments: ["Vamana", "Virechana", "Basti", "Nasya"],
    description:
      "Five-fold purification therapies delivered in dedicated suites with trained therapists and physician oversight.",
  },
  {
    slug: "shalya-tantra",
    name: "Shalya Tantra",
    code: "SALYA",
    type: "OPD",
    fee: 700,
    tagline: "Ayurvedic Surgery",
    doctors: 8,
    treatments: ["Ksharasutra", "Agnikarma", "Piles & Fistula"],
    description:
      "Ayurvedic surgical and para-surgical procedures for wound management, fistula, and ano-rectal disorders.",
  },
  {
    slug: "shalakya-tantra",
    name: "Shalakya Tantra",
    code: "SHALAKYA",
    type: "OPD",
    fee: 600,
    tagline: "ENT & Ophthalmology",
    doctors: 7,
    treatments: ["Netra Tarpana", "Karna Purana", "Sinus Care"],
    description:
      "Specialised therapies for the eye, ear, nose, throat and head with dedicated procedure rooms.",
  },
  {
    slug: "prasuti-tantra",
    name: "Prasuti Tantra Evam Stri Roga",
    code: "PRASUTI",
    type: "OPD",
    fee: 700,
    tagline: "Women's Health",
    doctors: 9,
    treatments: ["Garbha Sanskar", "PCOS Care", "Postnatal Care"],
    description:
      "Holistic women's health, obstetrics and gynaecology spanning fertility, pregnancy and post-partum recovery.",
  },
  {
    slug: "kaumarbhritya",
    name: "Kaumarbhritya (Bal Roga)",
    code: "KAUMAR",
    type: "OPD",
    fee: 500,
    tagline: "Paediatrics",
    doctors: 6,
    treatments: ["Suvarnaprashan", "Immunity Care", "Growth Support"],
    description:
      "Child-focused Ayurveda from newborn care to adolescent wellness in a calm, playful environment.",
  },
  {
    slug: "swasthavritta",
    name: "Swasthavritta & Yoga",
    code: "SWASTHA",
    type: "Wellness",
    fee: 400,
    tagline: "Preventive & Yoga",
    doctors: 10,
    treatments: ["Ritucharya", "Yoga Therapy", "Diet Planning"],
    description:
      "Preventive medicine, seasonal regimen and yoga-based lifestyle programmes for lasting balance.",
  },
  {
    slug: "agad-tantra",
    name: "Agad Tantra Evam Vidhi Vaidyaka",
    code: "AGAD",
    type: "Clinical",
    fee: 600,
    tagline: "Toxicology & Forensic",
    doctors: 5,
    treatments: ["Visha Chikitsa", "Poison Management", "Medico-Legal Care"],
    description:
      "Toxicology, poisons, venoms and medico-legal care for acute poisoning and adverse reactions.",
  },
  {
    slug: "rasashastra",
    name: "Rasashastra & Bhaishajya Kalpana",
    code: "RASA",
    type: "Pharmacy",
    fee: 300,
    tagline: "Classical Pharmacy",
    doctors: 4,
    treatments: ["Kashaya", "Rasaushadhi", "Bhasma", "Medicated Oils"],
    description:
      "Classical pharmacy, drug preparation and dispensing of authentic Rasashastra formulations.",
  },
  {
    slug: "casualty",
    name: "Casualty",
    code: "CAS",
    type: "Emergency",
    fee: 1000,
    tagline: "24x7 Emergency",
    doctors: 6,
    treatments: ["Trauma Care", "Acute Conditions", "First Aid"],
    description:
      "24x7 emergency and casualty services for acute conditions with rapid triage and stabilisation.",
  },
];

export const doctors = [
  {
    slug: "dr-ananya-sharma",
    name: "Dr. Ananya Sharma",
    title: "MD (Ayu), PhD — Chief Physician",
    department: "Kayachikitsa",
    experience: 22,
    languages: ["English", "Hindi", "Sanskrit"],
    availability: "Mon – Fri · 10:00 – 16:00",
    fee: 1200,
    rating: 4.9,
    bio: "Leads the internal medicine wing with a research focus on Ayurvedic management of metabolic syndrome.",
  },
  {
    slug: "dr-raghav-nair",
    name: "Dr. Raghav Nair",
    title: "MD (Ayu) — Senior Consultant",
    department: "Panchakarma",
    experience: 18,
    languages: ["English", "Malayalam", "Hindi"],
    availability: "Mon – Sat · 09:00 – 14:00",
    fee: 1000,
    rating: 4.8,
    bio: "Kerala-trained Panchakarma specialist known for classical Snehana–Swedana protocols.",
  },
  {
    slug: "dr-meera-iyer",
    name: "Dr. Meera Iyer",
    title: "MD (Ayu) — Consultant",
    department: "Prasuti Tantra",
    experience: 14,
    languages: ["English", "Tamil", "Hindi"],
    availability: "Tue – Sat · 11:00 – 17:00",
    fee: 900,
    rating: 4.9,
    bio: "Women's health specialist focusing on PCOS, fertility and Garbha Sanskar programmes.",
  },
  {
    slug: "dr-vikram-desai",
    name: "Dr. Vikram Desai",
    title: "MS (Ayu) — Surgeon",
    department: "Shalya Tantra",
    experience: 20,
    languages: ["English", "Gujarati", "Hindi"],
    availability: "Mon – Thu · 08:00 – 13:00",
    fee: 1100,
    rating: 4.7,
    bio: "Performs over 400 Ksharasutra procedures a year with a 96% recurrence-free outcome.",
  },
  {
    slug: "dr-kavya-menon",
    name: "Dr. Kavya Menon",
    title: "MD (Ayu) — Consultant",
    department: "Manas Roga",
    experience: 11,
    languages: ["English", "Malayalam"],
    availability: "Wed – Sun · 10:00 – 18:00",
    fee: 950,
    rating: 4.8,
    bio: "Integrates Shirodhara, medhya rasayana and yoga nidra for anxiety and insomnia care.",
  },
  {
    slug: "dr-arjun-patil",
    name: "Dr. Arjun Patil",
    title: "MD (Ayu) — Paediatrics",
    department: "Kaumarbhritya",
    experience: 9,
    languages: ["English", "Marathi", "Hindi"],
    availability: "Mon – Fri · 09:00 – 15:00",
    fee: 800,
    rating: 4.9,
    bio: "Runs the monthly Suvarnaprashan clinic and paediatric immunity programme.",
  },
];

export const treatments = [
  { name: "Abhyanga", dept: "Panchakarma", duration: "60 min", desc: "Full-body warm herbal oil massage to pacify vata and improve circulation." },
  { name: "Shirodhara", dept: "Manas Roga", duration: "45 min", desc: "Continuous stream of medicated oil over the forehead for deep nervous-system calm." },
  { name: "Basti", dept: "Panchakarma", duration: "30 min", desc: "Medicated enema therapy, the principal treatment for vata disorders." },
  { name: "Netra Tarpana", dept: "Shalakya", duration: "40 min", desc: "Eye rejuvenation therapy with ghee reservoirs for strain and dryness." },
  { name: "Ksharasutra", dept: "Shalya Tantra", duration: "Procedure", desc: "Medicated thread therapy for fistula, piles and pilonidal sinus." },
  { name: "Udvartana", dept: "Swasthavritta", duration: "50 min", desc: "Herbal powder massage for obesity, cellulite and lymphatic drainage." },
  { name: "Nasya", dept: "Panchakarma", duration: "30 min", desc: "Nasal instillation therapy for sinusitis, migraine and cervical issues." },
  { name: "Kati Basti", dept: "Kayachikitsa", duration: "45 min", desc: "Warm oil pooling over the lumbar region for chronic back pain." },
];

export const panchakarmaSteps = [
  { step: "01", name: "Purva Karma", desc: "Preparatory Snehana and Swedana to mobilise toxins toward the gut." },
  { step: "02", name: "Vamana", desc: "Supervised therapeutic emesis clearing kapha from the upper channels." },
  { step: "03", name: "Virechana", desc: "Purgation therapy that cleanses pitta from the liver and small intestine." },
  { step: "04", name: "Basti", desc: "Series of medicated enemas — the cornerstone of vata management." },
  { step: "05", name: "Nasya & Raktamokshana", desc: "Nasal and blood-letting therapies for head, skin and circulatory health." },
  { step: "06", name: "Paschat Karma", desc: "Graded diet, rasayana herbs and lifestyle plan to sustain the results." },
];

export const testimonials = [
  { name: "Priya Raghavan", city: "Bengaluru", text: "Twelve years of migraine, resolved in a 21-day Panchakarma programme. The care felt personal at every step." },
  { name: "Anand Kulkarni", city: "Pune", text: "The Ksharasutra procedure was smooth and the follow-up was better than any hospital I have visited." },
  { name: "Sana Qureshi", city: "Hyderabad", text: "My PCOS markers normalised over six months. Dr. Meera explained everything with real patience." },
];

export const blogs = [
  { slug: "dinacharya", title: "Dinacharya: the daily rhythm that quietly heals", category: "Lifestyle", read: "6 min", author: "Dr. Ananya Sharma", excerpt: "How a structured morning routine regulates agni, sleep and mood — backed by classical texts and modern chronobiology." },
  { slug: "panchakarma-guide", title: "A first-timer's guide to Panchakarma", category: "Treatments", read: "9 min", author: "Dr. Raghav Nair", excerpt: "What actually happens across the 21 days, how to prepare, and what results are realistic." },
  { slug: "pcos-ayurveda", title: "PCOS and Ayurveda: beyond symptom control", category: "Women's Health", read: "7 min", author: "Dr. Meera Iyer", excerpt: "A dosha-led framework for restoring cycles, insulin balance and long-term fertility." },
  { slug: "monsoon-ritucharya", title: "Monsoon Ritucharya: eating for the season", category: "Nutrition", read: "5 min", author: "Dr. Kavya Menon", excerpt: "Simple seasonal shifts that protect digestion when humidity spikes." },
  { slug: "sleep-shirodhara", title: "Why Shirodhara works on sleep", category: "Research", read: "8 min", author: "Dr. Kavya Menon", excerpt: "A look at HRV and cortisol data from our 2025 in-house sleep study." },
  { slug: "children-immunity", title: "Building childhood immunity the Ayurvedic way", category: "Paediatrics", read: "4 min", author: "Dr. Arjun Patil", excerpt: "Suvarnaprashan, diet and daily habits for resilient children." },
];

export const faqs = [
  { q: "Do I need a referral to book an appointment?", a: "No. You can book directly with any consultant through the website, our helpline, or at the front desk.", cat: "Appointments" },
  { q: "How long does a Panchakarma programme take?", a: "Programmes run from 7 to 28 days depending on your prakriti and condition. Your physician finalises the duration after the first consultation.", cat: "Treatments" },
  { q: "Is Ayurvedic treatment covered by insurance?", a: "Yes. We are empanelled with 30+ insurers and all AYUSH cashless schemes. Our desk verifies eligibility before admission.", cat: "Billing" },
  { q: "Can I continue my allopathic medication?", a: "In most cases yes. Bring your current prescriptions and reports so the physician can plan safe co-administration.", cat: "Treatments" },
  { q: "Do you offer teleconsultations?", a: "Video consultations are available daily from 08:00 to 20:00 IST, including follow-ups and prescription renewals.", cat: "Appointments" },
  { q: "What should I carry for admission?", a: "Photo ID, insurance card, previous reports, loose cotton clothing and any ongoing medication.", cat: "Admission" },
];

export const jobs = [
  { title: "Senior Ayurvedic Physician — Kayachikitsa", type: "Full-time", location: "Main Campus", exp: "8+ years" },
  { title: "Panchakarma Therapist", type: "Full-time", location: "Wellness Wing", exp: "3+ years" },
  { title: "Clinical Research Associate", type: "Contract", location: "Research Centre", exp: "2+ years" },
  { title: "Front Office Executive", type: "Full-time", location: "Main Campus", exp: "1+ years" },
  { title: "Ayurvedic Pharmacist", type: "Full-time", location: "Pharmacy", exp: "2+ years" },
];

export const stats = [
  { value: 42, suffix: "+", label: "Years of practice" },
  { value: 120, suffix: "K", label: "Patients treated" },
  { value: 80, suffix: "+", label: "Physicians & therapists" },
  { value: 96, suffix: "%", label: "Patient satisfaction" },
];
