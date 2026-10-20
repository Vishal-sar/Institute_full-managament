import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { GraduationCap, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { errMsg } from "@/lib/api";
import { homeFor } from "@/lib/roles";
import { Seo } from "@/components/common/Seo";

export default function Login() {
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      toast.success(`Welcome back, ${data.name}`);
      navigate(homeFor(data.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Seo title="Login" description="Sign in to the EduPrime Academy portal." />
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500"><GraduationCap className="h-5 w-5" /></div>
            <span className="font-display text-lg font-extrabold">{settings?.name}</span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="font-display text-3xl font-bold text-white">One platform for your entire institute.</h2>
          <p className="mt-4 max-w-md text-slate-300">
            Admissions, students, batches, attendance, and fees — managed securely in one place for
            administrators, faculty, and students.
          </p>
        </div>
        <div className="relative text-sm text-slate-400">Secure, role-based access</div>
      </div>

      {/* Form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">Portal Login</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" data-testid="login-email-input" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" data-testid="login-password-input" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm font-medium text-rose-600" data-testid="login-error">{error}</p>}
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="login-submit-btn">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button variant="outline" className="w-full" onClick={googleLogin} data-testid="google-login-btn">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Staff accounts are created by your administrator. New Google sign-ins start as student accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
