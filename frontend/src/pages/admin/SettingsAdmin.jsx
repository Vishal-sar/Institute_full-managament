import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errMsg } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";

export default function SettingsAdmin() {
  const { reload } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((r) => setForm({ ...(r.data || {}), social: r.data?.social || {} })).catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!form) return <Loader full />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSocial = (k, v) => setForm((f) => ({ ...f, social: { ...f.social, [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      const { id, _id, updated_at, ...payload } = form;
      await api.put("/admin/settings", payload);
      toast.success("Settings saved");
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const field = (key, label, props = {}) => (
    <div className="space-y-1.5"><Label>{label}</Label><Input value={form[key] || ""} onChange={(e) => set(key, e.target.value)} {...props} /></div>
  );
  const area = (key, label, rows = 5) => (
    <div className="space-y-1.5"><Label>{label}</Label><Textarea rows={rows} value={form[key] || ""} onChange={(e) => set(key, e.target.value)} /></div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Institute Settings" description="Customize branding, contact details and policies. Changes apply across the website.">
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={save} disabled={saving} data-testid="settings-save-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1.5 h-4 w-4" /> Save Changes</>}</Button>
      </PageHeader>

      <Tabs defaultValue="brand">
        <TabsList><TabsTrigger value="brand">Branding</TabsTrigger><TabsTrigger value="contact">Contact</TabsTrigger><TabsTrigger value="policies">Policies</TabsTrigger></TabsList>

        <TabsContent value="brand" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Institute name", { "data-testid": "settings-name-input" })}
              {field("tagline", "Tagline")}
              {field("logo_url", "Logo URL")}
              {field("hero_image", "Hero image URL")}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{area("about", "About", 4)}{area("mission", "Mission", 4)}</div>
            <div className="mt-4">{area("methodology", "Teaching methodology", 3)}</div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("phone", "Phone")}
              {field("email", "Email")}
              {field("whatsapp", "WhatsApp number (digits only, with country code)")}
              {field("hours", "Opening hours")}
            </div>
            <div className="mt-4">{area("address", "Address", 2)}</div>
            <div className="mt-4">{field("map_url", "Google Maps embed URL")}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Facebook</Label><Input value={form.social?.facebook || ""} onChange={(e) => setSocial("facebook", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Instagram</Label><Input value={form.social?.instagram || ""} onChange={(e) => setSocial("instagram", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>YouTube</Label><Input value={form.social?.youtube || ""} onChange={(e) => setSocial("youtube", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>LinkedIn</Label><Input value={form.social?.linkedin || ""} onChange={(e) => setSocial("linkedin", e.target.value)} /></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">Have these reviewed legally before launch.</p>
            {area("privacy_policy", "Privacy Policy", 5)}
            {area("terms", "Terms & Conditions", 5)}
            {area("fee_policy", "Fee & Refund Policy", 5)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
