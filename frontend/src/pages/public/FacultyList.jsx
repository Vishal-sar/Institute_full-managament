import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FacultyCard } from "@/components/public/FacultyCard";
import { Loader } from "@/components/common/Loader";
import { EmptyState } from "@/components/common/EmptyState";
import { Seo } from "@/components/common/Seo";

export default function FacultyList() {
  const [faculty, setFaculty] = useState(null);
  useEffect(() => {
    api.get("/faculty").then((r) => setFaculty(r.data)).catch(() => setFaculty([]));
  }, []);

  return (
    <div>
      <Seo title="Faculty" description="Meet our experienced, mentor-led faculty." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Our Faculty</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Experienced mentors dedicated to helping every student succeed. Profiles reflect information provided by the institute.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {faculty === null ? <Loader /> : faculty.length === 0 ? (
          <EmptyState title="No faculty profiles yet" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="faculty-grid">
            {faculty.map((f) => <FacultyCard key={f.id} member={f} />)}
          </div>
        )}
      </section>
    </div>
  );
}
