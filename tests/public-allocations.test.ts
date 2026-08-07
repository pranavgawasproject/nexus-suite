/**
 * Pure unit tests for public Allocation schemas (zod validation).
 * Run: bun run tests/public-allocations.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createAllocationSchema,
  updateAllocationSchema,
} from "../src/lib/schemas";

describe("createAllocationSchema", () => {
  test("accepts valid allocation", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 50,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("accepts full allocation payload", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 75,
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-09-30T00:00:00.000Z",
      role: "Backend engineer",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing userId", () => {
    const r = createAllocationSchema.safeParse({
      projectId: "proj_1",
      allocationPct: 50,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      allocationPct: 50,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects allocationPct below 0", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: -1,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects allocationPct over 100", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 101,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-integer allocationPct", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 50.5,
      startDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects endDate before startDate", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 50,
      startDate: "2026-09-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid startDate format", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 50,
      startDate: "2026-08-01",
    });
    expect(r.success).toBe(false);
  });

  test("accepts null endDate", () => {
    const r = createAllocationSchema.safeParse({
      userId: "user_1",
      projectId: "proj_1",
      allocationPct: 100,
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("updateAllocationSchema", () => {
  test("requires id", () => {
    const r = updateAllocationSchema.safeParse({ allocationPct: 40 });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateAllocationSchema.safeParse({
      id: "alloc_1",
      allocationPct: 60,
      role: "Tech lead",
    });
    expect(r.success).toBe(true);
  });

  test("rejects allocationPct over 100 on update", () => {
    const r = updateAllocationSchema.safeParse({
      id: "alloc_1",
      allocationPct: 150,
    });
    expect(r.success).toBe(false);
  });

  test("accepts null endDate on update", () => {
    const r = updateAllocationSchema.safeParse({
      id: "alloc_1",
      endDate: null,
    });
    expect(r.success).toBe(true);
  });
});
