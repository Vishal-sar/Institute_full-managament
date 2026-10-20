import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, UserPlus, CalendarCheck, BookOpen, Boxes, GraduationCap,
  ClipboardList, Wallet, Megaphone, BarChart3, ShieldCheck, Settings, History,
  Menu, LogOut, ExternalLink, ChevronDown,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/enquiries", label: "Admissions", icon: UserPlus },
  { to: "/admin/demo", label: "Demo Bookings", icon: CalendarCheck },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/batches", label: "Batches", icon: Boxes },
  { to: "/admin/faculty", label: "Faculty", icon: GraduationCap },
  { to: "/admin/attendance", label: "Attendance", icon: ClipboardList },
  { to: "/admin/fees", label: "Fees & Payments", icon: Wallet },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const SUPER_NAV = [
  { to: "/admin/staff", label: "Staff & Roles", icon: ShieldCheck },
  { to: "/admin/settings", label: "Institute Settings", icon: Settings },
  { to: "/admin/audit", label: "Audit History", icon: History },
];

function SidebarNav({ onNavigate, isSuper }) {
  const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
  const cls = ({ isActive }) =>
    cn(base, isActive ? "bg-teal-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white");
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={cls} onClick={onNavigate} data-testid={`sidebar-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
          <n.icon className="h-4.5 w-4.5" /> {n.label}
        </NavLink>
      ))}
      {isSuper && (
        <>
          <div className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Administration</div>
          {SUPER_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={cls} onClick={onNavigate} data-testid={`sidebar-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <n.icon className="h-4.5 w-4.5" /> {n.label}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isSuper = user?.role === "super_admin";

  useEffect(() => { document.title = "Management Console | EduPrime Academy"; }, []);

  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <Link to="/admin"><Logo light /></Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav isSuper={isSuper} />
        </div>
        <div className="border-t border-slate-800 p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            <ExternalLink className="h-4 w-4" /> View public site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" data-testid="admin-mobile-menu"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0 text-white">
                <div className="flex h-16 items-center border-b border-slate-800 px-5"><Logo light /></div>
                <div className="p-3"><SidebarNav isSuper={isSuper} onNavigate={() => setOpen(false)} /></div>
              </SheetContent>
            </Sheet>
            <span className="font-display text-sm font-semibold text-slate-500">Management Console</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100" data-testid="admin-user-menu">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-tight text-slate-800">{user?.name}</p>
                  <p className="text-xs leading-tight text-slate-400">{ROLE_LABELS[user?.role]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")}>  <ExternalLink className="mr-2 h-4 w-4" /> Public site</DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout} className="text-rose-600" data-testid="admin-logout-btn"><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
