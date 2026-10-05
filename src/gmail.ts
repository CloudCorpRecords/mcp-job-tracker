import { google } from "googleapis";

/**
 * Best-effort Gmail correlation: for each company, look for threads in the
 * last `days` days that mention the company name (in from/subject/body).
 * This is heuristic — company names are matched case-insensitively against
 * thread snippets + headers, not exact sender addresses.
 */

export interface CompanyReply {
  company: string;
  replied: boolean;
  threadIds: string[];
  latestDate: string | null;
}

function getGmail() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var is not set");
  // NOTE: Gmail API requires domain-wide delegation for service accounts.
  // For personal Gmail, use OAuth2 user credentials instead and set
  // GMAIL_OAUTH_TOKEN_JSON. See README for setup.
  const oauthRaw = process.env.GMAIL_OAUTH_TOKEN_JSON;
  if (oauthRaw) {
    const tokens = JSON.parse(oauthRaw);
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_OAUTH_CLIENT_ID,
      process.env.GMAIL_OAUTH_CLIENT_SECRET
    );
    auth.setCredentials(tokens);
    return google.gmail({ version: "v1", auth });
  }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  return google.gmail({ version: "v1", auth });
}

function cleanCompany(company: string): string {
  return company
    .replace(/\s*\(.*?\)\s*/g, " ") // drop "(YC S24)" style suffixes
    .replace(/[^a-zA-Z0-9&.\- ]/g, "")
    .trim()
    .split(" ")[0]; // first token is usually the distinctive one
}

export async function checkReplies(
  companies: string[],
  days = 90
): Promise<CompanyReply[]> {
  const gmail = getGmail();
  const results: CompanyReply[] = [];

  for (const company of companies) {
    const token = cleanCompany(company);
    if (token.length < 3) {
      results.push({ company, replied: false, threadIds: [], latestDate: null });
      continue;
    }
    try {
      const res = await gmail.users.threads.list({
        userId: "me",
        q: `"${token}" newer_than:${days}d`,
        maxResults: 5,
      });
      const threads = res.data.threads || [];
      let latest: string | null = null;
      for (const t of threads) {
        const full = await gmail.users.threads.get({
          userId: "me",
          id: t.id!,
          format: "metadata",
          metadataHeaders: ["Date"],
        });
        const date =
          full.data.messages?.[0]?.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === "date"
          )?.value || null;
        if (date && (!latest || Date.parse(date) > Date.parse(latest))) latest = date;
      }
      results.push({
        company,
        replied: threads.length > 0,
        threadIds: threads.map((t) => t.id!),
        latestDate: latest,
      });
    } catch {
      results.push({ company, replied: false, threadIds: [], latestDate: null });
    }
  }
  return results;
}
