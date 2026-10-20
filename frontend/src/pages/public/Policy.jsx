import { useSettings } from "@/context/SettingsContext";
import { Seo } from "@/components/common/Seo";

export default function Policy({ kind, title }) {
  const { settings } = useSettings();
  const content = settings?.[kind];
  return (
    <div>
      <Seo title={title} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Review before launch</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="prose prose-slate max-w-none">
          <p className="whitespace-pre-line leading-relaxed text-slate-700">{content || "This policy has not been configured yet. The institute should add the reviewed policy text in Settings before launch."}</p>
        </div>
      </section>
    </div>
  );
}
