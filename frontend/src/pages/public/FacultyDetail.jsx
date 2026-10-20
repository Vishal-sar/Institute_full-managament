import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { UserRound, GraduationCap, Languages, Briefcase, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Loader } from "@/components/common/Loader";
import { Seo } from "@/components/common/Seo";
import { CourseCard } from "@/components/public/CourseCard";

export default function FacultyDetail() {
  const { slug } = useParams();
  const [f, setF] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setF(null); setNotFound(false);
    api.get(`/faculty/${slug}`).then((r) => setF(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <UserRound className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Faculty not found</h1>
        <Button asChild className="mt-6 bg-teal-600 hover:bg-teal-700"><Link to="/faculty">Back to faculty</Link></Button>
      </div>
    );
  }
  if (!f) return <Loader full />;

  return (
    <div>
      <Seo title={f.name} description={f.bio?.slice(0, 150)} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/" className="hover:text-teal-600">Home</Link><ChevronRight className="h-3 w-3" />
            <Link to="/faculty" className="hover:text-teal-600">Faculty</Link><ChevronRight className="h-3 w-3" />
            <span className="text-slate-700">{f.name}</span>
          </nav>
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
              {f.photo_url ? <img src={f.photo_url} alt={f.name} className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center text-slate-300"><UserRound className="h-16 w-16" /></div>}
            </div>
          </div>
          <div className="lg:col-span-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{f.name}</h1>
            <p className="mt-2 text-lg font-medium text-teal-600">{(f.subjects || []).join(" · ")}</p>
            {f.bio && <p className="mt-5 leading-relaxed text-slate-600">{f.bio}</p>}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {f.qualifications?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-900"><GraduationCap className="h-4 w-4 text-teal-600" /><span className="text-sm font-semibold">Qualifications</span></div>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">{f.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
              )}
              {f.experience && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-900"><Briefcase className="h-4 w-4 text-teal-600" /><span className="text-sm font-semibold">Experience</span></div>
                  <p className="mt-2 text-sm text-slate-600">{f.experience}</p>
                </div>
              )}
              {f.languages?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-900"><Languages className="h-4 w-4 text-teal-600" /><span className="text-sm font-semibold">Languages</span></div>
                  <p className="mt-2 text-sm text-slate-600">{f.languages.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {f.courses?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-slate-900">Courses taught</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {f.courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" className="text-slate-600"><Link to="/faculty"><ArrowLeft className="mr-1.5 h-4 w-4" /> All faculty</Link></Button>
      </div>
    </div>
  );
}
