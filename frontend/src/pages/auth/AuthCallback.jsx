import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/lib/roles";
import { Loader } from "@/components/common/Loader";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(data);
        window.history.replaceState(null, "", window.location.pathname);
        toast.success(`Welcome, ${data.name}`);
        navigate(homeFor(data.role), { replace: true });
      } catch {
        toast.error("Google sign-in failed. Please try again.");
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return <Loader full label="Signing you in…" />;
}
