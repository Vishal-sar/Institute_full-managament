import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api, formatDate } from "@/lib/api";
import { Loader } from "@/components/common/Loader";
import { EmptyState } from "@/components/common/EmptyState";
import { Seo } from "@/components/common/Seo";

export default function Announcements() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get("/announcements/public").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <Seo title="Announcements" description="Latest announcements and notices." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Announcements</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Notices and updates from the institute.</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {items === null ? <Loader /> : items.length === 0 ? (
          <EmptyState title="No announcements yet" icon={Megaphone} description="Check back soon for updates." />
        ) : (
          <div className="space-y-5" data-testid="announcements-list">
            {items.map((a) => (
              <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-teal-600"><Megaphone className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">{formatDate(a.publish_date)}</span></div>
                <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{a.title}</h2>
                <p className="mt-2 whitespace-pre-line text-slate-600">{a.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
