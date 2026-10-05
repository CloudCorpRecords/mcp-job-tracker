import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchApplications } from "./sheets.js";
import { searchApplications, staleLeads } from "./tools.js";

const server = new McpServer({ name: "job-tracker", version: "0.1.0" });

server.tool(
  "search_applications",
  { query: z.string(), status: z.string().optional(), limit: z.number().optional() },
  async ({ query, status, limit }) => {
    const apps = await fetchApplications();
    const hits = searchApplications(apps, query, status, limit ?? 10);
    return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
  }
);

server.tool(
  "stale_leads",
  { days: z.number().optional() },
  async ({ days }) => {
    const apps = await fetchApplications();
    const stale = staleLeads(apps, days ?? 14);
    return { content: [{ type: "text", text: JSON.stringify(stale, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
