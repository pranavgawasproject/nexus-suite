/**
 * Pure unit tests for public Leave schemas (zod validation).
 * Run: bun run tests/public-leaves.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createLeaveSchema, updateLeaveSchema } from "../src/lib/schemas";

describe("createLeaveSchema", () => {
  test("accepts valid leave request", () => {
    const r = createLeaveSchema.safeParse({
      userId: "user_1",
      type: "casual",
      startDate: "2026-08-10T00:00:00.000Z",
      endDate: "2026-08-12T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.halfDay).toBe(false);
      expect(r.data.type).toBe("casual");
    }
  });

  test("accepts full payload with reason and halfDay", () => {
    const r = createLeaveSchema.safeParse({
      userId: "user_1",
      type: "sick",
      startDate: "2026-08-10T00:00:00.000Z",
      endDate: "2026-08-10T00:00:00.000Z",
      reason: "Flu",
      halfDay: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.halfDay).toBe(true);
  });

  test("rejects endDate before startDate", () => {
    const r = createLeaveSchema.safeParse({
      userId: "user_1",
      type: "casual",
      startDate: "2026-08-12T00:00:00.000Z",
      endDate: "2026-08-10T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing userId", () => {
    const r = createLeaveSchema.safeParse({
      type: "casual",
      startDate: "2026-08-10T00:00:00.000Z",
      endDate: "2026-08-12T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid leave type", () => {
    const r = createLeaveSchema.safeParse({
      userId: "user_1",
      type: "vacation",
      startDate: "2026-08-10T00:00:00.000Z",
      endDate: "2026-08-12T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-datetime dates", () => {
    const r = createLeaveSchema.safeParse({
      userId: "user_1",
      type: "casual",
      startDate: "2026-08-10",
      endDate: "2026-08-12",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateLeaveSchema", () => {
  test("requires id and status", () => {
    const r = updateLeaveSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts approve with note", () => {
    const r = updateLeaveSchema.safeParse({
      id: "leave_1",
      status: "approved",
      approverNote: "OK",
    });
    expect(r.success).toBe(true);
  });

  test("accepts reject", () => {
    const r = updateLeaveSchema.safeParse({
      id: "leave_1",
      status: "rejected",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status", () => {
    const r = updateLeaveSchema.safeParse({
      id: "leave_1",
      status: "maybe",
    });
    expect(r.success).toBe(false);
  });
});
