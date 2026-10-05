import { google } from "googleapis";

export interface Application {
  date: string;
  company: string;
  role: string;
  channel: string;
  status: string;
  comp: string;
  notes: string;
}

const HEADERS = ["date", "company", "role", "channel", "status", "comp", "notes"] as const;

function getAuth(scopes: string[]) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var is not set");
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes,
  });
}

export async function fetchApplications(
  sheetId = process.env.SHEET_ID,
  range = "Sheet1!A2:G2000"
): Promise<Application[]> {
  if (!sheetId) throw new Error("SHEET_ID env var is not set");
  const sheets = google.sheets({
    version: "v4",
    auth: getAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]),
  });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  return (res.data.values || [])
    .map((row) => {
      const app = {} as Record<string, string>;
      HEADERS.forEach((h, i) => (app[h] = String(row[i] ?? "").trim()));
      return app as unknown as Application;
    })
    .filter((a) => a.company.length > 0);
}
