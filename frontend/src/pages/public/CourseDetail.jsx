import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock, BarChart3, IndianRupee, CheckCircle2, UserRound, CalendarDays,
  ChevronRight, ArrowLeft, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api, formatCurrency, formatDate } from "@/lib/api";
import { Loader } from "@/components/common/Loader";
import { Seo } from "@/components/common/Seo";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function CourseDetail() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setCourse(null);
    setNotFound(false);
    api.get(`/courses/${slug}`).then((r) => setCourse(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Course not found</h1>
        <Button asChild className="mt-6 bg-teal-600 hover:bg-teal-700"><Link to="/courses">Back to courses</Link></Button>
      </div>
    );
  }
  if (!course) return <Loader full />;

  return (
    <div>
      <Seo title={course.title} description={course.description?.slice(0, 150)} />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" />
            <Link to="/courses" className="hover:text-white">Courses</Link><ChevronRight className="h-3 w-3" />
            <span className="text-slate-200">{course.title}</span>
          </nav>
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">{course.category}</span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-4 max-w-xl text-slate-300">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-teal-400" /> {course.duration}</span>
              <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-teal-400" /> {course.level}</span>
              <span className="inline-flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-teal-400" /> {formatCurrency(course.fee_amount, course.currency)}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700" data-testid="course-enquire-btn">
                <Link to={`/admissions?course=${course.id}`}>{course.admission_open ? "Apply for Admission" : "Enquire Now"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
                <Link to={`/demo?course=${course.id}`}>Book a Demo</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-700 shadow-2xl">
            <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-12 lg:col-span-2">
          {course.curriculum?.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Curriculum</h2>
              <div className="mt-5 space-y-3">
                {course.curriculum.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">{i + 1}</span>
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {course.outcomes?.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Learning outcomes</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o, i) => (
                  <div key={i} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span className="text-slate-700">{o}</span></div>
                ))}
              </div>
            </div>
          )}

          {course.faqs?.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Course FAQ</h2>
              <Accordion type="single" collapsible className="mt-4">
                {course.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`} className="border-slate-200">
                    <AccordionTrigger className="text-left font-medium text-slate-800">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-slate-600">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          {course.faculty?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-bold text-slate-900">Faculty</h3>
              <div className="mt-4 space-y-4">
                {course.faculty.map((f) => (
                  <Link key={f.id} to={`/faculty/${f.slug}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-100">
                      {f.photo_url ? <img src={f.photo_url} alt={f.name} className="h-full w-full object-cover" /> : <UserRound className="m-3 h-5 w-5 text-slate-400" />}
                    </div>
                    <div><p className="text-sm font-semibold text-slate-900">{f.name}</p><p className="text-xs text-slate-500">{(f.subjects || []).join(", ")}</p></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900">Available batches</h3>
            {course.batches?.length > 0 ? (
              <div className="mt-4 space-y-3">
                {course.batches.map((b) => (
                  <div key={b.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{b.name}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{(b.days || []).join(", ")} · {b.start_time}–{b.end_time}</p>
                    <p className="mt-1 text-xs text-slate-400">Starts {formatDate(b.start_date)} · {b.mode}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">New batches are being scheduled. Enquire to be notified.</p>
            )}
          </div>

          <Button asChild variant="ghost" className="w-full text-slate-600"><Link to="/courses"><ArrowLeft className="mr-1.5 h-4 w-4" /> All courses</Link></Button>
        </aside>
      </section>
    </div>
  );
}
