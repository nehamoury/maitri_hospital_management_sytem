import { departments as staticDepts, doctors as staticDoctors, treatments as staticTreatments } from './site-data'

// Live public-site data fetched from the backend's /public/* endpoints
// (no auth required). Rich marketing fields that the backend doesn't
// store yet (bio, rating, languages, availability, taglines) fall back to
// the static seed data, so the site never renders blanks.

export interface PublicDoctor {
  id: string
  slug: string
  name: string
  title: string
  department: string
  experience: number
  languages: string[]
  availability: string
  fee: number
  rating: number
  bio: string
  image?: string
}

export interface PublicDepartment {
  id: string
  code: string
  name: string
  type: string
  description: string
  default_fee: number
  doctor_count: number
  slug: string
  tagline?: string
  treatments?: string[]
}

export interface PublicTreatment {
  name: string
  dept: string
  duration: string
  desc: string
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const DEFAULT_AVAILABILITY = 'Mon – Sat · 09:00 – 16:00'
const DEFAULT_LANGUAGES = ['English', 'Hindi']

function mapStaticDoctors(): PublicDoctor[] {
  return staticDoctors.map(d => ({
    id: '',
    slug: d.slug,
    name: d.name,
    title: d.title,
    department: d.department,
    experience: d.experience,
    languages: d.languages,
    availability: d.availability,
    fee: d.fee,
    rating: d.rating,
    bio: d.bio,
    image: undefined,
  }))
}

function mapStaticDepartments(): PublicDepartment[] {
  return staticDepts.map(d => ({
    id: '',
    code: d.code || '',
    name: d.name,
    type: d.type || 'OPD',
    description: d.description,
    default_fee: d.fee || 0,
    doctor_count: d.doctors,
    slug: d.slug,
    tagline: d.tagline,
    treatments: d.treatments,
  }))
}

export async function fetchDoctors(): Promise<PublicDoctor[]> {
  try {
    const res = await fetch('/api/v1/public/doctors')
    const json = await res.json()
    const list: any[] = json?.data || []
    if (!Array.isArray(list) || list.length === 0) return mapStaticDoctors()
    return list.map(d => {
      const staticDoc = staticDoctors.find(s => s.name.toLowerCase() === ((d.name as string) || '').toLowerCase())
      const title = [d.qualification, d.specialization].filter(Boolean).join(' — ')
      return {
        id: d.id || '',
        slug: staticDoc?.slug || slugify(d.name || ''),
        name: d.name || '',
        title: title || staticDoc?.title || 'Consultant',
        department: d.department || 'General Ayurveda',
        experience: d.experience_years ?? staticDoc?.experience ?? 0,
        languages: staticDoc?.languages || DEFAULT_LANGUAGES,
        availability: staticDoc?.availability || DEFAULT_AVAILABILITY,
        fee: d.consultation_fee ?? staticDoc?.fee ?? 0,
        rating: staticDoc?.rating ?? 4.8,
        image: d.image_url || undefined,
        bio:
          staticDoc?.bio ||
          `${d.name || 'Our physician'} is a specialist in ${d.specialization || 'Ayurvedic medicine'} with ${d.experience_years ?? 0} years of experience.`,
      }
    })
  } catch {
    return mapStaticDoctors()
  }
}

export async function fetchDepartments(): Promise<PublicDepartment[]> {
  try {
    const res = await fetch('/api/v1/public/departments')
    const json = await res.json()
    const list: any[] = json?.data || []
    if (!Array.isArray(list) || list.length === 0) return mapStaticDepartments()
    return list.map(d => {
      const staticDept = staticDepts.find(s => s.name.toLowerCase() === ((d.name as string) || '').toLowerCase())
      return {
        id: d.id || '',
        code: d.code || staticDept?.code || '',
        name: d.name || '',
        type: d.type || staticDept?.type || 'OPD',
        description: (() => {
          let desc = d.description || staticDept?.description || '';
          try {
            if (desc && desc.trim().startsWith('{')) {
              const p = JSON.parse(desc);
              if (p.descriptionText) return p.descriptionText;
            }
          } catch (e) {}
          return desc;
        })(),
        default_fee: d.default_fee ?? staticDept?.fee ?? 0,
        doctor_count: d.doctor_count ?? 0,
        slug: staticDept?.slug || slugify(d.name || ''),
        tagline: staticDept?.tagline,
        treatments: staticDept?.treatments,
      }
    })
  } catch {
    return mapStaticDepartments()
  }
}

export async function fetchTreatments(): Promise<PublicTreatment[]> {
  try {
    const res = await fetch('/api/v1/public/procedure-types')
    const json = await res.json()
    const list: any[] = json?.data || []
    if (!Array.isArray(list) || list.length === 0) return staticTreatments
    const categoryLabel = (cat?: string) => (cat ? cat.charAt(0) + cat.slice(1).toLowerCase() : 'Panchakarma')
    return list.map(t => {
      const staticT = staticTreatments.find(s => s.name.toLowerCase() === ((t.name as string) || '').toLowerCase())
      return {
        name: t.name || '',
        dept: staticT?.dept || categoryLabel(t.category),
        duration: staticT?.duration || '60 min',
        desc: t.description || staticT?.desc || '',
      }
    })
  } catch {
    return staticTreatments
  }
}
