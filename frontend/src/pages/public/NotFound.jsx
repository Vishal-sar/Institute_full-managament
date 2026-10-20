import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/common/Seo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Seo title="Page not found" />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Compass className="h-8 w-8" /></div>
      <p className="mt-6 font-display text-6xl font-extrabold text-slate-900">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-slate-800">Page not found</h1>
      <p className="mt-2 max-w-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="bg-teal-600 hover:bg-teal-700"><Link to="/">Back to home</Link></Button>
        <Button asChild variant="outline"><Link to="/courses">Browse courses</Link></Button>
      </div>
    </div>
  );
}
