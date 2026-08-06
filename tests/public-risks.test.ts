/**
 * Pure unit tests for public Risk / Issue schemas (zod validation).
 * Run: bun run tests/public-risks.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createRiskSchema,
  updateRiskSchema,
  createIssueSchema,
  updateIssueSchema,
} from "../src/lib/schemas";

describe("createRiskSchema", () => {
  test("accepts valid risk with defaults", () => {
    const r = createRiskSchema.safeParse({
      title: "Vendor lock-in",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.category).toBe("operational");
      expect(r.data.likelihood).toBe(3);
      expect(r.data.impact).toBe(3);
      expect(r.data.status).toBe("open");
    }
  });

  test("accepts full risk payload", () => {
    const r = createRiskSchema.safeParse({
      title: "Data breach",
      description: "Unauthorized access to customer data",
      category: "compliance",
      likelihood: 2,
      impact: 5,
      status: "mitigating",
      mitigation: "Enable MFA and audit logging",
      dueDate: "2026-09-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createRiskSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  test("rejects likelihood out of range", () => {
    const r = createRiskSchema.safeParse({
      title: "Risk",
      likelihood: 6,
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid category", () => {
    const r = createRiskSchema.safeParse({
      title: "Risk",
      category: "legal",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createRiskSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateRiskSchema", () => {
  test("requires id", () => {
    const r = updateRiskSchema.safeParse({ status: "closed" });
    expect(r.success).toBe(false);
  });

  test("accepts status change", () => {
    const r = updateRiskSchema.safeParse({
      id: "risk_1",
      status: "accepted",
    });
    expect(r.success).toBe(true);
  });
});

describe("createIssueSchema", () => {
  test("accepts valid issue with defaults", () => {
    const r = createIssueSchema.safeParse({
      title: "Login timeout",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.severity).toBe("medium");
      expect(r.data.status).toBe("open");
      expect(r.data.escalationLevel).toBe(0);
    }
  });

  test("rejects invalid severity", () => {
    const r = createIssueSchema.safeParse({
      title: "Issue",
      severity: "extreme",
    });
    expect(r.success).toBe(false);
  });

  test("rejects escalationLevel above 3", () => {
    const r = createIssueSchema.safeParse({
      title: "Issue",
      escalationLevel: 4,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateIssueSchema", () => {
  test("requires id", () => {
    const r = updateIssueSchema.safeParse({ status: "resolved" });
    expect(r.success).toBe(false);
  });

  test("accepts severity and status update", () => {
    const r = updateIssueSchema.safeParse({
      id: "issue_1",
      severity: "critical",
      status: "in_progress",
    });
    expect(r.success).toBe(true);
  });
});
