import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";

export function FacultyCard({ member }) {
  return (
    <Link
      to={`/faculty/${member.slug}`}
      data-testid={`faculty-card-${member.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {member.photo_url ? (
          <img src={member.photo_url} alt={member.name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><UserRound className="h-12 w-12" /></div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-teal-700">{member.name}</h3>
        <p className="mt-1 text-sm text-teal-600">{(member.subjects || []).join(", ")}</p>
        {member.experience && <p className="mt-2 text-xs text-slate-400">{member.experience} experience</p>}
      </div>
    </Link>
  );
}
