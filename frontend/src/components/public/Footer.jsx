import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSettings } from "@/context/SettingsContext";

export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();
  const social = settings?.social || {};

  return (
    <footer className="mt-24 border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{settings?.tagline}</p>
          <p className="mt-3 inline-block rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
            Demonstration content — verify before launch
          </p>
          <div className="mt-5 flex gap-3">
            {social.facebook && <a href={social.facebook} aria-label="Facebook" className="text-slate-400 hover:text-white"><Facebook className="h-5 w-5" /></a>}
            {social.instagram && <a href={social.instagram} aria-label="Instagram" className="text-slate-400 hover:text-white"><Instagram className="h-5 w-5" /></a>}
            {social.youtube && <a href={social.youtube} aria-label="YouTube" className="text-slate-400 hover:text-white"><Youtube className="h-5 w-5" /></a>}
            {social.linkedin && <a href={social.linkedin} aria-label="LinkedIn" className="text-slate-400 hover:text-white"><Linkedin className="h-5 w-5" /></a>}
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/courses" className="hover:text-white">Courses</Link></li>
            <li><Link to="/faculty" className="hover:text-white">Faculty</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/announcements" className="hover:text-white">Announcements</Link></li>
            <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white">Admissions</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/admissions" className="hover:text-white">Enquire Now</Link></li>
            <li><Link to="/demo" className="hover:text-white">Book a Demo Class</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link to="/fees-policy" className="hover:text-white">Fee &amp; Refund Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-white">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            {settings?.address && <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" /><span>{settings.address}</span></li>}
            {settings?.phone && <li className="flex gap-2.5"><Phone className="h-4 w-4 shrink-0 text-teal-400" /><a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a></li>}
            {settings?.email && <li className="flex gap-2.5"><Mail className="h-4 w-4 shrink-0 text-teal-400" /><a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {year} {settings?.name}. All rights reserved.</p>
          <p>Built as a reusable coaching institute platform.</p>
        </div>
      </div>
    </footer>
  );
}
