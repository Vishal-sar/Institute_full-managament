import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/common/Seo";

const FAQS = [
  { q: "How do I apply for admission?", a: "Submit an admission enquiry online or book a free demo class. Our admissions team will contact you with the next steps." },
  { q: "Can I book a free demo class?", a: "Yes. Visit the Book Demo page, select your course and an available slot. Bookings are confirmed by our team." },
  { q: "Do you offer both online and classroom batches?", a: "Many programs offer both. Each course and batch indicates its mode and schedule." },
  { q: "How is the fee paid?", a: "Fees can be paid as per the installment schedule shared at admission. We record all payments and provide receipts." },
  { q: "Is there a refund policy?", a: "Please review our Fee & Refund Policy. The institute will confirm the applicable policy at admission." },
  { q: "How are students assessed?", a: "We conduct regular tests and share feedback so progress stays measurable and transparent." },
  { q: "Can I switch batches?", a: "Subject to availability, students can be transferred between batches. Speak to the admissions team." },
  { q: "How do I access the student portal?", a: "Enrolled students receive a login to view their schedule, attendance, fees, and announcements." },
];

export default function Faq() {
  return (
    <div>
      <Seo title="FAQ" description="Answers to common questions about admissions, courses, fees and more." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Frequently Asked Questions</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Can't find what you're looking for? <Link to="/contact" className="text-teal-600 underline">Contact us</Link>.</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Accordion type="single" collapsible data-testid="faq-accordion">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-slate-200">
              <AccordionTrigger className="text-left font-medium text-slate-800 hover:text-teal-700">{f.q}</AccordionTrigger>
              <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-10 rounded-2xl bg-slate-900 p-8 text-center text-white">
          <h2 className="font-display text-xl font-bold">Still have questions?</h2>
          <p className="mt-2 text-slate-300">Our team is happy to help you decide.</p>
          <Button asChild className="mt-5 bg-teal-600 hover:bg-teal-700"><Link to="/admissions">Enquire Now</Link></Button>
        </div>
      </section>
    </div>
  );
}
