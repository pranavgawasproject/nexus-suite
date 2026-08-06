/**
 * Pure unit tests for public Project schemas (zod validation).
 * Run: bun run tests/public-projects.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createProjectSchema, updateProjectSchema } from "../src/lib/schemas";

describe("createProjectSchema", () => {
  test("accepts valid project with defaults", () => {
    const r = createProjectSchema.safeParse({
      name: "Website Redesign",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.color).toBe("#64748b");
      expect(r.data.status).toBe("active");
    }
  });

  test("accepts full project payload", () => {
    const r = createProjectSchema.safeParse({
      name: "Mobile App",
      description: "iOS and Android client",
      color: "#0ea5e9",
      status: "on_hold",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createProjectSchema.safeParse({ name: "" });
    expect(r.success).toBe(false);
  });

  test("rejects missing name", () => {
    const r = createProjectSchema.safeParse({ description: "No name" });
    expect(r.success).toBe(false);
  });

  test("rejects invalid color format", () => {
    const r = createProjectSchema.safeParse({
      name: "Bad Color",
      color: "blue",
    });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 120", () => {
    const r = createProjectSchema.safeParse({
      name: "x".repeat(121),
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const r = createProjectSchema.safeParse({
      name: "Proj",
      status: "draft",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  test("requires id", () => {
    const r = updateProjectSchema.safeParse({ name: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateProjectSchema.safeParse({
      id: "proj_1",
      status: "completed",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid color on update", () => {
    const r = updateProjectSchema.safeParse({
      id: "proj_1",
      color: "#fff",
    });
    expect(r.success).toBe(false);
  });
});
