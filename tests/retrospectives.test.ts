/**
 * Pure unit tests for Retrospective schemas (zod validation).
 * Run: bun run tests/retrospectives.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createRetrospectiveSchema,
  updateRetrospectiveSchema,
  retrospectiveQuerySchema,
} from "../src/lib/schemas";

describe("createRetrospectiveSchema", () => {
  test("accepts valid retrospective", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cyc_123",
      title: "Sprint 12 Retro",
      wentWell: "Shipped on time",
      toImprove: "Fewer mid-sprint scope changes",
      actionItems: "- Freeze scope after planning",
      status: "draft",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cyc_123",
      title: "",
    });
    expect(r.success).toBe(false);
  });

  test("requires cycleId", () => {
    const r = createRetrospectiveSchema.safeParse({
      title: "Retro without cycle",
    });
    expect(r.success).toBe(false);
  });

  test("defaults status to draft", () => {
    const r = createRetrospectiveSchema.safeParse({
      cycleId: "cyc_abc",
      title: "Sprint 1 Retro",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("draft");
  });
});

describe("updateRetrospectiveSchema", () => {
  test("requires id", () => {
    const r = updateRetrospectiveSchema.safeParse({ title: "Renamed" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateRetrospectiveSchema.safeParse({
      id: "retro_1",
      status: "published",
    });
    expect(r.success).toBe(true);
  });
});

describe("retrospectiveQuerySchema", () => {
  test("accepts empty query", () => {
    const r = retrospectiveQuerySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  test("accepts cycleId filter", () => {
    const r = retrospectiveQuerySchema.safeParse({ cycleId: "cyc_1" });
    expect(r.success).toBe(true);
  });
});
