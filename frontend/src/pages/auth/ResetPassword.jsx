import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMsg } from "@/lib/api";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setDone(true);
      toast.success("Password updated");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard seo="Reset Password" title="Link not valid" subtitle="This reset link is missing or incomplete.">
        <Link to="/forgot-password" className="text-sm font-medium text-teal-700 hover:underline" data-testid="request-new-link">Request a new reset link</Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard seo="Reset Password" title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-4 text-sm text-teal-800" data-testid="reset-success">
          <CheckCircle2 className="h-5 w-5" /> Your password has been changed.
        </div>
        <Button asChild className="mt-4 w-full bg-teal-600 hover:bg-teal-700" data-testid="reset-go-login"><Link to="/login">Go to sign in</Link></Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard seo="Reset Password" title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 6 characters" autoComplete="new-password" data-testid="reset-password-input" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            autoComplete="new-password" data-testid="reset-confirm-input" />
        </div>
        {error && (
          <p className="text-sm font-medium text-rose-600" data-testid="reset-error">
            {error} {error.includes("expired") && <Link to="/forgot-password" className="underline">Request a new link</Link>}
          </p>
        )}
        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="reset-submit-btn">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
