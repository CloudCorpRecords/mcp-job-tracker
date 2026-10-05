import type { Application } from "./sheets.js";
import { checkReplies, type CompanyReply } from "./gmail.js";

const CONTACTED = new Set(["submitted", "sent"]);

export function isContacted(status: string): boolean {
  return CONTACTED.has(status.trim().toLowerCase());
}

export function searchApplications(
  apps: Application[],
  query: string,
  status?: string,
  limit = 10
): Application[] {
  const q = query.toLowerCase();
  return apps
    .filter(
      (a) =>
        (!status || a.status.toLowerCase() === status.toLowerCase()) &&
        (a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.notes.toLowerCase().includes(q))
    )
    .slice(0, Math.max(1, limit));
}

export function staleLeads(apps: Application[], days = 14): Application[] {
  const cutoff = Date.now() - days * 86_400_000;
  return apps
    .filter((a) => {
      const t = Date.parse(a.date);
      return isContacted(a.status) && !Number.isNaN(t) && t < cutoff;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export interface ReplyStatusRow extends Application {
  replied: boolean;
  replyDate: string | null;
}

export async function replyStatus(
  apps: Application[],
  days = 90
): Promise<ReplyStatusRow[]> {
  const companies = [...new Set(apps.map((a) => a.company))];
  const replies = await checkReplies(companies, days);
  const byCompany = new Map<string, CompanyReply>(replies.map((r) => [r.company, r]));
  return apps.map((a) => {
    const r = byCompany.get(a.company);
    return { ...a, replied: r?.replied ?? false, replyDate: r?.latestDate ?? null };
  });
}

export interface PipelineStats {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  contacted: number;
  replyRate: number | null; // set when reply data is available
  byWeek: { week: string; count: number }[];
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "unknown";
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function pipelineStats(apps: Application[], repliedCount?: number): PipelineStats {
  const byStatus: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const byWeekMap = new Map<string, number>();
  let contacted = 0;

  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    byChannel[a.channel] = (byChannel[a.channel] || 0) + 1;
    if (isContacted(a.status)) contacted++;
    const wk = weekKey(a.date);
    byWeekMap.set(wk, (byWeekMap.get(wk) || 0) + 1);
  }

  const byWeek = [...byWeekMap.entries()]
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    total: apps.length,
    byStatus,
    byChannel,
    contacted,
    replyRate:
      repliedCount === undefined || contacted === 0
        ? null
        : Math.round((repliedCount / contacted) * 1000) / 10,
    byWeek,
  };
}
