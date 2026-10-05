import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  searchApplications,
  staleLeads,
  pipelineStats,
  isContacted,
} from "../src/tools.js";
import type { Application } from "../src/sheets.js";

const apps: Application[] = [
  { date: "2026-10-01", company: "Asana", role: "Developer Relations Advocate", channel: "Portal", status: "Submitted", comp: "$182–207K", notes: "Greenhouse" },
  { date: "2026-09-01", company: "Old Corp", role: "DevRel", channel: "Email", status: "Sent", comp: "", notes: "" },
  { date: "2026-10-03", company: "Zyphra", role: "Developer Relations Lead", channel: "Portal", status: "Submitted", comp: "", notes: "SF onsite" },
  { date: "2026-10-02", company: "Skipped Inc", role: "Sales", channel: "Portal", status: "Skipped", comp: "", notes: "quota-carrying" },
  { date: "2026-08-01", company: "Ancient AI", role: "FDE", channel: "Email", status: "Sent", comp: "", notes: "" },
];

describe("isContacted", () => {
  it("treats Submitted/Sent as contacted, case-insensitively", () => {
    assert.equal(isContacted("Submitted"), true);
    assert.equal(isContacted("sent"), true);
    assert.equal(isContacted("Skipped"), false);
    assert.equal(isContacted("Blocked"), false);
  });
});

describe("searchApplications", () => {
  it("matches company substring", () => {
    const hits = searchApplications(apps, "asana");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].company, "Asana");
  });
  it("matches role and notes, filters by status", () => {
    const hits = searchApplications(apps, "relations", "Submitted");
    assert.deepEqual(hits.map((h) => h.company).sort(), ["Asana", "Zyphra"]);
  });
  it("respects limit", () => {
    assert.equal(searchApplications(apps, "a", undefined, 2).length, 2);
  });
});

describe("staleLeads", () => {
  it("returns contacted apps older than N days, oldest first", () => {
    const stale = staleLeads(apps, 14);
    const companies = stale.map((a) => a.company);
    assert.ok(companies.includes("Old Corp"));
    assert.ok(companies.includes("Ancient AI"));
    assert.ok(!companies.includes("Asana")); // too recent
    assert.ok(!companies.includes("Skipped Inc")); // not contacted
    assert.equal(stale[0].company, "Ancient AI"); // oldest first
  });
});

describe("pipelineStats", () => {
  it("counts by status, channel, and week", () => {
    const s = pipelineStats(apps);
    assert.equal(s.total, 5);
    assert.equal(s.byStatus["Submitted"], 2);
    assert.equal(s.byChannel["Portal"], 3);
    assert.equal(s.contacted, 4);
    assert.equal(s.replyRate, null);
    assert.ok(s.byWeek.length >= 3);
  });
  it("computes reply rate when given", () => {
    const s = pipelineStats(apps, 1);
    assert.equal(s.replyRate, 25);
  });
});
