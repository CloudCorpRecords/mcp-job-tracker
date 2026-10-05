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

const HEADERS = ["date","company","role","channel","status","comp","notes"];

export async function fetchApplications(): Promise<Application[]> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Sheet1!A2:G1000",
  });
  return (res.data.values || []).map((row) => {
    const app: any = {};
    HEADERS.forEach((h, i) => (app[h] = (row[i] || "").trim()));
    return app as Application;
  }).filter((a) => a.company);
}
