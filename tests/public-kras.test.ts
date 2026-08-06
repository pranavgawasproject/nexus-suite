/**
 * Pure unit tests for public KRA schemas (zod validation).
 * Run: bun run tests/public-kras.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createKraSchema, updateKraSchema } from "../src/lib/schemas";

describe("createKraSchema", () => {
  test("accepts valid KRA with defaults", () => {
    const r = createKraSchema.safeParse({
      title: "Improve delivery predictability",
      userId: "user_1",
      cycle: "Q3-2026",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.weight).toBe(25);
      expect(r.data.targetRating).toBe(3);
    }
  });

  test("accepts full KRA payload", () => {
    const r = createKraSchema.safeParse({
      title: "Customer NPS",
      description: "Raise NPS to 45+",
      userId: "user_2",
      cycle: "Q4-2026",
      weight: 40,
      targetRating: 4,
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createKraSchema.safeParse({
      title: "",
      userId: "user_1",
      cycle: "Q1-2026",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing userId", () => {
    const r = createKraSchema.safeParse({
      title: "KRA",
      cycle: "Q1-2026",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing cycle", () => {
    const r = createKraSchema.safeParse({
      title: "KRA",
      userId: "user_1",
    });
    expect(r.success).toBe(false);
  });

  test("rejects weight above 100", () => {
    const r = createKraSchema.safeParse({
      title: "KRA",
      userId: "user_1",
      cycle: "Q1-2026",
      weight: 101,
    });
    expect(r.success).toBe(false);
  });

  test("rejects targetRating out of range", () => {
    const r = createKraSchema.safeParse({
      title: "KRA",
      userId: "user_1",
      cycle: "Q1-2026",
      targetRating: 6,
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createKraSchema.safeParse({
      title: "x".repeat(201),
      userId: "user_1",
      cycle: "Q1-2026",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateKraSchema", () => {
  test("requires id", () => {
    const r = updateKraSchema.safeParse({ status: "self_review" });
    expect(r.success).toBe(false);
  });

  test("accepts status and ratings update", () => {
    const r = updateKraSchema.safeParse({
      id: "kra_1",
      status: "manager_review",
      selfRating: 4,
      managerRating: 3,
      selfComment: "Met most targets",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status", () => {
    const r = updateKraSchema.safeParse({
      id: "kra_1",
      status: "approved",
    });
    expect(r.success).toBe(false);
  });

  test("rejects selfRating out of range", () => {
    const r = updateKraSchema.safeParse({
      id: "kra_1",
      selfRating: 0,
    });
    expect(r.success).toBe(false);
  });
});
