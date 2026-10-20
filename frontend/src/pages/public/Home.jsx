import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, GraduationCap, Users, Target, ClipboardCheck, CalendarDays,
  ShieldCheck, Sparkles, BookOpen, UserRound, MessageSquareQuote, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api, formatDate } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { CourseCard } from "@/components/public/CourseCard";
import { FacultyCard } from "@/components/public/FacultyCard";
import { Seo } from "@/components/common/Seo";

const WHY = [
  { icon: Users, title: "Small, focused batches", desc: "Personalised attention with limited seats per batch so no learner is left behind." },
  { icon: Target, title: "Concept-first teaching", desc: "We build strong fundamentals before drilling into exam-style practice and speed." },
  { icon: ClipboardCheck, title: "Regular assessments", desc: "Weekly tests and detailed feedback keep progress measurable and transparent." },
  { icon: ShieldCheck, title: "Mentor support", desc: "Structured doubt-clearing and one-on-one mentoring throughout the program." },
];

const STEPS = [
  { title: "Enquire or book a demo", desc: "Share your interest online or attend a free demo class." },
  { title: "Counselling session", desc: "Our team understands your goals and recommends the right program." },
  { title: "Enrol & join a batch", desc: "Complete admission and get assigned to a suitable batch." },
  { title: "Learn & track progress", desc: "Attend classes, take assessments, and track your performance." },
];

const TESTIMONIALS = [
  { name: "A. Sharma", role: "Parent (demo)", quote: "The structured approach and regular feedback helped my child stay consistent. (Demonstration testimonial)" },
  { name: "R. Verma", role: "Student (demo)", quote: "Small batches meant I could ask questions freely. The mentors were very supportive. (Demonstration testimonial)" },
  { name: "S. Nair", role: "Student (demo)", quote: "Weekly tests kept me on track and the concept clarity was excellent. (Demonstration testimonial)" },
];

const FAQS = [
  { q: "How do I apply for admission?", a: "Submit an admission enquiry online or book a free demo class. Our admissions team will contact you to guide you through the process." },
  { q: "Are demo classes available?", a: "Yes. You can book a free demo class for most courses from the Book Demo page, subject to available slots." },
  { q: "Do you offer online and classroom batches?", a: "Many programs offer both classroom and online batches. Availability is shown on each course and batch." },
  { q: "How are fees structured?", a: "Fees vary by program and can be paid as per the installment schedule shared at admission. See each course page for indicative fees." },
];

export default function Home() {
  const { settings } = useSettings();
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data.slice(0, 6))).catch(() => {});
    api.get("/faculty").then((r) => setFaculty(r.data.slice(0, 4))).catch(() => {});
    api.get("/batches/upcoming").then((r) => setBatches(r.data.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div>
      <Seo title="Premium Coaching Institute" description={settings?.tagline} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-50">
        <div className="absolute inset-0 hero-grid opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              <Sparkles className="h-3.5 w-3.5" /> Admissions open for new batches
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {settings?.tagline || "Where ambition meets academic excellence"}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {settings?.name} helps students excel through expert, mentor-led coaching, small batches,
              and a structured, concept-first curriculum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700" data-testid="hero-explore-btn">
                <Link to="/courses">Explore Courses <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300" data-testid="hero-enquire-btn">
                <Link to="/admissions">Enquire Now</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {["Expert faculty", "Small batches", "Regular assessments", "Doubt support"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> {t}</span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative">
            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl">
              <img src={settings?.hero_image || "https://images.pexels.com/photos/8199166/pexels-photo-8199166.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"}
                alt="Students learning in a modern coaching classroom" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white"><GraduationCap className="h-5 w-5" /></div>
                <div>
                  <p className="font-display text-sm font-bold text-slate-900">Mentor-led learning</p>
                  <p className="text-xs text-slate-500">Guided every step</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Programs</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">Featured courses</h2>
          </div>
          <Button asChild variant="ghost" className="text-teal-600 hover:text-teal-700"><Link to="/courses">View all courses <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* WHY */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Why choose us</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">A learning experience built for results</h2>
            <p className="mt-3 text-slate-300">We focus on clarity, consistency, and genuine mentorship — not shortcuts.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400"><w.icon className="h-5.5 w-5.5" /></div>
                <h3 className="mt-4 font-display text-base font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg">
            <img src="https://images.pexels.com/photos/8199151/pexels-photo-8199151.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              alt="Modern smart classroom and learning facilities" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Facilities & methodology</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">Modern facilities, proven methodology</h2>
            <p className="mt-4 text-slate-600">{settings?.methodology || "Small batch sizes, concept-first teaching, weekly assessments, doubt-clearing sessions, and continuous performance tracking."}</p>
            <div className="mt-6 space-y-3">
              {["Smart classrooms and well-equipped learning spaces", "Structured curriculum with regular revision", "Continuous performance tracking and feedback"].map((t) => (
                <div key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span className="text-slate-700">{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ADMISSION STEPS */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Simple process</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">How admission works</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="font-display text-3xl font-extrabold text-teal-600/20">0{i + 1}</span>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FACULTY */}
      {faculty.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Our mentors</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">Meet the faculty</h2>
            </div>
            <Button asChild variant="ghost" className="text-teal-600 hover:text-teal-700"><Link to="/faculty">All faculty <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.map((f) => <FacultyCard key={f.id} member={f} />)}
          </div>
        </section>
      )}

      {/* UPCOMING BATCHES */}
      {batches.length > 0 && (
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">Upcoming batches</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {batches.map((b) => (
                <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-teal-600"><CalendarDays className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">{b.mode}</span></div>
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">{b.course_title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{b.name}</p>
                  <div className="mt-4 space-y-1 text-xs text-slate-500">
                    <p>Starts {formatDate(b.start_date)}</p>
                    <p>{(b.days || []).join(", ")} · {b.start_time}–{b.end_time}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-4 w-full"><Link to="/demo">Book a demo</Link></Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">What people say</h2>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Demo content</span>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <MessageSquareQuote className="h-7 w-7 text-teal-500" />
              <p className="mt-4 text-sm leading-relaxed text-slate-600">“{t.quote}”</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound className="h-4.5 w-4.5" /></div>
                <div><p className="text-sm font-semibold text-slate-900">{t.name}</p><p className="text-xs text-slate-400">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-10" data-testid="home-faq">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`} className="border-slate-200">
                <AccordionTrigger className="text-left font-medium text-slate-800 hover:text-teal-700">{f.q}</AccordionTrigger>
                <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-14 text-center text-white sm:px-16">
          <div className="absolute inset-0 hero-grid opacity-20" />
          <div className="relative">
            <BookOpen className="mx-auto h-10 w-10 text-teal-400" />
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Ready to start your journey?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">Submit an enquiry or book a free demo class. Our team will help you choose the right program.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700"><Link to="/admissions">Enquire Now</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800"><Link to="/demo">Book a Demo</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
