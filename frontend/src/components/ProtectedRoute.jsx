import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/lib/roles";
import { Loader } from "@/components/common/Loader";

export function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (user === null) return <Loader full label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
