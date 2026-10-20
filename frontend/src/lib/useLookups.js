import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useLookups() {
  const [lookups, setLookups] = useState({ courses: [], batches: [], faculty: [], staff: [] });
  useEffect(() => {
    api.get("/admin/lookups").then((r) => setLookups(r.data)).catch(() => {});
  }, []);
  return lookups;
}
