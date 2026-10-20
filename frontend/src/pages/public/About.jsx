import { Link } from "react-router-dom";
import { Target, Compass, Building2, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { Seo } from "@/components/common/Seo";

export default function About() {
  const { settings } = useSettings();
  return (
    <div>
      <Seo title="About Us" description={`About ${settings?.name}`} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Demonstration content — verify before launch</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">About {settings?.name}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{settings?.about}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Target className="h-5.5 w-5.5" /></div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Our mission</h2>
            <p className="mt-3 text-slate-600">{settings?.mission}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Compass className="h-5.5 w-5.5" /></div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Teaching methodology</h2>
            <p className="mt-3 text-slate-600">{settings?.methodology}</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-700 shadow-xl">
            <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" alt="Students and learning environment" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400"><Building2 className="h-5.5 w-5.5" /></div>
            <h2 className="mt-4 font-display text-2xl font-bold">Facilities & learning environment</h2>
            <p className="mt-3 text-slate-300">A supportive, well-equipped environment designed to help students focus, collaborate, and learn effectively.</p>
            <div className="mt-6 space-y-3">
              {["Smart classrooms and comfortable study spaces", "Structured timetables and regular assessments", "Approachable mentors and doubt-clearing support"].map((t) => (
                <div key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" /><span className="text-slate-200">{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Users className="h-6 w-6" /></div>
        <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Want to learn more?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Reach out to our admissions team — we're happy to help you find the right program.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-teal-600 hover:bg-teal-700"><Link to="/admissions">Enquire Now</Link></Button>
          <Button asChild variant="outline"><Link to="/contact">Contact Us</Link></Button>
        </div>
      </section>
    </div>
  );
}
