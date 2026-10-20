import { useEffect, useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { CourseCard } from "@/components/public/CourseCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { Seo } from "@/components/common/Seo";

export default function Courses() {
  const [courses, setCourses] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data)).catch(() => setCourses([]));
    api.get("/courses/meta/categories").then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!courses) return [];
    return courses.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (level !== "all" && c.level !== level) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses, category, level, search]);

  return (
    <div>
      <Seo title="Courses" description="Browse our full course catalogue across competitive exams, academics and skills." />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Course Catalogue</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">Explore our programs and find the right fit for your goals. Fees shown are indicative — confirm at admission.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…"
              className="pl-9" data-testid="course-search-input" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-52" data-testid="course-category-filter"><Filter className="mr-2 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full sm:w-44" data-testid="course-level-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {courses === null ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <EmptyState title="No courses found" description="Try adjusting your search or filters." testid="courses-empty" />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="courses-grid">
            {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}
