import { useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";

export function Seo({ title, description }) {
  const { settings } = useSettings();
  const brand = settings?.name || "EduPrime Academy";
  useEffect(() => {
    document.title = title ? `${title} | ${brand}` : brand;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description, brand]);
  return null;
}
