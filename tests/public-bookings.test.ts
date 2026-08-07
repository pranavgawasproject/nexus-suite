/**
 * Pure unit tests for public Booking schemas (zod validation).
 * Run: bun run tests/public-bookings.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createBookingSchema,
  updateBookingSchema,
} from "../src/lib/schemas";

describe("createBookingSchema", () => {
  test("accepts valid booking with defaults", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Standup",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T09:30:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.attendees).toBe(1);
      expect(r.data.recurring).toBe("none");
    }
  });

  test("accepts full booking payload", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Sprint Planning",
      description: "Plan next sprint",
      startTime: "2026-08-11T10:00:00.000Z",
      endTime: "2026-08-11T12:00:00.000Z",
      attendees: 8,
      recurring: "weekly",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing roomId", () => {
    const r = createBookingSchema.safeParse({
      title: "Meeting",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects endTime before startTime", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Bad slot",
      startTime: "2026-08-10T11:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-ISO datetime", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Meeting",
      startTime: "2026-08-10",
      endTime: "2026-08-10T10:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid recurring value", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Meeting",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
      recurring: "yearly",
    });
    expect(r.success).toBe(false);
  });

  test("rejects attendees below 1", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Meeting",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
      attendees: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects attendees over 500", () => {
    const r = createBookingSchema.safeParse({
      roomId: "room_1",
      title: "Town hall",
      startTime: "2026-08-10T09:00:00.000Z",
      endTime: "2026-08-10T10:00:00.000Z",
      attendees: 501,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateBookingSchema", () => {
  test("requires id", () => {
    const r = updateBookingSchema.safeParse({ title: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateBookingSchema.safeParse({
      id: "book_1",
      title: "Rescheduled standup",
      status: "confirmed",
      attendees: 5,
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status", () => {
    const r = updateBookingSchema.safeParse({
      id: "book_1",
      status: "approved",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title on update", () => {
    const r = updateBookingSchema.safeParse({
      id: "book_1",
      title: "",
    });
    expect(r.success).toBe(false);
  });
});
