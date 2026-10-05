import type { Application } from "./sheets.js";

export function searchApplications(apps: Application[], query: string, status?: string, limit = 10) {
  const q = query.toLowerCase();
  return apps
    .filter((a) =>
      (!status || a.status.toLowerCase() === status.toLowerCase()) &&
      (a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.notes.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function staleLeads(apps: Application[], days = 14) {
  const cutoff = Date.now() - days * 86_400_000;
  return apps
    .filter((a) => {
      const t = Date.parse(a.date);
      const contacted = ["submitted", "sent"].includes(a.status.toLowerCase());
      return contacted && !isNaN(t) && t < cutoff;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
