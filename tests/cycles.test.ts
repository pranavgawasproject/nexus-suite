/**
 * Pure unit tests for Cycle / Sprint schemas (zod validation).
 * Run: bun run tests/cycles.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createCycleSchema, updateCycleSchema, cycleQuerySchema } from "../src/lib/schemas";

describe("createCycleSchema", () => {
  test("accepts valid cycle", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint 1",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-14T23:59:59.000Z",
      status: "planned",
    });
    expect(r.success).toBe(true);
  });

  test("rejects endDate before startDate", () => {
    const r = createCycleSchema.safeParse({
      name: "Bad Sprint",
      startDate: "2026-08-14T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty name", () => {
    const r = createCycleSchema.safeParse({
      name: "",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-14T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("defaults status to planned", () => {
    const r = createCycleSchema.safeParse({
      name: "Sprint 2",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-14T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("planned");
  });
});

describe("updateCycleSchema", () => {
  test("requires id", () => {
    const r = updateCycleSchema.safeParse({ name: "Renamed" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateCycleSchema.safeParse({
      id: "cyc_123",
      status: "active",
    });
    expect(r.success).toBe(true);
  });
});

describe("cycleQuerySchema", () => {
  test("defaults status to all", () => {
    const r = cycleQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("all");
  });
});
