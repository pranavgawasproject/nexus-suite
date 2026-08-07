/**
 * Pure unit tests for public Retrospective schemas (zod validation).
 * Run: bun run tests/public-retrospectives.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createRetrospectiveSchema,
  updateRetrospectiveSchema,
  createPublicRetrospectiveSchema,
} from "../src/lib/schemas";

describe("createRetrospectiveSchema", () => {
  test("accepts valid retrospective with defaults", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "Sprint 12 Retro",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("draft");
    }
  });

  test("accepts full retrospective payload", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "End of Q3 Retro",
      wentWell: "Shipped on time",
      toImprove: "Better estimates",
      actionItems: "Add capacity buffer",
      status: "published",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing cycleId", () => {
    const r = createRetrospectiveSchema.safeParse({
      title: "Retro",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "Retro",
      status: "closed",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateRetrospectiveSchema", () => {
  test("requires id", () => {
    const r = updateRetrospectiveSchema.safeParse({ title: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateRetrospectiveSchema.safeParse({
      id: "retro_1",
      status: "archived",
      actionItems: "Follow up next sprint",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status on update", () => {
    const r = updateRetrospectiveSchema.safeParse({
      id: "retro_1",
      status: "open",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title on update", () => {
    const r = updateRetrospectiveSchema.safeParse({
      id: "retro_1",
      title: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("createPublicRetrospectiveSchema", () => {
  test("accepts without authorId", () => {
    const r = createPublicRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "Public Retro",
    });
    expect(r.success).toBe(true);
  });

  test("accepts with optional authorId", () => {
    const r = createPublicRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "Public Retro",
      authorId: "user_1",
      status: "draft",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty authorId when provided", () => {
    const r = createPublicRetrospectiveSchema.safeParse({
      cycleId: "cycle_1",
      title: "Public Retro",
      authorId: "",
    });
    expect(r.success).toBe(false);
  });
});
