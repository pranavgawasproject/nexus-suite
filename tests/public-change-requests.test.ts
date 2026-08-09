/**
 * Pure unit tests for public Change Request and Policy schemas (zod validation).
 * Run: bun run tests/public-change-requests.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createChangeRequestSchema,
  updateChangeRequestSchema,
  upsertPolicySchema,
} from "../src/lib/schemas";

describe("createChangeRequestSchema", () => {
  test("accepts valid change request with defaults", () => {
    const r = createChangeRequestSchema.safeParse({
      title: "Update payment gateway",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("minor");
    }
  });

  test("accepts full payload", () => {
    const r = createChangeRequestSchema.safeParse({
      title: "Emergency security patch",
      description: "Critical CVE fix",
      projectId: "proj_1",
      type: "emergency",
      impactAssessment: "Low downtime expected",
      dueDate: "2026-08-15T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createChangeRequestSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  test("rejects invalid type", () => {
    const r = createChangeRequestSchema.safeParse({
      title: "CR",
      type: "trivial",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createChangeRequestSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateChangeRequestSchema", () => {
  test("requires id and status", () => {
    const r = updateChangeRequestSchema.safeParse({ id: "cr_1" });
    expect(r.success).toBe(false);
  });

  test("accepts status update", () => {
    const r = updateChangeRequestSchema.safeParse({
      id: "cr_1",
      status: "approved",
    });
    expect(r.success).toBe(true);
  });

  test("accepts full update", () => {
    const r = updateChangeRequestSchema.safeParse({
      id: "cr_1",
      status: "implemented",
      impactAssessment: "Completed with zero downtime",
      implementationNotes: "Deployed via blue-green",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status", () => {
    const r = updateChangeRequestSchema.safeParse({
      id: "cr_1",
      status: "pending_review",
    });
    expect(r.success).toBe(false);
  });
});

describe("upsertPolicySchema", () => {
  test("accepts valid retention policy", () => {
    const r = upsertPolicySchema.safeParse({
      type: "retention",
      name: "Default retention",
      config: { days: 365 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.active).toBe(true);
    }
  });

  test("accepts all policy types", () => {
    const types = ["retention", "ip_allowlist", "sso_enforcement", "data_residency", "password"] as const;
    for (const type of types) {
      const r = upsertPolicySchema.safeParse({
        type,
        name: `${type} policy`,
        config: { enabled: true },
        active: false,
      });
      expect(r.success).toBe(true);
    }
  });

  test("rejects invalid type", () => {
    const r = upsertPolicySchema.safeParse({
      type: "encryption",
      name: "Bad",
      config: {},
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty name", () => {
    const r = upsertPolicySchema.safeParse({
      type: "retention",
      name: "",
      config: {},
    });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 120", () => {
    const r = upsertPolicySchema.safeParse({
      type: "retention",
      name: "x".repeat(121),
      config: {},
    });
    expect(r.success).toBe(false);
  });
});
