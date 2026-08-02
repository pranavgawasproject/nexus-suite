/**
 * Pure unit tests for public Room schemas (zod validation).
 * Run: bun run tests/public-rooms.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createRoomSchema } from "../src/lib/schemas";

describe("createRoomSchema", () => {
  test("accepts valid room with defaults", () => {
    const r = createRoomSchema.safeParse({
      name: "Conference A",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.capacity).toBe(4);
      expect(r.data.active).toBe(true);
    }
  });

  test("accepts full room payload", () => {
    const r = createRoomSchema.safeParse({
      name: "Board Room",
      location: "Floor 3",
      capacity: 12,
      amenities: "TV, whiteboard",
      active: true,
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createRoomSchema.safeParse({
      name: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing name", () => {
    const r = createRoomSchema.safeParse({
      location: "Basement",
    });
    expect(r.success).toBe(false);
  });

  test("rejects capacity below 1", () => {
    const r = createRoomSchema.safeParse({
      name: "Tiny",
      capacity: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects capacity over 500", () => {
    const r = createRoomSchema.safeParse({
      name: "Arena",
      capacity: 501,
    });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 100", () => {
    const r = createRoomSchema.safeParse({
      name: "x".repeat(101),
    });
    expect(r.success).toBe(false);
  });
});
