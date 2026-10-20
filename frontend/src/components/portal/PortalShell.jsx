import { useNavigate, Link } from "react-router-dom";
import { LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/roles";

export function PortalShell({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => { await logout(); navigate("/login", { replace: true }); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 sm:inline">{title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100" data-testid="portal-user-menu">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">{user?.name?.[0]?.toUpperCase()}</div>
                  <div className="hidden text-left sm:block"><p className="text-sm font-semibold leading-tight text-slate-800">{user?.name}</p><p className="text-xs leading-tight text-slate-400">{ROLE_LABELS[user?.role]}</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/")}><ExternalLink className="mr-2 h-4 w-4" /> Public site</DropdownMenuItem>
                <DropdownMenuItem onClick={doLogout} className="text-rose-600" data-testid="portal-logout-btn"><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
