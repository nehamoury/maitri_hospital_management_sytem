import { Section, SectionNarrow, PageHero } from '../../design-system/Layout'
import { SEO } from '../../components/SEO'
import { Card } from '../../components/ui'

export default function FAQ() {
  const faqs = [
    {
      q: "What should I expect during my first Ayurvedic consultation?",
      a: "Our physician will assess your Prakriti (body constitution), ask about dietary habits, examine your pulse (Nadi Pariksha), and analyze current symptoms to build a personalized dietary, herbal, and therapy blueprint."
    },
    {
      q: "How does Panchakarma work?",
      a: "Panchakarma is a five-fold detoxification process consisting of oil massage (Abhyanga), warm oil pour (Shirodhara), herbal steam (Swedana), and therapeutic cleansing (Basti or Virechana) to clear toxins and balance Doshas."
    },
    {
      q: "Are Ayurvedic medicines safe to take along with Allopathic treatments?",
      a: "Yes, in most cases they complement each other. However, please inform our doctor about all ongoing medications so we can plan treatment gaps and avoid herb-drug interactions."
    },
    {
      q: "Can I book a consultation online?",
      a: "Absolutely! You can register or log in to the Patient Portal using your UHID or book directly using our website appointment booking page."
    }
  ]

  return (
    <>
      <SEO title="Frequently Asked Questions" />
      <PageHero 
        title="Frequently Asked Questions" 
        subtitle="Find answers to common questions about our therapies and treatments."
        tag="Help & Support"
      />
      <Section bg="white">
        <SectionNarrow className="space-y-6">
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <Card key={i} className="p-6 border-slate-100 shadow-sm hover:shadow hover:border-slate-200 transition-all">
                <h3 className="text-base font-bold text-slate-800 flex gap-2">
                  <span className="text-teal-600 font-extrabold">Q.</span>
                  {f.q}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mt-2.5 pl-5">
                  {f.a}
                </p>
              </Card>
            ))}
          </div>
        </SectionNarrow>
      </Section>
    </>
  )
}
