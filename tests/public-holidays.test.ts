/**
 * Pure unit tests for public Holiday schema (zod validation).
 * Schema is defined inline in src/app/api/v1/holidays/route.ts; mirrored here for unit coverage.
 * Run: bun run tests/public-holidays.test.ts
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const createHolidaySchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().datetime(),
  optional: z.boolean().optional().default(false),
});

describe("createHolidaySchema", () => {
  test("accepts valid holiday with defaults", () => {
    const r = createHolidaySchema.safeParse({
      name: "Independence Day",
      date: "2026-08-15T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.optional).toBe(false);
    }
  });

  test("accepts optional holiday", () => {
    const r = createHolidaySchema.safeParse({
      name: "Company Foundation Day",
      date: "2026-03-01T00:00:00.000Z",
      optional: true,
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createHolidaySchema.safeParse({
      name: "",
      date: "2026-08-15T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 120", () => {
    const r = createHolidaySchema.safeParse({
      name: "x".repeat(121),
      date: "2026-08-15T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid date format", () => {
    const r = createHolidaySchema.safeParse({
      name: "Bad date",
      date: "2026-08-15",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing date", () => {
    const r = createHolidaySchema.safeParse({
      name: "No date",
    });
    expect(r.success).toBe(false);
  });
});
