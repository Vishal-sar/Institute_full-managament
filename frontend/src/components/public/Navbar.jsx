import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, LogIn, LayoutDashboard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/lib/roles";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/courses", label: "Courses" },
  { to: "/faculty", label: "Faculty" },
  { to: "/about", label: "About" },
  { to: "/admissions", label: "Admissions" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    cn(
      "text-sm font-medium transition-colors hover:text-teal-600",
      isActive ? "text-teal-600" : "text-slate-600"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" data-testid="nav-home-logo" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} data-testid={`nav-${l.label.toLowerCase()}-link`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm" className="text-slate-600" data-testid="nav-demo-link">
            <Link to="/demo">Book Demo</Link>
          </Button>
          {user ? (
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => navigate(homeFor(user.role))} data-testid="nav-dashboard-btn">
              <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
            </Button>
          ) : (
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => navigate("/login")} data-testid="nav-login-btn">
              <LogIn className="mr-1.5 h-4 w-4" /> Portal Login
            </Button>
          )}
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" data-testid="nav-mobile-toggle">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[82%] max-w-sm">
              <div className="mb-8 mt-2">
                <Logo />
              </div>
              <div className="flex flex-col gap-1">
                {LINKS.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <NavLink
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        cn(
                          "rounded-lg px-3 py-2.5 text-base font-medium",
                          isActive ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-50"
                        )
                      }
                      data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                    >
                      {l.label}
                    </NavLink>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <NavLink to="/demo" className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50">
                    Book Demo
                  </NavLink>
                </SheetClose>
              </div>
              <div className="mt-6">
                {user ? (
                  <SheetClose asChild>
                    <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => navigate(homeFor(user.role))}>
                      Go to Dashboard
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => navigate("/login")} data-testid="mobile-login-btn">
                      Portal Login
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
