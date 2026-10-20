import { Link } from "react-router-dom";
import { Clock, BarChart3, ArrowRight, BookOpen } from "lucide-react";
import { formatCurrency } from "@/lib/api";

export function CourseCard({ course }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      data-testid={`course-card-${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><BookOpen className="h-10 w-10" /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-700 shadow-sm">
          {course.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-slate-900 group-hover:text-teal-700">{course.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-500">{course.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
          <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {course.level}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="font-display text-base font-bold text-slate-900">{formatCurrency(course.fee_amount, course.currency)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600">
            Details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
