import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchApplications } from "./sheets.js";
import {
  searchApplications,
  staleLeads,
  replyStatus,
  pipelineStats,
} from "./tools.js";

const server = new McpServer({ name: "job-tracker", version: "0.1.0" });

const text = (obj: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }],
});

server.tool(
  "search_applications",
  "Search tracked job applications by company, role, or notes text",
  {
    query: z.string().describe("Substring to match against company/role/notes"),
    status: z.string().optional().describe("Filter by status, e.g. Sent, Submitted"),
    limit: z.number().optional().describe("Max results (default 10)"),
  },
  async ({ query, status, limit }) => {
    const apps = await fetchApplications();
    return text(searchApplications(apps, query, status, limit ?? 10));
  }
);

server.tool(
  "stale_leads",
  "Applications contacted N+ days ago with no follow-up — your follow-up list",
  { days: z.number().optional().describe("Days since contact (default 14)") },
  async ({ days }) => {
    const apps = await fetchApplications();
    return text(staleLeads(apps, days ?? 14));
  }
);

server.tool(
  "reply_status",
  "Check Gmail for replies correlated to each tracked company (best-effort name match)",
  { days: z.number().optional().describe("Lookback window in days (default 90)") },
  async ({ days }) => {
    const apps = await fetchApplications();
    return text(await replyStatus(apps, days ?? 90));
  }
);

server.tool(
  "pipeline_stats",
  "Totals by status/channel, contacted count, and weekly volume",
  {},
  async () => {
    const apps = await fetchApplications();
    return text(pipelineStats(apps));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("mcp-job-tracker running on stdio");
