# MCP Job-Tracker Server

Your job hunt as a conversation. This MCP server exposes your application tracker (a Google Sheet with 240+ applications) as tools any MCP client — Claude, Cursor, Windsurf — can call. Ask "which SF DevRel roles haven't replied in two weeks?" and get an answer, not a spreadsheet stare-down.

## Why this exists

Spreadsheets don't answer questions. This turns a static tracker into an assistant for the hunt itself: reply triage, stale-lead detection, pipeline stats — all callable by the AI tools you already live in.

## For AI builders (read this first)

Deliberately thin: the MCP SDK does the protocol, Google Sheets is the database, and each tool is one focused function. No framework, no ORM.

- **Runtime:** Node 20+, TypeScript, `@modelcontextprotocol/sdk`
- **Transport:** stdio (Claude Desktop / Cursor) — Streamable HTTP comes in v2
- **Data:** Google Sheets API reading the tracker tab; row 1 is the header
- **Auth:** `GOOGLE_SERVICE_ACCOUNT_JSON` env var (service account with viewer access to the sheet)

## Repo structure

```
mcp-job-tracker/
├── src/
│   ├── index.ts      # MCP server entry: registers tools, starts stdio transport
│   ├── sheets.ts     # ← Sheets backend: fetch rows, parse into Application[]
│   └── tools.ts      # ← the three tools (pure functions over Application[])
└── .env.example
```

## Tools

### `search_applications`
Find applications by company, role, status, or channel.
```json
{ "query": "DevRel", "status": "Sent", "limit": 10 }
```

### `reply_status`
Which applications got replies? Correlates tracker rows with Gmail threads (by company name match).
```json
{ "since": "2026-09-01" }
```
Returns: `{ company, role, status, replied: true|false, replyDate }` per row.

### `stale_leads`
Applications with no reply after N days (default 14), sorted oldest first — your follow-up list.
```json
{ "days": 14 }
```

### `pipeline_stats` (v2)
Counts by status/channel/week. "How many did I send last week? What's my reply rate?"

## `Application` type

```ts
interface Application {
  date: string;       // 2026-10-04
  company: string;    // "Asana"
  role: string;       // "Developer Advocate"
  channel: "Portal" | "Email";
  status: "Submitted" | "Sent" | "Skipped" | "Blocked" | "In progress";
  comp: string;       // "$182–207K"
  notes: string;
}
```

## Setup

```bash
npm install
cp .env.example .env   # add SHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON
npm run dev
```

Claude Desktop config:
```json
{
  "mcpServers": {
    "job-tracker": { "command": "node", "args": ["/path/to/mcp-job-tracker/dist/index.js"] }
  }
}
```

## Build order (suggested for AI implementation)

1. **sheets.ts** — fetch + parse rows into `Application[]` (handle short rows, trim whitespace)
2. **search_applications** — case-insensitive substring match across company/role/notes
3. **stale_leads** — date math on the `date` column, default 14 days
4. **reply_status** — Gmail API thread search per company (batch + cache; this is the hard one, do it last)
5. **Streamable HTTP transport** — so hosted clients can use it

## Tech stack

`TypeScript` `MCP SDK` `Google Sheets API` `Gmail API`

## Roadmap

- [ ] v1: stdio server + search_applications + stale_leads
- [ ] v2: reply_status via Gmail correlation
- [ ] v3: pipeline_stats + Streamable HTTP
- [ ] v4: "draft follow-up email" tool

## License

MIT
