/**
 * Pure unit tests for public Notification schema (zod validation).
 * Run: bun run tests/public-notifications.test.ts
 */
import { describe, expect, test } from "bun:test";
import { updateNotificationSchema } from "../src/lib/schemas";

describe("updateNotificationSchema", () => {
  test("accepts markAllRead true", () => {
    const r = updateNotificationSchema.safeParse({
      markAllRead: true,
    });
    expect(r.success).toBe(true);
  });

  test("accepts id only", () => {
    const r = updateNotificationSchema.safeParse({
      id: "notif_1",
    });
    expect(r.success).toBe(true);
  });

  test("accepts markAllRead with userId", () => {
    const r = updateNotificationSchema.safeParse({
      markAllRead: true,
      userId: "user_1",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.userId).toBe("user_1");
    }
  });

  test("accepts empty object (route will 400)", () => {
    const r = updateNotificationSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  test("rejects non-boolean markAllRead", () => {
    const r = updateNotificationSchema.safeParse({
      markAllRead: "yes",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-string id", () => {
    const r = updateNotificationSchema.safeParse({
      id: 123,
    });
    expect(r.success).toBe(false);
  });
});
