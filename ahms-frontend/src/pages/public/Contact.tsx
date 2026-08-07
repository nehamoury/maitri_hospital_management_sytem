import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageHero, Section } from '../../design-system/Layout'
import { FloatingInput, FloatingTextarea, FormError, FormSuccess } from '../../design-system/Forms'
import { staggerContainer, fadeUp, viewportOpts } from '../../design-system/animations'
import { hospitalInfo } from '../../design-system/tokens'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.message) { setError('Please fill in your name and message.'); return }
    setSent(true)
    setError('')
  }

  const contactCards = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      ),
      label: 'Address',
      content: hospitalInfo.fullName + '\n' + hospitalInfo.address,
      link: `https://maps.google.com/?q=${encodeURIComponent(hospitalInfo.address)}`,
      linkLabel: 'Get Directions →',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
        </svg>
      ),
      label: 'Phone',
      content: hospitalInfo.phone,
      link: `tel:${hospitalInfo.phone}`,
      linkLabel: 'Call Now →',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
        </svg>
      ),
      label: 'Email',
      content: hospitalInfo.email,
      link: `mailto:${hospitalInfo.email}`,
      linkLabel: 'Send Email →',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
      label: 'OPD Hours',
      content: hospitalInfo.opdHours,
      link: null,
      linkLabel: null,
    },
  ]

  return (
    <div>
      <PageHero
        title="Contact Us"
        subtitle="We're here to help. Reach out for appointments, queries, or emergency assistance."
        tag="Get in Touch"
        breadcrumb={[{ label: 'Home' }, { label: 'Contact' }]}
      />

      {/* Emergency Banner */}
      <div className="py-4" style={{ background: 'linear-gradient(135deg, #DC2626, #b91c1c)' }}>
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="animate-pulse-gold h-2.5 w-2.5 rounded-full bg-card" />
            <span className="text-sm font-semibold">24/7 Emergency Helpline Available</span>
          </div>
          <a
            href={`tel:${hospitalInfo.emergency}`}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold text-red-700 bg-card"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
            </svg>
            {hospitalInfo.emergency}
          </a>
        </div>
      </div>

      <Section bg="ivory">
        {/* Contact Info Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-16"
        >
          {contactCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="rounded-3xl p-6 bg-card"
              style={{ boxShadow: '0 4px 24px rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.08)' }}
            >
              <div className="mb-4 h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(15,118,110,0.08)' }}>
                {card.icon}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0F766E' }}>
                {card.label}
              </p>
              <p className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: '#334155' }}>
                {card.content}
              </p>
              {card.link && card.linkLabel && (
                <a href={card.link} target={card.link.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#0F766E' }}>
                  {card.linkLabel}
                </a>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Map */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
            className="rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(15,118,110,0.12)', minHeight: 400 }}
          >
            <iframe
              title="Maitri Ayurveda Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.5!2d81.285!3d21.190!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a294e91b11e89c9%3A0x7d9efcf13dd82bfe!2sDurg%2C%20Chhattisgarh!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
              className="w-full h-full"
              style={{ border: 0, minHeight: 400 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </motion.div>

          {/* Inquiry Form + WhatsApp */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            <div className="rounded-3xl p-8 bg-card mb-5"
              style={{ boxShadow: '0 4px 24px rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.08)' }}>
              <h3 className="text-xl font-bold mb-1" style={{ fontFamily: "'Poppins', sans-serif", color: '#0F172A' }}>
                Send an Inquiry
              </h3>
              <p className="text-sm mb-6" style={{ color: '#64748B' }}>
                We'll get back to you within 24 hours.
              </p>

              {sent ? (
                <FormSuccess message="Thank you! Your message has been received. We'll contact you soon." />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <FormError message={error} />}
                  <FloatingInput label="Your Name *" id="contact-name" type="text"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder=" " />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FloatingInput label="Email" id="contact-email" type="email"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder=" " />
                    <FloatingInput label="Phone" id="contact-phone" type="tel"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder=" " />
                  </div>
                  <FloatingTextarea label="Message *" id="contact-message" rows={4}
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder=" " />
                  <button type="submit"
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)', boxShadow: '0 4px 16px rgba(15,118,110,0.25)' }}>
                    Send Message →
                  </button>
                </form>
              )}
            </div>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${hospitalInfo.whatsapp}?text=Hello%2C%20I%20would%20like%20to%20book%20an%20appointment%20at%20Maitri%20Ayurveda.`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-3xl p-5 transition-all hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                boxShadow: '0 8px 24px rgba(37,211,102,0.30)',
              }}
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-card/20 flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-white text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Chat on WhatsApp
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Quick replies · Book appointments · Health queries
                </p>
              </div>
              <svg className="ml-auto flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </motion.div>
        </div>
      </Section>
    </div>
  )
}
