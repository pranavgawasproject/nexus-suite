/**
 * Pure unit tests for Attendance and updateRoom schemas (zod validation).
 * Run: bun run tests/public-attendance.test.ts
 */
import { describe, expect, test } from "bun:test";
import { attendanceSchema, updateRoomSchema } from "../src/lib/schemas";

describe("attendanceSchema", () => {
  test("accepts check_in", () => {
    const r = attendanceSchema.safeParse({
      userId: "user_1",
      action: "check_in",
    });
    expect(r.success).toBe(true);
  });

  test("accepts check_out with timestamp", () => {
    const r = attendanceSchema.safeParse({
      userId: "user_1",
      action: "check_out",
      timestamp: "2026-08-08T09:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing userId", () => {
    const r = attendanceSchema.safeParse({
      action: "check_in",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid action", () => {
    const r = attendanceSchema.safeParse({
      userId: "user_1",
      action: "break",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid timestamp", () => {
    const r = attendanceSchema.safeParse({
      userId: "user_1",
      action: "check_in",
      timestamp: "not-iso",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateRoomSchema", () => {
  test("accepts id only", () => {
    const r = updateRoomSchema.safeParse({ id: "room_1" });
    expect(r.success).toBe(true);
  });

  test("accepts full update", () => {
    const r = updateRoomSchema.safeParse({
      id: "room_1",
      name: "Updated Board Room",
      location: "Floor 4",
      capacity: 10,
      amenities: "Projector",
      active: false,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing id", () => {
    const r = updateRoomSchema.safeParse({ name: "No id" });
    expect(r.success).toBe(false);
  });

  test("rejects empty name when provided", () => {
    const r = updateRoomSchema.safeParse({
      id: "room_1",
      name: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects capacity below 1", () => {
    const r = updateRoomSchema.safeParse({
      id: "room_1",
      capacity: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects capacity over 500", () => {
    const r = updateRoomSchema.safeParse({
      id: "room_1",
      capacity: 501,
    });
    expect(r.success).toBe(false);
  });
});
