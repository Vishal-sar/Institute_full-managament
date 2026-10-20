import { useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, MapPin, Clock, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, errMsg } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { Seo } from "@/components/common/Seo";

export default function Contact() {
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || !form.message.trim())
      return toast.error("Please fill name, a valid email and a message");
    setLoading(true);
    try {
      const { data } = await api.post("/contact", form);
      toast.success(data.message);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const items = [
    { icon: MapPin, label: "Address", value: settings?.address },
    { icon: Phone, label: "Phone", value: settings?.phone, href: `tel:${settings?.phone}` },
    { icon: Mail, label: "Email", value: settings?.email, href: `mailto:${settings?.email}` },
    { icon: Clock, label: "Opening hours", value: settings?.hours },
  ];

  return (
    <div>
      <Seo title="Contact" description={`Contact ${settings?.name}`} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">Get in touch</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">We'd love to hear from you. Details below are demonstration values until replaced.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => it.value && (
              <div key={it.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600"><it.icon className="h-5 w-5" /></div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{it.label}</p>
                {it.href ? <a href={it.href} className="mt-1 block text-sm font-medium text-slate-800 hover:text-teal-600">{it.value}</a> : <p className="mt-1 text-sm font-medium text-slate-800">{it.value}</p>}
              </div>
            ))}
          </div>
          {settings?.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600" data-testid="contact-whatsapp-btn">
              <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
            </a>
          )}
          {settings?.map_url ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <iframe title="Map" src={settings.map_url} className="h-64 w-full" loading="lazy" />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">Map embed appears here when configured in settings</div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" data-testid="contact-form">
          <h2 className="font-display text-xl font-bold text-slate-900">Send us a message</h2>
          <div className="space-y-1.5"><Label htmlFor="cname">Name *</Label><Input id="cname" value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="contact-name-input" /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="cemail">Email *</Label><Input id="cemail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="contact-email-input" /></div>
            <div className="space-y-1.5"><Label htmlFor="cphone">Phone</Label><Input id="cphone" value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="contact-phone-input" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="cmsg">Message *</Label><Textarea id="cmsg" rows={5} value={form.message} onChange={(e) => set("message", e.target.value)} data-testid="contact-message-input" /></div>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading} data-testid="contact-submit-button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Message"}
          </Button>
        </form>
      </section>
    </div>
  );
}
