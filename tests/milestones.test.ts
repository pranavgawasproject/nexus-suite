/**
 * Pure unit tests for Milestone schemas (zod validation).
 * Run: bun run tests/milestones.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createMilestoneSchema, updateMilestoneSchema, milestoneQuerySchema } from "../src/lib/schemas";

describe("createMilestoneSchema", () => {
  test("accepts valid milestone", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "MVP Launch",
      dueDate: "2026-09-01T00:00:00.000Z",
      status: "planned",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty name", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const r = createMilestoneSchema.safeParse({
      name: "Ship it",
    });
    expect(r.success).toBe(false);
  });

  test("defaults status to planned", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "Beta",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("planned");
  });
});

describe("updateMilestoneSchema", () => {
  test("requires id", () => {
    const r = updateMilestoneSchema.safeParse({ name: "Renamed" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateMilestoneSchema.safeParse({
      id: "ms_123",
      status: "completed",
    });
    expect(r.success).toBe(true);
  });
});

describe("milestoneQuerySchema", () => {
  test("accepts empty query", () => {
    const r = milestoneQuerySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  test("accepts projectId and status", () => {
    const r = milestoneQuerySchema.safeParse({ projectId: "p1", status: "active" });
    expect(r.success).toBe(true);
  });
});
