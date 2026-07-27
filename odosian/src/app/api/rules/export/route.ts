export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate, type AuthenticatedRequest } from "@/lib/middleware";
import { errorResponse } from "@/lib/errors";
import * as XLSX from "xlsx";

const JSON_FIELDS = ["tags", "falsePositives", "references"];

function parseRule(rule: Record<string, unknown>) {
  const parsed = { ...rule };
  for (const field of JSON_FIELDS) {
    if (typeof parsed[field] === "string") {
      try { parsed[field] = JSON.parse(parsed[field] as string); } catch { /* keep */ }
    }
  }
  return parsed;
}

export const GET = authenticate(async (request: AuthenticatedRequest) => {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const ids = url.searchParams.get("ids");

    const where: Record<string, unknown> = {};
    if (ids) {
      where.id = { in: ids.split(",").map((s) => s.trim()) };
    }

    const rules = await prisma.rule.findMany({
      where,
      include: {
        author: { select: { name: true, email: true } },
        mitreMappings: {
          select: { tacticId: true, tacticName: true, techniqueId: true, techniqueName: true, confidence: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsed = rules.map((r) => {
      const p = parseRule(r as unknown as Record<string, unknown>);
      return p;
    });

    if (format === "ndjson") {
      const body = parsed.map((r) => JSON.stringify(r)).join("\n");
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": "attachment; filename=rules.ndjson",
        },
      });
    }

    if (format === "csv") {
      const headers = [
        "id", "title", "description", "ruleType", "severity", "riskScore",
        "query", "language", "index", "tags", "status", "version",
        "interval", "fromTime", "maxSignals", "author", "createdAt",
      ];
      const rows = parsed.map((r) => headers.map((h) => {
        if (h === "author") return (r.author as { name: string })?.name || "";
        if (h === "tags") return Array.isArray(r[h]) ? (r[h] as string[]).join("; ") : String(r[h] || "");
        const val = r[h];
        const str = String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"` : str;
      }));
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=rules.csv",
        },
      });
    }

    if (format === "xlsx") {
      const ruleRows = parsed.map((r) => ({
        ID: r.id,
        Title: r.title,
        Description: r.description,
        Type: r.ruleType,
        Severity: r.severity,
        "Risk Score": r.riskScore,
        Query: r.query,
        Language: r.language,
        Index: r.index,
        Tags: Array.isArray(r.tags) ? (r.tags as string[]).join("; ") : "",
        Status: r.status,
        Version: r.version,
        Interval: r.interval,
        Author: (r.author as { name: string })?.name || "",
        Created: r.createdAt,
      }));

      const mitreRows: Record<string, string | number>[] = [];
      for (const r of parsed) {
        const mappings = r.mitreMappings as Array<{ tacticId: string; tacticName: string; techniqueId: string; techniqueName: string; confidence: number }>;
        if (Array.isArray(mappings)) {
          for (const m of mappings) {
            mitreRows.push({
              "Rule ID": String(r.id),
              "Rule Title": String(r.title),
              "Tactic ID": m.tacticId,
              "Tactic Name": m.tacticName,
              "Technique ID": m.techniqueId,
              "Technique Name": m.techniqueName,
              Confidence: m.confidence,
            });
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ruleRows), "Rules");
      if (mitreRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mitreRows), "MITRE Mappings");
      }
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=rules.xlsx",
        },
      });
    }

    return NextResponse.json(parsed, {
      headers: { "Content-Disposition": "attachment; filename=rules.json" },
    });
  } catch (e) {
    console.error("Failed to export rules:", e);
    return errorResponse("Failed to export rules", 500);
  }
});
