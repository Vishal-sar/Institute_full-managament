import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/common/Seo";

export const AuthCard = ({ title, subtitle, seo, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
    <Seo title={seo} description="Reset access to your EduPrime Academy portal account." />
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600" data-testid="back-to-login-link">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  </div>
);
