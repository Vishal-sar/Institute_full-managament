import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errMsg } from "@/lib/api";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(data.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard seo="Forgot Password" title="Forgot password?" subtitle="Enter your account email and we'll send you a link to set a new password.">
      {sent ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800" data-testid="forgot-success">
          <MailCheck className="mb-2 h-5 w-5" />
          <p>{sent}</p>
          <p className="mt-2 text-teal-700">The link expires in 60 minutes. Please check your spam folder too.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" data-testid="forgot-email-input" />
          </div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="forgot-submit-btn">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
