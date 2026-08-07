/**
 * Pure unit tests for public Cycle schemas (zod validation).
 * Run: bun run tests/public-cycles.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createCycleSchema,
  updateCycleSchema,
} from "../src/lib/schemas";

describe("createCycleSchema", () => {
  test("accepts valid cycle with defaults", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint 12",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("planned");
    }
  });

  test("accepts full cycle payload", () => {
    const r = createCycleSchema.safeParse({
      name: "Q3 Sprint 1",
      description: "Focus on API polish",
      projectId: "proj_1",
      status: "active",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-15T00:00:00.000Z",
      goal: "Ship public schema tests",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createCycleSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  test("rejects missing name", () => {
    const r = createCycleSchema.safeParse({ description: "No name" });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 120", () => {
    const r = createCycleSchema.safeParse({
      name: "x".repeat(121),
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint",
      status: "draft",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-ISO startDate", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint",
      startDate: "2026-08-01",
    });
    expect(r.success).toBe(false);
  });

  test("rejects goal longer than 500", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint",
      goal: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateCycleSchema", () => {
  test("requires id", () => {
    const r = updateCycleSchema.safeParse({ name: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateCycleSchema.safeParse({
      id: "cycle_1",
      status: "completed",
      goal: "Done",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status on update", () => {
    const r = updateCycleSchema.safeParse({
      id: "cycle_1",
      status: "archived",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty name on update", () => {
    const r = updateCycleSchema.safeParse({
      id: "cycle_1",
      name: "",
    });
    expect(r.success).toBe(false);
  });
});
